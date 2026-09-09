import { describe, expect, it } from "vitest";
import { playerEconomicContextLines } from "./economic-context";

describe("player economic context projection", () => {
  it("provides dated, bounded Lexington context on a normal-player seam", () => {
    const lines = playerEconomicContextLines("lexington-fayette", "2026-09-09");
    expect(lines).toHaveLength(3);
    expect(lines.map((line) => line.text)).toEqual([
      expect.stringMatching(/2024.*\$69,065.*not money in your wallet/i),
      expect.stringMatching(
        /July 2026.*4\.7%.*area rate.*not your personal chance/i,
      ),
      expect.stringMatching(
        /FY2025.*\$1,165 per month.*benchmark.*not.*lease/i,
      ),
    ]);
    expect(lines.map((line) => line.providerGeographyCode)).toEqual([
      "21067",
      "ST2100000000000",
      "2106799999",
    ]);
    expect(lines.map((line) => line.sourceReleaseDate)).toEqual([
      null,
      null,
      null,
    ]);
    expect(lines.map((line) => line.sourceObservedBy)).toEqual([
      "2024-12-31",
      "2026-07-31",
      "2025-09-30",
    ]);
  });

  it("does not invent context for a place with no exact binding", () => {
    expect(playerEconomicContextLines("louisville-ky", "2026-09-09")).toEqual(
      [],
    );
  });

  it("does not leak future source observations into an earlier simulation", () => {
    expect(
      playerEconomicContextLines("lexington-fayette", "2024-06-30"),
    ).toEqual([]);

    const afterBeaSnapshot = playerEconomicContextLines(
      "lexington-fayette",
      "2025-01-01",
    );
    expect(afterBeaSnapshot.map((line) => line.sourceProduct)).toEqual([
      "bea-regional",
    ]);
    expect(afterBeaSnapshot[0]?.period).toBe("2024");
  });

  it("returns fresh values so reads cannot mutate the generated source", () => {
    const first = playerEconomicContextLines("lexington-fayette", "2026-09-09");
    const second = playerEconomicContextLines(
      "lexington-fayette",
      "2026-09-09",
    );
    expect(second).toEqual(first);
    expect(second).not.toBe(first);
  });
});
