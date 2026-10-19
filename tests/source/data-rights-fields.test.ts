import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * The legal check (docs/legal/legal-check-2026-10-12.md) found regional data
 * locks with no rights field. Every artifact in these locks records a rights
 * status; "to-check" must say why.
 */
const LOCKS = [
  "acs-county-citizenship/artifact-lock.json",
  "acs-county-housing-commute/regional-artifact-lock.json",
  "acs-household-mix/regional-artifact-lock.json",
  "bls-pay-period/regional-artifact-lock.json",
  "career-occupations/regional-artifact-lock.json",
  "cbsa-delineations/regional-artifact-lock.json",
  "cbsa-delineations/ct-place-county-2023-artifact-lock.json",
  "consumer-expenditure/regional-artifact-lock.json",
  "county-business-patterns/regional-artifact-lock.json",
  "crs-member-pay/artifact-lock.json",
  "economic-census-2022/regional-artifact-lock.json",
  "higher-education-finance/artifact-lock.json",
  "public-employment/regional-artifact-lock.json",
];

describe("data lock rights fields", () => {
  for (const lock of LOCKS) {
    it(`${lock} records rights for every artifact`, () => {
      const { artifacts } = JSON.parse(
        readFileSync(`data/source/${lock}`, "utf8"),
      );
      expect(artifacts.length).toBeGreaterThan(0);
      for (const artifact of artifacts) {
        const rights = artifact.rights;
        expect(rights?.status, artifact.localPath).toBeTruthy();
        if (rights.status === "to-check")
          expect(rights.reason, artifact.localPath).toBeTruthy();
      }
    });
  }
});
