import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import {
  coarsePlace,
  householdStateOf,
  takeCoarsePerson,
} from "./modules/counted-moves";
import { livesElsewhere } from "./modules/moves";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { coreAPI } from "./state";

// A partner met by someone living elsewhere is one of the people the state's
// counts already hold: the state gives up exactly one in the partner's band,
// so a partnership adds no resident (one model, two tiers).
describe.each(["partner-counts-a", "partner-counts-b"])("(%s)", (salt) => {
  const drawn = drawPlace(salt, "core-every-life-partner-from-counts");
  it(`takes one person from the state's band, and only that band (${drawn.name}, ${drawn.key}, seed ${drawn.seed})`, () => {
    setBookkeeping(false);
    const { core } = buildBenchWorld(drawn.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: drawn.key,
    });
    // The state counts are built on the engine's first month.
    advanceCore(core, addDays(makeIsoDate(core.date), 40));
    const api = coreAPI(core);
    const person = [...core.people.values()].find((row) =>
      livesElsewhere(core, row),
    );
    expect(person, "someone lives elsewhere").toBeTruthy();
    const usps = householdStateOf(core, person!.placeId)!;
    const before = [...coarsePlace(core, usps)!.people];
    expect(takeCoarsePerson(api, person!.placeId, 34)).toBe(true);
    const after = coarsePlace(core, usps)!.people;
    // Age 34 is the third band; the others are untouched.
    expect(before[2]! - after[2]!).toBe(1);
    for (const band of [0, 1, 3, 4]) expect(after[band]).toBe(before[band]);
  });
});
