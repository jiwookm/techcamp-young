import { anthropic } from "@ai-sdk/anthropic";
import { generateText, streamText, Output } from "ai";
import { z } from "zod";
import { CONSTITUTION } from "../constitution";
import type { DebateState, SubClaim, VerdictResult } from "@/lib/types";

const SYSTEM_PROMPT = `You are the Presiding Judge of the Tribunal, an adversarial fact-checking court.

## Your Role
You are impartial. You never take sides. You analyze evidence presented by both the Prosecution and the Defense, and render verdicts strictly according to the Constitution.

## Constitution
${CONSTITUTION}

## Rules
- Always cite which Constitution article informs your reasoning
- Use formal judicial language
- If evidence is insufficient, rule "unverifiable" — never guess
- Keep statements concise and authoritative`;

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

export async function decomposeClaims(text: string): Promise<SubClaim[]> {
  const { output } = await generateText({
    model: anthropic("claude-sonnet-4-20250514"),
    output: Output.object({ schema: subClaimSchema }),
    system: SYSTEM_PROMPT,
    prompt: `Decompose the following AI-generated text into 3-5 verifiable sub-claims. Assign each a unique ID (claim-1, claim-2, etc.) and classify its category.

Text to analyze:
"${text}"`,
    temperature: 0.3,
  });

  return output?.claims ?? [];
}

export function streamOpening(state: DebateState) {
  const claimList = state.subClaims
    .map((c, i) => `${i + 1}. [${c.category.toUpperCase()}] ${c.text}`)
    .join("\n");

  return streamText({
    model: anthropic("claude-sonnet-4-20250514"),
    system: SYSTEM_PROMPT,
    prompt: `You are opening Case No. TRB-${Date.now().toString(36).toUpperCase()}.

The following text has been submitted for adversarial review:
"${state.originalText}"

You have decomposed it into the following sub-claims:
${claimList}

Deliver your opening statement. Announce the sub-claims to be examined and instruct the Prosecution to begin its challenge. Keep it under 150 words.`,
    temperature: 0.3,
  });
}

export function streamInterjection(state: DebateState) {
  const transcript = state.messages
    .map((m) => `[${m.agent.toUpperCase()} - ${m.type}]: ${m.content}`)
    .join("\n\n");

  return streamText({
    model: anthropic("claude-sonnet-4-20250514"),
    system: SYSTEM_PROMPT,
    prompt: `Review the debate transcript so far and provide a brief judicial interjection. Note any arguments that are circular, any evidence being ignored, or any procedural issues. Guide both parties to address the strongest sub-claims. Keep it under 100 words.

Transcript:
${transcript}`,
    temperature: 0.3,
  });
}

export async function generateVerdict(
  state: DebateState,
): Promise<VerdictResult> {
  const transcript = state.messages
    .map((m) => `[${m.agent.toUpperCase()} - ${m.type}]: ${m.content}`)
    .join("\n\n");

  const { output } = await generateText({
    model: anthropic("claude-sonnet-4-20250514"),
    output: Output.object({ schema: verdictSchema }),
    system: SYSTEM_PROMPT,
    prompt: `Based on the full debate transcript, render your structured verdict.

Original text: "${state.originalText}"

Sub-claims examined:
${state.subClaims.map((c) => `- ${c.id}: ${c.text} [${c.category}]`).join("\n")}

Full transcript:
${transcript}

Apply the Constitution strictly. Rate each sub-claim and provide an overall rating with confidence score (0-1).`,
    temperature: 0.3,
  });

  return (
    output ?? {
      overallRating: "unverifiable" as const,
      confidence: 0,
      summary: "Unable to render verdict due to processing error.",
      subClaimResults: [],
    }
  );
}

export function streamVerdictText(
  state: DebateState,
  verdict: VerdictResult,
) {
  return streamText({
    model: anthropic("claude-sonnet-4-20250514"),
    system: SYSTEM_PROMPT,
    prompt: `Deliver the final ruling as a formal judicial statement.

Structured verdict data:
- Overall Rating: ${verdict.overallRating.toUpperCase().replace("_", " ")}
- Confidence: ${(verdict.confidence * 100).toFixed(0)}%
- Summary: ${verdict.summary}

Sub-claim results:
${verdict.subClaimResults.map((r) => `- ${r.subClaimId}: ${r.rating} — ${r.reasoning}`).join("\n")}

${verdict.recommendedRevision ? `Recommended revision: "${verdict.recommendedRevision}"` : ""}

Write the ruling in formal court language. Start with "RULING:" followed by the finding. Then list the key evidence points as bullet items. End with a recommended revision if one exists. Keep it under 300 words.`,
    temperature: 0.3,
  });
}
