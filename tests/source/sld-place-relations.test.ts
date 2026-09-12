import { describe, expect, it } from "vitest";

import {
  ADAK_PLACE_GEOID,
  LEXINGTON_FAYETTE_PLACE_GEOID,
  normalizeSldPlaceRelations,
  parseSldPlaceRelations,
} from "../../src/source/domains/sld-place-relations/index";
import { SLDL_PLACE_COLUMNS } from "../../src/source/domains/sld-place-relations/parse";

function bytes(text: string): Buffer {
  return Buffer.from(text, "utf-8");
}

describe("sld-place-relations parser and membership rule", () => {
  it("classifies whole-place equality and refuses a split or partial cover", () => {
    const header = SLDL_PLACE_COLUMNS.join("|");
    const parsed = parseSldPlaceRelations(
      bytes(
        [
          header,
          "1|02037|House 37|100|20|G|A|1|0200065|Adak city|80|10|G|C1|A|80|10",
          "2|21076|House 76|50|0|G|A|2|2146027|Lexington-Fayette|40|0|G|C1|A|10|0",
          "3|21077|House 77|50|0|G|A|2|2146027|Lexington-Fayette|40|0|G|C1|A|30|0",
          "4|02005|House 5|90|0|G|A|3|0299999|Partial city|80|0|G|C1|A|40|0",
          "|||||||4|1150000|Washington city|10|0|G|C5|N|10|0",
        ].join("\n"),
      ),
      "state-lower",
    );
    expect(parsed.defects).toEqual([]);
    const normalized = normalizeSldPlaceRelations(
      parsed.rows,
      "state-lower",
      "fixture-sldl",
    );
    expect(normalized.defects).toEqual([]);
    const adak = normalized.records.find(
      (record) => record.placeGeoid === ADAK_PLACE_GEOID,
    );
    const lexington = normalized.records.find(
      (record) => record.placeGeoid === LEXINGTON_FAYETTE_PLACE_GEOID,
    );
    const partial = normalized.records.find(
      (record) => record.placeGeoid === "0299999",
    );
    expect(adak?.membership).toBe("whole-place");
    expect(adak?.districtGeoid).toBe("02037");
    expect(lexington?.membership).toBe("split");
    expect(lexington?.districtGeoid).toBeNull();
    expect(partial?.membership).toBe("split");
    expect(partial?.districtGeoid).toBeNull();
    expect(
      normalized.records.some((record) => record.placeGeoid === "1150000"),
    ).toBe(false);
  });
});
