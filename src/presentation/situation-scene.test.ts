import { describe, expect, it, vi } from "vitest";
import { stableHash } from "../simulation/ids";
import {
  activeWorkRelationshipsAt,
  workStatusHistory,
} from "../simulation/life-queries";
import {
  openOrdinaryLifeRecords,
  refreshLifeOpportunities,
} from "../simulation/life-opportunities";
import {
  lifePlaceStateIdentities,
  searchLifePlaces,
} from "../simulation/life-places";
import {
  recordTownJobLoss,
  TOWN_JOB_END_REASONS,
} from "../simulation/living-world/town-labor-market";
import { claimStanceOf } from "../simulation/claim-stances";
import { readRelationshipStanding } from "../simulation/relationship-standing";
import {
  recordStoryMoments,
  storyMomentsOf,
} from "../simulation/story/moments";
import {
  bindSituation,
  situationCausesFor,
  situationOf,
} from "../simulation/story/situation-binding";
import { chooseSituationMove } from "../simulation/story/situations";
import { sceneBindingsFor } from "../simulation/scene-bindings";
import type { EntityId, World } from "../simulation/types";
import { sceneContext, sceneFamily } from "./contextual-scenes";
import { createNewGameWorld, DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { passOrdinaryDays } from "./ordinary-life";
import {
  availablePlayerConversations,
  projectPlayerConversation,
} from "./player-conversation";
import { commitConversationTurn } from "./run-b-conversation";
import type { StoryLinePacket } from "./story-voice";

/**
 * The situation runner on the conversation engine, in a seeded generated
 * week. The English engine's story banks are not filed yet, so these tests
 * word each line with a test voice that prints the speech act and the name
 * slot it was given: what is proved is who says what, when, to whom, and what
 * it changes, never the wording.
 */

const voice = vi.hoisted(() => ({ unvoiced: new Set<string>() }));

vi.mock("./story-voice", () => ({
  voiceStoryLine: (packet: StoryLinePacket) =>
    voice.unvoiced.has(packet.act)
      ? null
      : {
          text: `[${packet.act}${packet.facts.name ? ` ${packet.facts.name}` : ""}${packet.facts.about ? ` about ${packet.facts.about}` : ""}]`,
          parts: [`test-voice:${packet.act}`],
          sourceRecordIds: packet.sourceRecordIds,
        },
}));

/** A new game in a place drawn from all 56 by the seed's hash, advanced 7 days. */
function seededWeek(seed: string, startAge: number) {
  const states = lifePlaceStateIdentities();
  const state =
    states[parseInt(stableHash(seed).slice(0, 8), 16) % states.length]!;
  const place = searchLifePlaces("", 1, {
    stateJurisdictionKey: state.jurisdictionKey,
    scope: "locality",
  })[0]!;
  const game = createNewGameWorld({
    ...DEFAULT_NEW_GAME_SETUP,
    seed,
    startAge,
    placeKey: place.key,
  });
  const personId = game.playerPersonId;
  const opened = refreshLifeOpportunities(
    openOrdinaryLifeRecords(game.world, personId),
    personId,
  );
  return {
    world: recordStoryMoments(passOrdinaryDays(opened, 7)),
    personId,
    place: `${place.displayName}, US-${state.usps}`,
  };
}

function named(world: World, personId: EntityId): string {
  const person = world.people[personId]!;
  return `${person.givenName} ${person.familyName}`;
}

function momentOf(world: World, personId: EntityId, kindKey: string) {
  return storyMomentsOf(world, personId).find(
    (moment) => moment.kindKey === kindKey,
  )!;
}

function bound(world: World, input: Parameters<typeof bindSituation>[1]) {
  const result = bindSituation(world, input);
  if (result.kind !== "bound") throw new Error(result.reason);
  return result.world;
}

function say(world: World, player: EntityId, intent: string): World {
  const view = projectPlayerConversation(world, player, "scene-situation")!;
  expect(view, "the situation should be open").not.toBeNull();
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

// Seed p6-story-c draws Aberdeen Gardens, Washington: Mateo McKenzie, 34.
const WEEK = seededWeek("p6-story-c", 34);

describe("a reach-out in a seeded week", () => {
  // His sister Audrey asked to catch up on January 12.
  const { world: week, personId: mateo, place } = WEEK;
  const reached = momentOf(week, mateo, "reached-out");
  const audrey = reached.counterpartPersonIds[0]!;
  const world = bound(week, {
    typeKey: "reach-out",
    momentId: reached.id,
    playerPersonId: mateo,
  });

  it("casts the roles from the records that opened it", () => {
    expect(place).toBe("Aberdeen Gardens, Washington, US-WA");
    expect(named(week, audrey)).toBe("Audrey McKenzie");
    expect(
      situationCausesFor("reached-out").map((entry) => entry.type.key),
    ).toEqual(["reach-out"]);
    const binding = sceneBindingsFor(world, mateo, "situation").at(-1)!.binding;
    expect(situationOf(binding)).toEqual({
      typeKey: "reach-out",
      causeKind: "reached-out",
      momentId: reached.id,
      cast: { asking: [audrey], asked: [mateo] },
      playerRole: "asked",
      opener: "asking",
      opening: "request",
    });
    expect(binding.speakerPersonId).toBe(audrey);
    expect(binding.place).toBe("Aberdeen Gardens, Washington");
    expect(binding.sourceEntityIds).toEqual([
      reached.sourceRecordId,
      reached.id,
    ]);
    // Binding twice is refused: the situation is saved once.
    expect(
      bindSituation(world, {
        typeKey: "reach-out",
        momentId: reached.id,
        playerPersonId: mateo,
      }),
    ).toEqual({ kind: "unbound", reason: "Already bound" });
  });

  it("opens with the request the record already is, and offers his role's moves", () => {
    const view = projectPlayerConversation(world, mateo, "scene-situation")!;
    expect(view.topicLabel).toBe("Audrey McKenzie");
    // The records say how Audrey knows Mateo, so her line may use his name.
    expect(view.openingLine).toBe("[request Mateo]");
    expect(view.intents.map((intent) => [intent.key, intent.label])).toEqual([
      ["agree", "[agree Audrey]"],
      ["decline", "[decline Audrey]"],
      ["request", "[request Audrey]"],
      ["thank", "[thank Audrey]"],
      ["ask", "[ask Audrey]"],
    ]);
    // Asking for a meeting is nothing Mateo's own record settles: no Lie.
    expect(view.intents.some((intent) => intent.truthIntent)).toBe(false);
  });

  it("answers each of his moves with a move that answers it, through the decision path", () => {
    const decided = chooseSituationMove(world, {
      stableKey: "check",
      typeKey: "reach-out",
      roleKey: "asking",
      personId: audrey,
      towardPersonIds: [mateo],
      candidates: ["thank", "tell"],
    });
    expect(decided.context.randomness).toBe("none");
    const agreed = say(world, mateo, "agree");
    const view = projectPlayerConversation(agreed, mateo, "scene-situation")!;
    expect(view.settled).toBe(true);
    const turn = agreed.history.events.at(-1)!;
    expect(turn.context.immediateReaction).toBe(
      decided.outcomeKind === "selected"
        ? `[${decided.selectedOptionKey} Mateo]`
        : "[undecided Mateo]",
    );
    expect(turn.context.choice).toBe("“[agree Audrey]”");
  });

  it("writes what each move does to the two of them, and nothing for talking time", () => {
    const before = world.history.relationshipInteractions.length;
    const agreed = say(world, mateo, "agree");
    expect(agreed.currentMoment).toEqual(world.currentMoment);
    const written = agreed.history.relationshipInteractions.slice(before);
    const turn = agreed.history.events.at(-1)!;
    const own = written.find((entry) => entry.kind === "commitment:agreed");
    expect(own).toMatchObject({
      kind: "commitment:agreed",
      change: "strengthened",
      significance: "minor",
      eventId: turn.id,
      summary: "“[agree Audrey]”",
    });
    expect([...own!.personIds].sort()).toEqual([audrey, mateo].sort());
    // Audrey's answer writes its own aftermath, when her move has one.
    const replies = written.filter((entry) =>
      entry.tags.includes("story.reply"),
    );
    expect(replies.length).toBeLessThanOrEqual(1);
    for (const reply of replies) {
      expect(reply.eventId).toBe(turn.id);
      expect(reply.tags).toContain("story.type.reach-out");
    }
  });

  it("moves the two of them: agreeing commits them, declining does not", () => {
    const lines = (next: World) =>
      readRelationshipStanding(next, mateo, audrey).readings;
    expect(lines(world).commitment.band).toBe("none");
    expect(lines(world).trust.band).toBe("none");
    const agreed = say(world, mateo, "agree");
    expect(lines(agreed).commitment.band).toBe("slight");
    expect(lines(agreed).trust.band).toBe("slight");
    // Audrey answering a refusal accepts it; accepting a refusal commits nobody.
    const declined = say(world, mateo, "decline");
    expect(
      declined.history.relationshipInteractions.some(
        (interaction) => interaction.kind === "commitment:agreed",
      ),
    ).toBe(
      world.history.relationshipInteractions.some(
        (interaction) => interaction.kind === "commitment:agreed",
      ),
    );
    expect(lines(declined).commitment.band).toBe("none");
  });

  it("keeps the exchange open after a question, then settles it the same way after a reload", () => {
    const asked = say(world, mateo, "ask");
    const open = projectPlayerConversation(asked, mateo, "scene-situation")!;
    expect(open.settled).toBe(false);
    expect(open.intents.map((intent) => intent.key)).not.toContain("ask");
    const declined = say(asked, mateo, "decline");
    const reloaded = JSON.parse(JSON.stringify(declined)) as World;
    const left = projectPlayerConversation(declined, mateo, "scene-situation")!;
    const right = projectPlayerConversation(
      reloaded,
      mateo,
      "scene-situation",
    )!;
    expect(right.openingLine).toBe(left.openingLine);
    expect(right.settled).toBe(true);
  });

  it("offers nothing the engine cannot word", () => {
    voice.unvoiced.add("request");
    try {
      expect(
        availablePlayerConversations(world, mateo).some(
          (entry) => entry.subject === "scene-situation",
        ),
      ).toBe(false);
    } finally {
      voice.unvoiced.delete("request");
    }
    voice.unvoiced.add("decline");
    try {
      const view = projectPlayerConversation(world, mateo, "scene-situation")!;
      expect(view.intents.map((intent) => intent.key)).not.toContain("decline");
    } finally {
      voice.unvoiced.delete("decline");
    }
  });

  it("casts a first meeting's introducer from the introduction's own record", () => {
    const introduced = momentOf(
      week,
      mateo,
      "relationship:contact:introduced:maintained",
    );
    const next = bound(week, {
      typeKey: "first-meeting",
      momentId: introduced.id,
      playerPersonId: mateo,
    });
    const situation = situationOf(
      sceneBindingsFor(next, mateo, "situation").at(-1)!.binding,
    )!;
    expect(
      Object.fromEntries(
        Object.entries(situation.cast).map(([role, people]) => [
          role,
          people.map((id) => named(next, id)),
        ]),
      ),
    ).toEqual({
      newcomer: ["Mateo McKenzie"],
      met: ["Rafael Butler"],
      introducer: ["Wyatt Murray"],
    });
    expect(situation.opener).toBe("introducer");
    const view = projectPlayerConversation(next, mateo, "scene-situation")!;
    expect(view.room.physicallyPresentPersonIds).toHaveLength(3);
  });

  it("leaves a situation unbound when the player is not in it or a fill is not built", () => {
    const introduced = momentOf(
      week,
      mateo,
      "relationship:contact:introduced:maintained",
    );
    expect(
      bindSituation(week, {
        typeKey: "reach-out",
        momentId: introduced.id,
        playerPersonId: mateo,
      }),
    ).toEqual({
      kind: "unbound",
      reason:
        "reach-out is not opened by relationship:contact:introduced:maintained",
    });
    const started = momentOf(week, mateo, "school-started");
    expect(
      bindSituation(week, {
        typeKey: "first-day",
        momentId: started.id,
        playerPersonId: mateo,
      }),
    ).toEqual({
      kind: "unbound",
      reason: "first-day authority: the authority fill is not built",
    });
  });

  it("drops the favor family's 'long time' line when no contact is on record", () => {
    const favor = sceneBindingsFor(week, mateo, "favor").find(
      (entry) => entry.binding.speakerPersonId === audrey,
    )!;
    const lines = sceneFamily("favor").opening(
      sceneContext(week, favor.eventId, favor.binding),
    );
    expect(lines.length).toBeGreaterThan(0);
    expect(lines.some((line) => line.includes("long time"))).toBe(false);
  });
});

describe("news Mateo has to tell", () => {
  // Mateo is laid off through the town's own writer; the news is his to tell
  // the person he lives with.
  const { world: week, personId: mateo } = WEEK;
  const job = activeWorkRelationshipsAt(week, mateo)[0]!;
  const laidOff = recordStoryMoments(
    recordTownJobLoss(week, {
      stableKey: "p6-test:laid-off",
      workRelationshipId: job.relationship.id,
      effectiveAt: week.currentDate,
      status: "ended",
      reason: TOWN_JOB_END_REASONS.laidOff,
      supersedesStatusId: workStatusHistory(week, job.relationship.id).at(-1)!
        .id,
      provenance: { kind: "authored", note: "P6 situation fixture." },
    }),
  );
  const lost = momentOf(laidOff, mateo, "job-lost");
  const world = bound(laidOff, {
    typeKey: "news-arrives",
    momentId: lost.id,
    playerPersonId: mateo,
  });
  const situation = situationOf(
    sceneBindingsFor(world, mateo, "situation").at(-1)!.binding,
  )!;

  it("makes Mateo the bearer and the person he lives with the receiver", () => {
    expect(situation.playerRole).toBe("bearer");
    expect(situation.opener).toBe("bearer");
    expect(situation.cast.receiver!.map((id) => named(world, id))).toEqual([
      "Jacob Gomez",
    ]);
    expect(situation.cast.about).toEqual([mateo]);
  });

  it("lets the other person greet him, and offers a Lie beside telling, since the news is his own record", () => {
    const view = projectPlayerConversation(world, mateo, "scene-situation")!;
    expect(view.openingLine).toMatch(/^\[greet/);
    const byKey = new Map(view.intents.map((intent) => [intent.key, intent]));
    expect([...byKey.keys()]).toEqual([
      "tell",
      "comfort",
      "deflect",
      "ask",
      "lie",
    ]);
    expect(byKey.get("tell")!.truthIntent).toBe("sincere");
    expect(byKey.get("lie")).toMatchObject({
      truthIntent: "deliberate-deception",
      lieVariantOf: "tell",
    });
  });

  it("records the lie as a denial of the record, through the claim writer", () => {
    const lied = say(world, mateo, "lie");
    const turn = lied.history.events.at(-1)!;
    expect(claimStanceOf(turn)).toMatchObject({
      propositionKey: `story-moment:${lost.id}`,
      proposition: lost.weight.row,
      asserted: "denies",
      intent: "deceive",
      sourceEntityIds: [lost.sourceRecordId],
    });
  });
});
