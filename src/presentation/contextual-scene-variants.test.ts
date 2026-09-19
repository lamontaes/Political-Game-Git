import { describe, expect, it } from "vitest";
import {
  addDays,
  candidacyPackForJurisdiction,
  createScheduledActivity,
  ensureCampaignOpponents,
  fileCampaign,
  makeCurrencyCode,
  scheduledActivityState,
  simulationMomentAtLocalTime,
} from "../simulation";
import type { EntityId, IsoDate, World } from "../simulation";
import { claimStanceOf } from "../simulation/claim-stances";
import { CHAPTER_JOINED_EVENT } from "../simulation/living-world/party-chapters";
import { seekCivicPressContact } from "../simulation/press-reach";
import { sceneBindingsFor } from "../simulation/scene-bindings";
import { letAdultTimePass } from "./adult-life";
import type { ContextualSceneSubject } from "./contextual-scenes";
import { DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";
import { passOrdinaryDays } from "./ordinary-life";
import { attendChapterMeeting } from "./party-chapter-actions";
import {
  availablePlayerConversations,
  projectPlayerConversation,
} from "./player-conversation";
import { commitConversationTurn } from "./run-b-conversation";

/**
 * CRUNCH46 P1: each contextual family has more than one real situation. Every
 * variant here is reached through ordinary commands on an ordinary life.
 */

function adultLife(seed: string) {
  return generateOpeningLife(
    prepareOpeningLife({ ...DEFAULT_NEW_GAME_SETUP, seed, startAge: 34 }),
  ).game!;
}

function openView(
  world: World,
  player: EntityId,
  subject: ContextualSceneSubject,
) {
  const entry = availablePlayerConversations(world, player).find(
    (candidate) => candidate.subject === subject && !candidate.settled,
  );
  return entry ? projectPlayerConversation(world, player, subject) : null;
}

function passUntilOpen(
  world: World,
  player: EntityId,
  subject: ContextualSceneSubject,
  pass: (world: World) => World,
  maxSteps = 60,
): World {
  let current = world;
  for (let step = 0; step < maxSteps; step += 1) {
    if (openView(current, player, subject)) return current;
    current = pass(current);
  }
  expect(openView(current, player, subject), `${subject} opens`).not.toBeNull();
  return current;
}

function say(
  world: World,
  player: EntityId,
  subject: ContextualSceneSubject,
  intent: string,
): World {
  const view = projectPlayerConversation(world, player, subject)!;
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

const variantOf = (world: World, player: EntityId, family: string) =>
  sceneBindingsFor(world, player, family as never).at(-1)?.binding.variant;

const daily = (world: World) =>
  passOrdinaryDays(world, 1, { stopForTentativeHolds: true });

describe("party chapter: invitation, after a no, and after a meeting", () => {
  const life = adultLife("prose-b-0");
  const player = life.playerPersonId;
  const invited = passUntilOpen(
    life.world,
    player,
    "scene-party-invite",
    daily,
  );

  it("a turned-down invitation brings a check-in, not another invitation", () => {
    const declined = say(invited, player, "scene-party-invite", "no-thanks");
    const later = passUntilOpen(
      declined,
      player,
      "scene-party-invite",
      (world) => passOrdinaryDays(world, 1),
      3,
    );
    expect(variantOf(later, player, "party-invite")).toBe("after-decline");
    const view = openView(later, player, "scene-party-invite")!;
    expect(view.topicLabel).toMatch(/^After the .+ meeting$/);
    expect(view.openingLine).toMatch(/No problem about the meeting/);
    expect(view.intents.map((intent) => intent.key)).toEqual([
      "keep-inviting",
      "not-for-me",
      "ask-when",
    ]);
    // Talking about it costs no time.
    const asked = say(later, player, "scene-party-invite", "ask-when");
    expect(asked.currentMoment).toEqual(later.currentMoment);
  });

  it("after a meeting the organizer asks about joining, and joining is the chapter's own join", () => {
    const accepted = say(invited, player, "scene-party-invite", "say-yes");
    const meeting = accepted.history.scheduledActivities.find(
      (activity) =>
        activity.kind === "confirmed" &&
        activity.participantPersonIds.includes(player) &&
        scheduledActivityState(accepted, activity.id).status === "scheduled",
    )!;
    const start = scheduledActivityState(accepted, meeting.id).start;
    let world = accepted;
    while (world.currentDate < start.date) world = daily(world);
    const attended = attendChapterMeeting(world, player, meeting.id);
    const asked = passUntilOpen(
      attended,
      player,
      "scene-party-invite",
      (current) => passOrdinaryDays(current, 1),
      3,
    );
    expect(variantOf(asked, player, "party-invite")).toBe("join-ask");
    const view = openView(asked, player, "scene-party-invite")!;
    expect(view.openingLine).toMatch(/becoming a member/);
    expect(view.intents.map((intent) => intent.key)).toEqual([
      "join",
      "not-yet",
      "what-joining-means",
    ]);
    const joined = say(asked, player, "scene-party-invite", "join");
    expect(
      joined.history.events.some(
        (event) =>
          event.type === CHAPTER_JOINED_EVENT &&
          event.involvedEntityIds.includes(player),
      ),
    ).toBe(true);
  });
});

function fileForFirstOffice(world: World, player: EntityId, key: string) {
  const person = world.people[player]!;
  const option = candidacyPackForJurisdiction(person.homeJurisdictionId)!
    .offices[0]!;
  const opponents = ensureCampaignOpponents(world, {
    stableKey: key,
    jurisdictionId: person.homeJurisdictionId,
    count: 1,
    excludePersonIds: [player],
  });
  return fileCampaign(opponents.world, {
    stableKey: `${key}:campaign`,
    candidatePersonId: player,
    jurisdictionId: person.homeJurisdictionId,
    officeKey: option.officeKey,
    electionDate: addDays(world.currentDate, 60),
    rivalPersonIds: opponents.personIds,
    existingContestId: null,
    committeeName: "A test committee",
    donorPoolName: "A test supporter pool",
    advertisingVendorName: "A test advertising vendor",
    staffPersonIds: [],
    treasuryCurrency: makeCurrencyCode("USD"),
  }).world;
}

describe("a filing is news at home and to a reporter", () => {
  const life = adultLife("prose-b-2");
  const player = life.playerPersonId;
  const withReporter = seekCivicPressContact(life.world).world;
  const filed = fileForFirstOffice(withReporter, player, "variants:filed");
  const next = passOrdinaryDays(filed, 1);

  it("the household asks whether the player is really running", () => {
    expect(variantOf(next, player, "campaign-reaction")).toBe("filed");
    const view = openView(next, player, "scene-campaign-reaction")!;
    expect(view.openingLine).toMatch(/running|filed/);
    expect(view.intents.map((intent) => intent.key)).toEqual([
      "say-why",
      "ask-for-help",
      "admit-doubt",
    ]);
  });

  it("a reporter asks about the public filing without needing a source", () => {
    expect(variantOf(next, player, "reporter-question")).toBe(
      "filing-question",
    );
    const view = openView(next, player, "scene-reporter-question")!;
    expect(view.intents.map((intent) => intent.key)).toEqual([
      "about-community",
      "too-early",
      "save-for-interview",
    ]);
    // An answer about motives is not a checkable claim.
    const answered = say(
      next,
      player,
      "scene-reporter-question",
      "about-community",
    );
    expect(claimStanceOf(answered.history.events.at(-1)!)).toBeNull();
  });

  it("nothing is filed, nothing is asked", () => {
    const quiet = passOrdinaryDays(withReporter, 1);
    expect(variantOf(quiet, player, "campaign-reaction")).toBeUndefined();
    expect(variantOf(quiet, player, "reporter-question")).toBeUndefined();
  });
});

describe("an evening in, promised, and a commitment the same evening", () => {
  const life = adultLife("people-evening-3");
  const player = life.playerPersonId;
  const offered = passUntilOpen(
    life.world,
    player,
    "scene-favor",
    (world) => letAdultTimePass(world, 1),
    20,
  );

  it("the housemate's own invitation is a favor scene the same day", () => {
    expect(variantOf(offered, player, "favor")).toBe("household-evening");
    const view = openView(offered, player, "scene-favor")!;
    expect(view.intents.map((intent) => intent.key)).toContain("spend-evening");
  });

  const at = (date: IsoDate, minuteOfDay: number) =>
    simulationMomentAtLocalTime({
      date,
      minuteOfDay,
      timeZone: offered.currentMoment.timeZone,
      preferredUtcOffsetMinutes: offered.currentMoment.utcOffsetMinutes,
    });
  const booked = createScheduledActivity(offered, {
    stableKey: "fixture:variants:potluck",
    title: "neighborhood potluck",
    summary: "A potluck the player said they would go to.",
    kind: "confirmed",
    start: at(offered.currentDate, 18 * 60 + 30),
    end: at(offered.currentDate, 19 * 60 + 30),
    participantPersonIds: [player],
    responsiblePersonId: player,
    location: {
      locationKey: "fixture:potluck",
      label: "A neighbor's house",
      jurisdictionId: offered.people[player]!.homeJurisdictionId,
    },
    sourceEntityIds: [player],
    flexibility: { kind: "fixed" },
    access: { kind: "private", personIds: [player] },
  });
  const promised = say(booked, player, "scene-favor", "spend-evening");
  const asked = passOrdinaryDays(promised, 1, { stopForTentativeHolds: true });

  it("agreeing to the evening, then reaching the clash, brings the housemate's question", () => {
    expect(asked.currentDate).toBe(promised.currentDate);
    expect(variantOf(asked, player, "home-evening")).toBe("promised-evening");
    const view = openView(asked, player, "scene-home-evening")!;
    expect(view.topicLabel).toBe("Tonight");
    expect(view.openingLine).toMatch(/neighborhood potluck/);
    const lie = view.intents.find((intent) => intent.key === "say-home");
    expect(lie?.truthIntent).toBe("deliberate-deception");
    expect(
      view.intents.find((intent) => intent.key === "still-going")?.truthIntent,
    ).toBe("sincere");
  });

  it("saying so honestly records no deception", () => {
    const honest = say(asked, player, "scene-home-evening", "still-going");
    expect(claimStanceOf(honest.history.events.at(-1)!)?.truthIntent).not.toBe(
      "deliberate-deception",
    );
    expect(honest.currentMoment).toEqual(asked.currentMoment);
  });
});
