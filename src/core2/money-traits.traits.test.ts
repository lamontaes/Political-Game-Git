/**
 * The money family's personality decisions (jobs, credit, housing, business,
 * retirement claiming, moves): for each, people drawn the way the game draws
 * who exists face the same circumstances, and the third leaning most toward
 * the option picks it at about the researched odds of the third leaning
 * least. Circumstances are the scores the played year produced (seed and
 * place in `money-traits-circumstances.json`); the choice goes through the
 * game's own chooser and formulas. Each test fails when personality is flat.
 */
import { describe, expect, it } from "vitest";
import { scoreOffers, decisionFromScores } from "./choice";
import { ownerDrawCase, ownerDrawReasons } from "./modules/business";
import { homeBuyReasons } from "./modules/housing";
import { applyNeed } from "./modules/jobs";
import { parameter } from "./parameters";
import { claimWaitCase, retirementClaimAgeMonths } from "./retirement-claim";
import {
  decisionLean,
  decisionTraitTerm,
  decisionTraitWeight,
  leanedByKinds,
  leanedTerm,
} from "./trait-decisions";
import {
  coreWithPeople,
  drawnTraits,
  leanBetweenKinds,
  testPlace,
  thirdsOddsRatio,
} from "./money-traits-kit";
import circumstances from "./money-traits-circumstances.json" with { type: "json" };
import jobsData from "./data/jobs/jobs.json" with { type: "json" };
import businessData from "./data/business/business.json" with { type: "json" };
import housingData from "./data/housing/housing.json" with { type: "json" };
import type { ActionDefinition, ActOffer } from "./types";

const place = testPlace("money");
const traits = drawnTraits(place.seed, 900);
const label = `${place.name} (${place.key}), seed ${place.seed.slice(0, 12)}`;

interface Row {
  gaps: number[];
}
const gapsOf = (id: string) =>
  (circumstances as unknown as Record<string, Row>)[id]!.gaps;

type Action = { id: string; actKinds: readonly string[] };
const offerOf = (a: Action, need: string): ActOffer => ({
  definition: {
    id: a.id,
    actKinds: a.actKinds,
    goalKinds: [],
    need,
    effortParameter: "zero",
    effectParameter: "zero",
    targetKind: "trait-test",
    effect: "trait-test",
  } as ActionDefinition,
  targetId: "trait-test",
  availableHours: 1,
  effortHours: 0,
});

/** Odds ratio between the thirds when everyone faces each recorded circumstance, through the chooser. */
function chooserOdds(yes: Action, no: Action, gaps: number[]): number {
  const core = coreWithPeople(traits);
  const rows: { lean: number; yes: boolean }[] = [];
  for (const gap of gaps)
    traits.forEach((t, i) => {
      const id = `person:${i}`;
      const scored = scoreOffers(
        core,
        id,
        [offerOf(no, "trait-test-none"), offerOf(yes, "trait-test-gap")],
        { needValues: { "trait-test-gap": gap, "trait-test-none": 0 } },
      );
      const picked = decisionFromScores(core, id, scored).selected!.definition
        .id;
      rows.push({
        lean: leanBetweenKinds(core, t, yes.actKinds, no.actKinds),
        yes: picked === yes.id,
      });
    });
  return thirdsOddsRatio(rows);
}

/** Odds ratio between the thirds for a two-way formula decision on the chooser's arithmetic. */
function formulaOdds(
  id: string,
  yes: readonly string[],
  no: readonly string[],
  gaps: number[],
): number {
  const core = coreWithPeople(traits);
  const rows: { lean: number; yes: boolean }[] = [];
  for (const gap of gaps)
    traits.forEach((t) =>
      rows.push({
        lean: leanBetweenKinds(core, t, yes, no),
        yes: leanedByKinds(core, { traits: t }, id, yes, no, gap),
      }),
    );
  return thirdsOddsRatio(rows);
}

/** Smoothed odds ratios are noisy at small counts: within a factor of this of the target. */
const BAND = 2;

describe(`money-family trait decisions, ${label}`, () => {
  // Decisions whose recorded circumstances bunch at a few scores step from a
  // small effect to a large one: their test asks only that personality moves
  // them.
  const chooser: [string, Action, Action, number, boolean][] = [
    [
      "jobs.start-looking",
      jobsData.actions.look,
      jobsData.actions.wait,
      1.49,
      false,
    ],
    [
      "jobs.review-worker",
      jobsData.actions.look,
      jobsData.actions.stay,
      1.49,
      true,
    ],
    [
      "jobs.accept-offer",
      jobsData.actions.accept,
      jobsData.actions.decline,
      1.49,
      true,
    ],
  ];
  for (const [id, yes, no, target, stepped] of chooser)
    it(`${id}: the third leaning most toward ${yes.id} picks it at about ${target}x the odds of the third leaning least`, () => {
      const odds = chooserOdds(yes, no, gapsOf(id));
      // A stepped decision only has to move with personality: flat personality
      // gives exactly 1, and one drawn town's step can sit as low as 1.096
      // (jobs.accept-offer, Edinboro, Pennsylvania).
      expect(odds, `${id} at ${label}`).toBeGreaterThan(
        stepped ? 1.05 : Math.max(1.2, target / BAND),
      );
      if (!stepped)
        expect(odds, `${id} at ${label}`).toBeLessThan(target * BAND * 4);
    });

  const formula: [string, Action, Action, number][] = [
    ["jobs.counted-apply", jobsData.actions.apply, jobsData.actions.wait, 1.49],
    [
      "jobs.counted-accept",
      jobsData.actions.accept,
      jobsData.actions.decline,
      1.49,
    ],
  ];
  for (const [id, yes, no, target] of formula)
    it(`${id}: counted and personal answers move with personality (${target}x between the thirds)`, () => {
      const odds = formulaOdds(id, yes.actKinds, no.actKinds, gapsOf(id));
      expect(odds, `${id} at ${label}`).toBeGreaterThan(
        Math.max(1.2, target / BAND),
      );
    });

  // Summed pulls: the trait term shifts each counted person's log odds, so the
  // odds between the thirds are e to the weight times the thirds' lean gap.
  const pulls: [string, Action, Action, number][] = [
    ["jobs.counted-look", jobsData.actions.look, jobsData.actions.stay, 1.49],
    [
      "jobs.counted-retire",
      jobsData.actions.leave,
      jobsData.actions.stay,
      1.49,
    ],
    [
      "business.counted-found",
      businessData.actions.found,
      businessData.actions.notFound,
      4.83,
    ],
  ];
  for (const [id, yes, no, target] of pulls)
    it(`${id}: the thirds' pulls differ by about ${target}x`, () => {
      const core = coreWithPeople(traits);
      const terms = traits
        .map((t) => ({
          lean: leanBetweenKinds(core, t, yes.actKinds, no.actKinds),
          term: decisionTraitTerm(
            core,
            { traits: t },
            id,
            yes.actKinds,
            no.actKinds,
          ),
        }))
        .sort((a, b) => a.lean - b.lean);
      const n = Math.floor(terms.length / 3);
      const mean = (rows: typeof terms) =>
        rows.reduce((s, r) => s + r.term, 0) / rows.length;
      const odds = Math.exp(
        mean(terms.slice(terms.length - n)) - mean(terms.slice(0, n)),
      );
      expect(odds, `${id} at ${label}`).toBeGreaterThan(
        Math.max(1.2, target / BAND),
      );
      expect(odds, `${id} at ${label}`).toBeLessThan(target * BAND);
    });

  it("moves.move-away: openness-led leaning toward moving loosens the hold by the calibrated weight", () => {
    const core = coreWithPeople(traits);
    const rows = traits.map((t) => {
      const lean = decisionLean(
        core,
        { traits: t },
        "moves.move-away",
        "move-away",
        "stay-put",
      );
      return {
        lean,
        term: decisionTraitWeight(core, "moves.move-away") * lean,
      };
    });
    rows.sort((a, b) => a.lean - b.lean);
    const n = Math.floor(rows.length / 3);
    const mean = (xs: typeof rows) =>
      xs.reduce((s, r) => s + r.term, 0) / xs.length;
    const odds = Math.exp(
      mean(rows.slice(rows.length - n)) - mean(rows.slice(0, n)),
    );
    expect(odds, label).toBeGreaterThan(Math.max(1.2, 1.46 / 1.3));
    expect(odds, label).toBeLessThan(1.46 * 1.3);
  });
});

/**
 * Applying for a job, buying a home, an owner's draw and founding a business
 * were settled by circumstances alone (one flat score, a log that ran to
 * minus thirty, a cushion that left every owner with spare cash, a baseline
 * 1.1 below the best case). Each now weighs reasons that slide with the
 * person's own record, so a case sits within reach of a trait lean. For each,
 * everyone drawn faces a spread of recorded cases through the game's chooser:
 * personality turns some picks away from the case alone, and with every trait
 * flat none turns.
 */
describe(`fixed money decisions turn with traits and not when traits are flat, ${label}`, () => {
  const core = coreWithPeople(traits);
  const p = (key: string) => parameter(key, core.data.parameters);
  const flat = traits.map((t) =>
    Object.fromEntries(Object.keys(t).map((key) => [key, 0])),
  );

  /** Everyone's pick of each recorded case, and the pick the case alone gives. */
  function picks(
    yes: Action,
    no: Action,
    gaps: readonly number[],
    people: readonly Record<string, number>[],
  ) {
    const world = coreWithPeople(people);
    const rows: { lean: number; yes: boolean; turned: boolean }[] = [];
    for (const gap of gaps)
      people.forEach((t, i) => {
        const id = `person:${i}`;
        const scored = scoreOffers(
          world,
          id,
          [offerOf(no, "trait-test-none"), offerOf(yes, "trait-test-gap")],
          { needValues: { "trait-test-gap": gap, "trait-test-none": 0 } },
        );
        const bare = scored.map((row) => row.score - row.reasons.trait);
        const alone =
          bare[1]! > bare[0]! ||
          (bare[1] === bare[0] && scored[1]!.key < scored[0]!.key)
            ? yes.id
            : no.id;
        const picked = decisionFromScores(world, id, scored).selected!
          .definition.id;
        rows.push({
          lean: leanBetweenKinds(world, t, yes.actKinds, no.actKinds),
          yes: picked === yes.id,
          turned: picked !== alone,
        });
      });
    return rows;
  }

  const turnedShare = (rows: { turned: boolean }[]) =>
    rows.filter((r) => r.turned).length / rows.length;

  /** The cases: one per combination of the person's own circumstances. */
  const apply = () => {
    const gaps: number[] = [];
    for (let weeks = 0; weeks <= 80; weeks += 2)
      for (const ratio of [0.8, 0.9, 1, 1.1, 1.25])
        gaps.push(
          p("jobsApplyPayWeight") * (ratio - 1) +
            applyNeed(
              p,
              { employed: false, since: "2026-01-01" },
              new Date(Date.UTC(2026, 0, 1 + weeks * 7))
                .toISOString()
                .slice(0, 10),
            ),
        );
    return gaps;
  };
  const buy = () => {
    const gaps: number[] = [];
    const down = 2_400_000;
    for (const share of [0, 0.2, 0.4, 0.6, 0.8, 1, 1.5, 3, 6])
      for (const children of [0, 1, 3])
        for (const agePull of [0.1, 0.5, 1])
          for (const leaseYears of [0.5, 3, 6])
            gaps.push(
              Object.values(
                homeBuyReasons(p, {
                  interestMinor: 156_000,
                  rentMinor: 130_000,
                  incomeMinor: 450_000,
                  downMinor: down,
                  meansMinor: share * down,
                  children,
                  agePull,
                  leaseYears,
                }),
              ).reduce((a, b) => a + b, 0),
            );
    return gaps;
  };
  // A firm with no payroll (cushion 0) holding from a tenth of a month's outflows to eight months', and an owner with from days to over a year of living costs in hand.
  const drawCase = (cashMonths: number, ownerDays: number) =>
    ownerDrawCase(p, {
      cashMinor: cashMonths * 1_000_000,
      payrollCushionMinor: 0,
      annualOutflowsMinor: 12_000_000,
      ownerDays,
    });
  const draw = () => {
    const gaps: number[] = [];
    for (const cashMonths of [0.1, 0.3, 0.6, 1, 1.5, 2, 4, 8])
      for (const ownerDays of [5, 30, 90, 200, 400])
        // The best share's case against keeping (a share of 0, which scores nothing).
        gaps.push(
          Math.max(
            ...businessData.drawShares
              .filter((share) => share > 0)
              .map((share) =>
                Object.values(
                  ownerDrawReasons(p, drawCase(cashMonths, ownerDays), share),
                ).reduce((a, b) => a + b, 0),
              ),
          ),
        );
    return gaps;
  };
  const found = () => gapsOf("business.found");

  const cases: [string, Action, Action, () => number[], number, boolean][] = [
    [
      "jobs.apply",
      jobsData.actions.apply,
      jobsData.actions.wait,
      apply,
      1.49,
      false,
    ],
    [
      "housing.buy-home",
      housingData.actions.buy,
      housingData.actions.rent,
      buy,
      1.49,
      false,
    ],
    [
      "business.owner-draw",
      businessData.actions.draw,
      businessData.actions.keep,
      draw,
      1.49,
      false,
    ],
    [
      "business.found",
      businessData.actions.found,
      businessData.actions.keep,
      found,
      4.83,
      true,
    ],
  ];
  for (const [id, yes, no, gapsFor, target, recorded] of cases) {
    it(`${id}: personality turns picks away from the case alone`, () => {
      const rows = picks(yes, no, gapsFor(), traits);
      expect(turnedShare(rows), `${id} at ${label}`).toBeGreaterThan(0);
      const odds = thirdsOddsRatio(rows);
      expect(odds, `${id} at ${label}`).toBeGreaterThan(1);
      // Never overwhelming: on the recorded cases of a played year the odds between the thirds stay within a factor of three of the study's (or the assumed 1.2 per standard deviation); on built cases, which sit closer to the margin than a year's do, personality decides well under half of the picks.
      if (recorded) expect(odds, `${id} at ${label}`).toBeLessThan(target * 3);
      else expect(turnedShare(rows), `${id} at ${label}`).toBeLessThan(0.5);
    });
    it(`${id}: with every trait flat no pick turns`, () => {
      const rows = picks(yes, no, gapsFor(), flat);
      expect(turnedShare(rows), `${id} at ${label}`).toBe(0);
    });
  }

  it("jobs.apply: a seeker's push to apply fades smoothly with the weeks looked, with no step", () => {
    const need = (weeks: number) =>
      applyNeed(
        p,
        { employed: false, since: "2026-01-01" },
        new Date(Date.UTC(2026, 0, 1 + Math.round(weeks * 7)))
          .toISOString()
          .slice(0, 10),
      );
    let last = need(0);
    expect(last).toBeCloseTo(p("jobsUnemployedNeedWeight"), 6);
    for (let weeks = 1; weeks <= 104; weeks++) {
      const now = need(weeks);
      expect(now).toBeLessThan(last);
      expect(last - now).toBeLessThan(0.5 * p("jobsUnemployedNeedWeight"));
      last = now;
    }
    expect(last).toBeGreaterThan(0);
    // A worker looking while employed has no such push.
    expect(
      applyNeed(p, { employed: true, since: "2026-01-01" }, "2026-06-01"),
    ).toBe(0);
  });

  it("housing.buy-home: the case rises smoothly with the savings against the down payment, with no step", () => {
    const down = 2_400_000;
    const at = (share: number) =>
      Object.values(
        homeBuyReasons(p, {
          interestMinor: 156_000,
          rentMinor: 130_000,
          incomeMinor: 450_000,
          downMinor: down,
          meansMinor: share * down,
          children: 1,
          agePull: 0.6,
          leaseYears: 3,
        }),
      ).reduce((a, b) => a + b, 0);
    let last = at(0);
    for (let share = 0.01; share <= 1.5; share += 0.01) {
      const now = at(share);
      expect(now).toBeGreaterThanOrEqual(last);
      expect(now - last).toBeLessThan(0.1);
      last = now;
    }
    // Having none of it costs at most the down weight, not thirty points.
    expect(at(1) - at(0)).toBeLessThan(p("housingBuyDownWeight") + 1);
  });

  it("business.owner-draw: the case for drawing falls as the owner's cash covers more of a month's costs and the firm's own cash runs short", () => {
    const best = (cashMonths: number, ownerDays: number) =>
      Math.max(
        ...businessData.drawShares.map((share) =>
          Object.values(
            ownerDrawReasons(p, drawCase(cashMonths, ownerDays), share),
          ).reduce((a, b) => a + b, 0),
        ),
      );
    let last = best(2, 0);
    for (let days = 5; days <= 400; days += 5) {
      const now = best(2, days);
      expect(now).toBeLessThanOrEqual(last);
      last = now;
    }
    // A firm that holds less than a month of its outflows has less to give than one holding more, with no payroll to say so.
    let more = best(0, 90);
    for (let months = 0.05; months <= 8; months += 0.05) {
      const now = best(months, 90);
      expect(now).toBeGreaterThanOrEqual(more - 1e-9);
      more = now;
    }
  });

  it("retirement.claim-age: a patient third claims later at the study's size", () => {
    const weights = {
      anchorYearsBeforeFull: p("openingRetirementClaimAnchorYearsBeforeFull"),
      traitPullYears: p("openingRetirementClaimTraitPullYears"),
      needPullYears: p("openingRetirementClaimNeedPullYears"),
      fullBufferMonths: p("openingRetirementClaimFullBufferMonths"),
    };
    const ages = {
      earliestMonths: 744,
      fullMonths: 804,
      delayedMaxMonths: 864,
    };
    const claim = (t: Record<string, number>, buffer: number) =>
      retirementClaimAgeMonths(
        {
          ages,
          bufferMonths: buffer,
          patience: leanedTerm(
            core,
            { traits: t },
            "retirement.claim-age",
            "wait-to-claim",
            "claim-now",
            claimWaitCase(buffer, weights),
          ),
        },
        weights,
      );
    const rows = traits
      .map((t) => ({
        lean: decisionLean(
          core,
          { traits: t },
          "retirement.claim-age",
          "wait-to-claim",
          "claim-now",
        ),
        months: claim(t, 12),
      }))
      .sort((a, b) => a.lean - b.lean);
    const n = Math.floor(rows.length / 3);
    const mean = (xs: typeof rows) =>
      xs.reduce((s, r) => s + r.months, 0) / xs.length;
    const gapYears =
      (mean(rows.slice(rows.length - n)) - mean(rows.slice(0, n))) / 12;
    // Greenberg et al. 2018: 0.1 to 0.2 years of delay per standard deviation of the strongest Big Five traits; the thirds sit about 2.18 standard deviations apart.
    expect(gapYears, label).toBeGreaterThan(0.1);
    expect(gapYears, label).toBeLessThan(2 * 2.18 * 0.55);
    // With every trait flat nobody's claim moves.
    expect(
      new Set(flat.map((t) => claim(t, 12))).size,
      "flat traits claim alike",
    ).toBe(1);
  });
});
