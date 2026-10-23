import { Action, ActionPanel, Color, Icon, List, closeMainWindow, getPreferenceValues, showToast, Toast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { execFile } from "node:child_process";
import { homedir } from "node:os";
import { useEffect } from "react";

type Agent = {
  agent: string;
  state: "working" | "waiting" | "done" | string;
  summary: string;
  project: string;
  branch: string;
  worktree: string;
  pane: string;
  tmux_session: string;
  session_id: string;
  updated: number;
};

// Raycast doesn't load the shell profile, so give agent-status a PATH with Homebrew on it.
const PATH = ["/opt/homebrew/bin", "/usr/local/bin", "/usr/bin", "/bin", "/usr/sbin", "/sbin"].join(":");

const STATES: Record<string, { icon: Icon; color: Color; label: string; order: number }> = {
  waiting: { icon: Icon.QuestionMarkCircle, color: Color.Orange, label: "needs you", order: 0 },
  working: { icon: Icon.CircleProgress50, color: Color.Blue, label: "working", order: 1 },
  done: { icon: Icon.CheckCircle, color: Color.Green, label: "done", order: 2 },
};

function agentStatusPath(): string {
  const { agentStatusPath } = getPreferenceValues<{ agentStatusPath?: string }>();
  return (agentStatusPath || "~/.dotfiles/bin/agent-status").replace(/^~/, homedir());
}

function run(args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(agentStatusPath(), args, { env: { ...process.env, PATH }, timeout: 10000 }, (error, stdout, stderr) => {
      if (error) reject(new Error(stderr.trim() || error.message));
      else resolve(stdout);
    });
  });
}

async function listAgents(): Promise<Agent[]> {
  return JSON.parse(await run(["list", "--json"])) as Agent[];
}

function ago(updated: number): string {
  const minutes = Math.floor((Date.now() / 1000 - updated) / 60);
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  if (minutes < 24 * 60) return `${Math.floor(minutes / 60)}h`;
  return `${Math.floor(minutes / (24 * 60))}d`;
}

// Projects with an agent that needs you come first, then the most recently active.
function groupByProject(agents: Agent[]): [string, Agent[]][] {
  const groups = new Map<string, Agent[]>();
  for (const agent of agents) groups.set(agent.project, [...(groups.get(agent.project) ?? []), agent]);
  const rank = (list: Agent[]) => Math.min(...list.map((a) => STATES[a.state]?.order ?? 3));
  for (const list of groups.values()) list.sort((a, b) => b.updated - a.updated);
  return [...groups.entries()].sort(
    ([, a], [, b]) => rank(a) - rank(b) || Math.max(...b.map((x) => x.updated)) - Math.max(...a.map((x) => x.updated)),
  );
}

export default function Command() {
  const { data, isLoading, revalidate } = usePromise(listAgents, [], {
    failureToastOptions: { title: "agent-status list failed" },
  });

  useEffect(() => {
    const timer = setInterval(revalidate, 3000);
    return () => clearInterval(timer);
  }, []);

  async function focus(agent: Agent) {
    await closeMainWindow();
    try {
      await run(["focus", agent.pane]);
    } catch (error) {
      await showToast({ style: Toast.Style.Failure, title: "Couldn't switch to agent", message: String(error) });
    }
  }

  async function forget(agent: Agent) {
    await run(["rm", agent.pane || agent.session_id]);
    revalidate();
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Project, branch or task">
      {data?.length === 0 && (
        <List.EmptyView
          icon={Icon.Terminal}
          title="No agents"
          description="Agents show up here once their hooks call agent-status"
        />
      )}
      {groupByProject(data ?? []).map(([project, agents]) => (
        <List.Section key={project} title={project}>
          {agents.map((agent) => {
            const state = STATES[agent.state] ?? { icon: Icon.Circle, color: Color.SecondaryText, label: agent.state, order: 3 };
            return (
              <List.Item
                key={agent.pane || agent.session_id}
                title={agent.summary || agent.agent}
                subtitle={agent.branch}
                keywords={[project, agent.branch, agent.agent, agent.tmux_session].filter(Boolean)}
                icon={{ source: state.icon, tintColor: state.color }}
                accessories={[
                  { text: agent.agent },
                  { tag: { value: state.label, color: state.color } },
                  { text: ago(agent.updated), tooltip: new Date(agent.updated * 1000).toLocaleString() },
                ]}
                actions={
                  <ActionPanel>
                    {agent.pane && <Action title="Switch to Agent" icon={Icon.Terminal} onAction={() => focus(agent)} />}
                    <Action.CopyToClipboard title="Copy Worktree Path" content={agent.worktree} shortcut={{ modifiers: ["cmd"], key: "c" }} />
                    <Action.ShowInFinder path={agent.worktree} shortcut={{ modifiers: ["cmd"], key: "f" }} />
                    <Action title="Refresh" icon={Icon.ArrowClockwise} shortcut={{ modifiers: ["cmd"], key: "r" }} onAction={revalidate} />
                    <Action
                      title="Forget Agent"
                      icon={Icon.XMarkCircle}
                      style={Action.Style.Destructive}
                      shortcut={{ modifiers: ["ctrl"], key: "x" }}
                      onAction={() => forget(agent)}
                    />
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      ))}
    </List>
  );
}
