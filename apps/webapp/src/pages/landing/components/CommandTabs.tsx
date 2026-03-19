import { useState, useEffect, useCallback, useRef } from "react";
import {
  Rocket,
  Search,
  Upload,
  RefreshCw,
  Plug,
} from "lucide-react";
import { TerminalWindow } from "./TerminalWindow";
import { commandTabs } from "../data/terminal-content";
import { useScrollReveal } from "../hooks/useScrollReveal";

const iconMap: Record<string, React.ReactNode> = {
  Rocket: <Rocket className="w-4 h-4" />,
  Search: <Search className="w-4 h-4" />,
  Upload: <Upload className="w-4 h-4" />,
  RefreshCw: <RefreshCw className="w-4 h-4" />,
  Plug: <Plug className="w-4 h-4" />,
};

export function CommandTabs() {
  const [activeTab, setActiveTab] = useState(0);
  const [paused, setPaused] = useState(false);
  const [animKey, setAnimKey] = useState(0);
  const intervalRef = useRef<number>();
  const ref = useScrollReveal<HTMLElement>();

  const goToTab = useCallback(
    (index: number) => {
      setActiveTab(index);
      setAnimKey((k) => k + 1);
    },
    []
  );

  // Auto-rotate
  useEffect(() => {
    if (paused) return;

    intervalRef.current = window.setInterval(() => {
      setActiveTab((prev) => (prev + 1) % commandTabs.length);
      setAnimKey((k) => k + 1);
    }, 5000);

    return () => clearInterval(intervalRef.current);
  }, [paused]);

  const tab = commandTabs[activeTab];

  return (
    <section id="commands" ref={ref} className="scroll-reveal py-20 px-6">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl sm:text-4xl font-bold text-center text-white mb-4">
          Everything from the terminal
        </h2>
        <p className="text-gray-400 text-center mb-12 max-w-xl mx-auto">
          Powerful commands that make sharing and syncing rules effortless.
        </p>

        {/* Tab pills */}
        <div
          className="flex flex-wrap justify-center gap-2 mb-10"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          {commandTabs.map((t, i) => (
            <button
              key={t.id}
              onClick={() => goToTab(i)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                i === activeTab
                  ? "bg-white/10 text-white border border-white/20"
                  : "text-gray-500 hover:text-gray-300 border border-transparent"
              }`}
            >
              {iconMap[t.icon]}
              {t.label}
            </button>
          ))}
        </div>

        {/* Progress bar */}
        <div className="max-w-md mx-auto mb-10 h-0.5 bg-white/5 rounded-full overflow-hidden">
          <div
            key={`${activeTab}-${animKey}`}
            className={`tab-progress ${paused ? "" : "active"}`}
            style={paused ? { width: "100%" } : undefined}
          />
        </div>

        {/* Content: description + terminal */}
        <div
          className="grid md:grid-cols-2 gap-10 items-start"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          {/* Left: description */}
          <div className="flex flex-col justify-center">
            <div className="inline-flex items-center gap-2 text-[#7fdbca] mb-3">
              {iconMap[tab.icon]}
              <span className="text-sm font-medium uppercase tracking-wider">
                {tab.label}
              </span>
            </div>
            <h3 className="text-2xl font-bold text-white mb-4">{tab.description}</h3>
            <ul className="space-y-3">
              {tab.bullets.map((b, i) => (
                <li key={i} className="flex items-start gap-3 text-gray-400">
                  <span className="text-[#c3e88d] mt-1">▸</span>
                  {b}
                </li>
              ))}
            </ul>
          </div>

          {/* Right: terminal */}
          <TerminalWindow
            key={`terminal-${activeTab}-${animKey}`}
            title={`bitcompass ${tab.id}`}
            lines={tab.lines}
            animate={true}
            glowColor="cyan"
          />
        </div>
      </div>
    </section>
  );
}
