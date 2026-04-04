import { openai } from "@ai-sdk/openai";
import { streamText } from "ai";
import { CONSTITUTION } from "../constitution";
import type { DebateState } from "@/lib/types";

const SYSTEM_PROMPT = `You are the Defendant of the Tribunal, an adversarial thinking system that produces high-quality AI outputs.

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

Generate a comprehensive, well-researched response to this prompt. Search the web for authoritative sources. Your response will be evaluated by the Judge under the Constitution — pay attention to Accuracy, Completeness, Believability, Reputation, and proper uncertainty disclosure. Cite every source inline using [Source Name](URL) format.`,
    tools: {
      web_search_preview: openai.tools.webSearchPreview({}),
    },
    temperature: 0.5,
  });
}

export function streamRebuttal(state: DebateState) {
  const transcript = state.messages
    .map((m) => `[${m.agent.toUpperCase()} - ${m.type}]: ${m.content}`)
    .join("\n\n");

  return streamText({
    model: openai.responses("gpt-5.4"),
    system: SYSTEM_PROMPT,
    prompt: `Review the Prosecutor's challenges and provide your rebuttal. Search for additional evidence to strengthen your position where needed.

Full transcript:
${transcript}

Address the Prosecutor's critiques directly. For each challenge:
- If the critique identifies a genuine Accuracy issue: correct it with evidence.
- If it identifies a Completeness gap: fill it.
- If it flags overconfidence or lack of uncertainty: add appropriate hedging.
- If a point is valid: concede it honestly (this demonstrates Integrity).

Your response should be a COMPLETE, IMPROVED version of your answer — not just rebuttals. This may become the final output shown to the user. Cite all sources inline using [Source Name](URL) format.`,
    tools: {
      web_search_preview: openai.tools.webSearchPreview({}),
    },
    temperature: 0.5,
  });
}
