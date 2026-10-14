/**
 * The title screen follows the owner's standing rulings
 * (docs/coordination/prior-rulings/screens.md items 1 and 5): a full-window
 * national scene or event behind the Kit 13 menu, structured as the
 * established title (New game, Continue, Saved games, Options, Patch notes,
 * Quit on the desktop, each with its line), no version string and no place
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

const ALLOWED = new Set([
  "white-house-exterior",
  "national-convention-floor",
  "national-convention-stage",
  "rally-stage",
  "rally-town-square",
  "rally-courthouse-square",
  "us-house-floor",
  "us-senate-floor",
  "debate-stage",
  "oval-office",
]);

test("the title rotates through national scenes from the backdrop manifest", () => {
  const title = read("../../src/bench/title.ts");
  const list = /TITLE_SCENES = \[([^\]]+)\]/.exec(title);
  assert.ok(list, "the title names its scenes");
  const scenes = [...list[1].matchAll(/"([a-z-]+)"/g)].map((m) => m[1]);
  assert.ok(scenes.length >= 3, "more than one scene rotates");
  for (const place of scenes) {
    assert.ok(ALLOWED.has(place), `${place} is an allowed national scene`);
    assert.ok(
      manifest.backdrops.some((row) => row.place === place),
      `${place} is in art/backdrops/manifest.json`,
    );
  }
  assert.match(script, /api\("\/api\/title"\)/);
  assert.match(script, /\$\("backdrop"\)\.src = title\.backdrop\.url;/);
});

test("the front follows the established title: subtitle, items with lines", () => {
  assert.match(front, /<p class="sub">A life in American government\.<\/p>/);
  const main = front.slice(
    front.indexOf('id="front-main"'),
    front.indexOf('id="front-place"'),
  );
  const order = [
    "new-game",
    "continue",
    "saved-games",
    "title-options",
    "title-patch-notes",
    "title-quit",
  ].map((id) => main.indexOf(`data-testid="${id}"`));
  assert.ok(
    order.every((at) => at > 0),
    "every item is on the front",
  );
  assert.deepEqual(
    [...order].sort((x, y) => x - y),
    order,
    "in order",
  );
  const button = (id) =>
    main.slice(
      main.indexOf(`data-testid="${id}"`),
      main.indexOf("</button>", main.indexOf(`data-testid="${id}"`)),
    );
  assert.match(
    button("new-game"),
    /<span>Begin a life in a real place\.<\/span>/,
  );
  assert.match(
    button("continue"),
    /disabled[\s\S]*<span>No life saved yet\.<\/span>/,
  );
  assert.match(button("saved-games"), /disabled/);
  assert.match(button("title-patch-notes"), /disabled/);
  assert.match(button("title-quit"), /hidden/);
  assert.doesNotMatch(main, /watch/i);
  assert.doesNotMatch(script, /drawPeople\(title/);
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
