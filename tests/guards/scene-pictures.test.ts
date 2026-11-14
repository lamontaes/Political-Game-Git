/**
 * Every scene has a picture row, and a missing picture never holds work back
 * (owner, Nov 14, 2026; .agents/rules/scene-pictures.md, skill scene-pictures).
 * Fails only on rows that name something that does not exist, a painted place
 * with no category row, and a scene type that is neither grandfathered nor
 * mapped nor listed as wanted. Never fails on a gap that is already listed;
 * `npm run scene-pictures` writes the report and the pictures-wanted list.
 */
import { expect, it } from "vitest";
import { buildReport } from "../../scripts/scene-pictures/report";

it("no picture row names a type, setting or place that does not exist, and every new scene type is mapped", () => {
  const report = buildReport();
  expect(report.dead, report.dead.join("\n")).toEqual([]);
});

it("the report covers every scene type and setting", () => {
  const report = buildReport();
  expect(report.rows.length).toBeGreaterThan(100);
  expect(report.rows.every((row) => row.picture)).toBe(true);
});
