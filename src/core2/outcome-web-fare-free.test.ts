import { describe, expect, it } from "vitest";
import { matrix } from "../../scripts/outcome-web/effect-matrix";

// The fare-free transit link raises ridership, and the price engine reads it
// household by household: the added riders' trips replace drives, so their
// miles and fuel spending fall (place-prices.ts, `ridersMilesLeft`).
describe("fare-free-transit-to-ridership in the effect matrix", () => {
  const row = matrix().links.find(
    (link) => link.key === "fare-free-transit-to-ridership",
  )!;
  it("is graded as reaching the world", () => {
    expect(row.points.reaches!.status).toBe("pass");
  });
  it("names no open stopgap row", () => {
    expect(row.stopgap).toBeFalsy();
  });
});
