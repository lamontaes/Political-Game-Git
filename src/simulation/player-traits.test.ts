import { describe, expect, it } from "vitest";

import {
  playerTemperament,
  recordPlayerTraitChoice,
} from "./people-player-traits";
import { PEOPLE_TRAITS, peopleTraitId } from "./people-trait-definitions";
import { personTrait } from "./people-traits";
import { loadedTraitRegistry } from "./trait-registry";
import { leansForDecision } from "./trait-packs";
import { registeredTraitConsiderations } from "./trait-readings";
import {
  createNewGameWorld,
  DEFAULT_NEW_GAME_SETUP,
} from "../presentation/new-game";
import { openOrdinaryLife } from "../presentation/ordinary-life";
import { assertWorldIntegrity, deserializeWorld, serializeWorld } from ".";
import type { EntityId, World } from "./types";

/**
 * "Obviously you as a character need your own. It's how you are portrayed to
 * people. Ignore it and say so. That shouldn't hold the game back."
 */
function life(seed: string) {
  const game = createNewGameWorld({
    ...DEFAULT_NEW_GAME_SETUP,
    startKind: "custom",
    seed,
    startAge: 40,
    depth: "summarize-earlier-life",
    questionnaire: "skipped",
    placeKey: "kentucky",
    household: "shares-a-home",
  });
  return {
    world: openOrdinaryLife(game.world, game.playerPersonId),
    playerId: game.playerPersonId,
  };
}

function somebodyElse(world: World, playerId: EntityId): EntityId {
  return (Object.keys(world.people) as EntityId[]).find(
    (id) => id !== playerId,
  )!;
}

describe("the played character's own temperament", () => {
  it("starts entirely unsaid, and says so rather than showing a seed", () => {
    const { world, playerId } = life("player-a");
    const temperament = playerTemperament(world, playerId);
    expect(temperament.said).toEqual([]);
    expect(temperament.unsaid).toEqual([...PEOPLE_TRAITS]);
  });

  it("records what the player chooses, as their own choice", () => {
    const { world, playerId } = life("player-b");
    const after = recordPlayerTraitChoice(world, {
      personId: playerId,
      trait: "sociability",
      value: 2,
      choice: "Said yes to everyone who asked, all year.",
      stableKey: "opening",
    });
    const temperament = playerTemperament(after, playerId);
    expect(temperament.said).toHaveLength(1);
    expect(temperament.said[0]!.trait).toBe("sociability");
    expect(temperament.said[0]!.value).toBe(2);
    expect(temperament.unsaid).not.toContain("sociability");

    // The provenance is the point: the store refuses any other kind for the
    // controlled person, and this is the path that guard was waiting for.
    const record = after.history.personalityTendencies.at(-1)!;
    expect(record.personId).toBe(playerId);
    expect(record.provenance.kind).toBe("player-choice");
    assertWorldIntegrity(after);
    expect(deserializeWorld(serializeWorld(after))).toEqual(after);
  });

  it("refuses to say who anybody else is", () => {
    const { world, playerId } = life("player-c");
    expect(() =>
      recordPlayerTraitChoice(world, {
        personId: somebodyElse(world, playerId),
        trait: "sociability",
        value: 2,
        choice: "Not the player's to say.",
        stableKey: "nope",
      }),
    ).toThrow(/controlled person's own choices/);
  });

  it("supersedes an earlier choice rather than piling up beside it", () => {
    const { world, playerId } = life("player-d");
    const first = recordPlayerTraitChoice(world, {
      personId: playerId,
      trait: "reliability",
      value: 2,
      choice: "Kept every plan made this year.",
      stableKey: "first",
    });
    const second = recordPlayerTraitChoice(first, {
      personId: playerId,
      trait: "reliability",
      value: -1,
      choice: "Let the last three slide.",
      stableKey: "second",
    });
    expect(personTrait(second, playerId, "reliability").value).toBe(-1);
    // Only this trait: the player carries other kinds of mind record from
    // life setup, which are not the five and are none of this path's business.
    const records = second.history.personalityTendencies.filter(
      (record) =>
        record.personId === playerId &&
        record.tendencyId === peopleTraitId("reliability"),
    );
    expect(records).toHaveLength(2);
    expect(records[1]!.supersedesTendencyId).toBe(records[0]!.id);
  });

  it("holds nothing back when the player never says", () => {
    // The requirement in one test: an unsaid temperament is not an error, not
    // a middle, and not a blocker. Everything still works and the player is
    // simply somebody nobody has anything recorded about.
    const { world, playerId } = life("player-e");
    expect(() => assertWorldIntegrity(world)).not.toThrow();
    expect(playerTemperament(world, playerId).said).toEqual([]);
    for (const trait of PEOPLE_TRAITS) {
      expect(personTrait(world, playerId, trait).recordId).toBeNull();
    }
  });
});

describe("how a character is portrayed to the people who deal with them", () => {
  it("lets the person deciding read the person asking, not only themselves", () => {
    const registry = loadedTraitRegistry();
    const rows = leansForDecision(registry, "contact.answer");
    const aboutSubject = rows.filter((row) => row.about === "subject");
    expect(aboutSubject.length).toBeGreaterThan(0);

    const { world, playerId } = life("subject-a");
    const other = somebodyElse(world, playerId);
    // With nothing recorded about the player, the rows about them contribute
    // nothing at all. Unobserved is not a middling reading, here as everywhere.
    const silent = registeredTraitConsiderations(
      world,
      registry,
      other,
      "test",
      "contact.answer",
      playerId,
    );
    expect(
      silent.some((consideration) =>
        consideration.explanation.startsWith("The person asking"),
      ),
    ).toBe(false);

    // Once the player has said who they are, the same decision hears it.
    const said = recordPlayerTraitChoice(world, {
      personId: playerId,
      trait: "reliability",
      value: 2,
      choice: "Kept every plan made this year.",
      stableKey: "portrayal",
    });
    const heard = registeredTraitConsiderations(
      said,
      registry,
      other,
      "test",
      "contact.answer",
      playerId,
    );
    expect(heard.map((consideration) => consideration.explanation)).toContain(
      "The person asking keeps the plans they make.",
    );
  });

  it("drops the rows about a subject when a decision names none", () => {
    const { world, playerId } = life("subject-b");
    const other = somebodyElse(world, playerId);
    const said = recordPlayerTraitChoice(world, {
      personId: playerId,
      trait: "reliability",
      value: 2,
      choice: "Kept every plan made this year.",
      stableKey: "portrayal",
    });
    // No subject means no subject. Falling back to the actor would put one
    // person's temperament in another person's mouth.
    const none = registeredTraitConsiderations(
      said,
      loadedTraitRegistry(),
      other,
      "test",
      "contact.answer",
    );
    expect(
      none.some((consideration) =>
        consideration.explanation.startsWith("The person asking"),
      ),
    ).toBe(false);
  });
});
