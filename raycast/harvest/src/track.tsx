import { Action, ActionPanel, Cache, Form, Icon, LaunchProps, List, LocalStorage, Toast, closeMainWindow, getPreferenceValues, showHUD, showToast, useNavigation } from "@raycast/api";
import { createHash } from "node:crypto";
import { useEffect, useRef, useState } from "react";
import { Harvest, MetadataCache, Option, sameOption } from "./harvest";
import { matchesSearch } from "./search";

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
  const [loading, setLoading] = useState(true);
  const [failure, setFailure] = useState<string>();
  const [status, setStatus] = useState("Loading current timer…");
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
      setStatus("No timer running");
      await showHUD(count ? "Harvest timer stopped" : "No timer running");
    } catch (error) { await report(error); }
    finally { busy.current = false; setLoading(false); }
  }

  async function load(allowDirect = false, force = false) {
    setLoading(true);
    setFailure(undefined);
    try {
      const shortcuts = await favorites();
      setSaved(shortcuts);
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
          const running = await api.running(user.id);
          const label = running.length ? running.map((e) => `${e.project.name} · ${e.task.name}`).join(", ") : "No timer running";
          setStatus(label);
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

  const activeFavorites = saved.filter((f) => options.some((o) => sameOption(o, f)));
  const matchesOption = (option: Option, alias = "") => matchesSearch(search, [option.client.name, option.project.name, option.task.name, alias]);
  const actions = (option: Option, favorite?: Favorite) => <ActionPanel>
    <Action title="Start Tracking" icon={Icon.Play} onAction={() => start(option)} />
    <Action.Push title="Save Shortcut" icon={Icon.Star} shortcut={{ modifiers: ["cmd"], key: "s" }} target={<SaveShortcut option={option} initialAlias={query || option.project.name.toLowerCase()} onSaved={() => { void favorites().then(setSaved); }} />} />
    {favorite && <Action title="Remove Shortcut" icon={Icon.StarDisabled} onAction={async () => {
      const next = (await favorites()).filter((f) => f.alias !== favorite.alias);
      await LocalStorage.setItem(storageKey(), JSON.stringify(next));
      setSaved(next);
    }} />}
    <Action title="Stop Timer" icon={Icon.Stop} shortcut={{ modifiers: ["cmd", "shift"], key: "s" }} onAction={stop} />
    <Action title="Refresh" icon={Icon.ArrowClockwise} shortcut={{ modifiers: ["cmd"], key: "r" }} onAction={refresh} />
  </ActionPanel>;

  return <List filtering={false} isLoading={loading} searchText={search} onSearchTextChange={setSearch} searchBarPlaceholder="Project, client, task, or shortcut">
    <List.EmptyView title={failure ? "Couldn't load Harvest" : "No matching projects/tasks"} description={failure || (search.trim() ? "Try words from the client, project, task, or shortcut name." : "Check your project assignments in Harvest.")} actions={<ActionPanel><Action title="Refresh" onAction={refresh} /></ActionPanel>} />
    {matchesSearch(search, [status, "status", "stop"]) && <List.Section title="Current Timer">
      <List.Item title={status} icon={Icon.Clock} keywords={["status", "stop"]} actions={<ActionPanel><Action title="Stop Timer" icon={Icon.Stop} onAction={stop} /><Action title="Refresh" onAction={refresh} /></ActionPanel>} />
    </List.Section>}
    <List.Section title="Shortcuts">
      {activeFavorites.filter((f) => matchesOption(f, f.alias)).map((f) => <List.Item key={f.alias} title={f.alias} subtitle={`${f.project.name} · ${f.task.name}`} keywords={[f.client.name]} icon={Icon.Star} actions={actions(f, f)} />)}
    </List.Section>
    <List.Section title="Projects & Tasks" subtitle="⌘S saves a shortcut for the selected task">
      {options.filter((o) => matchesOption(o)).map((o) => <List.Item key={`${o.project.id}:${o.task.id}`} title={o.project.name} subtitle={o.task.name} keywords={[o.client.name]} accessories={[{ text: o.client.name }]} icon={Icon.Clock} actions={actions(o)} />)}
    </List.Section>
  </List>;
}
