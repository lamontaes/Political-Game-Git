import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { readZipMember } from "../../src/source/core/index";
import { beaTableEditionDate } from "../../src/source/domains/bea-regional/index";
import {
  BEA_EDITION_RELEASE_DATES,
  COUNTY_INCOME_MEMBER,
  MSA_RPP_MEMBER,
  STATE_RPP_MEMBER,
} from "../../src/source/domains/bea-regional/acquisition";
import { FMR_ORIGINAL_NOTICE_DATE } from "../../src/source/domains/hud-housing/acquisition";

/**
 * The release date recorded for each locked economic edition is the one the
 * bytes themselves establish, so a player's in-world date is compared with
 * when the figure was really published, not with when a build downloaded it.
 */

const zip = (table: string) =>
  readFileSync(`data/source/bea-regional/raw/${table}.zip`);

describe("the release dates recorded for the locked economic editions", () => {
  it.each([
    ["CAINC1", COUNTY_INCOME_MEMBER],
    ["SARPP", STATE_RPP_MEMBER],
    ["MARPP", MSA_RPP_MEMBER],
  ] as const)("%s is the edition its own table says it is", (table, member) => {
    expect(beaTableEditionDate(readZipMember(zip(table), member))).toBe(
      BEA_EDITION_RELEASE_DATES[table],
    );
  });

  it("reads no edition from a table with no Last updated line", () => {
    expect(beaTableEditionDate(Buffer.from('"GeoFips","GeoName"\n'))).toBe(
      null,
    );
  });

  it("holds the original FY2025 rents, built before the notice was published", () => {
    const core = readZipMember(
      readFileSync("data/source/hud-housing/raw/FY25_FMRs.xlsx"),
      "docProps/core.xml",
    ).toString("utf-8");
    const created = /<dcterms:created[^>]*>([^<]+)</.exec(core)?.[1] ?? "";
    // HUD's own stamp is space-padded ("2024- 6-28"); normalise before comparing.
    const [year, month, day] = created
      .slice(0, 10)
      .split("-")
      .map((part) => part.trim().padStart(2, "0"));
    expect(`${year}-${month}-${day}`).toBe("2024-06-28");
    // A revised edition would postdate the notice; this one predates it.
    expect(`${year}-${month}-${day}` < FMR_ORIGINAL_NOTICE_DATE).toBe(true);
  });
});
