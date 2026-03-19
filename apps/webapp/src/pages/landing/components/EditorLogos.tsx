import { useScrollReveal } from "../hooks/useScrollReveal";

const editors = [
  {
    name: "Cursor",
    logo: "https://cursor.com/marketing-static/icon-192x192.png",
    url: "https://cursor.com",
  },
  {
    name: "Claude Code",
    logo: "/claude-icon.svg",
    url: "https://claude.ai",
  },
  {
    name: "VSCode",
    logo: "https://code.visualstudio.com/assets/apple-touch-icon.png",
    url: "https://code.visualstudio.com",
  },
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
            <a
              key={ed.name}
              href={ed.url}
              target="_blank"
              rel="noopener noreferrer"
              className="editor-logo flex items-center gap-2.5 text-gray-400 hover:text-gray-200 transition-colors"
              title={ed.name}
            >
              <img
                src={ed.logo}
                alt={ed.name}
                className="w-6 h-6 object-contain"
                style={{ filter: "grayscale(100%) brightness(1.8)" }}
              />
              <span className="text-sm hidden sm:inline">{ed.name}</span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
