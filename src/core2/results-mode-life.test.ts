/**
 * The fast clock, part 5: a skip leaves no hole in anyone's life. A place is
 * drawn from all 56 (GOLDEN_PATH_SEED replays a draw, the place and seed named
 * in every message) and its world is skipped five years in results mode. Every
 * record the table says a person remembers (`whoRemembers`) that is dated
 * inside the skipped years and names someone in the player's household or
 * circle is on that person's life record (`lifeOf`, the one reader the Journal,
 * the card and the You screen share), dated inside the skipped years, with the
 * record behind it. Draws are passed over, and named, when fewer than three
 * people of the circle had anything recorded about them in those years.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { lifeOf, whoRemembers } from "./person-life";
import type { PersonId } from "./types";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");
const YEARS = 5;
const DRAWS = 3;
/** How many people of the circle must hold what the records say of them. */
const CIRCLE = 3;

it(`five skipped years leave the player's household and circle with their lives written (seed ${seed})`, () => {
  setBookkeeping(false);
  const passed: string[] = [];
  for (let draw = 0; draw < DRAWS; draw += 1) {
    const place = drawPlace(`${seed}:${draw}`, "results-mode-life");
    const where = `${place.name} (${place.key}), run seed ${seed} draw ${draw}, world seed ${place.seed}`;
    const { core, playerId } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const start = makeIsoDate(core.date);
    const end = addDays(start, 365 * YEARS);
    advanceCore(core, end, { results: true });
    const player = core.people.get(playerId as PersonId)!;
    const household = core.households.get(player.householdId)!;
    const near = [
      ...new Set([
        ...household.memberIds,
        ...player.familyIds,
        ...player.knownIds,
      ]),
    ].filter((id) => core.people.has(id));
    const owed = new Map<PersonId, string[]>();
    for (const event of core.durableLog.values()) {
      if (event.date <= start || event.date > end) continue;
      for (const id of whoRemembers(core, event))
        if (near.includes(id))
          owed.set(id, [...(owed.get(id) ?? []), event.id]);
    }
    if (owed.size < CIRCLE) {
      passed.push(
        `${where}: ${owed.size} of ${near.length} people had a record`,
      );
      continue;
    }
    for (const [id, records] of owed) {
      const life = new Map(lifeOf(core, id).map((row) => [row.id, row]));
      for (const record of records) {
        const row = life.get(record);
        expect(
          row,
          `${where}: ${id} remembers ${record}, dated inside the skipped years, on their life record`,
        ).toBeDefined();
        expect(
          row!.date > start && row!.date <= end,
          `${where}: ${id}'s ${record} is dated ${row!.date}, inside ${start} to ${end}`,
        ).toBe(true);
        expect(
          row!.record,
          `${where}: ${id}'s ${record} names its record`,
        ).toBeTruthy();
      }
    }
    process.stdout.write(
      `results-mode life: ${where}: ${owed.size} of ${near.length} people of the household and circle remember ${[...owed.values()].reduce((n, r) => n + r.length, 0)} records from the ${YEARS} skipped years, all on their life records\n`,
    );
    return;
  }
  throw new Error(
    `no drawn place gave ${CIRCLE} people of the household and circle a record in ${YEARS} years (seed ${seed}):\n${passed.join("\n")}`,
  );
}, 1_800_000);
