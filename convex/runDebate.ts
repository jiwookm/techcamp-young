"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import type { ActionCtx } from "./_generated/server";

import { anthropic } from "@ai-sdk/anthropic";
import { google } from "@ai-sdk/google";
import { openai } from "@ai-sdk/openai";
import { generateText, streamText, Output } from "ai";
import { z } from "zod";
import { CONSTITUTION } from "./constitution";

// --- System Prompts ---

const JUDGE_SYSTEM = `You are the Presiding Judge of the Tribunal, an adversarial fact-checking court.

## Your Role
You are impartial. You never take sides. You analyze evidence presented by both the Prosecution and the Defense, and render verdicts strictly according to the Constitution.

## Constitution
${CONSTITUTION}

## Rules
- Always cite which Constitution article informs your reasoning
- Use formal judicial language
- If evidence is insufficient, rule "unverifiable" — never guess
- Keep statements concise and authoritative`;

const PROSECUTOR_SYSTEM = `You are the Prosecutor of the Tribunal, an adversarial fact-checking court.

## Your Role
You rigorously challenge every claim submitted for review. You search for counter-evidence, identify logical fallacies, and expose unsupported assertions.

## Constitution
${CONSTITUTION}

## Rules
- Be rigorous but fair. Do not strawman.
- ALWAYS ground arguments in evidence. No speculation.
- When you find a contradicting source, cite the full reference.
- If a sub-claim is well-supported, acknowledge it briefly and move on.
- Use the google_search tool to find counter-evidence for each sub-claim.
- Quantify discrepancies when possible.
- Keep each argument focused and under 200 words.`;

const ADVOCATE_SYSTEM = `You are the Defense Advocate of the Tribunal, an adversarial fact-checking court.

## Your Role
You find legitimate support for the submitted claims. You search for corroborating evidence, provide context that the Prosecution may have omitted, and defend claims that have genuine merit.

## Constitution
${CONSTITUTION}

## Rules
- Defend with evidence, not rhetoric.
- If a claim is indefensible, concede it explicitly.
- Differentiate between "the exact number is wrong" and "the underlying thesis is wrong."
- Use the web_search_preview tool to find supporting evidence.
- Acknowledge genuine weaknesses honestly.
- Keep each argument focused and under 200 words.`;

// --- Schemas ---

const subClaimSchema = z.object({
  claims: z.array(
    z.object({
      id: z.string(),
      text: z.string(),
      category: z.enum([
        "factual",
        "statistical",
        "causal",
        "predictive",
        "opinion",
      ]),
    }),
  ),
});

const verdictSchema = z.object({
  overallRating: z.enum([
    "verified",
    "mostly_true",
    "mixed",
    "mostly_false",
    "false",
    "unverifiable",
  ]),
  confidence: z.number().min(0).max(1),
  summary: z.string(),
  subClaimResults: z.array(
    z.object({
      subClaimId: z.string(),
      rating: z.string(),
      reasoning: z.string(),
    }),
  ),
  recommendedRevision: z.string().optional(),
});

// --- Helpers ---

interface DebateContext {
  text: string;
  subClaims: Array<{ id: string; text: string; category: string }>;
  transcript: string[];
}

async function collectAndStream(
  streamResult: { textStream: AsyncIterable<string> },
  ctx: ActionCtx,
  debateId: Id<"debates">,
  agent: string,
  messageType: string,
  order: number,
  debateCtx: DebateContext,
): Promise<string> {
  await ctx.runMutation(internal.debates.setActiveAgent, {
    debateId,
    activeAgent: agent,
  });

  let fullText = "";
  let lastFlush = Date.now();

  for await (const chunk of streamResult.textStream) {
    fullText += chunk;
    const now = Date.now();
    if (now - lastFlush > 400) {
      await ctx.runMutation(internal.debates.setStreamingText, {
        debateId,
        streamingText: fullText,
      });
      lastFlush = now;
    }
  }

  await ctx.runMutation(internal.debates.addMessage, {
    debateId,
    agent,
    type: messageType,
    content: fullText,
    order,
  });

  debateCtx.transcript.push(
    `[${agent.toUpperCase()} - ${messageType}]: ${fullText}`,
  );

  return fullText;
}

// --- Main Action ---

export const run = internalAction({
  args: { debateId: v.id("debates") },
  handler: async (ctx, { debateId }) => {
    const debate = await ctx.runQuery(internal.debates.getDebateInternal, {
      debateId,
    });
    if (!debate) throw new Error("Debate not found");

    const debateCtx: DebateContext = {
      text: debate.text,
      subClaims: [],
      transcript: [],
    };

    try {
      // Brief convening pause
      await new Promise((r) => setTimeout(r, 1200));
      await ctx.runMutation(internal.debates.setPhase, {
        debateId,
        phase: "debating",
      });

      // Step 1: Judge decomposes claims
      const { output } = await generateText({
        model: anthropic("claude-sonnet-4-20250514"),
        output: Output.object({ schema: subClaimSchema }),
        system: JUDGE_SYSTEM,
        prompt: `Decompose the following AI-generated text into 3-5 verifiable sub-claims. Assign each a unique ID (claim-1, claim-2, etc.) and classify its category.\n\nText to analyze:\n"${debate.text}"`,
        temperature: 0.3,
      });

      debateCtx.subClaims = output?.claims ?? [];
      await ctx.runMutation(internal.debates.setSubClaims, {
        debateId,
        subClaims: debateCtx.subClaims,
      });

      const claimList = debateCtx.subClaims
        .map((c, i) => `${i + 1}. [${c.category.toUpperCase()}] ${c.text}`)
        .join("\n");

      // Step 2: Judge opening
      let order = 0;
      await collectAndStream(
        streamText({
          model: anthropic("claude-sonnet-4-20250514"),
          system: JUDGE_SYSTEM,
          prompt: `You are opening a case. The following text has been submitted for adversarial review:\n"${debate.text}"\n\nYou have decomposed it into the following sub-claims:\n${claimList}\n\nDeliver your opening statement. Announce the sub-claims to be examined and instruct the Prosecution to begin its challenge. Keep it under 150 words.`,
          temperature: 0.3,
        }),
        ctx,
        debateId,
        "judge",
        "opening",
        order++,
        debateCtx,
      );

      // Step 3: Prosecutor challenge (Gemini + Google Search)
      await collectAndStream(
        streamText({
          model: google("gemini-2.5-flash"),
          system: PROSECUTOR_SYSTEM,
          prompt: `The following text has been submitted for review:\n"${debate.text}"\n\nSub-claims to challenge:\n${debateCtx.subClaims.map((c) => `- ${c.id}: [${c.category}] ${c.text}`).join("\n")}\n\nPrior proceedings:\n${debateCtx.transcript.join("\n\n")}\n\nSearch the web for counter-evidence and challenge each sub-claim. Be precise and evidence-driven.`,
          tools: {
            google_search: google.tools.googleSearch({}),
          },
          temperature: 0.5,
        }),
        ctx,
        debateId,
        "prosecutor",
        "argument",
        order++,
        debateCtx,
      );

      // Step 4: Advocate defense (GPT-4o + Web Search)
      await collectAndStream(
        streamText({
          model: openai.responses("gpt-4o"),
          system: ADVOCATE_SYSTEM,
          prompt: `The following text has been submitted for review:\n"${debate.text}"\n\nSub-claims:\n${debateCtx.subClaims.map((c) => `- ${c.id}: [${c.category}] ${c.text}`).join("\n")}\n\nFull transcript so far:\n${debateCtx.transcript.join("\n\n")}\n\nSearch the web for supporting evidence and defend the claims. Concede points that are genuinely indefensible.`,
          tools: {
            web_search_preview: openai.tools.webSearchPreview({}),
          },
          temperature: 0.5,
        }),
        ctx,
        debateId,
        "advocate",
        "counter",
        order++,
        debateCtx,
      );

      // Step 5: Judge interjection
      await collectAndStream(
        streamText({
          model: anthropic("claude-sonnet-4-20250514"),
          system: JUDGE_SYSTEM,
          prompt: `Review the debate transcript so far and provide a brief judicial interjection. Note any arguments that are circular, any evidence being ignored, or any procedural issues. Keep it under 100 words.\n\nTranscript:\n${debateCtx.transcript.join("\n\n")}`,
          temperature: 0.3,
        }),
        ctx,
        debateId,
        "judge",
        "interjection",
        order++,
        debateCtx,
      );

      // Step 6: Prosecutor rebuttal
      await collectAndStream(
        streamText({
          model: google("gemini-2.5-flash"),
          system: PROSECUTOR_SYSTEM,
          prompt: `Review the Defense's arguments and provide your rebuttal. Search for additional evidence if needed.\n\nFull transcript:\n${debateCtx.transcript.join("\n\n")}\n\nDeliver your rebuttal. Focus on the weakest points. Keep it under 200 words.`,
          tools: {
            google_search: google.tools.googleSearch({}),
          },
          temperature: 0.5,
        }),
        ctx,
        debateId,
        "prosecutor",
        "closing",
        order++,
        debateCtx,
      );

      // Step 7: Advocate closing
      await collectAndStream(
        streamText({
          model: openai.responses("gpt-4o"),
          system: ADVOCATE_SYSTEM,
          prompt: `Deliver your closing argument. Summarize which claims are well-supported, which you concede, and what the overall verdict should be.\n\nFull transcript:\n${debateCtx.transcript.join("\n\n")}\n\nProvide a balanced closing. Keep it under 200 words.`,
          tools: {
            web_search_preview: openai.tools.webSearchPreview({}),
          },
          temperature: 0.5,
        }),
        ctx,
        debateId,
        "advocate",
        "closing",
        order++,
        debateCtx,
      );

      // Step 8: Judge verdict (structured)
      const verdictResult = await generateText({
        model: anthropic("claude-sonnet-4-20250514"),
        output: Output.object({ schema: verdictSchema }),
        system: JUDGE_SYSTEM,
        prompt: `Based on the full debate transcript, render your structured verdict.\n\nOriginal text: "${debate.text}"\n\nSub-claims:\n${debateCtx.subClaims.map((c) => `- ${c.id}: ${c.text} [${c.category}]`).join("\n")}\n\nFull transcript:\n${debateCtx.transcript.join("\n\n")}\n\nApply the Constitution strictly. Rate each sub-claim and provide an overall rating with confidence score (0-1).`,
        temperature: 0.3,
      });

      const verdict = verdictResult.output ?? {
        overallRating: "unverifiable",
        confidence: 0,
        summary: "Unable to render verdict due to processing error.",
        subClaimResults: [],
      };

      await ctx.runMutation(internal.debates.setVerdict, {
        debateId,
        verdict,
      });

      // Step 9: Judge verdict text
      await collectAndStream(
        streamText({
          model: anthropic("claude-sonnet-4-20250514"),
          system: JUDGE_SYSTEM,
          prompt: `Deliver the final ruling as a formal judicial statement.\n\nStructured verdict:\n- Overall Rating: ${verdict.overallRating.toUpperCase().replace("_", " ")}\n- Confidence: ${(verdict.confidence * 100).toFixed(0)}%\n- Summary: ${verdict.summary}\n\nSub-claim results:\n${verdict.subClaimResults.map((r) => `- ${r.subClaimId}: ${r.rating} — ${r.reasoning}`).join("\n")}\n\n${verdict.recommendedRevision ? `Recommended revision: "${verdict.recommendedRevision}"` : ""}\n\nWrite the ruling in formal court language. Start with "RULING:" followed by the finding. Keep it under 300 words.`,
          temperature: 0.3,
        }),
        ctx,
        debateId,
        "judge",
        "verdict",
        order++,
        debateCtx,
      );

      // Done
      await ctx.runMutation(internal.debates.setPhase, {
        debateId,
        phase: "verdict",
      });
    } catch (error) {
      console.error("Debate error:", error);
      await ctx.runMutation(internal.debates.setPhase, {
        debateId,
        phase: "verdict",
      });
      await ctx.runMutation(internal.debates.setActiveAgent, {
        debateId,
        activeAgent: undefined,
      });
    }
  },
});
