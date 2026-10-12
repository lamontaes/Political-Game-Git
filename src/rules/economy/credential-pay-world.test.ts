import { describe, it, expect } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { STATES } from "../../simulation/state-reference";
import * as life from "../../simulation/life";
import * as resources from "../../simulation/resources";
import {
  makeIsoDate,
  simulationMomentOnLocalDate,
} from "../../simulation/dates";
import { recordedCredentialHourlyPay as native } from "../../simulation/living-world/town-pay";
import { recordedCredentialHourlyPay } from "./credential-pay";
import { credentialPayFacts } from "./test-support/credential-facts";
import type { World, EntityId } from "../../simulation/types";
const provenance = {
  kind: "authored" as const,
  note: "Canonical credential/peer/pay/date controls, not ordinary NPC training or wage outcomes.",
};
const dates = ["2025-12-31", "2026-01-05", "2026-01-31", "2026-02-01"].map(
  makeIsoDate,
);
function compare(world: World, works: readonly EntityId[]) {
  const facts = credentialPayFacts(world, dates);
  for (const workId of works)
    for (const date of dates)
      expect(recordedCredentialHourlyPay(facts, workId, date)).toEqual(
        native(world, workId, date),
      );
}
describe("full public credential-pay peer/date/source parents across all 56 Native Worlds", () => {
  for (const usps of Object.keys(STATES))
    it(
      usps,
      () => {
        const fixture = smallWorld({
          place: "US-" + usps,
          people: 12,
          date: "2026-01-05",
          seed: "rules2:economy:credential-pay:" + usps,
        });
        let world = life.createOrganization(fixture.world, {
          stableKey: "rules2:credential:employer",
          formedAt: fixture.world.currentDate,
          provenance,
          initialProfile: {
            name: "Saved credential pay employer",
            classification: "enterprise:retail",
            locationJurisdictionId: fixture.jurisdictionId,
          },
        });
        const organizationId = world.history.organizations.at(-1)!.id;
        const works: EntityId[] = [];
        for (let i = 0; i < 3; i++) {
          const personId = world.personOrder[i]!;
          world = life.createWorkRelationship(world, {
            stableKey: "rules2:credential:work:" + i,
            personId,
            organizationId,
            startedAt: world.currentDate,
            kind: "employment:staff",
            compensation: "paid",
            authority: "directed",
            dependency: "dependent",
            economicRisk: "organization-borne",
            provenance,
            initialRole: {
              title: "Saved credential clerk",
              occupationClassification: "occupation:office-clerk",
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
          const work = world.history.workRelationships.at(-1)!;
          works.push(work.id);
          world = life.createEducationEnrollment(world, {
            stableKey: "rules2:credential:enrollment:" + i,
            personId,
            organizationId,
            startedAt: world.currentDate,
            programKind: "postsecondary:public-administration-associate",
            contextKind: "program:classroom",
            provenance,
          });
          const enrollment = world.history.educationEnrollments.at(-1)!;
          const state = world.history.educationEnrollmentStates.at(-1)!;
          world = life.recordEducationEnrollmentState(world, {
            stableKey: "rules2:credential:complete:" + i,
            enrollmentId: enrollment.id,
            effectiveAt: world.currentDate,
            status: "completed",
            contextKind: "program:classroom",
            reason: "Saved completed credential control.",
            provenance,
            supersedesStateId: state.id,
          });
          world = resources.createResourceFlow(world, {
            stableKey: "rules2:credential:pay:" + i,
            source: { kind: "organization", organizationId },
            recipient: { kind: "person", personId },
            startsAt: world.currentDate,
            amount: resources.money(150000 + i * 60000, "USD"),
            cadenceKind: "schedule:town-monthly",
            basisKind: "compensation:work",
            basisReference: { kind: "work", workRelationshipId: work.id },
            restrictionKind: null,
            jurisdictionId: fixture.jurisdictionId,
            provenance,
          });
        }
        compare(world, works);
        world = {
          ...world,
          currentDate: makeIsoDate("2026-01-31"),
          currentMoment: simulationMomentOnLocalDate(
            world.currentMoment,
            makeIsoDate("2026-01-31"),
          ),
        };
        for (const flow of world.history.resourceFlows) {
          const terms = world.history.resourceFlowTerms.find(
            (row) => row.resourceFlowId === flow.id,
          )!;
          world = resources.recordResourceTransferOutcome(world, {
            stableKey: "rules2:credential:paid:" + flow.id,
            resourceFlowId: flow.id,
            periodStartsAt: flow.startsAt,
            periodEndsAt: world.currentDate,
            occurredAt: world.currentDate,
            attemptedAmount: terms.amount,
            transferredAmount: terms.amount,
            status: "completed",
            reasonKind: null,
            note: "Saved peer payroll control.",
            provenance,
          });
        }
        compare(world, works);
        const positive = native(world, works[0]!, world.currentDate);
        expect(positive?.peerCount).toBe(2);
        expect(positive!.sourceRecordIds.length).toBeGreaterThan(8);
        const excluded = {
          ...world,
          history: {
            ...world.history,
            resourceFlowTerms: world.history.resourceFlowTerms.map((row, i) =>
              i === 1 ? { ...row, status: "ended" as const } : row,
            ),
          },
        };
        compare(excluded, works);
        expect(
          native(excluded, works[0]!, excluded.currentDate)?.peerCount,
        ).toBe(1);
        const late = {
          ...world,
          history: {
            ...world.history,
            educationEnrollmentStates:
              world.history.educationEnrollmentStates.map((row) =>
                row.status === "completed"
                  ? { ...row, sequence: world.history.nextSequence + 1 }
                  : row,
              ),
          },
        };
        compare(late, works);
        expect(native(late, works[0]!, late.currentDate)).toBeNull();
      },
      30000,
    );
});
