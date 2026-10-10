import { describe, expect, it } from "vitest";

import { drawRandomPlace } from "../../tests/support/random-place";
import {
  createMindProvenance,
  recordGoalState,
  type EntityId,
  type World,
} from "../simulation";
import {
  commitLifeConversation,
  projectLifeConversation,
  type LifeTalkIntent,
} from "./life-conversation";
import { openNextLifeScene } from "./life-scene-flow";
import { currentLifeTalkScene } from "./life-talk-presence";
import { tellableTopics } from "./life-talk-topics";
import { createNewGameWorld, type NewGameSetup } from "./new-game";
import { openOrdinaryLife } from "./ordinary-life";

/**
 * The owner's rules from grading batch 2 (October 8, 2026): every choice
 * names something real (R1), leaving is the screen's control (R2), and a
 * choice answers the other person's last line (R3).
 */

const SEED = "conversation-rules-oct9";

/** Choices that name nothing, and the goodbye line, all ruled out. */
const RULED_OUT = ["scene", "share", "acknowledge", "nothing", "leave"];

/**
 * A life at home with someone else in the room: the first of a few seeds,
 * each in its own randomly drawn place, whose opening finds somebody there.
 */
function lifeWithSomebody() {
  for (const suffix of ["a", "b", "c", "d", "e", "f", "g", "h"]) {
    const seed = `${SEED}-${suffix}`;
    const place = drawRandomPlace(seed);
    const game = createNewGameWorld({
      startKind: "custom",
      placeKey: place.key,
      startAge: 34,
      depth: "summarize-earlier-life",
      startingLife: "ordinary-life",
      household: "shares-a-home",
      seed,
      givenName: null,
      familyName: null,
      questionnaire: "skipped",
      priors: [],
    } as NewGameSetup);
    const opened = openOrdinaryLife(game.world, game.playerPersonId);
    const world = openNextLifeScene(opened, game.playerPersonId);
    const other = currentLifeTalkScene(
      world,
      game.playerPersonId,
    )?.presentPersonIds.find((id) => id !== game.playerPersonId);
    if (other)
      return { world, personId: game.playerPersonId, other, place, seed };
  }
  throw new Error("No seed found a life with somebody else in the room.");
}

function offered(world: World, personId: EntityId, other: EntityId) {
  return projectLifeConversation(world, personId, other)!.intents.map(
    (option) => option.key as string,
  );
}

function say(
  world: World,
  personId: EntityId,
  other: EntityId,
  intent: string,
): World {
  const view = projectLifeConversation(world, personId, other)!;
  return commitLifeConversation(world, {
    playerPersonId: personId,
    personId: other,
    intent: intent as LifeTalkIntent,
    revision: view.revision,
  });
}

/**
 * Sets the person's own need for privacy, through the goal writer: started,
 * or ended by superseding the state on record. Explicit test state, not an
 * inferred motive.
 */
function privacyNeed(
  world: World,
  personId: EntityId,
  status: "active" | "abandoned",
): World {
  const current = world.history.goalStates
    .filter(
      (record) =>
        record.personId === personId &&
        record.goalKey === "opening-life:privacy",
    )
    .at(-1);
  if (current?.status === status || (!current && status !== "active"))
    return world;
  return recordGoalState(world, {
    stableKey: `conversation-rules:privacy:${status}`,
    personId,
    goalKey: "opening-life:privacy",
    recordedAt: world.currentDate,
    objective: "Have some privacy now.",
    domain: "life:ordinary",
    scope: "personal",
    priority: "moderate",
    status,
    targetEntityId: null,
    deadline: null,
    outcome: null,
    provenance: createMindProvenance("authored", {
      note: "Explicit test-only privacy need, not an inferred motive.",
    }),
    replacesGoalId: null,
    supersedesGoalStateId: current?.id ?? null,
  });
}

const { world, personId, other, place, seed } = lifeWithSomebody();

describe(`conversation choices in ${place.displayName} (seed ${seed})`, () => {
  it("offers no choice that names nothing, and no goodbye, before or after a turn", () => {
    for (const ruledOut of RULED_OUT)
      expect(offered(world, personId, other)).not.toContain(ruledOut);
    const after = say(world, personId, other, "greet");
    for (const ruledOut of RULED_OUT)
      expect(offered(after, personId, other)).not.toContain(ruledOut);
  });

  it("offers each thing the player could tell, named, without asking first", () => {
    const topics = tellableTopics(world, personId, other);
    expect(topics.length).toBeGreaterThan(0);
    console.log(
      "tell topics",
      topics.map((topic) => topic.label),
    );
    const keys = offered(world, personId, other);
    for (const topic of topics) expect(keys).toContain(topic.key);
  });

  it("answers an open invitation only yes or no", () => {
    const free = privacyNeed(world, other, "abandoned");
    const invited = say(free, personId, other, "activity");
    const view = projectLifeConversation(invited, personId, other)!;
    expect(view.proposal?.status).toBe("proposed");
    expect(view.intents.map((option) => option.key)).toEqual([
      "acceptProposal",
      "declineProposal",
    ]);
  });

  it("explains a refusal from what was recorded, even after the need has passed", () => {
    const private_ = privacyNeed(world, other, "active");
    const refused = say(private_, personId, other, "activity");
    const asked = projectLifeConversation(refused, personId, other)!;
    expect(asked.proposal).toBeNull();
    expect(asked.transcript.at(-1)!.reply).toMatch(/privacy/);
    const passed = privacyNeed(refused, other, "abandoned");
    const why = say(passed, personId, other, "explain");
    expect(
      projectLifeConversation(why, personId, other)!.transcript.at(-1)!.reply,
    ).toBe("I'm not ready to talk about it. Please leave it there.");
  });
});
