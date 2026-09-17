import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { fileURLToPath, URL } from "node:url";

const read = (name) =>
  readFileSync(
    fileURLToPath(new URL(`../private-controller/${name}`, import.meta.url)),
    "utf8",
  );

for (const [script, page] of [
  ["chrome.mjs", "index.html"],
  ["agents.mjs", "agents.html"],
  ["settings.mjs", "settings.html"],
  ["notice.mjs", "notice.html"],
]) {
  test(`${script} only looks up ids present in ${page}`, () => {
    const html = read(page);
    const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
    const wanted = [...read(script).matchAll(/\$\("([A-Za-z0-9_-]+)"\)/g)].map(
      (m) => m[1],
    );
    assert.ok(wanted.length > 0);
    for (const id of wanted) assert.ok(ids.has(id), `${page} lacks #${id}`);
  });
}
