import { describe, expect, it } from "vitest";

import { affectAt, appraiseEvent } from "./emotion";
import { P, parameter } from "./parameters";
import type { Affect, CoreEventInput, PersonState, Source } from "./types";

const source: Source = {
  tag: "ESTIMATED",
  citation: "Authored emotion counterfactual fixture, not an empirical actor.",
  asOf: "2026-10-01",
  estimatedFrom:
    "Recorded event input and the central prototype parameter table.",
};

function affect(overrides: Partial<Affect> = {}): Affect {
  return {
    at: "2026-10-01",
    mood: parameter("one"),
    stress: parameter("one"),
    moodBaseline: parameter("moodBaseline"),
    stressBaseline: parameter("stressBaseline"),
    ...overrides,
  };
}

function actor(
  id: string,
  traits: Record<string, number> = {},
): Pick<PersonState, "id" | "traits" | "traitSources" | "source" | "affect"> {
  return { id, traits, source, affect: affect() };
}

function event(overrides: Partial<CoreEventInput> = {}): CoreEventInput {
  return {
    id: "event:household-cost-change",
    date: "2026-10-02",
    kind: "household.cost-changed",
    personIds: ["person:affected", "person:related"],
    placeId: "place:fixture",
    source,
    moodImpulse: parameter("eventMoodImpulse"),
    stressImpulse: parameter("eventStressImpulse"),
    ...overrides,
  };
}

function sameSignals(actual: Affect, expected: Affect): void {
  expect(actual.at).toBe(expected.at);
  expect(actual.mood).toBeCloseTo(
    expected.mood,
    parameter("emotionComparisonDigits"),
  );
  expect(actual.stress).toBeCloseTo(
    expected.stress,
    parameter("emotionComparisonDigits"),
  );
  expect(actual.moodBaseline).toBe(expected.moodBaseline);
  expect(actual.stressBaseline).toBe(expected.stressBaseline);
}

describe("P8 continuous affect", () => {
  it("gives the same signals across equivalent observation partitions", () => {
    for (const middle of ["2026-10-02", "2026-10-04", "2026-10-10"]) {
      const anchor = affect();
      sameSignals(
        affectAt(affectAt(anchor, middle), "2026-10-15"),
        affectAt(anchor, "2026-10-15"),
      );
      expect(anchor.at).toBe("2026-10-01");
    }
  });

  it("keeps continuing pressure after the transient impulse has recovered", () => {
    const anchor = affect({
      mood: parameter("moodBaseline"),
      stress: parameter("stressBaseline"),
    });
    sameSignals(affectAt(anchor, "2027-10-01"), {
      ...anchor,
      at: "2027-10-01",
    });
    const decayed = affectAt(affect(), "2027-10-01");
    expect(decayed.stress).toBeCloseTo(
      parameter("stressBaseline"),
      parameter("emotionComparisonDigits"),
    );
    expect(decayed.stress).toBeGreaterThan(parameter("zero"));
  });

  it("preserves independent mood and stress signs and source links", () => {
    const mixed = event({
      moodImpulse: parameter("one"),
      stressImpulse: parameter("one"),
    });
    const person = actor("person:affected");
    const prior = affectAt(person.affect, mixed.date);
    const result = appraiseEvent(person, mixed, parameter("zero"));
    expect(result.affect.mood).toBeGreaterThan(prior.mood);
    expect(result.affect.stress).toBeGreaterThan(prior.stress);
    expect(result.sourceEventId).toBe(mixed.id);
    expect(result.source).toBe(mixed.source);
    expect(result.modelStopgapId).toBe("SG-P8-emotion-model");
    expect(result.affect.moodBaseline).toBe(prior.moodBaseline);
    expect(result.affect.stressBaseline).toBe(prior.stressBaseline);
  });

  it("responds more to a closer relationship while every other cause is held fixed", () => {
    const loss = event();
    for (const id of ["person:affected", "person:related", "person:another"]) {
      const person = actor(id);
      const distant = appraiseEvent(person, loss, parameter("zero"));
      const close = appraiseEvent(person, loss, parameter("one"));
      expect(close.moodImpulse).toBeLessThan(distant.moodImpulse);
      expect(close.stressImpulse).toBeGreaterThan(distant.stressImpulse);
      expect(close.actorId).toBe(id);
    }
  });

  it("uses only present traits and does not invent a low pole for a one-sided facet", () => {
    const loss = event();
    const absent = appraiseEvent(
      actor("person:absent"),
      loss,
      parameter("one"),
    );
    const concerned = appraiseEvent(
      actor("person:concerned", {
        "personality-v1:concern-for-distress": parameter("traitScale"),
      }),
      loss,
      parameter("one"),
    );
    const brooding = appraiseEvent(
      actor("person:brooding", {
        "personality-v1:facet-brooding": parameter("traitScale"),
      }),
      loss,
      parameter("one"),
    );
    const unsupportedLowPole = appraiseEvent(
      actor("person:low-facet", {
        "personality-v1:facet-brooding":
          parameter("negativeOne") * parameter("traitScale"),
      }),
      loss,
      parameter("one"),
    );
    expect(absent.traitContributions).toEqual([]);
    expect(concerned.stressImpulse).toBeGreaterThan(absent.stressImpulse);
    expect(brooding.stressImpulse).toBeGreaterThan(absent.stressImpulse);
    expect(unsupportedLowPole.stressImpulse).toBe(absent.stressImpulse);
    for (const row of concerned.traitContributions)
      expect(row.source).toBe(source);
  });

  it("changes appraisal smoothly through intermediate relationship and trait values", () => {
    const person = actor("person:affected");
    const loss = event();
    const low = appraiseEvent(person, loss, parameter("zero"));
    const middle = appraiseEvent(
      person,
      loss,
      parameter("one") / parameter("two"),
    );
    const high = appraiseEvent(person, loss, parameter("one"));
    expect(middle.stressImpulse).toBeCloseTo(
      (low.stressImpulse + high.stressImpulse) / parameter("two"),
      parameter("emotionComparisonDigits"),
    );
    const fullConcern = appraiseEvent(
      actor("person:full-concern", {
        "personality-v1:concern-for-distress": parameter("traitScale"),
      }),
      loss,
      parameter("zero"),
    );
    const partialConcern = appraiseEvent(
      actor("person:partial-concern", {
        "personality-v1:concern-for-distress":
          parameter("traitScale") / parameter("two"),
      }),
      loss,
      parameter("zero"),
    );
    expect(partialConcern.stressImpulse).toBeCloseTo(
      (low.stressImpulse + fullConcern.stressImpulse) / parameter("two"),
      parameter("emotionComparisonDigits"),
    );
  });

  it("uses the supplied world's numeric registry for recovery and appraisal", () => {
    const custom = {
      ...P,
      moodHalfLifeDays: parameter("one"),
      stressHalfLifeDays: parameter("one"),
      appraisalRelationshipWeight: parameter("zero"),
      appraisalDistressTraitWeight: parameter("zero"),
      appraisalBroodingTraitWeight: parameter("zero"),
    };
    const anchor = affect();
    const next = affectAt(anchor, "2026-10-02", custom);
    expect(next.mood - next.moodBaseline).toBeCloseTo(
      (anchor.mood - anchor.moodBaseline) / parameter("two"),
      parameter("emotionComparisonDigits"),
    );
    expect(next.stress - next.stressBaseline).toBeCloseTo(
      (anchor.stress - anchor.stressBaseline) / parameter("two"),
      parameter("emotionComparisonDigits"),
    );
    const loss = event();
    const result = appraiseEvent(
      actor("person:custom", {
        "personality-v1:concern-for-distress": parameter("traitScale"),
        "personality-v1:facet-brooding": parameter("traitScale"),
      }),
      loss,
      parameter("one"),
      custom,
    );
    expect(result.moodImpulse).toBe(loss.moodImpulse);
    expect(result.stressImpulse).toBe(loss.stressImpulse);
  });

  it("accepts a new appraisal trait from data and retains its individual source", () => {
    const traitId = "mod-example:distress-attunement";
    const traitSource: Source = {
      tag: "SOURCED",
      citation: "Counterfactual individually recorded trait fixture.",
      asOf: source.asOf,
    };
    const person = {
      ...actor("person:modded", { [traitId]: parameter("traitScale") }),
      traitSources: { [traitId]: traitSource },
    };
    const loss = event();
    const baseline = appraiseEvent(person, loss, parameter("zero"), P, []);
    const modded = appraiseEvent(person, loss, parameter("zero"), P, [
      {
        traitId,
        weightParameter: "appraisalDistressTraitWeight",
        oneSided: false,
        stopgapId: "SG-P8-emotion-model",
      },
    ]);
    expect(modded.stressImpulse).toBeGreaterThan(baseline.stressImpulse);
    expect(modded.traitContributions.map((row) => row.traitId)).toEqual([
      traitId,
    ]);
    expect(modded.traitContributions.map((row) => row.source)).toEqual([
      traitSource,
    ]);
  });

  it("rejects duplicate appraisal data rather than multiplying the same trait twice", () => {
    const row = {
      traitId: "mod-example:distress-attunement",
      weightParameter: "appraisalDistressTraitWeight",
      oneSided: false,
    };
    const person = actor("person:modded", {
      [row.traitId]: parameter("traitScale"),
    });
    expect(() =>
      appraiseEvent(person, event(), parameter("one"), P, [row, row]),
    ).toThrow(/Duplicate appraisal trait/);
  });

  it("does not assign an impact to an event without one", () => {
    const notice = event({ moodImpulse: undefined, stressImpulse: undefined });
    const person = actor("person:notice-recipient", {
      "personality-v1:facet-brooding": parameter("traitScale"),
    });
    const result = appraiseEvent(person, notice, parameter("one"));
    sameSignals(result.affect, affectAt(person.affect, notice.date));
    expect(result.moodImpulse).toBe(parameter("zero"));
    expect(result.stressImpulse).toBe(parameter("zero"));
  });

  it("applies impulses at the event date regardless of prior observation frequency", () => {
    const loss = event({ date: "2026-10-10" });
    const original = actor("person:affected");
    const observed = {
      ...original,
      affect: affectAt(original.affect, "2026-10-04"),
    };
    const direct = appraiseEvent(original, loss, parameter("one"));
    const partitioned = appraiseEvent(observed, loss, parameter("one"));
    sameSignals(
      affectAt(partitioned.affect, "2026-10-15"),
      affectAt(direct.affect, "2026-10-15"),
    );
    expect(original.affect.at).toBe("2026-10-01");
  });

  it("rejects non-finite records, normalized impossible dates, and reversed chronology", () => {
    expect(() => affectAt(affect(), "2026-09-30")).toThrow(/before/);
    expect(() => affectAt(affect(), "2026-02-31")).toThrow(/date-only/);
    expect(() => affectAt(affect({ mood: Number.NaN }), "2026-10-02")).toThrow(
      /Non-finite/,
    );
    expect(() =>
      appraiseEvent(
        actor("person:affected"),
        event(),
        Number.POSITIVE_INFINITY,
      ),
    ).toThrow(/Non-finite/);
  });
});
