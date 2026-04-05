"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import type { ActionCtx } from "./_generated/server";

import { anthropic } from "@ai-sdk/anthropic";
import { google } from "@ai-sdk/google";
import { openai } from "@ai-sdk/openai";
import { generateText, streamText } from "ai";
import { CONSTITUTION } from "./constitution";

// --- System Prompts ---

const JUDGE_SYSTEM = `You are the Presiding Judge of the Tribunal. Your role is strictly defined by the Constitution below.

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

const PROSECUTOR_SYSTEM = `You are the Prosecutor of the Tribunal, an adversarial thinking system that produces high-quality AI outputs.

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

const DEFENDANT_SYSTEM = `You are the Defendant of the Tribunal, an adversarial thinking system that produces high-quality AI outputs.

## Your Role
You generate a well-researched response to a prompt, then defend the accuracy of that response through adversarial debate with the Prosecutor. Your goal is to present the strongest possible evidence for your claims.

## Rules
- ALWAYS search the web for authoritative sources before writing.
- ALWAYS cite every source inline using markdown: [Source Name](URL).
- Your initial response should be thorough, well-structured, and directly address the prompt.
- Back every claim with concrete, verifiable evidence from credible sources.
- Explicitly acknowledge uncertainty where it exists — do not overstate what your evidence supports.
- During rebuttals: DEFEND the accuracy of your initial response. Do NOT introduce new topics or expand scope. Focus exclusively on the claims the Prosecutor challenged.
- If a source you cited is questioned, provide additional evidence supporting that source's credibility or find a stronger replacement source for the same claim.
- If a claim is genuinely inaccurate, correct it — but do not add unrelated new information.
- Never fabricate sources or URLs. If you cannot find a source, say so.`;

// --- Helpers ---

interface DebateContext {
  text: string;
  transcript: string[];
}

async function collectAndStream(
  streamResult: { textStream: AsyncIterable<string> },
  ctx: ActionCtx,
  debateId: Id<"debates">,
  agent: string,
  messageType: string,
  order: number,
  debateCtx: DebateContext,
): Promise<string> {
  await ctx.runMutation(internal.debates.setActiveAgent, {
    debateId,
    activeAgent: agent,
  });

  let fullText = "";
  let lastFlush = Date.now();
  let isFirstChunk = true;

  for await (const chunk of streamResult.textStream) {
    fullText += chunk;
    const now = Date.now();
    if (isFirstChunk || now - lastFlush > 150) {
      isFirstChunk = false;
      await ctx.runMutation(internal.debates.setStreamingText, {
        debateId,
        streamingText: fullText,
      });
      lastFlush = now;
    }
  }

  await ctx.runMutation(internal.debates.addMessage, {
    debateId,
    agent,
    type: messageType,
    content: fullText,
    order,
  });

  debateCtx.transcript.push(
    `[${agent.toUpperCase()} - ${messageType}]: ${fullText}`,
  );

  return fullText;
}

// --- Main Action ---

async function isStopped(ctx: ActionCtx, debateId: Id<"debates">): Promise<boolean> {
  const debate = await ctx.runQuery(internal.debates.getDebateInternal, { debateId });
  return debate?.phase === "verdict";
}

export const run = internalAction({
  args: { debateId: v.id("debates") },
  handler: async (ctx, { debateId }) => {
    const debate = await ctx.runQuery(internal.debates.getDebateInternal, {
      debateId,
    });
    if (!debate) throw new Error("Debate not found");

    const debateCtx: DebateContext = {
      text: debate.text,
      transcript: [],
    };

    const sessionNumber = debate.sessionNumber ?? 1;
    const previousLessons = debate.previousLessons;

    // Compact context for agents who had a prior session
    const defendantLessons = previousLessons
      ? `\n\n## Findings from Prior Court Session(s)\nThe court previously identified these issues with your response:\n${previousLessons}\n\nAddress these specific weaknesses. Strengthen the evidence where it was found lacking.`
      : "";
    const prosecutorLessons = previousLessons
      ? `\n\n## Findings from Prior Court Session(s)\nThe court previously identified these issues:\n${previousLessons}\n\nVerify whether the Defendant has fixed these. If not, press harder. Also look for new weaknesses.`
      : "";

    try {
      // Brief convening pause
      await new Promise((r) => setTimeout(r, 1200));

      if (await isStopped(ctx, debateId)) return;
      await ctx.runMutation(internal.debates.setPhase, {
        debateId,
        phase: "debating",
      });

      let order = 0;

      // Step 1: Judge opening (brief, no constitution)
      const sessionNote = sessionNumber > 1
        ? ` This is re-evaluation session ${sessionNumber} of 3. The court has reconvened at the user's request.`
        : "";
      await collectAndStream(
        streamText({
          model: anthropic("claude-sonnet-4-6"),
          system: JUDGE_SYSTEM,
          prompt: `The court will now hear arguments on the following prompt:\n\n"${debate.text}"\n\nDeliver a brief opening statement.${sessionNote} Announce the prompt under consideration and instruct the Defendant to present their initial response. Keep it under 80 words. Do not recite the Constitution.`,
          temperature: 0.3,
        }),
        ctx,
        debateId,
        "judge",
        "opening",
        order++,
        debateCtx,
      );

      // Step 2: Defendant initial response
      if (await isStopped(ctx, debateId)) return;
      await collectAndStream(
        streamText({
          model: openai.responses("gpt-5.4"),
          system: DEFENDANT_SYSTEM,
          prompt: `The following prompt has been submitted to the Tribunal for adversarial refinement:\n\n"${debate.text}"\n\nPrior proceedings:\n${debateCtx.transcript.join("\n\n")}${defendantLessons}\n\nGenerate a comprehensive, well-researched response to this prompt. Search the web for authoritative sources. Back every claim with concrete, verifiable evidence. Cite every source inline using [Source Name](URL) format. Keep your response under 500 words.`,
          tools: {
            web_search: openai.tools.webSearch({}),
          },
        }),
        ctx,
        debateId,
        "defendant",
        "response",
        order++,
        debateCtx,
      );

      // Extract initial response for reference in subsequent steps
      const initialResponse = debateCtx.transcript
        .find((t) => t.startsWith("[DEFENDANT - response]"));
      const initialResponseContent = initialResponse
        ? initialResponse.replace(/^\[DEFENDANT - response\]: /, "")
        : "";

      // Step 3: Prosecutor challenge #1
      if (await isStopped(ctx, debateId)) return;
      await collectAndStream(
        streamText({
          model: google("gemini-3-flash-preview"),
          system: PROSECUTOR_SYSTEM,
          prompt: `The following prompt was submitted:\n"${debate.text}"\n\n## Defendant's Initial Response (the response under scrutiny):\n${initialResponseContent}\n\n## Full Transcript:\n${debateCtx.transcript.join("\n\n")}${prosecutorLessons}\n\nRigorously analyze the Defendant's initial response. For each claim and source:\n\n1. **Source Verification**: Search the web for EACH source the Defendant cited. Does the source exist? Does it actually support the claim? Is it a credible, authoritative source? Are there more recent or contradicting sources?\n\n2. **Claim Accuracy**: For each factual claim, search for counter-evidence. What do other authoritative sources say? Are the numbers correct? Is the context accurate?\n\n3. **Logical Analysis**: Are there unsupported inferences? Does correlation get presented as causation? Are there logical gaps?\n\n4. **Evidence Strength**: Which claims lack credible sources? Which sources are outdated, misrepresented, or unreliable? Present your own counter-evidence.\n\nDo NOT concede points. Challenge everything rigorously. Cite all sources inline using [Source Name](URL) format. Keep your response under 500 words.`,
          tools: {
            google_search: google.tools.googleSearch({}),
          },
          temperature: 0.5,
        }),
        ctx,
        debateId,
        "prosecutor",
        "challenge",
        order++,
        debateCtx,
      );

      // Step 4: Defendant rebuttal #1
      if (await isStopped(ctx, debateId)) return;
      await collectAndStream(
        streamText({
          model: openai.responses("gpt-5.4"),
          system: DEFENDANT_SYSTEM,
          prompt: `The Prosecutor has challenged your response. Defend the accuracy of your initial response.\n\n## Your Initial Response (the response under debate):\n${initialResponseContent}\n\n## Full Transcript:\n${debateCtx.transcript.join("\n\n")}\n\nIMPORTANT: Stay focused on the claims in your initial response that the Prosecutor challenged. For each challenge:\n- If the Prosecutor questions a source: verify that source's credibility and provide corroborating evidence from other sources.\n- If the Prosecutor disputes a factual claim: search the web for additional evidence supporting or correcting that specific claim.\n- If the Prosecutor identifies a genuine error: correct ONLY that specific claim. Do not add new topics.\n- Do NOT expand the scope of your response. Do NOT introduce new arguments or information beyond what is needed to address the Prosecutor's specific challenges.\n\nCite all sources inline using [Source Name](URL) format. Keep your response under 500 words.`,
          tools: {
            web_search: openai.tools.webSearch({}),
          },
        }),
        ctx,
        debateId,
        "defendant",
        "rebuttal",
        order++,
        debateCtx,
      );

      // Step 5: Prosecutor challenge #2
      if (await isStopped(ctx, debateId)) return;
      await collectAndStream(
        streamText({
          model: google("gemini-3-flash-preview"),
          system: PROSECUTOR_SYSTEM,
          prompt: `Review the Defendant's rebuttal and deliver your final challenge. The debate is about the accuracy of the initial response below.\n\n## Defendant's Initial Response (the original response under debate):\n${initialResponseContent}\n\n## Full Transcript:\n${debateCtx.transcript.join("\n\n")}\n\nFor your final challenge:\n1. **Re-examine the Defendant's sources**: Did the Defendant provide new sources in their rebuttal? Verify each one. Do they actually support the claim? Are they credible?\n2. **Check corrections**: If the Defendant corrected any claims, verify the corrections are accurate.\n3. **Identify what remains unresolved**: Which of your original challenges did the Defendant fail to adequately address?\n4. **Flag any scope creep**: If the Defendant introduced new topics or claims not in the original response, flag this as evasion.\n\nDo NOT concede. Push on every remaining weakness. Cite all sources inline using [Source Name](URL) format. Keep your response under 500 words.`,
          tools: {
            google_search: google.tools.googleSearch({}),
          },
          temperature: 0.5,
        }),
        ctx,
        debateId,
        "prosecutor",
        "challenge",
        order++,
        debateCtx,
      );

      // Step 6: Defendant rebuttal #2 (this IS the final output)
      if (await isStopped(ctx, debateId)) return;
      await collectAndStream(
        streamText({
          model: openai.responses("gpt-5.4"),
          system: DEFENDANT_SYSTEM,
          prompt: `The Prosecutor has delivered their final challenge. Provide your final defense of your initial response.\n\n## Your Initial Response (the response under debate):\n${initialResponseContent}\n\n## Full Transcript:\n${debateCtx.transcript.join("\n\n")}\n\nIMPORTANT: Stay focused on the claims in your initial response that the Prosecutor challenged. For each challenge:\n- If the Prosecutor questions a source: verify that source's credibility and provide corroborating evidence from other sources.\n- If the Prosecutor disputes a factual claim: search the web for additional evidence supporting or correcting that specific claim.\n- If the Prosecutor identifies a genuine error: correct ONLY that specific claim. Do not add new topics.\n- Do NOT expand the scope of your response. Do NOT introduce new arguments or information beyond what is needed to address the Prosecutor's specific challenges.\n\nCite all sources inline using [Source Name](URL) format. Keep your response under 500 words.`,
          tools: {
            web_search: openai.tools.webSearch({}),
          },
        }),
        ctx,
        debateId,
        "defendant",
        "rebuttal",
        order++,
        debateCtx,
      );

      // Step 7: Prosecutor challenge #3 (closing statement)
      if (await isStopped(ctx, debateId)) return;
      await collectAndStream(
        streamText({
          model: google("gemini-3-flash-preview"),
          system: PROSECUTOR_SYSTEM,
          prompt: `Deliver your closing statement. The debate is about the accuracy of the Defendant's initial response below.\n\n## Defendant's Initial Response (the original response under debate):\n${initialResponseContent}\n\n## Full Transcript:\n${debateCtx.transcript.join("\n\n")}\n\nThis is your final opportunity to address the court. In your closing statement:\n1. **Summarize unresolved issues**: Which of your challenges were never adequately addressed by the Defendant?\n2. **Assess source quality overall**: After two rounds of scrutiny, how credible are the Defendant's sources as a whole?\n3. **Highlight the most critical weaknesses**: What are the top 2-3 claims where the Defendant's evidence is weakest or outright wrong?\n4. **Your recommendation**: Based on the evidence presented, should the Defendant's response be trusted, partially trusted, or rejected? Summarize why.\n\nBe concise and impactful. Cite all sources inline using [Source Name](URL) format. Keep your response under 500 words.`,
          tools: {
            google_search: google.tools.googleSearch({}),
          },
          temperature: 0.5,
        }),
        ctx,
        debateId,
        "prosecutor",
        "challenge",
        order++,
        debateCtx,
      );

      // Step 8: Judge verdict + final output
      if (await isStopped(ctx, debateId)) return;
      // Find the defendant's final response for evaluation
      const defendantMessages = debateCtx.transcript.filter((t) => t.startsWith("[DEFENDANT"));
      const finalDefendantResponse = defendantMessages[defendantMessages.length - 1] ?? "";

      const verdictText = await collectAndStream(
        streamText({
          model: anthropic("claude-sonnet-4-6"),
          system: JUDGE_SYSTEM,
          prompt: `The proceedings are complete. You must now evaluate the Defendant's final response and render your verdict per the Constitution.\n\nOriginal prompt: "${debate.text}"\n\n## Defendant's Final Response (the response under evaluation):\n${finalDefendantResponse}\n\n## Full Transcript of Proceedings:\n${debateCtx.transcript.join("\n\n")}\n\nYou MUST follow this exact structure. Every section is MANDATORY. Do NOT use markdown tables — use bullet lists instead.\n\n---\n\n## 1. Claim Decomposition\n\nDecompose the Defendant's response into its constituent Claims:\n- **C1**: [statement] — Evidence: [evidence or "None"] | Source: [source or "None"] | Uncertainty: [any expressed, or "None"]\n- **C2**: ...\n(continue for all Claims)\n\n---\n\n## 2. Dual-Perspective Scoring\n\nScore each Claim from both perspectives (scale: 1 = verified, 0.5 = partial, 0 = unverifiable, −1 = incorrect):\n\n### Defense Perspective\n- **C1**: Accuracy=[val] Completeness=[val] Believability=[val] Reputation=[val] — Flags: [any threshold violations or "None"]\n- **C2**: ...\n\n**Defense averages**: Accuracy=**[val]**, Completeness=**[val]**, Believability=**[val]**, Reputation=**[val]**\n\n### Prosecutor Perspective\n- **C1**: Accuracy=[val] Completeness=[val] Believability=[val] Reputation=[val] — Flags: [any threshold violations or "None"]\n- **C2**: ...\n\n**Prosecutor averages**: Accuracy=**[val]**, Completeness=**[val]**, Believability=**[val]**, Reputation=**[val]**\n\nFlag thresholds: Accuracy ≤ 0 = critical defect, Completeness ≤ 0.5 = insufficient, Believability ≤ 0 = logically invalid, Reputation = 0 = unsupported.\n\n---\n\n## 3. Trust Computation\n\nCompute using the exact formulas from Article 4:\n\n**Defense**: Ability = 0.6×[Acc] + 0.4×[Comp] = **[val]** | Integrity = 0.5×[Bel] + 0.5×[Rep] = **[val]** | Benevolence = 0.4×max([Acc],0) + 0.2×[Comp] + 0.2×[Bel] + 0.2×[Rep] = **[val]** → **Defense Trust = 0.4×[Abi] + 0.4×[Int] + 0.2×[Ben] = [val]**\n\n**Prosecutor**: Ability = **[val]** | Integrity = **[val]** | Benevolence = **[val]** → **Prosecutor Trust = [val]**\n\n---\n\n## 4. Decision\n\n- Defense Trust **[val]**: [Accept ≥0.8 / Reconstruct 0.5–0.8 / Reject <0.5]\n- Prosecutor Trust **[val]**: [Accept / Reconstruct / Reject]\n\n**Decision: [Accept / Selective Reconstruction / Reject]**\n\n---\n\n## 5. Claim Disposition\n\n**Retained**: [list Claims kept and why]\n**Discarded**: [list Claims removed and why]\n\nIf Accepted: all Claims retained. If Rejected: list critical defects.\n\n---\n\n## 6. Justification\n\nBriefly explain:\n1. Where Defense and Prosecutor agreed vs. diverged\n2. Why specific Claims were retained or discarded\n3. The reasoning from Trust scores to the final decision\n\n---\n\n## 7. Final Output\n\nProduce the definitive response to: "${debate.text}"\n\n- **Accept**: reproduce using retained Claims only\n- **Selective Reconstruction**: integrate retained Claims from both perspectives — no new Claims (Art. 8), must be subset/recombination of originals (Art. 6 Cl. 9)\n- **Reject**: state rejection with summary of critical defects\n\nMust be complete and standalone. Cite sources inline as [Source Name](URL).`,
          temperature: 0.3,
        }),
        ctx,
        debateId,
        "judge",
        "verdict",
        order++,
        debateCtx,
      );

      await ctx.runMutation(internal.debates.setFinalOutput, {
        debateId,
        finalOutput: verdictText,
      });

      // Extract compact lesson for potential re-evaluation (fast, cheap model)
      if (sessionNumber < 3) {
        try {
          const { text: lesson } = await generateText({
            model: anthropic("claude-haiku-4-5-20251001"),
            prompt: `Compress this verdict into a brief lesson (under 150 words). List ONLY concrete findings:\n- Which specific claims were accurate vs inaccurate/unsupported\n- Which sources were verified vs unreliable\n- The overall decision and trust scores\n\nDo NOT include methodology, formulas, or article references. Only factual findings.\n\nVerdict:\n${verdictText}`,
            temperature: 0,
          });
          await ctx.runMutation(internal.debates.setLessons, {
            debateId,
            lessons: `[Session ${sessionNumber}] ${lesson}`,
          });
        } catch (e) {
          console.error("Lesson extraction failed:", e);
        }
      }

      // Done
      await ctx.runMutation(internal.debates.setPhase, {
        debateId,
        phase: "verdict",
      });
    } catch (error) {
      console.error("Debate error:", error);
      await ctx.runMutation(internal.debates.setPhase, {
        debateId,
        phase: "verdict",
      });
      await ctx.runMutation(internal.debates.setActiveAgent, {
        debateId,
        activeAgent: undefined,
      });
    }
  },
});
