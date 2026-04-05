import { google } from "@ai-sdk/google";
import { streamText } from "ai";
import type { DebateState } from "@/lib/types";

const SYSTEM_PROMPT = `You are the Prosecutor of the Tribunal, an adversarial thinking system that produces high-quality AI outputs.

## Your Role
You rigorously analyze and challenge the accuracy of the Defendant's response. You do NOT concede points lightly. Your job is to scrutinize every claim, every source, and every inference — proving that the Defendant's evidence is weak, incomplete, or wrong.

## Rules
- NEVER simply concede or agree with the Defendant. Your role is adversarial — always push harder.
- For EACH source the Defendant cites: search the web to verify it. Check the source's credibility, whether it actually says what the Defendant claims, whether it is current, and whether contradicting sources exist.
- For EACH factual claim: search for counter-evidence. If the claim is correct, look for nuance the Defendant missed. If it is wrong, cite the correct information with your own sources.
- Focus on concrete evidence: cite authoritative sources that contradict or undermine the Defendant's claims.
- Stay focused on the accuracy of the Defendant's response. Do not drift into unrelated topics.
- ALWAYS cite every source inline using markdown: [Source Name](URL).
- Never fabricate sources or URLs.
- Quantify discrepancies when possible (e.g., "The Defendant claims X but [Source](URL) reports Y").`;

export function streamChallenge(state: DebateState) {
  const transcript = state.messages
    .map((m) => `[${m.agent.toUpperCase()} - ${m.type}]: ${m.content}`)
    .join("\n\n");

  // Extract the defendant's initial response
  const initialResponse = state.messages.find(
    (m) => m.agent === "defendant" && m.type === "response",
  )?.content ?? "";

  return streamText({
    model: google("gemini-3.1-pro-preview"),
    system: SYSTEM_PROMPT,
    prompt: `The following prompt was submitted:
"${state.originalText}"

## Defendant's Initial Response (the response under scrutiny):
${initialResponse}

## Full Transcript:
${transcript}

Rigorously analyze the Defendant's initial response. For each claim and source:

1. **Source Verification**: Search the web for EACH source the Defendant cited. Does the source exist? Does it actually support the claim? Is it a credible, authoritative source? Are there more recent or contradicting sources?

2. **Claim Accuracy**: For each factual claim, search for counter-evidence. What do other authoritative sources say? Are the numbers correct? Is the context accurate?

3. **Logical Analysis**: Are there unsupported inferences? Does correlation get presented as causation? Are there logical gaps?

4. **Evidence Strength**: Which claims lack credible sources? Which sources are outdated, misrepresented, or unreliable? Present your own counter-evidence.

Do NOT concede points. Challenge everything rigorously. Cite all sources inline using [Source Name](URL) format. Keep your response under 500 words.`,
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

  // Extract the defendant's initial response for reference
  const initialResponse = state.messages.find(
    (m) => m.agent === "defendant" && m.type === "response",
  )?.content ?? "";

  return streamText({
    model: google("gemini-3.1-pro-preview"),
    system: SYSTEM_PROMPT,
    prompt: `Review the Defendant's rebuttal and deliver your final challenge. The debate is about the accuracy of the initial response below.

## Defendant's Initial Response (the original response under debate):
${initialResponse}

## Full Transcript:
${transcript}

For your final challenge:
1. **Re-examine the Defendant's sources**: Did the Defendant provide new sources in their rebuttal? Verify each one. Do they actually support the claim? Are they credible?
2. **Check corrections**: If the Defendant corrected any claims, verify the corrections are accurate.
3. **Identify what remains unresolved**: Which of your original challenges did the Defendant fail to adequately address?
4. **Flag any scope creep**: If the Defendant introduced new topics or claims not in the original response, flag this as evasion.

Do NOT concede. Push on every remaining weakness. Cite all sources inline using [Source Name](URL) format. Keep your response under 500 words.`,
    tools: {
      google_search: google.tools.googleSearch({}),
    },
    temperature: 0.5,
  });
}

export function streamClosingStatement(state: DebateState) {
  const transcript = state.messages
    .map((m) => `[${m.agent.toUpperCase()} - ${m.type}]: ${m.content}`)
    .join("\n\n");

  const initialResponse = state.messages.find(
    (m) => m.agent === "defendant" && m.type === "response",
  )?.content ?? "";

  return streamText({
    model: google("gemini-3.1-pro-preview"),
    system: SYSTEM_PROMPT,
    prompt: `Deliver your closing statement. The debate is about the accuracy of the Defendant's initial response below.

## Defendant's Initial Response (the original response under debate):
${initialResponse}

## Full Transcript:
${transcript}

This is your final opportunity to address the court. In your closing statement:
1. **Summarize unresolved issues**: Which of your challenges were never adequately addressed by the Defendant?
2. **Assess source quality overall**: After two rounds of scrutiny, how credible are the Defendant's sources as a whole?
3. **Highlight the most critical weaknesses**: What are the top 2-3 claims where the Defendant's evidence is weakest or outright wrong?
4. **Your recommendation**: Based on the evidence presented, should the Defendant's response be trusted, partially trusted, or rejected? Summarize why.

Be concise and impactful. Cite all sources inline using [Source Name](URL) format. Keep your response under 500 words.`,
    tools: {
      google_search: google.tools.googleSearch({}),
    },
    temperature: 0.5,
  });
}
