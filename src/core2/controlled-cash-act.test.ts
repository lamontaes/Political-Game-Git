/** Additive actual-writer control evidence fixtures. SOURCE ONLY; all UNEXECUTED. */
import { describe, expect, it } from "vitest";
import { advanceDate } from "./calendar";
import { chooseAct } from "./choice";
import { parameter as p } from "./parameters";
import { coreAPI, createCore } from "./state";
import { ensureWorkCashModule } from "./work-cash";
import { ensureFinanceCashModule } from "./finance-cash";
import { admitSelectedCashAct } from "./act-cash";
import { FinancePlanningSession } from "./finance-plan";
import { cashJournalParameters } from "./cash-host";
import {
  registerControlledPersonV1,
  retireControlledPersonV1,
} from "./player-control-state-v1";
import type { CoreAPI, CoreState, DecisionResult, Source } from "./types";
const source: Source = {
  tag: "ESTIMATED",
  asOf: "2020-12-01",
  citation:
    "Explicit owned worker/pay fixture; not an observed employer or world result.",
  estimatedFrom:
    "Actual typed fixture records exercise original controlled cash-act evidence.",
};
function fixture(controlled = true) {
  const core = createCore({
      seed: "controlled-cash-original-evidence",
      startedAt: "2021-01-01",
      people: [
        {
          id: "worker",
          givenName: "Controlled",
          familyName: "Worker",
          birthDate: "1980-01-01",
          placeId: "place",
          householdId: "home",
          tier: "weekly",
          traits: {},
          liquidMinor: p("zero"),
          livingCostDailyMinor: p("zero"),
          familyIds: [],
          knownIds: [],
          jobId: "job",
          source,
        },
      ],
      households: [
        { id: "home", placeId: "place", memberIds: ["worker"], source },
      ],
      jobs: [
        {
          id: "job",
          personId: "worker",
          organizationId: "employer",
          title: "Actual fixture job",
          wageDailyMinor: p("minorPerDollar"),
          hoursDaily: p("one"),
          source,
        },
      ],
      organizations: [
        {
          id: "employer",
          placeId: "place",
          name: "Actual finite fixture employer",
          kind: "employer",
          liquidMinor: p("minorPerDollar") * p("two"),
          source,
        },
      ],
      workCommitments: [],
      workPayrollCalendars: [],
      focusPersonIds: [],
      focusPlaceIds: [],
      calendarDates: [],
      gaps: [],
    }),
    api = coreAPI(core);
  ensureWorkCashModule(core);
  ensureFinanceCashModule(core);
  advanceDate(core, "2021-01-02");
  const token = controlled
    ? registerControlledPersonV1(core, "worker")
    : undefined;
  let calls = p("zero");
  core.reasonProviders.set("actual-controlled-job-pull", () => {
    calls += p("one");
    return { value: p("one"), sourceIds: ["job"] };
  });
  const offer = {
      definition: core.data.actions.find((row) => row.id === "work-shift")!,
      targetId: "job",
      availableHours: p("hoursPerDay"),
      effortHours: p("one"),
      reasonBindings: [
        {
          id: "owned-job-pull",
          provider: "actual-controlled-job-pull",
          weightParameter: "one",
          arguments: { owningRecord: "job" },
        },
      ],
    },
    decision = chooseAct(core, "worker", [offer]);
  return { core, api, token, offer, decision, calls: () => calls };
}
function boundary(core: CoreState) {
  return structuredClone({
    people: core.people,
    organizations: core.organizations,
    work: core.work,
    finance: core.finance,
    acts: core.actCounters,
    monthActs: core.actsByMonthKind,
    monthIndex: core.actCountersByMonth,
    logs: core.durableLog,
    byPerson: core.logByPerson,
    byKind: core.logByKind,
    byPlace: core.logByPlace,
    cash: {
      ...core.cashJournal,
      sourceProviders: [...core.cashJournal.sourceProviders.keys()],
    },
  });
}
function pay(f: ReturnType<typeof fixture>) {
  return f.api.settleLegacyWorkResult({
    personId: "worker",
    offer: f.offer,
    date: f.core.date,
    days: p("one"),
    decision: f.decision,
  });
}
describe("controlled original evidence in actual coupled cash acts", () => {
  it("saves the original controlled decision and full terms before payment without re-scoring or focus changes", () => {
    const f = fixture(),
      baseline = fixture(false),
      original = structuredClone(f.decision),
      paid = pay(f),
      ordinary = pay(baseline),
      log = f.core.durableLog.get(paid.sourceActId)!,
      saved = log.decision as DecisionResult;
    expect(paid.paidMinor).toBe(ordinary.paidMinor);
    expect(paid.requestedMinor).toBe(ordinary.requestedMinor);
    expect(f.core.people.get("worker")!.liquidMinor).toBe(p("minorPerDollar"));
    expect(f.core.organizations.get("employer")!.liquidMinor).toBe(
      p("minorPerDollar"),
    );
    expect(saved).toEqual(original);
    expect(saved).not.toBe(f.decision);
    expect(saved.scores).toHaveLength(p("one"));
    expect(saved.selectedReasonTerms![p("zero")]!.sourceIds).toEqual(["job"]);
    expect(Object.isFrozen(saved)).toBe(true);
    expect(Object.isFrozen(saved.selectedReasons)).toBe(true);
    expect(
      Object.isFrozen(saved.selectedReasonTerms![p("zero")]!.sourceIds),
    ).toBe(true);
    expect(f.calls()).toBe(p("one"));
    expect(f.core.people.get("worker")!.actCount).toBe(p("one"));
    expect(f.core.playerId).toBeUndefined();
    expect(f.core.focusPersonIds.size).toBe(p("zero"));
    expect(f.core.people.get("worker")!.tier).toBe("weekly");
    expect(baseline.core.durableLog.size).toBe(p("zero"));
    f.decision.reasonKey = "post-payment-rewrite";
    (f.decision.selectedReasonTerms![p("zero")]!.sourceIds as string[])[
      p("zero")
    ] = "caller-source-rewrite";
    expect(f.core.durableLog.get(paid.sourceActId)!.decision).toEqual(original);
  });
  it("rejects malformed controlled evidence before any actual selection, cash, act or rollup mutation", () => {
    for (const mode of [
      "getter",
      "cycle",
      "sparse-source-ids",
      "nonfinite",
    ] as const) {
      const f = fixture();
      let getterCalls = p("zero");
      if (mode === "getter")
        Object.defineProperty(f.decision, "reasonKey", {
          configurable: true,
          get: () => {
            getterCalls += p("one");
            return "getter-reason";
          },
        });
      if (mode === "cycle") Object.assign(f.decision, { cycle: f.decision });
      if (mode === "sparse-source-ids")
        Reflect.deleteProperty(
          f.decision.selectedReasonTerms![p("zero")]!.sourceIds!,
          String(p("zero")),
        );
      if (mode === "nonfinite")
        f.decision.scores![p("zero")]!.score = Number.POSITIVE_INFINITY;
      const before = boundary(f.core);
      expect(() => pay(f)).toThrow();
      expect(getterCalls).toBe(p("zero"));
      expect(boundary(f.core)).toEqual(before);
    }
  });
  it("rechecks the prepared controlled evidence after original act validation immediately before native selection admission", () => {
    const f = fixture(),
      before = boundary(f.core),
      session = new FinancePlanningSession(
        f.core,
        f.core.cashJournal,
        cashJournalParameters(f.core),
      ),
      api: CoreAPI = {
        ...f.api,
        validateAct(actorId, offer, date, decision) {
          f.api.validateAct(actorId, offer, date, decision);
          retireControlledPersonV1(f.core, f.token!);
        },
      };
    expect(() =>
      admitSelectedCashAct(
        f.core,
        api,
        session,
        "worker",
        f.offer,
        f.core.date,
        f.decision,
        "actual-cash-source",
      ),
    ).toThrow(/control|Controlled/);
    expect(boundary(f.core)).toEqual(before);
    expect(f.core.work.cashActSelections.size).toBe(p("zero"));
  });
  it("preserves the uncontrolled quiet conserving writer without a saved decision or extra evaluation", () => {
    const f = fixture(false),
      paid = pay(f);
    expect(paid.paidMinor).toBe(p("minorPerDollar"));
    expect(paid.shortfallMinor).toBe(p("zero"));
    expect(f.decision.scores).toBeUndefined();
    expect(f.decision.selectedReasonTerms).toBeUndefined();
    expect(f.core.durableLog.size).toBe(p("zero"));
    expect(f.calls()).toBe(p("one"));
    expect(f.core.people.get("worker")!.actCount).toBe(p("one"));
  });
  it("rejects an actual duplicate native selection even when an instance method claims absence", () => {
    const f = fixture(),
      firstSession = new FinancePlanningSession(
        f.core,
        f.core.cashJournal,
        cashJournalParameters(f.core),
      ),
      first = admitSelectedCashAct(
        f.core,
        f.api,
        firstSession,
        "worker",
        f.offer,
        f.core.date,
        f.decision,
        "first-source",
      );
    let hasCalls = p("zero");
    f.core.work.cashActSelections.has = () => {
      hasCalls += p("one");
      return false;
    };
    const before = boundary(f.core),
      secondSession = new FinancePlanningSession(
        f.core,
        f.core.cashJournal,
        cashJournalParameters(f.core),
      );
    expect(() =>
      admitSelectedCashAct(
        f.core,
        f.api,
        secondSession,
        "worker",
        f.offer,
        f.core.date,
        f.decision,
        "second-source",
      ),
    ).toThrow(/Duplicate current cash act selection/);
    expect(hasCalls).toBe(p("zero"));
    expect(f.core.work.cashActSelections.get(first.id)).toBe(first);
    expect(boundary(f.core)).toEqual(before);
  });
});
