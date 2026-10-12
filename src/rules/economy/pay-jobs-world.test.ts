import { describe, it, expect, vi } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { STATES } from "../../simulation/state-reference";
import {
  makeIsoDate,
  ageOnDate,
  simulationMomentOnLocalDate,
} from "../../simulation/dates";
import * as life from "../../simulation/life";
import * as resources from "../../simulation/resources";
import * as tax from "../../simulation/tax-policy";
import * as native from "../../simulation/living-world/town-pay";
import {
  TEACHER_FLOOR_OCCUPATION,
  TEACHER_SALARY_FLOOR_QUESTION,
} from "../../simulation/teacher-salary-floor";
import {
  startTownJobPay,
  raiseTeacherPayToFloor,
  type PayJobRequest,
  type PayJobFacts,
} from "./pay-jobs";
import { payJobFacts } from "./test-support/pay-job-facts";
import * as legalTeacher from "../../simulation/teacher-salary-floor";
import { lawInForce } from "../../simulation/governing/law-in-force";
import { createStableId } from "../../simulation/ids";
import type { World, EntityId } from "../../simulation/types";
const provenance = {
  kind: "authored" as const,
  note: "Canonical payroll and legal floor/cadence/start/exclusion controls, not ordinary NPC hiring or raises.",
};
const since = makeIsoDate("2026-08-01");
function execute(
  world: World,
  expected: World,
  generator: Generator<PayJobRequest, PayJobFacts, PayJobFacts>,
) {
  let current = world,
    step = generator.next();
  while (!step.done) {
    const request = step.value;
    switch (request.kind) {
      case "createResourceFlows":
        current = resources.createResourceFlows(current, request.input);
        break;
      case "recordResourceFlowTerms":
        current = resources.recordResourceFlowTerms(current, request.input);
        break;
      case "ensureLocalPublicAccount":
        current = tax.ensureLocalPublicAccount(current, request.input);
        break;
      case "ensureTaxPublicAccount":
        current = tax.ensureTaxPublicAccount(current, request.input);
        break;
      case "attachTermsStamp": {
        const saved = expected.history.resourceFlowTerms.find(
          (row) => row.id === request.saved.id,
        )!;
        expect(saved).toEqual(request.saved);
        expect({
          ...current.history.resourceFlowTerms.at(-1)!,
          lawEffectStamps: request.saved.lawEffectStamps,
        }).toEqual(saved);
        const cutoff = saved.sequence + 1;
        const history = Object.fromEntries(
          Object.entries(expected.history).map(([key, value]) => [
            key,
            key === "nextSequence"
              ? cutoff
              : Array.isArray(value)
                ? value.filter(
                    (row) =>
                      typeof row?.sequence !== "number" ||
                      row.sequence < cutoff,
                  )
                : value,
          ]),
        ) as unknown as World["history"];
        current = { ...current, history };
        break;
      }
    }
    step = generator.next(payJobFacts(current, since));
  }
  expect(current).toEqual(expected);
  return current;
}
function compareStart(world: World, except: EntityId | null) {
  return execute(
    world,
    native.startTownJobPay(world, except, since),
    startTownJobPay(payJobFacts(world, since), except, since),
  );
}
function compareRaise(world: World, except: EntityId | null) {
  return execute(
    world,
    native.raiseTeacherPayToFloor(world, except),
    raiseTeacherPayToFloor(payJobFacts(world, since), except),
  );
}
describe("complete payroll startup and teacher floor public parents across all 56 Native Worlds", () => {
  for (const usps of Object.keys(STATES))
    it(
      usps,
      () => {
        const fixture = smallWorld({
          place: "US-" + usps,
          people: 12,
          date: "2026-01-05",
          seed: "rules2:economy:pay-jobs:" + usps,
        });
        let world = {
          ...fixture.world,
          currentDate: makeIsoDate("2026-08-31"),
          currentMoment: simulationMomentOnLocalDate(
            fixture.world.currentMoment,
            makeIsoDate("2026-08-31"),
          ),
        };
        compareStart(world, null);
        compareRaise(world, null);
        const adults = world.personOrder.filter(
          (id) =>
            ageOnDate(world.people[id]!.birthDate, makeIsoDate("2026-07-01")) >=
            18,
        );
        expect(adults.length).toBeGreaterThan(0);
        const works: EntityId[] = [];
        for (let i = 0; i < 4; i++) {
          world = life.createOrganization(world, {
            stableKey: "rules2:pay-jobs:employer:" + i,
            formedAt: makeIsoDate("2026-07-01"),
            provenance,
            initialProfile: {
              name: "Saved payroll employer " + i,
              classification: i === 3 ? "service:school" : "enterprise:retail",
              locationJurisdictionId: fixture.jurisdictionId,
            },
          });
          const organizationId = world.history.organizations.at(-1)!.id;
          world = life.createWorkRelationship(world, {
            stableKey: `town-employment-v1:${fixture.jurisdictionId}:pay-job:${i}`,
            personId: adults[i % adults.length]!,
            organizationId,
            startedAt: makeIsoDate("2026-07-01"),
            kind: "employment:staff",
            compensation: "paid",
            authority: "directed",
            dependency: "dependent",
            economicRisk: "organization-borne",
            provenance,
            initialRole: {
              title: i === 3 ? "Teacher" : "Saved clerk",
              occupationClassification:
                i === 3 ? TEACHER_FLOOR_OCCUPATION : "occupation:office-clerk",
              locationJurisdictionId: fixture.jurisdictionId,
              timeDemand: {
                expectedWeekly: { minimumHours: 20, maximumHours: 40 },
                attention: "high",
                concurrency: "mostly-exclusive",
                scheduleRigidity: "mixed",
                interruptibility: "limited",
                locationJurisdictionId: fixture.jurisdictionId,
              },
            },
          });
          works.push(world.history.workRelationships.at(-1)!.id);
        }
        const started = compareStart(world, null);
        compareStart(started, null);
        compareStart(world, adults[0]!);
        compareRaise(started, null);
        const teacher = world.history.workRelationships.find(
          (row) => row.id === works[3],
        )!;
        let controlled = resources.createResourceFlow(world, {
          stableKey: "town-pay-v2:job-pay:teacher-control",
          source: {
            kind: "organization",
            organizationId: teacher.organizationId!,
          },
          recipient: { kind: "person", personId: teacher.personId },
          startsAt: makeIsoDate("2026-07-01"),
          amount: resources.money(10000, "USD"),
          cadenceKind: "schedule:town-monthly",
          basisKind: "compensation:work",
          basisReference: { kind: "work", workRelationshipId: teacher.id },
          restrictionKind: null,
          jurisdictionId: fixture.jurisdictionId,
          provenance,
        });
        // Labeled raw legal-receipt control at a separately owned public source query, not an enacted statute or a spy on payroll math.
        const question = Object.values(world.policyCatalog.propositions).find(
          (row) => row.stableKey === TEACHER_SALARY_FLOOR_QUESTION,
        )!;
        const governing = lawInForce(
          world,
          fixture.jurisdictionId,
          question.id,
          makeIsoDate("2026-07-01"),
        );
        const floor = {
          annual: 100000,
          from: makeIsoDate("2026-07-01"),
          measureId:
            governing?.measureId ??
            createStableId(
              "legislative-measure",
              world.id + ":raw-floor-control",
            ),
        };
        const source = vi
          .spyOn(legalTeacher, "teacherSalaryFloorAt")
          .mockImplementation((_world, id, date) =>
            id === fixture.jurisdictionId && date >= floor.from ? floor : null,
          );
        try {
          const raised = compareRaise(controlled, null);
          expect(raised.history.resourceFlowTerms.length).toBeGreaterThan(
            controlled.history.resourceFlowTerms.length,
          );
          compareRaise(raised, null);
          compareRaise(controlled, teacher.personId);
          controlled = compareStart(controlled, null);
          compareRaise(controlled, null);
        } finally {
          source.mockRestore();
        }
      },
      60000,
    );
});
