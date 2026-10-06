import { describe, expect, it } from "vitest";

import type { HistoricalEvent } from "../types";
import { crimeJournalLine } from "./journal";
import { CRIME_EVENT_TYPES, CRIME_OFFENSE_TAG_PREFIX } from "./producer";

const arrest = {
  type: CRIME_EVENT_TYPES.arrest,
  jurisdictionId: "jur-ky",
  tags: [`${CRIME_OFFENSE_TAG_PREFIX}burglary`],
  participants: [{ personId: "victim", role: "impact:crime-victim" }],
} as unknown as HistoricalEvent;

describe("crime journal personal-life wording", () => {
  it("keeps the full wording by default and offers two softer renderings", () => {
    expect(crimeJournalLine(arrest, "victim" as never)).toBe(
      "Police in town made an arrest in the break-in at your home.",
    );
    expect(crimeJournalLine(arrest, "victim" as never, "softened")).toBe(
      "Police made an arrest in a case that affected you in town.",
    );
    expect(crimeJournalLine(arrest, "victim" as never, "summary-only")).toBe(
      "A personal matter was recorded.",
    );
    expect(arrest.type).toBe(CRIME_EVENT_TYPES.arrest);
  });
});
