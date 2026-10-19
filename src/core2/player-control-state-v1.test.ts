/** Additive controlled writer/chooser contracts. SOURCE ONLY; all UNEXECUTED. */
import { describe, expect, it } from "vitest";
import { chooseAct } from "./choice";
import { parameter as p } from "./parameters";
import { coreAPI, createCore } from "./state";
import {
  isExplicitlyControlledPersonV1,
  registerControlledPersonV1,
  retireControlledPersonV1,
  snapshotExplicitControlV1,
} from "./player-control-state-v1";
import type { ControlTokenV1 } from "./player-control-state-v1";
import type {
  ActOffer,
  CoreInput,
  CoreState,
  DecisionResult,
  Source,
  WeightedReason,
} from "./types";

const date = "2021-01-01",
  actorId = "controlled:quiet",
  otherId = "controlled:other",
  source: Source = {
    tag: "ESTIMATED",
    asOf: "2020-12-01",
    citation:
      "Controlled actual-writer fixture, not an observed life or normal-world measurement.",
    estimatedFrom:
      "Explicit owning records exercise original choice/trace ownership only.",
  };
function input(): CoreInput {
  return {
    seed: "controlled-trace-contract",
    startedAt: date,
    people: [actorId, otherId].map((id) => ({
      id,
      givenName: "Controlled",
      familyName: id,
      birthDate: "1980-01-01",
      placeId: "place",
      householdId: "home",
      tier: "weekly" as const,
      traits: {},
      liquidMinor: p("zero"),
      livingCostDailyMinor: p("zero"),
      familyIds: [],
      knownIds: [],
      source,
      ...(id === actorId ? { jobId: "owned-job" } : {}),
    })),
    households: [
      { id: "home", placeId: "place", memberIds: [actorId, otherId], source },
    ],
    jobs: [
      {
        id: "owned-job",
        personId: actorId,
        organizationId: "employer",
        title: "Controlled job",
        wageDailyMinor: p("minorPerDollar"),
        hoursDaily: p("one"),
        source,
      },
    ],
    organizations: [
      {
        id: "employer",
        placeId: "place",
        kind: "employer",
        name: "Controlled employer",
        liquidMinor: p("zero"),
        source,
      },
    ],
    focusPersonIds: [],
    focusPlaceIds: [],
    calendarDates: [],
    gaps: [],
  };
}
function fresh(observer = false) {
  return createCore(input(), { observer });
}
function offers(core: CoreState): ActOffer[] {
  const definition = core.data.actions.find((action) => action.id === "rest")!;
  return [otherId, actorId].map((targetId) => ({
    definition,
    targetId,
    availableHours: p("hoursPerDay"),
    reasonBindings: [
      {
        id: "owned-pull",
        provider: "controlled-fixture",
        weightParameter: "one",
        arguments: { owningRecord: "owned-job" },
      },
    ],
  }));
}
function choose(core: CoreState) {
  let calls = p("zero");
  core.reasonProviders.set("controlled-fixture", (_api, _actor, offer) => {
    calls += p("one");
    return {
      value: offer.targetId === actorId ? p("two") : p("one"),
      sourceIds: ["owned-job"],
    };
  });
  const actualOffers = offers(core),
    decision = chooseAct(core, actorId, actualOffers);
  return { decision, actualOffers, calls: () => calls };
}
function saved(core: CoreState, id: string): DecisionResult {
  return core.durableLog.get(id)!.decision as DecisionResult;
}
function boundary(core: CoreState) {
  return structuredClone({
    date: core.date,
    sequence: core.sequence,
    people: core.people,
    households: core.households,
    jobs: core.jobs,
    organizations: core.organizations,
    peopleByPlace: core.peopleByPlace,
    peopleByTier: core.peopleByTier,
    work: core.work,
    finance: core.finance,
    durableLog: core.durableLog,
    logByPerson: core.logByPerson,
    logByKind: core.logByKind,
    logByPlace: core.logByPlace,
    actsByMonthKind: core.actsByMonthKind,
    actCounters: core.actCounters,
    actCountersByMonth: core.actCountersByMonth,
    knowledge: core.knowledgeByPerson,
    pendingCallbacks: core.pendingCallbacks,
    eventIds: core.eventIds,
    cash: {
      accounts: core.cashJournal.accounts,
      journal: core.cashJournal.nextSequence,
      totals: core.cashJournal.totals,
      receipts: core.cashJournal.detailedReceipts,
    },
  });
}

describe("explicit controlled original trace ownership (SOURCE_ONLY, UNEXECUTED)", () => {
  it("owns one exact active identity with factory tokens independent of player, focus and weekly tier", () => {
    const core = fresh(),
      before = boundary(core),
      token = registerControlledPersonV1(core, actorId);
    expect(registerControlledPersonV1(core, actorId)).toBe(token);
    expect(Object.isFrozen(token)).toBe(true);
    expect(isExplicitlyControlledPersonV1(core, actorId)).toBe(true);
    expect(isExplicitlyControlledPersonV1(core, otherId)).toBe(false);
    expect(() => registerControlledPersonV1(core, otherId)).toThrow(
      /active control token/,
    );
    expect(() => retireControlledPersonV1(fresh(), token)).toThrow(
      /factory token/,
    );
    expect(() =>
      retireControlledPersonV1(core, { ...token } as ControlTokenV1),
    ).toThrow(/factory token/);
    expect(core.playerId).toBeUndefined();
    expect(core.focusPersonIds.size).toBe(p("zero"));
    expect(core.people.get(actorId)!.tier).toBe("weekly");
    expect(boundary(core)).toEqual(before);
    retireControlledPersonV1(core, token);
    expect(isExplicitlyControlledPersonV1(core, actorId)).toBe(false);
    expect(() => retireControlledPersonV1(core, token)).toThrow(
      /factory token/,
    );
    const replacement = registerControlledPersonV1(core, otherId);
    expect(replacement).not.toBe(token);
    expect(isExplicitlyControlledPersonV1(core, otherId)).toBe(true);
  });

  it("rejects absent, dead and stale actual household/job/index links without registration writes", () => {
    for (const mode of [
      "absent",
      "dead",
      "household",
      "job",
      "tier-index",
    ] as const) {
      const core = fresh();
      if (mode === "dead") core.people.get(actorId)!.alive = false;
      if (mode === "household")
        core.people.get(actorId)!.householdId = "missing";
      if (mode === "job") core.jobs.get("owned-job")!.personId = otherId;
      if (mode === "tier-index")
        core.peopleByTier.get("weekly")!.delete(actorId);
      const before = boundary(core);
      expect(() =>
        registerControlledPersonV1(
          core,
          mode === "absent" ? "missing" : actorId,
        ),
      ).toThrow();
      expect(isExplicitlyControlledPersonV1(core, actorId)).toBe(false);
      expect(boundary(core)).toEqual(before);
    }
  });

  it("retains both alternatives' original scores and full terms for an explicitly controlled quiet person without extra provider calls", () => {
    const quiet = fresh(),
      original = choose(quiet),
      controlled = fresh();
    registerControlledPersonV1(controlled, actorId);
    const picked = choose(controlled);
    expect(original.decision.scores).toBeUndefined();
    expect(original.decision.selectedReasonTerms).toBeUndefined();
    expect(picked.calls()).toBe(p("two"));
    expect(original.calls()).toBe(p("two"));
    expect(picked.decision.selected).toBe(picked.actualOffers[p("one")]);
    expect(picked.decision.selectedReasons).toEqual(
      original.decision.selectedReasons,
    );
    expect(picked.decision.reasonKey).toBe(original.decision.reasonKey);
    expect(picked.decision.scores?.map((score) => score.targetId)).toEqual([
      otherId,
      actorId,
    ]);
    for (const score of picked.decision.scores!) {
      expect(score.reasonTerms).toHaveLength(p("one"));
      expect(score.reasonTerms![p("zero")]!.sourceIds).toEqual(["owned-job"]);
      expect(score.reasonTerms![p("zero")]!.arguments).toEqual({
        owningRecord: "owned-job",
      });
    }
    expect(controlled.playerId).toBeUndefined();
    expect(controlled.focusPersonIds.size).toBe(p("zero"));
    expect(controlled.people.get(actorId)!.tier).toBe("weekly");
  });

  it("records the complete original controlled decision as a detached nested immutable graph and survives later caller mutation", () => {
    const core = fresh();
    registerControlledPersonV1(core, actorId);
    const chosen = choose(core),
      originalTerm = chosen.decision.selectedReasonTerms![
        p("zero")
      ]! as WeightedReason & { source: Source };
    Object.assign(originalTerm, {
      source: structuredClone(core.jobs.get("owned-job")!.source),
    });
    const original = structuredClone(chosen.decision),
      knowledge = structuredClone(core.knowledgeByPerson),
      beforeJournal = core.cashJournal.nextSequence,
      id = coreAPI(core).recordAct(
        actorId,
        chosen.decision.selected!,
        date,
        chosen.decision,
      ),
      decision = saved(core, id);
    expect(decision).toEqual(original);
    expect(decision).not.toBe(chosen.decision);
    expect(decision.selected).not.toBe(chosen.decision.selected);
    expect(decision.selectedReasons).not.toBe(chosen.decision.selectedReasons);
    expect(Object.isFrozen(decision)).toBe(true);
    expect(Object.isFrozen(decision.selectedReasons)).toBe(true);
    expect(Object.isFrozen(decision.scores)).toBe(true);
    expect(Object.isFrozen(decision.scores![p("zero")])).toBe(true);
    expect(
      Object.isFrozen(decision.selectedReasonTerms![p("zero")]!.arguments),
    ).toBe(true);
    expect(
      Object.isFrozen(decision.selectedReasonTerms![p("zero")]!.sourceIds),
    ).toBe(true);
    expect(decision.selectedReasons).toBe(decision.scores![p("one")]!.reasons);
    const savedTerm = decision.selectedReasonTerms![
      p("zero")
    ]! as WeightedReason & { source: Source };
    expect(savedTerm.source).toEqual(originalTerm.source);
    expect(savedTerm.source).not.toBe(originalTerm.source);
    expect(Object.isFrozen(savedTerm.source)).toBe(true);
    expect(Reflect.set(decision.selectedReasons!, "need", p("two"))).toBe(
      false,
    );
    expect(Reflect.set(decision.scores![p("zero")]!, "score", p("two"))).toBe(
      false,
    );
    expect(
      Reflect.set(
        decision.selectedReasonTerms![p("zero")]!.sourceIds!,
        String(p("zero")),
        "rewritten",
      ),
    ).toBe(false);
    chosen.decision.reasonKey = "caller-rewrite";
    chosen.decision.selectedReasons!.need += p("one");
    chosen.decision.scores![p("zero")]!.score += p("one");
    (chosen.decision.selectedReasonTerms![p("zero")]!.sourceIds as string[])[
      p("zero")
    ] = "caller-source-rewrite";
    (
      chosen.decision.selectedReasonTerms![p("zero")]!.arguments as Record<
        string,
        string
      >
    ).owningRecord = "caller-argument-rewrite";
    chosen.decision.selected!.availableHours = p("zero");
    originalTerm.source.citation = "caller Source citation rewrite";
    expect(saved(core, id)).toEqual(original);
    expect(chosen.calls()).toBe(p("two"));
    expect(core.knowledgeByPerson).toEqual(knowledge);
    expect(core.cashJournal.nextSequence).toBe(beforeJournal);
    expect(core.durableLog.get(id)?.visibility).toBe("circle");
    expect(core.logByPerson.get(actorId)).toContain(id);
    expect(core.focusPersonIds.size).toBe(p("zero"));
    expect(core.playerId).toBeUndefined();
  });

  it("does not trust a caller-frozen root while its original nested reasons and sources remain mutable", () => {
    const core = fresh();
    registerControlledPersonV1(core, actorId);
    const chosen = choose(core);
    Object.freeze(chosen.decision);
    const id = coreAPI(core).recordAct(
        actorId,
        chosen.decision.selected!,
        date,
        chosen.decision,
      ),
      previous = structuredClone(saved(core, id));
    chosen.decision.selectedReasons!.need += p("one");
    (chosen.decision.selectedReasonTerms![p("zero")]!.sourceIds as string[])[
      p("zero")
    ] = "shallow-freeze-rewrite";
    expect(saved(core, id)).toEqual(previous);
    expect(saved(core, id)).not.toBe(chosen.decision);
  });

  it("rejects malformed, getter, executable, cyclic, sparse and nonfinite controlled evidence before act counters or logs change", () => {
    for (const mode of [
      "getter",
      "function",
      "cycle",
      "sparse",
      "nonfinite",
      "malformed-score",
    ] as const) {
      const core = fresh();
      registerControlledPersonV1(core, actorId);
      const chosen = choose(core);
      let getterCalls = p("zero");
      if (mode === "getter")
        Object.defineProperty(chosen.decision, "reasonKey", {
          configurable: true,
          get: () => {
            getterCalls += p("one");
            return "getter-reason";
          },
        });
      if (mode === "function")
        Object.assign(chosen.decision, { executable: () => p("one") });
      if (mode === "cycle")
        Object.assign(chosen.decision, { cycle: chosen.decision });
      if (mode === "sparse")
        Reflect.deleteProperty(chosen.decision.scores!, String(p("zero")));
      if (mode === "nonfinite")
        chosen.decision.scores![p("zero")]!.score = Number.POSITIVE_INFINITY;
      if (mode === "malformed-score")
        chosen.decision.scores![p("zero")]!.actionId = "";
      const before = boundary(core);
      expect(() =>
        coreAPI(core).recordAct(
          actorId,
          chosen.decision.selected!,
          date,
          chosen.decision,
        ),
      ).toThrow();
      expect(getterCalls).toBe(p("zero"));
      expect(boundary(core)).toEqual(before);
      expect(isExplicitlyControlledPersonV1(core, actorId)).toBe(true);
    }
  });

  it("rechecks original reflected Source IDs before any controlled act mutation instead of trusting a transparent Proxy", () => {
    const core = fresh();
    registerControlledPersonV1(core, actorId);
    const chosen = choose(core),
      before = boundary(core);
    let calls = p("zero");
    const offeredDecision = new Proxy(chosen.decision, {
      ownKeys(target) {
        calls += p("one");
        if (calls === p("two"))
          (target.selectedReasonTerms![p("zero")]!.sourceIds as string[])[
            p("zero")
          ] = "late-source-drift";
        return Reflect.ownKeys(target);
      },
    });
    expect(() =>
      coreAPI(core).recordAct(
        actorId,
        chosen.decision.selected!,
        date,
        offeredDecision,
      ),
    ).toThrow();
    expect(calls).toBeGreaterThanOrEqual(p("two"));
    expect(boundary(core)).toEqual(before);
  });

  it("preserves uncontrolled quiet counters and the existing uncontrolled traced record reference semantics", () => {
    const quiet = fresh(),
      chosen = choose(quiet);
    expect(isExplicitlyControlledPersonV1(quiet, actorId)).toBe(false);
    coreAPI(quiet).recordAct(
      actorId,
      chosen.decision.selected!,
      date,
      chosen.decision,
    );
    expect(quiet.people.get(actorId)!.actCount).toBe(p("one"));
    expect(quiet.durableLog.size).toBe(p("zero"));
    expect(chosen.decision.scores).toBeUndefined();
    const traced = fresh(true),
      original = choose(traced),
      id = coreAPI(traced).recordAct(
        actorId,
        original.decision.selected!,
        date,
        original.decision,
      );
    expect(saved(traced, id)).toBe(original.decision);
    original.decision.reasonKey = "existing-uncontrolled-reference-behavior";
    expect(saved(traced, id).reasonKey).toBe(
      "existing-uncontrolled-reference-behavior",
    );
  });
  it("captures exact absent/active factory control identity without exposing token or mutating the core", () => {
    const core = fresh(),
      before = boundary(core),
      absent = snapshotExplicitControlV1(core);
    expect(Object.isFrozen(absent)).toBe(true);
    expect(absent.personId).toBeUndefined();
    expect("token" in absent).toBe(false);
    expect(() => absent.verify()).not.toThrow();
    const token = registerControlledPersonV1(core, actorId),
      active = snapshotExplicitControlV1(core);
    expect(() => absent.verify()).toThrow(/Explicit control changed/);
    expect(Object.isFrozen(active)).toBe(true);
    expect(active.personId).toBe(actorId);
    expect("token" in active).toBe(false);
    expect(Reflect.set(active, "personId", otherId)).toBe(false);
    expect(registerControlledPersonV1(core, actorId)).toBe(token);
    expect(() => active.verify()).not.toThrow();
    expect(isExplicitlyControlledPersonV1(core as object, actorId)).toBe(true);
    expect(boundary(core)).toEqual(before);
    retireControlledPersonV1(core, token);
    expect(() => active.verify()).toThrow(/Explicit control changed/);
    const replacement = registerControlledPersonV1(core, actorId);
    expect(replacement).not.toBe(token);
    expect(() => active.verify()).toThrow(/Explicit control changed/);
    const unrelated = snapshotExplicitControlV1(fresh());
    expect(() => unrelated.verify()).not.toThrow();
    expect(boundary(core)).toEqual(before);
  });
});
