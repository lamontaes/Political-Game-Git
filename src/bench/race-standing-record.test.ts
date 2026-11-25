/**
 * Where a race stands says only what the record holds (playtest sitting C13
 * and P34). A poll's price is said on the Poll act, where it is bought, and
 * never among the standing lines ("Polling 50 voters costs $2,250." read as
 * the race's summary). The line that no one has heard from the candidate
 * shows only while the voting engine's record says no voter has heard of
 * them; a player people in town know is not said to be unknown.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { pollPrice, raceStanding } from "./campaign";
import type { CoreState } from "../core2/types";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const core = { seed } as unknown as CoreState;
const filing = {
  id: `filing:${seed}`,
  personId: `person:${seed}`,
} as unknown as Parameters<typeof raceStanding>[1];
const race = {
  office: "a seat on the council",
  when: { general: "November 4" },
  recordIds: [`contest:${seed}`],
} as unknown as Parameters<typeof raceStanding>[4];

it(`says a poll's price on the Poll act, not in the race's standing (seed ${seed})`, () => {
  const price = pollPrice(core, filing);
  process.stdout.write(`race-standing: ${price}\n`);
  expect(price).toMatch(/\$\d/);
  expect(raceStanding(core, filing, undefined, [], race)).not.toContain(price);
});

it(`says no one has heard from the candidate only while no voter has (seed ${seed})`, () => {
  const unknown = raceStanding(core, filing, undefined, [], race, 0);
  const known = raceStanding(core, filing, undefined, [], race, 3);
  process.stdout.write(
    `race-standing: unknown ${JSON.stringify(unknown)}; known ${JSON.stringify(known)}\n`,
  );
  expect(unknown.some((said) => /heard from you/.test(said))).toBe(true);
  expect(known.some((said) => /heard from you/.test(said))).toBe(false);
});
