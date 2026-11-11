/** Every share the town and council rules read is a tagged parameter row with a source, and the readers return the row's value. */
import { describe, expect, it } from "vitest";
import data from "./data/shares.json" with { type: "json" };
import {
  modalShare,
  typicalCouncilTables,
} from "./gov-rules/typical-council-size";
import { partTimeShare, shareTable, shareValue } from "./shares";

const TAGS = ["SOURCED", "ESTIMATED", "TUNABLE"];

describe("shares are parameter rows", () => {
  it("each row carries a tag and a source, and tuned or estimated ones a spread", () => {
    for (const [key, row] of Object.entries(data.scalars)) {
      expect(TAGS, key).toContain(row.tag);
      expect(row.source.length, key).toBeGreaterThan(20);
      expect(
        row.spread[0]! <= row.value && row.value <= row.spread[1]!,
        key,
      ).toBe(true);
    }
    for (const [key, table] of Object.entries(data.tables)) {
      expect(TAGS, key).toContain(table.tag);
      expect(table.source.length, key).toBeGreaterThan(20);
    }
    expect(TAGS).toContain(data.townPartTime.tag);
  });

  it("the readers return the rows, and the council tables still give 5 seats and 4-year terms", () => {
    expect(shareValue("sameSexCoupleShare")).toBe(0.015);
    expect(shareValue("evenSplit")).toBe(0.5);
    expect(partTimeShare("restaurant")).toBe(0.45);
    expect(partTimeShare("no-such-workplace")).toBe(
      shareValue("townPartTimeDefault"),
    );
    expect(typicalCouncilTables().seats).toBe(shareTable("councilSize"));
    expect(modalShare(typicalCouncilTables().seats)?.value).toBe(5);
    expect(modalShare(typicalCouncilTables().termYears)?.value).toBe(4);
  });
});
