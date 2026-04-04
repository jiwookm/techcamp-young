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
        "The court will now hear arguments on the submitted prompt. The Defendant shall present their initial response.",
      delay: 1500,
    },
    {
      id: "2",
      agent: "defendant",
      type: "response",
      content:
        "Based on current research, renewable energy adoption is reshaping global economics through several key mechanisms. According to the [International Renewable Energy Agency (IRENA)](https://www.irena.org/), the renewable energy sector employed 13.7 million people globally in 2022, a significant increase from previous years.",
      delay: 1800,
    },
    {
      id: "3",
      agent: "prosecutor",
      type: "challenge",
      content:
        "The Defendant's response, while directionally correct, relies on surface-level statistics. The IRENA employment figure omits job losses in fossil fuel sectors. According to the [IEA World Energy Outlook 2023](https://www.iea.org/reports/world-energy-outlook-2023), the net employment effect is more nuanced than presented.",
      delay: 1800,
    },
    {
      id: "4",
      agent: "defendant",
      type: "rebuttal",
      content:
        "I concede the Prosecutor's point about net employment effects. However, the [World Economic Forum's Future of Jobs Report 2023](https://www.weforum.org/publications/the-future-of-jobs-report-2023/) projects that the green transition will create 30 million new jobs by 2030, significantly outpacing displacement.",
      delay: 2000,
    },
    {
      id: "5",
      agent: "prosecutor",
      type: "challenge",
      content:
        "The WEF projection is aspirational, not empirical. The Defendant must also address the geopolitical dimension — the shift from oil-dependent economies. According to [Columbia SIPA's Center on Global Energy Policy](https://www.energypolicy.columbia.edu/), petrostates face existential fiscal challenges that could destabilize entire regions.",
      delay: 2000,
    },
    {
      id: "6",
      agent: "defendant",
      type: "rebuttal",
      content:
        "The Prosecutor raises a critical gap in my initial response. The geopolitical dimension is indeed significant. I'll incorporate this: the [Brookings Institution](https://www.brookings.edu/) has documented how countries like Saudi Arabia and UAE are diversifying through sovereign wealth funds, while others like Venezuela face severe challenges.",
      delay: 1800,
    },
    {
      id: "7",
      agent: "judge",
      type: "verdict",
      content:
        "# Renewable Energy's Impact on Global Economics and Geopolitics\n\nThe transition to renewable energy represents one of the most significant economic and geopolitical shifts of the 21st century.\n\n## Economic Impact\n\nThe renewable energy sector employed 13.7 million people globally in 2022 ([IRENA](https://www.irena.org/)). While net employment effects are nuanced — with fossil fuel job losses partially offsetting gains — the [World Economic Forum](https://www.weforum.org/) projects 30 million new green jobs by 2030.\n\n## Geopolitical Implications\n\nThe shift away from fossil fuels poses existential challenges for petrostates ([Columbia SIPA](https://www.energypolicy.columbia.edu/)). Nations like Saudi Arabia are diversifying through sovereign wealth funds, while others face severe fiscal instability ([Brookings](https://www.brookings.edu/)).\n\n## Sources\n- [IRENA - International Renewable Energy Agency](https://www.irena.org/)\n- [IEA World Energy Outlook 2023](https://www.iea.org/reports/world-energy-outlook-2023)\n- [World Economic Forum Future of Jobs Report 2023](https://www.weforum.org/publications/the-future-of-jobs-report-2023/)\n- [Columbia SIPA Center on Global Energy Policy](https://www.energypolicy.columbia.edu/)\n- [Brookings Institution](https://www.brookings.edu/)",
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
