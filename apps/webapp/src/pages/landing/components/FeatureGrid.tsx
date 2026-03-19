import {
  Monitor,
  RefreshCw,
  FolderTree,
  Plug,
  FileCode,
  Terminal,
} from "lucide-react";
import { features } from "../data/features";
import { useScrollReveal } from "../hooks/useScrollReveal";

const iconMap: Record<string, React.ReactNode> = {
  Monitor: <Monitor className="w-6 h-6" />,
  RefreshCw: <RefreshCw className="w-6 h-6" />,
  FolderTree: <FolderTree className="w-6 h-6" />,
  Plug: <Plug className="w-6 h-6" />,
  FileCode: <FileCode className="w-6 h-6" />,
  Terminal: <Terminal className="w-6 h-6" />,
};

export function FeatureGrid() {
  const ref = useScrollReveal<HTMLElement>();

  return (
    <section id="features" ref={ref} className="scroll-reveal py-20 px-6">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl sm:text-4xl font-bold text-center text-white mb-4">
          Built for developer teams
        </h2>
        <p className="text-gray-400 text-center mb-12 max-w-xl mx-auto">
          Everything you need to manage AI coding rules at scale.
        </p>

        <div className="stagger-children revealed grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f) => (
            <div
              key={f.title}
              className="feature-card group"
              style={
                {
                  "--glow-color": f.glowColor + "40",
                } as React.CSSProperties
              }
            >
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center mb-4"
                style={{
                  background: f.glowColor + "15",
                  color: f.glowColor,
                }}
              >
                {iconMap[f.icon]}
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">{f.title}</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                {f.description}
              </p>
              {/* Hover glow border-top */}
              <div
                className="absolute top-0 left-[10%] right-[10%] h-px opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ background: `linear-gradient(90deg, transparent, ${f.glowColor}, transparent)` }}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
