import { configDefaults, defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { sites } from "@openai/sites-vite-plugin";

export default defineConfig({
  plugins: [react(), sites()],
  test: {
    exclude: [...configDefaults.exclude, "tests/e2e/**"],
    testTimeout: 10000,
  },
});
