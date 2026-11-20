import assert from "node:assert/strict";
import { test } from "node:test";
import { itemKey, rankItems, recordUse } from "../src/ranking.ts";

const a = { project: { id: 1 }, task: { id: 10 } };
const b = { project: { id: 1 }, task: { id: 20 } };
const c = { project: { id: 2 }, task: { id: 10 } };
const week = 7 * 24 * 60 * 60 * 1000;

test("frequency raises repeated tasks, while old habits decay", () => {
  let usage = recordUse({}, a, 0);
  usage = recordUse(usage, a, 0);
  usage = recordUse(usage, b, 0);
  assert.deepEqual(rankItems([b, c, a], usage, 0), [a, b, c]);
  usage = recordUse(usage, b, 4 * week);
  assert.deepEqual(rankItems([a, b, c], usage, 4 * week), [b, a, c]);
});

test("different tasks and projects have independent history; sorting preserves inputs", () => {
  assert.notEqual(itemKey(a), itemKey(b));
  assert.notEqual(itemKey(a), itemKey(c));
  const usage = {};
  const next = recordUse(usage, c, 100);
  assert.deepEqual(usage, {});
  const items = [a, b, c];
  assert.deepEqual(rankItems(items, next, 100), [c, a, b]);
  assert.deepEqual(items, [a, b, c]);
});
