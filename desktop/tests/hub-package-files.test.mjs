import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { fileURLToPath, URL } from "node:url";

const read = (relative) =>
  readFileSync(fileURLToPath(new URL(relative, import.meta.url)), "utf8");

test("every controller file the hub loads is packaged", () => {
  const packager = read("../scripts/package-private-controller.mjs");
  const list = /const CONTROLLER_FILES = \[([\s\S]*?)\];/.exec(packager);
  assert.ok(list, "CONTROLLER_FILES not found");
  const packaged = new Set(
    [...list[1].matchAll(/"([^"]+)"/g)].map((match) => match[1]),
  );
  for (const script of [
    "main.mjs",
    "build-catalog.mjs",
    "chrome.mjs",
    "agents.mjs",
    "agents-view.mjs",
  ]) {
    const source = read(`../private-controller/${script}`);
    const local = [
      ...source.matchAll(/from "\.\/([^"/]+\.m?js)"/g),
      ...source.matchAll(/path\.join\(appRoot, "([a-z-]+\.json)"\)/g),
    ].map((match) => match[1]);
    for (const name of local)
      assert.ok(packaged.has(name), `${script} needs ${name} packaged`);
  }
});
