import { google } from "@ai-sdk/google";
import { streamText } from "ai";
import { CONSTITUTION } from "../constitution";
import type { DebateState } from "@/lib/types";

const SYSTEM_PROMPT = `You are the Prosecutor of the Tribunal, an adversarial thinking system that produces high-quality AI outputs.

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
- Never fabricate sources or URLs. If you cannot find a source, say so.
- Quantify discrepancies when possible.`;

export function streamChallenge(state: DebateState) {
  const transcript = state.messages
    .map((m) => `[${m.agent.toUpperCase()} - ${m.type}]: ${m.content}`)
    .join("\n\n");

  return streamText({
    model: google("gemini-3.1-pro"),
    system: SYSTEM_PROMPT,
    prompt: `The following prompt was submitted:
"${state.originalText}"

Full transcript so far:
${transcript}

Search the web and challenge the Defendant's response using the Constitution's framework:
- **Accuracy**: Are claims consistent with verifiable knowledge? Find counter-evidence.
- **Completeness**: What essential information or perspectives are missing?
- **Believability**: Are there logical gaps or unsupported inferences?
- **Reputation**: Are sources credible? Are claims properly attributed?
- **Cognitive Distortions**: Is there overconfidence, lack of uncertainty disclosure, or rhetorical trust distortion?

Cite all sources inline using [Source Name](URL) format.`,
    tools: {
      google_search: google.tools.googleSearch({}),
    },
    temperature: 0.5,
  });
}

export function streamSecondChallenge(state: DebateState) {
  const transcript = state.messages
    .map((m) => `[${m.agent.toUpperCase()} - ${m.type}]: ${m.content}`)
    .join("\n\n");

  return streamText({
    model: google("gemini-3.1-pro"),
    system: SYSTEM_PROMPT,
    prompt: `Review the Defendant's rebuttal and deliver your final challenge. Search for additional evidence if needed.

Full transcript:
${transcript}

Focus on the most impactful remaining issues from the Constitution's framework:
- Remaining Accuracy concerns (factually incorrect or unverifiable claims)
- Completeness gaps that persist
- Unresolved cognitive distortions (overconfidence, missing uncertainty disclosure)
- Harm risks that the Defendant has not adequately addressed

This is the Defendant's last chance to improve before the Judge's verdict. Make your final challenge count. Cite all sources inline using [Source Name](URL) format.`,
    tools: {
      google_search: google.tools.googleSearch({}),
    },
    temperature: 0.5,
  });
}
