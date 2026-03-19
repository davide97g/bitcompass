import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import logoSvg from "@/logo.svg";

export function LandingNav() {
  const [opaque, setOpaque] = useState(false);

  useEffect(() => {
    const handler = () => setOpaque(window.scrollY > 50);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <nav className={`glass-nav fixed top-0 left-0 right-0 z-50 ${opaque ? "opaque" : ""}`}>
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to="/landing" className="flex items-center gap-2.5 text-white font-semibold text-lg">
          <img src={logoSvg} alt="BitCompass" className="w-7 h-7 rounded-md" />
          BitCompass
        </Link>

        {/* Center links - hidden on mobile */}
        <div className="hidden md:flex items-center gap-8">
          <button onClick={() => scrollTo("features")} className="text-sm text-gray-400 hover:text-white transition-colors">
            Features
          </button>
          <button onClick={() => scrollTo("commands")} className="text-sm text-gray-400 hover:text-white transition-colors">
            Commands
          </button>
          <button onClick={() => scrollTo("workflow")} className="text-sm text-gray-400 hover:text-white transition-colors">
            Workflow
          </button>
        </div>

        {/* Right CTA */}
        <Link
          to="/login"
          className="text-sm font-medium text-white px-4 py-1.5 rounded-lg bg-gradient-to-r from-[#7fdbca] to-[#c792ea] hover:opacity-90 transition-opacity"
        >
          Get Started
        </Link>
      </div>
    </nav>
  );
}
