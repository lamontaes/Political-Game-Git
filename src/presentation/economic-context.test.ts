import { describe, expect, it } from "vitest";
import { playerEconomicContextLines } from "./economic-context";

describe("player economic context projection", () => {
  it("provides dated, bounded Lexington context on a normal-player seam", () => {
    const lines = playerEconomicContextLines("lexington-fayette");
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
  });

  it("does not invent context for a place with no exact binding", () => {
    expect(playerEconomicContextLines("louisville-ky")).toEqual([]);
  });

  it("returns fresh values so reads cannot mutate the generated source", () => {
    const first = playerEconomicContextLines("lexington-fayette");
    const second = playerEconomicContextLines("lexington-fayette");
    expect(second).toEqual(first);
    expect(second).not.toBe(first);
  });
});
