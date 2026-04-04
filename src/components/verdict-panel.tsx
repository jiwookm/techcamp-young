"use client";

import { useEffect, useRef } from "react";
import { motion } from "motion/react";
import ReactMarkdown from "react-markdown";
import { Scale } from "lucide-react";
import { DebateMessage } from "@/lib/types";

interface VerdictPanelProps {
  message: DebateMessage;
  variant: "verdict";
}

export function VerdictPanel({ message }: VerdictPanelProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  return (
    <motion.div
      ref={ref}
      className="rounded-xl border overflow-hidden border-court/25 bg-court/[0.03] court-glow-strong"
      initial={{ opacity: 0, y: 20, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.8, ease: [0.23, 1, 0.32, 1] }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-court/12 bg-court/[0.04]">
        <Scale className="w-5 h-5 text-court" strokeWidth={1.5} />
        <span className="font-serif text-sm tracking-[0.2em] font-medium text-court">
          JUDICIAL VERDICT &amp; FINAL OUTPUT
        </span>
      </div>

      {/* Content */}
      <div className="px-6 py-5">
        <div className="text-sm leading-relaxed prose prose-sm max-w-none prose-p:my-2 prose-a:text-court prose-strong:text-foreground/90 prose-li:my-0.5 text-foreground/85 prose-headings:text-court-light prose-h2:text-base prose-h2:mt-6 prose-h2:mb-2 prose-h3:text-sm prose-h3:mt-4 prose-h3:mb-1">
          <ReactMarkdown components={{ a: ({ children, ...props }) => <a {...props} target="_blank" rel="noopener noreferrer">{children}</a> }}>{message.content}</ReactMarkdown>
        </div>
      </div>
    </motion.div>
  );
}
