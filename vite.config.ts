import { runtimeArtBuild } from "./scripts/dev-lab/runtime-art-build";
import { runtimeContentOrigin } from "./scripts/dev-lab/runtime-content-origin";
import { resolve } from "node:path";
import { sites } from "@openai/sites-vite-plugin";
import react from "@vitejs/plugin-react";
import { configDefaults, defineConfig } from "vitest/config";
import {
  buildIdentityDefines,
  resolveBuildIdentity,
} from "./scripts/release/build-identity.js";

// Build identity is fixed into the bundle here rather than written down in a
// React file: the accepted version comes from package.json and the revision
// from the checkout itself, so no build can claim an identity it does not have.
// The same defines apply under Vitest, which is how the tests can assert that
// what the game would display equals what the package says.
const buildIdentity = resolveBuildIdentity(process.cwd());

import { identifiedBuild } from "./scripts/dev-lab/vite-identity";
import { artDeskBridge } from "./scripts/dev-lab/art-desk-bridge";
import { artbenchBridge } from "./scripts/dev-lab/artbench-bridge";
import { RoundRobinSequencer } from "./scripts/dev-lab/round-robin-sequencer";

export default defineConfig({
  cacheDir:
    process.env.PG_CACHE_DIR ??
    resolve("test-results", "cache", process.env.PG_RUN_ID ?? "dev"),
  plugins: [
    runtimeArtBuild(),
    runtimeContentOrigin(),
    react(),
    sites(),
    identifiedBuild(),
    artDeskBridge(process.cwd()),
    artbenchBridge({ workspace: process.cwd() }),
  ],
  define: buildIdentityDefines(buildIdentity),
  // This repository has thousands of source modules and several HTML entry
  // points, but its browser-facing third-party graph is deliberately tiny.
  // Listing that graph avoids a full cold-start dependency crawl every time
  // the owner opens the Art Desk from the private hub.
  optimizeDeps: {
    noDiscovery: true,
    holdUntilCrawlEnd: false,
    include: [
      "react",
      "react-dom",
      "react-dom/client",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
    ],
  },
  build: {
    outDir: "dist/client",
    rolldownOptions: { input: { app: "index.html", review: "review.html" } },
  },
  test: {
    // Hosted shards deal the path-sorted suite out one file per shard so
    // expensive alphabetical clusters do not land on one runner.
    sequence: { sequencer: RoundRobinSequencer },
    exclude: [
      ...configDefaults.exclude,
      "tests/e2e/**",
      // Portable Playwright adapters run only after A mounts them in tests/e2e.
      // They are browser proofs, not Vitest modules; mounted proofs remain required.
      "tests/caller-proofs/**",
      // The desktop shell has its own Node test runner (`cd desktop && npm test`).
      // Those files use `node:test`, not Vitest.
      "desktop/**",
      // Immutable private pack authoring snapshots also use node:test.
      // Their original validators run with Node, not through Vitest discovery.
      "art/authoring/**",
    ],
  },
});
