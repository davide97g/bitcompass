import { Link } from "react-router-dom";
import { TerminalWindow } from "./TerminalWindow";
import { heroTerminalLines } from "../data/terminal-content";
import { useParallax } from "../hooks/useParallax";

export function HeroSection() {
  const offset = useParallax(0.12);

  return (
    <section className="hero-bg dot-grid relative min-h-screen flex flex-col items-center justify-center px-6 pt-20 pb-16 overflow-hidden">
      {/* Content */}
      <div className="max-w-4xl mx-auto text-center mb-12">
        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold font-display leading-tight mb-6">
          <span className="gradient-text">AI coding rules,</span>
          <br />
          <span className="text-white">shared across your team</span>
        </h1>
        <p className="text-lg sm:text-xl text-gray-400 max-w-2xl mx-auto mb-8 leading-relaxed">
          CLI + MCP server to manage rules, skills, and solutions across Cursor,
          Claude Code, VSCode, and more.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link
            to="/login"
            className="px-6 py-3 rounded-lg font-medium text-white bg-gradient-to-r from-[#7fdbca] to-[#c792ea] hover:opacity-90 transition-opacity text-sm sm:text-base"
          >
            Get Started
          </Link>
          <a
            href="https://github.com/davide97g/bitcompass"
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-3 rounded-lg font-medium text-gray-300 border border-gray-700 hover:border-gray-500 transition-colors text-sm sm:text-base"
          >
            View Docs
          </a>
        </div>
      </div>

      {/* Terminal preview with parallax */}
      <div
        className="w-full max-w-2xl mx-auto"
        style={{ transform: `translateY(${offset}px)` }}
      >
        <TerminalWindow
          title="bitcompass"
          lines={heroTerminalLines}
          glowColor="cyan"
          animate={true}
        />
      </div>
    </section>
  );
}
