import assert from "node:assert/strict";
import { test } from "node:test";
import { Harvest, MetadataCache, harvestTimeZones, localDate } from "../src/harvest.ts";

const option = { project: { id: 10, name: "Atlas" }, task: { id: 20, name: "Development" }, client: { id: 30, name: "Client" } };
const today = localDate(new Date(), "Europe/Madrid");
const entry = (overrides = {}) => ({ ...option, id: 100, spent_date: today, is_running: false, is_locked: false, notes: null, updated_at: "2026-01-01", ...overrides });

function mock({ running = [], entries = [], assigned = true, failStart = false, timezone = "Europe/Madrid" }: { running?: ReturnType<typeof entry>[]; entries?: ReturnType<typeof entry>[]; assigned?: boolean; failStart?: boolean; timezone?: string } = {}) {
  const calls: { path: string; method: string; body: unknown }[] = [];
  const request: typeof fetch = async (input, init) => {
    const url = new URL(String(input));
    const path = url.pathname.replace("/v2/", "");
    const method = init?.method || "GET";
    calls.push({ path: path + url.search, method, body: init?.body ? JSON.parse(String(init.body)) : undefined });
    let data: unknown = {};
    if (path === "users/me") data = { id: 99, timezone };
    else if (path === "users/me/project_assignments") data = { project_assignments: assigned ? [{ ...option, is_active: true, task_assignments: [{ is_active: true, task: option.task }] }] : [], links: { next: null } };
    else if (path === "time_entries" && method === "GET") {
      assert.equal(url.searchParams.get("user_id"), "99", "Admin queries must only return the authenticated user's entries");
      data = { time_entries: url.searchParams.has("is_running") ? running : entries, links: { next: null } };
    } else if (failStart && (path.endsWith("/restart") || method === "POST")) return new Response("{}", { status: 422 });
    return new Response(JSON.stringify(data), { status: 200 });
  };
  return { api: new Harvest("token", "account", request), request, calls, mutations: () => calls.filter((c) => c.method !== "GET") };
}

test("date follows Harvest timezone across midnight", () => {
  assert.equal(localDate(new Date("2026-11-16T23:30:00Z"), "Europe/Madrid"), "2026-11-17");
  assert.equal(localDate(new Date("2026-11-16T00:30:00Z"), "America/Los_Angeles"), "2026-11-15");
});

test("Harvest Pacific display name respects both winter and summer offsets", () => {
  assert.equal(localDate(new Date("2026-11-16T07:30:00Z"), "Pacific Time (US & Canada)"), "2026-11-15");
  assert.equal(localDate(new Date("2026-07-16T07:30:00Z"), "Pacific Time (US & Canada)"), "2026-07-16");
  assert.equal(localDate(new Date("2026-11-16T23:30:00Z"), "Madrid"), "2026-11-17");
});

test("all documented Harvest timezone names are supported", () => {
  for (const zone of Object.keys(harvestTimeZones)) assert.match(localDate(new Date("2026-11-16T00:00:00Z"), zone), /^2026-11-\d{2}$/);
});

test("starting with the real Harvest timezone format creates a timer", async () => {
  const { api, mutations } = mock({ timezone: "Pacific Time (US & Canada)" });
  await api.start(option);
  assert.equal(mutations()[0].method, "POST");
  assert.deepEqual(mutations()[0].body, { project_id: 10, task_id: 20, spent_date: localDate(new Date(), "America/Los_Angeles") });
});

test("switch stops the previous timer before resuming today's target", async () => {
  const { api, mutations } = mock({ running: [entry({ id: 50, project: { id: 11, name: "Acme" }, is_running: true })], entries: [entry()] });
  await api.start(option);
  assert.deepEqual(mutations().map((c) => c.path), ["time_entries/50/stop", "time_entries/100/restart"]);
});

test("repeating the current shortcut makes no mutations", async () => {
  const current = entry({ is_running: true });
  const { api, mutations } = mock({ running: [current], entries: [current] });
  assert.equal(await api.start(option), "Already tracking");
  assert.deepEqual(mutations(), []);
});

test("creates a running entry without changing entries with notes or locks", async () => {
  const { api, mutations } = mock({ entries: [entry({ notes: "Specific work" }), entry({ id: 101, is_locked: true })] });
  await api.start(option);
  assert.deepEqual(mutations(), [{ path: "time_entries", method: "POST", body: { project_id: 10, task_id: 20, spent_date: today } }]);
});

test("a stale shortcut never stops the previous timer", async () => {
  const { api, mutations } = mock({ assigned: false, running: [entry({ is_running: true })] });
  await assert.rejects(api.start(option), /no longer assigned/);
  assert.deepEqual(mutations(), []);
});

test("start failure reports the stopped timer and does not retry", async () => {
  const { api, mutations } = mock({ running: [entry({ id: 50, project: { id: 11, name: "Acme" } })], failStart: true });
  await assert.rejects(api.start(option), /Previous timer stopped/);
  assert.equal(mutations().length, 2);
});

test("stop touches only running entries returned for the current user", async () => {
  const { api, mutations } = mock({ running: [entry()] });
  assert.equal(await api.stop(99), 1);
  assert.equal(mutations()[0].path, "time_entries/100/stop");
});

test("pagination follows Harvest next links and rejects other origins", async () => {
  let pages = 0;
  const api = new Harvest("token", "account", async () => new Response(JSON.stringify({ values: [++pages], links: { next: pages === 1 ? "https://api.harvestapp.com/v2/example?page=2" : null } })));
  assert.deepEqual(await api.list("example", "values"), [1, 2]);
  await assert.rejects(api.api("https://example.com/v2/example"), /Unexpected Harvest URL/);
});

function cacheStorage() {
  const values = new Map<string, string>();
  return { get: (key: string) => values.get(key), set: (key: string, value: string) => { values.set(key, value); } };
}

test("metadata survives reopening but timer reads always hit Harvest", async () => {
  const storage = cacheStorage();
  const { request, calls } = mock();
  const open = () => new Harvest("token", "account", request, new MetadataCache(storage));
  const first = open();
  await first.options();
  await first.user();
  await first.running(99);
  const reopened = open();
  assert.equal(reopened.cachedOptions()?.[0].project.id, 10, "Options available synchronously before any network request");
  await reopened.options();
  await reopened.user();
  await reopened.running(99);
  assert.equal(calls.filter((c) => c.path === "users/me/project_assignments").length, 1);
  assert.equal(calls.filter((c) => c.path === "users/me").length, 1);
  assert.equal(calls.filter((c) => c.path.includes("is_running=true")).length, 2);
  await reopened.options(true);
  await reopened.user(true);
  assert.equal(calls.filter((c) => c.path === "users/me/project_assignments").length, 2);
  assert.equal(calls.filter((c) => c.path === "users/me").length, 2);
});

test("expired metadata remains visible while refreshing; failed fetches do not poison it", async () => {
  let now = 0;
  const cache = new MetadataCache(cacheStorage(), () => now);
  await cache.get("options", 100, async () => ["old"]);
  now = 101;
  assert.deepEqual(cache.peek("options"), ["old"]);
  await assert.rejects(cache.get("options", 100, async () => { throw new Error("offline"); }), /offline/);
  assert.deepEqual(cache.peek("options"), ["old"]);
  assert.deepEqual(await cache.get("options", 100, async () => ["new"]), ["new"]);
});

test("concurrent metadata requests share one fetch and corrupt storage is treated as empty", async () => {
  const storage = cacheStorage();
  storage.set("options", "invalid json");
  const cache = new MetadataCache(storage);
  let calls = 0;
  const load = async () => { calls++; return ["value"]; };
  assert.equal(cache.peek("options"), undefined);
  assert.deepEqual(await Promise.all([cache.get("options", 1000, load), cache.get("options", 1000, load)]), [["value"], ["value"]]);
  assert.equal(calls, 1);
});
