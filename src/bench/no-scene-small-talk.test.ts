/**
 * A scene with no lines of its own does not play, and never hands the player to everyday
 * talk (owner, Nov 8: "this is a terrible scene. And this should have been taken out of the
 * game a long time ago"). The screen's one scene entry (`showStory`) may not open a talk, and
 * the story it is handed names the missing bank instead.
 */
import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

const play = readFileSync(new URL("./play.mjs", import.meta.url), "utf8");

it("showStory never opens an everyday talk, and stops on a missing bank", () => {
  const start = play.indexOf("async function showStory(");
  const end = play.indexOf("\nasync function ", start + 1);
  const body = play.slice(start, end < 0 ? undefined : end);
  expect(start, "showStory is in play.mjs").toBeGreaterThan(-1);
  expect(body, "a scene hands off to everyday talk").not.toMatch(/talkTo\(/);
  expect(body, "a scene opens a conversation").not.toMatch(/\/api\/talk\/open/);
  expect(body, "a missing bank must end the scene before it plays").toMatch(
    /if \(story\.missingBank\)/,
  );
});
