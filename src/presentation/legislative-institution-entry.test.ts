import { describe, expect, it } from "vitest";
import {
  suppliedLegislativeSeat,
  endSuppliedSeat,
} from "../../tests/fixtures/supplied-legislative-seat";
import { LEGISLATIVE_RULE_PACKS } from "../simulation/legislature-rule-packs";
import { legislativeWorkKey } from "../simulation/legislative-institutions";
import {
  assertWorldIntegrity,
  deserializeWorld,
  serializeWorld,
  measurePosition,
  seatBodyForPack,
} from "../simulation";
import { resolvePlayerCapabilities } from "./player-capabilities";
import {
  applyLegislativeCommand,
  openLegislativeWork,
  resolveLegislativeAssignmentForMeasure,
} from "./legislation-world";
import { fileDraftFromOffice } from "./legislation-docket";
import { resolveLegislativeFilingEntry } from "./legislative-filing-entry";
import { legislativeProcedureRefusal } from "./legislative-procedure-availability";

describe("institutional entry independently of story fixtures", () => {
  const additional = LEGISLATIVE_RULE_PACKS.filter(
    (pack) => !["US-KY", "US-NE", "US-AK"].includes(pack.jurisdictionKey),
  );
  it.each(
    additional.map(
      (pack) => [pack.jurisdictionKey, pack.chamberOrder.at(-1)!] as const,
    ),
  )(
    "binds %s's actual %s member to its own docket and measure",
    (stateKey, chamberKey) => {
      const seat = suppliedLegislativeSeat(stateKey, chamberKey);
      const capabilities = resolvePlayerCapabilities(seat.world);
      const pack = LEGISLATIVE_RULE_PACKS.find(
        (entry) => entry.packId === seat.packId,
      )!;
      expect(capabilities.legislativeScenarioKey).toBe(
        legislativeWorkKey(pack),
      );
      expect(capabilities.legislativeJurisdictionId).toBe(seat.jurisdictionId);
      expect(
        resolveLegislativeFilingEntry(seat.world, seat.personId).kind,
      ).toBe("available");
      const filed = fileDraftFromOffice(seat.world, {
        playerPersonId: seat.personId,
        scenarioKey: capabilities.legislativeScenarioKey!,
        jurisdictionId: seat.jurisdictionId,
        familyKey: "broadband-access",
        variantKey: "unserved-buildout",
      });
      const measure = filed.world.history.legislativeMeasures!.find(
        (entry) => entry.id === filed.bill.measureId,
      )!;
      expect(measure.rulePackId).toBe(seat.packId);
      expect(measure.originChamberKey).toBe(chamberKey);
      expect(measure.sponsorPersonId).toBe(seat.personId);
      const restored = deserializeWorld(serializeWorld(filed.world));
      expect(
        resolveLegislativeAssignmentForMeasure(restored, {
          measureId: measure.id,
          playerPersonId: seat.personId,
        }).kind,
      ).toBe("available");
      const opened = openLegislativeWork(restored, {
        scenarioKey: capabilities.legislativeScenarioKey!,
        jurisdictionId: seat.jurisdictionId,
        playerPersonId: seat.personId,
      });
      expect(opened.assignment.procedure.committeeMemberCount).toBeNull();
      expect(opened.assignment.procedure.governorAction).toBeNull();
      const body = opened.assignment.procedure.bodies.find(
        (entry) => entry.chamberKey === chamberKey,
      );
      if (body)
        expect(
          body.members.some((member) => member.personId === seat.personId),
        ).toBe(true);
      // A chamber whose committees are unread refers to the stand-in
      // standing committee (owner decision 2026-09-23), never to none.
      const chamber = opened.assignment.procedure.pack.chambers.find(
        (entry) => entry.chamberKey === chamberKey,
      )!;
      expect(chamber.committees.length).toBeGreaterThan(0);
      const referred = applyLegislativeCommand(
        opened.world,
        opened.assignment,
        { kind: "take-step", step: "request-referral" },
      );
      const position = measurePosition(
        referred.world,
        opened.assignment.measureId,
      );
      expect(position.phase).toBe("in-committee");
      expect(
        chamber.committees.map((committee) => committee.committeeKey),
      ).toContain(position.committeeKey);
      const ended = endSuppliedSeat(opened.world);
      expect(resolveLegislativeFilingEntry(ended, seat.personId).kind).toBe(
        "unavailable",
      );
      expect(() =>
        applyLegislativeCommand(ended, opened.assignment, {
          kind: "take-step",
          step: "request-referral",
        }),
      ).toThrow(/current member seat/);
      assertWorldIntegrity(ended);
    },
  );

  it("reads a filed Alaska alias bill without borrowing its story procedure inputs", () => {
    const seat = suppliedLegislativeSeat("US-AK", "senate");
    const filed = fileDraftFromOffice(seat.world, {
      playerPersonId: seat.personId,
      scenarioKey: "alaska",
      jurisdictionId: seat.jurisdictionId,
      familyKey: "broadband-access",
      variantKey: "unserved-buildout",
    });
    const entry = resolveLegislativeAssignmentForMeasure(filed.world, {
      measureId: filed.bill.measureId,
      playerPersonId: seat.personId,
    });
    expect(entry.kind).toBe("available");
    if (entry.kind !== "available") throw new Error(entry.reason);
    expect(entry.assignment.procedure.bodies).toEqual([]);
    expect(entry.assignment.procedure.committeeMemberCount).toBeNull();
    expect(entry.assignment.procedure.votePlan).toEqual({});
    expect(entry.assignment.procedure.governorAction).toBeNull();
    const referred = applyLegislativeCommand(filed.world, entry.assignment, {
      kind: "take-step",
      step: "request-referral",
    });
    expect(measurePosition(referred.world, filed.bill.measureId).phase).toBe(
      "in-committee",
    );
    const before = serializeWorld(referred.world);
    expect(() =>
      applyLegislativeCommand(referred.world, entry.assignment, {
        kind: "take-step",
        step: "move-committee-report",
      }),
    ).toThrow(/no supplied member decisions/);
    expect(serializeWorld(referred.world)).toBe(before);
  });

  it("scopes committee absence to committee acts and preserves supplied floor questions", () => {
    const seat = suppliedLegislativeSeat("US-IL", "house");
    const opened = openLegislativeWork(seat.world, {
      scenarioKey: `institution:${seat.packId}`,
      jurisdictionId: seat.jurisdictionId,
      playerPersonId: seat.personId,
    });
    // A pack with no committee at all (a mod's, say): the stand-in covers
    // every shipped pack, so the absence is supplied here.
    const procedure = {
      ...opened.assignment.procedure,
      pack: {
        ...opened.assignment.procedure.pack,
        chambers: opened.assignment.procedure.pack.chambers.map((chamber) => ({
          ...chamber,
          committees: [],
        })),
      },
      bodies: [
        seatBodyForPack(
          "house",
          "Supplied fictional House sitting",
          118,
          [{ personId: seat.personId, name: "Supplied fictional member" }],
          true,
        ),
      ],
      votePlan: { "floor:house:": { yea: 0 } },
    };
    expect(
      legislativeProcedureRefusal(
        opened.world,
        procedure,
        "request-calendar-placement",
      ),
    ).toBeNull();
    expect(
      legislativeProcedureRefusal(opened.world, procedure, "move-floor-vote"),
    ).toBeNull();
    expect(
      legislativeProcedureRefusal(opened.world, procedure, "request-referral"),
    ).toContain("committee identity");
    expect(
      legislativeProcedureRefusal(
        opened.world,
        procedure,
        "await-executive-decision",
      ),
    ).toContain("No executive disposition");
  });
});
