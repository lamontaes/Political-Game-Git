import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { gameStartDate } from "./game-start";
import { pastArrestOf } from "./past-justice";
import type { PersonState } from "./types";

// Pins 21, past-justice (Nov 17): a person's arrest before the start follows
// their own reliability, with the same seeded line. Two people of one world
// with the same line, one steadier and one less so, differ in who is arrested.
const seed = process.env.PAST_JUSTICE_SEED ?? randomBytes(8).toString("hex");

it(`a less steady young person is arrested at least as often as a steadier one (seed ${seed})`, () => {
  const place = drawPlace(seed, "past-justice-own-reliability");
  const where = `${place.name} (${place.key}), seed ${seed}`;
  const { core } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const people = [...core.people.values()].filter((p) => p.alive);
  const withLevel = (person: PersonState, level: number) =>
    ({
      ...person,
      traits: { ...person.traits, "people-mind-v1:reliability": level },
    }) as PersonState;
  let steady = 0;
  let unsteady = 0;
  for (const person of people) {
    const high = pastArrestOf(core, withLevel(person, 2), core.startedAt);
    const low = pastArrestOf(core, withLevel(person, -2), core.startedAt);
    // Same line: whoever the steadier one's pull reaches, the less steady one's reaches too.
    if (high) expect(low, `${person.id}, ${where}`).toBeDefined();
    if (high) steady += 1;
    if (low) unsteady += 1;
  }
  expect(unsteady, where).toBeGreaterThan(steady);
}, 600_000);
