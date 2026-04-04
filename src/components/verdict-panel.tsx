"use client";

import { motion } from "motion/react";
import ReactMarkdown from "react-markdown";
import { Scale } from "lucide-react";
import { DebateMessage } from "@/lib/types";

interface VerdictPanelProps {
  message: DebateMessage;
  variant: "verdict";
}

export function VerdictPanel({ message }: VerdictPanelProps) {
  return (
    <motion.div
      className="rounded-xl border overflow-hidden border-burgundy/25 bg-burgundy/[0.03] burgundy-glow-strong"
      initial={{ opacity: 0, y: 20, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.8, ease: [0.23, 1, 0.32, 1] }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-burgundy/12 bg-burgundy/[0.04]">
        <Scale className="w-5 h-5 text-burgundy" strokeWidth={1.5} />
        <span className="font-serif text-sm tracking-[0.2em] font-medium text-burgundy">
          JUDICIAL VERDICT &amp; FINAL OUTPUT
        </span>
      </div>

      {/* Content */}
      <div className="px-6 py-5">
        <div className="text-sm leading-relaxed prose prose-sm max-w-none prose-p:my-2 prose-a:text-burgundy prose-strong:text-foreground/90 prose-li:my-0.5 text-foreground/85 prose-headings:text-burgundy-light prose-h2:text-base prose-h2:mt-6 prose-h2:mb-2 prose-h3:text-sm prose-h3:mt-4 prose-h3:mb-1">
          <ReactMarkdown>{message.content}</ReactMarkdown>
        </div>
      </div>
    </motion.div>
  );
}
