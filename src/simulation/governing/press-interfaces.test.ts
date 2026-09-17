import { describe, expect, it } from "vitest";

import { createWorkRelationship } from "../life";
import { municipalOrganizationFor } from "../municipal-public-work";
import { projectCongress } from "../living-world/congress";
import { DEFAULT_NEW_GAME_SETUP } from "../../presentation/new-game";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../../presentation/opening-life";
import { openOrdinaryLife } from "../../presentation/ordinary-life";
import { deserializeWorld, serializeWorld } from "../serialization";
import type { EntityId, World } from "../types";
import { canInstitutionAct } from "./institution-authority";
import {
  OUTSIDE_MANDATE_TAG,
  outsideMandatePayments,
  recordOutsideMandatePublicPayment,
} from "./outside-mandate-payment";
import { programPosition } from "./public-program";
import {
  TRANSIT,
  cash,
  city,
} from "../../../tests/fixtures/public-program-fixture";

function employ(
  world: World,
  personId: EntityId,
  organizationId: EntityId,
  jurisdictionId: EntityId,
): { world: World; roleId: EntityId } {
  const next = createWorkRelationship(world, {
    stableKey: `press-if:work:${personId}`,
    personId,
    organizationId,
    startedAt: world.currentDate,
    kind: "employment:executive-staff",
    compensation: "paid",
    authority: "directed",
    dependency: "dependent",
    economicRisk: "organization-borne",
    provenance: { kind: "authored", note: "PRESS interface fixture." },
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

describe("GOVERNING for PRESS: outside-mandate public payments", () => {
  it("moves real public cash once, privately labelled, and refuses without access or cash", () => {
    const g = city("press-misuse", 1_000_000_00);
    const staffer = g.world.personOrder[2]!;
    const outsider = g.world.personOrder[3]!;
    const government = municipalOrganizationFor(g.world, g.governmentKey)!.id;
    const hired = employ(g.world, staffer, government, g.jurisdictionId);
    const input = {
      stableKey: "press:m7:1",
      payerPersonId: staffer,
      payerWorkRoleId: hired.roleId,
      fundingId: g.appropriationId,
      operationKey: "renovation",
      purposeUsed: "an office renovation",
      amountMinorUnits: 40_000_00,
      recipient: { kind: "organization" as const, organizationId: g.operator },
      intent: "deliberate-outside-mandate" as const,
    };
    const paid = recordOutsideMandatePublicPayment(hired.world, input);
    expect(cash(paid.world, g.account)).toBe(960_000_00);
    const event = paid.world.history.events.find(
      (e) => e.id === paid.occurrenceEventId,
    )!;
    expect(event.visibility).toBe("private");
    expect(event.tags).toContain(OUTSIDE_MANDATE_TAG);
    // Replaying the same operation writes nothing more.
    const again = recordOutsideMandatePublicPayment(paid.world, input);
    expect(again.world).toBe(paid.world);
    expect(outsideMandatePayments(paid.world, g.appropriationId)).toHaveLength(
      1,
    );
    // The appropriation was never lawfully committed, so it is not reduced.
    expect(programPosition(paid.world, TRANSIT).committed.minorUnits).toBe(0);
    // No position with access: refused, nothing written.
    const stranger = employ(paid.world, outsider, g.payer, g.jurisdictionId);
    expect(() =>
      recordOutsideMandatePublicPayment(stranger.world, {
        ...input,
        operationKey: "other",
        payerPersonId: outsider,
        payerWorkRoleId: stranger.roleId,
      }),
    ).toThrow(/no current position/);
    expect(() =>
      recordOutsideMandatePublicPayment(paid.world, {
        ...input,
        operationKey: "too-much",
        amountMinorUnits: 5_000_000_00,
      }),
    ).toThrow(/cash/);
    const reopened = deserializeWorld(serializeWorld(paid.world));
    expect(cash(reopened, g.account)).toBe(960_000_00);
  });
});

describe("GOVERNING for PRESS: what an institution may do", () => {
  it("answers from compiled authority and never guesses", () => {
    const game = generateOpeningLife(
      prepareOpeningLife({
        ...DEFAULT_NEW_GAME_SETUP,
        seed: "press-authority",
      }),
    ).game!;
    const world = openOrdinaryLife(game.world, game.playerPersonId);
    const representative = projectCongress(world)!.house.seats.find(
      (s) => s.occupant.kind === "member",
    )!.occupant;
    if (representative.kind !== "member") throw new Error("fixture");
    const member = representative.member.personId;
    const ask = (
      institution: Parameters<typeof canInstitutionAct>[1]["institution"],
      action: Parameters<typeof canInstitutionAct>[1]["action"],
      subjectPersonId: EntityId = member,
    ) =>
      canInstitutionAct(world, {
        institution,
        action,
        subjectPersonId,
        onDate: world.currentDate,
      });
    expect(ask("chamber-floor", "expel").status).toBe("available");
    expect(ask("chamber-floor", "expel").note).toMatch(/two thirds/);
    expect(ask("us-house-ethics", "open-inquiry").status).toBe("available");
    expect(ask("us-house-ethics", "expel").status).toBe("unavailable");
    expect(ask("us-senate-ethics", "open-inquiry").status).toBe("unavailable");
    expect(ask("chamber-floor", "censure", game.playerPersonId).status).toBe(
      "unavailable",
    );
    expect(ask("fec", "civil-penalty").status).toBe("available");
    expect(ask("fec", "remove-from-office").status).toBe("unavailable");
    expect(ask("party-conference", "strip-committee-assignment").status).toBe(
      "unknown",
    );
    expect(ask("state-auditor:ky", "audit-agency").status).toBe("unknown");
    expect(
      canInstitutionAct(world, {
        institution: "fec",
        action: "open-inquiry",
        subjectPersonId: member,
        onDate: "2099-01-01" as World["currentDate"],
      }).status,
    ).toBe("unknown");
    for (const answer of [ask("chamber-floor", "expel"), ask("fec", "dismiss")])
      expect(answer.sourceRefs.length).toBeGreaterThan(0);
  }, 300_000);
});
