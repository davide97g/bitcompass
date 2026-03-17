/** Neon-style tech badge colors (aligned with Rules list cards and Compass project cards) */
export const TECH_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  react: { bg: 'bg-sky-500/10', text: 'text-sky-400', border: 'border-sky-500/20' },
  typescript: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20' },
  javascript: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' },
  node: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
  tailwind: { bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/20' },
  tailwindcss: { bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/20' },
  vue: { bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/20' },
  html: { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/20' },
  css: { bg: 'bg-pink-500/10', text: 'text-pink-400', border: 'border-pink-500/20' },
  python: { bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/20' },
  default: { bg: 'bg-violet-500/10', text: 'text-violet-400', border: 'border-violet-500/20' },
};

export function getTechStyle(tech: string): { bg: string; text: string; border: string } {
  const key = tech.toLowerCase().replace(/\s+/g, '');
  return TECH_COLORS[key] ?? TECH_COLORS.default;
}
