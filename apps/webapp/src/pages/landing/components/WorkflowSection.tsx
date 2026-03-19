import { useScrollReveal } from "../hooks/useScrollReveal";
import { workflowSteps } from "../data/terminal-content";

export function WorkflowSection() {
  const ref = useScrollReveal<HTMLElement>();

  return (
    <section id="workflow" ref={ref} className="scroll-reveal py-20 px-6">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl sm:text-4xl font-bold text-center text-white mb-4">
          From zero to shared rules in 5 steps
        </h2>
        <p className="text-gray-400 text-center mb-16 max-w-xl mx-auto">
          Get your entire team synced in minutes, not hours.
        </p>

        {/* Desktop: horizontal timeline */}
        <div className="hidden md:block">
          <div className="stagger-children revealed flex items-start justify-between relative">
            {/* Connector line */}
            <div className="absolute top-6 left-[10%] right-[10%] workflow-connector" />

            {workflowSteps.map((step, i) => (
              <div key={step.label} className="flex flex-col items-center relative z-10 flex-1">
                {/* Step circle */}
                <div className="w-12 h-12 rounded-full border-2 border-[#7fdbca]/40 bg-[#0d1117] flex items-center justify-center text-[#7fdbca] font-bold text-sm mb-4">
                  {i + 1}
                </div>

                {/* Label */}
                <h3 className="text-white font-semibold mb-1">{step.label}</h3>
                <p className="text-gray-500 text-xs text-center mb-3 max-w-[140px]">
                  {step.description}
                </p>

                {/* Mini terminal */}
                <div className="bg-[#0d1117] border border-white/5 rounded-lg px-3 py-2 font-mono text-xs text-[#7fdbca] whitespace-nowrap">
                  ❯ {step.command}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Mobile: vertical timeline */}
        <div className="md:hidden space-y-8">
          {workflowSteps.map((step, i) => (
            <div key={step.label} className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full border-2 border-[#7fdbca]/40 bg-[#0d1117] flex items-center justify-center text-[#7fdbca] font-bold text-sm shrink-0">
                {i + 1}
              </div>
              <div className="flex-1">
                <h3 className="text-white font-semibold">{step.label}</h3>
                <p className="text-gray-500 text-sm mb-2">{step.description}</p>
                <div className="bg-[#0d1117] border border-white/5 rounded-lg px-3 py-2 font-mono text-xs text-[#7fdbca] inline-block">
                  ❯ {step.command}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
