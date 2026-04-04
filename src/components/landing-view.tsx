"use client";

import { motion } from "motion/react";
import { Scale, Swords, Shield, ArrowRight } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { AGENT_CONFIGS, AgentRole } from "@/lib/types";
import Image from "next/image";

interface LandingViewProps {
  prompt: string;
  onPromptChange: (value: string) => void;
  onSubmit: () => void;
}

const EXAMPLE_PROMPT =
  "Write a comprehensive analysis of how renewable energy adoption is affecting global economics and geopolitics.";

const agentCards: {
  role: AgentRole;
  icon: typeof Scale;
  borderColor: string;
  iconColor: string;
}[] = [
  {
    role: "prosecutor",
    icon: Swords,
    borderColor: "border-prosecutor/20",
    iconColor: "text-prosecutor",
  },
  {
    role: "judge",
    icon: Scale,
    borderColor: "border-burgundy/20",
    iconColor: "text-burgundy",
  },
  {
    role: "defendant",
    icon: Shield,
    borderColor: "border-defendant/20",
    iconColor: "text-defendant",
  },
];

export function LandingView({
  prompt,
  onPromptChange,
  onSubmit,
}: LandingViewProps) {
  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      onSubmit();
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-20 relative overflow-hidden">
      {/* Lady Justice — decorative background */}
      <motion.div
        className="absolute right-[-5%] top-[50%] -translate-y-[55%] pointer-events-none select-none hidden lg:block"
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 0.09 }}
        transition={{ duration: 2, delay: 0.5, ease: "easeOut" }}
      >
        <Image
          src="/lady-justice.png"
          alt=""
          width={748}
          height={1012}
          className="w-[550px] h-auto"
          priority
        />
      </motion.div>

      {/* Hero */}
      <motion.div
        className="flex flex-col items-center text-center max-w-3xl relative z-10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.23, 1, 0.32, 1] }}
      >
        <motion.div
          className="mb-6"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, delay: 0.2 }}
        >
          <Scale className="w-12 h-12 text-burgundy/40" strokeWidth={1} />
        </motion.div>

        <h1 className="font-serif text-8xl sm:text-9xl tracking-[0.06em] text-burgundy font-medium mb-6 select-none leading-none">
          TRIBUNAL
        </h1>

        <div className="w-24 h-px bg-burgundy/20 mb-6" />

        <p className="text-burgundy/50 text-lg mb-14 tracking-wide font-serif italic">
          Adversarial Thinking for Better AI Outputs
        </p>
      </motion.div>

      {/* Input area */}
      <motion.div
        className="w-full max-w-2xl relative z-10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.3, ease: [0.23, 1, 0.32, 1] }}
      >
        <div className="textarea-tribunal rounded-xl border border-burgundy/15 bg-surface-elevated/60 backdrop-blur-sm p-1">
          <Textarea
            value={prompt}
            onChange={(e) => onPromptChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter any prompt for adversarial refinement..."
            className="min-h-[140px] bg-transparent border-0 text-foreground placeholder:text-muted-foreground/50 resize-none focus-visible:ring-0 text-base leading-relaxed p-4"
          />
          <div className="flex items-center justify-between px-3 pb-3">
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground/40">
                {"\u2318"} + Enter to submit
              </span>
              <button
                type="button"
                onClick={() => onPromptChange(EXAMPLE_PROMPT)}
                className="text-xs text-burgundy-dim hover:text-burgundy transition-colors cursor-pointer"
              >
                Try an example
              </button>
            </div>
            <button
              onClick={onSubmit}
              disabled={!prompt.trim()}
              className="inline-flex items-center gap-2 rounded-full border border-burgundy/40 text-burgundy px-6 py-2 text-sm font-medium tracking-wide hover:bg-burgundy hover:text-primary-foreground transition-all duration-300 disabled:opacity-30 cursor-pointer"
            >
              Convene Tribunal
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>

      {/* Agent cards */}
      <motion.div
        className="flex flex-col sm:flex-row gap-4 mt-20 max-w-3xl w-full relative z-10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.6, ease: [0.23, 1, 0.32, 1] }}
      >
        {agentCards.map(({ role, icon: Icon, borderColor, iconColor }, i) => {
          const config = AGENT_CONFIGS[role];
          return (
            <motion.div
              key={role}
              className={`flex-1 rounded-lg border ${borderColor} bg-surface-elevated/40 p-5`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.7 + i * 0.1 }}
            >
              <Icon
                className={`w-5 h-5 ${iconColor} mb-3`}
                strokeWidth={1.5}
              />
              <h3 className="font-serif text-sm tracking-wider text-foreground/90 mb-1.5">
                {config.title}
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {config.description}
              </p>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Team credits */}
      <motion.div
        className="mt-20 text-left self-start ml-8 sm:ml-16"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 1 }}
      >
        <p className="text-xs font-serif italic text-burgundy/35 leading-relaxed">
          Hajong Kim<br />
          Jiwoo Kim<br />
          Ji-hyun Kim<br />
          Bomin Chae<br />
          Junhee Lee
        </p>
      </motion.div>

      <motion.p
        className="text-[11px] text-burgundy/25 mt-8 tracking-[0.2em] uppercase select-none font-serif"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 1.1 }}
      >
        Three agents &middot; One constitution &middot; Refined output
      </motion.p>
    </div>
  );
}
