import { describe, expect, it } from "vitest";
import { DEFAULT_NEW_GAME_SETUP } from "../../presentation/new-game";
import type { NewGameSetup } from "../../presentation/new-game";
import {
  generateOpeningLife,
  prepareOpeningLife,
  pressOpeningApplies,
} from "../../presentation/opening-life";
import {
  CRUNCH46_WORLD_OPENING_VERSION,
  worldOpeningVersionOf,
} from "../index";
import { createWorkRelationship } from "../life";
import { municipalOrganizationFor } from "../municipal-public-work";
import { assertWorldIntegrity } from "../world";
import type { EntityId, World } from "../types";
import {
  canInstitutionAct,
  outsideMandatePublicPaymentAvailable,
  recordOutsideMandatePublicPayment,
} from "./governing-adapter";
import { mediaOutlets } from "./outlets";
import { openMatter, recordAllegation } from "./matters";
import { pressRecordsOfKind } from "./store";
import { city } from "../../../tests/fixtures/public-program-fixture";

/**
 * CRUNCH47 B2: the composed seam, with no stand-ins left.
 *
 * PRESS's two placeholders are gone and GOVERNING's own writers are in their
 * place, so the misuse a story can be about is real public money leaving a
 * real appropriation — once. And the opening version decides whether a world
 * gets a newsroom at all, so a legacy save is built exactly as it always was.
 */

function employ(
  world: World,
  personId: EntityId,
  organizationId: EntityId,
  jurisdictionId: EntityId,
): { world: World; roleId: EntityId } {
  const next = createWorkRelationship(world, {
    stableKey: `seam:work:${personId}`,
    personId,
    organizationId,
    startedAt: world.currentDate,
    kind: "employment:executive-staff",
    compensation: "paid",
    authority: "directed",
    dependency: "dependent",
    economicRisk: "organization-borne",
    provenance: { kind: "authored", note: "B2 composed-seam fixture." },
    initialRole: {
      title: "Budget aide",
      occupationClassification: null,
      locationJurisdictionId: jurisdictionId,
      timeDemand: {
        expectedWeekly: { minimumHours: 30, maximumHours: 45 },
        attention: "high",
        concurrency: "mostly-exclusive",
        scheduleRigidity: "rigid",
        interruptibility: "limited",
        locationJurisdictionId: jurisdictionId,
      },
    },
  });
  return { world: next, roleId: next.history.workRoles.at(-1)!.id };
}

describe("B2 seam: public-fund misuse is reachable, and moves money once", () => {
  const fixture = city("b2-seam-misuse", 1_000_000_00);
  const staffer = fixture.world.personOrder[2]!;
  const government = municipalOrganizationFor(
    fixture.world,
    fixture.governmentKey,
  )!.id;
  const hired = employ(
    fixture.world,
    staffer,
    government,
    fixture.jurisdictionId,
  );
  const payment = {
    stableKey: "b2-seam:m7",
    payerPersonId: staffer,
    payerWorkRoleId: hired.roleId,
    fundingId: fixture.appropriationId,
    operationKey: "renovation",
    purposeUsed: "an office renovation",
    amountMinorUnits: 40_000_00,
    recipient: {
      kind: "organization" as const,
      organizationId: fixture.operator,
    },
    intent: "deliberate-outside-mandate" as const,
  };

  it("no longer refuses, because the real writer is in place", () => {
    expect(outsideMandatePublicPaymentAvailable()).toBe(true);
    const paid = recordOutsideMandatePublicPayment(hired.world, payment);
    expect(paid.resourceFlowId).toBeTruthy();
    const occurrence = paid.world.history.events.find(
      (event) => event.id === paid.occurrenceEventId,
    )!;
    // It happened, and it is nobody's news yet.
    expect(occurrence.visibility).toBe("private");
    // Running it again is the same money, not more of it.
    const again = recordOutsideMandatePublicPayment(paid.world, payment);
    expect(again.world).toBe(paid.world);
    assertWorldIntegrity(paid.world);
  });

  it("becomes a matter with a real occurrence behind it", () => {
    const paid = recordOutsideMandatePublicPayment(hired.world, payment);
    const opened = openMatter(paid.world, {
      stableKey: "b2-seam:matter",
      family: "M7",
      subjectPersonIds: [staffer],
      occurrenceId: null,
      originEventId: paid.occurrenceEventId,
      jurisdictionId: fixture.jurisdictionId,
    });
    expect(opened.matter.originEventId).toBe(paid.occurrenceEventId);
    const alleged = recordAllegation(opened.world, {
      stableKey: "b2-seam:allegation",
      matterId: opened.matter.id,
      allegerPersonId: paid.world.personOrder[3]!,
      statement: "Program money paid for an office renovation.",
      publicAllegation: true,
      basisEventIds: [],
    });
    expect(pressRecordsOfKind(alleged.world, "matter-allegation")).toHaveLength(
      1,
    );
    assertWorldIntegrity(alleged.world);
  });

  it("an authority answer names a procedure and never a finding", () => {
    const answer = canInstitutionAct(hired.world, {
      institution: "fec",
      action: "receive-complaint",
      subjectPersonId: staffer,
      onDate: hired.world.currentDate,
    });
    expect(["available", "unavailable", "unknown"]).toContain(answer.status);
    if (answer.status === "available") {
      expect(answer.sourceRefs.length).toBeGreaterThan(0);
    }
    // The answer is about procedure. It carries no verdict of any kind.
    expect(Object.keys(answer).sort()).toEqual([
      "note",
      "sourceRefs",
      "status",
    ]);
    // Removing somebody from office is not something this answers yes to
    // without compiled authority for that office.
    const removal = canInstitutionAct(hired.world, {
      institution: "party-conference",
      action: "remove-from-office",
      subjectPersonId: staffer,
      onDate: hired.world.currentDate,
    });
    expect(removal.status).not.toBe("available");
  });
});

describe("B2 seam: a newsroom only where the opening is a current one", () => {
  function opening(setup: Partial<NewGameSetup> & { seed: string }) {
    return generateOpeningLife(
      prepareOpeningLife({ ...DEFAULT_NEW_GAME_SETUP, ...setup })!,
    ).game!.world;
  }

  it("a current opening is given its media, once", () => {
    const world = opening({ seed: "b2-seam-current", startAge: 34 });
    expect(worldOpeningVersionOf(world)).toBe(CRUNCH46_WORLD_OPENING_VERSION);
    expect(mediaOutlets(world).length).toBeGreaterThan(0);
  });

  it("a world without the current opening version gets no press setup", () => {
    const world = opening({ seed: "b2-seam-legacy", startAge: 34 });
    expect(pressOpeningApplies(world)).toBe(true);
    // The same predicate, on a world that does not carry the version: this is
    // what a legacy replay descriptor reads as, and it is why such a save is
    // rebuilt exactly as it always was.
    const asLegacy: World = {
      ...world,
      history: { ...world.history, worldConditions: [] },
    };
    expect(worldOpeningVersionOf(asLegacy)).not.toBe(
      CRUNCH46_WORLD_OPENING_VERSION,
    );
    expect(pressOpeningApplies(asLegacy)).toBe(false);
  });
});
