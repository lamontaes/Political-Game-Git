import { makeIsoDate } from "./dates";
import { createStableId } from "./ids";
import type { EntityId, Jurisdiction, SimulationMoment } from "./types";

/** Authored scenario inputs, not jurisdiction rules or a persisted hierarchy. */
export interface DemoJurisdictionContext {
  readonly jurisdiction: Jurisdiction;
  readonly initialMoment: SimulationMoment;
  readonly creationSummary: string;
  readonly goalScope: string;
  readonly householdLocationLabel: string;
}

export const DEMO_START_DATE = makeIsoDate("2026-01-05");
export const LEXINGTON_PLACEHOLDER_ID = createStableId(
  "jurisdiction",
  "definition:us-ky-lexington-fayette-placeholder",
);

/** Primary scenario; still a placeholder until sourced snapshots exist. */
export const LEXINGTON_DEMO_CONTEXT: DemoJurisdictionContext = {
  jurisdiction: {
    id: LEXINGTON_PLACEHOLDER_ID,
    slug: "us-ky-lexington-fayette-placeholder",
    name: "Lexington-Fayette, Kentucky",
    kind: "consolidated-city-county-placeholder",
    parentName: "Kentucky",
    provenance: {
      asOf: null,
      source: null,
      jurisdiction: LEXINGTON_PLACEHOLDER_ID,
      status: "placeholder",
    },
  },
  initialMoment: {
    date: DEMO_START_DATE,
    minuteOfDay: 9 * 60 + 10,
    timeZone: "America/New_York",
    utcOffsetMinutes: -300,
  },
  creationSummary:
    "Seeded demonstration world created with a Lexington-Fayette placeholder.",
  goalScope: "Lexington-Fayette placeholder",
  householdLocationLabel: "Synthetic Lexington-area location",
};

const KENTUCKY_JURISDICTION_ID = createStableId(
  "jurisdiction",
  "definition:us-ky-commonwealth-placeholder",
);
const NEBRASKA_JURISDICTION_ID = createStableId(
  "jurisdiction",
  "definition:us-ne-state-placeholder",
);
const ALASKA_JURISDICTION_ID = createStableId(
  "jurisdiction",
  "definition:us-ak-state-placeholder",
);

function stateContext(
  id: EntityId,
  slug: string,
  name: string,
  parentName: string,
  timeZone: string,
  utcOffsetMinutes: number,
): DemoJurisdictionContext {
  return {
    jurisdiction: {
      id,
      slug,
      name,
      kind: "state-placeholder",
      parentName,
      provenance: {
        asOf: null,
        source: null,
        jurisdiction: id,
        status: "placeholder",
      },
    },
    initialMoment: {
      date: makeIsoDate("2026-01-05"),
      minuteOfDay: 9 * 60 + 10,
      timeZone,
      utcOffsetMinutes,
    },
    creationSummary: `Seeded world created with a ${name} placeholder for legislative play.`,
    goalScope: `${name} placeholder`,
    householdLocationLabel: `Synthetic ${name} location`,
  };
}

export const KENTUCKY_CONTEXT = stateContext(
  KENTUCKY_JURISDICTION_ID,
  "us-ky-commonwealth-placeholder",
  "Kentucky",
  "United States",
  "America/New_York",
  -300,
);

export const NEBRASKA_CONTEXT = stateContext(
  NEBRASKA_JURISDICTION_ID,
  "us-ne-state-placeholder",
  "Nebraska",
  "United States",
  "America/Chicago",
  -360,
);

export const ALASKA_CONTEXT = stateContext(
  ALASKA_JURISDICTION_ID,
  "us-ak-state-placeholder",
  "Alaska",
  "United States",
  "America/Anchorage",
  -540,
);
