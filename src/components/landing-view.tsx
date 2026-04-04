"use client";

import { motion } from "motion/react";
import { Scale, Swords, Shield, ArrowRight } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { AGENT_CONFIGS, AgentRole } from "@/lib/types";

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
    borderColor: "border-gold/20",
    iconColor: "text-gold",
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
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-20">
      {/* Hero */}
      <motion.div
        className="flex flex-col items-center text-center max-w-2xl"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.23, 1, 0.32, 1] }}
      >
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, delay: 0.2 }}
        >
          <Scale className="w-11 h-11 text-gold/50" strokeWidth={1} />
        </motion.div>

        <h1 className="font-serif text-6xl sm:text-7xl tracking-[0.14em] text-gold-light font-medium mb-4 select-none">
          TRIBUNAL
        </h1>

        <p className="text-muted-foreground text-lg mb-10 tracking-wide">
          Adversarial Thinking for Better AI Outputs
        </p>

        <div className="w-16 h-px bg-gold/25 mb-12" />
      </motion.div>

      {/* Input area */}
      <motion.div
        className="w-full max-w-2xl"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.3, ease: [0.23, 1, 0.32, 1] }}
      >
        <div className="textarea-tribunal rounded-xl border border-border/60 bg-card/50 backdrop-blur-sm p-1">
          <Textarea
            value={prompt}
            onChange={(e) => onPromptChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter any prompt for adversarial refinement..."
            className="min-h-[140px] bg-transparent border-0 text-foreground placeholder:text-muted-foreground/40 resize-none focus-visible:ring-0 text-base leading-relaxed p-4"
          />
          <div className="flex items-center justify-between px-3 pb-3">
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground/30">
                {"\u2318"} + Enter to submit
              </span>
              <button
                type="button"
                onClick={() => onPromptChange(EXAMPLE_PROMPT)}
                className="text-xs text-gold-dim hover:text-gold transition-colors cursor-pointer"
              >
                Try an example
              </button>
            </div>
            <Button
              onClick={onSubmit}
              disabled={!prompt.trim()}
              className="bg-gold hover:bg-gold-light text-background font-medium px-6 gap-2 transition-all duration-200 disabled:opacity-30 cursor-pointer"
            >
              Convene Tribunal
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Agent cards */}
      <motion.div
        className="flex flex-col sm:flex-row gap-4 mt-20 max-w-3xl w-full"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.6, ease: [0.23, 1, 0.32, 1] }}
      >
        {agentCards.map(({ role, icon: Icon, borderColor, iconColor }, i) => {
          const config = AGENT_CONFIGS[role];
          return (
            <motion.div
              key={role}
              className={`flex-1 rounded-lg border ${borderColor} bg-card/30 p-5`}
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

      <motion.p
        className="text-[11px] text-muted-foreground/25 mt-16 tracking-[0.2em] uppercase select-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 1 }}
      >
        Three agents &middot; One constitution &middot; Refined output
      </motion.p>
    </div>
  );
}
