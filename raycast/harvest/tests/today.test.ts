import assert from "node:assert/strict";
import { test } from "node:test";
import { formatHours, summarizeDay } from "../src/today.ts";

const p = (id: number) => ({ id, name: `P${id}` });
const entry = (project: number, task: number, hours: number, is_running = false) => ({ project: p(project), task: p(task), client: p(99), hours, is_running });

test("groups entries per project/task in first-seen order and totals the day", () => {
  const { rows, total } = summarizeDay([entry(1, 10, 0.5), entry(2, 10, 1.7, true), entry(1, 10, 0.25), entry(1, 20, 0.43)]);
  assert.deepEqual(rows.map((r) => [r.project.id, r.task.id, r.hours, r.running]), [[1, 10, 0.75, false], [2, 10, 1.7, true], [1, 20, 0.43, false]]);
  assert.equal(formatHours(total), "2.88");
});

test("empty day", () => {
  assert.deepEqual(summarizeDay([]), { rows: [], total: 0 });
});
