"use client";

import { motion } from "motion/react";
import ReactMarkdown from "react-markdown";
import { Scale, FileText } from "lucide-react";
import { DebateMessage } from "@/lib/types";

interface VerdictPanelProps {
  message: DebateMessage;
  variant: "response" | "verdict";
}

export function VerdictPanel({ message, variant }: VerdictPanelProps) {
  const isResponse = variant === "response";

  return (
    <motion.div
      className={`rounded-xl border overflow-hidden ${
        isResponse
          ? "border-defendant/25 bg-defendant/[0.02] defendant-glow"
          : "border-gold/25 bg-gold/[0.02] gold-glow-strong"
      }`}
      initial={{ opacity: 0, y: 20, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.8, ease: [0.23, 1, 0.32, 1] }}
    >
      {/* Header */}
      <div
        className={`flex items-center gap-3 px-6 py-4 border-b ${
          isResponse
            ? "border-defendant/12 bg-defendant/[0.04]"
            : "border-gold/12 bg-gold/[0.04]"
        }`}
      >
        {isResponse ? (
          <FileText className="w-5 h-5 text-defendant" strokeWidth={1.5} />
        ) : (
          <Scale className="w-5 h-5 text-gold" strokeWidth={1.5} />
        )}
        <span
          className={`font-serif text-sm tracking-[0.2em] font-medium ${
            isResponse ? "text-defendant" : "text-gold"
          }`}
        >
          {isResponse ? "FINAL RESPONSE" : "JUDICIAL VERDICT"}
        </span>
      </div>

      {/* Content */}
      <div className="px-6 py-5">
        <div
          className={`text-sm leading-relaxed prose prose-sm prose-invert max-w-none prose-p:my-2 prose-a:text-blue-400 prose-strong:text-foreground/90 prose-li:my-0.5 ${
            isResponse
              ? "text-foreground/85 prose-headings:text-defendant-light prose-h2:text-base prose-h2:mt-6 prose-h2:mb-2 prose-h3:text-sm prose-h3:mt-4 prose-h3:mb-1"
              : "text-foreground/85 prose-headings:text-gold-light prose-h2:text-base prose-h2:mt-6 prose-h2:mb-2 prose-h3:text-sm prose-h3:mt-4 prose-h3:mb-1"
          }`}
        >
          <ReactMarkdown>{message.content}</ReactMarkdown>
        </div>
      </div>
    </motion.div>
  );
}
