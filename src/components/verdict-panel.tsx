"use client";

import { motion } from "motion/react";
import ReactMarkdown from "react-markdown";
import { Scale } from "lucide-react";
import { DebateMessage } from "@/lib/types";

interface VerdictPanelProps {
  message: DebateMessage;
}

export function VerdictPanel({ message }: VerdictPanelProps) {
  const lines = message.content.split("\n");
  const ruling = lines[0];
  const rest = lines.slice(1).join("\n");

  return (
    <motion.div
      className="rounded-xl border border-gold/25 bg-gold/[0.02] gold-glow-strong overflow-hidden"
      initial={{ opacity: 0, y: 20, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.8, ease: [0.23, 1, 0.32, 1] }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-gold/12 bg-gold/[0.04]">
        <Scale className="w-5 h-5 text-gold" strokeWidth={1.5} />
        <span className="font-serif text-sm tracking-[0.2em] text-gold font-medium">
          VERDICT
        </span>
      </div>

      {/* Content */}
      <div className="px-6 py-5">
        <div className="text-base font-medium text-gold-light mb-4 prose prose-sm prose-invert max-w-none prose-p:my-0 prose-strong:text-gold-light">
          <ReactMarkdown>{ruling}</ReactMarkdown>
        </div>
        <div className="text-sm text-foreground/75 leading-relaxed prose prose-sm prose-invert max-w-none prose-p:my-1 prose-a:text-blue-400 prose-strong:text-foreground/90">
          <ReactMarkdown>{rest}</ReactMarkdown>
        </div>
      </div>
    </motion.div>
  );
}
