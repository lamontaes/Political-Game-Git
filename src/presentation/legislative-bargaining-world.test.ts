import { describe, expect, it } from "vitest";

import {
  activeWorkRelationshipsAt,
  currentMeasureProvisions,
  deserializeWorld,
  measureAmendments,
  measureCommitments,
  measureNegotiations,
  requireLifePlace,
  serializeWorld,
  type World,
} from "../simulation";
import { createNewGameWorld, DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { openOrdinaryLife, passOrdinaryDays } from "./ordinary-life";
import {
  fileForOffice,
  projectCampaign,
  spendAnAfternoon,
} from "./campaign-projection";
import { resolvePlayerCapabilities } from "./player-capabilities";
import {
  applyLegislativeCommand,
  openLegislativeWork,
} from "./legislation-world";
import { openLegislativeBargaining } from "./legislative-bargaining-world";
import {
  availableConversationIntents,
  commitConversationTurn,
  createConversationSessionDescriptor,
  openingConversationBeat,
} from "./run-b-conversation";
import { isLegislativeBargainingProgress } from "./run-b-conversation-progress";
import {
  offerNegotiatedAmendment,
  takeNegotiatedFloorVote,
} from "./legislative-bargaining-actions";
import {
  playerHasReadFiscalNoteFor,
  reviewFiscalNoteFor,
} from "./legislative-bargaining-brief";

/**
 * The 79F seam, proved from the production player route.
 *
 * Every world here is built the way a real game builds one — a new life in
 * Lexington, a filed candidacy, campaign afternoons, weeks that pass — and
 * every bargaining context is asked for through the adapter the player's own
 * screen uses. Nothing imports the developer floor fixture, which has its own
 * proof in legislative-bargaining-no-fixture.test.ts.
 */

function filedLife(seed: string) {
  const built = createNewGameWorld({
    ...DEFAULT_NEW_GAME_SETUP,
    seed,
    startAge: 34,
    placeKey: "lexington-fayette",
    gender: "male",
    pronouns: "he-him",
    questionnaire: "skipped",
  });
  const personId = built.playerPersonId;
  const world = fileForOffice(
    openOrdinaryLife(built.world, personId),
    personId,
  );
  return { world, personId };
}

/** Plays the accepted PR85 route to a decided election. */
function playUntilDecided(seed: string, sessions: number) {
  const life = filedLife(seed);
  let world = spendAnAfternoon(life.world, life.personId, "fundraising");
  for (let index = 0; index < sessions; index += 1) {
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
  return { world, personId: life.personId };
}

/** A seat won through normal play, with the bill opened and walked to the floor. */
function wonAndOnTheFloor() {
  const played = playUntilDecided("p85c-owner-0", 3);
  expect(projectCampaign(played.world, played.personId).phase).toBe("won");
  const capabilities = resolvePlayerCapabilities(played.world);
  const opened = openLegislativeWork(played.world, {
    playerPersonId: played.personId,
    scenarioKey: capabilities.legislativeScenarioKey!,
    jurisdictionId: capabilities.legislativeJurisdictionId!,
  });
  let world = opened.world;
  for (const step of [
    "request-referral",
    "request-committee-hearing",
    "move-committee-report",
    "request-calendar-placement",
  ] as const) {
    world = applyLegislativeCommand(world, opened.assignment, {
      kind: "take-step",
      step,
    }).world;
  }
  return { world, personId: played.personId, assignment: opened.assignment };
}

function talk(
  world: World,
  seat: NonNullable<
    Extract<
      ReturnType<typeof openLegislativeBargaining>,
      { kind: "available" }
    >
  >["seat"],
  progressIn = seat.progress,
  intentKey?: string,
) {
  const descriptor = createConversationSessionDescriptor(
    world,
    seat.roomContext,
  );
  openingConversationBeat(
    world,
    seat.roomContext,
    seat.advocatePersonId,
    progressIn,
  );
  const options = availableConversationIntents(
    world,
    seat.roomContext,
    seat.advocatePersonId,
    progressIn,
    "normal",
  );
  const intent =
    options.find((option) => option.key === intentKey) ?? options[0]!;
  const result = commitConversationTurn(world, {
    session: descriptor,
    room: seat.roomContext,
    progress: progressIn,
    turnOrdinal: 1,
    addressee: seat.advocatePersonId,
    audibility: "normal",
    intent: intent.key,
  });
  if (!isLegislativeBargainingProgress(result.progress)) {
    throw new Error("The bargaining session lost its subject.");
  }
  return { ...result, progress: result.progress, intentKey: intent.key };
}

describe("proof A — win, govern, bargain, from the production route", () => {
  it("carries a Lexington winner into real bargaining in their own world", () => {
    const residence = requireLifePlace("lexington-fayette");
    const state = requireLifePlace("kentucky");
    const seatWorld = wonAndOnTheFloor();

    // Residence and governing jurisdiction are different facts.
    expect(
      seatWorld.world.people[seatWorld.personId]!.homeJurisdictionId,
    ).toBe(residence.context.jurisdiction.id);
    const member = activeWorkRelationshipsAt(
      seatWorld.world,
      seatWorld.personId,
    ).find(
      (work) => work.relationship.kind === "employment:legislative-member",
    )!;
    expect(member.role.locationJurisdictionId).toBe(
      state.context.jurisdiction.id,
    );

    const entry = openLegislativeBargaining(seatWorld.world, {
      playerPersonId: seatWorld.personId,
    });
    expect(entry.kind).toBe("available");
    if (entry.kind !== "available") return;
    const seat = entry.seat;
    let world = entry.world;

    // The chain is canonical, not fixture-shaped: the production measure, the
    // governing state's jurisdiction, the pack's own chamber, and colleagues
    // persisted in this world's people.
    expect(seat.measureStableKey).toBe("legislative-work:kentucky:measure");
    expect(seat.roomContext.jurisdictionId).toBe(
      state.context.jurisdiction.id,
    );
    expect(seat.progress.subjectFacts.chamberName).toBe(
      "House of Representatives",
    );
    expect(world.people[seat.advocatePersonId]).toBeDefined();
    expect(world.people[seat.guardianPersonId]).toBeDefined();
    expect(world.people[seat.analystPersonId]).toBeDefined();
    expect(seat.playerPersonId).toBe(seatWorld.personId);
    const firstBody = seat.scenario.bodies[0]!;
    for (const personId of [
      seat.playerPersonId,
      seat.advocatePersonId,
      seat.guardianPersonId,
    ]) {
      expect(
        firstBody.members.some((entry2) => entry2.personId === personId),
      ).toBe(true);
    }

    // Talking never legislates, and it writes the accepted record families
    // into the player's own history.
    const before = currentMeasureProvisions(world, seat.measureId);
    expect(before.length).toBeGreaterThanOrEqual(3);
    const spoken = talk(world, seat, seat.progress, "ask-what-they-want");
    world = spoken.world;
    expect(currentMeasureProvisions(world, seat.measureId)).toStrictEqual(
      before,
    );
    expect(
      measureNegotiations(world, seat.measureId).length +
        measureCommitments(world, seat.measureId).length,
    ).toBeGreaterThan(0);

    // Reading the fiscal note is canonical knowledge, in this world.
    expect(playerHasReadFiscalNoteFor(world, seat)).toBe(false);
    world = reviewFiscalNoteFor(world, seat);
    expect(playerHasReadFiscalNoteFor(world, seat)).toBe(true);

    // Only the chamber changes the bill: the amendment either enters Section 4
    // through an adopted amendment, or the text stays exactly as filed.
    const amendment = offerNegotiatedAmendment(
      world,
      seat,
      spoken.progress,
      "capped",
    );
    world = amendment.world;
    const amendments = measureAmendments(world, seat.measureId);
    expect(amendments).toHaveLength(1);
    const sectionFour = currentMeasureProvisions(world, seat.measureId).find(
      (provision) => provision.provisionKey === "local-project-match",
    );
    if (amendment.adopted) {
      expect(sectionFour).toBeDefined();
      expect(sectionFour!.originAmendmentId).toBe(amendments[0]!.id);
    } else {
      expect(sectionFour).toBeUndefined();
    }

    // The floor vote is the accepted vote writer acting on this measure.
    const vote = takeNegotiatedFloorVote(world, seat, spoken.progress);
    world = vote.world;
    expect(
      (world.history.legislativeVotes ?? []).some(
        (record) => record.measureId === seat.measureId,
      ),
    ).toBe(true);
    expect(vote.memberAccounts.length).toBeGreaterThan(0);
  });

  it("derives the same dialogue word for word on the same records", () => {
    const seatWorld = wonAndOnTheFloor();
    const first = openLegislativeBargaining(seatWorld.world, {
      playerPersonId: seatWorld.personId,
    });
    const second = openLegislativeBargaining(seatWorld.world, {
      playerPersonId: seatWorld.personId,
    });
    expect(first.kind).toBe("available");
    expect(second.kind).toBe("available");
    if (first.kind !== "available" || second.kind !== "available") return;
    const one = talk(first.world, first.seat);
    const two = talk(second.world, second.seat);
    expect(one.intentKey).toBe(two.intentKey);
    expect(one.presentation).toStrictEqual(two.presentation);
  });
});

describe("proof B — save and reload continuity", () => {
  it("reaches the same seat, chamber, measure and people after a reload", () => {
    const seatWorld = wonAndOnTheFloor();
    const entry = openLegislativeBargaining(seatWorld.world, {
      playerPersonId: seatWorld.personId,
    });
    expect(entry.kind).toBe("available");
    if (entry.kind !== "available") return;

    // A commitment made before the save is still owed after it.
    let world = talk(entry.world, entry.seat).world;
    world = reviewFiscalNoteFor(world, entry.seat);

    const reloaded = deserializeWorld(serializeWorld(world));
    expect(serializeWorld(reloaded)).toBe(serializeWorld(world));
    const again = openLegislativeBargaining(reloaded, {
      playerPersonId: seatWorld.personId,
    });
    expect(again.kind).toBe("available");
    if (again.kind !== "available") return;

    expect(again.seat.measureId).toBe(entry.seat.measureId);
    expect(again.seat.advocatePersonId).toBe(entry.seat.advocatePersonId);
    expect(again.seat.guardianPersonId).toBe(entry.seat.guardianPersonId);
    expect(again.seat.analystPersonId).toBe(entry.seat.analystPersonId);
    expect(again.seat.roomContext.jurisdictionId).toBe(
      entry.seat.roomContext.jurisdictionId,
    );
    // Re-entering after the reload changed nothing: every canonical record
    // the sitting needs was already in the save, so the adapter found rather
    // than re-created it.
    expect(serializeWorld(again.world)).toBe(serializeWorld(reloaded));
    // What the player canonically knows survived, and the sitting reads it.
    expect(again.seat.progress.analysisSeen).toBe(true);
    expect(
      measureNegotiations(again.world, again.seat.measureId).length +
        measureCommitments(again.world, again.seat.measureId).length,
    ).toBeGreaterThan(0);

    // Bargaining continues: the floor vote still works on the reloaded world.
    const vote = takeNegotiatedFloorVote(
      again.world,
      again.seat,
      again.seat.progress,
    );
    expect(
      (vote.world.history.legislativeVotes ?? []).some(
        (record) => record.measureId === again.seat.measureId,
      ),
    ).toBe(true);
  });
});

describe("proof C — losing continues life and leaks nothing", () => {
  it("withholds the bargaining route from a lost candidacy, in words", () => {
    let lost: { world: World; personId: string } | null = null;
    for (let index = 0; index < 10 && !lost; index += 1) {
      const played = playUntilDecided(`79f-loss-${index}`, 0);
      if (projectCampaign(played.world, played.personId).phase === "lost") {
        lost = played;
      }
    }
    expect(lost, "no seed produced a loss").not.toBeNull();

    // No governing capability leaked in with the loss.
    expect(
      activeWorkRelationshipsAt(lost!.world, lost!.personId).some((work) =>
        work.relationship.kind.startsWith("employment:legislative-"),
      ),
    ).toBe(false);
    const capabilities = resolvePlayerCapabilities(lost!.world);
    expect(capabilities.legislation).toBe(false);

    const entry = openLegislativeBargaining(lost!.world, {
      playerPersonId: lost!.personId,
    });
    expect(entry.kind).toBe("unavailable");
    if (entry.kind !== "unavailable") return;
    expect(entry.reason.length).toBeGreaterThan(0);

    // Ordinary life carries on.
    const nextWeek = passOrdinaryDays(lost!.world, 7);
    expect(nextWeek.currentDate > lost!.world.currentDate).toBe(true);
  });
});

describe("proof D — missing content fails closed, never borrows", () => {
  it("withholds the members' room while the bill is not on the floor", () => {
    const played = playUntilDecided("p85c-owner-0", 3);
    expect(projectCampaign(played.world, played.personId).phase).toBe("won");

    // Seated, but the bill has not been taken up at all.
    const before = openLegislativeBargaining(played.world, {
      playerPersonId: played.personId,
    });
    expect(before.kind).toBe("unavailable");
    if (before.kind === "unavailable") {
      expect(before.reason).toMatch(/has not been taken up/);
    }

    // Taken up, but still short of the floor.
    const capabilities = resolvePlayerCapabilities(played.world);
    const opened = openLegislativeWork(played.world, {
      playerPersonId: played.personId,
      scenarioKey: capabilities.legislativeScenarioKey!,
      jurisdictionId: capabilities.legislativeJurisdictionId!,
    });
    const inCommittee = applyLegislativeCommand(
      opened.world,
      opened.assignment,
      { kind: "take-step", step: "request-referral" },
    ).world;
    const early = openLegislativeBargaining(inCommittee, {
      playerPersonId: played.personId,
    });
    expect(early.kind).toBe("unavailable");
    if (early.kind === "unavailable") {
      expect(early.reason).toMatch(/not on the floor yet/);
    }
    // Nothing was seeded on the refused path: no advocate, no filed text.
    expect(
      (inCommittee.history.legislativeProvisions ?? []).some((record) =>
        record.stableKey.startsWith("legislative-work:kentucky:section-"),
      ),
    ).toBe(false);
  });

  it("authors a sitting for exactly one legislature and says so", async () => {
    const { bargainingBriefSupports } = await import(
      "./legislative-bargaining-brief"
    );
    expect(bargainingBriefSupports("kentucky")).toBe(true);
    for (const other of ["nebraska", "alaska", "kentucky-signage", ""]) {
      expect(bargainingBriefSupports(other)).toBe(false);
    }
  });
});
