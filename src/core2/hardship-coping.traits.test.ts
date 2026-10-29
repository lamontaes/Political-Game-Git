/**
 * The coping decisions that already run read the stress a hardship left: filing
 * for unemployment (jobs-benefits.file-claim), asking for a loan (credit.borrow)
 * and starting to leave town (moves.move-away). Each reads it as one reason in
 * its case, with a sign (stress pulls toward the coping option), a size that
 * slides with the stress (no step, no roll) and a size from a study
 * (hardshipWeight* in parameters.json, rows `outcome.hardship-coping` in
 * data/research/trait-effect-sizes.json). A missed payment weighs as a change in
 * financial state.
 */
import { describe, expect, it } from "vitest";
import { appraiseEvent } from "./emotion";
import { claimantFeeling, filingDecision } from "./jobs-benefits";
import { coreWithPeople, drawnTraits } from "./money-traits-kit";
import { personalBorrowingDecision } from "./modules/credit";
import { DEFAULT_HEALTH_DATA, severityImpulse } from "./modules/health";
import { pushesOf } from "./modules/moves";
import { coreAPI } from "./state";
import { hardshipReason, hardshipStress } from "./trait-decisions";
import type { CoreState, PersonState } from "./types";

const STRESSES = Array.from({ length: 31 }, (_, i) => i * 0.05);

/**
 * A drawn adult whose stress stands `excess` above the level it returns to,
 * all of it from a hardship (or none of it, with `elsewhere`).
 */
function stressed(
  core: CoreState,
  excess: number,
  elsewhere = false,
): PersonState {
  const api = coreAPI(core);
  const person = core.people.get("person:0")!;
  const rest = { ...person.affect };
  delete rest.hardship;
  api.updatePerson(person.id, {
    affect: {
      ...rest,
      at: core.date,
      stress: person.affect.stressBaseline + excess,
      ...(excess > 0 && !elsewhere ? { hardship: excess } : {}),
    },
  });
  return core.people.get(person.id)!;
}

function world(edit?: (p: Record<string, { value: number }>) => void) {
  return coreWithPeople(drawnTraits("hardship-coping", 12), [], edit);
}

describe("stress a hardship left", () => {
  it("is the stress above rest, and lets go with the half-life", () => {
    const core = world();
    const person = stressed(core, 0.47);
    expect(hardshipStress(core, person)).toBeCloseTo(0.47, 9);
    const half = core.data.parameters.stressHalfLifeDays!.value;
    const later = { data: core.data, date: "2026-10-08" as typeof core.date };
    expect(half).toBe(7);
    expect(hardshipStress(later, person)).toBeCloseTo(0.47 / 2, 9);
    const monthLater = { ...later, date: "2026-11-01" as typeof core.date };
    expect(hardshipStress(monthLater, person)).toBeLessThan(0.47 / 16);
    // Below rest reads nothing (it is not a hardship).
    expect(hardshipStress(core, stressed(core, -0.1))).toBe(0);
    // A person still in the counted population stores no stress and reads none.
    expect(hardshipStress(core, {})).toBe(0);
  });

  it("is only what a hardship raised: the same impulse from a cause shared is not read, and rest eases it", () => {
    const core = world();
    const api = coreAPI(core);
    const person = core.people.get("person:2")!;
    const impulse = severityImpulse(api, DEFAULT_HEALTH_DATA.jobLossSeverity);
    const feel = (kind: string) =>
      appraiseEvent(
        person,
        {
          id: `event:${kind}:test`,
          date: core.date,
          kind,
          personIds: [person.id],
          placeId: person.placeId,
          source: person.source,
          ...impulse,
        },
        0,
        undefined,
        core.data.appraisalTraits,
      ).affect;
    for (const kind of [
      "work.job-lost",
      "housing.eviction",
      "credit.payment-missed",
    ])
      expect(
        hardshipStress(core, { affect: feel(kind) }),
        kind,
      ).toBeGreaterThan(0.2);
    // The same impulse from an event that is not a hardship raises the stress but is not read.
    const other = feel("cause.shared");
    expect(other.stress - other.stressBaseline).toBeGreaterThan(0.2);
    expect(hardshipStress(core, { affect: other })).toBe(0);
    // Hardships add up, and a rest that eases the person's stress eases what is read.
    const twice = appraiseEvent(
      { ...person, affect: feel("work.job-lost") },
      {
        id: "event:housing.eviction:test2",
        date: core.date,
        kind: "housing.eviction",
        personIds: [person.id],
        placeId: person.placeId,
        source: person.source,
        ...severityImpulse(api, DEFAULT_HEALTH_DATA.evictionSeverity),
      },
      0,
      undefined,
      core.data.appraisalTraits,
    ).affect;
    expect(hardshipStress(core, { affect: twice })).toBeGreaterThan(
      hardshipStress(core, { affect: feel("work.job-lost") }),
    );
    const eased = {
      ...twice,
      stress: twice.stressBaseline + 0.1,
    };
    expect(hardshipStress(core, { affect: eased })).toBeCloseTo(0.1, 9);
  });

  it("weighs a missed payment as a change in financial state, by the layoff's Holmes and Rahe rule", () => {
    const core = world();
    const api = coreAPI(core);
    const layoff = severityImpulse(api, DEFAULT_HEALTH_DATA.jobLossSeverity);
    const missed = severityImpulse(
      api,
      DEFAULT_HEALTH_DATA.missedPaymentSeverity,
    );
    expect(missed.stressImpulse).toBeCloseTo(0.38, 9);
    expect(missed.stressImpulse).toBeLessThan(layoff.stressImpulse);
    // And the person's own appraisal scales it the same way (emotion.ts).
    const person = core.people.get("person:3")!;
    const event = (kind: string) => ({
      id: `event:${kind}:test`,
      date: core.date,
      kind,
      personIds: [person.id],
      placeId: person.placeId,
      source: person.source,
      ...missed,
    });
    const appraise = (kind: string) =>
      appraiseEvent(
        person,
        event(kind),
        0,
        undefined,
        core.data.appraisalTraits,
      ).stressImpulse;
    expect(appraise("credit.payment-missed")).toBe(appraise("work.job-lost"));
  });

  it("a counted worker feels the layoff's own appraisal, the same as a full person's stress after it", () => {
    const core = world();
    const api = coreAPI(core);
    const row = core.people.get("person:5")!;
    const lost = {
      id: "event:work.job-lost:test",
      date: core.date,
      kind: "work.job-lost",
      personIds: [row.id],
      placeId: row.placeId,
      source: row.source,
      ...severityImpulse(api, DEFAULT_HEALTH_DATA.jobLossSeverity),
    };
    // The full person: the event reaches them and raises their stress.
    api.updatePerson(row.id, {
      affect: appraiseEvent(row, lost, 0, undefined, core.data.appraisalTraits)
        .affect,
    });
    const full = hardshipStress(core, core.people.get(row.id)!);
    expect(full).toBeGreaterThan(0);
    // The counted worker with the same traits: no stored stress, the appraisal stands for it.
    const counted = claimantFeeling(core, undefined, row, lost);
    expect(hardshipStress(core, counted)).toBeCloseTo(full, 9);
    // With no layoff to appraise (a closure), a counted worker reads none.
    expect(
      hardshipStress(core, claimantFeeling(core, undefined, row, undefined)),
    ).toBe(0);
    // A full person is read as they stand.
    expect(claimantFeeling(core, core.people.get(row.id), row, lost)).toBe(
      core.people.get(row.id),
    );
  });
});

/** The reason grows with the stress at the weight, one smooth line. */
function expectSlides(scores: readonly number[], weight: number): void {
  const step = STRESSES[1]! - STRESSES[0]!;
  for (let i = 1; i < scores.length; i += 1) {
    const rise = scores[i]! - scores[i - 1]!;
    expect(rise).toBeGreaterThan(0);
    expect(rise).toBeCloseTo(weight * step, 9);
  }
}

describe("filing for unemployment", () => {
  /** A benefit replacing the whole lost pay: its log share adds nothing, so these read the stress alone. */
  const WHOLE_PAY = 1;
  /** The smallest stress on the grid at which a worker with this base files. */
  const firstFiling = (base: number) => {
    const core = world((p) => {
      p.benefitsFileBase!.value = base;
    });
    const api = coreAPI(core);
    return STRESSES.find((s) => {
      const person = stressed(core, s);
      return filingDecision(api, person, person, WHOLE_PAY).files;
    });
  };

  it("reads the stress as a reason toward filing that slides", () => {
    const core = world();
    const api = coreAPI(core);
    const weight = api.parameter("hardshipWeightJobsBenefitsFileClaim");
    const scores = STRESSES.map((s) => {
      const person = stressed(core, s);
      const d = filingDecision(api, person, person, WHOLE_PAY);
      return d.baseline + d.hardship.term + d.lean;
    });
    expectSlides(scores, weight);
    // The reason is the stress times the study-sized weight, and nothing at rest.
    const person = stressed(core, 0.4);
    const d = filingDecision(api, person, person, WHOLE_PAY);
    expect(d.hardship.stress).toBeCloseTo(0.4, 9);
    expect(d.hardship.term).toBeCloseTo(0.4 * weight, 9);
    const rest = stressed(core, 0);
    expect(filingDecision(api, rest, rest, WHOLE_PAY).hardship.term).toBe(0);
  });

  it("turns a worker leaning toward skipping at a stress that grows with how far they lean", () => {
    const core = world();
    const api = coreAPI(core);
    const weight = api.parameter("hardshipWeightJobsBenefitsFileClaim");
    // Read at a base of zero, so the lean is the score itself and not rounded off a base.
    const zeroBase = world((p) => {
      p.benefitsFileBase!.value = 0;
    });
    const person = stressed(zeroBase, 0);
    const lean = filingDecision(
      coreAPI(zeroBase),
      person,
      person,
      WHOLE_PAY,
    ).lean;
    // A base that leaves the worker `against` short of filing at no stress.
    const against = [0.12, 0.33, 0.52, 0.71];
    const flips = against.map((d) => firstFiling(-lean - d));
    against.forEach((d, i) => {
      // Files at the first stress whose pull outweighs what is against it.
      expect(flips[i], `against ${d}`).toBe(
        STRESSES.find((s) => s * weight > d),
      );
    });
    for (let i = 1; i < flips.length; i += 1)
      expect(flips[i]!).toBeGreaterThan(flips[i - 1]!);
    // With nothing against, the first stress above rest tips it; at rest it does not.
    expect(firstFiling(-lean)).toBe(STRESSES[1]);
  });

  it("reads the benefit's share of the lost pay as a reason toward filing, the log of the share at its weight", () => {
    const core = world();
    const api = coreAPI(core);
    const weight = api.parameter("benefitsFileReplacementWeight");
    const person = stressed(core, 0);
    const shares = [0.1, 0.25, 0.5, 0.75];
    const reasons = shares.map(
      (share) => filingDecision(api, person, person, share).replacement,
    );
    shares.forEach((share, i) =>
      expect(reasons[i]).toBeCloseTo(weight * Math.log(share), 9),
    );
    for (let i = 1; i < reasons.length; i += 1)
      expect(reasons[i]!).toBeGreaterThan(reasons[i - 1]!);
    // A worker the half-pay benefit just carries over the line skips a benefit capped at a tenth.
    const d = filingDecision(api, person, person, 0.5);
    const atHalf = d.baseline + d.replacement + d.lean;
    const core2 = world((p) => {
      p.benefitsFileBase!.value -= atHalf - 0.01;
    });
    const api2 = coreAPI(core2);
    const worker = stressed(core2, 0);
    expect(filingDecision(api2, worker, worker, 0.5).files).toBe(true);
    expect(filingDecision(api2, worker, worker, 0.1).files).toBe(false);
  });
});

describe("asking for a loan", () => {
  it("reads the stress as a reason toward borrowing that slides and tips a household near the line", () => {
    const core = world();
    const api = coreAPI(core);
    const weight = api.parameter("hardshipWeightCreditBorrow");
    const decide = (s: number, need: number) =>
      personalBorrowingDecision(api, stressed(core, s), need, 0.4);
    expectSlides(
      STRESSES.map((s) => decide(s, 0.6).borrowScore),
      weight,
    );
    const at = decide(0.4, 0.6);
    expect(at.reasons.hardshipStress).toBeCloseTo(0.4 * weight, 9);
    expect(decide(0, 0.6).reasons.hardshipStress).toBe(0);
    // A household whose need leaves it just short of asking tips over with enough stress, once.
    const needs = Array.from({ length: 101 }, (_, i) => i / 100);
    const near = needs.find(
      (n) => !decide(0, n).borrow && decide(1.5, n).borrow,
    );
    expect(near).toBeDefined();
    const flips = STRESSES.map((s) => decide(s, near!).borrow);
    expect(flips.indexOf(true)).toBeGreaterThan(0);
    expect(flips.slice(flips.indexOf(true)).every(Boolean)).toBe(true);
  });
});

describe("starting to leave town", () => {
  it("reads the stress as a push toward leaving that slides with it", () => {
    const core = world();
    const api = coreAPI(core);
    const weight = api.parameter("hardshipWeightMovesMoveAway");
    const push = (s: number) =>
      pushesOf(api, stressed(core, s)).parts.hardshipStress ?? 0;
    expect(push(0)).toBe(0);
    expectSlides(STRESSES.map(push), weight);
    const named = pushesOf(api, stressed(core, 0.4));
    expect(named.reads.hardshipStress).toEqual(["person:0"]);
  });
});

describe("the reason is a read of stress and nothing else", () => {
  it("every coping weight is positive and a decision with no hardship reads none", () => {
    const core = world();
    for (const id of [
      "jobs-benefits.file-claim",
      "credit.borrow",
      "moves.move-away",
    ]) {
      const person = stressed(core, 0);
      expect(hardshipReason(core, person, id)).toEqual({ stress: 0, term: 0 });
      expect(hardshipReason(core, stressed(core, 1), id).term).toBeGreaterThan(
        0,
      );
    }
    expect(() =>
      hardshipReason(core, stressed(core, 1), "news.pass-on"),
    ).toThrow();
  });
});
