import { describe, expect, it } from "vitest";
import { recordPersonDeath } from "../simulation/vitality";
import { deserializeWorld, serializeWorld } from "../simulation";
import type { EntityId, World } from "../simulation";
import {
  CLAIM_CONTRADICTION_EVENT,
  claimStanceOf,
} from "../simulation/claim-stances";
import { CLAIM_CONTRADICTION_TRANSITION_KEY } from "../simulation/claim-contradictions";
import { LIFE_CALLBACK_EVENT } from "../simulation/life-callbacks";
import { assertWorldIntegrity } from "../simulation";
import { recalledRequests } from "../simulation/people-recall";
import {
  REVISION_ASKED_EVENT,
  agreedRevision,
  decidePromiseRenegotiation,
  renegotiationAsked,
} from "../simulation/people-promise";
import { TRAIT_SHAPES } from "../simulation/people-trait-definitions";
import { sceneBindingsFor } from "../simulation/scene-bindings";
import { letAdultTimePass } from "./adult-life";
import type { ContextualSceneSubject } from "./contextual-scenes";
import { DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";
import {
  availablePlayerConversations,
  projectPlayerConversation,
} from "./player-conversation";
import { projectRecallCards } from "./people-recall-cards";
import { commitConversationTurn } from "./run-b-conversation";

/**
 * CRUNCH47 B1 (P4): a request that comes back, and the four different things
 * a person can say about it. A lie, an honest mistake, the truth and a refusal
 * to answer are four records, not one.
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
  const open = availablePlayerConversations(world, player).some(
    (entry) => entry.subject === subject && !entry.settled,
  );
  return open ? projectPlayerConversation(world, player, subject) : null;
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

const variantOf = (world: World, player: EntityId) =>
  sceneBindingsFor(world, player, "favor").at(-1)?.binding.variant;

/** Answer the first favor somebody asks, then live until they raise it again. */
function toRecalledRequest(seed: string, answer: "decline" | "agree") {
  const life = adultLife(seed);
  const player = life.playerPersonId;
  let world = life.world;
  for (let step = 0; step < 40; step += 1) {
    if (
      openView(world, player, "scene-favor") &&
      variantOf(world, player) === "favour-request"
    ) {
      break;
    }
    world = letAdultTimePass(world, 3);
  }
  expect(variantOf(world, player), "a favor is asked").toBe("favour-request");
  const answered = say(world, player, "scene-favor", answer);
  const asked = recalledRequests(answered, player)[0]!;
  expect(asked.status).toBe(answer === "decline" ? "declined" : "agreed");

  let later = answered;
  for (let step = 0; step < 140 && variantOf(later, player) !== "recalled";) {
    later = letAdultTimePass(later, 3);
    step += 1;
  }
  return { player, answered, later, request: asked };
}

/**
 * Built once for the whole file. This walks real months of simulated time, and
 * it used to be built twice with identical arguments — once per describe —
 * which vitest counts under `import` rather than `tests`, because work at
 * describe scope happens during collection.
 */
const declinedRequest = toRecalledRequest("people-memory-a", "decline");
/**
 * The agreed case, built once for the same reason: two tests need somebody who
 * said yes and was asked again, and building that twice walked a year of
 * simulated life a second time for nothing.
 */
const agreedRequest = toRecalledRequest("people-memory-b", "agree");

describe("PEOPLE P4: a request raised again", () => {
  const declined = declinedRequest;

  it("comes back only because the person who asked raised it", () => {
    expect(variantOf(declined.later, declined.player)).toBe("recalled");
    const raised = declined.later.history.events.filter(
      (event) => event.type === LIFE_CALLBACK_EVENT,
    );
    expect(raised.length).toBeGreaterThan(0);
    const binding = sceneBindingsFor(
      declined.later,
      declined.player,
      "favor",
    ).at(-1)!;
    expect(binding.binding.sourceEntityIds).toContain(raised.at(-1)!.id);
    // The record knows which of the three it was.
    expect(binding.binding.facts.status).toBe("declined");
  });

  it("offers the truth, a guess, a lie and a refusal, and marks only the lie", () => {
    const view = openView(declined.later, declined.player, "scene-favor")!;
    expect(view.openingLine).toMatch(/Where did we land|come of the/);
    expect(view.intents.map((intent) => intent.key)).toEqual([
      "said-no",
      "think-so",
      "claim-yes",
      "rather-not",
    ]);
    const marked = view.intents.filter(
      (intent) => intent.truthIntent === "deliberate-deception",
    );
    expect(marked.map((intent) => intent.key)).toEqual(["claim-yes"]);
    expect(
      view.intents.find((intent) => intent.key === "think-so")?.truthIntent,
    ).toBe("uncertain");
    expect(
      view.intents.find((intent) => intent.key === "said-no")?.truthIntent,
    ).toBe("sincere");
  });

  it("the truth and a refusal are checked against nothing", () => {
    for (const intent of ["said-no", "rather-not"]) {
      const said = say(declined.later, declined.player, "scene-favor", intent);
      expect(
        said.history.futureDueItems.filter(
          (item) => item.transitionKey === CLAIM_CONTRADICTION_TRANSITION_KEY,
        ),
      ).toHaveLength(0);
      const stance = claimStanceOf(said.history.events.at(-1)!)!;
      expect(stance.intent).toBe(intent === "said-no" ? "truthful" : "evade");
      if (intent === "rather-not") expect(stance.asserted).toBe("none");
    }
  });

  const settle = (world: World) => {
    let next = world;
    for (let day = 0; day < 4; day += 1) next = letAdultTimePass(next, 1);
    return next;
  };

  it("a lie and a mistake are told apart by the same evidence", () => {
    const lied = settle(
      say(declined.later, declined.player, "scene-favor", "claim-yes"),
    );
    const mistaken = settle(
      say(declined.later, declined.player, "scene-favor", "think-so"),
    );
    const foundIn = (world: World) =>
      world.history.events.filter(
        (event) => event.type === CLAIM_CONTRADICTION_EVENT,
      );
    expect(foundIn(lied)).toHaveLength(1);
    expect(foundIn(mistaken)).toHaveLength(1);
    expect(foundIn(lied)[0]!.tags).toContain("claim.intent.deceive");
    expect(foundIn(mistaken)[0]!.tags).toContain("claim.intent.from-memory");
    // The person who was there is the one who knows better.
    expect(foundIn(lied)[0]!.involvedEntityIds).toContain(
      declined.request.counterpartPersonId,
    );
    // And the scenes that follow are different scenes.
    expect(variantOf(lied, declined.player)).toBe("claim-came-back");
    expect(variantOf(mistaken, declined.player)).toBe("memory-corrected");
    const strained = lied.history.relationshipInteractions.at(-1)!;
    const corrected = mistaken.history.relationshipInteractions.at(-1)!;
    expect(strained.change).toBe("strained");
    expect(corrected.change).toBe("maintained");
    // A mistake is answered by owning it; a lie can still be stood behind.
    expect(
      openView(mistaken, declined.player, "scene-favor")!.intents.map(
        (intent) => intent.key,
      ),
    ).toEqual(["thank-for-correction"]);
    expect(
      openView(lied, declined.player, "scene-favor")!.intents.map(
        (intent) => intent.key,
      ),
    ).toEqual(["admit-it", "keep-denying"]);
    expect(serializeWorld(deserializeWorld(serializeWorld(lied)))).toBe(
      serializeWorld(lied),
    );
  });

  // These two build and advance a real life at test time; on the hosted runner
  // they take 8-9 s against vitest's 5 s default (unit shard 6, 11b34234).
  // The budget is the receiver's; the cheaper fixture is B's owed work.
  it("an answer that matches the record is never contradicted", () => {
    const agreed = agreedRequest;
    expect(variantOf(agreed.later, agreed.player)).toBe("recalled");
    const view = openView(agreed.later, agreed.player, "scene-favor")!;
    // Nobody is offered a lie about a promise they actually made; the guess
    // stays, because remembering wrongly in your own favour is still possible.
    expect(view.intents.map((intent) => intent.key)).toEqual([
      "said-yes",
      "think-so",
      "rather-not",
      // Something actually agreed can also be renegotiated (life-promise).
      "ask-for-more-time",
      "ask-for-smaller-part",
    ]);
    const guessed = settle(
      say(agreed.later, agreed.player, "scene-favor", "think-so"),
    );
    expect(
      guessed.history.events.filter(
        (event) => event.type === CLAIM_CONTRADICTION_EVENT,
      ),
    ).toHaveLength(0);
  }, 60_000);

  /**
   * CRUNCH47, cargo family life-promise. Asking to change an arrangement is
   * not dropping it: unless the other person actually agrees, what was agreed
   * still stands, and the asking is on the record either way.
   */
  it("asking to change an arrangement moves it only if they agree", () => {
    const agreed = agreedRequest;
    const request = recalledRequests(agreed.later, agreed.player)[0]!;
    const counterpart = request.counterpartPersonId;
    // Decided before any wording, and the same answer whichever words carry it.
    const decided = decidePromiseRenegotiation(agreed.later, {
      personId: agreed.player,
      counterpartPersonId: counterpart,
      requestEventId: request.requestEventId,
      revisionId: "more-time",
    }).outcome;
    expect(["accepts-change", "needs-answer", "holds-boundary"]).toContain(
      decided,
    );
    const asked = say(
      agreed.later,
      agreed.player,
      "scene-favor",
      "ask-for-more-time",
    );
    // The asking is always recorded; the change is a separate record that
    // exists only if they agreed to it.
    expect(renegotiationAsked(asked, request.requestEventId)).toBe(true);
    const revised = agreedRevision(asked, request.requestEventId);
    if (decided === "accepts-change") {
      expect(revised?.id).toBe("more-time");
    } else {
      expect(revised).toBeUndefined();
      // Refused or deferred, the original arrangement is untouched.
      expect(recalledRequests(asked, agreed.player)[0]!.status).toBe(
        request.status,
      );
    }
    // And it is asked once.
    expect(
      asked.history.events.filter(
        (event) => event.type === REVISION_ASKED_EVENT,
      ),
    ).toHaveLength(1);
    assertWorldIntegrity(asked);
  }, 60_000);

  /**
   * The cargo's own negative controls for this family.
   */
  it("keeps its own negative controls", () => {
    const declined = declinedRequest;
    // There is nothing to renegotiate about something you refused, so it is
    // not offered — no obligation is invented in order to move it.
    const view = openView(declined.later, declined.player, "scene-favor")!;
    expect(
      view.intents.some((intent) => intent.key.startsWith("ask-for-")),
    ).toBe(false);
    // "Options can be reordered without meaning changing": every choice is
    // identified by its key, and no meaning is carried by position.
    const keys = view.intents.map((intent) => intent.key);
    expect(new Set(keys).size).toBe(keys.length);
    // "Not opening People is not breach": reading changes nothing at all.
    expect(serializeWorld(declined.later)).toBe(serializeWorld(declined.later));
    // "Reliability low means follows-through under the saved catalog": the
    // trait's saved words decide what it means, and the consumer that holds an
    // arrangement reads the dependable end as the high one (Q47-004).
    expect(TRAIT_SHAPES.reliability.high.key).toBe("dependable");
    expect(TRAIT_SHAPES.reliability.low.key).toBe("lets-things-slip");
  });
});

describe("PEOPLE P4: recall cards", () => {
  const declined = declinedRequest;

  it("summarize the request and what was said, each with its own record", () => {
    const answered = say(
      declined.later,
      declined.player,
      "scene-favor",
      "said-no",
    );
    const cards = projectRecallCards(answered, declined.player);
    const request = cards.find((card) => card.kind === "request")!;
    expect(request.eventId).toBe(declined.request.requestEventId);
    expect(request.on).toBe(declined.request.askedOn);
    expect(request.onSpoken).toMatch(/\d{4}|today|yesterday/);
    expect(request.detail).toBe("You said you could not.");
    expect(request.otherPersonId).toBe(declined.request.counterpartPersonId);
    const said = cards.find((card) => card.kind === "said")!;
    expect(said.eventId).toBe(answered.history.events.at(-1)!.id);
    expect(said.title).toContain("You told");
    // Newest first, and nothing is invented: every card names a real event.
    for (const card of cards) {
      expect(
        answered.history.events.some((event) => event.id === card.eventId),
      ).toBe(true);
    }
    expect(projectRecallCards(answered, declined.player)).toEqual(cards);
  });

  /**
   * CRUNCH47: somebody asking you something is not undone by their death, so
   * the card stays. But there is nobody left to answer, so it stops being an
   * open question, and the card says why rather than going quiet.
   */
  it("keep the memory when the person who asked has died, without keeping the question open", () => {
    const player = declined.player;
    const counterpart = declined.request.counterpartPersonId;
    const before = projectRecallCards(declined.later, player).find(
      (card) => card.eventId === declined.request.requestEventId,
    )!;
    expect(before.otherPersonDied).toBe(false);
    const bereaved = recordPersonDeath(declined.later, {
      stableKey: "people-memory-test:asker-death",
      personId: counterpart,
      diedAt: declined.later.currentDate,
      causeKey: "cause:people-fixture",
      sourceEntityIds: [declined.later.id],
      summary: "Died of a privately disclosed illness.",
      provenance: { kind: "authored", note: "PEOPLE mortality fixture." },
    });
    const after = projectRecallCards(bereaved, player).find(
      (card) => card.eventId === declined.request.requestEventId,
    )!;
    // The memory is untouched: same record, same date, same words.
    expect(after.eventId).toBe(before.eventId);
    expect(after.on).toBe(before.on);
    expect(after.title).toBe(before.title);
    // What changed is only what is still being asked of the player.
    expect(after.otherPersonDied).toBe(true);
    expect(after.openQuestion).toBe(false);
    expect(after.detail).toContain("has since died");
    expect(
      projectRecallCards(bereaved, player).some((card) => card.openQuestion),
    ).toBe(false);
  });

  it("say plainly when the player has not answered yet", () => {
    const open = projectRecallCards(declined.answered, declined.player);
    expect(open.filter((card) => card.openQuestion)).toEqual([]);
    const asked = declined.answered.history.events.length;
    expect(asked).toBeGreaterThan(0);
  });
});
