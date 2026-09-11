import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { sourceDomain } from "../../src/source/domains/fema-disasters/index";
import { femaResponseContext } from "../../src/source/domains/fema-disasters/response-context";
import type { ArtifactLock } from "../../src/source/core/index";
const lock = () =>
  JSON.parse(
    readFileSync("data/source/fema-disasters/artifact-lock.json", "utf8"),
  ) as ArtifactLock;
describe("incident response accepted FEMA administrative context", () => {
  it("replays the accepted bytes and covers every exact county/state area without inventing damage", () => {
    const compiled = sourceDomain.compileProduction(lock());
    expect(compiled.records).toHaveLength(721);
    expect(sourceDomain.compileProduction(lock())).toEqual(compiled);
    for (const row of compiled.records) {
      if (
        !row.fipsStateCode ||
        (row.derivedDesignatedAreaType !== "county-or-parish" &&
          row.derivedDesignatedAreaType !== "statewide")
      )
        continue;
      const area = {
        stateFips: row.fipsStateCode,
        countyFips:
          row.derivedDesignatedAreaType === "statewide"
            ? null
            : row.fipsCountyCode,
      };
      if (
        row.derivedDesignatedAreaType === "county-or-parish" &&
        !area.countyFips
      )
        continue;
      const view = femaResponseContext(compiled.records, area, "2026-09-09");
      expect(view.some((v) => v.recordId === row.recordId)).toBe(true);
      expect(
        view.find((v) => v.recordId === row.recordId)!.programsDeclared
          .individualHouseholds,
      ).toBe(row.ihProgramDeclared);
      expect(JSON.stringify(view)).not.toContain('"damage"');
    }
    expect(
      femaResponseContext(
        compiled.records,
        { stateFips: "99", countyFips: "999" },
        "2026-09-09",
      ),
    ).toEqual([]);
    expect(
      femaResponseContext(
        compiled.records,
        { stateFips: "21", countyFips: "067" },
        "1900-01-01",
      ),
    ).toEqual([]);
  });
  it("rejects missing and altered locked source evidence", () => {
    const corrupt = lock();
    const first = corrupt.artifacts[0]!;
    const bad = {
      ...corrupt,
      artifacts: [
        { ...first, bytes: { ...first.bytes, sha256: "0".repeat(64) } },
        ...corrupt.artifacts.slice(1),
      ],
    };
    expect(() => sourceDomain.compileProduction(bad as ArtifactLock)).toThrow();
    expect(() =>
      sourceDomain.compileProduction({
        ...corrupt,
        artifacts: [],
      } as unknown as ArtifactLock),
    ).toThrow();
  });
});
