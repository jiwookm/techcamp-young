```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        TRIBUNAL AGENT ARCHITECTURE                         │
│                   Adversarial AI Trustworthiness System                     │
└─────────────────────────────────────────────────────────────────────────────┘

                              ┌──────────┐
                              │   USER   │
                              │  Prompt  │
                              └────┬─────┘
                                   │
                    ┌──────────────┴──────────────┐
                    ▼                              ▼
          ┌─────────────────┐           ┌──────────────────┐
          │  Next.js Client │           │   Convex Client  │
          │  (landing-view) │           │ (tribunal.tsx)   │
          └────────┬────────┘           └────────┬─────────┘
                   │                             │
                   ▼                             ▼
          ┌─────────────────┐           ┌──────────────────┐
          │ POST /api/debate│           │ debates.startDeb │
          │   (route.ts)    │           │   (mutation)     │
          │  Zod validation │           │                  │
          └────────┬────────┘           └────────┬─────────┘
                   │                             │
                   ▼                             ▼
          ┌─────────────────┐           ┌──────────────────┐
          │  orchestrator   │           │  runDebate.run   │
          │   .ts (SSE)     │           │  (internalAction)│
          └────────┬────────┘           └────────┬─────────┘
                   │                             │
                   └──────────────┬──────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│                    ┌──────────────────────────┐                             │
│                    │      CONSTITUTION        │                             │
│                    │  (9 Articles governing   │                             │
│                    │   all agent behavior)    │                             │
│                    └────────────┬─────────────┘                             │
│                                 │ injected into all system prompts          │
│                                 │                                           │
│   ┌─────────────────────────────┼─────────────────────────────────┐        │
│   │                             │                                 │        │
│   ▼                             ▼                                 ▼        │
│ ┌───────────────┐   ┌────────────────────┐   ┌─────────────────────┐      │
│ │    JUDGE      │   │    DEFENDANT       │   │    PROSECUTOR       │      │
│ │               │   │                    │   │                     │      │
│ │ Claude Opus   │   │ GPT-5.4            │   │ Gemini 3.1 Pro      │      │
│ │   4.6         │   │ (responses mode)   │   │   Preview           │      │
│ │               │   │                    │   │                     │      │
│ │ temp: 0.3     │   │ + web_search_      │   │ + google_search     │      │
│ │ (no tools)    │   │   preview tool     │   │   tool              │      │
│ │               │   │                    │   │                     │      │
│ │ EVALUATES     │   │ GENERATES &        │   │ CHALLENGES &        │      │
│ │ only          │   │ DEFENDS            │   │ VERIFIES            │      │
│ └───────┬───────┘   └─────────┬──────────┘   └──────────┬──────────┘      │
│         │                     │                          │                 │
│         │                     │                          │                 │
│ ┌───────┴─────────────────────┴──────────────────────────┴───────────┐     │
│ │                     SEQUENTIAL DEBATE FLOW                         │     │
│ │                                                                    │     │
│ │  Step 1 ──► JUDGE: Opening Statement                               │     │
│ │              "The court will now hear arguments on..."             │     │
│ │                          │                                         │     │
│ │  Step 2 ──► DEFENDANT: Initial Response (web search + sources)     │     │
│ │              Researches prompt, cites sources, <500 words          │     │
│ │                          │                                         │     │
│ │  Step 3 ──► PROSECUTOR: Challenge #1 (google search + verify)      │     │
│ │              Verifies every source, disputes claims                │     │
│ │                          │                                         │     │
│ │  Step 4 ──► DEFENDANT: Rebuttal #1 (web search + defend)          │     │
│ │              Defends challenged claims, corrects genuine errors    │     │
│ │                          │                                         │     │
│ │  Step 5 ──► PROSECUTOR: Challenge #2 (verify rebuttals)           │     │
│ │              Re-examines new sources, flags unresolved issues      │     │
│ │                          │                                         │     │
│ │  Step 6 ──► DEFENDANT: Rebuttal #2 / Final Defense                │     │
│ │              Last chance to address remaining challenges           │     │
│ │                          │                                         │     │
│ │  Step 7 ──► JUDGE: Verdict (Articles 1-7 evaluation)              │     │
│ │              Scores claims → Trust assessment → Verdict            │     │
│ │              Acceptable | Qualified | Rejected                     │     │
│ │                          │                                         │     │
│ └──────────────────────────┴─────────────────────────────────────────┘     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
                    ┌──────────────────────────┐
                    │      DATA LAYER          │
                    │                          │
                    │  Convex DB               │
                    │  ┌────────────────────┐  │
                    │  │ debates            │  │
                    │  │  text, phase,      │  │
                    │  │  activeAgent,      │  │
                    │  │  streamingText,    │  │
                    │  │  finalOutput       │  │
                    │  └────────────────────┘  │
                    │  ┌────────────────────┐  │
                    │  │ debate_messages    │  │
                    │  │  debateId, agent,  │  │
                    │  │  type, content,    │  │
                    │  │  order             │  │
                    │  └────────────────────┘  │
                    └──────────────────────────┘
                                  │
                                  ▼
                    ┌──────────────────────────┐
                    │      FRONTEND            │
                    │                          │
                    │  landing-view.tsx         │
                    │       │                   │
                    │       ▼                   │
                    │  courthouse-view.tsx      │
                    │  ┌─────────────────────┐ │
                    │  │ agent-panel.tsx x3   │ │
                    │  │ (judge/def/pros)     │ │
                    │  └─────────────────────┘ │
                    │       │                   │
                    │       ▼                   │
                    │  verdict-panel.tsx        │
                    │  constitution-dialog.tsx  │
                    └──────────────────────────┘
```

---

## Workflow Explanations

### 1. User Input & Routing

The user submits a prompt (any factual question or claim). Two parallel execution paths exist:
- **Next.js SSE path**: `POST /api/debate` validates input with Zod, then streams events via `orchestrator.ts` using Server-Sent Events directly to the client.
- **Convex path**: `debates.startDebate` mutation inserts a debate row, then schedules the `runDebate.run` internal action. The Convex path persists every message to the database and streams intermediate text via `streamingText` field polling (flushed every 400ms). The client subscribes reactively via `getDebate` and `getMessages` queries.

### 2. Constitution Injection

All three agents receive the full 9-Article Constitution in their system prompts. This is the shared "law" governing behavior -- it defines how claims are decomposed (Article 1), scored (Article 2), checked for cognitive distortions (Article 3), assessed for trust (Articles 4-5), and verdicted (Article 6). The Judge is bound by it; the Defendant and Prosecutor are aware they'll be evaluated against it.

### 3. Judge Opening (Step 1)

**Model**: Claude Opus 4.6 (temp 0.3, no tools)

The Judge opens the proceedings with a brief (<80 words) procedural statement. It announces the prompt and instructs the Defendant to respond. It does not recite the Constitution or introduce any substantive content -- purely procedural.

### 4. Defendant Initial Response (Step 2)

**Model**: GPT-5.4 Responses (with `web_search_preview` tool)

The Defendant searches the web for authoritative sources, then generates a comprehensive response (<500 words) with inline citations in `[Source Name](URL)` format. It explicitly acknowledges uncertainty where evidence is thin, knowing that overconfidence will be penalized under Article 3.

### 5. Prosecutor Challenge #1 (Step 3)

**Model**: Gemini 3.1 Pro Preview (with `google_search` tool, temp 0.5)

The Prosecutor independently verifies every source and claim from the Defendant's response using Google Search. It checks: does each source exist, is it credible, does it say what the Defendant claims, are there contradicting sources? It flags cognitive distortions, logical gaps, and harm risks. It never concedes.

### 6. Defendant Rebuttal #1 (Step 4)

**Model**: GPT-5.4 Responses (with `web_search_preview` tool)

The Defendant addresses only the specific challenges raised by the Prosecutor. It provides corroborating evidence for questioned sources, corrects genuine errors, but does not expand scope or introduce new topics. Scope discipline is enforced by the system prompt.

### 7. Prosecutor Challenge #2 (Step 5)

**Model**: Gemini 3.1 Pro Preview (with `google_search` tool, temp 0.5)

The Prosecutor re-examines the Defendant's rebuttal: verifies new sources, checks corrections for accuracy, identifies unresolved challenges, and flags any scope creep as evasion. This is the final adversarial push.

### 8. Defendant Final Defense (Step 6)

**Model**: GPT-5.4 Responses (with `web_search_preview` tool)

The Defendant's last chance to address remaining weaknesses. Same rules apply -- defend, don't expand. This becomes the response the Judge evaluates.

### 9. Judge Verdict (Step 7)

**Model**: Claude Opus 4.6 (temp 0.3, no tools)

The Judge evaluates the Defendant's final response following the Constitution exactly:
1. **Claim Decomposition** (Art. 1) -- breaks response into Claims, Evidence, Sources, Uncertainty markers
2. **Information Quality** (Art. 2) -- scores each claim on Accuracy/Completeness/Believability/Reputation using the -1 to 1 scale
3. **Cognitive Distortion** (Art. 3) -- flags overconfidence or missing uncertainty
4. **Trust Components** (Art. 4) -- Ability, Integrity, Benevolence, Harm Risk
5. **Overall Trustworthiness** (Art. 5) -- integrated assessment
6. **Verdict** (Art. 6) -- **Acceptable**, **Qualified**, or **Rejected**
7. **Justification** (Art. 7) -- explicit reasoning

In the Convex path, the Judge also produces a **Final Output** -- a standalone refined response based on the verdict severity. The `finalOutput` is persisted for the user.

### 10. Multi-Model Design Rationale

The system deliberately uses three different AI providers:
- **Claude Opus 4.6** (Judge) -- deepest reasoning, no tools needed, evaluates without generating
- **GPT-5.4** (Defendant) -- strong generation + OpenAI web search for sourcing
- **Gemini 3.1 Pro** (Prosecutor) -- independent verification via Google Search, different knowledge base

This cross-model design prevents systemic blind spots: each model has different training data, different failure modes, and different search backends. The adversarial structure forces claims through multiple independent verification layers before a verdict is rendered.
