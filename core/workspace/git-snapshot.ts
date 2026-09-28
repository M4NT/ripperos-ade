import { repoRoot } from "../paths";
import { captureCommand } from "./spawn-capture";

export interface GitSnapshot {
  branch: string;
  head: string;
  status: string;
}

export async function readGitSnapshot(): Promise<GitSnapshot> {
  const root = repoRoot();
  const [branch, head, status] = await Promise.all([
    captureCommand("git", ["-C", root, "branch", "--show-current"]),
    captureCommand("git", ["-C", root, "log", "-1", "--oneline"]),
    captureCommand("git", ["-C", root, "status", "-sb"]),
  ]);
  return {
    branch: branch.code === 0 && branch.stdout ? branch.stdout.split("\n")[0] ?? "local" : "local",
    head: head.code === 0 ? head.stdout : "",
    status: status.code === 0 ? status.stdout : "",
  };
}
