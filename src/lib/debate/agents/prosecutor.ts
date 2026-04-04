import { google } from "@ai-sdk/google";
import { streamText } from "ai";
import { CONSTITUTION } from "../constitution";
import type { DebateState } from "@/lib/types";

const SYSTEM_PROMPT = `You are the Prosecutor of the Tribunal, an adversarial fact-checking court.

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
- Quantify discrepancies when possible (e.g., "The claim says 80% but OECD found 14%").
- Keep each argument focused and under 200 words.`;

export function streamChallenge(state: DebateState) {
  const claimList = state.subClaims
    .map((c) => `- ${c.id}: [${c.category}] ${c.text}`)
    .join("\n");

  const priorMessages = state.messages
    .map((m) => `[${m.agent.toUpperCase()} - ${m.type}]: ${m.content}`)
    .join("\n\n");

  return streamText({
    model: google("gemini-2.5-flash"),
    system: SYSTEM_PROMPT,
    prompt: `The following text has been submitted for review:
"${state.originalText}"

Sub-claims to challenge:
${claimList}

Prior proceedings:
${priorMessages}

Search the web for counter-evidence and challenge each sub-claim. For each, cite specific sources that contradict or undermine the claim. Be precise and evidence-driven.`,
    tools: {
      google_search: google.tools.googleSearch({}),
    },
    temperature: 0.5,
  });
}

export function streamRebuttal(state: DebateState) {
  const transcript = state.messages
    .map((m) => `[${m.agent.toUpperCase()} - ${m.type}]: ${m.content}`)
    .join("\n\n");

  return streamText({
    model: google("gemini-2.5-flash"),
    system: SYSTEM_PROMPT,
    prompt: `Review the Defense's arguments and provide your rebuttal. Search for additional evidence if needed. Address each of the Defense's key points and explain why they are insufficient or misleading.

Full transcript:
${transcript}

Deliver your rebuttal. Focus on the weakest points in the Defense's argument. Keep it under 200 words.`,
    tools: {
      google_search: google.tools.googleSearch({}),
    },
    temperature: 0.5,
  });
}
