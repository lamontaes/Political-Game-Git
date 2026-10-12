import type { CoreInput, Source } from "./types";
export const piecesSource: Source = {
  tag: "SOURCED",
  asOf: "2026-01-01",
  citation:
    "Controlled core-piece contracts; no generated-world outcome claim.",
};
export function piecesInput(): CoreInput {
  return {
    seed: "m0-core-pieces-contract",
    startedAt: "2026-01-01",
    people: [
      {
        id: "actor",
        givenName: "Contract",
        familyName: "Actor",
        birthDate: "1980-01-01",
        placeId: "place",
        householdId: "home",
        tier: "weekly",
        traits: {},
        liquidMinor: 0,
        livingCostDailyMinor: 0,
        familyIds: [],
        knownIds: [],
        source: piecesSource,
      },
    ],
    households: [
      {
        id: "home",
        placeId: "place",
        memberIds: ["actor"],
        source: piecesSource,
      },
    ],
    organizations: [],
    jobs: [],
    focusPersonIds: [],
    focusPlaceIds: [],
    calendarDates: [],
    gaps: [],
  };
}
