export type AgentRole = "prosecutor" | "advocate" | "judge";

export type MessageType =
  | "opening"
  | "argument"
  | "counter"
  | "evidence"
  | "objection"
  | "interjection"
  | "closing"
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

export const AGENT_CONFIGS: Record<AgentRole, AgentConfig> = {
  prosecutor: {
    role: "prosecutor",
    name: "Prosecutor",
    title: "THE PROSECUTION",
    description:
      "Hunts for unsupported claims, contradictions, and unsubstantiated assertions",
    colorClass: "prosecutor",
  },
  advocate: {
    role: "advocate",
    name: "Advocate",
    title: "THE DEFENSE",
    description:
      "Defends substantiated arguments with corroborating evidence",
    colorClass: "advocate",
  },
  judge: {
    role: "judge",
    name: "Judge",
    title: "THE COURT",
    description: "Rules under your constitution with full transparency",
    colorClass: "gold",
  },
};
