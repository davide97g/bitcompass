import { useEffect, useRef, useState, useId } from 'react';
import mermaid from 'mermaid';

let mermaidInitialized = false;

function initMermaid(isDark: boolean) {
  mermaid.initialize({
    startOnLoad: false,
    theme: isDark ? 'dark' : 'default',
    fontFamily: 'Inter, system-ui, sans-serif',
    securityLevel: 'loose',
    flowchart: { useMaxWidth: true, htmlLabels: true, curve: 'basis' },
    themeVariables: isDark
      ? {
          primaryColor: '#7c3aed',
          primaryTextColor: '#e5e7eb',
          primaryBorderColor: '#6d28d9',
          lineColor: '#6b7280',
          secondaryColor: '#1e1b4b',
          tertiaryColor: '#1a1f2e',
          mainBkg: '#1a1f2e',
          nodeBorder: '#4c1d95',
          clusterBkg: '#111827',
          clusterBorder: '#374151',
          titleColor: '#f3f4f6',
          edgeLabelBackground: '#1f2937',
        }
      : {},
  });
  mermaidInitialized = true;
}

interface MermaidDiagramProps {
  chart: string;
}

export const MermaidDiagram = ({ chart }: MermaidDiagramProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const uniqueId = useId().replace(/:/g, '_');

  useEffect(() => {
    const isDark = document.documentElement.classList.contains('dark');

    // Re-initialize if theme changed or first time
    initMermaid(isDark);
    mermaidInitialized = false; // Force re-init on each render to pick up theme changes

    const renderChart = async () => {
      try {
        const { svg: renderedSvg } = await mermaid.render(
          `mermaid-${uniqueId}`,
          chart.trim()
        );
        setSvg(renderedSvg);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to render diagram');
        setSvg(null);
      }
    };

    renderChart();
  }, [chart, uniqueId]);

  if (error) {
    return (
      <div className="my-4 rounded-lg border border-destructive/50 bg-destructive/5 p-4">
        <p className="text-sm font-medium text-destructive mb-2">
          Failed to render Mermaid diagram
        </p>
        <pre className="text-xs text-muted-foreground overflow-auto whitespace-pre-wrap">
          {chart}
        </pre>
      </div>
    );
  }

  if (!svg) {
    return (
      <div className="my-4 flex items-center justify-center rounded-lg border border-border bg-muted/30 p-8">
        <div className="animate-pulse-soft text-sm text-muted-foreground">
          Rendering diagram...
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="my-4 overflow-x-auto rounded-lg border border-border bg-card p-4 [&_svg]:mx-auto [&_svg]:max-w-full"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
};
