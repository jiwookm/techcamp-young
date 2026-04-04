import type {
  AgentRole,
  MessageType,
  TribunalPhase,
  SubClaim,
  Evidence,
  VerdictResult,
} from "@/lib/types";

export type DebateStreamEvent =
  | { type: "phase-change"; phase: TribunalPhase }
  | { type: "agent-start"; agent: AgentRole; messageType: MessageType }
  | {
      type: "agent-chunk";
      agent: AgentRole;
      messageId: string;
      text: string;
    }
  | {
      type: "agent-done";
      agent: AgentRole;
      messageId: string;
      fullContent: string;
      messageType: MessageType;
    }
  | { type: "sub-claims"; claims: SubClaim[] }
  | { type: "evidence"; evidence: Evidence }
  | { type: "verdict"; result: VerdictResult }
  | { type: "error"; message: string }
  | { type: "done" };

export function encodeSSE(event: DebateStreamEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}
