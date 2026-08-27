import { sites } from "@openai/sites-vite-plugin";
import react from "@vitejs/plugin-react";
import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react(), sites()],
  build: {
    outDir: "dist/client",
  },
  test: {
    exclude: [...configDefaults.exclude, "tests/e2e/**"],
  },
});
