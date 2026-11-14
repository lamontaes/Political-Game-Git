/**
 * Whether the person won an at-large race, whichever seat's result record the
 * news cites: a council elected at large keeps one record per seat, and the
 * housemate's "I'm sorry about the race" was said to a winner when the cited
 * record was another candidate's seat (New Haven, Vermont replay, Nov 14).
 */
import { expect, it } from "vitest";
import type { CoreState } from "../core2/types";
import { wonRace } from "./conversation";

const day = "2025-03-04";
const head = "election-result:contest:seat:x:1:board:";
const records = new Map<string, unknown>([
  [`${head}0:${day}`, { facts: { winnerId: "someone-else" } }],
  [`${head}1:${day}`, { facts: { winnerId: "me" } }],
  [`${head}2:${day}`, { facts: { winnerId: "another" } }],
]);
const core = { durableLog: records } as unknown as CoreState;

it("a person who won any seat of the race won it, whichever record is cited", () => {
  for (const seat of [0, 1, 2]) {
    expect(wonRace(core, `${head}${seat}:${day}`, "me")).toBe(true);
    expect(wonRace(core, `${head}${seat}:${day}`, "a-loser")).toBe(false);
  }
});

it("a single-seat race is won by its winner only", () => {
  const one = new Map<string, unknown>([
    [
      "election-result:contest:mayor:1:2025-11-04",
      { facts: { winnerId: "me" } },
    ],
  ]);
  const solo = { durableLog: one } as unknown as CoreState;
  expect(
    wonRace(solo, "election-result:contest:mayor:1:2025-11-04", "me"),
  ).toBe(true);
  expect(
    wonRace(solo, "election-result:contest:mayor:1:2025-11-04", "you"),
  ).toBe(false);
});
