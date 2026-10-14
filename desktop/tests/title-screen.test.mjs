/**
 * The title screen follows the owner's standing rulings
 * (docs/coordination/prior-rulings/screens.md items 1 and 5): a full-window
 * national civic scene behind the Kit 13 menu, no version string and no place
 * field on the front; the place choice is New game's second step.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { fileURLToPath, URL } from "node:url";

const read = (relative) =>
  readFileSync(fileURLToPath(new URL(relative, import.meta.url)), "utf8");
const html = read("../../src/bench/play.html");
const script = read("../../src/bench/play.mjs");
const manifest = JSON.parse(read("../../art/backdrops/manifest.json"));

const front = html.slice(
  html.indexOf('<section id="front"'),
  html.indexOf("</section>", html.indexOf('<section id="front"')),
);

test("the title backdrop is a national scene from the backdrop manifest", () => {
  const match = /const TITLE_BACKDROP = "\/art\/backdrops\/([^"]+)";/.exec(
    script,
  );
  assert.ok(match, "the title sets its backdrop");
  assert.match(script, /\$\("backdrop"\)\.src = TITLE_BACKDROP;/);
  const file = match[1];
  assert.doesNotMatch(file, /state-capitol|community/);
  assert.ok(
    manifest.backdrops.some((row) => row.file === file),
    `${file} is in art/backdrops/manifest.json`,
  );
});

test("the front shows no version string and no place field", () => {
  assert.doesNotMatch(front, /id="version"/);
  const main = front.slice(
    front.indexOf('id="front-main"'),
    front.indexOf('id="front-place"'),
  );
  assert.doesNotMatch(main, /id="place"/);
  assert.match(
    front,
    /<div id="front-place" data-testid="new-game-place" hidden>/,
  );
  assert.match(front, /data-testid="place-random"/);
});
