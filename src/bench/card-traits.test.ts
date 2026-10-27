import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "./world";
import { personCard } from "./card";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import {
  PEOPLE_MIND_VERSION,
  PEOPLE_TRAITS,
} from "../core2/people-trait-definitions";

// Who you are says each trait as a phrase a person could say about someone
// (words-traits-middle-reads-as-a-sentence): a trait with no marked lean says
// what that person does, never "Neither, much", and no two traits on one
// card share a phrase.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");
const place = drawPlace(seed, "card-traits");

it(`Who you are says every trait in its own phrase, ${place.name} (${place.key}), seed ${seed}`, () => {
  setBookkeeping(false);
  const { core, playerId } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const where = `${place.name} (${place.key}), seed ${seed}`;
  const middling = (id: string) =>
    PEOPLE_TRAITS.filter(
      (trait) =>
        core.people.get(id)?.traits[`${PEOPLE_MIND_VERSION}:${trait}`] === 0,
    ).length;
  // The player, and the first full person with two or more middling traits.
  const other = [...core.people.values()].find(
    (person) => person.id !== playerId && middling(person.id) >= 2,
  );
  expect(other, `${where}: nobody with two middling traits`).toBeDefined();
  for (const id of [playerId!, other!.id]) {
    const card = personCard(core, id)!;
    const words = card.traits.map((trait) => trait.word);
    const here = `${where}: ${id} (${middling(id)} middling)`;
    expect(words.length, here).toBe(PEOPLE_TRAITS.length);
    for (const word of words) expect(word, here).not.toMatch(/\bNeither\b/i);
    expect(new Set(words).size, `${here}: ${words.join(" | ")}`).toBe(
      words.length,
    );
    console.log(
      `${here}: ${card.traits.map((t) => `${t.label}: ${t.word}`).join("; ")}`,
    );
  }
}, 600_000);
