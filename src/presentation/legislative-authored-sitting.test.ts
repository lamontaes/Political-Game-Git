import { describe, expect, it } from "vitest";
import {
  suppliedLegislativeSeat,
  endSuppliedSeat,
} from "../../tests/fixtures/supplied-legislative-seat";
import {
  assertWorldIntegrity,
  deserializeWorld,
  serializeWorld,
  measurePosition,
  legislativeBlueprint,
} from "../simulation";
import type { World, EntityId, MeasureStepKey } from "../simulation";
import { standingAuthorities } from "../simulation/legislation-program-families";
import { fileDraftFromOffice } from "./legislation-docket";
import { openLegislativeBargaining } from "./legislative-bargaining-world";
import {
  applyLegislativeCommand,
  resolveLegislativeAssignmentForMeasure,
} from "./legislation-world";
import {
  prepareRecordedLegislativeSitting,
  readRecordedLegislativeSitting,
  recordedSittingAvailable,
} from "./legislative-authored-sitting";

function filedAppropriation(state = "US-AK", chamber = "house") {
  const seat = suppliedLegislativeSeat(state, chamber);
  const filed = fileDraftFromOffice(seat.world, {
    playerPersonId: seat.personId,
    scenarioKey: state === "US-AK" ? "alaska" : `institution:${seat.packId}`,
    jurisdictionId: seat.jurisdictionId,
    familyKey: "appropriations",
    variantKey: "single-programme",
    authorityKey: standingAuthorities().find(
      (entry) => entry.authorizesSpending,
    )!.authorityKey,
  });
  return {
    ...seat,
    ...filed,
    measureId: filed.bill.measureId,
    playerPersonId: seat.personId,
    playerBallot: "yea" as const,
  };
}

function step(
  world: World,
  measureId: EntityId,
  playerPersonId: EntityId,
  action: MeasureStepKey,
  otherChamber = false,
) {
  const entry = resolveLegislativeAssignmentForMeasure(world, {
    measureId,
    playerPersonId,
  });
  if (entry.kind !== "available") throw new Error(entry.reason);
  return applyLegislativeCommand(world, entry.assignment, {
    kind: otherChamber ? "await-institutional-record" : "take-step",
    step: action,
  }).world;
}

describe("explicit recorded fictional Alaska appropriation sitting", () => {
  it.each(["house", "senate"])(
    "consumes the canonical route from an actual %s seat without scoring or predicting",
    (chamber) => {
      const filed = filedAppropriation("US-AK", chamber);
      expect(readRecordedLegislativeSitting(filed.world, filed)).toBeNull();
      let world = prepareRecordedLegislativeSitting(filed.world, filed);
      expect(
        serializeWorld(prepareRecordedLegislativeSitting(world, filed)),
      ).toBe(serializeWorld(world));
      world = deserializeWorld(serializeWorld(world));
      const source = readRecordedLegislativeSitting(world, filed)!;
      expect(source.votePlan).toEqual(legislativeBlueprint("alaska").votePlan);
      expect(world.history.decisionTraces).toEqual(
        filed.world.history.decisionTraces,
      );
      for (const other of [false, true]) {
        for (const action of [
          "request-referral",
          "request-committee-hearing",
          "move-committee-report",
          "request-calendar-placement",
          "move-floor-vote",
        ] as const) {
          if (other && action === "move-floor-vote") {
            const before = serializeWorld(world);
            expect(() =>
              step(world, filed.measureId, filed.personId, action),
            ).toThrow(/other chamber/);
            expect(serializeWorld(world)).toBe(before);
          }
          if (!other && action === "move-floor-vote") {
            const before = serializeWorld(world);
            expect(
              openLegislativeBargaining(world, {
                playerPersonId: filed.personId,
                docketKey: filed.bill.docketKey,
              }).kind,
            ).toBe("unavailable");
            expect(serializeWorld(world)).toBe(before);
            const unknownSource: World = {
              ...world,
              history: {
                ...world.history,
                events: world.history.events.map((event) =>
                  event.type ===
                  "legislation.recorded-fictional-sitting-admitted"
                    ? {
                        ...event,
                        context: {
                          ...event.context,
                          choice: "unknown-source-profile",
                        },
                      }
                    : event,
                ),
              },
            };
            expect(
              readRecordedLegislativeSitting(unknownSource, filed),
            ).toBeNull();
            expect(
              openLegislativeBargaining(unknownSource, {
                playerPersonId: filed.personId,
                docketKey: filed.bill.docketKey,
              }).kind,
            ).toBe("unavailable");
          }
          world = step(world, filed.measureId, filed.personId, action, other);
        }
        if (!other)
          world = step(
            world,
            filed.measureId,
            filed.personId,
            "transmit-to-second-chamber",
          );
      }
      for (const action of [
        "request-enrollment",
        "present-to-executive",
        "await-executive-decision",
        "move-veto-override",
        "record-enactment",
      ] as const) {
        world = step(world, filed.measureId, filed.personId, action);
      }
      expect(measurePosition(world, filed.measureId).outcome).toBe("enacted");
      expect(
        world.history.legislativeEnactments!.find(
          (entry) => entry.measureId === filed.measureId,
        )!.effectiveAt,
      ).toBeNull();
      expect(
        world.history
          .legislativeVotes!.filter(
            (entry) => entry.measureId === filed.measureId,
          )
          .every((entry) =>
            entry.provenance.sourceEntityIds.includes(
              source.recordedSittingEventId!,
            ),
          ),
      ).toBe(true);
      expect(world.history.decisionTraces).toEqual(
        filed.world.history.decisionTraces,
      );
      assertWorldIntegrity(deserializeWorld(serializeWorld(world)));
    },
  );

  it("withholds unsupported institutions and ended seats without manufacturing a sitting", () => {
    const illinois = filedAppropriation("US-IL");
    expect(recordedSittingAvailable(illinois.world, illinois)).toBe(false);
    expect(() =>
      prepareRecordedLegislativeSitting(illinois.world, illinois),
    ).toThrow(/No recorded fictional sitting/);
    const alaska = filedAppropriation();
    const ended = endSuppliedSeat(alaska.world);
    expect(readRecordedLegislativeSitting(ended, alaska)).toBeNull();
    expect(() => prepareRecordedLegislativeSitting(ended, alaska)).toThrow(
      /No recorded fictional sitting/,
    );
  });
  it("requires and preserves the player's categorical ballot instead of a default", () => {
    const filed = filedAppropriation();
    expect(() =>
      prepareRecordedLegislativeSitting(filed.world, {
        ...filed,
        playerBallot: "" as never,
      }),
    ).toThrow(/Choose the player's recorded ballot/);
    let world = prepareRecordedLegislativeSitting(filed.world, {
      ...filed,
      playerBallot: "nay",
    });
    expect(() => prepareRecordedLegislativeSitting(world, filed)).toThrow(
      /different player ballot/,
    );
    for (const action of [
      "request-referral",
      "request-committee-hearing",
      "move-committee-report",
    ] as const)
      world = step(world, filed.measureId, filed.personId, action);
    const vote = world.history.legislativeVotes!.find(
      (entry) => entry.measureId === filed.measureId,
    )!;
    expect(
      vote.dispositions.find((entry) => entry.personId === filed.personId)!
        .disposition,
    ).toBe("nay");
    expect(world.history.decisionTraces).toEqual(
      filed.world.history.decisionTraces,
    );
    assertWorldIntegrity(world);
  });
});
