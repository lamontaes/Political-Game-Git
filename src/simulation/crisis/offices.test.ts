import { describe, expect, it } from "vitest";
import { createDemoWorld } from "../demo";
import { congressSeats } from "../living-world/congress-seats";
import { createWorkRelationship, recordWorkStatus } from "../life";
import { officesHeldOverLife } from "./offices";

describe("CRISIS office keys", () => {
  it("uses Congress seat keys as office keys without a doubled chamber", () => {
    const keys = congressSeats().map((seat) => seat.seatKey);
    expect(keys).toContain("us-house:KY-03");
    expect(keys.some((key) => key.startsWith("us-senate:KY:class-"))).toBe(
      true,
    );
    expect(keys.every((key) => !/^us-(house|senate):us-/.test(key))).toBe(true);
  });

  it("includes an ended public office supported by a saved work record", () => {
    let world = createDemoWorld("career-office-reader");
    const personId = world.personOrder[0]!;
    const officeKey = "test:city-mayor";
    world = createWorkRelationship(world, {
      stableKey: officeKey,
      personId,
      organizationId: null,
      startedAt: world.currentDate,
      kind: "employment:judicial-office",
      compensation: "paid",
      authority: "shared",
      dependency: "dependent",
      economicRisk: "organization-borne",
      provenance: { kind: "authored", note: "fixture office term" },
      initialRole: {
        title: "Mayor",
        occupationClassification: "service:mayor",
        locationJurisdictionId: world.people[personId]!.homeJurisdictionId,
        timeDemand: {
          expectedWeekly: { minimumHours: 20, maximumHours: 40 },
          attention: "high",
          concurrency: "mostly-exclusive",
          scheduleRigidity: "mixed",
          interruptibility: "limited",
          locationJurisdictionId: world.people[personId]!.homeJurisdictionId,
        },
      },
    });
    const relationship = world.history.workRelationships.at(-1)!;
    const previous = world.history.workStatuses.at(-1)!;
    world = recordWorkStatus(world, {
      stableKey: `${officeKey}:ended`,
      workRelationshipId: relationship.id,
      effectiveAt: world.currentDate,
      status: "ended",
      reason: "The recorded term ended.",
      provenance: { kind: "authored", note: "fixture office term ended" },
      supersedesStatusId: previous.id,
    });

    expect(officesHeldOverLife(world, personId)).toContainEqual({
      officeKey,
      title: "Mayor",
      organizationId: null,
      termEvidenceId: relationship.id,
    });
  });
});
