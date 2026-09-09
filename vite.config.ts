import { resolve } from "node:path";
import { sites } from "@openai/sites-vite-plugin";
import react from "@vitejs/plugin-react";
import { configDefaults, defineConfig } from "vitest/config";

import { identifiedBuild } from "./scripts/dev-lab/vite-identity";

export default defineConfig({
  cacheDir:
    process.env.PG_CACHE_DIR ??
    resolve("test-results", "cache", process.env.PG_RUN_ID ?? "dev"),
  plugins: [react(), sites(), identifiedBuild()],
  build: {
    outDir: "dist/client",
    rolldownOptions: { input: { app: "index.html", review: "review.html" } },
  },
  test: {
    exclude: [...configDefaults.exclude, "tests/e2e/**"],
  },
});
