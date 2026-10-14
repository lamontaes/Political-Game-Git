/**
 * The title screen follows the owner's standing rulings
 * (docs/coordination/prior-rulings/screens.md items 1 and 5): a full-window
 * national scene or event behind the Kit 13 menu, holding the Oct 13
 * front's controls (seed, opening date, place, Customize the world) and New
 * game, Continue, Options, and Quit on the desktop, and no version string.
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

test("the front is the Oct 13 front: seed, date, place, custom world, menu", () => {
  assert.doesNotMatch(front, /class="sub"/);
  assert.doesNotMatch(front, /id="version"/);
  for (const id of [
    "seed",
    "seed-random",
    "date",
    "place",
    "set-population",
    "set-wages",
    "set-cash",
    "set-demand",
    "set-lean",
    "set-turnout",
  ])
    assert.match(front, new RegExp(`id="${id}"`), `${id} is on the front`);
  assert.match(front, /<details id="custom"/);
  assert.match(front, /id="place"[^>]*placeholder="Random"/);
  const main = front.slice(
    front.indexOf('id="front-main"'),
    front.indexOf('class="progress"'),
  );
  const order = ["new-game", "continue", "title-options", "title-quit"].map(
    (id) => main.indexOf(`data-testid="${id}"`),
  );
  assert.ok(
    order.every((at) => at > 0),
    "every item is on the front",
  );
  assert.deepEqual(
    [...order].sort((x, y) => x - y),
    order,
    "in order",
  );
  assert.doesNotMatch(main, /<span>|saved-games|patch-notes|watch/i);
  assert.doesNotMatch(front, /front-place|place-begin/);
  assert.match(
    script,
    /\$\("new-life"\)\.addEventListener\("click", \(\) => startLife\(typedPlace\(\)\)\)/,
  );
  assert.doesNotMatch(script, /drawPeople\(title/);
});
