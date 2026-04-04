"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import type { ActionCtx } from "./_generated/server";

import { anthropic } from "@ai-sdk/anthropic";
import { google } from "@ai-sdk/google";
import { openai } from "@ai-sdk/openai";
import { streamText } from "ai";
import { CONSTITUTION } from "./constitution";

// --- System Prompts ---

const JUDGE_SYSTEM = `You are the Presiding Judge of the Tribunal. Your role is strictly defined by the Constitution below.

## Constitution
${CONSTITUTION}

## Operational Rules
- You EVALUATE the Defendant's response. You do NOT generate, modify, or supplement it.
- Keep your opening brief and procedural — do not recite the Constitution.
- Use formal judicial language throughout.
- Your verdict must follow the Constitution's framework exactly:
  1. Decompose the response into Claims, Evidence, Sources, and Uncertainty markers (Article 1)
  2. Score key Claims on Accuracy, Completeness, Believability, Reputation (Article 2)
  3. Assess cognitive distortions — overconfidence, lack of uncertainty disclosure (Article 3)
  4. Evaluate trust components: Ability, Integrity, Benevolence, Harm Risk (Article 4)
  5. Assess overall trustworthiness (Article 5)
  6. Issue verdict: Acceptable, Qualified, or Rejected (Article 6)
  7. Provide explicit justification with Claim evaluations, trust component scores, and critical strengths/deficiencies (Article 7)
- You are PROHIBITED from introducing new information, generating claims, revising the response, or issuing a verdict without justification (Article 8).`;

const PROSECUTOR_SYSTEM = `You are the Prosecutor of the Tribunal, an adversarial thinking system that produces high-quality AI outputs.

## Your Role
You rigorously critique the Defendant's response using the Constitution's evaluation framework. Your goal is to expose weaknesses so the Defendant can improve before the Judge's final evaluation.

## Constitution (Evaluation Framework)
${CONSTITUTION}

## Rules
- Challenge the Defendant's response on the Constitution's quality dimensions: Accuracy, Completeness, Believability, and Reputation (Article 2).
- Identify cognitive distortions: overconfidence, lack of uncertainty disclosure, trust distortion through rhetoric (Article 3).
- Flag potential harm risks: misunderstanding potential, risk of inducing incorrect actions (Article 4).
- ALWAYS search the web for counter-evidence and better sources.
- ALWAYS cite every source inline using markdown: [Source Name](URL).
- Be rigorous but constructive — your critiques should push the Defendant to produce a more trustworthy response.
- Never fabricate sources or URLs.
- Quantify discrepancies when possible.`;

const DEFENDANT_SYSTEM = `You are the Defendant of the Tribunal, an adversarial thinking system that produces high-quality AI outputs.

## Your Role
You generate comprehensive, well-researched responses to prompts. You then defend and improve your work through adversarial debate with the Prosecutor. Your final response will be evaluated by the Judge under the Constitution's trustworthiness criteria.

## Constitution (You will be evaluated on these criteria)
${CONSTITUTION}

## Rules
- ALWAYS search the web for authoritative sources before writing.
- ALWAYS cite every source inline using markdown: [Source Name](URL).
- Your initial response should be thorough, well-structured, and directly address the prompt.
- Be aware you will be evaluated on: Accuracy, Completeness, Believability, Reputation (Article 2).
- Explicitly acknowledge uncertainty where it exists — assertive language without evidence will be flagged as overconfidence (Article 3).
- During rebuttals: address the Prosecutor's critiques head-on, strengthen weak points with new evidence, and concede valid criticisms honestly.
- Your final rebuttal IS the output shown to the user. Make it the best possible response to the original prompt.
- Never fabricate sources or URLs.`;

// --- Helpers ---

interface DebateContext {
  text: string;
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

async function isStopped(ctx: ActionCtx, debateId: Id<"debates">): Promise<boolean> {
  const debate = await ctx.runQuery(internal.debates.getDebateInternal, { debateId });
  return debate?.phase === "verdict";
}

export const run = internalAction({
  args: { debateId: v.id("debates") },
  handler: async (ctx, { debateId }) => {
    const debate = await ctx.runQuery(internal.debates.getDebateInternal, {
      debateId,
    });
    if (!debate) throw new Error("Debate not found");

    const debateCtx: DebateContext = {
      text: debate.text,
      transcript: [],
    };

    try {
      // Brief convening pause
      await new Promise((r) => setTimeout(r, 1200));

      if (await isStopped(ctx, debateId)) return;
      await ctx.runMutation(internal.debates.setPhase, {
        debateId,
        phase: "debating",
      });

      let order = 0;

      // Step 1: Judge opening (brief, no constitution)
      await collectAndStream(
        streamText({
          model: anthropic("claude-opus-4-6"),
          system: JUDGE_SYSTEM,
          prompt: `The court will now hear arguments on the following prompt:\n\n"${debate.text}"\n\nDeliver a brief opening statement. Announce the prompt under consideration and instruct the Defendant to present their initial response. Keep it under 80 words. Do not recite the Constitution.`,
          temperature: 0.3,
        }),
        ctx,
        debateId,
        "judge",
        "opening",
        order++,
        debateCtx,
      );

      // Step 2: Defendant initial response
      if (await isStopped(ctx, debateId)) return;
      await collectAndStream(
        streamText({
          model: openai.responses("gpt-5.4"),
          system: DEFENDANT_SYSTEM,
          prompt: `The following prompt has been submitted to the Tribunal for adversarial refinement:\n\n"${debate.text}"\n\nPrior proceedings:\n${debateCtx.transcript.join("\n\n")}\n\nGenerate a comprehensive, well-researched response to this prompt. Search the web for authoritative sources. Your response will be evaluated by the Judge under the Constitution — pay attention to Accuracy, Completeness, Believability, Reputation, and proper uncertainty disclosure. Cite every source inline using [Source Name](URL) format. Keep your response under 500 words.`,
          tools: {
            web_search_preview: openai.tools.webSearchPreview({}),
          },
          temperature: 0.5,
        }),
        ctx,
        debateId,
        "defendant",
        "response",
        order++,
        debateCtx,
      );

      // Step 3: Prosecutor challenge #1
      if (await isStopped(ctx, debateId)) return;
      await collectAndStream(
        streamText({
          model: google("gemini-3.1-pro-preview"),
          system: PROSECUTOR_SYSTEM,
          prompt: `The following prompt was submitted:\n"${debate.text}"\n\nFull transcript so far:\n${debateCtx.transcript.join("\n\n")}\n\nSearch the web and challenge the Defendant's response using the Constitution's framework:\n- Accuracy: Are claims consistent with verifiable knowledge?\n- Completeness: What essential information is missing?\n- Believability: Are there logical gaps?\n- Reputation: Are sources credible?\n- Cognitive Distortions: Overconfidence, lack of uncertainty disclosure?\n\nCite all sources inline using [Source Name](URL) format.`,
          tools: {
            google_search: google.tools.googleSearch({}),
          },
          temperature: 0.5,
        }),
        ctx,
        debateId,
        "prosecutor",
        "challenge",
        order++,
        debateCtx,
      );

      // Step 4: Defendant rebuttal #1
      if (await isStopped(ctx, debateId)) return;
      await collectAndStream(
        streamText({
          model: openai.responses("gpt-5.4"),
          system: DEFENDANT_SYSTEM,
          prompt: `Review the Prosecutor's challenges and provide your rebuttal. Search for additional evidence to strengthen your position.\n\nFull transcript:\n${debateCtx.transcript.join("\n\n")}\n\nAddress each critique directly. Correct Accuracy issues with evidence. Fill Completeness gaps. Add uncertainty disclosure where flagged. Concede valid points honestly. Your response should be a COMPLETE, IMPROVED version — not just rebuttals. Cite all sources inline using [Source Name](URL) format.`,
          tools: {
            web_search_preview: openai.tools.webSearchPreview({}),
          },
          temperature: 0.5,
        }),
        ctx,
        debateId,
        "defendant",
        "rebuttal",
        order++,
        debateCtx,
      );

      // Step 5: Prosecutor challenge #2
      if (await isStopped(ctx, debateId)) return;
      await collectAndStream(
        streamText({
          model: google("gemini-3.1-pro-preview"),
          system: PROSECUTOR_SYSTEM,
          prompt: `Review the Defendant's rebuttal and deliver your final challenge.\n\nFull transcript:\n${debateCtx.transcript.join("\n\n")}\n\nFocus on the most impactful remaining issues: Accuracy concerns, Completeness gaps, cognitive distortions, and harm risks. This is the Defendant's last chance to improve before the Judge's verdict. Cite all sources inline using [Source Name](URL) format.`,
          tools: {
            google_search: google.tools.googleSearch({}),
          },
          temperature: 0.5,
        }),
        ctx,
        debateId,
        "prosecutor",
        "challenge",
        order++,
        debateCtx,
      );

      // Step 6: Defendant rebuttal #2 (this IS the final output)
      if (await isStopped(ctx, debateId)) return;
      await collectAndStream(
        streamText({
          model: openai.responses("gpt-5.4"),
          system: DEFENDANT_SYSTEM,
          prompt: `Review the Prosecutor's final challenge and provide your final rebuttal.\n\nFull transcript:\n${debateCtx.transcript.join("\n\n")}\n\nThis is your FINAL response — it will be shown to the user as the output and evaluated by the Judge. Make it the best possible answer to the original prompt. Address all remaining critiques. Correct any Accuracy issues. Fill all Completeness gaps. Ensure proper uncertainty disclosure. Cite all sources inline using [Source Name](URL) format.`,
          tools: {
            web_search_preview: openai.tools.webSearchPreview({}),
          },
          temperature: 0.5,
        }),
        ctx,
        debateId,
        "defendant",
        "rebuttal",
        order++,
        debateCtx,
      );

      // Step 7: Judge verdict (evaluation per Constitution)
      if (await isStopped(ctx, debateId)) return;
      // Find the defendant's final response for evaluation
      const defendantMessages = debateCtx.transcript.filter((t) => t.startsWith("[DEFENDANT"));
      const finalResponse = defendantMessages[defendantMessages.length - 1] ?? "";

      const verdictText = await collectAndStream(
        streamText({
          model: anthropic("claude-opus-4-6"),
          system: JUDGE_SYSTEM,
          prompt: `The proceedings are complete. Evaluate the Defendant's final response and render your verdict per the Constitution.\n\nOriginal prompt: "${debate.text}"\n\n## Defendant's Final Response:\n${finalResponse}\n\n## Full Transcript:\n${debateCtx.transcript.join("\n\n")}\n\nRender your verdict following the Constitution strictly:\n1. Claim Decomposition (Article 1)\n2. Information Quality scoring (Article 2)\n3. Cognitive Distortion Assessment (Article 3)\n4. Trust Components: Ability, Integrity, Benevolence, Harm Risk (Article 4)\n5. Overall Trustworthiness (Article 5)\n6. Verdict: Acceptable, Qualified, or Rejected (Article 6)\n7. Explicit Justification (Article 7)\n\nREMEMBER: You must NOT introduce new information, generate claims, or revise the response (Article 8).`,
          temperature: 0.3,
        }),
        ctx,
        debateId,
        "judge",
        "verdict",
        order++,
        debateCtx,
      );

      // Store final output (the defendant's last rebuttal)
      const lastDefendantMsg = debateCtx.transcript
        .filter((t) => t.startsWith("[DEFENDANT"))
        .pop();
      const finalOutput = lastDefendantMsg
        ? lastDefendantMsg.replace(/^\[DEFENDANT - \w+\]: /, "")
        : verdictText;

      await ctx.runMutation(internal.debates.setFinalOutput, {
        debateId,
        finalOutput,
      });

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
