import { describe, expect, it } from "vitest";
import { createDemoWorld } from "../demo";
import { addDays } from "../dates";
import {
  createOrganization,
  createWorkRelationships,
  recordWorkStatus,
} from "../life";
import { workStatusAt } from "../life-queries";
import { deserializeWorld, serializeWorld } from "../serialization";
import { colleaguesOf } from "./responses";

describe("press colleagues", () => {
  it("keeps person order, excludes future work and journalists, and refreshes after leave and reload", () => {
    const initial = createDemoWorld("press-colleagues", { peopleCount: 14 });
    const base = createOrganization(initial, {
      stableKey: "test:press-colleagues",
      formedAt: initial.currentDate,
      provenance: { kind: "authored", note: "Colleague lookup test." },
      initialProfile: {
        name: "Test office",
        classification: "sector:government",
        locationJurisdictionId: initial.jurisdictionOrder[0]!,
      },
    });
    const organizationId = base.history.organizations.at(-1)!.id;
    // Use people outside the demo household's pre-existing work.
    const people = base.personOrder.slice(4);
    const world = createWorkRelationships(
      base,
      [...people].reverse().map((personId) => ({
        stableKey: `test:colleague:${personId}`,
        personId,
        organizationId,
        startedAt:
          personId === people[2]
            ? addDays(base.currentDate, 1)
            : base.currentDate,
        initialStatus: personId === people[2] ? "expected" : "active",
        kind: "employment:staff",
        compensation: "paid",
        authority: "directed",
        dependency: "dependent",
        economicRisk: "organization-borne",
        provenance: { kind: "authored", note: "Colleague lookup test." },
        initialRole: {
          title: "Office worker",
          occupationClassification:
            personId === people[1]
              ? "profession:journalism"
              : "profession:policy-analysis",
          locationJurisdictionId: base.jurisdictionOrder[0]!,
          timeDemand: {
            expectedWeekly: { minimumHours: 30, maximumHours: 40 },
            attention: "moderate",
            concurrency: "partly-concurrent",
            scheduleRigidity: "mixed",
            interruptibility: "limited",
            locationJurisdictionId: base.jurisdictionOrder[0]!,
          },
        },
      })),
    );
    const subject = people[0]!;
    expect(colleaguesOf(base, subject)).toEqual([]);
    expect(colleaguesOf(world, subject)).toEqual(people.slice(3, 9));
    const work = world.history.workRelationships.find(
      (row) =>
        row.personId === people[3] && row.organizationId === organizationId,
    )!;
    const left = recordWorkStatus(world, {
      stableKey: "test:colleague:left",
      workRelationshipId: work.id,
      effectiveAt: world.currentDate,
      status: "temporarily-inactive",
      reason: "Leave",
      provenance: { kind: "authored", note: "Colleague lookup test." },
      supersedesStatusId: workStatusAt(world, work.id)!.id,
    });
    expect(colleaguesOf(left, subject)).toEqual(people.slice(4, 10));
    expect(colleaguesOf(world, subject)).toEqual(people.slice(3, 9));
    expect(
      colleaguesOf(deserializeWorld(serializeWorld(left)), subject),
    ).toEqual(people.slice(4, 10));
  });
});
