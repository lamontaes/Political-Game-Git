/**
 * A relative who lives elsewhere has a whole past when their card is opened
 * (pool item life-relatives-who-live-elsewhere-have-a-past; the owner's
 * ruling, Nov 9, 2026: each person's past covers their whole life, written
 * when they are opened). One place drawn from all 56 and the named repro
 * (Caño Martín Peña, Puerto Rico, seed 50fe2d1143af), each built twice. The
 * place and seed are in every message; replay with ELSEWHERE_SEED and
 * ELSEWHERE_PLACE_KEY.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { knownCard } from "../bench/card";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { lifeOf, livesElsewhere } from "./modules/people";
import { preStartHistory } from "./past";
import type { CoreState, PersonId } from "./types";

setBookkeeping(false);

const seed = process.env.ELSEWHERE_SEED ?? randomBytes(8).toString("hex");
const drawn = drawPlace(seed, "relatives-elsewhere-past");
const placeKey = process.env.ELSEWHERE_PLACE_KEY ?? drawn.key;

/** A relative is old enough to have been to school and to work by the opening. */
const OLDER_BY_YEARS = 25;

const CASES = [
  { label: "drawn", seed: drawn.seed, key: placeKey, shown: seed },
  // The second session's repro (Notes on docs/pool/items/core-life-record.md).
  {
    label: "named repro",
    seed: "50fe2d1143af",
    key: "7212806",
    shown: "50fe2d1143af",
  },
];

const build = (worldSeed: string, key: string) =>
  buildBenchWorld(worldSeed, gameStartDate(), {
    twoLevel: true,
    placeKey: key,
  });

/** The relatives elsewhere on the player's list (their family and the people they know), by id. */
function relativesElsewhere(core: CoreState): PersonId[] {
  const player = core.people.get(core.playerId as PersonId)!;
  return [...new Set([...player.familyIds, ...player.knownIds])]
    .map((id) => core.people.get(id as PersonId))
    .filter((person) => person && livesElsewhere(core, person))
    .map((person) => person!.id)
    .sort();
}

const bornYear = (core: CoreState, id: string) =>
  Number(core.people.get(id as PersonId)!.birthDate.slice(0, 4));

const rowsOf = (core: CoreState, id: string) =>
  JSON.stringify(preStartHistory(core, { personId: id as PersonId }));

describe.each(CASES)("a relative elsewhere has a past ($label)", (row) => {
  it("each older relative's card tells school and work before the player was born, the same in a twin world", () => {
    const world = build(row.seed, row.key);
    const { core } = world;
    const where = `${world.place.displayName} (${row.key}), seed ${row.shown}`;
    const playerId = core.playerId as PersonId;
    const playerBorn = bornYear(core, playerId);
    const opening = Number(core.startedAt.slice(0, 4));
    const older = relativesElsewhere(core).filter(
      (id) => bornYear(core, id) < opening - OLDER_BY_YEARS,
    );
    console.log(
      `relatives-elsewhere: ${where}; ${relativesElsewhere(core).length} relatives elsewhere, ${older.length} born before ${opening - OLDER_BY_YEARS}`,
    );
    expect(
      older.length,
      `${where}: no older relative elsewhere to open`,
    ).toBeGreaterThan(0);
    for (const id of older) {
      const label = `${where}: ${id} born ${bornYear(core, id)}`;
      const card = knownCard(core, playerId, id);
      const person = core.people.get(id)!;
      // Opening writes their past and leaves them a relative elsewhere.
      expect(person.tier, label).toBe("husk");
      expect(livesElsewhere(core, person), label).toBe(true);
      const life = lifeOf(core, id);
      const school = life.filter((e) => e.life === "school");
      const work = life.filter((e) => e.life === "work");
      expect(
        school.length,
        `${label}: no school on their list`,
      ).toBeGreaterThan(0);
      expect(work.length, `${label}: no work on their list`).toBeGreaterThan(0);
      // Born before the player: their schooling is dated before the player's birth year.
      if (bornYear(core, id) + 6 < playerBorn)
        expect(
          school.some((e) => Number(e.date.slice(0, 4)) < playerBorn),
          `${label}: no school before ${playerBorn}`,
        ).toBe(true);
      const keys = card.history.map((line) => line.kind);
      expect(
        keys.some((key) => key === "school"),
        `${label}: the card tells no school (${keys.join(", ")})`,
      ).toBe(true);
      expect(
        keys.some((key) => key === "work"),
        `${label}: the card tells no work (${keys.join(", ")})`,
      ).toBe(true);
      console.log(
        `relatives-elsewhere: ${label}:\n${card.history.map((line) => `  [${line.kind}] ${line.text}`).join("\n")}`,
      );
    }
    // The same world built again, opened in the other order, one twice: the same rows.
    const twin = build(row.seed, row.key).core;
    const everyone = [...twin.people.keys()];
    const before = new Map(everyone.map((id) => [id, rowsOf(twin, id)]));
    for (const id of [...older].reverse()) knownCard(twin, playerId, id);
    knownCard(twin, playerId, older[0]!);
    for (const id of older)
      expect(rowsOf(twin, id), `${where}: ${id} differs`).toBe(
        rowsOf(core, id),
      );
    const changed = everyone.filter(
      (id) => rowsOf(twin, id) !== before.get(id),
    );
    expect(
      changed.sort(),
      `${where}: only the relatives opened change`,
    ).toEqual([...older].sort());
  }, 900_000);
});
