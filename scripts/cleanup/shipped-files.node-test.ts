import assert from "node:assert/strict";
import {
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
  mkdirSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { build } from "vite";
import { shippedFiles } from "../dev-lab/shipped-files";

test("reports modules, CSS, inline and emitted assets, and copied public files", async () => {
  const root = mkdtempSync(join(tmpdir(), "shipping-inventory-"));
  try {
    mkdirSync(join(root, "public"));
    writeFileSync(join(root, "public", "license.txt"), "fixture license");
    writeFileSync(
      join(root, "index.html"),
      '<script type="module" src="/main.js"></script>',
    );
    writeFileSync(
      join(root, "main.js"),
      'import inline from "./inline.png"; import "./style.css"; document.body.dataset.url = inline;',
    );
    writeFileSync(
      join(root, "style.css"),
      "body { background: url(./small.svg), url(./emitted.png); }",
    );
    writeFileSync(join(root, "inline.png"), Buffer.from([6, 2, 1, 5, 3, 4]));
    writeFileSync(
      join(root, "small.svg"),
      '<svg xmlns="http://www.w3.org/2000/svg" width="5" height="5"></svg>',
    );
    writeFileSync(join(root, "emitted.png"), Buffer.alloc(5000));
    await build({
      root,
      configFile: false,
      logLevel: "error",
      plugins: [shippedFiles()],
      build: { outDir: "dist/client" },
    });
    const result = JSON.parse(
      readFileSync(join(root, "dist", "shipped-files.json"), "utf8"),
    );
    for (const file of [
      "index.html",
      "main.js",
      "style.css",
      "inline.png",
      "small.svg",
      "emitted.png",
      "public/license.txt",
    ]) {
      assert.ok(result.files.includes(file), file);
    }
    assert.deepEqual(result.inlineAssets, ["inline.png", "small.svg"]);
    assert.deepEqual(result.publicAssets, ["license.txt"]);
    assert.ok(
      result.outputs.some((entry: { sources: string[] }) =>
        entry.sources.includes("emitted.png"),
      ),
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
