export type Named = { id: number; name: string };
export type Option = { project: Named; task: Named; client: Named };
export type Entry = Option & { id: number; spent_date: string; is_running: boolean; is_locked: boolean; notes: string | null; updated_at: string; hours: number };
type Assignment = { is_active: boolean; project: Named; client: Named; task_assignments: { is_active: boolean; task: Named }[] };

// Harvest display names → IANA identifiers, from its supported-timezones table.
// https://help.getharvest.com/api-v2/introduction/overview/supported-timezones/
export const harvestTimeZones: Readonly<Record<string, string>> = {
  "American Samoa": "Pacific/Pago_Pago",
  "International Date Line West": "Pacific/Midway",
  "Midway Island": "Pacific/Midway",
  "Hawaii": "Pacific/Honolulu",
  "Alaska": "America/Juneau",
  "Pacific Time (US & Canada)": "America/Los_Angeles",
  "Tijuana": "America/Tijuana",
  "Arizona": "America/Phoenix",
  "Chihuahua": "America/Chihuahua",
  "Mazatlan": "America/Mazatlan",
  "Mountain Time (US & Canada)": "America/Denver",
  "Central America": "America/Guatemala",
  "Central Time (US & Canada)": "America/Chicago",
  "Guadalajara": "America/Mexico_City",
  "Mexico City": "America/Mexico_City",
  "Monterrey": "America/Monterrey",
  "Saskatchewan": "America/Regina",
  "Bogota": "America/Bogota",
  "Eastern Time (US & Canada)": "America/New_York",
  "Indiana (East)": "America/Indiana/Indianapolis",
  "Lima": "America/Lima",
  "Quito": "America/Lima",
  "Atlantic Time (Canada)": "America/Halifax",
  "Caracas": "America/Caracas",
  "Georgetown": "America/Guyana",
  "La Paz": "America/La_Paz",
  "Puerto Rico": "America/Puerto_Rico",
  "Santiago": "America/Santiago",
  "Newfoundland": "America/St_Johns",
  "Brasilia": "America/Sao_Paulo",
  "Buenos Aires": "America/Argentina/Buenos_Aires",
  "Greenland": "America/Godthab",
  "Montevideo": "America/Montevideo",
  "Mid-Atlantic": "Atlantic/South_Georgia",
  "Azores": "Atlantic/Azores",
  "Cape Verde Is.": "Atlantic/Cape_Verde",
  "Casablanca": "Africa/Casablanca",
  "Dublin": "Europe/Dublin",
  "Edinburgh": "Europe/London",
  "Lisbon": "Europe/Lisbon",
  "London": "Europe/London",
  "Monrovia": "Africa/Monrovia",
  "UTC": "Etc/UTC",
  "Amsterdam": "Europe/Amsterdam",
  "Belgrade": "Europe/Belgrade",
  "Berlin": "Europe/Berlin",
  "Bern": "Europe/Zurich",
  "Bratislava": "Europe/Bratislava",
  "Brussels": "Europe/Brussels",
  "Budapest": "Europe/Budapest",
  "Copenhagen": "Europe/Copenhagen",
  "Ljubljana": "Europe/Ljubljana",
  "Madrid": "Europe/Madrid",
  "Paris": "Europe/Paris",
  "Prague": "Europe/Prague",
  "Rome": "Europe/Rome",
  "Sarajevo": "Europe/Sarajevo",
  "Skopje": "Europe/Skopje",
  "Stockholm": "Europe/Stockholm",
  "Vienna": "Europe/Vienna",
  "Warsaw": "Europe/Warsaw",
  "West Central Africa": "Africa/Algiers",
  "Zagreb": "Europe/Zagreb",
  "Zurich": "Europe/Zurich",
  "Athens": "Europe/Athens",
  "Bucharest": "Europe/Bucharest",
  "Cairo": "Africa/Cairo",
  "Harare": "Africa/Harare",
  "Helsinki": "Europe/Helsinki",
  "Jerusalem": "Asia/Jerusalem",
  "Kaliningrad": "Europe/Kaliningrad",
  "Kyiv": "Europe/Kiev",
  "Pretoria": "Africa/Johannesburg",
  "Riga": "Europe/Riga",
  "Sofia": "Europe/Sofia",
  "Tallinn": "Europe/Tallinn",
  "Vilnius": "Europe/Vilnius",
  "Baghdad": "Asia/Baghdad",
  "Istanbul": "Europe/Istanbul",
  "Kuwait": "Asia/Kuwait",
  "Minsk": "Europe/Minsk",
  "Moscow": "Europe/Moscow",
  "Nairobi": "Africa/Nairobi",
  "Riyadh": "Asia/Riyadh",
  "St. Petersburg": "Europe/Moscow",
  "Volgograd": "Europe/Volgograd",
  "Tehran": "Asia/Tehran",
  "Abu Dhabi": "Asia/Muscat",
  "Baku": "Asia/Baku",
  "Muscat": "Asia/Muscat",
  "Samara": "Europe/Samara",
  "Tbilisi": "Asia/Tbilisi",
  "Yerevan": "Asia/Yerevan",
  "Kabul": "Asia/Kabul",
  "Ekaterinburg": "Asia/Yekaterinburg",
  "Islamabad": "Asia/Karachi",
  "Karachi": "Asia/Karachi",
  "Tashkent": "Asia/Tashkent",
  "Chennai": "Asia/Kolkata",
  "Kolkata": "Asia/Kolkata",
  "Mumbai": "Asia/Kolkata",
  "New Delhi": "Asia/Kolkata",
  "Sri Jayawardenepura": "Asia/Colombo",
  "Kathmandu": "Asia/Kathmandu",
  "Almaty": "Asia/Almaty",
  "Astana": "Asia/Dhaka",
  "Dhaka": "Asia/Dhaka",
  "Urumqi": "Asia/Urumqi",
  "Rangoon": "Asia/Rangoon",
  "Bangkok": "Asia/Bangkok",
  "Hanoi": "Asia/Bangkok",
  "Jakarta": "Asia/Jakarta",
  "Krasnoyarsk": "Asia/Krasnoyarsk",
  "Novosibirsk": "Asia/Novosibirsk",
  "Beijing": "Asia/Shanghai",
  "Chongqing": "Asia/Chongqing",
  "Hong Kong": "Asia/Hong_Kong",
  "Irkutsk": "Asia/Irkutsk",
  "Kuala Lumpur": "Asia/Kuala_Lumpur",
  "Perth": "Australia/Perth",
  "Singapore": "Asia/Singapore",
  "Taipei": "Asia/Taipei",
  "Ulaanbaatar": "Asia/Ulaanbaatar",
  "Osaka": "Asia/Tokyo",
  "Sapporo": "Asia/Tokyo",
  "Seoul": "Asia/Seoul",
  "Tokyo": "Asia/Tokyo",
  "Yakutsk": "Asia/Yakutsk",
  "Adelaide": "Australia/Adelaide",
  "Darwin": "Australia/Darwin",
  "Brisbane": "Australia/Brisbane",
  "Canberra": "Australia/Melbourne",
  "Guam": "Pacific/Guam",
  "Hobart": "Australia/Hobart",
  "Melbourne": "Australia/Melbourne",
  "Port Moresby": "Pacific/Port_Moresby",
  "Sydney": "Australia/Sydney",
  "Vladivostok": "Asia/Vladivostok",
  "Magadan": "Asia/Magadan",
  "New Caledonia": "Pacific/Noumea",
  "Solomon Is.": "Pacific/Guadalcanal",
  "Srednekolymsk": "Asia/Srednekolymsk",
  "Auckland": "Pacific/Auckland",
  "Fiji": "Pacific/Fiji",
  "Kamchatka": "Asia/Kamchatka",
  "Marshall Is.": "Pacific/Majuro",
  "Wellington": "Pacific/Auckland",
  "Chatham Is.": "Pacific/Chatham",
  "Nuku’alofa": "Pacific/Tongatapu",
  "Samoa": "Pacific/Apia",
  "Tokelau Is.": "Pacific/Fakaofo"
};

export function localDate(now = new Date(), timeZone?: string): string {
  // Accept Harvest's display names as well as standard IANA names. Resolve the
  // actual zone rather than applying a fixed offset, so DST remains correct.
  const zone = timeZone?.trim();
  const identifier = zone && Object.hasOwn(harvestTimeZones, zone) ? harvestTimeZones[zone] : zone;
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: identifier, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const part = (type: string) => parts.find((p) => p.type === type)!.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function sameOption(a: Option, b: Option): boolean {
  return a.project.id === b.project.id && a.task.id === b.task.id;
}

type User = { id: number; timezone: string };
type CacheEntry<T> = { data: T; expiresAt: number };

export class MetadataCache {
  private storage: { get(key: string): string | undefined; set(key: string, value: string): void };
  private now: () => number;
  private pending = new Map<string, Promise<unknown>>();
  constructor(storage: { get(key: string): string | undefined; set(key: string, value: string): void }, now = Date.now) {
    this.storage = storage;
    this.now = now;
  }
  private read<T>(key: string): CacheEntry<T> | undefined {
    try {
      const value = JSON.parse(this.storage.get(key) || "null");
      return value && typeof value.expiresAt === "number" && "data" in value ? value : undefined;
    } catch { return undefined; }
  }
  // Even expired data can populate the picker immediately while it refreshes.
  peek<T>(key: string): T | undefined { return this.read<T>(key)?.data; }
  set<T>(key: string, data: T, ttl = 0) { this.storage.set(key, JSON.stringify({ data, expiresAt: this.now() + ttl })); }
  async get<T>(key: string, ttl: number, fetchData: () => Promise<T>, force = false): Promise<T> {
    const entry = this.read<T>(key);
    if (!force && entry && entry.expiresAt > this.now()) return entry.data;
    const pending = this.pending.get(key);
    if (pending) return pending as Promise<T>;
    const request = Promise.resolve().then(fetchData).then((data) => {
      this.storage.set(key, JSON.stringify({ data, expiresAt: this.now() + ttl }));
      return data;
    }).finally(() => this.pending.delete(key));
    this.pending.set(key, request);
    return request;
  }
}

export class Harvest {
  private token: string;
  private accountId: string;
  private request: typeof fetch;
  private cache?: MetadataCache;
  constructor(token: string, accountId: string, request = fetch, cache?: MetadataCache) {
    this.token = token;
    this.accountId = accountId;
    this.request = request;
    this.cache = cache;
  }

  async api<T>(path: string, method = "GET", body?: object): Promise<T> {
    const url = new URL(path, "https://api.harvestapp.com/v2/");
    if (url.origin !== "https://api.harvestapp.com" || !url.pathname.startsWith("/v2/")) throw new Error("Unexpected Harvest URL");
    const response = await this.request(url, {
      method,
      headers: { Authorization: `Bearer ${this.token.trim()}`, "Harvest-Account-Id": this.accountId.trim(), "User-Agent": "Raycast Harvest Track", "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(15000),
      redirect: "error",
    });
    if (!response.ok) {
      // Do not include response bodies or request headers in errors: they may contain private data.
      const hint = response.status === 401 ? "Check your Harvest token." : response.status === 403 ? "Check your account ID and permissions." : response.status === 429 ? "Wait a moment, then try again." : "Refresh and try again; check Harvest if the request may have completed.";
      throw new Error(`Harvest ${response.status}. ${hint}`);
    }
    return response.json() as Promise<T>;
  }

  async list<T>(path: string, key: string): Promise<T[]> {
    const result: T[] = [];
    let next: string | null = path;
    while (next) {
      const page: { [key: string]: unknown; links: { next: string | null } } = await this.api(next);
      result.push(...page[key] as T[]);
      next = page.links.next;
    }
    return result;
  }

  cachedOptions(): Option[] | undefined { return this.cache?.peek<Option[]>("options"); }

  async options(force = false): Promise<Option[]> {
    const fetchOptions = async () => {
      const assignments = await this.list<Assignment>("users/me/project_assignments", "project_assignments");
      return assignments.filter((a) => a.is_active).flatMap((a) => a.task_assignments.filter((t) => t.is_active).map((t) => ({ project: a.project, client: a.client, task: t.task })));
    };
    return this.cache ? this.cache.get("options", 12 * 60 * 60 * 1000, fetchOptions, force) : fetchOptions();
  }

  async user(force = false): Promise<User> {
    const fetchUser = async () => {
      const user = await this.api<User>("users/me");
      // Persist only the two fields we need, not the full profile response.
      return { id: user.id, timezone: user.timezone };
    };
    return this.cache ? this.cache.get("user", 24 * 60 * 60 * 1000, fetchUser, force) : fetchUser();
  }

  async running(userId: number): Promise<Entry[]> {
    return this.list(`time_entries?user_id=${userId}&is_running=true`, "time_entries");
  }

  // Last known day view, so the list opens at its final layout instead of
  // jumping when the request finishes. Ignored once the date has changed.
  cachedDay(now = new Date()): Entry[] | undefined {
    const user = this.cache?.peek<User>("user");
    const cached = this.cache?.peek<{ date: string; entries: Entry[] }>("day");
    return user && cached?.date === localDate(now, user.timezone) ? cached.entries : undefined;
  }

  // Today's entries in the order they were tracked, plus any timer left running
  // since an earlier day.
  async day(user: User): Promise<Entry[]> {
    const date = localDate(new Date(), user.timezone);
    const [today, running] = await Promise.all([
      this.list<Entry>(`time_entries?user_id=${user.id}&from=${date}&to=${date}`, "time_entries"),
      this.running(user.id),
    ]);
    const entries = [...today.reverse(), ...running.filter((r) => !today.some((e) => e.id === r.id))];
    // Notes aren't displayed, so keep them out of the on-disk cache.
    this.cache?.set("day", { date, entries: entries.map((e) => ({ ...e, notes: null })) });
    return entries;
  }

  // Apply a timer change made here to the cached day, so the next open
  // doesn't show the previous timer as running before the live data arrives.
  private updateCachedDay(started?: Entry) {
    const cached = this.cache?.peek<{ date: string; entries: Entry[] }>("day");
    if (!cached) return;
    const entries = cached.entries.map((e) => ({ ...e, is_running: false }));
    if (started) {
      const index = entries.findIndex((e) => e.id === started.id);
      const entry = { ...started, notes: null, is_running: true };
      if (index >= 0) entries[index] = entry;
      else if (started.spent_date === cached.date) entries.push(entry);
    }
    this.cache!.set("day", { date: cached.date, entries });
  }

  async stop(userId: number): Promise<number> {
    const entries = await this.running(userId);
    for (const entry of entries) await this.api(`time_entries/${entry.id}/stop`, "PATCH");
    this.updateCachedDay();
    return entries.length;
  }

  async start(option: Option): Promise<string> {
    const user = await this.user();
    const today = localDate(new Date(), user.timezone);
    // Resolve the target before touching any running timers.
    const options = await this.options(true);
    if (!options.some((o) => sameOption(o, option))) throw new Error("This project/task is no longer assigned. Refresh and choose another.");
    const entries = await this.list<Entry>(`time_entries?user_id=${user.id}&from=${today}&to=${today}&project_id=${option.project.id}&task_id=${option.task.id}`, "time_entries");
    const running = await this.running(user.id);
    const current = running.find((e) => e.spent_date === today && sameOption(e, option));
    if (current && running.length === 1) return "Already tracking";
    // Only reuse a note-free entry; preserve entries that describe particular work.
    const target = entries.filter((e) => !e.is_locked && !e.notes && !e.is_running).sort((a, b) => b.updated_at.localeCompare(a.updated_at))[0];
    for (const entry of running) {
      if (entry.id !== current?.id) await this.api(`time_entries/${entry.id}/stop`, "PATCH");
    }
    if (current) return "Tracking";
    try {
      const started = target
        ? await this.api<Entry>(`time_entries/${target.id}/restart`, "PATCH")
        // Omitting hours/ended_time starts a running entry in either Harvest timer mode.
        : await this.api<Entry>("time_entries", "POST", { project_id: option.project.id, task_id: option.task.id, spent_date: today });
      this.updateCachedDay(started);
    } catch (error) {
      throw new Error(`Previous timer stopped; couldn't start the selected timer. Check Harvest before retrying. ${error instanceof Error ? error.message : ""}`);
    }
    return "Tracking";
  }
}
