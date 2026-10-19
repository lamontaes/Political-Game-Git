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

test("the title menu and the creator follow the Oct 12 build", () => {
  assert.doesNotMatch(front, /class="sub"/);
  const main = front.slice(
    front.indexOf('id="front-main"'),
    front.indexOf('id="front-new"'),
  );
  const order = [
    "new-game",
    "watch-world",
    "continue",
    "open-saves",
    "title-options",
    "title-patch-notes",
    "quit",
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
  assert.match(main, /data-testid="title-version"/);
  assert.doesNotMatch(main, /id="seed"|id="place"/);
  const choice = front.slice(
    front.indexOf('id="front-new"'),
    front.indexOf('id="front-custom"'),
  );
  for (const id of ["custom-world", "start-life", "new-world", "new-game-back"])
    assert.match(choice, new RegExp(`data-testid="${id}"`));
  for (const id of [
    "gender-female",
    "gender-male",
    "gender-nonbinary",
    "creator-randomize-name",
    "start-birth-month",
    "start-birth-day",
    "start-birth-year",
    "creator-randomize-birthday",
    "creator-derived-age",
    "creator-summary-character",
    "state-search",
    "state-choices",
    "creator-change-state",
    "place-search",
    "place-choices",
    "creator-engine-figure",
    "engine-appearance-controls",
    "creator-reset-appearance",
    "creator-undo-appearance",
    "begin",
  ])
    assert.match(front, new RegExp(`data-testid="${id}"`), id);
  // Randomize name works before a gender is chosen (owner, Oct 14).
  assert.doesNotMatch(
    front.slice(
      front.indexOf('id="cr-random-name"'),
      front.indexOf("Randomize name"),
    ),
    /disabled/,
  );
  assert.doesNotMatch(script, /drawPeople\(title|drawPeople\(v\.preview/);
});
