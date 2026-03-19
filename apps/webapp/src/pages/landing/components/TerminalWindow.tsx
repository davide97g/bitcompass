import { useEffect, useState, useRef } from "react";
import type { TerminalLineData } from "../data/terminal-content";

interface TerminalWindowProps {
  title?: string;
  lines: TerminalLineData[];
  className?: string;
  animate?: boolean;
  glowColor?: "cyan" | "green" | "purple";
}

export function TerminalWindow({
  title = "terminal",
  lines,
  className = "",
  animate = true,
  glowColor,
}: TerminalWindowProps) {
  const [visibleCount, setVisibleCount] = useState(animate ? 0 : lines.length);
  const timeoutsRef = useRef<number[]>([]);

  useEffect(() => {
    if (!animate) {
      setVisibleCount(lines.length);
      return;
    }

    setVisibleCount(0);
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];

    lines.forEach((line, i) => {
      const id = window.setTimeout(() => {
        setVisibleCount((prev) => Math.max(prev, i + 1));
      }, line.delay ?? i * 200);
      timeoutsRef.current.push(id);
    });

    return () => {
      timeoutsRef.current.forEach(clearTimeout);
    };
  }, [lines, animate]);

  const glowClass = glowColor ? `glow-${glowColor}` : "";

  return (
    <div className={`terminal-window ${glowClass} ${className}`}>
      <div className="terminal-titlebar">
        <div className="terminal-dot terminal-dot--red" />
        <div className="terminal-dot terminal-dot--yellow" />
        <div className="terminal-dot terminal-dot--green" />
        <div className="terminal-title">{title}</div>
      </div>
      <div className="terminal-body">
        {lines.map((line, i) => (
          <TerminalLine
            key={`${i}-${line.type}`}
            line={line}
            visible={i < visibleCount}
            animate={animate}
          />
        ))}
        {animate && visibleCount < lines.length && (
          <span className="cursor-blink" />
        )}
      </div>
    </div>
  );
}

function TerminalLine({
  line,
  visible,
  animate,
}: {
  line: TerminalLineData;
  visible: boolean;
  animate: boolean;
}) {
  const visClass = animate ? (visible ? "visible" : "") : "no-animate";

  if (line.type === "blank") {
    return <div className={`terminal-line terminal-line--blank ${visClass}`} />;
  }

  return (
    <div className={`terminal-line terminal-line--${line.type} ${visClass}`}>
      {typeof line.content === "string"
        ? line.content
        : line.content.map((seg, j) => (
            <span key={j} style={{ color: seg.color }}>
              {seg.text}
            </span>
          ))}
    </div>
  );
}
