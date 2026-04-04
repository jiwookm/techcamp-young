"use client";

import { useState, useCallback, useRef } from "react";
import type {
  DebateMessage,
  AgentRole,
  TribunalPhase,
} from "@/lib/types";

interface DebateStreamEvent {
  type: string;
  [key: string]: unknown;
}

export function useDebateStream() {
  const [messages, setMessages] = useState<DebateMessage[]>([]);
  const [activeAgent, setActiveAgent] = useState<AgentRole | null>(null);
  const [phase, setPhase] = useState<TribunalPhase>("landing");
  const [streamingText, setStreamingText] = useState<Record<string, string>>(
    {},
  );
  const abortRef = useRef<AbortController | null>(null);

  const startDebate = useCallback(async (text: string) => {
    setMessages([]);
    setActiveAgent(null);
    setStreamingText({});
    setPhase("convening");

    abortRef.current = new AbortController();

    try {
      const response = await fetch("/api/debate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
        signal: abortRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error("No response body");

      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          let event: DebateStreamEvent;
          try {
            event = JSON.parse(line.slice(6));
          } catch {
            continue;
          }

          switch (event.type) {
            case "phase-change":
              setPhase(event.phase as TribunalPhase);
              break;

            case "agent-start":
              setActiveAgent(event.agent as AgentRole);
              break;

            case "agent-chunk": {
              const messageId = event.messageId as string;
              const chunk = event.text as string;
              setStreamingText((prev) => ({
                ...prev,
                [messageId]: (prev[messageId] ?? "") + chunk,
              }));
              break;
            }

            case "agent-done": {
              const agent = event.agent as AgentRole;
              const messageId = event.messageId as string;
              const fullContent = event.fullContent as string;
              const messageType = event.messageType as DebateMessage["type"];
              setActiveAgent(null);
              setStreamingText((prev) => {
                const next = { ...prev };
                delete next[messageId];
                return next;
              });
              setMessages((prev) => [
                ...prev,
                {
                  id: messageId,
                  agent,
                  type: messageType,
                  content: fullContent,
                  delay: 0,
                },
              ]);
              break;
            }

            case "error":
              console.error("Debate error:", event.message);
              setPhase("landing");
              break;
          }
        }
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      console.error("Debate stream error:", error);
      setPhase("landing");
    }
  }, []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setMessages([]);
    setActiveAgent(null);
    setPhase("landing");
    setStreamingText({});
  }, []);

  return {
    messages,
    activeAgent,
    phase,
    startDebate,
    reset,
    streamingText,
  };
}
