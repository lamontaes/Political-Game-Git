/**
 * A poll's price is said on the Poll act, where it is bought, and never among
 * the lines that say where the race stands (playtest sitting C13: "Polling 50
 * voters costs $2,250." read as the race's summary).
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { pollPrice, raceStanding } from "./campaign";
import type { CoreState } from "../core2/types";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");

it(`says a poll's price on the Poll act, not in the race's standing (seed ${seed})`, () => {
  const core = { seed } as unknown as CoreState;
  const filing = {
    id: `filing:${seed}`,
    personId: `person:${seed}`,
  } as unknown as Parameters<typeof raceStanding>[1];
  const price = pollPrice(core, filing);
  process.stdout.write(`poll-price: ${price}\n`);
  expect(price).toMatch(/\$\d/);
  expect(raceStanding(core, filing, undefined, [])).not.toContain(price);
});
