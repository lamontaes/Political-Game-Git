/**
 * A worker's yearly raise within their job: the return to tenure, on a
 * profile that flattens with the years (sized from the tenure-wage
 * literature), plus how their employer reads their work (`howTheyWork`,
 * through the shared `jobs.value-worker` row) times the merit spread. Both
 * slide with their inputs; people drawn the way the game draws who exists
 * show that opposite temperaments at the same tenure get different raises.
 */
import { describe, expect, it } from "vitest";
import { howTheyWork, withinJobRaise } from "./modules/jobs";
import { coreWithPeople, drawnTraits } from "./money-traits-kit";
import { coreAPI } from "./state";

const core = coreWithPeople(drawnTraits("pay-growth", 300));
const api = coreAPI(core);
const p = (key: string) => api.parameter(key);
const raise = (tenureYears: number, workYears = 0, sinceYears = 1) =>
  withinJobRaise(p, { tenureYears, sinceYears, workYears });

describe("a worker's raise within their job", () => {
  it("slides down with tenure, never stepping, to the researched ten-year return", () => {
    const yearly = Array.from({ length: 20 }, (_, i) => raise(i + 1).tenure);
    for (const [i, value] of yearly.entries()) {
      expect(value, `year ${i + 1}`).toBeGreaterThan(0);
      if (i) expect(value, `year ${i + 1}`).toBeLessThan(yearly[i - 1]!);
    }
    // Ten yearly raises add up to the reconciled ten-year return to tenure,
    // 0.11 log points (Altonji and Williams 2005).
    const tenYears = yearly.slice(0, 10).reduce((sum, value) => sum + value, 0);
    expect(tenYears).toBeCloseTo(0.11, 2);
    // A raise after half a year carries about half a year's return, and
    // splitting a year into two raises gives the same total.
    const half = raise(1, 0, 0.5).tenure + raise(0.5, 0, 0.5).tenure;
    expect(half).toBeCloseTo(raise(1).tenure, 12);
    expect(raise(1, 0, 0.5).tenure).toBeLessThan(raise(1).tenure);
    // A tenure shorter than the time since the last raise counts only the time held.
    expect(raise(0.4, 0, 1).tenure).toBeCloseTo(raise(0.4, 0, 0.4).tenure, 12);
  });

  it("slides with how the employer reads their work, for the time since the last raise", () => {
    const scores = [-2, -1, -0.25, 0, 0.25, 1, 2];
    const work = scores.map((score) => raise(3, score).work);
    expect(raise(3, 0).work).toBe(0);
    for (let i = 1; i < work.length; i++)
      expect(work[i]!).toBeGreaterThan(work[i - 1]!);
    // Proportional to the read and to the time it covers.
    expect(raise(3, 2).work).toBeCloseTo(2 * raise(3, 1).work, 12);
    expect(raise(3, 1, 0.5).work).toBeCloseTo(raise(3, 1).work / 2, 12);
    // The tenure part does not read temperament.
    expect(raise(3, 2).tenure).toBe(raise(3, -2).tenure);
  });

  it("gives opposite temperaments at the same tenure different raises", () => {
    const read = [...core.people.keys()]
      .map((id) => ({ id, work: howTheyWork(api, id) }))
      .sort((a, b) => a.work - b.work || a.id.localeCompare(b.id));
    const slack = read[0]!,
      diligent = read[read.length - 1]!;
    expect(diligent.work).toBeGreaterThan(0);
    expect(slack.work).toBeLessThan(0);
    const of = (work: number) => {
      const parts = raise(2, work);
      return parts.tenure + parts.work;
    };
    expect(of(diligent.work)).toBeGreaterThan(of(slack.work));
    // A year's gap, in points of pay, near the researched size: about 0.2
    // point a year per deviation of conscientiousness.
    const gapPoints = (of(diligent.work) - of(slack.work)) * 100;
    console.log(
      `most diligent ${diligent.id} (how they work ${diligent.work.toFixed(3)} years) ` +
        `against least ${slack.id} (${slack.work.toFixed(3)}): a raise ${gapPoints.toFixed(2)} points apart at two years' tenure`,
    );
    expect(gapPoints).toBeGreaterThan(0.2);
    expect(gapPoints).toBeLessThan(3);
  });
});
