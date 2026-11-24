/**
 * The school and the work before a move are named (core-life-record-part-3):
 * an adult who came to town after finishing school has a card that names an
 * employer in the place they came from, and names no school the world does
 * not hold (audit row 37, realistic-not-real), the same when
 * opened a second time and after the world is saved and loaded. Places drawn
 * from all 56; each world is searched for such an adult, and what was passed
 * over is named. Replay with GOLDEN_PATH_SEED.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { knownCard } from "../bench/card";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { ageOnDate, makeIsoDate } from "./kernel/dates";
import { openWholePast } from "./modules/people";
import { preStartHistory } from "./past";
import { PERSON_MOVED_IN } from "./past-module";
import { SCHOOL_STARTED } from "./past-school";
import { organizationName } from "./places-elsewhere";
import { restoreWorld, snapshotWorld } from "./snapshot";
import type { CoreState, PersonId } from "./types";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const DRAWS = 6;
/** Out of high school by then: the move came after their school years. */
const SCHOOL_DONE_AGE = 19;

const build = (worldSeed: string, key: string) =>
  buildBenchWorld(worldSeed, gameStartDate(), {
    twoLevel: true,
    placeKey: key,
  });

/** An adult of the town whose move in came after their school years, with the record of the move. */
function movedAfterSchool(core: CoreState) {
  for (const person of [...core.people.values()].sort((a, b) =>
    a.id.localeCompare(b.id),
  )) {
    if (!person.alive || person.tier === "husk") continue;
    if (ageOnDate(makeIsoDate(person.birthDate), makeIsoDate(core.date)) < 25)
      continue;
    openWholePast(core, person.id);
    const moved = preStartHistory(core, {
      kind: PERSON_MOVED_IN,
      personId: person.id,
    })[0];
    if (!moved) continue;
    const ageThen = ageOnDate(
      makeIsoDate(person.birthDate),
      makeIsoDate(moved.date),
    );
    if (ageThen < SCHOOL_DONE_AGE) continue;
    const schools = preStartHistory(core, {
      kind: SCHOOL_STARTED,
      personId: person.id,
    }).filter((row) => row.date < moved.date && row.placeId !== person.placeId);
    const work = preStartHistory(core, { personId: person.id }).filter(
      (row) =>
        row.kind === "person.work-spell" &&
        row.date < moved.date &&
        typeof row.facts.organizationId === "string",
    );
    if (schools.length && work.length) return { person, moved, schools, work };
  }
  return undefined;
}

it("an adult who came to town after school has an employer named where they came from and no school the world lacks, the same every time", () => {
  setBookkeeping(false);
  const passed: string[] = [];
  for (let draw = 0; draw < DRAWS; draw += 1) {
    const place = drawPlace(`${seed}:${draw}`, "life-record-elsewhere");
    const world = build(place.seed, place.key);
    const core = world.core;
    const where = `${world.place.displayName} (${place.key}), seed ${seed}:${draw}`;
    const found = movedAfterSchool(core);
    if (!found) {
      passed.push(`${where} (no adult who moved in after school)`);
      continue;
    }
    const { person, schools, work } = found;
    // A school the world holds no organization for has no name.
    const school = organizationName(core, String(schools[0]!.facts.schoolId));
    expect(
      school,
      `${where}: ${person.id} school is the world's own or unnamed`,
    ).toBe(core.organizations.get(String(schools[0]!.facts.schoolId))?.name);
    const employer = organizationName(
      core,
      String(work[0]!.facts.organizationId),
    );
    expect(employer, `${where}: ${person.id} employer named`).toBeTruthy();
    const card = () =>
      knownCard(core, core.playerId!, person.id).history.map(
        (line) => `${line.kind}: ${line.text}`,
      );
    const first = card();
    expect(
      first.some((line) => line.startsWith("school")),
      `${where}: ${person.id} card tells the school years: ${first.join(" | ")}`,
    ).toBe(true);
    expect(
      first.some((line) => line.startsWith("work") && line.includes(employer!)),
      `${where}: ${person.id} card names ${employer}: ${first.join(" | ")}`,
    ).toBe(true);
    expect(card(), `${where}: opened twice`).toEqual(first);
    // Saved and loaded: the same card.
    const loaded = build(place.seed, place.key).core;
    restoreWorld(loaded, JSON.parse(JSON.stringify(snapshotWorld(core))));
    expect(
      knownCard(loaded, loaded.playerId!, person.id as PersonId).history.map(
        (line) => `${line.kind}: ${line.text}`,
      ),
      `${where}: after a reload`,
    ).toEqual(first);
    process.stdout.write(
      `life record elsewhere: ${where}; ${person.id} came from ${String(found.moved.facts.fromPlaceId)} on ${found.moved.date}: school ${school ?? "none named"}, employer ${employer}; passed over ${passed.length} places\n${first.map((line) => `  ${line}`).join("\n")}\n`,
    );
    return;
  }
  throw new Error(
    `no drawn place in ${DRAWS} had an adult who moved in after school with school and work before it: ${passed.join("; ")}`,
  );
}, 1_800_000);
