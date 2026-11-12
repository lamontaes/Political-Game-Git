// @vitest-environment node
// One date, one time (owner, Nov 8): no screen reads the day the page loaded as today. `me.date` is
// the load day and is read only by `today()`, the clock's date, as its fallback before the packet.
import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

it("play.mjs reads the load day only inside today()", () => {
  const lines = readFileSync(new URL("./play.mjs", import.meta.url), "utf8")
    .split("\n")
    .map((text, index) => ({ text, line: index + 1 }))
    .filter(({ text }) => /\bme\.date\b/.test(text) && !/^\s*\/\//.test(text));
  expect(
    lines.filter(({ text }) => !text.startsWith("const today = ")),
    "a screen reads me.date (the load day) as the current date",
  ).toEqual([]);
});
