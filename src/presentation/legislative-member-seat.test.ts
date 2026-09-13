import { describe, expect, it } from "vitest";
import { resolveLegislativeFilingEntry } from "./legislative-filing-entry";
import { fileDraftFromOffice } from "./legislation-docket";

import {
  assertWorldIntegrity,
  createOrganization,
  createWorkRelationship,
  recordWorkStatus,
  serializeWorld,
  deserializeWorld,
  requireLifePlace,
  type EntityId,
  type World,
} from "../simulation";
import { createNewGameWorld, DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { openOrdinaryLife, passOrdinaryDays } from "./ordinary-life";
import { projectCampaign, spendAnAfternoon } from "./campaign-projection";
import { fileForOffice } from "../../tests/fixtures/campaign-fixture";
import {
  applyLegislativeCommand,
  openLegislativeWork,
} from "./legislation-world";
import { openLegislativeBargaining } from "./legislative-bargaining-world";
import { resolvePlayerCapabilities } from "./player-capabilities";
import { resolveActiveMemberSeat } from "./legislative-member-seat";
import {
  offerNegotiatedAmendment,
  takeNegotiatedFloorVote,
} from "./legislative-bargaining-actions";

/**
 * 79R1 — member authority at the bargaining boundary.
 *
 * The rejected 79F head let any active work relationship whose kind started
 * with `employment:legislative-` through to voting membership, and invented a
 * prior working history on the way in. These tests pin the repaired contract:
 * only a seat the canonical winner chain actually supports may bargain, every
 * other claim withholds without touching the world, and nothing a member did
 * not live through is written into their record.
 */

function newLife(seed: string) {
  const built = createNewGameWorld({
    ...DEFAULT_NEW_GAME_SETUP,
    seed,
    startAge: 34,
    placeKey: "lexington-fayette",
    gender: "male",
    pronouns: "he-him",
    questionnaire: "skipped",
  });
  return {
    world: openOrdinaryLife(built.world, built.playerPersonId),
    personId: built.playerPersonId,
  };
}

/** Registers Kentucky in the save the same way seatTheWinner does. */
function withKentucky(world: World): {
  world: World;
  jurisdictionId: EntityId;
} {
  const governing = requireLifePlace("kentucky").context.jurisdiction;
  const next = world.jurisdictions[governing.id]
    ? world
    : {
        ...world,
        jurisdictions: { ...world.jurisdictions, [governing.id]: governing },
        jurisdictionOrder: [...world.jurisdictionOrder, governing.id],
      };
  return { world: next, jurisdictionId: governing.id };
}

/**
 * Legislative work in Kentucky, recorded through the canonical writers, with
 * NO election behind it. `kind` decides what the job claims to be.
 */
function employedInLegislature(
  seed: string,
  kind: string,
): { world: World; personId: EntityId } {
  const life = newLife(seed);
  const registered = withKentucky(life.world);
  let world = createOrganization(registered.world, {
    stableKey: "79r1:legislature-employer",
    formedAt: world79r1Date(registered.world),
    detailLevel: "lightweight",
    provenance: { kind: "authored", note: "79R1 reproducer employer." },
    initialProfile: {
      name: "Kentucky General Assembly",
      classification: "sector:government",
      locationJurisdictionId: registered.jurisdictionId,
    },
  });
  const organizationId = world.history.organizations.find(
    (organization) => organization.stableKey === "79r1:legislature-employer",
  )!.id;
  world = createWorkRelationship(world, {
    stableKey: `79r1:${kind}:job`,
    personId: life.personId,
    organizationId,
    startedAt: world.currentDate,
    kind,
    compensation: "paid",
    authority: "directed",
    dependency: "partly-dependent",
    economicRisk: "organization-borne",
    provenance: { kind: "authored", note: "79R1 reproducer employment." },
    initialRole: {
      title: "Legislative employee",
      occupationClassification: null,
      locationJurisdictionId: registered.jurisdictionId,
      timeDemand: {
        expectedWeekly: { minimumHours: 20, maximumHours: 40 },
        attention: "high",
        concurrency: "partly-concurrent",
        scheduleRigidity: "mixed",
        interruptibility: "limited",
        locationJurisdictionId: registered.jurisdictionId,
      },
    },
  });
  assertWorldIntegrity(world);
  return { world, personId: life.personId };
}

/** Opens the bill and walks it to the floor through the ordinary route. */
function billOnTheFloor(world: World, personId: EntityId): World {
  const capabilities = resolvePlayerCapabilities(world);
  const opened = openLegislativeWork(world, {
    playerPersonId: personId,
    scenarioKey: capabilities.legislativeScenarioKey!,
    jurisdictionId: capabilities.legislativeJurisdictionId!,
  });
  let next = opened.world;
  for (const step of [
    "request-referral",
    "request-committee-hearing",
    "move-committee-report",
    "request-calendar-placement",
  ] as const) {
    next = applyLegislativeCommand(next, opened.assignment, {
      kind: "take-step",
      step,
    }).world;
  }
  return next;
}

/** The accepted PR85 win, unchanged from the 79F proofs. */
function wonSeat() {
  const life = newLife("p85c-owner-0");
  let world = fileForOffice(life.world, life.personId);
  world = spendAnAfternoon(world, life.personId, "fundraising");
  for (let index = 0; index < 3; index += 1) {
    world = passOrdinaryDays(world);
    world = spendAnAfternoon(world, life.personId, "outreach");
  }
  for (
    let day = 0;
    day < 60 && projectCampaign(world, life.personId).phase === "active";
    day += 1
  ) {
    world = passOrdinaryDays(world);
  }
  expect(projectCampaign(world, life.personId).phase).toBe("won");
  return { world, personId: life.personId };
}

function world79r1Date(world: World): string {
  return world.currentDate;
}

function expectFilingRefused(world: World, personId: EntityId) {
  const before = JSON.stringify(world);
  expect(resolveLegislativeFilingEntry(world, personId).kind).toBe(
    "unavailable",
  );
  expect(() =>
    fileDraftFromOffice(world, {
      playerPersonId: personId,
      scenarioKey: "kentucky-house",
      jurisdictionId: requireLifePlace("kentucky").context.jurisdiction.id,
      familyKey: "education-facilities",
      variantKey: "school-repair-authorization",
    }),
  ).toThrow(/member seat|no active office/);
  expect(JSON.stringify(world)).toBe(before);
}

describe("79R1 blocker 1 — employment prefix is not voting membership", () => {
  it("withholds bargaining from legislative staff who never won a seat", () => {
    const staffed = employedInLegislature(
      "79r1-staff",
      "employment:legislative-staff",
    );
    // The office and its bill remain legitimately reachable for staff.
    const capabilities = resolvePlayerCapabilities(staffed.world);
    expect(capabilities.office).toBe(true);
    expect(capabilities.legislation).toBe(true);
    const world = billOnTheFloor(staffed.world, staffed.personId);

    const before = serializeWorld(world);
    const entry = openLegislativeBargaining(world, {
      playerPersonId: staffed.personId,
    });
    expect(entry.kind).toBe("unavailable");
    if (entry.kind === "unavailable") {
      expect(entry.reason.length).toBeGreaterThan(0);
    }
    expectFilingRefused(world, staffed.personId);
    // A refused entry changes nothing.
    expect(serializeWorld(world)).toBe(before);
  });

  it("withholds bargaining from a misleading legislative- prefix", () => {
    const janitor = employedInLegislature(
      "79r1-janitor",
      "employment:legislative-janitor",
    );
    const world = billOnTheFloor(janitor.world, janitor.personId);
    const entry = openLegislativeBargaining(world, {
      playerPersonId: janitor.personId,
    });
    expect(entry.kind).toBe("unavailable");
  });

  it("withholds a member label that carries no won-seat provenance", () => {
    const labelled = employedInLegislature(
      "79r1-label",
      "employment:legislative-member",
    );
    const world = billOnTheFloor(labelled.world, labelled.personId);
    const resolution = resolveActiveMemberSeat(world, labelled.personId);
    expect(resolution.kind).toBe("unseated");
    const entry = openLegislativeBargaining(world, {
      playerPersonId: labelled.personId,
    });
    expect(entry.kind).toBe("unavailable");
  });

  it("seats the actual canonical winner, and only through the winner chain", () => {
    const won = wonSeat();
    const resolution = resolveActiveMemberSeat(won.world, won.personId);
    expect(resolution.kind).toBe("seated");
    if (resolution.kind !== "seated") return;
    expect(resolution.seat.chamberKey).toBe("house");
    expect(resolution.seat.governingJurisdictionId).toBe(
      requireLifePlace("kentucky").context.jurisdiction.id,
    );
    // The seat names the exact records it stands on.
    expect(resolution.seat.relationshipStableKey.endsWith(":seat")).toBe(true);
    expect(resolution.seat.outcomeEventId).toBeTruthy();
    const world = billOnTheFloor(won.world, won.personId);
    const entry = openLegislativeBargaining(world, {
      playerPersonId: won.personId,
    });
    expect(entry.kind).toBe("available");
  });

  it("withholds an ended membership, and refuses a stale seat at the action boundary", () => {
    const won = wonSeat();
    let world = billOnTheFloor(won.world, won.personId);
    const entry = openLegislativeBargaining(world, {
      playerPersonId: won.personId,
    });
    expect(entry.kind).toBe("available");
    if (entry.kind !== "available") return;
    world = entry.world;

    const seatRelationship = world.history.workRelationships.find(
      (relationship) =>
        relationship.personId === won.personId &&
        relationship.kind === "employment:legislative-member",
    )!;
    const latestStatus = world.history.workStatuses
      .filter((status) => status.workRelationshipId === seatRelationship.id)
      .at(-1)!;
    const ended = recordWorkStatus(world, {
      stableKey: "79r1:seat-ended",
      workRelationshipId: seatRelationship.id,
      effectiveAt: world.currentDate,
      status: "ended",
      reason: "left office",
      supersedesStatusId: latestStatus.id,
      provenance: { kind: "authored", note: "79R1 ended-membership probe." },
    });

    expect(resolveActiveMemberSeat(ended, won.personId).kind).toBe("unseated");
    expectFilingRefused(ended, won.personId);
    expect(
      openLegislativeBargaining(ended, { playerPersonId: won.personId }).kind,
    ).toBe("unavailable");

    // The seat resolved before the membership ended is stale: the write
    // boundary re-checks and refuses, and nothing is recorded.
    const before = serializeWorld(ended);
    expect(() =>
      offerNegotiatedAmendment(
        ended,
        entry.seat,
        entry.seat.progress,
        "capped",
      ),
    ).toThrow(/seat/i);
    expect(() =>
      takeNegotiatedFloorVote(ended, entry.seat, entry.seat.progress),
    ).toThrow(/seat/i);
    expect(serializeWorld(ended)).toBe(before);
  });
});

describe("79R1 — a member label cannot borrow an outcome it does not have", () => {
  /** A lost candidacy, played through the ordinary route. */
  function lostSeat() {
    for (let index = 0; index < 10; index += 1) {
      const life = newLife(`79r1-loss-${index}`);
      let world = fileForOffice(life.world, life.personId);
      world = spendAnAfternoon(world, life.personId, "fundraising");
      for (
        let day = 0;
        day < 60 && projectCampaign(world, life.personId).phase === "active";
        day += 1
      ) {
        world = passOrdinaryDays(world);
      }
      if (projectCampaign(world, life.personId).phase === "lost") {
        return { world, personId: life.personId };
      }
    }
    throw new Error("no seed produced a loss");
  }

  it("refuses a seat record whose campaign recorded a loss", () => {
    const lost = lostSeat();
    expectFilingRefused(lost.world, lost.personId);
    const campaign = (lost.world.history.campaigns ?? []).find(
      (record) => record.candidatePersonId === lost.personId,
    )!;
    const registered = withKentucky(lost.world);
    const organizationId = registered.world.history.organizations.find(
      (organization) =>
        organization.classification === "sector:government" ||
        organization.stableKey.startsWith("legislature:"),
    );
    let world = registered.world;
    if (!organizationId) {
      world = createOrganization(world, {
        stableKey: "79r1:loss-legislature",
        formedAt: world.currentDate,
        detailLevel: "lightweight",
        provenance: { kind: "authored", note: "79R1 loss probe." },
        initialProfile: {
          name: "Kentucky General Assembly",
          classification: "sector:government",
          locationJurisdictionId: registered.jurisdictionId,
        },
      });
    }
    const orgId = (organizationId ??
      world.history.organizations.find(
        (organization) => organization.stableKey === "79r1:loss-legislature",
      ))!.id;
    const outcomeEvent = world.history.events.at(-1)!;
    world = createWorkRelationship(world, {
      stableKey: `${campaign.stableKey}:seat`,
      personId: lost.personId,
      organizationId: orgId,
      startedAt: world.currentDate,
      kind: "employment:legislative-member",
      compensation: "paid",
      authority: "shared",
      dependency: "partly-dependent",
      economicRisk: "organization-borne",
      provenance: { kind: "simulated-event", eventId: outcomeEvent.id },
      initialRole: {
        title: "State Representative",
        occupationClassification: null,
        locationJurisdictionId: registered.jurisdictionId,
        timeDemand: {
          expectedWeekly: { minimumHours: 10, maximumHours: 45 },
          attention: "high",
          concurrency: "partly-concurrent",
          scheduleRigidity: "mixed",
          interruptibility: "limited",
          locationJurisdictionId: registered.jurisdictionId,
        },
      },
    });
    assertWorldIntegrity(world);
    const resolution = resolveActiveMemberSeat(world, lost.personId);
    expect(resolution.kind).toBe("unseated");
    if (resolution.kind === "unseated") {
      expect(resolution.reason).toMatch(/did not record a win/);
    }
  });

  it("refuses a seat record that stands on another person's campaign", () => {
    const won = wonSeat();
    const campaign = (won.world.history.campaigns ?? []).find(
      (record) => record.candidatePersonId === won.personId,
    )!;
    const otherPersonId = won.world.personOrder.find(
      (personId) => personId !== won.personId,
    )!;
    const seatRelationship = won.world.history.workRelationships.find(
      (relationship) => relationship.stableKey === `${campaign.stableKey}:seat`,
    )!;
    const world = createWorkRelationship(won.world, {
      stableKey: `${campaign.stableKey}:seat:copy`,
      personId: otherPersonId,
      organizationId: seatRelationship.organizationId!,
      startedAt: won.world.currentDate,
      kind: "employment:legislative-member",
      compensation: "paid",
      authority: "shared",
      dependency: "partly-dependent",
      economicRisk: "organization-borne",
      provenance: seatRelationship.provenance,
      initialRole: {
        title: "State Representative",
        occupationClassification: null,
        locationJurisdictionId: seatRelationship.id
          ? requireLifePlace("kentucky").context.jurisdiction.id
          : null,
        timeDemand: {
          expectedWeekly: { minimumHours: 10, maximumHours: 45 },
          attention: "high",
          concurrency: "partly-concurrent",
          scheduleRigidity: "mixed",
          interruptibility: "limited",
          locationJurisdictionId:
            requireLifePlace("kentucky").context.jurisdiction.id,
        },
      },
    });
    // The copied label does not even carry the seat stable-key shape; and a
    // corrected key would still trip the another-person's-campaign check. The
    // resolver refuses either way.
    expect(resolveActiveMemberSeat(world, otherPersonId).kind).toBe("unseated");
  });
});

describe("79R1 blocker 2 — entry invents no prior history", () => {
  it("adds no relationship records on first entry, re-entry, or reload", () => {
    const won = wonSeat();
    const world = billOnTheFloor(won.world, won.personId);
    const before = world.history.relationshipInteractions.length;

    const entry = openLegislativeBargaining(world, {
      playerPersonId: won.personId,
    });
    expect(entry.kind).toBe("available");
    if (entry.kind !== "available") return;
    expect(entry.world.history.relationshipInteractions.length).toBe(before);
    expect(
      entry.world.history.relationshipInteractions.some((record) =>
        record.stableKey.startsWith("legislative-work:kentucky:prior:"),
      ),
    ).toBe(false);

    const again = openLegislativeBargaining(entry.world, {
      playerPersonId: won.personId,
    });
    expect(again.kind).toBe("available");
    if (again.kind !== "available") return;
    expect(again.world.history.relationshipInteractions.length).toBe(before);
  });

  it("does not claim shared work the record does not carry", () => {
    const won = wonSeat();
    const world = billOnTheFloor(won.world, won.personId);
    const entry = openLegislativeBargaining(world, {
      playerPersonId: won.personId,
    });
    expect(entry.kind).toBe("available");
    if (entry.kind !== "available") return;
    for (const person of entry.seat.scenePeople) {
      expect(person.qualitativeRead).not.toMatch(/worked together before/i);
    }
  });
});

describe("LEG-ENTRY6 normal filing authority", () => {
  it("files under the actual winner and preserves the election chain through reload", () => {
    const won = wonSeat();
    const before = serializeWorld(won.world);
    const entry = resolveLegislativeFilingEntry(won.world, won.personId);
    expect(serializeWorld(won.world)).toBe(before);
    expect(entry.kind).toBe("available");
    if (entry.kind !== "available")
      throw new Error("Expected canonical member entry");
    const filed = fileDraftFromOffice(won.world, {
      playerPersonId: won.personId,
      scenarioKey: entry.scenarioKey,
      jurisdictionId: entry.jurisdictionId,
      familyKey: "education-facilities",
      variantKey: "school-repair-authorization",
    });
    const measure = filed.world.history.legislativeMeasures!.find(
      (r) => r.id === filed.bill.measureId,
    )!;
    expect(measure.sponsorPersonId).toBe(won.personId);
    expect(measure.originChamberKey).toBe(entry.seat.chamberKey);
    expect(filed.world.history.campaigns).toEqual(won.world.history.campaigns);
    expect(filed.world.history.electionContestResults).toEqual(
      won.world.history.electionContestResults,
    );
    expect(filed.world.history.workRelationships).toEqual(
      won.world.history.workRelationships,
    );
    const restored = deserializeWorld(serializeWorld(filed.world));
    expect(resolveLegislativeFilingEntry(restored, won.personId)).toEqual(
      entry,
    );
    assertWorldIntegrity(restored);
  });

  it("refuses ambiguous active seat records without choosing the first", () => {
    const won = wonSeat();
    const seat = resolveActiveMemberSeat(won.world, won.personId);
    if (seat.kind !== "seated") throw new Error("Expected canonical member");
    const original = won.world.history.workRelationships.find(
      (r) => r.id === seat.seat.relationshipId,
    )!;
    // Deliberate malformed-save control: two active claims backed by the same
    // outcome must never be resolved by array order. No success uses this data.
    const duplicateId = `${original.id}:ambiguous` as EntityId;
    const ambiguous = {
      ...won.world,
      history: {
        ...won.world.history,
        workRelationships: [
          ...won.world.history.workRelationships,
          { ...original, id: duplicateId },
        ],
        workStatuses: [
          ...won.world.history.workStatuses,
          ...won.world.history.workStatuses
            .filter((r) => r.workRelationshipId === original.id)
            .map((r) => ({
              ...r,
              id: `${r.id}:ambiguous` as EntityId,
              workRelationshipId: duplicateId,
            })),
        ],
        workRoles: [
          ...won.world.history.workRoles,
          ...won.world.history.workRoles
            .filter((r) => r.workRelationshipId === original.id)
            .map((r) => ({
              ...r,
              id: `${r.id}:ambiguous` as EntityId,
              workRelationshipId: duplicateId,
            })),
        ],
      },
    };
    expect(resolveActiveMemberSeat(ambiguous, won.personId)).toMatchObject({
      kind: "unseated",
      reason: expect.stringMatching(/More than one/),
    });
    expectFilingRefused(ambiguous, won.personId);
  });
});
