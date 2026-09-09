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

export default defineConfig({
  plugins: [react(), sites()],
  define: buildIdentityDefines(buildIdentity),
  build: {
    outDir: "dist/client",
  },
  test: {
    exclude: [...configDefaults.exclude, "tests/e2e/**"],
  },
});
