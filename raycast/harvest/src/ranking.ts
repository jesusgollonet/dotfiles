type Item = { project: { id: number }; task: { id: number } };
export type Usage = Record<string, { weight: number; lastUsed: number }>;
const HALF_LIFE = 7 * 24 * 60 * 60 * 1000;
export const itemKey = (item: Item) => `${item.project.id}:${item.task.id}`;

export function score(usage: Usage, item: Item, now: number): number {
  const entry = usage[itemKey(item)];
  return entry ? entry.weight * Math.pow(0.5, Math.max(0, now - entry.lastUsed) / HALF_LIFE) : 0;
}

export function recordUse(usage: Usage, item: Item, now = Date.now()): Usage {
  return { ...usage, [itemKey(item)]: { weight: score(usage, item, now) + 1, lastUsed: now } };
}

export function rankItems<T extends Item>(items: T[], usage: Usage, now = Date.now()): T[] {
  // Preserve Harvest's order for items that have never been used.
  return [...items].sort((a, b) => score(usage, b, now) - score(usage, a, now));
}
