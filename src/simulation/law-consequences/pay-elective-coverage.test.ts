import { expect, it } from "vitest";
import { createScenarioWorld } from "../demo";
import { createPolicyCatalog } from "../policy";
import { createProductionPolicyCatalog } from "../production-catalog";
import {
  createOrganization,
  createWorkRelationship,
  recordWorkRole,
} from "../life";
import { requireLifePlace, stateJurisdictionForKey } from "../life-places";
import { ensureJurisdiction } from "../national-election-geography";
import { initializeOfficeSalaryFlows } from "../office-salary";
import { workRoleAt } from "../life-queries";
import { paidOfficeOf } from "../office-pay";
import { resolvePayConsequences } from "./pay";
import {
  FEDERAL_MINIMUM_WAGE_QUESTION_KEY,
  STATE_MINIMUM_WAGE_QUESTION_KEY,
  MINIMUM_WAGE_PAY_ROWS,
} from "./pay-rows";

it("excludes the recorded elected office without excluding appointed staff", () => {
  const seed = "elective-pay-coverage";
  const placeKey = "lexington-fayette";
  const opened = createScenarioWorld(seed, requireLifePlace(placeKey).context, {
    peopleCount: 8,
  });
  const personId = opened.personOrder[0]!;
  const state = stateJurisdictionForKey("US-OH")!;
  const production = createProductionPolicyCatalog();
  const merged = createPolicyCatalog({
    catalogVersion: "fixture:elective-pay-with-preserved-demo-records",
    domains: Object.values({
      ...opened.policyCatalog.domains,
      ...production.domains,
    }),
    issues: Object.values({
      ...opened.policyCatalog.issues,
      ...production.issues,
    }),
    propositions: Object.values({
      ...opened.policyCatalog.propositions,
      ...production.propositions,
    }),
    subjects: Object.values({
      ...opened.policyCatalog.subjects,
      ...production.subjects,
    }),
    principles: Object.values({
      ...opened.policyCatalog.principles,
      ...production.principles,
    }),
  });
  let world = ensureJurisdiction({ ...opened, policyCatalog: merged, control: { kind: "person", personId } }, state);
  const authored = {
    kind: "authored" as const,
    note: "Explicit review work in an Ohio office, not an election or a residence proxy.",
  };
  world = createOrganization(world, {
    stableKey: `fixture:annual:office:${personId}`,
    formedAt: world.currentDate,
    provenance: authored,
    initialProfile: {
      name: "Review Ohio governor office",
      classification: "sector:government",
      locationJurisdictionId: state.id,
    },
  });
  const organizationId = world.history.organizations.at(-1)!.id;
  world = createWorkRelationship(world, {
    stableKey: `fixture:annual:work:${personId}`,
    personId,
    organizationId,
    startedAt: world.currentDate,
    kind: "employment:executive-office",
    compensation: "paid",
    authority: "directs-others",
    dependency: "independent",
    economicRisk: "organization-borne",
    provenance: authored,
    initialRole: {
      title: "Review Ohio governor",
      occupationClassification: "service:us-oh-governor",
      locationJurisdictionId: state.id,
      timeDemand: {
        expectedWeekly: { minimumHours: 20, maximumHours: 30 },
        attention: "high",
        concurrency: "mostly-exclusive",
        scheduleRigidity: "mixed",
        interruptibility: "limited",
        locationJurisdictionId: state.id,
      },
    },
  });
  const work = world.history.workRelationships.at(-1)!;
  world = initializeOfficeSalaryFlows(world, personId);
  const flow = world.history.resourceFlows.find(
    (row) =>
      row.basisReference.kind === "work" &&
      row.basisReference.workRelationshipId === work.id,
  )!;

  const context = {
    onDate: world.currentDate,
    activity: "payroll" as const,
    activityId: flow.id,
    subjectIds: [personId],
  };
  expect(paidOfficeOf(world, work)?.office).toBe("governor");
  for (const key of [
    FEDERAL_MINIMUM_WAGE_QUESTION_KEY,
    STATE_MINIMUM_WAGE_QUESTION_KEY,
  ])
    expect(
      resolvePayConsequences(world, MINIMUM_WAGE_PAY_ROWS[key]!, context),
    ).toEqual([]);
  const role = workRoleAt(world, work.id)!;
  const staff = recordWorkRole(world, {
    stableKey: "fixture:appointed-staff-role",
    workRelationshipId: work.id,
    effectiveAt: world.currentDate,
    title: "Appointed office staff",
    occupationClassification: "service:office-staff",
    locationJurisdictionId: state.id,
    timeDemand: role.timeDemand,
    supersedesRoleId: role.id,
    provenance: {
      kind: "authored",
      note: "Explicit appointed-staff counterexample, not an actual appointment.",
    },
  });
  expect(paidOfficeOf(staff, work)).toBeNull();
  const applied = resolvePayConsequences(
    staff,
    MINIMUM_WAGE_PAY_ROWS[FEDERAL_MINIMUM_WAGE_QUESTION_KEY]!,
    context,
  );
  expect(applied).toHaveLength(1);
  expect(applied[0]!.subject.id).toBe(personId);
});
