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

// --- Debate system types ---

export interface SubClaim {
  id: string;
  text: string;
  category: "factual" | "statistical" | "causal" | "predictive" | "opinion";
}

export interface Evidence {
  id: string;
  subClaimId: string;
  source: string;
  url?: string;
  snippet: string;
  supports: boolean;
  reliability: "high" | "medium" | "low";
}

export interface VerdictResult {
  overallRating:
    | "verified"
    | "mostly_true"
    | "mixed"
    | "mostly_false"
    | "false"
    | "unverifiable";
  confidence: number;
  summary: string;
  subClaimResults: Array<{
    subClaimId: string;
    rating: string;
    reasoning: string;
  }>;
  recommendedRevision?: string;
}

export interface DebateState {
  id: string;
  originalText: string;
  subClaims: SubClaim[];
  evidence: Evidence[];
  messages: DebateMessage[];
  phase: TribunalPhase;
  verdict?: VerdictResult;
}

// --- Agent configs ---

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
