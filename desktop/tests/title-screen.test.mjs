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

const front = html.slice(
  html.indexOf('<section id="front"'),
  html.indexOf('id="front-status"', html.indexOf('<section id="front"')),
);

test("the title asks for its scenes", () => {
  assert.match(script, /api\("\/api\/title"\)/);
  assert.match(script, /rotateTitle\(title\.scenes/);
});

test("the title menu and the creator follow the Oct 12 build", () => {
  assert.doesNotMatch(front, /class="sub"/);
  const main = front.slice(
    front.indexOf('id="front-main"'),
    front.indexOf('id="front-new"'),
  );
  const order = [
    "continue",
    "new-game",
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
  assert.doesNotMatch(main, /data-testid="title-version"/);
  assert.doesNotMatch(main, /id="seed"|id="place"/);
  const choice = front.slice(
    front.indexOf('id="front-new"'),
    front.indexOf('id="front-advanced"'),
  );
  for (const id of ["start-life", "advanced"])
    assert.match(choice, new RegExp(`data-testid="${id}"`));
  assert.doesNotMatch(choice, /data-testid="(custom-world|watch-world)"/);
  const advanced = front.slice(
    front.indexOf('id="front-advanced"'),
    front.indexOf('id="front-pick"'),
  );
  for (const id of ["new-world", "advanced-build"])
    assert.match(advanced, new RegExp(`data-testid="${id}"`));
  for (const id of [
    "gender-female",
    "gender-male",
    "gender-nonbinary",
    "creator-random",
    "start-birth-month",
    "start-birth-day",
    "start-birth-year",
    "state-search",
    "state-choices",
    "creator-change-state",
    "place-search",
    "place-choices",
    "creator-bust",
    "engine-appearance-controls",
    "creator-reset-appearance",
    "creator-undo-appearance",
    "begin",
  ])
    assert.match(front, new RegExp(`data-testid="${id}"`), id);
  // Random works before a gender is chosen (owner, Oct 14; one Random button
  // since the creator rework).
  const randomButton = front.slice(
    front.indexOf('id="cr-random"'),
    front.indexOf("</button>", front.indexOf('id="cr-random"')),
  );
  assert.match(randomButton, /data-testid="creator-random"/);
  assert.doesNotMatch(randomButton, /disabled/);
  assert.doesNotMatch(script, /drawPeople\(title|drawPeople\(v\.preview/);
});
