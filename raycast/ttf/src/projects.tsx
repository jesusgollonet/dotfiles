import {
  Action,
  ActionPanel,
  Alert,
  Color,
  Icon,
  List,
  closeMainWindow,
  confirmAlert,
  getPreferenceValues,
  showToast,
  Toast,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { execFile } from "node:child_process";
import { homedir } from "node:os";

type Project = {
  name: string;
  path: string;
  running: boolean;
  attached: boolean;
  url: string;
};

// Raycast doesn't load the shell profile, so give ttf a PATH with Homebrew on it.
const PATH = ["/opt/homebrew/bin", "/usr/local/bin", "/usr/bin", "/bin", "/usr/sbin", "/sbin"].join(":");

function ttfPath(): string {
  const { ttfPath } = getPreferenceValues<{ ttfPath?: string }>();
  return (ttfPath || "~/.dotfiles/bin/ttf").replace(/^~/, homedir());
}

function run(file: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(file, args, { env: { ...process.env, PATH }, timeout: 20000 }, (error, stdout, stderr) => {
      if (error) reject(new Error(stderr.trim() || error.message));
      else resolve(stdout);
    });
  });
}

async function listProjects(): Promise<Project[]> {
  const projects = JSON.parse(await run(ttfPath(), ["list", "--json"])) as Project[];
  return projects.sort(
    (a, b) => Number(b.attached) - Number(a.attached) || Number(b.running) - Number(a.running) || a.name.localeCompare(b.name),
  );
}

async function openProject(project: Project, extraArgs: string[] = []) {
  await closeMainWindow();
  try {
    await run(ttfPath(), ["open", project.name, "--gui", ...extraArgs]);
  } catch (error) {
    await showToast({ style: Toast.Style.Failure, title: `Couldn't open ${project.name}`, message: String(error) });
  }
}

export default function Command() {
  const { data, isLoading, revalidate } = usePromise(listProjects, [], {
    failureToastOptions: { title: "ttf list failed" },
  });

  async function killSession(project: Project) {
    const ok = await confirmAlert({
      title: `Kill tmux session ${project.name}?`,
      message: "Its server and any agents running in it will stop.",
      primaryAction: { title: "Kill Session", style: Alert.ActionStyle.Destructive },
    });
    if (!ok) return;
    await run("tmux", ["kill-session", "-t", `=${project.name}`]);
    revalidate();
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Project or session">
      {data?.length === 0 && (
        <List.EmptyView
          icon={Icon.Folder}
          title="No projects"
          description="Add project roots, one per line, to ~/.config/ttf/roots"
        />
      )}
      {data?.map((project) => (
        <List.Item
          key={project.name}
          title={project.name}
          subtitle={project.path.replace(homedir(), "~")}
          icon={{
            source: project.running ? Icon.CircleFilled : Icon.Circle,
            tintColor: project.attached ? Color.Green : project.running ? Color.Blue : Color.SecondaryText,
          }}
          accessories={[
            ...(project.url ? [{ text: project.url.replace(/^https?:\/\//, ""), icon: Icon.Globe }] : []),
            ...(project.running ? [{ tag: { value: project.attached ? "attached" : "running", color: Color.Green } }] : []),
          ]}
          actions={
            <ActionPanel>
              <Action title={project.running ? "Switch to Session" : "Open Project"} icon={Icon.Terminal} onAction={() => openProject(project)} />
              {project.url && <Action.OpenInBrowser url={project.url} shortcut={{ modifiers: ["cmd"], key: "o" }} />}
              {!project.running && (
                <Action
                  title="Open Without Server"
                  icon={Icon.Terminal}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
                  onAction={() => openProject(project, ["--no-server"])}
                />
              )}
              <Action.CopyToClipboard title="Copy Path" content={project.path} shortcut={{ modifiers: ["cmd"], key: "c" }} />
              <Action.ShowInFinder path={project.path} shortcut={{ modifiers: ["cmd"], key: "f" }} />
              <Action title="Refresh" icon={Icon.ArrowClockwise} shortcut={{ modifiers: ["cmd"], key: "r" }} onAction={revalidate} />
              {project.running && (
                <Action
                  title="Kill Session"
                  icon={Icon.XMarkCircle}
                  style={Action.Style.Destructive}
                  shortcut={{ modifiers: ["ctrl"], key: "x" }}
                  onAction={() => killSession(project)}
                />
              )}
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
