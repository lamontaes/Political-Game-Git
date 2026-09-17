import { describe, expect, it } from "vitest";
import {
  enterSupportedTerm,
  recordedTermFixture,
} from "../../tests/fixtures/recorded-legislative-term";
import { fileForOffice } from "../../tests/fixtures/campaign-fixture";
import {
  createWorkRelationship,
  deserializeWorld,
  serializeWorld,
} from "../simulation";
import type { EntityId, World } from "../simulation";
import {
  CLAIM_CONTRADICTION_EVENT,
  claimStanceOf,
} from "../simulation/claim-stances";
import { CLAIM_CONTRADICTION_TRANSITION_KEY } from "../simulation/claim-contradictions";
import { recordTraitChange } from "../simulation/people-traits";
import type { PeopleTrait } from "../simulation/people-trait-definitions";
import { seekCivicPressContact } from "../simulation/press-reach";
import type { ContextualSceneSubject } from "./contextual-scenes";
import { resolveActiveMemberSeat } from "./legislative-member-seat";
import { openLegislativeWork } from "./legislation-world";
import { DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";
import { passOrdinaryDays } from "./ordinary-life";
import { resolvePlayerCapabilities } from "./player-capabilities";
import {
  availablePlayerConversations,
  projectPlayerConversation,
} from "./player-conversation";
import { commitConversationTurn } from "./run-b-conversation";

/**
 * PROSE B for a public life: after an election, a staff member with a pending
 * bill, and a reporter who heard about a promise — including a denial that a
 * source later contradicts, and the controls around it.
 */

function open(world: World, player: EntityId, subject: ContextualSceneSubject) {
  return availablePlayerConversations(world, player).some(
    (entry) => entry.subject === subject && !entry.settled,
  );
}

function say(
  world: World,
  player: EntityId,
  subject: ContextualSceneSubject,
  intent: string,
): World {
  const view = projectPlayerConversation(world, player, subject)!;
  expect(view, `${subject} should be open`).not.toBeNull();
  return commitConversationTurn(world, {
    session: view.session,
    room: view.room,
    progress: view.progress,
    turnOrdinal: view.turnOrdinal,
    addressee: view.addressee,
    audibility: view.audibility,
    intent,
  }).world;
}

describe("after an election", () => {
  it("a win asks when the term starts, and the answer is the recorded date", () => {
    const fixture = recordedTermFixture("player");
    const world = passOrdinaryDays(fixture.world, 1);
    const view = projectPlayerConversation(
      world,
      fixture.personId,
      "scene-campaign-reaction",
    )!;
    expect(view.briefing).toMatch(
      /^You won the election for a seat in the House of Representatives\. The term begins on January 1, 2027\.$/,
    );
    expect(view.openingLine).toMatch(/Congratulations|You actually won/);
    const date = view.intents.find((intent) => intent.key === "give-date")!;
    expect(date.label).toBe("Say the term starts January 1, 2027");
    expect(date.truthIntent).toBe("sincere");
    // Winning is not taking office: nothing here grants authority.
    const after = say(
      world,
      fixture.personId,
      "scene-campaign-reaction",
      "give-date",
    );
    expect(resolveActiveMemberSeat(after, fixture.personId).kind).toBe(
      resolveActiveMemberSeat(world, fixture.personId).kind,
    );
    expect(after.currentMoment).toEqual(world.currentMoment);
  });

  it("a loss is met differently, with no date and no truth marking", () => {
    const fixture = recordedTermFixture("rival");
    const world = passOrdinaryDays(fixture.world, 1);
    const view = projectPlayerConversation(
      world,
      fixture.personId,
      "scene-campaign-reaction",
    )!;
    expect(view.briefing).toMatch(/^You lost the election/);
    expect(view.intents.map((intent) => intent.key)).toEqual([
      "it-stings",
      "whats-next",
      "talk-later",
    ]);
    expect(view.intents.every((intent) => !intent.truthIntent)).toBe(true);
  });
});

describe("staff follow-up on a pending bill", () => {
  it("binds the actual staffer, bill and summary, and 'keep tracking' is their commitment", () => {
    const fixture = recordedTermFixture("player");
    let world = enterSupportedTerm(fixture.world, fixture.personId);
    const seat = resolveActiveMemberSeat(world, fixture.personId);
    if (seat.kind !== "seated") throw new Error("fixture should be seated");
    const capabilities = resolvePlayerCapabilities(world);
    world = openLegislativeWork(world, {
      playerPersonId: fixture.personId,
      scenarioKey: capabilities.legislativeScenarioKey!,
      jurisdictionId: capabilities.legislativeJurisdictionId!,
    }).world;
    // With no staff there is nobody to ask, and no scene.
    expect(
      open(
        passOrdinaryDays(world, 1),
        fixture.personId,
        "scene-staff-followup",
      ),
    ).toBe(false);
    const stafferId = world.personOrder.find(
      (id) =>
        id !== fixture.personId &&
        !world.history.workRelationships.some((r) => r.personId === id),
    )!;
    world = createWorkRelationship(world, {
      stableKey: "prose-b:staffer",
      personId: stafferId,
      organizationId: seat.seat.organizationId,
      startedAt: world.currentDate,
      kind: "employment:legislative-staff",
      compensation: "paid",
      authority: "directed",
      dependency: "partly-dependent",
      economicRisk: "organization-borne",
      provenance: { kind: "authored", note: "PROSE B staff fixture." },
      initialRole: {
        title: "Legislative aide",
        occupationClassification: null,
        locationJurisdictionId: seat.seat.governingJurisdictionId,
        timeDemand: {
          expectedWeekly: { minimumHours: 30, maximumHours: 40 },
          attention: "high",
          concurrency: "partly-concurrent",
          scheduleRigidity: "mixed",
          interruptibility: "limited",
          locationJurisdictionId: seat.seat.governingJurisdictionId,
        },
      },
    });
    world = passOrdinaryDays(world, 1);
    const view = projectPlayerConversation(
      world,
      fixture.personId,
      "scene-staff-followup",
    )!;
    const measure = world.history.legislativeMeasures!.at(-1)!;
    expect(view.briefing).toContain("your legislative aide");
    expect(view.openingLine).toContain(measure.designation);
    const asked = say(
      world,
      fixture.personId,
      "scene-staff-followup",
      "ask-summary",
    );
    const reply = asked.history.events.at(-1)!.context.immediateReaction!;
    expect(reply).toContain(measure.summary.split(/(?<=\.)\s/)[0]!);
    const tracked = say(
      asked,
      fixture.personId,
      "scene-staff-followup",
      "staff-tracks",
    );
    const commitment = tracked.history.lifeCommitments.at(-1)!;
    expect(commitment.personId).toBe(stafferId);
    expect(tracked.currentMoment).toEqual(world.currentMoment);
  });
});

/** An ordinary adult who has said yes to a meeting, then files to run. */
function candidateWithAcceptedMeeting(seed: string) {
  const life = generateOpeningLife(
    prepareOpeningLife({ ...DEFAULT_NEW_GAME_SETUP, seed, startAge: 34 }),
  ).game!;
  const player = life.playerPersonId;
  let world = life.world;
  for (
    let day = 0;
    day < 40 && !open(world, player, "scene-party-invite");
    day += 1
  ) {
    world = passOrdinaryDays(world, 1, { stopForTentativeHolds: true });
  }
  world = say(world, player, "scene-party-invite", "say-yes");
  world = fileForOffice(world, player);
  world = seekCivicPressContact(world).world;
  return { player, world };
}

describe("a reporter's question about an actual promise", () => {
  const { player, world: before } = candidateWithAcceptedMeeting("prose-b-13");
  const asked = passOrdinaryDays(before, 1, { stopForTentativeHolds: true });

  it("the reporter asks only because the organizer told them, and says so", () => {
    expect(open(asked, player, "scene-reporter-question")).toBe(true);
    const tip = asked.history.events.find(
      (event) => event.type === "press.tip-shared",
    );
    expect(tip).toBeDefined();
    const view = projectPlayerConversation(
      asked,
      player,
      "scene-reporter-question",
    )!;
    expect(view.openingLine).toMatch(/told .+ you’d come to the|told .+ yes/);
    expect(view.openingLine).not.toMatch(/\(fictional\)/);
    expect(
      view.intents.map((intent) => [intent.key, intent.truthIntent]),
    ).toEqual([
      ["confirm", "sincere"],
      ["no-comment", undefined],
      ["deny", "deliberate-deception"],
    ]);
  });

  it("control: declining to comment is recorded as an evasion and never checked", () => {
    const evaded = say(asked, player, "scene-reporter-question", "no-comment");
    const stance = claimStanceOf(evaded.history.events.at(-1)!)!;
    expect(stance.intent).toBe("evade");
    expect(stance.asserted).toBe("none");
    expect(
      evaded.history.claims.some(
        (claim) =>
          claim.speakerPersonId === player &&
          claim.statement === stance.statement,
      ),
    ).toBe(false);
    expect(
      evaded.history.futureDueItems.some(
        (item) => item.transitionKey === CLAIM_CONTRADICTION_TRANSITION_KEY,
      ),
    ).toBe(false);
  });

  // The organizer is the only person who can confirm what was promised, and
  // whether they will is their own temperament, not the seed's. The test says
  // which kind of person they are, so the outcome follows from the world
  // rather than from which life this happened to be.
  const invitation = asked.history.events.find(
    (event) => event.type === "party.chapter-meeting-invited",
  )!;
  const organizerId = invitation.participants.find(
    (entry) => entry.role === "agency:asked",
  )!.personId;
  const sourceWho = (...changes: readonly [PeopleTrait, -2 | 2][]): World => {
    let world = asked;
    for (const [trait, value] of changes) {
      world = recordTraitChange(world, {
        personId: organizerId,
        trait,
        value,
        eventId: invitation.id,
        reason: "Test: an established temperament, not a coin toss.",
      });
    }
    return world;
  };

  it("a denial is a claim the world contradicts, and the reporter calls back only after a source confirms", () => {
    const willing = sourceWho(["conflict", 2]);
    const denied = say(willing, player, "scene-reporter-question", "deny");
    const claim = denied.history.claims.findLast(
      (entry) => entry.speakerPersonId === player,
    )!;
    expect(claim.relationshipToTruth).toBe("contradicts");
    let world = deserializeWorld(serializeWorld(denied));
    for (let day = 0; day < 10; day += 1) {
      world = passOrdinaryDays(world, 1, { stopForTentativeHolds: true });
    }
    const found = world.history.events.filter(
      (event) => event.type === CLAIM_CONTRADICTION_EVENT,
    );
    const confirmed = world.history.events.filter(
      (event) => event.type === "press.source-confirmed",
    );
    // This organizer does not mind contradicting somebody on the record, so
    // they confirm; the record and the callback agree.
    expect(confirmed).toHaveLength(1);
    expect(found).toHaveLength(1);
    expect(found[0]!.tags).toContain("claim.intent.deceive");
    // The reporter learned it from that source, not from a detector.
    const sourceId = confirmed[0]!.participants.find(
      (entry) => entry.role === "agency:source",
    )!.personId;
    const reporterId = found[0]!.participants.find(
      (entry) => entry.role === "agency:discoverer",
    )!.personId;
    expect(
      world.history.knowledge.some(
        (entry) =>
          entry.personId === reporterId &&
          entry.source.kind === "told-by" &&
          entry.source.sourcePersonId === sourceId &&
          entry.accuracy === "accurate",
      ),
    ).toBe(true);
    const view = projectPlayerConversation(
      world,
      player,
      "scene-reporter-question",
    )!;
    expect(view.topicLabel).toBe("The reporter calls back");
    expect(view.intents.map((intent) => intent.key)).toEqual([
      "admit-it",
      "keep-denying",
      "no-comment-again",
    ]);
  });

  it("control: a source who will not talk means no callback at all", () => {
    const reticent = sourceWho(["conflict", -2], ["risk", -2]);
    const denied = say(reticent, player, "scene-reporter-question", "deny");
    let world = denied;
    for (let day = 0; day < 10; day += 1) {
      world = passOrdinaryDays(world, 1, { stopForTentativeHolds: true });
    }
    // Nobody confirmed it, so nothing was discovered. The denial stands, and
    // the claim is still exactly as false as it was.
    expect(
      world.history.events.filter(
        (event) => event.type === "press.source-confirmed",
      ),
    ).toEqual([]);
    expect(
      world.history.events.filter(
        (event) => event.type === CLAIM_CONTRADICTION_EVENT,
      ),
    ).toEqual([]);
    const claim = world.history.claims.findLast(
      (entry) => entry.speakerPersonId === player,
    )!;
    expect(claim.relationshipToTruth).toBe("contradicts");
  });
});
