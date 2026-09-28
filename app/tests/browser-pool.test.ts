import { describe, expect, it } from "vitest";
import { BrowserPool } from "../../browser-cluster/manager";

describe("browser cluster", () => {
  it("aloca portas CDP distintas e monta o docker run", () => {
    const pool = new BrowserPool();
    const first = pool.allocate();
    const second = pool.allocate();
    expect(first.cdpPort).toBe(9222);
    expect(second.cdpPort).toBe(9223);
    expect(pool.dockerRunArgs(first)).toEqual([
      "run",
      "-d",
      "--name",
      first.id,
      "-p",
      "9222:9222",
      "-e",
      "DISPLAY=:99",
      "--shm-size",
      "1g",
      "ripperos-browser:local",
    ]);
    pool.release(first.id);
    expect(pool.allocate().cdpPort).toBe(9222);
  });
});
