import { describe, expect, it } from "vitest";
import { suppliedLegislativeSeat } from "../../tests/fixtures/supplied-legislative-seat";
import {
  deserializeWorld,
  serializeWorld,
  legislativeBlueprint,
  seatBodyForPack,
  authoredScenarioSeatCount,
  personName,
} from "../simulation";
import { fileDraft } from "./legislation-docket";
import { applyLegislativeStep } from "./legislation-session";
import { resolvePlayerCapabilities } from "./player-capabilities";
import { openLegislativeBargaining } from "./legislative-bargaining-world";
import { resolveActiveMemberSeat } from "./legislative-member-seat";

describe("recorded-docket entry boundary (supplied-seat regression)", () => {
  it("refuses an omitted docket without writing an eligible member's saved world", () => {
    const seat = suppliedLegislativeSeat("US-KY", "house");
    expect(resolveActiveMemberSeat(seat.world, seat.personId).kind).toBe(
      "seated",
    );
    const before = serializeWorld(seat.world);
    const entry = openLegislativeBargaining(seat.world, {
      playerPersonId: seat.personId,
    });
    expect(entry).toEqual({
      kind: "unavailable",
      reason:
        "Choose a recorded bill from your docket before opening the members' room.",
    });
    expect(serializeWorld(seat.world)).toBe(before);
    const reloaded = deserializeWorld(before);
    expect(
      openLegislativeBargaining(reloaded, { playerPersonId: seat.personId }),
    ).toEqual(entry);
    expect(serializeWorld(reloaded)).toBe(before);
  });

  it("opens only the explicitly filed bill and keeps its identity through reload", () => {
    const seat = suppliedLegislativeSeat("US-KY", "house");
    const capabilities = resolvePlayerCapabilities(seat.world);
    const scenarioKey = capabilities.legislativeScenarioKey!;
    const filed = fileDraft(seat.world, {
      scenarioKey,
      playerPersonId: seat.personId,
      jurisdictionId: capabilities.legislativeJurisdictionId!,
      familyKey: "broadband-access",
      variantKey: "unserved-buildout",
    });
    const blueprint = legislativeBlueprint(scenarioKey);
    const procedure = {
      pack: blueprint.pack,
      measureId: filed.bill.measureId,
      bodies: blueprint.pack.chambers.map((chamber, index) =>
        seatBodyForPack(
          chamber.chamberKey,
          chamber.name,
          authoredScenarioSeatCount(blueprint.pack, chamber.chamberKey),
          index === 0
            ? [
                {
                  personId: seat.personId,
                  name: personName(filed.world.people[seat.personId]!),
                },
              ]
            : [],
          blueprint.nonpartisan,
        ),
      ),
      committeeMemberCount:
        blueprint.pack.chambers[0]?.committees[0]?.appointedMembers ?? 7,
      votePlan: blueprint.votePlan,
      governorAction: blueprint.governorAction,
      governorRationale: blueprint.governorRationale,
    };
    let world = filed.world;
    for (const step of [
      "request-referral",
      "request-committee-hearing",
      "move-committee-report",
      "request-calendar-placement",
    ] as const) {
      world = applyLegislativeStep(procedure, world, step).world;
    }
    const input = {
      playerPersonId: seat.personId,
      docketKey: filed.bill.docketKey,
    };
    const entry = openLegislativeBargaining(world, input);
    expect(entry.kind).toBe("available");
    if (entry.kind !== "available") return;
    expect(entry.seat.progress.subjectFacts.designation).toBe(
      filed.bill.designation,
    );
    expect(entry.seat.progress.subjectFacts.shortTitle).toBe(
      "Unserved Area Buildout",
    );
    expect(JSON.stringify(entry.seat.progress.subjectFacts)).not.toMatch(
      /Ashland|transit|local match/i,
    );
    const saved = serializeWorld(entry.world);
    const reopened = openLegislativeBargaining(deserializeWorld(saved), input);
    expect(reopened.kind).toBe("available");
    if (reopened.kind !== "available") return;
    expect(reopened.seat.progress.subjectFacts).toEqual(
      entry.seat.progress.subjectFacts,
    );
    expect(serializeWorld(reopened.world)).toBe(saved);
    const invalid = openLegislativeBargaining(entry.world, {
      ...input,
      docketKey: "missing-recorded-bill",
    });
    expect(invalid).toEqual({
      kind: "unavailable",
      reason: "That bill is not on this character's docket.",
    });
    expect(serializeWorld(entry.world)).toBe(saved);
  });

  it("still rejects another character before the omitted-docket refusal", () => {
    const seat = suppliedLegislativeSeat("US-KY", "house");
    const before = serializeWorld(seat.world);
    const other = seat.world.personOrder.find((id) => id !== seat.personId)!;
    expect(() =>
      openLegislativeBargaining(seat.world, { playerPersonId: other }),
    ).toThrow(/controlled character/);
    expect(serializeWorld(seat.world)).toBe(before);
  });
});
