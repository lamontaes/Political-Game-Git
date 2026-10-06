import { describe, expect, it } from "vitest";
import { createScenarioWorld } from "../index";
import { KENTUCKY_CONTEXT } from "../legislation-scenarios";
import { pressRecordsOfKind } from "./store";
import { recordMisconductAct } from "./matters";
import {
  decidePublicMisconductRecordResponse,
  publicMisconductRecords,
  readPublicMisconductRecords,
} from "./public-record-readers";

function actWithPublicAndRestrictedPostings() {
  const world = createScenarioWorld("b14-p4-public-record", KENTUCKY_CONTEXT, {
    peopleCount: 3,
  });
  const [actorId, recipientId] = world.personOrder;
  return recordMisconductAct(world, {
    stableKey: "b14-p4:patronage",
    family: "M10",
    actorPersonIds: [actorId!],
    participantPersonIds: [actorId!, recipientId!],
    flows: [],
    artifacts: [
      {
        stableKey: "b14-p4:private-appointment",
        evidenceKind: "record:appointment",
        createdAt: world.currentDate,
        recordedAt: world.currentDate,
        access: "restricted",
        description: "Restricted appointment record.",
      },
      {
        stableKey: "b14-p4:payroll-posting",
        evidenceKind: "record:payroll-posting",
        createdAt: world.currentDate,
        recordedAt: world.currentDate,
        access: "public",
        description: "Public payroll posting naming the appointee.",
      },
    ],
    jurisdictionId: KENTUCKY_CONTEXT.jurisdiction.id,
    summary: "A protected appointment was recorded.",
    choice: "appoint a personal ally",
  });
}

describe("public misconduct record readers", () => {
  it("reads only public act records and keeps the occurrence private", () => {
    const act = actWithPublicAndRestrictedPostings();
    const readerId = act.world.personOrder[2]!;
    const publicRows = publicMisconductRecords(act.world);
    expect(publicRows).toHaveLength(1);
    expect(publicRows[0]!.artifact.evidenceKind).toBe("record:payroll-posting");

    const read = readPublicMisconductRecords(act.world, readerId);
    expect(read.artifactIds).toEqual([publicRows[0]!.artifact.id]);
    expect(read.world.history.evidenceDiscoveries).toHaveLength(1);
    expect(read.world.history.evidenceDiscoveries[0]).toMatchObject({
      personId: readerId,
      evidenceArtifactId: publicRows[0]!.artifact.id,
    });
    expect(
      read.world.history.knowledge.some(
        (knowledge) =>
          knowledge.eventId === act.event.id && knowledge.personId === readerId,
      ),
    ).toBe(false);

    const repeated = readPublicMisconductRecords(read.world, readerId);
    expect(repeated.world).toBe(read.world);
    expect(repeated.artifactIds).toEqual([]);
  });

  it("records a deterministic decision but does not make an unlinked record proof", () => {
    const act = actWithPublicAndRestrictedPostings();
    const readerId = act.world.personOrder[2]!;
    const artifactId = publicMisconductRecords(act.world)[0]!.artifact.id;
    const read = readPublicMisconductRecords(act.world, readerId);
    const input = {
      readerPersonId: readerId,
      occurrenceId: act.occurrence.id,
      artifactId,
    };
    const first = decidePublicMisconductRecordResponse(read.world, input);
    const repeat = decidePublicMisconductRecordResponse(read.world, input);
    expect(first.action).toMatch(/^(refer|set-aside)$/);
    expect(repeat.world).toBe(read.world);
    expect(repeat.action).toBe(first.action);
    expect(first.world.history.decisionTraces.at(-1)!.context.randomness).toBe(
      "none",
    );
    expect(pressRecordsOfKind(first.world, "matter")).toHaveLength(0);
    expect(
      pressRecordsOfKind(first.world, "matter-evidence-link"),
    ).toHaveLength(0);
  });
});
