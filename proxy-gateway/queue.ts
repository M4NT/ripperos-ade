export class KillSwitchError extends Error {
  constructor() {
    super("Kill switch engaged");
    this.name = "KillSwitchError";
  }
}

export interface FifoQueueOptions {
  minDelayMs: number;
  maxDelayMs: number;
  random?: () => number;
  sleep?: (ms: number) => Promise<void>;
  isKilled?: () => boolean | Promise<boolean>;
}

export function humanDelay(minMs: number, maxMs: number, random: () => number = Math.random): number {
  if (maxMs < minMs) {
    throw new Error("maxDelayMs menor que minDelayMs");
  }
  return Math.round(minMs + (maxMs - minMs) * random());
}

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, ms);
    timer.unref?.();
  });
}

export class FifoAccountQueue {
  private readonly tails = new Map<string, Promise<void>>();

  constructor(private readonly options: FifoQueueOptions) {}

  enqueue<T>(accountId: string, run: () => Promise<T>, options?: { bypassKill?: boolean }): Promise<T> {
    const previous = this.tails.get(accountId) ?? Promise.resolve();
    const executed = previous.then(async () => {
      if (!options?.bypassKill && (await this.options.isKilled?.())) {
        throw new KillSwitchError();
      }
      return run();
    });
    const settled = executed.then(
      async () => {
        await this.pause();
      },
      async (error: unknown) => {
        await this.pause();
        throw error;
      },
    );
    this.tails.set(
      accountId,
      settled.then(
        () => undefined,
        () => undefined,
      ),
    );
    return executed;
  }

  private pause(): Promise<void> {
    const wait = this.options.sleep ?? defaultSleep;
    const delay = humanDelay(this.options.minDelayMs, this.options.maxDelayMs, this.options.random);
    return wait(delay);
  }
}
