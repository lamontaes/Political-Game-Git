import { describe, expect, it } from "vitest";
import { drawRandomPlace } from "../../tests/support/random-place";
import {
  addDays,
  ageOnDate,
  assertWorldIntegrity,
  serializeWorld,
} from "../simulation";
import { formativeIntervalAt } from "../simulation/character-history";
import { playerTemperament } from "../simulation/people-player-traits";
import { personTrait } from "../simulation/people-traits";
import { appendChildhoodEntry } from "../simulation/childhood-record";
import type { EntityId } from "../simulation";
import {
  caregiverChoice,
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

function child(seed: string, startAge: number, placeKey?: string) {
  const game = generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      seed,
      startAge,
      ...(placeKey ? { placeKey } : {}),
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
    const seed = "people-childhood-a";
    const place = drawRandomPlace(seed);
    const randomChild = child(seed, 6, place.key);
    expect(() =>
      playChildhoodMoment(randomChild.world, {
        personId: randomChild.player,
        optionKey: "any",
      }),
    ).toThrow(/the adult responsible decides/);
    const played = playChildhoodMoment(randomChild.world, {
      personId: randomChild.player,
    });
    expect(played.history.events.length).toBeGreaterThan(
      randomChild.world.history.events.length,
    );
    // The child keeps the memory of it.
    const memories = played.history.memories.filter(
      (memory) => memory.personId === randomChild.player,
    );
    expect(memories.length).toBeGreaterThan(
      randomChild.world.history.memories.filter(
        (memory) => memory.personId === randomChild.player,
      ).length,
    );
    const choice = played.history.childhoodRecords?.find(
      (entry) => entry.kind === "caregiver-choice",
    );
    expect(choice).toMatchObject({
      personId: randomChild.player,
      caregiverPersonId: caregiverFor(randomChild.world, randomChild.player),
      situationKey: projectChildhoodMoment(
        randomChild.world,
        randomChild.player,
      )!.scene!.situationKey,
    });
    const source = played.history.events.find(
      (event) => event.id === choice?.sourceRecordId,
    )!;
    expect(source.tags).toContain(`choice.${choice!.optionKey}`);
    expect(source.participants).toContainEqual(
      expect.objectContaining({
        personId: choice!.caregiverPersonId,
        role: "agency:actor",
      }),
    );
    const {
      id: _id,
      sequence: _sequence,
      recordedAt: _recordedAt,
      stableKey: _stableKey,
      ...entry
    } = choice!;
    expect(() =>
      appendChildhoodEntry(played, {
        ...entry,
        stableKey: "test-caregiver-choice-wrong-date",
        effectiveAt: addDays(choice!.effectiveAt, -1),
      }),
    ).toThrow(/adult caregiver and its formative event/);
    const sourceWithoutChild = {
      ...played,
      history: {
        ...played.history,
        events: played.history.events.map((event) =>
          event.id === source.id
            ? {
                ...event,
                involvedEntityIds: event.involvedEntityIds.filter(
                  (id) => id !== randomChild.player,
                ),
              }
            : event,
        ),
      },
    };
    expect(() =>
      appendChildhoodEntry(sourceWithoutChild, {
        ...entry,
        stableKey: "test-caregiver-choice-other-child-event",
      }),
    ).toThrow(/adult caregiver and its formative event/);
    const unauthorizedAdult = Object.keys(played.people).find(
      (candidate) =>
        candidate !== randomChild.player &&
        candidate !== choice!.caregiverPersonId &&
        ageOnDate(played.people[candidate]!.birthDate, played.currentDate) >=
          18,
    ) as EntityId | undefined;
    if (unauthorizedAdult) {
      expect(() =>
        appendChildhoodEntry(played, {
          ...entry,
          stableKey: "test-unauthorized-caregiver",
          caregiverPersonId: unauthorizedAdult,
        }),
      ).toThrow(/adult caregiver and its formative event/);
    }
    expect(
      played.history.events.some(
        (event) => event.id === choice?.sourceRecordId,
      ),
    ).toBe(true);
    expect(playerTemperament(played, randomChild.player).said).toEqual([]);
    assertWorldIntegrity(played);
    console.info(
      "S6_CHILDHOOD_CAREGIVER_NEW_GAME",
      JSON.stringify({ seed, place: place.key, personId: randomChild.player }),
    );
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

  it("records different social tendencies from the player's own lunch-table choices", () => {
    const middle = child("people-childhood-player-traits", 10);
    let before = middle.world;
    let foundLunchTable = false;
    for (let step = 0; step < 8; step += 1) {
      const moment = projectChildhoodMoment(before, middle.player);
      if (!moment?.scene) break;
      if (moment.scene.situationKey !== "formative.lunch-table") {
        before = playChildhoodMoment(before, {
          personId: middle.player,
          optionKey: moment.scene.options[0]!.key,
        });
        continue;
      }
      foundLunchTable = true;
      const madeRoom = playChildhoodMoment(before, {
        personId: middle.player,
        optionKey: "make-room",
      });
      const lookedAway = playChildhoodMoment(before, {
        personId: middle.player,
        optionKey: "look-away",
      });
      expect(personTrait(madeRoom, middle.player, "sociability").value).toBe(1);
      expect(personTrait(lookedAway, middle.player, "sociability").value).toBe(
        -1,
      );
      const record = lookedAway.history.personalityTendencies.at(-1)!;
      expect(record.provenance.kind).toBe("player-choice");
      expect(record.provenance.note).toBe("Look away");
      assertWorldIntegrity(madeRoom);
      assertWorldIntegrity(lookedAway);
      break;
    }
    expect(foundLunchTable).toBe(true);
  });

  it("the middle years are shared, and say so", () => {
    const middle = child("people-childhood-c", 10);
    const interval = formativeIntervalAt(middle.world, middle.player)!;
    expect(interval.agency).toBe("shared");
    const moment = projectChildhoodMoment(middle.world, middle.player)!;
    expect(moment.action).toBe("choose");
    expect(moment.note).toMatch(/old enough to be asked/);
  });

  it("the order the choices are written in does not decide anything", () => {
    const moment = projectChildhoodMoment(world, player)!;
    const scene = moment.scene!;
    const chosen = caregiverChoice(world, player, moment, scene);
    expect(scene.options.map((option) => option.key)).toContain(chosen);
    // The same situation with its options written in the opposite order is
    // still the same situation, and the adult still decides the same thing
    // (Q47-004: nothing may be read off the position of an option).
    const reversed = {
      ...scene,
      options: [...scene.options].reverse(),
    };
    expect(caregiverChoice(world, player, moment, reversed)).toBe(chosen);
    // An option nobody has classified attracts no leaning at all, rather than
    // inheriting one from where it happens to sit. It is still a real choice,
    // so it may be taken; what it must not do is depend on where it sits.
    const extra = {
      key: "a-key-nobody-classified",
      label: "Something else",
      description: "Something the bank has not classified.",
    };
    const front = { ...scene, options: [extra, ...scene.options] };
    const back = { ...scene, options: [...scene.options, extra] };
    expect(caregiverChoice(world, player, moment, front)).toBe(
      caregiverChoice(world, player, moment, back),
    );
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
    // Opens five lives. Measured 2026-09-22: about 3.5s on main at 616dcdb5
    // and about 4.5 to 6s once each opening seats its home state's legislature,
    // since every commit re-checks the whole world's integrity.
  }, 20_000);
});
