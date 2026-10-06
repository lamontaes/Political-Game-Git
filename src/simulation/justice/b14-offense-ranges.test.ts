import { describe, expect, it } from "vitest";
import type { CourtCase } from "./court-reasoning";
import { sentencingRangeForCase } from "./sentencing-ranges";
import type { EntityId } from "../types";

const b14FederalMaximums = {
  "public-bribery": 180,
  "public-kickback": 120,
  "protected-job-patronage": 120,
  "public-funds-embezzlement": 120,
  "theft-of-public-money": 120,
  "extortion-under-color-of-official-right": 240,
  "honest-services-contract-steering": 240,
  "unreported-official-gift": 24,
} as const;

describe("B14 federal offense range rows", () => {
  it.each(Object.entries(b14FederalMaximums))(
    "%s carries its cited statutory maximum",
    (offenseKey, maxMonths) => {
      const courtCase: CourtCase = {
        caseKey: `fixture:${offenseKey}`,
        defendantId: "fixture-person" as EntityId,
        offenseKey,
        offenseLabel: offenseKey,
        evidence: "documentary",
        standingFindings: 1,
        venueJurisdictionId: null,
        stateKey: null,
      };
      const range = sentencingRangeForCase(courtCase);
      expect(range).toMatchObject({
        minMonths: 0,
        maxMonths,
        basis: "SOURCED",
      });
      expect(range?.citations[0]).toContain("uscode.house.gov");
    },
  );
});
