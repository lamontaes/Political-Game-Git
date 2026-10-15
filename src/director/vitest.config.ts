import { defineConfig } from "vitest/config";

/** The story director's tests, kept small under the speed testing rule. */
export default defineConfig({
  cacheDir: "/tmp/p13-vitest-cache",
  test: {
    include: ["src/director/**/*.test.ts"],
    environment: "node",
    maxWorkers: 1,
    testTimeout: 120_000,
  },
});
