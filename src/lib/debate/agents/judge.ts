import { anthropic } from "@ai-sdk/anthropic";
import { streamText } from "ai";
import { CONSTITUTION } from "../constitution";
import type { DebateState } from "@/lib/types";

const SYSTEM_PROMPT = `You are the Presiding Judge of the Tribunal. Your role is strictly defined by the Constitution below.

## Constitution
${CONSTITUTION}

## Operational Rules
- You EVALUATE the Defendant's response using the dual-perspective scoring system (Article 1). You do NOT generate, modify, or supplement it.
- Keep your opening brief and procedural — do not recite the Constitution.
- Use formal judicial language throughout.
- Your verdict must follow the Constitution's framework exactly:
  1. Decompose the response into Claims, Evidence, Sources, and Uncertainty markers (Article 2)
  2. Score each Claim from BOTH Defense and Prosecutor perspectives on Accuracy, Completeness, Believability, Reputation (Article 3)
  3. Compute Trust components using the exact formulas: Ability = 0.6×Accuracy + 0.4×Completeness, Integrity = 0.5×Believability + 0.5×Reputation, Benevolence = 0.4×max(Accuracy,0) + 0.2×Completeness + 0.2×Believability + 0.2×Reputation (Article 4)
  4. Compute Trust = 0.4×Ability + 0.4×Integrity + 0.2×Benevolence for both perspectives (Article 1)
  5. Apply decision rules: Trust < 0.5 → Reject, Trust ≥ 0.8 → Accept, 0.5 ≤ Trust < 0.8 → Reconstruct (Article 5)
  6. If reconstruction is needed, apply selective integration rules (Article 6)
  7. Provide explicit justification with Claim evaluations, D/P comparison, retained/discarded elements, and Trust assessment (Article 7)
- You are PROHIBITED from introducing new information, generating Claims, supplementing with external knowledge, altering Claim meaning, or producing outputs without justification (Article 8).`;

export function streamOpening(state: DebateState) {
  return streamText({
    model: anthropic("claude-sonnet-4-6"),
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
    model: anthropic("claude-sonnet-4-6"),
    system: SYSTEM_PROMPT,
    prompt: `The proceedings are complete. You must now evaluate the Defendant's final response and render your verdict per the Constitution.

Original prompt: "${state.originalText}"

## Defendant's Final Response (the response under evaluation):
${finalResponse}

## Full Transcript of Proceedings:
${transcript}

You MUST follow this exact structure. Every section is MANDATORY. Do NOT use markdown tables — use bullet lists instead.

---

## 1. Claim Decomposition

Decompose the Defendant's response into its constituent Claims:
- **C1**: [statement] — Evidence: [evidence or "None"] | Source: [source or "None"] | Uncertainty: [any expressed, or "None"]
- **C2**: ...
(continue for all Claims)

---

## 2. Dual-Perspective Scoring

Score each Claim from both perspectives (scale: 1 = verified, 0.5 = partial, 0 = unverifiable, −1 = incorrect):

### Defense Perspective
- **C1**: Accuracy=[val] Completeness=[val] Believability=[val] Reputation=[val] — Flags: [any threshold violations or "None"]
- **C2**: ...

**Defense averages**: Accuracy=**[val]**, Completeness=**[val]**, Believability=**[val]**, Reputation=**[val]**

### Prosecutor Perspective
- **C1**: Accuracy=[val] Completeness=[val] Believability=[val] Reputation=[val] — Flags: [any threshold violations or "None"]
- **C2**: ...

**Prosecutor averages**: Accuracy=**[val]**, Completeness=**[val]**, Believability=**[val]**, Reputation=**[val]**

Flag thresholds: Accuracy ≤ 0 = critical defect, Completeness ≤ 0.5 = insufficient, Believability ≤ 0 = logically invalid, Reputation = 0 = unsupported.

---

## 3. Trust Computation

Compute using the exact formulas from Article 4:

**Defense**: Ability = 0.6×[Acc] + 0.4×[Comp] = **[val]** | Integrity = 0.5×[Bel] + 0.5×[Rep] = **[val]** | Benevolence = 0.4×max([Acc],0) + 0.2×[Comp] + 0.2×[Bel] + 0.2×[Rep] = **[val]** → **Defense Trust = 0.4×[Abi] + 0.4×[Int] + 0.2×[Ben] = [val]**

**Prosecutor**: Ability = **[val]** | Integrity = **[val]** | Benevolence = **[val]** → **Prosecutor Trust = [val]**

---

## 4. Decision

- Defense Trust **[val]**: [Accept ≥0.8 / Reconstruct 0.5–0.8 / Reject <0.5]
- Prosecutor Trust **[val]**: [Accept / Reconstruct / Reject]

**Decision: [Accept / Selective Reconstruction / Reject]**

---

## 5. Claim Disposition

**Retained**: [list Claims kept and why]
**Discarded**: [list Claims removed and why]

If Accepted: all Claims retained. If Rejected: list critical defects.

---

## 6. Justification

Briefly explain:
1. Where Defense and Prosecutor agreed vs. diverged
2. Why specific Claims were retained or discarded
3. The reasoning from Trust scores to the final decision

---

## 7. Final Output

Produce the definitive response to: "${state.originalText}"

- If **Accepted**: reproduce the Defendant's response using only retained Claims.
- If **Selective Reconstruction**: present the integrated response formed from retained Claims of both perspectives. No new Claims may be introduced (Art. 8). The output must be a subset or recombination of original Claims (Art. 6 Cl. 9).
- If **Rejected**: state that the response has been rejected with a summary of critical defects.

The Final Output must be a complete, standalone response to the user's prompt. Cite sources inline using [Source Name](URL) format.`,
    temperature: 0.3,
  });
}
