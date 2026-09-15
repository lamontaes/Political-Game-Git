import { describe, expect, it } from "vitest";
import {
  addSuppliedLegislativeSeat,
  endSuppliedSeat,
  suppliedLegislativeSeat,
} from "../../tests/fixtures/supplied-legislative-seat";
import {
  assertWorldIntegrity,
  createWorkRelationship,
  currentMeasureProvisions,
  deserializeWorld,
  serializeWorld,
} from "../simulation";
import { standingAuthorities } from "../simulation/legislation-program-families";
import { fileDraft, fileDraftFromOffice } from "./legislation-docket";
import {
  activeMemberSeats,
  resolveActiveMemberSeat,
  type MemberSeatScope,
} from "./legislative-member-seat";
import { resolveLegislativeFilingEntry } from "./legislative-filing-entry";
import {
  currentCompositionDraft,
  saveBillComposition,
} from "./legislation-composition";
import { openFiscalAuthorityWork } from "./fiscal-authority-work";
import { projectLegislativeOfficeContext } from "./legislative-office-context";
import {
  prepareRecordedLegislativeSitting,
  readRecordedLegislativeSitting,
} from "./legislative-authored-sitting";
import {
  applyLegislativeCommand,
  resolveLegislativeAssignmentForMeasure,
} from "./legislation-world";

function twoSeats() {
  const first = suppliedLegislativeSeat("US-AK", "house");
  const second = addSuppliedLegislativeSeat(
    first.world,
    first.personId,
    "US-AK",
    "senate",
    "s30-s:second-seat",
  );
  return {
    ...second,
    seats: activeMemberSeats(second.world, second.personId),
  };
}

function filingInput(fixture: ReturnType<typeof twoSeats>) {
  return {
    playerPersonId: fixture.personId,
    scenarioKey: "alaska",
    jurisdictionId: fixture.jurisdictionId,
    familyKey: "appropriations",
    variantKey: "single-programme",
    authorityKey: standingAuthorities().find(
      (entry) => entry.authorizesSpending,
    )!.authorityKey,
  };
}

describe("multiple supported legislative seats with explicit action scope", () => {
  it("retains independent winning work chains through reload without selecting one", () => {
    const fixture = twoSeats();
    const before = serializeWorld(fixture.world);
    expect(fixture.seats.map((seat) => seat.chamberKey).sort()).toEqual([
      "house",
      "senate",
    ]);
    expect(
      resolveActiveMemberSeat(fixture.world, fixture.personId),
    ).toMatchObject({
      kind: "ambiguous",
      seats: fixture.seats,
    });
    const restored = deserializeWorld(before);
    expect(activeMemberSeats(restored, fixture.personId)).toEqual(
      fixture.seats,
    );
    expect(serializeWorld(fixture.world)).toBe(before);
    expect(restored.history.decisionTraces).toEqual(
      fixture.world.history.decisionTraces,
    );
    assertWorldIntegrity(restored);
  });

  it("never falls back to the first office for an unscoped or contradictory action", () => {
    const fixture = twoSeats();
    const before = serializeWorld(fixture.world);
    const input = filingInput(fixture);
    expect(
      resolveLegislativeFilingEntry(fixture.world, fixture.personId).kind,
    ).toBe("unavailable");
    expect(() => fileDraftFromOffice(fixture.world, input)).toThrow(
      /More than one/,
    );
    expect(() => fileDraft(fixture.world, input)).toThrow(/More than one/);
    const house = fixture.seats.find((seat) => seat.chamberKey === "house")!;
    expect(
      resolveActiveMemberSeat(fixture.world, fixture.personId, {
        relationshipStableKey: house.relationshipStableKey,
        chamberKey: "senate",
      }).kind,
    ).toBe("unseated");
    expect(
      resolveActiveMemberSeat(fixture.world, fixture.personId, {}).kind,
    ).toBe("unseated");
    expect(
      resolveActiveMemberSeat(
        fixture.world,
        fixture.personId,
        null as unknown as MemberSeatScope,
      ).kind,
    ).toBe("unseated");
    expect(() =>
      fileDraftFromOffice(fixture.world, {
        ...input,
        memberSeatStableKey: "no-such-seat",
      }),
    ).toThrow(/seat scope/);
    expect(serializeWorld(fixture.world)).toBe(before);
  });

  it.each(["house", "senate"])(
    "files from the explicitly selected %s work chain",
    (chamberKey) => {
      const fixture = twoSeats();
      const selected = fixture.seats.find(
        (seat) => seat.chamberKey === chamberKey,
      )!;
      const entry = resolveLegislativeFilingEntry(
        fixture.world,
        fixture.personId,
        {
          relationshipId: selected.relationshipId,
        },
      );
      expect(entry.kind).toBe("available");
      const filed = fileDraftFromOffice(fixture.world, {
        ...filingInput(fixture),
        memberSeatStableKey: selected.relationshipStableKey,
      });
      const measure = filed.world.history.legislativeMeasures!.find(
        (record) => record.id === filed.bill.measureId,
      )!;
      expect(measure.originChamberKey).toBe(chamberKey);
      expect(measure.sponsorPersonId).toBe(fixture.personId);
      expect(filed.world.history.workRelationships).toEqual(
        fixture.world.history.workRelationships,
      );
      expect(activeMemberSeats(filed.world, fixture.personId)).toEqual(
        fixture.seats,
      );
      expect(
        projectLegislativeOfficeContext(
          filed.world,
          fixture.personId,
          measure.id,
        ).member.kind,
      ).toBe("unavailable");
      expect(
        projectLegislativeOfficeContext(
          filed.world,
          fixture.personId,
          measure.id,
          {
            relationshipStableKey: selected.relationshipStableKey,
          },
        ).member,
      ).toMatchObject({ kind: "member", seat: selected });
      assertWorldIntegrity(filed.world);
    },
  );

  it("binds the recorded sitting and commands to the selected seat across reload", () => {
    const fixture = twoSeats();
    const selected = fixture.seats.find((seat) => seat.chamberKey === "house")!;
    const other = fixture.seats.find((seat) => seat.chamberKey === "senate")!;
    const filed = fileDraftFromOffice(fixture.world, {
      ...filingInput(fixture),
      memberSeatStableKey: selected.relationshipStableKey,
    });
    const input = {
      measureId: filed.bill.measureId,
      playerPersonId: fixture.personId,
      memberSeatStableKey: selected.relationshipStableKey,
    };
    const admitted = prepareRecordedLegislativeSitting(filed.world, {
      ...input,
      playerBallot: "nay",
    });
    const world = deserializeWorld(serializeWorld(admitted));
    expect(
      readRecordedLegislativeSitting(world, {
        ...input,
        memberSeatStableKey: other.relationshipStableKey,
      }),
    ).toBeNull();
    expect(
      resolveLegislativeAssignmentForMeasure(world, {
        measureId: input.measureId,
        playerPersonId: input.playerPersonId,
      }).kind,
    ).toBe("unavailable");
    const entry = resolveLegislativeAssignmentForMeasure(world, input);
    if (entry.kind !== "available") throw new Error(entry.reason);
    expect(entry.assignment.memberSeatStableKey).toBe(
      selected.relationshipStableKey,
    );
    expect(entry.assignment.procedure.recordedPlayerBallot).toBe("nay");
    const result = applyLegislativeCommand(world, entry.assignment, {
      kind: "take-step",
      step: "request-referral",
    });
    expect(activeMemberSeats(result.world, fixture.personId)).toEqual(
      fixture.seats,
    );
    assertWorldIntegrity(result.world);
    const ended = endSuppliedSeat(world);
    const before = serializeWorld(ended);
    expect(() =>
      applyLegislativeCommand(ended, entry.assignment, {
        kind: "take-step",
        step: "request-referral",
      }),
    ).toThrow(/current member seat/);
    expect(serializeWorld(ended)).toBe(before);
    expect(
      activeMemberSeats(ended, fixture.personId).map((seat) => seat.chamberKey),
    ).toEqual(["senate"]);
  });

  it("ending one recorded office preserves the other and never redirects a stale selection", () => {
    const fixture = twoSeats();
    const selected = fixture.seats.find((seat) => seat.chamberKey === "house")!;
    const ended = endSuppliedSeat(fixture.world);
    expect(
      activeMemberSeats(ended, fixture.personId).map((seat) => seat.chamberKey),
    ).toEqual(["senate"]);
    expect(
      resolveActiveMemberSeat(ended, fixture.personId, {
        relationshipStableKey: selected.relationshipStableKey,
      }).kind,
    ).toBe("unseated");
    expect(() =>
      fileDraftFromOffice(ended, {
        ...filingInput(fixture),
        memberSeatStableKey: selected.relationshipStableKey,
      }),
    ).toThrow(/seat scope/);
    expect(resolveActiveMemberSeat(ended, fixture.personId).kind).toBe(
      "seated",
    );
    assertWorldIntegrity(ended);
  });

  it("does not admit an unsupported work label into the valid-office collection", () => {
    const fixture = twoSeats();
    const labelled = createWorkRelationship(fixture.world, {
      stableKey: "s30-s:unsupported-member-claim",
      personId: fixture.personId,
      organizationId: fixture.seats[0]!.organizationId,
      startedAt: fixture.world.currentDate,
      kind: "employment:legislative-member",
      compensation: "unpaid",
      authority: "shared",
      dependency: "independent",
      economicRisk: "person-borne",
      provenance: {
        kind: "authored",
        note: "Unsupported work-label control; no winning chain.",
      },
      initialRole: {
        title: "Unsupported claim",
        occupationClassification: "service:elected-legislator",
        locationJurisdictionId: fixture.jurisdictionId,
        timeDemand: fixture.world.history.workRoles.find(
          (role) =>
            role.workRelationshipId === fixture.seats[0]!.relationshipId,
        )!.timeDemand,
      },
    });
    expect(activeMemberSeats(labelled, fixture.personId)).toEqual(
      fixture.seats,
    );
    assertWorldIntegrity(labelled);
  });

  it("scopes a private working document without changing its bill or either office", () => {
    const fixture = twoSeats();
    const selected = fixture.seats.find((seat) => seat.chamberKey === "house")!;
    const filed = fileDraftFromOffice(fixture.world, {
      ...filingInput(fixture),
      memberSeatStableKey: selected.relationshipStableKey,
    });
    const base = currentCompositionDraft(
      filed.world,
      filed.bill,
      fixture.personId,
    );
    const amount = base.parameterValues.appropriation;
    if (amount?.kind !== "money")
      throw new Error("Expected supplied appropriation parameter.");
    const input = {
      scenarioKey: "alaska",
      docketKey: filed.bill.docketKey,
      playerPersonId: fixture.personId,
      expectedProvisionIds: currentMeasureProvisions(
        filed.world,
        filed.bill.measureId,
      ).map((record) => record.id),
      parameterValues: {
        ...base.parameterValues,
        appropriation: { ...amount, minorUnits: amount.minorUnits - 1 },
      },
    };
    const before = serializeWorld(filed.world);
    expect(() => saveBillComposition(filed.world, input)).toThrow(
      /member seat/,
    );
    expect(serializeWorld(filed.world)).toBe(before);
    const saved = saveBillComposition(filed.world, {
      ...input,
      memberSeatStableKey: selected.relationshipStableKey,
    });
    expect(currentMeasureProvisions(saved.world, filed.bill.measureId)).toEqual(
      currentMeasureProvisions(filed.world, filed.bill.measureId),
    );
    expect(activeMemberSeats(saved.world, fixture.personId)).toEqual(
      fixture.seats,
    );
    expect(saved.world.history.decisionTraces).toEqual(
      filed.world.history.decisionTraces,
    );
    assertWorldIntegrity(saved.world);
  });

  it("refuses a changed exact payload even when its provision IDs are retained", () => {
    const fixture = twoSeats();
    const selected = fixture.seats.find((seat) => seat.chamberKey === "house")!;
    const filed = fileDraftFromOffice(fixture.world, {
      ...filingInput(fixture),
      memberSeatStableKey: selected.relationshipStableKey,
    });
    const input = {
      measureId: filed.bill.measureId,
      playerPersonId: fixture.personId,
      memberSeatStableKey: selected.relationshipStableKey,
    };
    const admitted = prepareRecordedLegislativeSitting(filed.world, {
      ...input,
      playerBallot: "nay",
    });
    const entry = resolveLegislativeAssignmentForMeasure(admitted, input);
    if (entry.kind !== "available") throw new Error(entry.reason);
    // Adversarial supplied-state control, not a production mutation writer.
    const changed = {
      ...admitted,
      history: {
        ...admitted.history,
        legislativeProvisions: admitted.history.legislativeProvisions!.map(
          (record) =>
            record.measureId === input.measureId
              ? {
                  ...record,
                  text: record.text + " Supplied changed-text control.",
                }
              : record,
        ),
      },
    };
    const before = serializeWorld(changed);
    expect(readRecordedLegislativeSitting(changed, input)).toBeNull();
    expect(() =>
      applyLegislativeCommand(changed, entry.assignment, {
        kind: "take-step",
        step: "request-referral",
      }),
    ).toThrow(/recorded sitting no longer matches/);
    expect(serializeWorld(changed)).toBe(before);
    expect(activeMemberSeats(changed, fixture.personId)).toEqual(fixture.seats);
  });

  it("scopes fiscal study to the selected live office without inventing a legal baseline", () => {
    const fixture = twoSeats();
    const selected = fixture.seats.find(
      (seat) => seat.chamberKey === "senate",
    )!;
    const request = {
      personId: fixture.personId,
      stateUsps: "AK",
      level: "state",
      instrument: "selective-excise",
      asOfDate: fixture.world.currentDate,
      action: "propose-authority-change" as const,
    };
    const unscoped = openFiscalAuthorityWork(fixture.world, [], request);
    expect(unscoped.kind).toBe("refused");
    expect(unscoped.world).toBe(fixture.world);
    const scoped = openFiscalAuthorityWork(fixture.world, [], {
      ...request,
      memberSeatStableKey: selected.relationshipStableKey,
    });
    expect(scoped.kind).toBe("opened");
    expect(scoped.authority.state).toBe("UNESTABLISHED");
    expect(activeMemberSeats(scoped.world, fixture.personId)).toEqual(
      fixture.seats,
    );
    expect(scoped.world.history.decisionTraces).toEqual(
      fixture.world.history.decisionTraces,
    );
    assertWorldIntegrity(scoped.world);
  });
});
