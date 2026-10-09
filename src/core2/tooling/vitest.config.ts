import { defineConfig } from "vitest/config";
import { P } from "../parameters";

/** Mutable P8 prototype has its own tests; old immutable-world setup is separate. */
export default defineConfig({
  cacheDir: "/tmp/p8-vitest-cache",
  test: {
    include: ["src/core2/**/*.test.ts"],
    environment: "node",
    maxWorkers: P.one,
    testTimeout: P.yearSecondsBudget * P.millisecondsPerSecond,
    hookTimeout: P.yearSecondsBudget * P.millisecondsPerSecond,
  },
});
