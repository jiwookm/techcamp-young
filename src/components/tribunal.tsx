"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { motion } from "motion/react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import type { AgentRole, TribunalPhase, DebateMessage } from "@/lib/types";
import { LandingView } from "./landing-view";
import { CourthouseView } from "./courthouse-view";

export function Tribunal() {
  const [prompt, setPrompt] = useState("");
  const [debateId, setDebateId] = useState<Id<"debates"> | null>(null);
  const courthouseRef = useRef<HTMLDivElement>(null);

  const startDebateMutation = useMutation(api.debates.startDebate);
  const stopDebateMutation = useMutation(api.debates.stopDebate);
  const requestReEvaluationMutation = useMutation(
    api.debates.requestReEvaluation,
  );

  const debate = useQuery(
    api.debates.getDebate,
    debateId ? { debateId } : "skip",
  );
  const convexMessages = useQuery(
    api.debates.getMessages,
    debateId ? { debateId } : "skip",
  );

  // Map Convex data to component props
  const phase: TribunalPhase = debate?.phase as TribunalPhase ?? "landing";
  const activeAgent: AgentRole | null =
    (debate?.activeAgent as AgentRole) ?? null;
  const sessionNumber: number = (debate?.sessionNumber as number) ?? 1;
  const messages: DebateMessage[] = (convexMessages ?? []).map(
    (m: { _id: string; agent: string; type: string; content: string }) => ({
      id: m._id,
      agent: m.agent as AgentRole,
      type: m.type as DebateMessage["type"],
      content: m.content,
      delay: 0,
    }),
  );

  // Build streaming text map for the active agent
  const streamingText: Record<string, string> = {};
  if (debate?.streamingText && activeAgent) {
    streamingText[`${activeAgent}-streaming`] = debate.streamingText;
  }

  const handleSubmit = useCallback(async () => {
    if (!prompt.trim()) return;
    const id = await startDebateMutation({ text: prompt.trim() });
    setDebateId(id);
  }, [prompt, startDebateMutation]);

  const handleStop = useCallback(async () => {
    if (!debateId) return;
    await stopDebateMutation({ debateId });
  }, [debateId, stopDebateMutation]);

  const handleReEvaluation = useCallback(async () => {
    if (!debateId) return;
    const newId = await requestReEvaluationMutation({ debateId });
    setDebateId(newId);
  }, [debateId, requestReEvaluationMutation]);

  // Auto-scroll to courthouse when debate starts
  useEffect(() => {
    if (phase !== "landing" && courthouseRef.current) {
      courthouseRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [phase]);

  function handleReset() {
    setPrompt("");
    setDebateId(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const isGenerating = phase === "convening" || phase === "debating";

  return (
    <div className="relative">
      <LandingView
        prompt={prompt}
        onPromptChange={setPrompt}
        onSubmit={handleSubmit}
      />

      {phase !== "landing" && (
        <motion.div
          ref={courthouseRef}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
        >
          <CourthouseView
            prompt={prompt}
            messages={messages}
            activeAgent={activeAgent}
            phase={phase}
            onReset={handleReset}
            onStop={handleStop}
            onReEvaluate={handleReEvaluation}
            isGenerating={isGenerating}
            streamingText={streamingText}
            sessionNumber={sessionNumber}
          />
        </motion.div>
      )}
    </div>
  );
}
