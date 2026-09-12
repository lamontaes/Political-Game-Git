import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { lifePlaceByKey, searchLifePlaces } from "../simulation";
import {
  hometownCountyEquivalentGeoid,
  hometownPopulationFacts,
  PLACE_DEMOGRAPHY_UNMATCHED,
  queryHometownPopulationFacts,
} from "./place-hometown-population";
import { placeStartFacts } from "./place-start-summary";

const ROOT = resolve(import.meta.dirname, "../..");

function localFetchJson(url: string): Promise<unknown> {
  return Promise.resolve(
    JSON.parse(
      readFileSync(resolve(ROOT, "public", url.replace(/^\//, "")), "utf8"),
    ) as unknown,
  );
}

describe("Hometown population is joined only for matching sourced geography", () => {
  it("records unmatched demographic and voter series without showing them", () => {
    expect(PLACE_DEMOGRAPHY_UNMATCHED.map((row) => row.field)).toEqual([
      "demographics",
      "voter",
    ]);
  });

  it("does not print a county headcount as Lexington city population", async () => {
    const lexington = lifePlaceByKey("lexington-fayette")!;
    expect(hometownCountyEquivalentGeoid(lexington)).toBeNull();
    const facts = await queryHometownPopulationFacts(lexington, {
      fetchJson: localFetchJson,
    });
    expect(facts).toEqual([]);
    expect(
      placeStartFacts(lexington).some((row) => row.kind === "population"),
    ).toBe(false);
  });

  it("omits Auburn rather than substituting another geography or writing zero", () => {
    const auburn = searchLifePlaces("Auburn", 8, {
      stateJurisdictionKey: "US-AL",
      scope: "locality",
    }).find((place) => /^Auburn,/i.test(place.displayName))!;
    expect(
      hometownPopulationFacts(auburn).some((row) => /0/.test(row.text)),
    ).toBe(false);
    expect(hometownPopulationFacts(auburn)).toEqual([]);
  });

  it("shows Richmond city's matching BEA persons count with year and geography", async () => {
    const richmond = lifePlaceByKey("5167000")!;
    expect(richmond.displayName).toMatch(/Richmond/i);
    expect(hometownCountyEquivalentGeoid(richmond)).toBe("51760");
    const facts = await queryHometownPopulationFacts(richmond, {
      fetchJson: localFetchJson,
    });
    expect(facts).toHaveLength(1);
    const [population] = facts;
    expect(population?.kind).toBe("population");
    expect(population?.asOf).toBe("2024");
    expect(population?.geography).toMatch(/Richmond/i);
    expect(population?.text).toMatch(/^\d{1,3}(,\d{3})* people$/);
    expect(population?.text).not.toBe("0 people");
    expect(population?.attribution).toMatch(/BEA/i);
  });

  it("withholds a later reference period than the life's start date", async () => {
    const richmond = lifePlaceByKey("5167000")!;
    const facts = await queryHometownPopulationFacts(richmond, {
      fetchJson: async (url) => {
        if (url.endsWith("manifest.json")) {
          return {
            indexes: { bea: { "county:51760": "bea/future.json" } },
          };
        }
        return {
          records: [
            {
              tableName: "CAINC1",
              lineCode: "2",
              geoFips: "51760",
              geoName: "Richmond city, VA",
              geographyLevel: "county",
              year: "2027",
              value: { state: "KNOWN", value: 1 },
            },
          ],
        };
      },
    });
    expect(facts).toEqual([]);
  });

  it("keeps an unknown headcount unknown instead of writing zero", () => {
    const richmond = lifePlaceByKey("5167000")!;
    const facts = hometownPopulationFacts(richmond, {
      observations: [
        {
          kind: "bea",
          detailKey: "CAINC1:2",
          sourceSeriesKey: "bea.cainc1.2",
          period: "2024",
          geography: {
            providerCode: "51760",
            providerName: "Richmond city, VA",
            level: "county",
            relationship: "same-jurisdiction",
          },
          value: { state: "UNKNOWN" },
        },
      ],
    });
    expect(facts).toEqual([]);
  });
});
