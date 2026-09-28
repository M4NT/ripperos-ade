import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  esbuild: {
    tsconfigRaw: {
      compilerOptions: {
        target: "ES2022",
        strict: true,
      },
    },
  },
  resolve: {
    alias: {
      "@core": path.resolve(__dirname, "../core"),
      "@agents": path.resolve(__dirname, "../agents"),
      "@proxy": path.resolve(__dirname, "../proxy-gateway"),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    fileParallelism: false,
  },
});
