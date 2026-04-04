"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { DebateMessage, AgentRole, TribunalPhase } from "./types";

export function generateDebate(_prompt: string): DebateMessage[] {
  return [
    {
      id: "1",
      agent: "judge",
      type: "opening",
      content:
        "Case No. TRB-2024-0847 is now in session. The claim submitted for adversarial review shall be examined under the default constitution. The Prosecution may present its opening challenge.",
      delay: 1500,
    },
    {
      id: "2",
      agent: "prosecutor",
      type: "argument",
      content:
        'The claim of 80% job replacement lacks empirical support. The most widely cited study \u2014 Frey & Osborne (2013) \u2014 estimated 47% of US jobs were at risk of automation, not 80%. The OECD\u2019s subsequent analysis (2019) revised this figure down to just 14%. The submitted claim cites no source for its headline number.',
      delay: 1800,
    },
    {
      id: "3",
      agent: "advocate",
      type: "counter",
      content:
        "While the specific 80% figure may be hyperbolic, the directional claim has substantive backing. McKinsey Global Institute (2023) found that generative AI could automate 60\u201370% of current work activities. The key distinction is between job displacement and job transformation \u2014 most jobs will be significantly transformed, even if not fully replaced.",
      delay: 1800,
    },
    {
      id: "4",
      agent: "prosecutor",
      type: "evidence",
      content:
        'The Defense conflates \u201cwork activities\u201d with \u201cjobs.\u201d Automating 60% of tasks within a job does not eliminate that job \u2014 it transforms it. Historical precedent: ATMs didn\u2019t eliminate bank tellers; they shifted their role to relationship management. The Bureau of Labor Statistics recorded an increase in bank teller employment after ATM introduction. The 80% claim implies wholesale elimination.',
      delay: 2000,
    },
    {
      id: "5",
      agent: "advocate",
      type: "evidence",
      content:
        "Historical analogies have limited applicability here. Previous automation waves affected manual and routine cognitive tasks. Large language models and multimodal AI now affect creative, analytical, and interpersonal tasks \u2014 the very skills previously considered automation-proof. The pace of capability improvement represents an exponential trajectory without historical parallel.",
      delay: 2000,
    },
    {
      id: "6",
      agent: "judge",
      type: "interjection",
      content:
        'I\u2019ll note for the record that the Defense\u2019s argument about pace is relevant but speculative \u2014 it projects from a short baseline. The Prosecution\u2019s historical evidence is empirical. Both parties should now address the specific \u201c80%\u201d quantitative claim and the \u201cnext decade\u201d timeline.',
      delay: 1500,
    },
    {
      id: "7",
      agent: "prosecutor",
      type: "closing",
      content:
        "To summarize: The 80% figure appears nowhere in peer-reviewed literature. The highest credible estimate (McKinsey) references task automation, not job elimination. The claim conflates transformation with replacement, uses a timeline unsupported by any major forecasting body, and fails to account for job creation effects that have accompanied every prior technological revolution.",
      delay: 1800,
    },
    {
      id: "8",
      agent: "advocate",
      type: "closing",
      content:
        "The Defense concedes the 80% figure is not directly supported by current literature. However, the underlying concern \u2014 that AI will fundamentally reshape the majority of occupations within a decade \u2014 is well-supported by McKinsey, Goldman Sachs, and World Economic Forum analyses. The claim\u2019s core insight about massive labor market disruption remains valid, even if the specific number overshoots credible estimates.",
      delay: 1800,
    },
    {
      id: "9",
      agent: "judge",
      type: "verdict",
      content:
        'RULING: The claim \u201cAI will replace 80% of jobs within the next decade\u201d is found to be SUBSTANTIALLY MISLEADING.\n\n\u2014 The 80% figure lacks citation from any credible source\n\u2014 Peer-reviewed estimates range from 14% (OECD) to 47% (Frey & Osborne) for jobs at risk\n\u2014 The McKinsey figure of 60\u201370% refers to automatable tasks within jobs, not whole-job elimination\n\u2014 The \u201cnext decade\u201d timeline is speculative and unsupported by major forecasting bodies\n\nHowever, the Defense successfully establishes that significant labor market transformation is well-evidenced across multiple credible sources.\n\nRECOMMENDED REVISION: \u201cAI is expected to significantly transform the majority of jobs within the next decade, though credible estimates of full job displacement range from 14% to 47% depending on methodology and definition.\u201d',
      delay: 2500,
    },
  ];
}

const GAP_MS = 600;

export function useDebateSimulation() {
  const [visibleMessages, setVisibleMessages] = useState<DebateMessage[]>([]);
  const [activeAgent, setActiveAgent] = useState<AgentRole | null>(null);
  const [phase, setPhase] = useState<TribunalPhase>("landing");
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearAllTimeouts = useCallback(() => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
  }, []);

  const startDebate = useCallback(
    (prompt: string) => {
      clearAllTimeouts();
      setVisibleMessages([]);
      setActiveAgent(null);
      setPhase("convening");

      const allMessages = generateDebate(prompt);
      let elapsed = 0;

      // Transition to debating after convening animation
      elapsed += 1200;
      timeoutsRef.current.push(
        setTimeout(() => setPhase("debating"), elapsed),
      );

      allMessages.forEach((msg, i) => {
        // Gap between messages
        elapsed += GAP_MS;
        const thinkAt = elapsed;
        timeoutsRef.current.push(
          setTimeout(() => setActiveAgent(msg.agent), thinkAt),
        );

        // Message appears after thinking
        elapsed += msg.delay;
        const showAt = elapsed;
        timeoutsRef.current.push(
          setTimeout(() => {
            setVisibleMessages((prev) => [...prev, msg]);
            setActiveAgent(null);

            // After last message, transition to verdict
            if (i === allMessages.length - 1) {
              timeoutsRef.current.push(
                setTimeout(() => setPhase("verdict"), 1500),
              );
            }
          }, showAt),
        );
      });
    },
    [clearAllTimeouts],
  );

  const reset = useCallback(() => {
    clearAllTimeouts();
    setVisibleMessages([]);
    setActiveAgent(null);
    setPhase("landing");
  }, [clearAllTimeouts]);

  useEffect(() => {
    return () => clearAllTimeouts();
  }, [clearAllTimeouts]);

  return {
    messages: visibleMessages,
    activeAgent,
    phase,
    startDebate,
    reset,
  };
}
