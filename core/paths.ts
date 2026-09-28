import path from "node:path";

export function repoRoot(): string {
  if (process.env.RIPPEROS_ROOT) {
    return path.resolve(process.env.RIPPEROS_ROOT);
  }
  const cwd = process.cwd();
  if (path.basename(cwd).toLowerCase() === "app") {
    return path.resolve(cwd, "..");
  }
  return cwd;
}
