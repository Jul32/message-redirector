import type { Category, Rule } from "./types.ts";
/** Urgent matches take priority; otherwise the lowest rule ID wins. */
export function categorize(content: string, rules: Rule[]): Category {
  const matches = rules.filter(
    (rule) =>
      rule.keyword.trim() &&
      content.toLowerCase().includes(rule.keyword.toLowerCase()),
  );
  matches.sort(
    (a, b) =>
      Number(b.category === "Urgent") - Number(a.category === "Urgent") ||
      a.id.localeCompare(b.id),
  );
  return matches[0]?.category ?? "General";
}
