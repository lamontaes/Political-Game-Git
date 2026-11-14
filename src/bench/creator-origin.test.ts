// @vitest-environment node
import { expect, it } from "vitest";
import { buildBenchWorld } from "./world";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { applyChosenPerson } from "./creator";
import { bustPeople } from "./bust";
import { bustPersonOf, toneOf } from "./whole-figures";
import { looksOf } from "./scene";
import rules from "./data/whole-figures.json" with { type: "json" };

// A creator life whose chosen face is of a skin tone the household's drawn
// origin does not paint carries its family with it
// (play-creator-look-and-family-share-an-origin; owner, Nov 8: "I'm Mexican
// and my son is white"): in two drawn places the player and every household
// member then share one origin, and each member's face is of its tones.
// Pinned to two named places and their world seeds (drawn once from all 56 at
// seed 12bbbd2da8760f2f; a random draw can land on an origin that paints every
// tone, which leaves no face to choose from outside it).
const PINS = [
  {
    name: "Liberty, Mississippi",
    key: "2840640",
    seed: "a39d870ce8fb161e403aeb54dbb2f9ba9789876a501aa6963c095e418145eb2f",
  },
  {
    name: "Midland, Louisiana",
    key: "2250325",
    seed: "277a13749936b06d7a2065daab42f5f92f4d84f732ae6a66110c8d35a30fc420",
  },
];
const TONES = rules.originTones as Record<string, readonly number[]>;

it("a chosen look's family shares its origin", () => {
  setBookkeeping(false);
  for (const place of PINS) {
    const where = `${place.name} (${place.key}), seed ${place.seed}`;
    const { core, playerId } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const me = playerId!;
    const drawn = core.people.get(me)!.looks!.origin!;
    // A woman of a tone the drawn origin does not paint.
    const chosen = bustPeople().find(
      (row) => row.sex === "woman" && !TONES[drawn]!.includes(toneOf(row)),
    )!;
    applyChosenPerson(core, me, {
      givenName: "Pat",
      familyName: core.people.get(me)!.familyName,
      gender: "female",
      birthYear: 2006,
      birthMonth: 6,
      birthDay: 1,
      recipe: { person: chosen.id, hair: "hair" },
    });
    const player = core.people.get(me)!;
    const origin = player.looks!.origin!;
    expect(TONES[origin], where).toContain(toneOf(chosen));
    const members = core.households.get(player.householdId)!.memberIds;
    const seen: string[] = [];
    for (const id of members) {
      const person = core.people.get(id)!;
      expect(person.looks?.origin, `${where}: ${id}`).toBe(origin);
      const looks = looksOf(core, id)!;
      const face = bustPersonOf({
        ...looks,
        seed: `${core.seed}:${looks.seed ?? id}`,
      });
      if (face)
        expect(TONES[origin], `${where}: ${id}`).toContain(toneOf(face));
      seen.push(`${person.givenName} ${face?.id}`);
    }
    console.log(
      `${where}: drawn ${drawn}, chose ${chosen.id} (tone ${toneOf(chosen)}) -> ${origin}; household ${seen.join(", ")}`,
    );
  }
}, 900_000);
