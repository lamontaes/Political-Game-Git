import { describe, expect, it } from "vitest";

import {
  assertWorldIntegrity,
  advanceWorld,
  createCampaignElectionTransitionRegistry,
  availableMeasureSteps,
  measurePosition,
  recordWorkRole,
  recordWorkStatus,
  requireLifePlace,
  serializeWorld,
  type EntityId,
  type MeasureStepKey,
  type World,
} from "../simulation";
import { createNewGameWorld, DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { openOrdinaryLife, passOrdinaryDays } from "./ordinary-life";
import {
  fileForOffice,
  projectCampaign,
  spendAnAfternoon,
} from "./campaign-projection";
import {
  applyLegislativeCommand,
  openLegislativeWork,
  type LegislativeAssignment,
} from "./legislation-world";
import { openLegislativeBargaining } from "./legislative-bargaining-world";
import { resolvePlayerCapabilities } from "./player-capabilities";
import { resolveActiveMemberSeat } from "./legislative-member-seat";
import {
  offerNegotiatedAmendment,
  takeNegotiatedFloorVote,
} from "./legislative-bargaining-actions";
import type { LegislativeBargainingSeat } from "./legislative-bargaining-brief";

/**
 * 79R2 — action-time authority is current, not cached.
 *
 * The 79R1 head re-checked only that the member's seat record still resolved.
 * It did not ask where the bill was. A House member could open the members'
 * room, keep the returned context, pass HB 214 out of the House, transmit it
 * to the Senate — at which point a fresh entry correctly refused — and then
 * call the two floor actions with the retained House context. Both wrote: an
 * amendment and a recorded vote taken in a chamber the member does not sit in,
 * in Worlds that still passed integrity validation.
 *
 * These tests reproduce that exact route and pin the repaired contract: the
 * write boundary re-resolves membership AND re-reads the live measure, and
 * refuses before the first byte when the two do not agree.
 */

/* -------------------------------------------------------------------------- */
/* Canonical route helpers — production writers only, no synthetic shortcuts    */
/* -------------------------------------------------------------------------- */

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

/** One ordinary campaign, played through, ending in a recorded win. */
function runOneRace(world: World, personId: EntityId): World {
  let next = fileForOffice(world, personId);
  for (let index = 0; index < 4; index += 1) {
    next = advanceWorld(next, 1, createCampaignElectionTransitionRegistry());
    try {
      next = spendAnAfternoon(
        next,
        personId,
        index === 0 ? "fundraising" : "outreach",
      );
    } catch {
      // The day was already spoken for. Campaigning is not the point here.
    }
  }
  for (
    let day = 0;
    day < 60 && projectCampaign(next, personId).phase === "active";
    day += 1
  ) {
    next = advanceWorld(next, 1, createCampaignElectionTransitionRegistry());
  }
  return next;
}

/** The accepted first-win route, unchanged from the 79R1 proofs. */
function wonSeat(seed = "p85c-owner-0") {
  const life = newLife(seed);
  const world = runOneRace(life.world, life.personId);
  expect(projectCampaign(world, life.personId).phase).toBe("won");
  return { world, personId: life.personId };
}

function openBill(world: World, personId: EntityId) {
  const capabilities = resolvePlayerCapabilities(world);
  return openLegislativeWork(world, {
    playerPersonId: personId,
    scenarioKey: capabilities.legislativeScenarioKey!,
    jurisdictionId: capabilities.legislativeJurisdictionId!,
  });
}

/**
 * Walks the measure through the rules until it is on the floor of `chamberKey`,
 * taking whatever step the rule pack actually offers next. Floor amendments are
 * skipped so the walk advances instead of amending in place; nothing else about
 * the ordinary route is bypassed.
 */
function walkToFloorOf(
  world: World,
  assignment: LegislativeAssignment,
  chamberKey: string,
): World {
  let next = world;
  for (let step = 0; step < 40; step += 1) {
    const position = measurePosition(next, assignment.measureId);
    if (position.phase === "on-floor" && position.chamberKey === chamberKey) {
      return next;
    }
    const steps: readonly MeasureStepKey[] = availableMeasureSteps(
      next,
      assignment.measureId,
    );
    const chosen = steps.find((key) => key !== "offer-amendment") ?? steps[0];
    if (!chosen) break;
    next = applyLegislativeCommand(next, assignment, {
      kind: "take-step",
      step: chosen,
    }).world;
  }
  throw new Error(`The measure never reached the ${chamberKey} floor.`);
}

/**
 * The exact 79A2 reproducer setup: a canonical first-win member, their bill on
 * their own House floor, the bargaining context opened and RETAINED, and then
 * the bill passed out of the House and transmitted to the Senate.
 */
function retainedHouseContextAfterTransmittal() {
  const won = wonSeat();
  const opened = openBill(won.world, won.personId);
  const onHouseFloor = walkToFloorOf(opened.world, opened.assignment, "house");

  const entry = openLegislativeBargaining(onHouseFloor, {
    playerPersonId: won.personId,
  });
  expect(entry.kind).toBe("available");
  if (entry.kind !== "available") throw new Error("entry unavailable");

  // The context the player is holding. Everything after this point happens to
  // the World, not to this object — which is the whole point.
  const retained: LegislativeBargainingSeat = entry.seat;

  const inSenate = walkToFloorOf(entry.world, opened.assignment, "senate");
  const position = measurePosition(inSenate, opened.assignment.measureId);
  expect(position.transmitted).toBe(true);
  expect(position.chamberKey).toBe("senate");
  // The membership itself is untouched: this is not an ended-seat case.
  const membership = resolveActiveMemberSeat(inSenate, won.personId);
  expect(membership.kind).toBe("seated");
  if (membership.kind === "seated") {
    expect(membership.seat.chamberKey).toBe("house");
  }
  assertWorldIntegrity(inSenate);
  return { world: inSenate, personId: won.personId, retained, opened };
}

/** Asserts a refusal that wrote nothing at all. */
function expectRefusedWithoutWriting(world: World, act: () => unknown) {
  const before = serializeWorld(world);
  expect(act).toThrow();
  expect(serializeWorld(world)).toBe(before);
}

/* -------------------------------------------------------------------------- */
/* Finding A — retained House context after transmittal                        */
/* -------------------------------------------------------------------------- */

describe("79R2 finding A — a retained chamber context cannot write after the bill moves", () => {
  it("refuses offerNegotiatedAmendment through a retained House context once HB 214 is in the Senate", () => {
    const staged = retainedHouseContextAfterTransmittal();
    // At 6d4e7f4 this wrote 8 new history records, including a vote.
    expectRefusedWithoutWriting(staged.world, () =>
      offerNegotiatedAmendment(
        staged.world,
        staged.retained,
        staged.retained.progress,
        "capped",
      ),
    );
    expect(() =>
      offerNegotiatedAmendment(
        staged.world,
        staged.retained,
        staged.retained.progress,
        "capped",
      ),
    ).toThrow(/chamber/i);
  });

  it("refuses takeNegotiatedFloorVote through a retained House context once HB 214 is in the Senate", () => {
    const staged = retainedHouseContextAfterTransmittal();
    // At 6d4e7f4 this wrote 5 new history records, including a vote.
    expectRefusedWithoutWriting(staged.world, () =>
      takeNegotiatedFloorVote(
        staged.world,
        staged.retained,
        staged.retained.progress,
      ),
    );
    expect(() =>
      takeNegotiatedFloorVote(
        staged.world,
        staged.retained,
        staged.retained.progress,
      ),
    ).toThrow(/chamber/i);
  });

  it("keeps refusing a fresh entry on the Senate floor, as already banked", () => {
    const staged = retainedHouseContextAfterTransmittal();
    const entry = openLegislativeBargaining(staged.world, {
      playerPersonId: staged.personId,
    });
    expect(entry.kind).toBe("unavailable");
    if (entry.kind === "unavailable") {
      expect(entry.reason).toMatch(/chamber/i);
    }
  });

  it("still lets a valid same-chamber context act while the bill is on the member's own floor", () => {
    const won = wonSeat();
    const opened = openBill(won.world, won.personId);
    const onHouseFloor = walkToFloorOf(
      opened.world,
      opened.assignment,
      "house",
    );
    const entry = openLegislativeBargaining(onHouseFloor, {
      playerPersonId: won.personId,
    });
    expect(entry.kind).toBe("available");
    if (entry.kind !== "available") return;

    // The context is retained across an unrelated day passing, and the bill
    // has not moved. The authorized action still works.
    const later = passOrdinaryDays(entry.world);
    expect(measurePosition(later, opened.assignment.measureId).chamberKey).toBe(
      "house",
    );
    const amended = offerNegotiatedAmendment(
      later,
      entry.seat,
      entry.seat.progress,
      "capped",
    );
    expect(amended.world.history.legislativeAmendments!.length).toBeGreaterThan(
      0,
    );
    assertWorldIntegrity(amended.world);

    const voted = takeNegotiatedFloorVote(
      amended.world,
      entry.seat,
      entry.seat.progress,
    );
    expect(voted.world.history.legislativeVotes!.length).toBeGreaterThan(
      amended.world.history.legislativeVotes!.length,
    );
    assertWorldIntegrity(voted.world);
  });

  it("refuses both actions when the membership ends after the context is captured", () => {
    const won = wonSeat();
    const opened = openBill(won.world, won.personId);
    const onHouseFloor = walkToFloorOf(
      opened.world,
      opened.assignment,
      "house",
    );
    const entry = openLegislativeBargaining(onHouseFloor, {
      playerPersonId: won.personId,
    });
    expect(entry.kind).toBe("available");
    if (entry.kind !== "available") return;

    const seatRelationship = entry.world.history.workRelationships.find(
      (relationship) =>
        relationship.personId === won.personId &&
        relationship.kind === "employment:legislative-member",
    )!;
    const latestStatus = entry.world.history.workStatuses
      .filter((status) => status.workRelationshipId === seatRelationship.id)
      .at(-1)!;
    const ended = recordWorkStatus(entry.world, {
      stableKey: "79r2:seat-ended",
      workRelationshipId: seatRelationship.id,
      effectiveAt: entry.world.currentDate,
      status: "ended",
      reason: "left office",
      supersedesStatusId: latestStatus.id,
      provenance: { kind: "authored", note: "79R2 ended-membership probe." },
    });

    expectRefusedWithoutWriting(ended, () =>
      offerNegotiatedAmendment(
        ended,
        entry.seat,
        entry.seat.progress,
        "capped",
      ),
    );
    expectRefusedWithoutWriting(ended, () =>
      takeNegotiatedFloorVote(ended, entry.seat, entry.seat.progress),
    );
  });

  it("refuses both actions when the seat's recorded workplace stops matching its governing state", () => {
    const won = wonSeat();
    const opened = openBill(won.world, won.personId);
    const onHouseFloor = walkToFloorOf(
      opened.world,
      opened.assignment,
      "house",
    );
    const entry = openLegislativeBargaining(onHouseFloor, {
      playerPersonId: won.personId,
    });
    expect(entry.kind).toBe("available");
    if (entry.kind !== "available") return;

    const seatRelationship = entry.world.history.workRelationships.find(
      (relationship) =>
        relationship.personId === won.personId &&
        relationship.kind === "employment:legislative-member",
    )!;
    const previousRole = entry.world.history.workRoles
      .filter((role) => role.workRelationshipId === seatRelationship.id)
      .at(-1)!;
    // The role now says the work happens somewhere the seat does not govern.
    const elsewhere =
      requireLifePlace("lexington-fayette").context.jurisdiction.id;
    expect(elsewhere).not.toBe(previousRole.locationJurisdictionId);
    const contradicted = recordWorkRole(entry.world, {
      ...previousRole,
      stableKey: "79r2:seat-moved",
      workRelationshipId: seatRelationship.id,
      effectiveAt: entry.world.currentDate,
      supersedesRoleId: previousRole.id,
      locationJurisdictionId: elsewhere,
      timeDemand: {
        ...previousRole.timeDemand,
        locationJurisdictionId: elsewhere,
      },
      provenance: {
        kind: "authored",
        note: "79R2 workplace-contradiction probe.",
      },
    });

    expect(resolveActiveMemberSeat(contradicted, won.personId).kind).toBe(
      "unseated",
    );
    expectRefusedWithoutWriting(contradicted, () =>
      offerNegotiatedAmendment(
        contradicted,
        entry.seat,
        entry.seat.progress,
        "capped",
      ),
    );
    expectRefusedWithoutWriting(contradicted, () =>
      takeNegotiatedFloorVote(contradicted, entry.seat, entry.seat.progress),
    );
  });

  it("refuses rather than picking one when a second win makes the seat ambiguous", () => {
    const won = wonSeat();
    const opened = openBill(won.world, won.personId);
    const onHouseFloor = walkToFloorOf(
      opened.world,
      opened.assignment,
      "house",
    );
    const entry = openLegislativeBargaining(onHouseFloor, {
      playerPersonId: won.personId,
    });
    expect(entry.kind).toBe("available");
    if (entry.kind !== "available") return;

    // A second ordinary campaign, won the same canonical way, leaves two
    // active member seats the records do not choose between.
    const ambiguous = runOneRace(passOrdinaryDays(entry.world), won.personId);
    expect(projectCampaign(ambiguous, won.personId).phase).toBe("won");
    const resolution = resolveActiveMemberSeat(ambiguous, won.personId);
    expect(resolution.kind).toBe("unseated");
    if (resolution.kind === "unseated") {
      expect(resolution.reason).toMatch(/more than one/i);
    }

    expectRefusedWithoutWriting(ambiguous, () =>
      offerNegotiatedAmendment(
        ambiguous,
        entry.seat,
        entry.seat.progress,
        "capped",
      ),
    );
    expectRefusedWithoutWriting(ambiguous, () =>
      takeNegotiatedFloorVote(ambiguous, entry.seat, entry.seat.progress),
    );
  });

  it("refuses when the retained context names a measure this world does not hold", () => {
    const won = wonSeat();
    const opened = openBill(won.world, won.personId);
    const onHouseFloor = walkToFloorOf(
      opened.world,
      opened.assignment,
      "house",
    );
    const entry = openLegislativeBargaining(onHouseFloor, {
      playerPersonId: won.personId,
    });
    expect(entry.kind).toBe("available");
    if (entry.kind !== "available") return;

    const forged: LegislativeBargainingSeat = {
      ...entry.seat,
      measureId: "legislative-measure_deadbeefdeadbeef" as EntityId,
    };
    expectRefusedWithoutWriting(entry.world, () =>
      offerNegotiatedAmendment(
        entry.world,
        forged,
        entry.seat.progress,
        "capped",
      ),
    );
    expectRefusedWithoutWriting(entry.world, () =>
      takeNegotiatedFloorVote(entry.world, forged, entry.seat.progress),
    );
  });
});
