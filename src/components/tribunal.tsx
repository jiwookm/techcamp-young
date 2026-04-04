"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useDebateSimulation } from "@/lib/mock-debate";
import { LandingView } from "./landing-view";
import { CourthouseView } from "./courthouse-view";

export function Tribunal() {
  const [prompt, setPrompt] = useState("");
  const { messages, activeAgent, phase, startDebate, reset } =
    useDebateSimulation();

  function handleSubmit() {
    if (!prompt.trim()) return;
    startDebate(prompt.trim());
  }

  function handleReset() {
    setPrompt("");
    reset();
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
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
