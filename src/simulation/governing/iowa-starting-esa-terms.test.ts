import { describe, expect, it } from "vitest";
import startingLaw from "../../../data/research/laws/starting-law-2026/index";
import { createWorld } from "../world";
import { makeIsoDate } from "../dates";
import { stateJurisdictionForKey } from "../life-places";
import { lawInForce } from "./law-in-force";
import { readFinalEnactedLawTerm } from "./final-law-term-query";
import { drawRandomPlace } from "../../../tests/support/random-place";
import {
  createNewGameWorld,
  DEFAULT_NEW_GAME_SETUP,
} from "../../presentation/new-game";
import { deserializeWorld, serializeWorld } from "../serialization";
import type { World } from "../types";

const questionKey =
  "us-policy-positions:education.public-funds-for-private-schooling";
const state = stateJurisdictionForKey("US-IA")!;
const row = startingLaw.questions[questionKey].answers["US-IA"];
function award(world: World, date: string) {
  const onDate = makeIsoDate(date);
  const propositionId = world.policyCatalog.propositionOrder.find(
    (id) => world.policyCatalog.propositions[id]!.stableKey === questionKey,
  )!;
  const law = lawInForce(world, state.id, propositionId, onDate)!;
  return {
    law,
    term: readFinalEnactedLawTerm(world, law, {
      questionKey,
      termKey: "award",
      unit: "minor",
      onDate,
    }),
  };
}

describe("sourced Iowa Students First starting award", () => {
  const world = createWorld({
    seed: "iowa-esa-law-term",
    currentDate: makeIsoDate("2026-07-01"),
    jurisdictions: [state],
    people: [],
    lineage: "production",
  });

  it("reads the official same-school-year award in minor units and retains law provenance", () => {
    const { law, term } = award(world, "2026-01-01");
    expect(term?.value).toBe(7_988 * 100);
    expect(term?.unit).toBe("minor");
    expect(law.operativeAt).toBe("2025-07-01");
    expect(term?.sourceRecordIds).toEqual([law.measureId]);
    expect(term?.provisionId).toBeNull();
    expect(row.awardSourceField).toContain("GN2=7988");
    expect(row.note).toContain("per approved pupil");
    expect(row.note).toContain("2025-26 school budget year");
    expect(row.note).toContain("regardless of family income");
    expect(row.eligibilitySourceDate).toBe("2025-04-15");
  });

  it("does not backdate or carry the 2025-26 amount into a different school year", () => {
    expect(award(world, "2025-06-30").law.answer).toBe("yes");
    expect(award(world, "2025-06-30").term).toBeNull();
    expect(award(world, "2025-07-01").term?.value).toBe(798_800);
    expect(award(world, "2026-06-30").term?.value).toBe(798_800);
    expect(award(world, "2026-07-01").law.answer).toBe("yes");
    expect(award(world, "2026-07-01").term).toBeNull();
  });

  it("opens an ordinary game in a random place and preserves the numeric law read on reload", () => {
    const seed = "starting-esa-2025-26:ordinary-opening";
    const place = drawRandomPlace(seed);
    const game = createNewGameWorld({
      ...DEFAULT_NEW_GAME_SETUP,
      seed,
      placeKey: place.key,
    });
    const before = award(game.world, "2026-01-01");
    expect(before.term?.value).toBe(798_800);
    const loaded = deserializeWorld(serializeWorld(game.world));
    expect(award(loaded, "2026-01-01")).toEqual(before);
    expect(loaded.people[game.playerPersonId]).toEqual(
      game.world.people[game.playerPersonId],
    );
    console.info(
      "ESA_NEW_GAME",
      JSON.stringify({
        seed,
        place: place.key,
        awardMinor: before.term?.value,
        reload: true,
      }),
    );
  });
});
