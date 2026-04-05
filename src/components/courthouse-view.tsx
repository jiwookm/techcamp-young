"use client";

import { motion } from "motion/react";
import { Scale, Swords, Shield, RotateCcw, Square, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AgentPanel } from "./agent-panel";
import { VerdictPanel } from "./verdict-panel";
import { DebateMessage, AgentRole, TribunalPhase } from "@/lib/types";

interface CourthouseViewProps {
  prompt: string;
  messages: DebateMessage[];
  activeAgent: AgentRole | null;
  phase: TribunalPhase;
  onReset: () => void;
  onStop: () => void;
  onReEvaluate: () => void;
  isGenerating: boolean;
  streamingText?: Record<string, string>;
  sessionNumber: number;
}

export function CourthouseView({
  prompt,
  messages,
  activeAgent,
  phase,
  onReset,
  onStop,
  onReEvaluate,
  isGenerating,
  streamingText = {},
  sessionNumber,
}: CourthouseViewProps) {
  const prosecutorMessages = messages.filter((m) => m.agent === "prosecutor");
  const defendantMessages = messages.filter((m) => m.agent === "defendant");
  const judgeMessages = messages.filter(
    (m) => m.agent === "judge" && m.type !== "verdict",
  );
  const verdictMessage = messages.find((m) => m.type === "verdict");

  // When judge already delivered the opening and is active again, it must be the verdict
  const judgeStreamingContent = activeAgent === "judge" ? Object.values(streamingText)[0] : undefined;
  const judgeIsStreamingVerdict = activeAgent === "judge" && judgeMessages.length > 0;

  const canReEvaluate = phase === "verdict" && sessionNumber < 3;

  return (
    <div className="flex flex-col min-h-screen">
      {/* Case header */}
      <motion.header
        className="border-b border-burgundy/10 bg-surface/50 backdrop-blur-sm sticky top-0 z-40"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <Scale className="w-5 h-5 text-burgundy/40 shrink-0" strokeWidth={1.5} />
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <span className="font-serif text-sm tracking-wider text-burgundy/60">
                  CASE No. TRB-2024-0847
                </span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full border ${
                    phase === "verdict"
                      ? "border-burgundy/25 text-burgundy bg-burgundy/5"
                      : "border-prosecutor/25 text-prosecutor bg-prosecutor/5"
                  }`}
                >
                  {phase === "verdict" ? "CONCLUDED" : "IN SESSION"}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full border border-court/20 text-court/70 bg-court/5">
                  Session {sessionNumber}/3
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-1 truncate">
                &ldquo;{prompt}&rdquo;
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {isGenerating && (
              <Button
                variant="ghost"
                onClick={onStop}
                className="text-prosecutor hover:text-prosecutor-light hover:bg-prosecutor/10 gap-2 cursor-pointer"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                Stop
              </Button>
            )}
            <Button
              variant="ghost"
              onClick={onReset}
              className="text-muted-foreground hover:text-foreground gap-2 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              New Case
            </Button>
          </div>
        </div>
      </motion.header>

      {/* Convening overlay */}
      {phase === "convening" && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
        >
          <motion.div
            className="text-center"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Scale
              className="w-10 h-10 text-burgundy/30 mx-auto mb-4"
              strokeWidth={1}
            />
            <p className="font-serif text-xl tracking-[0.15em] text-burgundy/50">
              {sessionNumber > 1 ? "Reconvening Tribunal..." : "Convening Tribunal..."}
            </p>
          </motion.div>
        </motion.div>
      )}

      {/* Debate panels */}
      <div className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6">
        {/* Judge panel */}
        <motion.div
          className="mb-5"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <AgentPanel
            role="judge"
            icon={Scale}
            messages={judgeMessages}
            isActive={activeAgent === "judge" && !judgeIsStreamingVerdict}
            variant="horizontal"
            streamingContent={!judgeIsStreamingVerdict ? judgeStreamingContent : undefined}
          />
        </motion.div>

        {/* Defendant & Prosecutor */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-5">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.7 }}
          >
            <AgentPanel
              role="defendant"
              icon={Shield}
              messages={defendantMessages}
              isActive={activeAgent === "defendant"}
              variant="vertical"
              streamingContent={activeAgent === "defendant" ? Object.values(streamingText)[0] : undefined}
            />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.7 }}
          >
            <AgentPanel
              role="prosecutor"
              icon={Swords}
              messages={prosecutorMessages}
              isActive={activeAgent === "prosecutor"}
              variant="vertical"
              streamingContent={activeAgent === "prosecutor" ? Object.values(streamingText)[0] : undefined}
            />
          </motion.div>
        </div>

        {/* Judicial Verdict & Final Output */}
        {(verdictMessage || judgeIsStreamingVerdict) && (
          <VerdictPanel
            message={verdictMessage}
            streamingContent={judgeIsStreamingVerdict ? judgeStreamingContent : undefined}
            variant="verdict"
          />
        )}

        {/* Re-evaluation button */}
        {canReEvaluate && (
          <motion.div
            className="flex justify-center py-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <Button
              onClick={onReEvaluate}
              className="gap-2 bg-court/10 text-court hover:bg-court/20 border border-court/25 font-serif tracking-wider cursor-pointer"
              variant="ghost"
            >
              <RefreshCw className="w-4 h-4" />
              Request Re-evaluation (Session {sessionNumber + 1}/3)
            </Button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
