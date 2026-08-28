import { makeIsoDate } from "./dates";
import { createScenarioWorld } from "./demo";
import type { DemoJurisdictionContext } from "./demo-jurisdiction-context";
import { createStableId } from "./ids";
import type { World } from "./types";

export const PORTABILITY_FIXTURE_SEED = "synthetic-tidal-basin-portability-v1";
export const PORTABILITY_JURISDICTION_ID = createStableId(
  "jurisdiction",
  "fixture:synthetic-tidal-basin",
);

/**
 * Deliberately fictional test data, not a second gameplay scenario or civic pack.
 * The IANA zone exercises clock context; it implies no real location or law.
 */
export const PORTABILITY_CONTEXT: DemoJurisdictionContext = {
  jurisdiction: {
    id: PORTABILITY_JURISDICTION_ID,
    slug: "synthetic-tidal-basin",
    name: "Synthetic Tidal Basin",
    kind: "synthetic-portability-fixture",
    parentName: "Synthetic Archipelago",
    provenance: {
      asOf: null,
      source: null,
      jurisdiction: PORTABILITY_JURISDICTION_ID,
      status: "placeholder",
    },
  },
  initialMoment: {
    date: makeIsoDate("2026-07-01"),
    minuteOfDay: 23 * 60 + 40,
    timeZone: "Pacific/Honolulu",
    utcOffsetMinutes: -600,
  },
  creationSummary:
    "Seeded portability world created with the fictional Synthetic Tidal Basin fixture; no real civic rules are asserted.",
  goalScope: "Synthetic Tidal Basin portability fixture",
  householdLocationLabel: "Synthetic Tidal Basin test residence",
};

/** Uses the accepted person-v5 / names-v1 defaults without demographic inference. */
export function createPortabilityFixture(
  seedInput = PORTABILITY_FIXTURE_SEED,
): World {
  return createScenarioWorld(seedInput, PORTABILITY_CONTEXT, {
    peopleCount: 8,
  });
}
