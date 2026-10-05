import { writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { expect, it } from "vitest";
import { createScenarioWorld } from "../demo";
import { createPolicyCatalog, createSyntheticPolicyCatalog } from "../policy";
import { createProductionPolicyCatalog } from "../production-catalog";
import { searchLifePlaces, stateJurisdictionForKey } from "../life-places";
import { ensureJurisdiction } from "../national-election-geography";
import { createOrganization, createWorkRelationship } from "../life";
import {
  createResourceFlow,
  createResourcePosition,
  recordResourceTransferOutcome,
  money,
} from "../resources";
import { advanceWorld } from "../world";
import { deserializeWorld, serializeWorld } from "../serialization";
import {
  teacherSalaryFloorAt,
  TEACHER_SALARY_FLOOR_QUESTION,
} from "../teacher-salary-floor";
import {
  payTownPaydays,
  raiseTeacherPayToFloor,
  townPaySource,
  weeklyHoursOf,
} from "./town-pay";

it("raises a controlled below-floor teacher through the recorded law, stamps pay, pays, and reloads", () => {
  const demo = createSyntheticPolicyCatalog();
  const production = createProductionPolicyCatalog();
  const policyCatalog = createPolicyCatalog({
    catalogVersion: "fixture:teacher-pay-kind",
    domains: Object.values({ ...demo.domains, ...production.domains }),
    issues: Object.values({ ...demo.issues, ...production.issues }),
    propositions: Object.values({
      ...demo.propositions,
      ...production.propositions,
    }),
    subjects: Object.values({ ...demo.subjects, ...production.subjects }),
    principles: Object.values({ ...demo.principles, ...production.principles }),
  });
  const place = searchLifePlaces("", 5000, {
    stateJurisdictionKey: "US-AR",
  }).find((p) => p.scope === "locality")!;
  const state = stateJurisdictionForKey("US-AR")!;
  // Final catalog precedes every coverage determination; no authority is replaced after hire.
  let world = ensureJurisdiction(
    createScenarioWorld("session21-controlled-teacher-raise", place.context, {
      peopleCount: 8,
      policyCatalog,
    }),
    state,
  );
  const template = world.history.workRelationships[0]!;
  const role = world.history.workRoles.find(
    (r) => r.workRelationshipId === template.id,
  )!;
  const provenance = {
    kind: "authored" as const,
    note: "Controlled below-floor teacher and funded employer; not an observed salary or treasury balance.",
  };
  world = createOrganization(world, {
    stableKey: "fixture:teacher-pay-school",
    formedAt: world.currentDate,
    provenance: {
      kind: "source-record",
      reference: "fixture:session21-controlled-public-school",
      asOf: world.currentDate,
    },
    initialProfile: {
      name: "Controlled public school",
      classification: "service:school",
      locationJurisdictionId: place.context.jurisdiction.id,
      publicGovernmentIdentity: {
        kind: "jurisdiction",
        jurisdictionId: state.id,
      },
    },
  });
  const schoolId = world.history.organizations.at(-1)!.id;
  world = createWorkRelationship(world, {
    ...template,
    stableKey: "town-employment-v1:fixture:below-floor-teacher",
    organizationId: schoolId,
    startedAt: world.currentDate,
    provenance,
    initialRole: {
      title: "Controlled teacher",
      occupationClassification: "profession:teacher",
      locationJurisdictionId: place.context.jurisdiction.id,
      timeDemand: role.timeDemand,
    },
  });
  const work = world.history.workRelationships.at(-1)!;
  const teacherRole = world.history.workRoles.at(-1)!;
  const payer = townPaySource(world, schoolId);
  world = createOrganization(payer.world, {
    stableKey: "fixture:pay-test-funder",
    formedAt: world.currentDate,
    provenance,
    initialProfile: {
      name: "Controlled test funder",
      classification: "enterprise:retail",
      locationJurisdictionId: place.context.jurisdiction.id,
    },
  });
  const funderId = world.history.organizations.at(-1)!.id;
  world = createResourcePosition(world, {
    stableKey: "fixture:teacher-pay-cash",
    owner: { kind: "organization", organizationId: funderId },
    openedAt: world.currentDate,
    openingBalance: money(100_000_000, "USD"),
    provenance,
  });
  world = createResourceFlow(world, {
    stableKey: "fixture:pay-test-funding",
    source: { kind: "organization", organizationId: funderId },
    recipient: { kind: "organization", organizationId: payer.organizationId },
    startsAt: world.currentDate,
    amount: money(100_000_000, "USD"),
    cadenceKind: "schedule:one-time",
    basisKind: "custom:fixture-funding",
    basisReference: { kind: "general" },
    restrictionKind: null,
    jurisdictionId: state.id,
    provenance,
  });
  world = recordResourceTransferOutcome(world, {
    stableKey: "fixture:pay-test-funded",
    resourceFlowId: world.history.resourceFlows.at(-1)!.id,
    periodStartsAt: world.currentDate,
    periodEndsAt: world.currentDate,
    occurredAt: world.currentDate,
    status: "completed",
    attemptedAmount: money(100_000_000, "USD"),
    transferredAmount: money(100_000_000, "USD"),
    reasonKind: null,
    note: "Controlled test funding, not observed government resources.",
    provenance,
  });
  const floor = teacherSalaryFloorAt(
    world,
    place.context.jurisdiction.id,
    world.currentDate,
    null,
  )!;
  expect(floor).not.toBeNull();
  const expected = Math.round(
    (Math.round((floor.annual / 2080) * 100) *
      weeklyHoursOf(teacherRole) *
      52) /
      12,
  );
  // Deliberate below-floor control, not a calibration or a generated pay claim.
  const initial = Math.floor(expected / 2);
  world = createResourceFlow(world, {
    stableKey: `town-pay-v2:job-pay:${work.id}`,
    source: { kind: "organization", organizationId: payer.organizationId },
    recipient: { kind: "person", personId: work.personId },
    startsAt: world.currentDate,
    amount: money(initial, "USD"),
    cadenceKind: "schedule:town-monthly",
    basisKind: "compensation:work",
    basisReference: { kind: "work", workRelationshipId: work.id },
    restrictionKind: null,
    jurisdictionId: place.context.jurisdiction.id,
    provenance,
  });
  const flow = world.history.resourceFlows.at(-1)!;
  const originalTerms = world.history.resourceFlowTerms.at(-1)!;
  const startsAt = world.currentDate;
  world = raiseTeacherPayToFloor(advanceWorld(world, 60), null);
  const raised = world.history.resourceFlowTerms
    .filter((r) => r.resourceFlowId === flow.id)
    .at(-1)!;
  expect(raised.amount).toEqual(money(expected, "USD"));
  expect(raised.amount.minorUnits).toBeGreaterThan(initial);
  expect(raised.supersedesTermsId).toBe(originalTerms.id);
  expect(raised.lawEffectStamps).toHaveLength(1);
  expect(raised.lawEffectStamps![0]).toMatchObject({
    effectKind: "pay",
    questionKey: TEACHER_SALARY_FLOOR_QUESTION,
  });
  expect(raised.lawEffectStamps![0]!.sourceRecordIds).toEqual(
    expect.arrayContaining([flow.id, work.id, raised.id]),
  );
  const reopened = deserializeWorld(serializeWorld(world));
  expect(
    reopened.history.resourceFlowTerms.find((r) => r.id === raised.id),
  ).toEqual(raised);
  expect(
    raiseTeacherPayToFloor(reopened, null).history.resourceFlowTerms,
  ).toEqual(reopened.history.resourceFlowTerms);
  const paid = payTownPaydays(reopened, startsAt, null);
  const payment = paid.history.resourceTransferOutcomes.find(
    (r) =>
      r.resourceFlowId === flow.id &&
      r.transferredAmount.minorUnits === expected,
  )!;
  expect(payment).toBeDefined();
  expect(payment.status).toBe("completed");
  expect(payment.lawEffectStamps?.[0]).toMatchObject({
    effectKind: "pay",
    governingLawKey: raised.lawEffectStamps![0]!.governingLawKey,
  });
  expect(
    deserializeWorld(
      serializeWorld(paid),
    ).history.resourceTransferOutcomes.find((r) => r.id === payment.id),
  ).toEqual(payment);
  const receipt = {
    testedHead: execFileSync("git", ["rev-parse", "HEAD"], {
      encoding: "utf8",
    }).trim(),
    receipt: "Session21 controlled teacher raise",
    seed: world.seed,
    place: place.displayName,
    initialMinor: initial,
    raisedMinor: expected,
    governingLawKey: raised.lawEffectStamps![0]!.governingLawKey,
    termsId: raised.id,
    paymentId: payment.id,
    effectKind: raised.lawEffectStamps![0]!.effectKind,
    lawTermFloorAnnual: floor.annual,
    sourceRecordIds: raised.lawEffectStamps![0]!.sourceRecordIds,
    raisedAt: raised.effectiveAt,
    paidAt: payment.occurredAt,
    transferredMinor: payment.transferredAmount.minorUnits,
    reload: true,
  };
  writeFileSync(
    "/tmp/session21-teacher-pay-proof.json",
    JSON.stringify(receipt, null, 2),
  );
}, 60_000);
