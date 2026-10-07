import { describe, expect, it } from "vitest";
import { addDays } from "../dates";
import { createDemoWorld } from "../demo";
import type { MatterProceedingRecord, ProceedingStepRecord } from "./records";
import { publicAdverseFindingsAgainst } from "./findings";

describe("public press findings", () => {
  it("remain available from the saved record after seven years", () => {
    const world = createDemoWorld("press-finding-persistence", {
      peopleCount: 4,
    });
    const personId = world.personOrder[0]!;
    const at = addDays(world.currentDate, -7 * 365);
    const proceeding: MatterProceedingRecord = {
      id: "test:old-public-finding:proceeding",
      stableKey: "test:old-public-finding:proceeding",
      sequence: 1,
      recordedAt: world.currentDate,
      kind: "matter-proceeding",
      matterId: "test:old-public-finding:matter",
      procedureKey: "generated-state-oversight",
      institutionLabel: "Test public body",
      complainantPersonId: null,
      respondentPersonIds: [personId],
      openedAt: at,
      openingEventId: "test:old-public-finding:event",
      confidentialWhilePending: false,
      simulatedDisclosure: null,
    };
    const finding: ProceedingStepRecord = {
      id: "test:old-public-finding:step",
      stableKey: "test:old-public-finding:step",
      sequence: 2,
      recordedAt: world.currentDate,
      kind: "proceeding-step",
      proceedingId: proceeding.id,
      step: "public-finding",
      at,
      eventId: "test:old-public-finding:event",
      nextDueAt: null,
      nextDueBasis: null,
      outcome: "finding",
      closes: true,
      publicStep: true,
      evidenceArtifactIds: [],
    };
    const withFinding = {
      ...world,
      history: {
        ...world.history,
        pressRecords: [proceeding, finding],
      },
    };

    expect(
      publicAdverseFindingsAgainst(withFinding, personId, world.currentDate),
    ).toMatchObject([
      { step: { id: finding.id }, proceeding: { id: proceeding.id } },
    ]);
  });
});
