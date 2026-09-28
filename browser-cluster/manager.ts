export interface BrowserContainer {
  id: string;
  cdpPort: number;
  image: string;
  display: string;
}

const BASE_PORT = 9222;

export class BrowserPool {
  private readonly used = new Set<number>();
  private readonly containers = new Map<string, BrowserContainer>();

  constructor(private readonly image = "ripperos-browser:local") {}

  allocate(): BrowserContainer {
    let port = BASE_PORT;
    while (this.used.has(port)) port += 1;
    this.used.add(port);
    const container: BrowserContainer = {
      id: `ripper-browser-${port}`,
      cdpPort: port,
      image: this.image,
      display: ":99",
    };
    this.containers.set(container.id, container);
    return container;
  }

  release(id: string): void {
    const container = this.containers.get(id);
    if (!container) return;
    this.used.delete(container.cdpPort);
    this.containers.delete(id);
  }

  list(): BrowserContainer[] {
    return [...this.containers.values()];
  }

  dockerRunArgs(container: BrowserContainer): string[] {
    return [
      "run",
      "-d",
      "--name",
      container.id,
      "-p",
      `${container.cdpPort}:9222`,
      "-e",
      `DISPLAY=${container.display}`,
      "--shm-size",
      "1g",
      container.image,
    ];
  }
}
