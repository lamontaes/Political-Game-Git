// @vitest-environment node
import { expect, it } from "vitest";
import { buildBenchWorld } from "./world";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { applyChosenPerson } from "./creator";
import { familyRelation } from "../core2/closeness";
import { parentsOf } from "../core2/family-origin";
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
  let totalParents = 0;
  // A grown woman with a partner and children, then the entrant the world
  // opens with (parents and brothers and sisters at home).
  for (const [place, grown] of PINS.flatMap((row) => [
    [row, true] as const,
    [row, false] as const,
  ])) {
    const where = `${place.name} (${place.key}), seed ${place.seed}${grown ? ", grown" : ", young"}`;
    const { core, playerId } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
      // As the creator asks for it: the resident born nearest the chosen
      // birthday, a grown woman with a partner and children where the town
      // has one.
      ...(grown
        ? { playerBirthDate: "1980-06-01", playerGender: "female" as const }
        : {}),
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
    const originOf = (id: string) => core.people.get(id)!.looks!.origin!;
    const parents = parentsOf(core, me);
    // One of the player's parents carries the chosen origin, so the player is
    // still a child of one parent; the other may keep the drawn one.
    totalParents += parents.length;
    if (parents.length)
      expect(
        parents.map(originOf),
        `${where}: one parent of the player's origin`,
      ).toContain(origin);
    for (const id of members) {
      const person = core.people.get(id)!;
      const relation = id === me ? "me" : (familyRelation(core, me, id) ?? "?");
      const mine = originOf(id);
      if (relation === "partner" || relation === "household")
        expect(mine, `${where}: ${relation} ${id}`).toBe(drawn);
      if (["sibling", "child"].includes(relation)) {
        blood += 1;
        // Each is one of their own parents' origins (the player's among them).
        const own = parentsOf(core, id).map(originOf);
        expect(own, `${where}: ${relation} ${id}`).toContain(mine);
      }
      const looks = looksOf(core, id)!;
      const face = bustPersonOf({
        ...looks,
        seed: `${core.seed}:${looks.seed ?? id}`,
      });
      const tones = TONES[person.looks!.origin!];
      if (face)
        expect(tones, `${where}: ${relation} ${id}`).toContain(toneOf(face));
      seen.push(`${person.givenName} (${relation}, ${mine}) ${face?.id}`);
    }
    totalBlood += blood;
    totalOther += members.length - 1 - blood;
    console.log(
      `${where}: drawn ${drawn}, chose ${chosen.id} (tone ${toneOf(chosen)}) -> ${origin}; household ${seen.join(", ")}`,
    );
  }
  // Across the four towns there are blood relatives who took the chosen
  // origin and a partner or housemate who kept their own.
  expect(totalParents, "parents seen").toBeGreaterThan(0);
  expect(totalBlood, "children or siblings seen").toBeGreaterThan(0);
  expect(totalOther, "partners or housemates seen").toBeGreaterThan(0);
}, 900_000);
