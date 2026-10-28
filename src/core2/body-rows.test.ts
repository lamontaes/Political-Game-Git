/**
 * One bill engine, the level a row (engine map line 28, E3): a town council,
 * a state legislature and Congress are rows of src/core2/data/offices/bodies.json
 * that the bill and budget engine reads, not code branches by office kind.
 */
import { describe, expect, it } from "vitest";
import bodies from "./data/offices/bodies.json" with { type: "json" };
import { bodyRow, FEDERAL_HOUSE, FEDERAL_SENATE } from "./modules/legislature";

describe("lawmaking bodies are rows", () => {
  it("reads each body's level, legislature and first chamber from its row", () => {
    expect(bodyRow("council")?.level).toBe("city");
    expect(bodyRow("council")?.legislature).toBeUndefined();
    expect(bodyRow("township-board")?.level).toBe("city");
    expect(bodyRow("county-board")?.level).toBe("county");
    expect(bodyRow("legislature-lower")?.level).toBe("state");
    expect(bodyRow("legislature-upper")?.legislature).toBe(
      bodyRow("legislature-lower")?.legislature,
    );
    expect(bodyRow("us-house")?.chamberId).toBe(FEDERAL_HOUSE);
    expect(bodyRow("us-house-delegate")?.level).toBe("federal");
    expect(bodyRow("us-senate")?.chamberId).toBe(FEDERAL_SENATE);
    expect(bodyRow("us-house")?.introducedFirst).toBe(true);
    expect(bodyRow("mayor")).toBeUndefined();
  });

  it("names a veto holder for every level a body sits at", () => {
    for (const row of bodies.bodies)
      expect(
        (bodies.vetoHolder as Record<string, string>)[row.level],
        row.kindPrefix,
      ).toBeTruthy();
  });
});
