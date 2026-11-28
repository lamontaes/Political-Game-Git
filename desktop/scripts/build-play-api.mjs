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

import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "vite";

const desktopRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const repoRoot = path.dirname(desktopRoot);
// PLAY_API_OUT_DIR is for a test that builds its own copy, so it never touches the one packaging reads.
const outDir = process.env.PLAY_API_OUT_DIR
  ? path.resolve(process.env.PLAY_API_OUT_DIR)
  : path.join(desktopRoot, "staged", "play-api");

// new URL("literal" | `literal/${…}`, import.meta.url)
const LOOKUP =
  /new\s+URL\(\s*(["'`])((?:(?!\1)[^\\])*)\1\s*,\s*import\.meta\.url\s*,?\s*\)/g;

const needed = new Set();
const inventoryPath = process.env.PLAY_API_SHIPPED_FILES;
const shipped = new Set();
const asRepoPath = (file) =>
  path.relative(repoRoot, file).split(path.sep).join("/");

function playApiInventory() {
  return {
    name: "our-civic-duty-play-api-inventory",
    generateBundle(_options, bundle) {
      for (const item of Object.values(bundle)) {
        const inputs =
          item.type === "chunk"
            ? Object.keys(item.modules)
            : item.originalFileNames;
        for (const input of inputs) {
          if (input.startsWith("\0")) continue;
          const file = asRepoPath(path.resolve(repoRoot, input.split("?")[0]));
          if (!file.startsWith("../") && !file.includes("node_modules/"))
            shipped.add(file);
        }
      }
    },
  };
}

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
  plugins: [runtimeUrls(), ...(inventoryPath ? [playApiInventory()] : [])],
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
  const directory = statSync(source).isDirectory();
  copied += directory ? 0 : 1;
  if (!inventoryPath) continue;
  if (!directory) shipped.add(asRepoPath(source));
  else
    for (const entry of readdirSync(source, {
      recursive: true,
      withFileTypes: true,
    }))
      if (!entry.isDirectory())
        shipped.add(asRepoPath(path.join(entry.parentPath, entry.name)));
}
if (inventoryPath) {
  mkdirSync(path.dirname(path.resolve(inventoryPath)), { recursive: true });
  writeFileSync(
    inventoryPath,
    JSON.stringify({ files: [...shipped].sort() }, null, 2) + "\n",
  );
}
console.log(
  `Play API bundled: ${path.relative(repoRoot, outDir)} (${needed.size} runtime lookups, ${copied} loose files).`,
);
