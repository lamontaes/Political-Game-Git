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
import { retirementClaimAgeMonths } from "./retirement-claim";
import {
  decisionLean,
  decisionTraitTerm,
  decisionTraitWeight,
  leanedByKinds,
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
  // them. Applying, buying a home and an owner's draw are saturated by their
  // circumstances and wait at the general weight (trait-decision-gaps.json).
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
      expect(odds, `${id} at ${label}`).toBeGreaterThan(
        stepped ? 1.1 : Math.max(1.2, target / BAND),
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

  it("retirement.claim-age: the patient third claims later than the hasty third", () => {
    const core = coreWithPeople(traits);
    const ages = {
      earliestMonths: 744,
      fullMonths: 804,
      delayedMaxMonths: 864,
    };
    const claim = (t: Record<string, number>) =>
      retirementClaimAgeMonths(
        {
          ages,
          bufferMonths: 12,
          patience:
            decisionLean(
              core,
              { traits: t },
              "retirement.claim-age",
              "wait-to-claim",
              "claim-now",
            ) * decisionTraitWeight(core, "retirement.claim-age"),
        },
        {
          anchorYearsBeforeFull: 1,
          traitPullYears: 1,
          needPullYears: 1,
          fullBufferMonths: 12,
        },
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
        months: claim(t),
      }))
      .sort((a, b) => a.lean - b.lean);
    const n = Math.floor(rows.length / 3);
    const mean = (xs: typeof rows) =>
      xs.reduce((s, r) => s + r.months, 0) / xs.length;
    expect(
      mean(rows.slice(rows.length - n)) - mean(rows.slice(0, n)),
      label,
    ).toBeGreaterThan(1);
  });
});
