import type { DebateMessage, DebateState, AgentRole, MessageType } from "@/lib/types";
import type { DebateStreamEvent } from "./stream-protocol";
import { decomposeClaims, streamOpening, streamInterjection, generateVerdict, streamVerdictText } from "./agents/judge";
import { streamChallenge, streamRebuttal } from "./agents/prosecutor";
import { streamDefense, streamClosing } from "./agents/advocate";

type Emit = (event: DebateStreamEvent) => void;

function createMessage(
  agent: AgentRole,
  type: MessageType,
  content: string,
): DebateMessage {
  return {
    id: `${agent}-${type}-${Date.now()}`,
    agent,
    type,
    content,
    delay: 0,
  };
}

async function collectStream(
  streamResult: { textStream: AsyncIterable<string> },
  agent: AgentRole,
  messageType: MessageType,
  state: DebateState,
  emit: Emit,
): Promise<string> {
  const messageId = `${agent}-${messageType}-${Date.now()}`;

  emit({ type: "agent-start", agent, messageType });

  let fullText = "";
  for await (const chunk of streamResult.textStream) {
    fullText += chunk;
    emit({ type: "agent-chunk", agent, messageId, text: chunk });
  }

  const message = createMessage(agent, messageType, fullText);
  message.id = messageId;
  state.messages.push(message);

  emit({
    type: "agent-done",
    agent,
    messageId,
    fullContent: fullText,
    messageType,
  });

  return fullText;
}

export async function orchestrateDebate(
  text: string,
  emit: Emit,
): Promise<void> {
  const state: DebateState = {
    id: `trb-${Date.now().toString(36)}`,
    originalText: text,
    subClaims: [],
    evidence: [],
    messages: [],
    phase: "convening",
  };

  // Phase: Convening
  emit({ type: "phase-change", phase: "convening" });
  await new Promise((r) => setTimeout(r, 1200));

  // Phase: Debating
  emit({ type: "phase-change", phase: "debating" });

  // Step 1: Judge decomposes claims
  const subClaims = await decomposeClaims(text);
  state.subClaims = subClaims;
  emit({ type: "sub-claims", claims: subClaims });

  // Step 2: Judge opening statement
  await collectStream(streamOpening(state), "judge", "opening", state, emit);

  // Step 3: Prosecutor challenge (Gemini + Google Search)
  await collectStream(
    streamChallenge(state),
    "prosecutor",
    "argument",
    state,
    emit,
  );

  // Step 4: Advocate defense (GPT-4o + Web Search)
  await collectStream(
    streamDefense(state),
    "advocate",
    "counter",
    state,
    emit,
  );

  // Step 5: Judge interjection
  await collectStream(
    streamInterjection(state),
    "judge",
    "interjection",
    state,
    emit,
  );

  // Step 6: Prosecutor rebuttal
  await collectStream(
    streamRebuttal(state),
    "prosecutor",
    "closing",
    state,
    emit,
  );

  // Step 7: Advocate closing
  await collectStream(
    streamClosing(state),
    "advocate",
    "closing",
    state,
    emit,
  );

  // Step 8: Judge verdict (structured + text)
  const verdictResult = await generateVerdict(state);
  state.verdict = verdictResult;
  emit({ type: "verdict", result: verdictResult });

  await collectStream(
    streamVerdictText(state, verdictResult),
    "judge",
    "verdict",
    state,
    emit,
  );

  // Done
  emit({ type: "phase-change", phase: "verdict" });
}
