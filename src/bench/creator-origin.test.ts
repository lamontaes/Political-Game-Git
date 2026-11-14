// @vitest-environment node
import { expect, it } from "vitest";
import { buildBenchWorld } from "./world";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { applyChosenPerson } from "./creator";
import { bloodKin, familyRelation } from "../core2/closeness";
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
    name: "Eldorado, Pennsylvania",
    key: "4222856",
    seed: "8568-eldorado",
  },
  {
    name: "Litchfield, Illinois",
    key: "1743965",
    seed: "8568-litchfield",
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
  let totalBlood = 0;
  let totalOther = 0;
  for (const place of PINS) {
    const where = `${place.name} (${place.key}), seed ${place.seed}`;
    const { core, playerId } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
      // As the creator asks for it: the resident born nearest the chosen
      // birthday, a grown woman with a partner and children where the town
      // has one.
      playerBirthDate: "1980-06-01",
      playerGender: "female",
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
      birthYear: 1980,
      birthMonth: 6,
      birthDay: 1,
      recipe: { person: chosen.id, hair: "hair" },
    });
    const player = core.people.get(me)!;
    const origin = player.looks!.origin!;
    expect(TONES[origin], where).toContain(toneOf(chosen));
    const members = core.households.get(player.householdId)!.memberIds;
    const seen: string[] = [];
    let blood = 0;
    for (const id of members) {
      const person = core.people.get(id)!;
      const kin = id === me || bloodKin(core, me, id);
      const relation = id === me ? "me" : (familyRelation(core, me, id) ?? "?");
      // The player's blood family takes the chosen origin; a partner or a
      // housemate keeps the one they were drawn with.
      if (kin) {
        blood += id === me ? 0 : 1;
        expect(person.looks?.origin, `${where}: ${relation} ${id}`).toBe(
          origin,
        );
      } else
        expect(person.looks?.origin, `${where}: ${relation} ${id}`).toBe(drawn);
      const looks = looksOf(core, id)!;
      const face = bustPersonOf({
        ...looks,
        seed: `${core.seed}:${looks.seed ?? id}`,
      });
      const tones = TONES[person.looks!.origin!];
      if (face)
        expect(tones, `${where}: ${relation} ${id}`).toContain(toneOf(face));
      seen.push(`${person.givenName} (${relation}) ${face?.id}`);
    }
    totalBlood += blood;
    totalOther += members.length - 1 - blood;
    console.log(
      `${where}: drawn ${drawn}, chose ${chosen.id} (tone ${toneOf(chosen)}) -> ${origin}; household ${seen.join(", ")}`,
    );
  }
  // Across the four towns there are blood relatives who took the chosen
  // origin and a partner or housemate who kept their own.
  expect(totalBlood, "blood kin seen").toBeGreaterThan(0);
  expect(totalOther, "partners or housemates seen").toBeGreaterThan(0);
}, 900_000);
