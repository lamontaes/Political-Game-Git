/**
 * The bench knows the outside market by its kind (`isOutsideMarket`), the one
 * rule the director uses. `outsideFlow` is also on a public employer that owns
 * its government's pay authority, so a bench read of it made that employer's
 * workers "have a job outside town" on a person card and in the campaign
 * screens. No bench file reads it again.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { expect, it } from "vitest";

const files = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return files(path);
    return /\.(ts|mjs)$/.test(name) && !/\.test\./.test(name) ? [path] : [];
  });

it("no bench file reads outsideFlow to find the outside market", () => {
  const readers = files("src/bench").filter((path) =>
    /outsideFlow/.test(readFileSync(path, "utf8")),
  );
  expect(readers).toEqual([]);
});
