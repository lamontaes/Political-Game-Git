/**
 * Every move before the start (gap sheet, Nov 12, 2026, row 16): an adult
 * opened in a played world drawn from all 56 has a move to another home
 * inside their county at the ACS rate for their age and state, and can have
 * several; the move into the county stays one record, and no life tells one
 * move twice. Prints the town's share that moved within the county in the
 * year before the start beside the ACS share for the same people's ages.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { gameStartDate } from "./game-start";
import { ageOnDate, makeIsoDate } from "./kernel/dates";
import { openWholePast } from "./modules/people";
import { withinCountyRateFor } from "./modules/moves";
import { lifeOf } from "./person-life";
import { PERSON_MOVED_WITHIN } from "./past-moves";
import { preStartHistory } from "./pre-start";
import type { PersonId } from "./types";

const seed = process.env.LIFE_SEED ?? randomBytes(8).toString("hex");
const place = drawPlace(seed, "past-moves-within");
const where = `${place.name} (${place.key}), seed ${seed}`;

it(`a past holds moves inside the county, in ${where}`, () => {
  const { core } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const town = core.people.get(core.playerId as PersonId)!.placeId;
  const adults = [...core.people.values()]
    .filter(
      (p) =>
        p.alive &&
        p.placeId === town &&
        ageOnDate(makeIsoDate(p.birthDate), makeIsoDate(core.date)) >= 19,
    )
    .sort((a, b) => a.id.localeCompare(b.id));
  expect(adults.length, where).toBeGreaterThan(9);
  for (const person of adults) openWholePast(core, person.id);
  const yearBefore = `${Number(core.startedAt.slice(0, 4)) - 1}${core.startedAt.slice(4)}`;
  let any = 0,
    several = 0,
    lastYear = 0,
    expected = 0;
  for (const person of adults) {
    const rows = preStartHistory(core, {
      kind: PERSON_MOVED_WITHIN,
      personId: person.id,
    });
    if (rows.length) any += 1;
    if (rows.length > 1) several += 1;
    if (rows.some((row) => row.date >= yearBefore && row.date < core.startedAt))
      lastYear += 1;
    expected += withinCountyRateFor(
      person.placeId,
      ageOnDate(makeIsoDate(person.birthDate), makeIsoDate(yearBefore)),
    );
    const moves = lifeOf(core, person.id).filter((e) => e.life === "move");
    // Every move is told once: no two on one day to one place.
    const keys = moves.map(
      (e) => `${e.date}|${String(e.facts?.toPlaceId ?? e.placeId ?? "")}`,
    );
    expect(new Set(keys).size, `${person.id} moves, ${where}`).toBe(
      keys.length,
    );
    for (const row of rows) {
      expect(row.date < core.startedAt, row.id).toBe(true);
      expect(
        moves.some((e) => e.id === row.id && e.what === "moved-within"),
        `${row.id} is told in their life`,
      ).toBe(true);
    }
  }
  process.stdout.write(
    `moves inside the county in ${where}: ${any} of ${adults.length} adults have one, ${several} have two or more; in the year before the start ${lastYear} moved against ${expected.toFixed(1)} by the ACS rate for their ages.\n`,
  );
  expect(any, `someone moved inside the county, ${where}`).toBeGreaterThan(0);
  expect(several, `someone moved more than once, ${where}`).toBeGreaterThan(0);
  // The year before: within three standard deviations of the ACS count.
  const sd = Math.sqrt(expected);
  expect(Math.abs(lastYear - expected), where).toBeLessThanOrEqual(3 * sd + 1);
}, 1_800_000);
