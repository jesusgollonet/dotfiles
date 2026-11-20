import { Action, ActionPanel, Cache, Color, Form, Icon, LaunchProps, List, LocalStorage, Toast, closeMainWindow, getPreferenceValues, showHUD, showToast, useNavigation } from "@raycast/api";
import { createHash } from "node:crypto";
import { useEffect, useRef, useState } from "react";
import { Entry, Harvest, MetadataCache, Option, sameOption } from "./harvest";
import { DayRow, formatHours, summarizeDay } from "./today";
import { matchesSearch } from "./search";
import { itemKey, rankItems, recordUse, Usage } from "./ranking";

type Favorite = Option & { alias: string };
const preferences = () => getPreferenceValues<{ token: string; accountId: string }>();
let apiClient: { key: string; api: Harvest } | undefined;
const client = () => {
  const p = preferences();
  // Isolate metadata when either the account or token changes, without saving credentials.
  const key = createHash("sha256").update(JSON.stringify([p.accountId.trim(), p.token.trim()])).digest("hex");
  if (apiClient?.key !== key) apiClient = { key, api: new Harvest(p.token, p.accountId, fetch, new MetadataCache(new Cache({ namespace: `metadata-v1-${key}` }))) };
  return apiClient.api;
};
const storageKey = () => `favorites:${preferences().accountId.trim()}`;
const usageKey = () => `usage:${preferences().accountId.trim()}`;
const pinsKey = () => `pins:${preferences().accountId.trim()}`;
const normalize = (s: string) => s.trim().toLowerCase();
async function favorites(): Promise<Favorite[]> {
  return JSON.parse(await LocalStorage.getItem<string>(storageKey()) || "[]");
}

function SaveShortcut({ option, initialAlias, onSaved }: { option: Option; initialAlias: string; onSaved: () => void }) {
  const { pop } = useNavigation();
  const [error, setError] = useState<string>();
  async function save(values: { alias: string }) {
    const alias = normalize(values.alias);
    const saved = await favorites();
    if (!alias || ["stop", "status"].includes(alias)) { setError("Choose a name other than stop or status."); return; }
    if (saved.some((f) => f.alias === alias && !sameOption(f, option))) { setError("That shortcut already belongs to another project/task."); return; }
    await LocalStorage.setItem(storageKey(), JSON.stringify([...saved.filter((f) => f.alias !== alias), { ...option, alias }]));
    onSaved();
    await showToast({ style: Toast.Style.Success, title: `Saved: track ${alias}` });
    pop();
  }
  return <Form actions={<ActionPanel><Action.SubmitForm title="Save Shortcut" onSubmit={save} /></ActionPanel>}>
    <Form.Description text={`${option.client.name} → ${option.project.name} → ${option.task.name}`} />
    <Form.TextField id="alias" title="Shortcut" defaultValue={initialAlias} placeholder="acme" error={error} onChange={() => setError(undefined)} />
  </Form>;
}

export default function Command({ arguments: args }: LaunchProps<{ arguments: { project?: string } }>) {
  const query = normalize(args.project || "");
  const [search, setSearch] = useState(["stop", "status"].includes(query) ? "" : query);
  const [options, setOptions] = useState<Option[]>(() => client().cachedOptions() || []);
  const [saved, setSaved] = useState<Favorite[]>([]);
  const [usage, setUsage] = useState<Usage>({});
  const [pins, setPins] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [failure, setFailure] = useState<string>();
  const [day, setDay] = useState<Entry[] | undefined>(() => client().cachedDay());
  // Cached hours are fine to show while loading, but a timer may have been
  // started or stopped elsewhere (Harvest app, web), so only mark a row as
  // running once Harvest has confirmed it.
  const [dayIsLive, setDayIsLive] = useState(false);
  const started = useRef(false);
  const busy = useRef(false);

  async function report(error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    setFailure(message);
    await showToast({ style: Toast.Style.Failure, title: "Harvest request failed", message });
  }

  async function start(option: Option) {
    if (busy.current) return;
    busy.current = true;
    setLoading(true);
    try {
      const message = await client().start(option);
      try {
        const previous = JSON.parse(await LocalStorage.getItem<string>(usageKey()) || "{}") as Usage;
        const next = recordUse(previous, option);
        await LocalStorage.setItem(usageKey(), JSON.stringify(next));
        setUsage(next);
      } catch {
        await showToast({ style: Toast.Style.Failure, title: "Timer is running; couldn't save item history" });
      }
      await closeMainWindow();
      await showHUD(`${message}: ${option.project.name} · ${option.task.name}`);
    } catch (error) { await report(error); }
    finally { busy.current = false; setLoading(false); }
  }

  async function stop() {
    if (busy.current) return;
    busy.current = true;
    setLoading(true);
    try {
      const api = client();
      const user = await api.user();
      const count = await api.stop(user.id);
      setDay((entries) => entries?.map((e) => ({ ...e, is_running: false })));
      await showHUD(count ? "Harvest timer stopped" : "No timer running");
    } catch (error) { await report(error); }
    finally { busy.current = false; setLoading(false); }
  }

  async function load(allowDirect = false, force = false) {
    setLoading(true);
    setFailure(undefined);
    try {
      const [shortcuts, storedUsage, storedPins] = await Promise.all([
        favorites(), LocalStorage.getItem<string>(usageKey()), LocalStorage.getItem<string>(pinsKey()),
      ]);
      setSaved(shortcuts);
      setUsage(JSON.parse(storedUsage || "{}"));
      setPins(JSON.parse(storedPins || "[]"));
      if (allowDirect && query === "stop") { await stop(); return; }
      // A saved command should skip loading the picker entirely.
      const favorite = shortcuts.find((f) => f.alias === query);
      if (allowDirect && favorite) { await start(favorite); return; }
      const api = client();
      // Projects render independently of the live timer request. A slow timer
      // endpoint must not delay browsing/searching the cached project list.
      const results = await Promise.allSettled([
        api.options(force).then(setOptions),
        (async () => {
          const user = await api.user(force);
          const entries = await api.day(user);
          setDay(entries);
          setDayIsLive(true);
          const running = entries.filter((e) => e.is_running);
          const label = running.length ? running.map((e) => `${e.project.name} · ${e.task.name}`).join(", ") : "No timer running";
          if (allowDirect && query === "status") await showHUD(running.length ? `Tracking: ${label}` : label);
        })(),
      ]);
      for (const result of results) if (result.status === "rejected") await report(result.reason);
    } catch (error) { await report(error); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    // Guard against effect re-runs: an argument must trigger at most one timer mutation.
    if (started.current) return;
    started.current = true;
    void load(true);
  }, []);

  const refresh = () => load(false, true);

  const ranked = rankItems(options, usage);
  const isFavorite = (o: Option) => pins.includes(itemKey(o)) || saved.some((f) => sameOption(f, o));
  const favoriteItems = ranked.filter(isFavorite);
  const remaining = ranked.filter((o) => !isFavorite(o));
  // With an empty search the list stays short: today's rows already cover what
  // you've tracked, so show four other frequent tasks and leave the full
  // project list for searches.
  const searching = search.trim() !== "";
  const trackedToday = new Set((day || []).map(itemKey));
  const frequentItems = remaining.filter((o) => usage[itemKey(o)] && !trackedToday.has(itemKey(o))).slice(0, searching ? 8 : 4);
  const frequentKeys = new Set(frequentItems.map(itemKey));
  const otherItems = searching ? remaining.filter((o) => !frequentKeys.has(itemKey(o))) : [];
  const matchesOption = (option: Option, alias = "") => matchesSearch(search, [option.client.name, option.project.name, option.task.name, alias]);
  const actions = (option: Option, favorite?: Favorite) => <ActionPanel>
    <Action title="Start Tracking" icon={Icon.Play} onAction={() => start(option)} />
    {!favorite && <Action title={pins.includes(itemKey(option)) ? "Remove from Favorites" : "Add to Favorites"} icon={Icon.Star} shortcut={{ modifiers: ["cmd"], key: "d" }} onAction={async () => {
      const key = itemKey(option);
      const current = JSON.parse(await LocalStorage.getItem<string>(pinsKey()) || "[]") as string[];
      const next = current.includes(key) ? current.filter((id) => id !== key) : [...current, key];
      await LocalStorage.setItem(pinsKey(), JSON.stringify(next));
      setPins(next);
    }} />}
    <Action.Push title="Save Shortcut" icon={Icon.Star} shortcut={{ modifiers: ["cmd"], key: "s" }} target={<SaveShortcut option={option} initialAlias={query || option.project.name.toLowerCase()} onSaved={() => { void favorites().then(setSaved); }} />} />
    {favorite && <Action title="Remove Shortcut" icon={Icon.StarDisabled} onAction={async () => {
      const next = (await favorites()).filter((f) => f.alias !== favorite.alias);
      await LocalStorage.setItem(storageKey(), JSON.stringify(next));
      setSaved(next);
    }} />}
    <Action title="Stop Timer" icon={Icon.Stop} shortcut={{ modifiers: ["cmd", "shift"], key: "s" }} onAction={stop} />
    <Action title="Refresh" icon={Icon.ArrowClockwise} shortcut={{ modifiers: ["cmd"], key: "r" }} onAction={refresh} />
  </ActionPanel>;

  const row = (o: Option) => {
    const favorite = saved.find((f) => sameOption(f, o));
    return <List.Item key={itemKey(o)} id={itemKey(o)} title={favorite?.alias || o.project.name} subtitle={favorite ? `${o.project.name} · ${o.task.name}` : o.task.name} accessories={[{ text: o.client.name }]} icon={isFavorite(o) ? Icon.Star : Icon.Clock} actions={actions(o, favorite)} />;
  };
  const matching = <T extends Option>(items: T[]) => items.filter((o) => matchesOption(o, saved.filter((f) => sameOption(f, o)).map((f) => f.alias).join(" ")));

  const { rows: dayRows, total } = summarizeDay(day || []);
  // "status"/"stop"/"today" show the whole day; other words filter it like the project list.
  const showWholeDay = matchesSearch(search, ["status", "stop", "today"]);
  const dayRow = ({ running, ...rest }: DayRow) => dayRowView({ ...rest, running: running && dayIsLive });
  const dayRowView = (r: DayRow) => <List.Item key={`today-${itemKey(r)}`} id={`today-${itemKey(r)}`} title={r.project.name} subtitle={r.task.name}
    icon={r.running ? { source: Icon.CircleProgress50, tintColor: Color.Orange } : Icon.Clock}
    accessories={[...(r.running ? [{ tag: { value: "Running", color: Color.Orange } }] : []), { text: r.client.name }, { text: { value: formatHours(r.hours), color: r.running ? Color.Orange : Color.PrimaryText } }]}
    actions={r.running
      ? <ActionPanel><Action title="Stop Timer" icon={Icon.Stop} onAction={stop} /><Action title="Refresh" icon={Icon.ArrowClockwise} shortcut={{ modifiers: ["cmd"], key: "r" }} onAction={refresh} /></ActionPanel>
      : actions(r)} />;

  const totalLabel = `${formatHours(total)} h`;
  return <List filtering={false} navigationTitle={day ? `Track · ${totalLabel} today` : "Track"} isLoading={loading} searchText={search} onSearchTextChange={setSearch} searchBarPlaceholder="Project, client, task, or shortcut">
    <List.EmptyView title={failure ? "Couldn't load Harvest" : "No matching projects/tasks"} description={failure || (search.trim() ? "Try words from the client, project, task, or shortcut name." : "Check your project assignments in Harvest.")} actions={<ActionPanel><Action title="Refresh" onAction={refresh} /></ActionPanel>} />
    {!day && showWholeDay && <List.Section title="Today"><List.Item id="today-loading" title="Loading today…" icon={Icon.Clock} /></List.Section>}
    {day && <List.Section title={`Today · ${totalLabel}`}>
      {(showWholeDay ? dayRows : matching(dayRows)).map(dayRow)}
      {dayRows.length > 0 && showWholeDay && <List.Item id="today-total" title="Total" icon={Icon.Calculator} accessories={[{ text: { value: formatHours(total), color: Color.PrimaryText } }]} actions={<ActionPanel><Action title="Refresh" icon={Icon.ArrowClockwise} onAction={refresh} /></ActionPanel>} />}
      {!dayRows.length && showWholeDay && <List.Item id="today-empty" title="Nothing tracked yet today" icon={Icon.Clock} actions={<ActionPanel><Action title="Refresh" onAction={refresh} /></ActionPanel>} />}
    </List.Section>}
    <List.Section title="Favorites & Shortcuts" subtitle="⌘D adds a favorite · ⌘S saves a named shortcut">
      {matching(favoriteItems).map(row)}
    </List.Section>
    <List.Section title="Recent & Frequent">
      {matching(frequentItems).map(row)}
    </List.Section>
    <List.Section title="Projects & Tasks" subtitle="⌘D adds a favorite · ⌘S saves a named shortcut">
      {/* Only populated while searching. */}
      {matching(otherItems).map(row)}
    </List.Section>
  </List>;
}
