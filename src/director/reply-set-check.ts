import { expect } from "vitest";
import { P } from "../core2/parameters";
import { DEFAULT_DIRECTOR_DATA } from "./ledger";

/** The most replies a talk offers: the director's own number (data/director.json), named once. */
const MOST = DEFAULT_DIRECTOR_DATA.parameters.directorChoicesPerTurn!.value;

/**
 * A talk offers up to four replies, and the scene sets the count (owner,
 * Nov 10, 2026: "it's also allowed to have less than 4 options sometimes...
 * So just up to 4."). One to four, every one a different answer: no two share
 * a move or say the same text. Fails on none, on more than four, and on two
 * replies that are one answer reworded.
 */
export function expectUpToFourDifferent(
  rows: ReadonlyArray<{ move: string; text: string }>,
  where: string,
): void {
  const texts = rows.map((row) => row.text);
  expect(rows.length, `${where}: ${texts.join(" / ")}`).toBeGreaterThanOrEqual(
    P.one,
  );
  expect(rows.length, `${where}: ${texts.join(" / ")}`).toBeLessThanOrEqual(
    MOST,
  );
  expect(
    new Set(rows.map((row) => row.move)).size,
    `${where}: two replies share a move: ${texts.join(" / ")}`,
  ).toBe(rows.length);
  expect(
    new Set(texts).size,
    `${where}: two replies say the same thing: ${texts.join(" / ")}`,
  ).toBe(rows.length);
}
