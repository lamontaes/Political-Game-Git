import { makeIsoDate } from "./dates";
import { createStableId } from "./ids";
import type { Jurisdiction, SimulationMoment } from "./types";

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
