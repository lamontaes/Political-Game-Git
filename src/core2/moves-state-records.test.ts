import { expect, it } from "vitest";
import { createLifeCore } from "./life";
import { movesModule, reviewMove } from "./modules/moves";
import {
  coreStateJurisdiction,
  corePlaceByJurisdictionId,
} from "./place-lookup";
import { coreAPI } from "./state";
import { drawPlace } from "../../tests/golden-path/place";
import { generatedOpening } from "./tooling/generated-world";
import type { EntityId } from "./kernel/brands";
import type { PersonInput } from "./types";

// core-moves-state-officials-move-to-same-state: people the world places at a
// state's or the nation's own record (a cabinet seat, a national outlet's
// staff) don't live in a town or county, so the moves engine never reviews
// them: they kept "moving away" to their own place and losing their jobs. A
// town leaver with no relative or county flow goes to their state's record,
// never back to the town they left. A place drawn from all 56.
const drawn = drawPlace("moves-state-records", "core-moves-state-officials");
const seed = process.env.GOLDEN_PATH_SEED ?? drawn.seed;
const key = process.env.GOLDEN_PATH_PLACE_KEY ?? drawn.key;
const input = generatedOpening(
  { seed, key },
  { economy: false, settings: { population: 300 } },
);
const adult = (row: PersonInput) =>
  row.tier !== "husk" && row.birthDate < "2000-01-01";
const alone = input.people.filter(
  (row) =>
    adult(row) &&
    input.households.find((home) => home.id === row.householdId)?.memberIds
      .length === 1,
);
const [official, federal, resident] = alone as [
  PersonInput,
  PersonInput,
  PersonInput,
];
const stateKey = corePlaceByJurisdictionId(
  resident.placeId as EntityId,
)!.stateJurisdictionKey!;
// Two people who live alone, placed at their state's records as an official
// or a national outlet's staff are: the state's key, and its own record.
const moved = new Map<string, string>([
  [official.id, stateKey],
  [federal.id, coreStateJurisdiction(stateKey)!.id],
]);
const core = createLifeCore(
  {
    ...input,
    people: input.people.map((row) =>
      moved.has(row.id) ? { ...row, placeId: moved.get(row.id)! } : row,
    ),
    households: input.households.map((home) => {
      const placeId = moved.get(home.memberIds[0]!);
      return home.memberIds.length === 1 && placeId
        ? { ...home, placeId }
        : home;
    }),
  },
  { modules: [movesModule] },
);
const api = coreAPI(core);

it(`never reviews a move for people at a state's own record (${input.placeMetadata?.placeName}, seed ${seed})`, () => {
  expect(alone.length).toBeGreaterThanOrEqual(3);
  for (const row of [official, federal]) {
    const placeId = moved.get(row.id)!;
    expect(core.people.get(row.id)!.placeId).toBe(placeId);
    expect(reviewMove(api, row.id), placeId).toBeNull();
    expect(
      api.moduleState("moves").table("pulls").get(row.id),
      placeId,
    ).toBeUndefined();
  }
  // A town resident is still reviewed: their pull builds.
  expect(reviewMove(api, resident.id)).toBeNull();
  expect(
    api.moduleState("moves").table("pulls").get(resident.id),
  ).toBeDefined();
});
