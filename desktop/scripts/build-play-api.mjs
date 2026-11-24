/* global console, process */
/**
 * Bundle the play server's request handler (src/bench/handler.ts) for the
 * desktop shell, which runs it in-process behind the app:// protocol.
 *
 * The handler reads art, map geometry and data files relative to its own
 * modules (`new URL("../../art/…", import.meta.url)`). In a bundle those
 * modules no longer exist, so each module's `import.meta.url` is rewritten to
 * where that module would sit under a runtime root the shell supplies
 * (`globalThis.__OCD_RUNTIME_ROOT__`), and every file or folder those
 * lookups name is copied to the same place under `staged/play-api/runtime/`.
 * No source module changes; the copy list is read from the code itself.
 */

import { cpSync, existsSync, mkdirSync, rmSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "vite";

const desktopRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const repoRoot = path.dirname(desktopRoot);
const outDir = path.join(desktopRoot, "staged", "play-api");

// new URL("literal" | `literal/${…}`, import.meta.url)
const LOOKUP =
  /new\s+URL\(\s*(["'`])((?:(?!\1)[^\\])*)\1\s*,\s*import\.meta\.url\s*,?\s*\)/g;

const needed = new Set();

function runtimeUrls() {
  return {
    name: "our-civic-duty-runtime-urls",
    enforce: "pre",
    transform(code, id) {
      const file = path.resolve(id.split("?")[0]);
      if (
        !file.startsWith(repoRoot + path.sep) ||
        file.includes("node_modules")
      )
        return null;
      if (!code.includes("import.meta.url")) return null;
      for (const match of code.matchAll(LOOKUP)) {
        // A template's static folder is all that can be known: art/people-engine/${PEOPLE_PACK}/.
        const literal = match[2].split("${")[0];
        const target = path.resolve(path.dirname(file), literal);
        needed.add(
          !match[2].includes("${") || literal.endsWith("/")
            ? target
            : path.dirname(target),
        );
        if (process.env.PLAY_API_DEBUG) console.log(file, match[2], target);
      }
      const relative = path.relative(repoRoot, file).split(path.sep).join("/");
      return {
        code: code.replaceAll(
          "import.meta.url",
          `new URL(${JSON.stringify(relative)}, globalThis.__OCD_RUNTIME_ROOT__).href`,
        ),
        map: null,
      };
    },
  };
}

rmSync(outDir, { recursive: true, force: true });
await build({
  root: repoRoot,
  configFile: false,
  logLevel: "warn",
  publicDir: false,
  plugins: [runtimeUrls()],
  ssr: { noExternal: true },
  build: {
    ssr: path.join(repoRoot, "src/bench/handler.ts"),
    outDir,
    emptyOutDir: true,
    minify: false,
    sourcemap: false,
    rolldownOptions: {
      output: { format: "esm", entryFileNames: "play-api.mjs" },
    },
  },
});

let copied = 0;
for (const source of needed) {
  if (!existsSync(source)) {
    console.error(`Play API reads ${source}, which does not exist.`);
    process.exit(1);
  }
  const relative = path.relative(repoRoot, source);
  if (relative.startsWith("..")) {
    console.error(`Play API reads ${source}, outside the repository.`);
    process.exit(1);
  }
  const target = path.join(outDir, "runtime", relative);
  mkdirSync(path.dirname(target), { recursive: true });
  cpSync(source, target, { recursive: true });
  copied += statSync(source).isDirectory() ? 0 : 1;
}
console.log(
  `Play API bundled: ${path.relative(repoRoot, outDir)} (${needed.size} runtime lookups, ${copied} loose files).`,
);
