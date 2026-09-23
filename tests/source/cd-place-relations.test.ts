import { describe, expect, it } from "vitest";

import {
  CD_PLACE_COLUMNS,
  normalizeCdPlaceRelations,
  parseCdPlaceRelations,
} from "../../src/source/domains/cd-place-relations/index";

describe("cd-place-relations parser and membership rule", () => {
  it("assigns only a place listed with exactly one district, never the largest overlap", () => {
    const text = [
      `\uFEFF${CD_PLACE_COLUMNS.join("|")}`,
      // Wholly in one district.
      "1|3202|CD 2|9|0|G|N|1|3222500|Elko city|80|10|G|C1|A|80|10",
      // Split: nearly all land in 17, a sliver in 16. Still split.
      "2|1716|CD 16|9|0|G|N|2|1759000|Peoria city|100|0|G|C1|A|1|0",
      "3|1717|CD 17|9|0|G|N|2|1759000|Peoria city|100|0|G|C1|A|99|0",
      // A second district touching only water still counts as a second match.
      "4|4814|CD 14|9|0|G|N|3|4866392|Seabrook city|50|20|G|C1|A|0|5",
      "5|4836|CD 36|9|0|G|N|3|4866392|Seabrook city|50|20|G|C1|A|50|15",
      // A district remainder outside every place.
      "6|0101|CD 1|9|0|G|N|||||||||9|0",
    ].join("\n");
    const parsed = parseCdPlaceRelations(Buffer.from(text, "utf-8"));
    expect(parsed.defects).toEqual([]);
    const { records, defects } = normalizeCdPlaceRelations(
      parsed.rows,
      "fixture-cd",
    );
    expect(defects).toEqual([]);
    const byPlace = new Map(
      records.map((record) => [record.placeGeoid, record]),
    );
    expect(records).toHaveLength(3);
    expect(byPlace.get("3222500")).toMatchObject({
      membership: "whole-place",
      districtGeoid: "3202",
      intersectingDistrictGeoids: ["3202"],
    });
    expect(byPlace.get("1759000")).toMatchObject({
      membership: "split",
      districtGeoid: null,
      intersectingDistrictGeoids: ["1716", "1717"],
    });
    expect(byPlace.get("4866392")).toMatchObject({
      membership: "split",
      districtGeoid: null,
      intersectingDistrictGeoids: ["4814", "4836"],
    });
  });

  it("refuses a district from another state rather than filing it under the place", () => {
    const parsed = parseCdPlaceRelations(
      Buffer.from(
        [
          CD_PLACE_COLUMNS.join("|"),
          "1|0602|CD 2|9|0|G|N|1|3222500|Elko city|80|10|G|C1|A|80|10",
        ].join("\n"),
        "utf-8",
      ),
    );
    const { records, defects } = normalizeCdPlaceRelations(
      parsed.rows,
      "fixture-cd",
    );
    expect(records).toEqual([]);
    expect(defects[0]?.message).toMatch(/different states/);
  });
});
