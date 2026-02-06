import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Converts a title to a filename slug (e.g. "Strava API Flow" -> "strava-api-flow"). */
export const titleToSlug = (title: string): string => {
  const trimmed = (title ?? "").trim().replace(/^#\s*/, "");
  if (!trimmed) return "";
  return trimmed
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
};

/** Rule download base name (without extension). Falls back to id if slug is empty. */
export const ruleDownloadBasename = (title: string, id: string): string => {
  const slug = titleToSlug(title);
  return slug ? `rule-${slug}` : `rule-${id}`;
};
