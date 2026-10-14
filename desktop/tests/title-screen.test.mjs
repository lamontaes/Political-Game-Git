/**
 * The title screen follows the owner's standing rulings
 * (docs/coordination/prior-rulings/screens.md items 1 and 5): a full-window
 * national scene or event behind the Kit 13 menu, holding New game,
 * Continue, Options, Patch notes and Quit on the desktop. New game opens Start
 * a life, Custom world (the Oct 13 front's settings) and New world, then the
 * creator.
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

test("the title holds only the menu; New game opens the three choices", () => {
  assert.doesNotMatch(front, /class="sub"/);
  assert.doesNotMatch(front, /id="version"/);
  const main = front.slice(
    front.indexOf('id="front-main"'),
    front.indexOf('id="front-new"'),
  );
  const order = [
    "new-game",
    "continue",
    "title-options",
    "title-patch-notes",
    "title-quit",
  ].map((id) => main.indexOf(`data-testid="${id}"`));
  assert.ok(
    order.every((at) => at > 0),
    "every item is on the menu",
  );
  assert.deepEqual(
    [...order].sort((x, y) => x - y),
    order,
    "in order",
  );
  assert.doesNotMatch(main, /<span>|id="seed"|id="place"|saved-games|watch/i);
  const choice = front.slice(
    front.indexOf('id="front-new"'),
    front.indexOf('id="front-custom"'),
  );
  assert.match(choice, /data-testid="new-game-choice" hidden/);
  for (const id of ["start-life", "custom-world", "new-world", "new-game-back"])
    assert.match(choice, new RegExp(`data-testid="${id}"`));
  const custom = front.slice(
    front.indexOf('id="front-custom"'),
    front.indexOf('id="creator-who"'),
  );
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
    assert.match(custom, new RegExp(`id="${id}"`), `${id} is in Custom world`);
  for (const id of ["cr-given", "cr-family", "cr-age", "cr-month", "cr-day"])
    assert.match(front, new RegExp(`id="${id}"`), `${id} is in the creator`);
  assert.match(front, /id="cr-prev-look"[\s\S]*id="cr-next-look"/);
  assert.match(script, /fetch|api\(at\)/);
  assert.doesNotMatch(script, /drawPeople\(title/);
});
