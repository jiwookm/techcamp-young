import { anthropic } from "@ai-sdk/anthropic";
import { streamText } from "ai";
import { CONSTITUTION } from "../constitution";
import type { DebateState } from "@/lib/types";

const SYSTEM_PROMPT = `You are the Presiding Judge of the Tribunal. Your role is strictly defined by the Constitution below.

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

export function streamOpening(state: DebateState) {
  return streamText({
    model: anthropic("claude-opus-4-6"),
    system: SYSTEM_PROMPT,
    prompt: `The court will now hear arguments on the following prompt:

"${state.originalText}"

Deliver a brief opening statement. Announce the prompt under consideration and instruct the Defendant to present their initial response. Keep it under 80 words. Do not recite the Constitution.`,
    temperature: 0.3,
  });
}

export function streamVerdict(state: DebateState) {
  const transcript = state.messages
    .map((m) => `[${m.agent.toUpperCase()} - ${m.type}]: ${m.content}`)
    .join("\n\n");

  // Find the defendant's final rebuttal (the response under evaluation)
  const defendantMessages = state.messages.filter((m) => m.agent === "defendant");
  const finalResponse = defendantMessages[defendantMessages.length - 1]?.content ?? "";

  return streamText({
    model: anthropic("claude-opus-4-6"),
    system: SYSTEM_PROMPT,
    prompt: `The proceedings are complete. You must now evaluate the Defendant's final response and render your verdict per the Constitution.

Original prompt: "${state.originalText}"

## Defendant's Final Response (the response under evaluation):
${finalResponse}

## Full Transcript of Proceedings:
${transcript}

Render your verdict by strictly following the Constitution:

1. **Claim Decomposition** (Article 1): Identify the key Claims, Evidence, Sources, and Uncertainty markers in the Defendant's final response.

2. **Information Quality** (Article 2): Evaluate key Claims on Accuracy (consistency with verifiable knowledge), Completeness (coverage of essential information), Believability (logical coherence), and Reputation (source credibility). Use the scale: 1 (consistent), 0.5 (partially consistent), 0 (not verifiable), -1 (factually incorrect).

3. **Cognitive Distortion Assessment** (Article 3): Identify any overconfidence (assertive language despite insufficient accuracy/completeness), lack of uncertainty disclosure, or trust distortion through rhetorical fluency.

4. **Trust Components** (Article 4): Assess Ability (from Accuracy + Completeness), Integrity (from Reputation + internal consistency), Benevolence (potential for harm), and Harm Risk (misunderstanding potential, risk of incorrect actions, incomplete information risk).

5. **Overall Trustworthiness** (Article 5): Integrate Ability, Integrity, and Benevolence into an overall assessment.

6. **Verdict** (Article 6): Issue one of: **Acceptable**, **Qualified**, or **Rejected**.

7. **Justification** (Article 7): Provide explicit justification including Claim evaluation results, trust component assessment, and critical strengths or deficiencies.

REMEMBER: You must NOT introduce any new information, generate or modify Claims, or revise the response. Evaluate only what is present in the Defendant's response.`,
    temperature: 0.3,
  });
}
