import { describe, expect, it } from "vitest";
import { FifoAccountQueue, humanDelay, KillSwitchError } from "@proxy/queue";

describe("fila FIFO", () => {
  it("calcula a pausa humana dentro do intervalo", () => {
    expect(humanDelay(100, 100, () => 0.9)).toBe(100);
    expect(humanDelay(0, 10, () => 0)).toBe(0);
    expect(humanDelay(0, 10, () => 1)).toBe(10);
  });

  it("executa uma conta em ordem e só então libera a próxima", async () => {
    const order: string[] = [];
    const queue = new FifoAccountQueue({
      minDelayMs: 30,
      maxDelayMs: 30,
      random: () => 0,
    });
    const first = queue.enqueue("conta", async () => {
      order.push("a");
      return "a";
    });
    const second = queue.enqueue("conta", async () => {
      order.push("b");
      return "b";
    });
    await expect(first).resolves.toBe("a");
    expect(order).toEqual(["a"]);
    await expect(second).resolves.toBe("b");
    expect(order).toEqual(["a", "b"]);
  });

  it("recusa o job quando o kill switch está ativo", async () => {
    const queue = new FifoAccountQueue({
      minDelayMs: 0,
      maxDelayMs: 0,
      sleep: async () => {},
      isKilled: () => true,
    });
    await expect(queue.enqueue("conta", async () => 1)).rejects.toBeInstanceOf(KillSwitchError);
  });

  it("deixa a liberação passar com bypassKill", async () => {
    const queue = new FifoAccountQueue({
      minDelayMs: 0,
      maxDelayMs: 0,
      sleep: async () => {},
      isKilled: () => true,
    });
    await expect(queue.enqueue("conta", async () => "ok", { bypassKill: true })).resolves.toBe("ok");
  });
});
