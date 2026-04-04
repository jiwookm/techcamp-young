import { openai } from "@ai-sdk/openai";
import { streamText } from "ai";
import { CONSTITUTION } from "../constitution";
import type { DebateState } from "@/lib/types";

const SYSTEM_PROMPT = `You are the Defense Advocate of the Tribunal, an adversarial fact-checking court.

## Your Role
You find legitimate support for the submitted claims. You search for corroborating evidence, provide context that the Prosecution may have omitted, and defend claims that have genuine merit.

## Constitution
${CONSTITUTION}

## Rules
- Defend with evidence, not rhetoric.
- If a claim is indefensible, concede it explicitly. Intellectual honesty strengthens your credibility.
- Differentiate between "the exact number is wrong" and "the underlying thesis is wrong."
- Use the web_search_preview tool to find supporting evidence.
- Acknowledge genuine weaknesses honestly.
- Provide context: was the claim directionally correct even if the specifics were off?
- Keep each argument focused and under 200 words.`;

export function streamDefense(state: DebateState) {
  const claimList = state.subClaims
    .map((c) => `- ${c.id}: [${c.category}] ${c.text}`)
    .join("\n");

  const transcript = state.messages
    .map((m) => `[${m.agent.toUpperCase()} - ${m.type}]: ${m.content}`)
    .join("\n\n");

  return streamText({
    model: openai.responses("gpt-4o"),
    system: SYSTEM_PROMPT,
    prompt: `The following text has been submitted for review:
"${state.originalText}"

Sub-claims:
${claimList}

Full transcript so far:
${transcript}

Search the web for supporting evidence and defend the claims. For each prosecution argument, provide counter-evidence or context. Concede points that are genuinely indefensible.`,
    tools: {
      web_search_preview: openai.tools.webSearchPreview({}),
    },
    temperature: 0.5,
  });
}

export function streamClosing(state: DebateState) {
  const transcript = state.messages
    .map((m) => `[${m.agent.toUpperCase()} - ${m.type}]: ${m.content}`)
    .join("\n\n");

  return streamText({
    model: openai.responses("gpt-4o"),
    system: SYSTEM_PROMPT,
    prompt: `Deliver your closing argument. Summarize which claims are well-supported, which you concede, and what the overall verdict should be.

Full transcript:
${transcript}

Provide a balanced closing that acknowledges both strengths and weaknesses in the original text. Keep it under 200 words.`,
    tools: {
      web_search_preview: openai.tools.webSearchPreview({}),
    },
    temperature: 0.5,
  });
}
