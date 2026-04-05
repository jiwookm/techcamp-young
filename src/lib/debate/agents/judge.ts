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

You MUST follow this exact structure. Every section is MANDATORY. Use the exact headings, formulas, and numerical computations where indicated.

---

## 1. Claim Decomposition (Article 2)

Decompose the Defendant's response into its constituent units. List each as a bullet:
- **Claim [N]**: [the atomic factual or inferential statement]
  - Evidence: [supporting justification found in the response, or "None provided"]
  - Source: [reference/provenance cited, or "None cited"]
  - Uncertainty: [any explicit uncertainty or limitation expressed, or "None expressed"]

---

## 2. Dual-Perspective Information Quality Scores (Articles 1 & 3)

For EACH Claim, assign scores from BOTH Defense and Prosecutor perspectives using ONLY this scale:
- 1 = Consistent with verifiable knowledge
- 0.5 = Partially consistent
- 0 = Not verifiable
- −1 = Factually incorrect

### Defense Perspective
| Claim | Accuracy | Completeness | Believability | Reputation | Flags |
|-------|----------|--------------|---------------|------------|-------|

### Prosecutor Perspective
| Claim | Accuracy | Completeness | Believability | Reputation | Flags |
|-------|----------|--------------|---------------|------------|-------|

In the Flags column, apply the constitutional thresholds:
- Accuracy ≤ 0 → "Critical defect" (Art. 3 Cl. 6)
- Completeness ≤ 0.5 → "Insufficient" (Art. 3 Cl. 7)
- Believability ≤ 0 → "Logically invalid" (Art. 3 Cl. 8)
- Reputation = 0 → "Unsupported" (Art. 3 Cl. 9)

Compute averages for each perspective:
- **Defense avg**: Accuracy=[val], Completeness=[val], Believability=[val], Reputation=[val]
- **Prosecutor avg**: Accuracy=[val], Completeness=[val], Believability=[val], Reputation=[val]

---

## 3. Trust Component Computation (Article 4)

Using the average scores from Section 2, compute for EACH perspective using the EXACT formulas:

### Defense Trust
- Ability = 0.6 × [Accuracy] + 0.4 × [Completeness] = [value]
- Integrity = 0.5 × [Believability] + 0.5 × [Reputation] = [value]
- Benevolence = 0.4 × max([Accuracy], 0) + 0.2 × [Completeness] + 0.2 × [Believability] + 0.2 × [Reputation] = [value]
- **Defense Trust = 0.4 × [Ability] + 0.4 × [Integrity] + 0.2 × [Benevolence] = [value]**

### Prosecutor Trust
- Ability = 0.6 × [Accuracy] + 0.4 × [Completeness] = [value]
- Integrity = 0.5 × [Believability] + 0.5 × [Reputation] = [value]
- Benevolence = 0.4 × max([Accuracy], 0) + 0.2 × [Completeness] + 0.2 × [Believability] + 0.2 × [Reputation] = [value]
- **Prosecutor Trust = 0.4 × [Ability] + 0.4 × [Integrity] + 0.2 × [Benevolence] = [value]**

---

## 4. Decision (Article 5)

Apply decision rules to BOTH perspectives:
- Defense Trust [value]: [Accepted (≥0.8) / Reconstruct (0.5–0.8) / Rejected (<0.5)]
- Prosecutor Trust [value]: [Accepted (≥0.8) / Reconstruct (0.5–0.8) / Rejected (<0.5)]

**Decision: [Accept / Selective Reconstruction / Reject]**

---

## 5. Selective Reconstruction (Article 6)

If the decision is Selective Reconstruction, apply the integration rules:
1. Compare Defense and Prosecutor scores for each Claim
2. Retain Claims with stronger evaluated quality from either perspective
3. Exclude Claims identified as defective, misleading, unsupported, or risky
4. Form the reconstructed response by selecting, filtering, and reorganizing retained Claims
5. Do NOT introduce new Claims or alter the meaning of retained Claims

If the decision is Accept, reproduce the Defendant's response with retained Claims only.
If the decision is Reject, state that the response cannot be used and list the critical defects.

### Retained Claims: [list]
### Discarded Claims: [list with reason]

---

## 6. Justification (Article 7)

1. **Key Claim evaluation results** — which Claims strengthened or weakened the response from each perspective
2. **Defense vs. Prosecutor comparison** — where the two perspectives agreed and diverged
3. **Retained and discarded elements** — what was kept, what was removed, and why
4. **Final Trust assessment** — the reasoning path from the computed scores to the decision

---

## 7. Final Output

Based on the decision and reconstruction above, produce the definitive response to the user's original prompt: "${state.originalText}"

- If **Accepted**: reproduce the Defendant's response using only retained Claims.
- If **Selective Reconstruction**: present the integrated response formed from retained Claims of both perspectives. No new Claims may be introduced (Art. 8). The output must be a subset or recombination of original Claims (Art. 6 Cl. 9).
- If **Rejected**: state that the response has been rejected with a summary of critical defects.

The Final Output must be a complete, standalone response to the user's prompt. Cite sources inline using [Source Name](URL) format.`,
    temperature: 0.3,
  });
}
