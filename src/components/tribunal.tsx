"use client";

import { useState, useCallback } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import type { AgentRole, TribunalPhase, DebateMessage } from "@/lib/types";
import { LandingView } from "./landing-view";
import { CourthouseView } from "./courthouse-view";

export function Tribunal() {
  const [prompt, setPrompt] = useState("");
  const [debateId, setDebateId] = useState<Id<"debates"> | null>(null);

  const startDebateMutation = useMutation(api.debates.startDebate);

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

  function handleReset() {
    setPrompt("");
    setDebateId(null);
  }

  return (
    <div className="relative min-h-screen">
      <AnimatePresence mode="wait">
        {phase === "landing" ? (
          <motion.div
            key="landing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.5 }}
          >
            <LandingView
              prompt={prompt}
              onPromptChange={setPrompt}
              onSubmit={handleSubmit}
            />
          </motion.div>
        ) : (
          <motion.div
            key="courthouse"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
          >
            <CourthouseView
              prompt={prompt}
              messages={messages}
              activeAgent={activeAgent}
              phase={phase}
              onReset={handleReset}
              streamingText={streamingText}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
