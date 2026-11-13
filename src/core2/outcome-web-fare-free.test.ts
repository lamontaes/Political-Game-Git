import { describe, expect, it } from "vitest";
import { matrix } from "../../scripts/outcome-web/effect-matrix";

// The fare-free transit link raises ridership, but the added riders pay a zero
// fare and no engine reads transit.ridership, so the matrix lists the link as
// not reaching, under a stopgap that names it and the reason
// (web-fare-free-riders-reach-nothing).
describe("fare-free-transit-to-ridership in the effect matrix", () => {
  const row = matrix().links.find(
    (link) => link.key === "fare-free-transit-to-ridership",
  )!;
  it("is listed as not reaching, with its reason", () => {
    expect(row.points.reaches!.status).toBe("fail");
    expect(row.points.reaches!.why).toMatch(/fare is zero/);
  });
  it("is named by an open stopgap row", () => {
    expect(row.stopgap).toBe("SG-WEB-fare-free-riders-unread");
  });
});
