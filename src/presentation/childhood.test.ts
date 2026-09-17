import { describe, expect, it } from "vitest";
import { assertWorldIntegrity, serializeWorld } from "../simulation";
import { formativeIntervalAt } from "../simulation/character-history";
import {
  caregiverFor,
  inChildhood,
  playChildhoodMoment,
  projectChildhoodMoment,
} from "./childhood";
import { DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";

/**
 * CRUNCH47 B1 (P14): the early years happen to a child, and agency arrives
 * with age. The same authored situations either way; what changes is whose
 * choice it is.
 */

function child(seed: string, startAge: number) {
  const game = generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      seed,
      startAge,
      depth: "play-formative-years",
    }),
  ).game!;
  return { player: game.playerPersonId, world: game.world };
}

describe("PEOPLE P14: a childhood that is lived before it is directed", () => {
  const { player, world } = child("people-childhood-a", 6);

  it("a small child is watched, not played, and the adult at home is named", () => {
    expect(inChildhood(world, player)).toBe(true);
    expect(formativeIntervalAt(world, player)!.agency).toBe("caregiver-led");
    const moment = projectChildhoodMoment(world, player)!;
    expect(moment.action).toBe("watch");
    expect(moment.actionLabel).toBe("See what happened");
    expect(moment.caregiverPersonId).toBe(caregiverFor(world, player));
    expect(moment.caregiverName).toBeTruthy();
    expect(moment.note).toContain(moment.caregiverName!);
    expect(moment.scene).toBeTruthy();
    // Reading it changes nothing.
    expect(serializeWorld(world)).toBe(serializeWorld(world));
  });

  it("the player cannot choose for a five-year-old, and the adult's choice is recorded", () => {
    expect(() =>
      playChildhoodMoment(world, { personId: player, optionKey: "any" }),
    ).toThrow(/the adult responsible decides/);
    const played = playChildhoodMoment(world, { personId: player });
    expect(played.history.events.length).toBeGreaterThan(
      world.history.events.length,
    );
    // The child keeps the memory of it.
    const memories = played.history.memories.filter(
      (memory) => memory.personId === player,
    );
    expect(memories.length).toBeGreaterThan(
      world.history.memories.filter((memory) => memory.personId === player)
        .length,
    );
    assertWorldIntegrity(played);
  });

  it("an older child chooses, and the choice is theirs", () => {
    const teen = child("people-childhood-b", 15);
    expect(formativeIntervalAt(teen.world, teen.player)!.agency).toBe(
      "substantially-player-directed",
    );
    const moment = projectChildhoodMoment(teen.world, teen.player)!;
    expect(moment.action).toBe("choose");
    expect(moment.note).toBeNull();
    expect(() =>
      playChildhoodMoment(teen.world, { personId: teen.player }),
    ).toThrow(/name the choice/);
    const option = moment.scene!.options[0]!.key;
    const played = playChildhoodMoment(teen.world, {
      personId: teen.player,
      optionKey: option,
    });
    expect(played.history.events.length).toBeGreaterThan(
      teen.world.history.events.length,
    );
    assertWorldIntegrity(played);
  });

  it("the middle years are shared, and say so", () => {
    const middle = child("people-childhood-c", 10);
    const interval = formativeIntervalAt(middle.world, middle.player)!;
    expect(interval.agency).toBe("shared");
    const moment = projectChildhoodMoment(middle.world, middle.player)!;
    expect(moment.action).toBe("choose");
    expect(moment.note).toMatch(/old enough to be asked/);
  });

  it("agency arrives with age, on the record's own boundaries", () => {
    // Read the bands rather than living through them: the same contract the
    // surface reads, at each age it changes on.
    const seen = [6, 8, 13, 17].map((age) => {
      const at = child(`people-childhood-band-${age}`, age);
      const moment = projectChildhoodMoment(at.world, at.player)!;
      return [age, moment.agency, moment.action] as const;
    });
    expect(seen.map(([, agency]) => agency)).toEqual([
      "caregiver-led",
      "shared",
      "substantially-player-directed",
      "substantially-player-directed",
    ]);
    expect(seen.map(([, , action]) => action)).toEqual([
      "watch",
      "choose",
      "choose",
      "choose",
    ]);
    // An adult has no childhood moment at all.
    const grown = child("people-childhood-grown", 30);
    expect(inChildhood(grown.world, grown.player)).toBe(false);
    expect(projectChildhoodMoment(grown.world, grown.player)).toBeNull();
    expect(() =>
      playChildhoodMoment(grown.world, { personId: grown.player }),
    ).toThrow(/nothing to play/);
  });
});
