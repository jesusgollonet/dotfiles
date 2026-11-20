// Same key format as ranking.ts, inlined so this file runs under node --test.
const itemKey = (e: { project: { id: number }; task: { id: number } }) => `${e.project.id}:${e.task.id}`;

type Named = { id: number; name: string };
type DayEntry = { project: Named; task: Named; client: Named; hours: number; is_running: boolean };
export type DayRow = { project: Named; task: Named; client: Named; hours: number; running: boolean };

// One row per project/task, like Harvest's day view; several entries for the
// same task (e.g. restarted with notes) add up into a single row.
export function summarizeDay(entries: DayEntry[]): { rows: DayRow[]; total: number } {
  const rows = new Map<string, DayRow>();
  for (const e of entries) {
    const key = itemKey(e);
    const row = rows.get(key) ?? { project: e.project, task: e.task, client: e.client, hours: 0, running: false };
    row.hours += e.hours || 0;
    row.running ||= e.is_running;
    rows.set(key, row);
  }
  const list = [...rows.values()];
  return { rows: list, total: list.reduce((sum, r) => sum + r.hours, 0) };
}

export const formatHours = (hours: number) => hours.toFixed(2);
