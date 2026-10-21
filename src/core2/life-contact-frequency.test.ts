import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";

// P13 reported no contact with the player's own household and contact with
// twenty school acquaintances on 134 to 236 days of a year. In the played
// world the household is the daily company and acquaintances are rare.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");
const DAYS = 355;
/** Places drawn at most to find a player with both housemates and acquaintances. */
const DRAWS = 4;

/** Days of contact over the year with each tie, split into the player's housemates and acquaintances. */
function yearOf(draw: number) {
  const drawSeed = draw ? `${seed}:${draw}` : seed;
  const place = drawPlace(drawSeed, "life-contact-frequency");
  const where = `${place.name} (${place.key}), draw seed ${drawSeed}, world seed ${place.seed}`;
  const { core } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const player = core.people.get(core.playerId!)!;
  const days = new Map<string, number>();
  for (let d = 0; d < DAYS; d += 1) {
    advanceCore(core, addDays(makeIsoDate(core.date), 1));
    for (const id of core.relationshipsByPerson.get(player.id) ?? [])
      if (core.relationships.get(id)!.lastContactDate === core.date)
        days.set(id, (days.get(id) ?? 0) + 1);
  }
  const household: number[] = [];
  const others: number[] = [];
  for (const id of core.relationshipsByPerson.get(player.id) ?? []) {
    const row = core.relationships.get(id)!;
    const otherId = row.actorId === player.id ? row.otherId : row.actorId;
    const other = core.people.get(otherId);
    if (!other?.alive) continue;
    // Family living elsewhere (a parent or sibling at a distance) is close
    // kin, kept in touch often; only acquaintances are held to "rarely".
    if (other.householdId !== player.householdId && row.kind === "family")
      continue;
    (other.householdId === player.householdId ? household : others).push(
      days.get(id) ?? 0,
    );
  }
  process.stdout.write(
    `CONTACT ${where} household ${household.join(",")} others ${others.join(",")}\n`,
  );
  return { where, household, others };
}

it(`the player's household is in contact most days and acquaintances rarely (seed ${seed})`, () => {
  setBookkeeping(false);
  const tried: string[] = [];
  for (let draw = 0; draw < DRAWS; draw += 1) {
    const { where, household, others } = yearOf(draw);
    tried.push(where);
    // A player living alone or knowing no one outside the home can't show
    // both halves; the next place is drawn.
    if (!household.length || !others.length) continue;
    // Whoever lives with the player is in contact on a good share of days.
    expect(Math.max(...household), where).toBeGreaterThan(DAYS / 4);
    // Acquaintances outside the household and family are not in contact on most days.
    for (const n of others) expect(n, where).toBeLessThan(DAYS / 4);
    return;
  }
  throw new Error(
    `no drawn place had a player with both housemates and acquaintances: ${tried.join("; ")}`,
  );
}, 900_000);
