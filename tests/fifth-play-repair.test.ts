import { describe, expect, it } from "vitest";

import { composeConnectiveNarration } from "../src/presentation/life-narration";
import { householdConversationRoom } from "../src/presentation/ordinary-life";
import { buildLifeIntroduction } from "../src/presentation/life-introduction";
import { createNewGameWorld } from "../src/presentation/new-game";
import type { NewGameSetup } from "../src/simulation";

/**
 * The fifth human-play repairs: narrative voice and age/role semantics.
 */

function life(age: number, seed: string) {
  return createNewGameWorld({
    startKind: "custom",
    placeKey: "kentucky",
    startAge: age,
    depth: age < 18 ? "play-formative-years" : "summarize-earlier-life",
    startingLife: "ordinary-life",
    household: "shares-a-home",
    seed,
    givenName: null,
    familyName: null,
    questionnaire: "skipped",
    priors: [],
  } as NewGameSetup);
}

const NONSENSE =
  /carried on being|went on being|has the same week you do|looking at the same week you are|is looking at the same week/i;

describe("The narrator speaks to you, not about a stranger", () => {
  it("opens the life in second person, not '<Name> is <age>'", () => {
    const { world, playerPersonId } = life(10, "voice-proof");
    const opening = composeConnectiveNarration({
      world,
      personId: playerPersonId,
      since: world.currentDate,
      opening: true,
    });
    expect(opening.sentences.length).toBeGreaterThan(0);
    const first = opening.sentences[0]!;
    expect(first).toMatch(/^You're /);
    const joined = opening.sentences.join(" ");
    expect(joined).not.toMatch(NONSENSE);
    // The player's own full name is not the narrator's subject.
    const player = world.people[playerPersonId]!;
    expect(first).not.toContain(player.givenName);
  });

  it("introduces the household in second person", () => {
    const { world, playerPersonId } = life(10, "intro-voice");
    const intro = buildLifeIntroduction(world, playerPersonId);
    expect(intro).not.toBeNull();
    const text = intro!.sentences.join(" ");
    expect(intro!.sentences[0]).toMatch(/^You're /);
    expect(text).not.toMatch(NONSENSE);
  });
});

describe("A child is not handed an adult household negotiation", () => {
  it("offers no 'who carries the week' conversation to a ten-year-old", () => {
    // The fifth play cast a ten-year-old as the household manager. A character
    // somebody still holds authority over does not get this conversation.
    const { world, playerPersonId } = life(10, "child-household");
    expect(householdConversationRoom(world, playerPersonId)).toBeNull();
  });

  it("still offers it to an adult who answers for the household", () => {
    const { world, playerPersonId } = life(34, "adult-household");
    expect(householdConversationRoom(world, playerPersonId)).not.toBeNull();
  });
});
