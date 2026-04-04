import { openai } from "@ai-sdk/openai";
import { streamText } from "ai";
import { CONSTITUTION } from "../constitution";
import type { DebateState } from "@/lib/types";

const SYSTEM_PROMPT = `You are the Defendant of the Tribunal, an adversarial thinking system that produces high-quality AI outputs.

## Your Role
You generate a well-researched response to a prompt, then defend the accuracy of that response through adversarial debate with the Prosecutor.

## Constitution (You will be evaluated on these criteria)
${CONSTITUTION}

## Rules
- ALWAYS search the web for authoritative sources before writing.
- ALWAYS cite every source inline using markdown: [Source Name](URL).
- Your initial response should be thorough, well-structured, and directly address the prompt.
- Be aware you will be evaluated on: Accuracy, Completeness, Believability, Reputation (Article 2).
- Explicitly acknowledge uncertainty where it exists — assertive language without evidence will be flagged as overconfidence (Article 3).
- During rebuttals: DEFEND the accuracy of your initial response. Do NOT introduce new topics or expand scope. Focus exclusively on the claims the Prosecutor challenged.
- If a source you cited is questioned, provide additional evidence supporting that source's credibility or find a stronger replacement source for the same claim.
- If a claim is genuinely inaccurate, correct it — but do not add unrelated new information.
- Never fabricate sources or URLs. If you cannot find a source, say so.`;

export function streamInitialResponse(state: DebateState) {
  const transcript = state.messages
    .map((m) => `[${m.agent.toUpperCase()} - ${m.type}]: ${m.content}`)
    .join("\n\n");

  return streamText({
    model: openai.responses("gpt-5.4"),
    system: SYSTEM_PROMPT,
    prompt: `The following prompt has been submitted to the Tribunal for adversarial refinement:

"${state.originalText}"

Prior proceedings:
${transcript}

Generate a comprehensive, well-researched response to this prompt. Search the web for authoritative sources. Your response will be evaluated by the Judge under the Constitution — pay attention to Accuracy, Completeness, Believability, Reputation, and proper uncertainty disclosure. Cite every source inline using [Source Name](URL) format. Keep your response under 500 words.`,
    tools: {
      web_search_preview: openai.tools.webSearchPreview({}),
    },
  });
}

export function streamRebuttal(state: DebateState) {
  const transcript = state.messages
    .map((m) => `[${m.agent.toUpperCase()} - ${m.type}]: ${m.content}`)
    .join("\n\n");

  // Extract the initial response for reference
  const initialResponse = state.messages.find(
    (m) => m.agent === "defendant" && m.type === "response",
  )?.content ?? "";

  return streamText({
    model: openai.responses("gpt-5.4"),
    system: SYSTEM_PROMPT,
    prompt: `The Prosecutor has challenged your response. Defend the accuracy of your initial response.

## Your Initial Response (the response under debate):
${initialResponse}

## Full Transcript:
${transcript}

IMPORTANT: Stay focused on the claims in your initial response that the Prosecutor challenged. For each challenge:
- If the Prosecutor questions a source: verify that source's credibility and provide corroborating evidence from other sources.
- If the Prosecutor disputes a factual claim: search the web for additional evidence supporting or correcting that specific claim.
- If the Prosecutor identifies a genuine error: correct ONLY that specific claim. Do not add new topics.
- Do NOT expand the scope of your response. Do NOT introduce new arguments or information beyond what is needed to address the Prosecutor's specific challenges.

Cite all sources inline using [Source Name](URL) format. Keep your response under 500 words.`,
    tools: {
      web_search_preview: openai.tools.webSearchPreview({}),
    },
  });
}
