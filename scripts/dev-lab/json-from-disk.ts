// Under Vitest only: a JSON import is read from disk and parsed when the module
// runs, instead of compiled into a JavaScript module (tests-vitest-import-baseline-heap).
// Vite turns each JSON file into module code, and Vitest's module runner keeps
// that code for every evaluated module: importing src/bench/world.ts kept 200
// million characters of JSON-as-code, so a worker held about 1,070 MB live
// against 238 MB for plain node. A module that parses its file at run time keeps
// only the parsed value, as plain node does. Every JSON import here is a
// default import, which is all this module exports.
import type { Plugin } from "vite";

const PREFIX = "\0json-from-disk:";
const SUFFIX = ".mjs";

export function jsonFromDisk(): Plugin {
  return {
    name: "json-from-disk",
    enforce: "pre",
    async resolveId(source, importer, options) {
      if (!/\.json$/.test(source) || source.startsWith("\0")) return null;
      const resolved = await this.resolve(source, importer, {
        ...options,
        skipSelf: true,
      });
      if (!resolved || resolved.external || !resolved.id.endsWith(".json"))
        return null;
      return `${PREFIX}${resolved.id}${SUFFIX}`;
    },
    load(id) {
      if (!id.startsWith(PREFIX)) return null;
      const file = id.slice(PREFIX.length, -SUFFIX.length);
      return `import { readFileSync } from "node:fs";\nexport default JSON.parse(readFileSync(${JSON.stringify(file)}, "utf8"));\n`;
    },
  };
}
