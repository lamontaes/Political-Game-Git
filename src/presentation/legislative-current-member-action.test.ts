import { describe, expect, it } from "vitest";
import {
  suppliedLegislativeSeat,
  endSuppliedSeat,
} from "../../tests/fixtures/supplied-legislative-seat";
import {
  assertWorldIntegrity,
  deserializeWorld,
  serializeWorld,
  type World,
} from "../simulation";
import { standingAuthorities } from "../simulation/legislation-program-families";
import { fileDraftFromOffice } from "./legislation-docket";
import { prepareRecordedLegislativeSitting } from "./legislative-authored-sitting";
import {
  applyLegislativeCommand,
  resolveLegislativeAssignmentForMeasure,
} from "./legislation-world";
import {
  executeCurrentMemberAction,
  projectCurrentMemberAction,
} from "./legislative-current-member-action";

function readyQuestion(chamber: string) {
  const seat = suppliedLegislativeSeat("US-AK", chamber);
  const filed = fileDraftFromOffice(seat.world, {
    playerPersonId: seat.personId,
    scenarioKey: "alaska",
    jurisdictionId: seat.jurisdictionId,
    familyKey: "appropriations",
    variantKey: "single-programme",
    authorityKey: standingAuthorities().find(
      (record) => record.authorizesSpending,
    )!.authorityKey,
  });
  const input = {
    actorPersonId: seat.personId,
    measureId: filed.bill.measureId,
  };
  let world = prepareRecordedLegislativeSitting(filed.world, {
    ...input,
    playerPersonId: seat.personId,
    playerBallot: "yea",
  });
  for (const step of [
    "request-referral",
    "request-committee-hearing",
    "move-committee-report",
    "request-calendar-placement",
  ] as const) {
    const entry = resolveLegislativeAssignmentForMeasure(world, {
      ...input,
      playerPersonId: seat.personId,
    });
    if (entry.kind !== "available") throw new Error(entry.reason);
    world = applyLegislativeCommand(world, entry.assignment, {
      kind: "take-step",
      step,
    }).world;
  }
  const projection = projectCurrentMemberAction(world, input);
  if (projection.kind !== "available") throw new Error(projection.reason);
  return { ...seat, world, input, ticket: projection.ticket };
}

describe("finite current-member final-passage endpoint", () => {
  it.each(["house", "senate"])(
    "records one actual %s question and preserves its outcome through reload without replay",
    (chamber) => {
      const ready = readyQuestion(chamber);
      const before = serializeWorld(ready.world);
      expect(projectCurrentMemberAction(ready.world, ready.input).kind).toBe(
        "available",
      );
      expect(serializeWorld(ready.world)).toBe(before);
      const result = executeCurrentMemberAction(
        deserializeWorld(before),
        ready.ticket,
      );
      if (result.kind !== "recorded") throw new Error(result.reason);
      expect(result.vote.outcome).toBe("passed");
      expect(
        result.vote.dispositions.find(
          (record) => record.personId === ready.personId,
        )?.disposition,
      ).toBe(ready.ticket.playerDisposition);
      expect(result.vote.provenance.sourceEntityIds).toContain(
        ready.ticket.recordedSittingEventId,
      );
      expect(result.world.history.legislativeVotes!.length).toBe(
        ready.world.history.legislativeVotes!.length + 1,
      );
      expect(result.world.history.decisionTraces).toEqual(
        ready.world.history.decisionTraces,
      );
      const loaded = deserializeWorld(serializeWorld(result.world));
      expect(
        loaded.history.legislativeVotes!.find(
          (record) => record.id === result.vote.id,
        ),
      ).toEqual(result.vote);
      const replay = executeCurrentMemberAction(loaded, ready.ticket);
      expect(replay.kind).toBe("refused");
      expect(replay.world).toBe(loaded);
      assertWorldIntegrity(loaded);
    },
  );

  it("refuses changed same-ID text, ended authority and a changed ballot with the input World unchanged", () => {
    const ready = readyQuestion("house");
    const changed: World = {
      ...ready.world,
      history: {
        ...ready.world.history,
        legislativeProvisions: ready.world.history.legislativeProvisions!.map(
          (record) =>
            record.measureId === ready.input.measureId
              ? {
                  ...record,
                  text: record.text + " Supplied text-change control.",
                }
              : record,
        ),
      },
    };
    for (const world of [changed, endSuppliedSeat(ready.world)]) {
      const before = serializeWorld(world);
      const result = executeCurrentMemberAction(world, ready.ticket);
      expect(result.kind).toBe("refused");
      expect(result.world).toBe(world);
      expect(serializeWorld(result.world)).toBe(before);
    }
    const before = serializeWorld(ready.world);
    const altered = executeCurrentMemberAction(ready.world, {
      ...ready.ticket,
      playerDisposition: "nay",
    });
    expect(altered.kind).toBe("refused");
    expect(altered.world).toBe(ready.world);
    expect(serializeWorld(altered.world)).toBe(before);
  });
});
