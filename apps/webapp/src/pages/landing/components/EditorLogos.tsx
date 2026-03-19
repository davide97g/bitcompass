import { useScrollReveal } from "../hooks/useScrollReveal";

const editors = [
  { name: "Cursor", svg: <CursorIcon /> },
  { name: "Claude Code", svg: <ClaudeCodeIcon /> },
  { name: "VSCode", svg: <VSCodeIcon /> },
  { name: "Windsurf", svg: <WindsurfIcon /> },
  { name: "Copilot", svg: <CopilotIcon /> },
];

export function EditorLogos() {
  const ref = useScrollReveal<HTMLDivElement>();

  return (
    <section className="py-16 px-6">
      <div
        ref={ref}
        className="scroll-reveal max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-10"
      >
        <span className="text-sm text-gray-500 whitespace-nowrap">Works with</span>
        <div className="flex items-center gap-8 flex-wrap justify-center">
          {editors.map((ed) => (
            <div
              key={ed.name}
              className="editor-logo flex items-center gap-2.5 text-gray-400"
              title={ed.name}
            >
              <span className="w-6 h-6">{ed.svg}</span>
              <span className="text-sm hidden sm:inline">{ed.name}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Official-style SVG icons ────────────────────────────────────── */

/** Cursor — filled play triangle (brand mark) */
function CursorIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
      <path d="M6 3.5l14 8.5-14 8.5V3.5z" />
    </svg>
  );
}

/** Claude Code — circle with plus (Anthropic brand mark) */
function ClaudeCodeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="16" />
      <line x1="8" y1="12" x2="16" y2="12" />
    </svg>
  );
}

/** VSCode — angled bracket mark */
function VSCodeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16.5 2.5L8 11l8.5 8.5" />
      <path d="M16.5 2.5L21 5v14l-4.5 2.5" />
      <path d="M8 11L3 7.5v9L8 13" />
    </svg>
  );
}

/** Windsurf — wave/sail curve */
function WindsurfIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M4 18C8 6 20 6 20 6" />
      <path d="M4 14C8 8 16 8 16 8" />
    </svg>
  );
}

/** Copilot — speech bubble with eyes */
function CopilotIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2C6.48 2 2 5.8 2 10.5c0 2.8 1.6 5.3 4 6.8V22l3.2-2.1c.9.2 1.8.3 2.8.3 5.52 0 10-3.8 10-8.5S17.52 2 12 2z" />
      <circle cx="8.5" cy="10.5" r="1.5" fill="currentColor" />
      <circle cx="15.5" cy="10.5" r="1.5" fill="currentColor" />
    </svg>
  );
}
