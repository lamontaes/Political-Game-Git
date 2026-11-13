/**
 * Nobody's card says they were born in the town it then says they moved to
 * (Fable A, Nov 13: "I was born in Angoon, Alaska in 2007." and then "In
 * 2008, I moved to Angoon, Alaska."). In a played world drawn from all 56,
 * every resident the moves pass brought to the county is told as born where
 * they lived on the day they were born, the place their move came from, as
 * the run's birth record says.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { gameStartDate } from "../core2/game-start";
import { openWholePast } from "../core2/modules/people";
import { residenceOn } from "../core2/past-module";
import { corePlaceByJurisdictionId } from "../core2/place-lookup";
import { preStartHistory } from "../core2/pre-start";
import type { PersonId } from "../core2/types";
import { knownCard } from "./card";
import { buildBenchWorld } from "./world";

const seed = process.env.LIFE_SEED ?? randomBytes(8).toString("hex");
/** Places drawn until one has a resident who moved there; the ones passed over are named. */
const TRIES = 5;

it(`a card never says born in the town it says they moved to (seed ${seed})`, () => {
  const passed: string[] = [];
  for (let attempt = 0; attempt < TRIES; attempt += 1) {
    const drawn = attempt ? `${seed}-${attempt}` : seed;
    const place = drawPlace(drawn, "card-born-where");
    const where = `${place.name} (${place.key}), seed ${drawn}`;
    const movers = checkTown(place, where);
    if (movers) {
      process.stdout.write(
        `born where, in ${where}: ${movers} residents moved there, none told as born there${passed.length ? `; passed over ${passed.join(", ")} (no one moved in)` : ""}.\n`,
      );
      return;
    }
    passed.push(where);
  }
  throw new Error(
    `No drawn place had a resident who moved in: ${passed.join(", ")}`,
  );
}, 1_800_000);

/** Every resident brought to the county is told as born where their move came from; returns how many there were. */
function checkTown(place: ReturnType<typeof drawPlace>, where: string): number {
  const { core } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const town = core.people.get(core.playerId as PersonId)!.placeId;
  const townName = corePlaceByJurisdictionId(town as never)!.displayName;
  let movers = 0;
  for (const person of [...core.people.values()].sort((a, b) =>
    a.id.localeCompare(b.id),
  )) {
    if (!person.alive || person.placeId !== town || person.tier === "husk")
      continue;
    openWholePast(core, person.id);
    const [moved] = preStartHistory(core, {
      kind: "person.moved-in",
      personId: person.id as PersonId,
    });
    if (!moved) continue;
    movers += 1;
    // Where they lived on the day they were born is where the move came from.
    expect(
      residenceOn(core, person, person.birthDate).placeId,
      `${person.id}, ${where}`,
    ).toBe(moved.facts.fromPlaceId);
    const text = JSON.stringify(knownCard(core, core.playerId!, person.id));
    expect(
      text.includes(`Born in ${townName}`),
      `${person.id} (${moved.id}) is told as born in ${townName}, ${where}`,
    ).toBe(false);
  }
  return movers;
}
