import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";

// A disaster declared in a town with no builder and no recorded outside
// market stopped the game: "No outside market recorded for jurisdiction_b0f9"
// (Guthrie, Oklahoma, seed 35f504a41ec4764f52666b6c5ccd1992aa077e83, drawn
// with the salt "stories-from-engines"). The repairs now wait where there is no
// one to pay, and the year plays through.
const seed = "35f504a41ec4764f52666b6c5ccd1992aa077e83";
const place = drawPlace(seed, "stories-from-engines");

it(`plays a year through a disaster with no one to pay for repairs (${place.name}, seed ${seed})`, () => {
  setBookkeeping(false);
  try {
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const start = core.date;
    advanceCore(core, addDays(makeIsoDate(core.date), 365));
    expect(core.date > start).toBe(true);
    expect(core.cashJournal.totals.grossDebitMinor).toBe(
      core.cashJournal.totals.grossCreditMinor,
    );
  } finally {
    setBookkeeping(true);
  }
}, 1_800_000);
