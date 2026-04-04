"use client";

import { useEffect, useRef } from "react";
import { motion } from "motion/react";
import ReactMarkdown from "react-markdown";
import { type LucideIcon } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DebateMessage, AgentRole, AGENT_CONFIGS } from "@/lib/types";
import { cn } from "@/lib/utils";

interface AgentPanelProps {
  role: AgentRole;
  icon: LucideIcon;
  messages: DebateMessage[];
  isActive: boolean;
  variant: "horizontal" | "vertical";
  streamingContent?: string;
}

const ROLE_STYLES: Record<
  AgentRole,
  {
    border: string;
    activeBorder: string;
    headerBg: string;
    dot: string;
    textColor: string;
    glowClass: string;
  }
> = {
  prosecutor: {
    border: "border-prosecutor/12",
    activeBorder: "border-prosecutor/35",
    headerBg: "bg-prosecutor/5",
    dot: "bg-prosecutor",
    textColor: "text-prosecutor",
    glowClass: "prosecutor-glow",
  },
  defendant: {
    border: "border-defendant/12",
    activeBorder: "border-defendant/35",
    headerBg: "bg-defendant/5",
    dot: "bg-defendant",
    textColor: "text-defendant",
    glowClass: "defendant-glow",
  },
  judge: {
    border: "border-burgundy/12",
    activeBorder: "border-burgundy/35",
    headerBg: "bg-burgundy/5",
    dot: "bg-burgundy",
    textColor: "text-burgundy",
    glowClass: "burgundy-glow",
  },
};

function TypingIndicator({ role }: { role: AgentRole }) {
  const dotColor = ROLE_STYLES[role].dot;
  return (
    <div className="flex items-center gap-1.5 px-1 py-3">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className={cn("w-1.5 h-1.5 rounded-full opacity-60 typing-dot", dotColor)}
          style={{ animationDelay: `${i * 0.2}s` }}
        />
      ))}
    </div>
  );
}

export function AgentPanel({
  role,
  icon: Icon,
  messages,
  isActive,
  variant,
  streamingContent,
}: AgentPanelProps) {
  const config = AGENT_CONFIGS[role];
  const styles = ROLE_STYLES[role];
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!scrollRef.current) return;
    const viewport = scrollRef.current.querySelector(
      "[data-radix-scroll-area-viewport]",
    );
    if (viewport) {
      viewport.scrollTop = viewport.scrollHeight;
    }
  }, [messages.length, isActive, streamingContent]);

  return (
    <div
      className={cn(
        "rounded-xl border bg-surface-elevated/50 backdrop-blur-sm transition-all duration-500",
        isActive ? styles.activeBorder : styles.border,
        isActive && styles.glowClass,
      )}
    >
      {/* Header */}
      <div
        className={cn(
          "flex items-center gap-3 px-5 py-3 border-b rounded-t-xl",
          styles.headerBg,
          styles.border,
        )}
      >
        <Icon className={cn("w-4 h-4", styles.textColor)} strokeWidth={1.5} />
        <span
          className={cn(
            "font-serif text-xs tracking-[0.15em] font-medium",
            styles.textColor,
          )}
        >
          {config.title}
        </span>
        {isActive && (
          <motion.span
            className={cn(
              "ml-auto flex items-center gap-1.5 text-[10px]",
              styles.textColor,
            )}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <span
              className={cn(
                "w-1.5 h-1.5 rounded-full animate-pulse",
                styles.dot,
              )}
            />
            Speaking
          </motion.span>
        )}
      </div>

      {/* Messages */}
      <div ref={scrollRef}>
        <ScrollArea
          className={variant === "horizontal" ? "h-[200px]" : "h-[340px]"}
        >
          <div className="p-4 space-y-4">
            {messages.length === 0 && !isActive && (
              <p className="text-sm text-muted-foreground/35 italic text-center py-8 font-serif">
                Awaiting proceedings...
              </p>
            )}
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
              >
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground/50 font-medium">
                  {msg.type}
                </span>
                <div className="text-sm text-foreground/80 leading-relaxed mt-1 prose prose-sm max-w-none prose-p:my-1 prose-a:text-burgundy prose-strong:text-foreground/90">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              </motion.div>
            ))}
            {isActive && streamingContent && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground/50 font-medium">
                  speaking
                </span>
                <div className="text-sm text-foreground/80 leading-relaxed mt-1 prose prose-sm max-w-none prose-p:my-1 prose-a:text-burgundy prose-strong:text-foreground/90">
                  <ReactMarkdown>{streamingContent}</ReactMarkdown>
                  <span className="inline-block w-0.5 h-4 bg-burgundy/50 animate-pulse ml-0.5 align-text-bottom" />
                </div>
              </motion.div>
            )}
            {isActive && !streamingContent && <TypingIndicator role={role} />}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
