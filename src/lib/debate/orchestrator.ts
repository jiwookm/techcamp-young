import type { DebateMessage, DebateState, AgentRole, MessageType } from "@/lib/types";
import type { DebateStreamEvent } from "./stream-protocol";
import { streamOpening, streamVerdict } from "./agents/judge";
import { streamChallenge, streamSecondChallenge } from "./agents/prosecutor";
import { streamInitialResponse, streamRebuttal } from "./agents/defendant";

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
    messages: [],
    phase: "convening",
  };

  // Phase: Convening
  emit({ type: "phase-change", phase: "convening" });
  await new Promise((r) => setTimeout(r, 1200));

  // Phase: Debating
  emit({ type: "phase-change", phase: "debating" });

  // Step 1: Judge opening (brief, no constitution)
  await collectStream(streamOpening(state), "judge", "opening", state, emit);

  // Step 2: Defendant initial response
  await collectStream(
    streamInitialResponse(state),
    "defendant",
    "response",
    state,
    emit,
  );

  // Step 3: Prosecutor challenge #1
  await collectStream(
    streamChallenge(state),
    "prosecutor",
    "challenge",
    state,
    emit,
  );

  // Step 4: Defendant rebuttal #1
  await collectStream(
    streamRebuttal(state),
    "defendant",
    "rebuttal",
    state,
    emit,
  );

  // Step 5: Prosecutor challenge #2
  await collectStream(
    streamSecondChallenge(state),
    "prosecutor",
    "challenge",
    state,
    emit,
  );

  // Step 6: Defendant rebuttal #2 (this IS the final output)
  await collectStream(
    streamRebuttal(state),
    "defendant",
    "rebuttal",
    state,
    emit,
  );

  // Step 7: Judge verdict (evaluation per Constitution)
  await collectStream(
    streamVerdict(state),
    "judge",
    "verdict",
    state,
    emit,
  );

  // Done
  emit({ type: "phase-change", phase: "verdict" });
}
