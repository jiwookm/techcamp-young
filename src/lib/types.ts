export type AgentRole = "prosecutor" | "defendant" | "judge";

export type MessageType =
  | "opening"
  | "response"
  | "challenge"
  | "rebuttal"
  | "verdict";

export interface DebateMessage {
  id: string;
  agent: AgentRole;
  type: MessageType;
  content: string;
  delay: number;
}

export type TribunalPhase = "landing" | "convening" | "debating" | "verdict";

export interface AgentConfig {
  role: AgentRole;
  name: string;
  title: string;
  description: string;
  colorClass: string;
}

// --- Debate system types ---

export interface DebateState {
  id: string;
  originalText: string;
  messages: DebateMessage[];
  phase: TribunalPhase;
  finalOutput?: string;
}

// --- Agent configs ---

export const AGENT_CONFIGS: Record<AgentRole, AgentConfig> = {
  prosecutor: {
    role: "prosecutor",
    name: "Prosecutor",
    title: "THE PROSECUTION",
    description:
      "Challenges the response for accuracy, completeness, and quality",
    colorClass: "prosecutor",
  },
  defendant: {
    role: "defendant",
    name: "Defendant",
    title: "THE DEFENDANT",
    description:
      "Generates and defends the response through adversarial refinement",
    colorClass: "defendant",
  },
  judge: {
    role: "judge",
    name: "Judge",
    title: "THE COURT",
    description: "Evaluates the response for trustworthiness under the Constitution",
    colorClass: "gold",
  },
};
