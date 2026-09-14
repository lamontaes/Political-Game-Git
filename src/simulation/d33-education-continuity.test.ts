import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createDemoWorld,
  createWorld,
  createResourcePosition,
  money,
  serializeWorld,
  deserializeWorld,
  createResourceFlow,
  recordResourceTransferOutcome,
  createOrganization,
  createEducationEnrollment,
  advanceWorld,
  educationEnrollmentStateAt,
  futureDueItemStateAt,
  addDays,
} from "./index";
import {
  enterLifePath,
  pathForRelationship,
  settleStudyTuition,
  changeLifePathStatus,
  LIFE_PATHS2_HANDLERS,
} from "./life-paths2";
import * as catalog from "./life-paths2-catalog";
import {
  acceptedEducationTerms,
  parseEducationTerms,
  recordAcceptedEducationTerms,
  EDUCATION_TERMS_V2_KIND,
} from "./education-study-terms";
import {
  paidStudyPeriods,
  studyTuitionStatus,
  completedStudyPeriods,
  educationStudyPeriodDueHandler,
  routineWeeklyLoad,
} from "./education-study-progression";
import { resourcePositionAt } from "./resource-queries";
import { passOrdinaryDays } from "../presentation/ordinary-life";

const provenance = {
  kind: "authored" as const,
  note: "D33 explicit synthetic study fixture.",
};
function fixture(balance = 5_000_000) {
  const demo = createDemoWorld("d33-education-continuity");
  const world = createWorld({
    seed: demo.seed,
    currentDate: demo.currentDate,
    jurisdictions: demo.jurisdictionOrder.map((id) => demo.jurisdictions[id]!),
    people: demo.personOrder.map((id) => demo.people[id]!),
    control: { kind: "person", personId: demo.personOrder[0]! },
  });
  return createResourcePosition(world, {
    stableKey: "d33:funds",
    owner: { kind: "person", personId: world.personOrder[0]! },
    openedAt: world.currentDate,
    openingBalance: money(balance, "USD"),
    provenance,
  });
}
afterEach(() => vi.restoreAllMocks());
describe("D33 accepted study continuity", () => {
  it("refuses invalid/unrepresentable grace and unauthorized funding without creating accounts or history", () => {
    const w = fixture();
    for (const tuitionGraceDays of [-1, 0.5, NaN, Number.MAX_SAFE_INTEGER])
      expect(
        enterLifePath(w, "college-bachelors", { tuitionGraceDays }).world,
      ).toBe(w);
    const enrolled = enterLifePath(fixture(0), "college-bachelors", {
      tuitionGraceDays: 0,
    }).world;
    const id = enrolled.history.educationEnrollments.at(-1)!.id;
    const due = advanceWorld(enrolled, 182, LIFE_PATHS2_HANDLERS);
    expect(
      studyTuitionStatus(due, id, pathForRelationship(due, id)!)?.paused,
    ).toBe(true);
    expect(
      due.history.futureDueItems.filter((d) =>
        d.stableKey.startsWith("life-paths2.study-grace-deadline:"),
      ),
    ).toHaveLength(0);
    const other = {
      ...due,
      control: { kind: "person" as const, personId: due.personOrder[1]! },
    };
    const saved = serializeWorld(other);
    expect(settleStudyTuition(other, id).world).toBe(other);
    expect(serializeWorld(other)).toBe(saved);
  });
  it("does not reset an unfunded grace deadline by interrupting and returning", () => {
    let w = enterLifePath(fixture(0), "college-bachelors").world;
    const id = w.history.educationEnrollments.at(-1)!.id;
    w = advanceWorld(w, 182, LIFE_PATHS2_HANDLERS);
    const deadline = studyTuitionStatus(
      w,
      id,
      pathForRelationship(w, id)!,
    )!.deadline!;
    w = changeLifePathStatus(w, id, "pause").world;
    w = advanceWorld(w, 40, LIFE_PATHS2_HANDLERS);
    w = changeLifePathStatus(
      deserializeWorld(serializeWorld(w)),
      id,
      "return",
    ).world;
    w = advanceWorld(w, 1, LIFE_PATHS2_HANDLERS);
    expect(w.currentDate > deadline).toBe(true);
    expect(studyTuitionStatus(w, id, pathForRelationship(w, id)!)?.paused).toBe(
      true,
    );
    expect(
      w.history.futureDueItems.filter((d) =>
        d.stableKey.startsWith("life-paths2.study-grace-deadline:"),
      ),
    ).toHaveLength(1);
  });
  it("sums accepted active study with canonical work load read-only, and releases study load on interruption", () => {
    let w = enterLifePath(
      enterLifePath(fixture(), "shop-assistant").world,
      "college-bachelors",
    ).world;
    const id = w.history.educationEnrollments.at(-1)!.id;
    const snapshot = serializeWorld(w);
    const load = routineWeeklyLoad(w, w.personOrder[0]!);
    const study = pathForRelationship(w, id)!.timeDemand.expectedWeekly;
    expect(load.commitments).toBe(2);
    expect(serializeWorld(w)).toBe(snapshot);
    w = changeLifePathStatus(w, id, "pause").world;
    const paused = routineWeeklyLoad(w, w.personOrder[0]!);
    expect(paused.minimumHours).toBe(load.minimumHours - study.minimumHours);
    expect(paused.maximumHours).toBe(load.maximumHours - study.maximumHours);
    expect(paused.commitments).toBe(1);
  });
  it("warns for the accepted 30 days then pauses only study, once across reload, while ordinary work and pay continue", () => {
    let w = enterLifePath(fixture(0), "college-bachelors").world;
    const enrollment = w.history.educationEnrollments.at(-1)!,
      path = pathForRelationship(w, enrollment.id)!;
    w = advanceWorld(w, 182, LIFE_PATHS2_HANDLERS);
    const blocked = w.currentDate;
    expect(studyTuitionStatus(w, enrollment.id, path)).toMatchObject({
      deadline: addDays(blocked, 30),
      paused: false,
      amountMinor: 500_000,
    });
    expect(paidStudyPeriods(w, enrollment.id)).toBe(0);
    const refused = settleStudyTuition(w, enrollment.id);
    expect(refused.ok).toBe(false);
    expect(refused.world).toBe(w);
    w = deserializeWorld(serializeWorld(w));
    w = advanceWorld(w, 29, LIFE_PATHS2_HANDLERS);
    expect(educationEnrollmentStateAt(w, enrollment.id)?.status).toBe("active");
    w = advanceWorld(w, 1, LIFE_PATHS2_HANDLERS);
    expect(studyTuitionStatus(w, enrollment.id, path)?.paused).toBe(true);
    expect(completedStudyPeriods(w, enrollment.id, path)).toBe(0);
    expect(changeLifePathStatus(w, enrollment.id, "return").world).toBe(w);
    w = enterLifePath(w, "shop-assistant").world;
    w = passOrdinaryDays(deserializeWorld(serializeWorld(w)), 3);
    expect(w.currentDate).toBe(addDays(blocked, 33));
    expect(
      w.history.events.filter((e) => e.type === "life-paths2.tuition-paused"),
    ).toHaveLength(1);
    expect(
      w.history.events.filter((e) => e.type === "life-paths2.work-session")
        .length,
    ).toBeGreaterThan(0);
    expect(
      w.history.resourceTransferOutcomes.filter(
        (o) =>
          o.status === "completed" && o.transferredAmount.minorUnits === 7200,
      ).length,
    ).toBeGreaterThan(0);
    expect(paidStudyPeriods(w, enrollment.id)).toBe(0);
    expect(deserializeWorld(serializeWorld(w))).toEqual(w);
  });
  it("explicit earned-cash funding cancels the old deadline without paying the next period early", () => {
    let w = enterLifePath(fixture(490_000), "college-bachelors", {
      tuitionGraceDays: 45,
    }).world;
    const id = w.history.educationEnrollments.at(-1)!.id,
      path = pathForRelationship(w, id)!;
    w = advanceWorld(w, 182, LIFE_PATHS2_HANDLERS);
    const deadline = w.history.futureDueItems.at(-1)!;
    w = enterLifePath(w, "shop-assistant").world;
    w = passOrdinaryDays(w, 4);
    const before = resourcePositionAt(
      w,
      { kind: "person", personId: w.personOrder[0]! },
      money(0, "USD").currency,
    )!.liquidBalance.minorUnits;
    const result = settleStudyTuition(deserializeWorld(serializeWorld(w)), id);
    expect(result.ok).toBe(true);
    w = result.world;
    expect(completedStudyPeriods(w, id, path)).toBe(1);
    expect(paidStudyPeriods(w, id)).toBe(1);
    expect(
      resourcePositionAt(
        w,
        { kind: "person", personId: w.personOrder[0]! },
        money(0, "USD").currency,
      )!.liquidBalance.minorUnits,
    ).toBe(before - 500_000);
    expect(
      futureDueItemStateAt(w, deadline.id, {
        asOfDate: w.currentDate,
        historySequenceExclusive: w.history.nextSequence,
      })?.status,
    ).toBe("cancelled");
    expect(settleStudyTuition(w, id).world).toBe(w);
    const replay = educationStudyPeriodDueHandler(w, deadline);
    expect(replay.world).toBe(w);
    w = advanceWorld(
      deserializeWorld(serializeWorld(w)),
      45,
      LIFE_PATHS2_HANDLERS,
    );
    expect(paidStudyPeriods(w, id)).toBe(1);
    expect(completedStudyPeriods(w, id, path)).toBe(1);
    expect(studyTuitionStatus(w, id, path)).toBeNull();
  });
  it("keeps accepted degree price, duration, credential and grace when a future offer changes", () => {
    const accepted = enterLifePath(fixture(), "college-bachelors", {
      tuitionGraceDays: 45,
    }).world;
    const id = accepted.history.educationEnrollments.at(-1)!.id;
    const before = pathForRelationship(accepted, id)!;
    const snapshot = serializeWorld(accepted);
    vi.spyOn(catalog, "lifePathDefinition").mockReturnValue({
      ...before,
      periodCostMinor: 999_999,
      academicYears: 1,
      credential: "Changed future credential",
      tuitionGraceDays: 5,
    });
    expect(pathForRelationship(deserializeWorld(snapshot), id)).toEqual(before);
    expect(before.periodCostMinor).toBe(500_000);
    expect(before.academicYears).toBe(4);
    expect(before.credential).toBe("Bachelor's degree");
    expect(before.tuitionGraceDays).toBe(45);
    const future = enterLifePath(fixture(), "college-bachelors", {
      tuitionGraceDays: 5,
    }).world;
    expect(
      pathForRelationship(
        future,
        future.history.educationEnrollments.at(-1)!.id,
      )!.periodCostMinor,
    ).toBe(999_999);
    expect(serializeWorld(accepted)).toBe(snapshot);
    const terms = acceptedEducationTerms(accepted, id)!;
    expect(terms.funding).toBe("available-personal-cash");
    expect(recordAcceptedEducationTerms(accepted, id, terms)).toBe(accepted);
    expect(() =>
      recordAcceptedEducationTerms(accepted, id, {
        ...terms,
        path: { ...before, periodCostMinor: 999_999 },
      }),
    ).toThrow(/cannot be replaced/);
  });
  it("reads legacy v1 degree terms from a frozen baseline, not a changed live offer", () => {
    let legacy = createOrganization(fixture(), {
      stableKey: "legacy:college",
      formedAt: fixture().currentDate,
      initialProfile: {
        name: "Legacy college",
        classification: "custom:college",
        locationJurisdictionId: null,
      },
      provenance,
    });
    legacy = createEducationEnrollment(legacy, {
      stableKey: "legacy:associate",
      personId: legacy.personOrder[0]!,
      organizationId: legacy.history.organizations.at(-1)!.id,
      startedAt: legacy.currentDate,
      programKind: "postsecondary:public-administration-associate",
      initialStatus: "active",
      contextKind: "program:life-paths2-v1",
      provenance,
    });
    const id = legacy.history.educationEnrollments.at(-1)!.id;
    const snapshot = serializeWorld(legacy);
    const old = pathForRelationship(legacy, id)!;
    vi.spyOn(catalog, "lifePathDefinition").mockReturnValue({
      ...old,
      periodCostMinor: 0,
      minimumElapsedDays: 1,
    });
    expect(pathForRelationship(deserializeWorld(snapshot), id)).toEqual(old);
    expect(old.periodCostMinor).toBe(96_000);
    expect(old.minimumElapsedDays).toBe(665);
    expect(old.tuitionGraceDays).toBeUndefined();
    expect(serializeWorld(legacy)).toBe(snapshot);
  });
  it("does not replace malformed or future accepted terms with current offers", () => {
    const accepted = enterLifePath(fixture(), "college-bachelors").world;
    const id = accepted.history.educationEnrollments.at(-1)!.id;
    const terms = acceptedEducationTerms(accepted, id)!;
    for (const description of [
      JSON.stringify({ ...terms, version: 999 }),
      JSON.stringify({
        ...terms,
        path: { ...terms.path, tuitionGraceDays: -1 },
      }),
      "not-json",
    ]) {
      const corrupt = {
        ...accepted,
        history: {
          ...accepted.history,
          evidenceArtifacts: accepted.history.evidenceArtifacts.map((a) =>
            a.evidenceKind === EDUCATION_TERMS_V2_KIND
              ? { ...a, description }
              : a,
          ),
        },
      };
      const snapshot = serializeWorld(corrupt);
      expect(parseEducationTerms(description)).toBeUndefined();
      expect(pathForRelationship(corrupt, id)).toBeUndefined();
      expect(() => recordAcceptedEducationTerms(corrupt, id, terms)).toThrow(
        /unavailable/,
      );
      expect(serializeWorld(corrupt)).toBe(snapshot);
    }
  });
  it("counts completed tuition only; failed and partial attempts are not paid periods", () => {
    let world = enterLifePath(fixture(), "college-associate").world;
    const enrollment = world.history.educationEnrollments.at(-1)!;
    for (const [index, status] of (
      ["blocked", "missed", "partial", "completed"] as const
    ).entries()) {
      world = createResourceFlow(world, {
        stableKey: `life-paths2.study-period:${enrollment.id}:${index + 1}`,
        source: { kind: "person", personId: enrollment.personId },
        recipient: {
          kind: "organization",
          organizationId: enrollment.organizationId,
        },
        startsAt: world.currentDate,
        amount: money(100, "USD"),
        cadenceKind: "schedule:one-time",
        basisKind: "obligation:tuition",
        basisReference: { kind: "general" },
        restrictionKind: null,
        jurisdictionId: null,
        provenance,
      });
      world = recordResourceTransferOutcome(world, {
        stableKey: `d33:transfer:${index}`,
        resourceFlowId: world.history.resourceFlows.at(-1)!.id,
        periodStartsAt: world.currentDate,
        periodEndsAt: world.currentDate,
        occurredAt: world.currentDate,
        status,
        attemptedAmount: money(100, "USD"),
        transferredAmount: money(
          status === "completed" ? 100 : status === "partial" ? 50 : 0,
          "USD",
        ),
        reasonKind: status === "completed" ? null : "capacity:tuition-unfunded",
        note: null,
        provenance,
      });
    }
    const snapshot = serializeWorld(world);
    expect(paidStudyPeriods(world, enrollment.id)).toBe(1);
    expect(serializeWorld(world)).toBe(snapshot);
  });
});
