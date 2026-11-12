/**
 * The end of school before the start (gap sheet, Nov 12, 2026, row 15): an
 * adult opened in a played world drawn from all 56 has the day high school
 * ended, and, where their schooling level went on, the fall college began
 * and the day it ended, on the one calendar. The first job before the start
 * never begins before school ended, since both read the same day.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { gameStartDate } from "./game-start";
import { ageOnDate, makeIsoDate } from "./kernel/dates";
import { openWholePast } from "./modules/people";
import { lifeOf } from "./person-life";
import { COLLEGE_ENDED, COLLEGE_STARTED, SCHOOL_FINISHED } from "./past-school";
import {
  educationLevelOf,
  PAST_WORK_SPELL,
  schoolingEndsOf,
} from "./past-work";
import { preStartHistory } from "./pre-start";
import type { PersonId } from "./types";

const seed = process.env.LIFE_SEED ?? randomBytes(8).toString("hex");
const place = drawPlace(seed, "past-school-end");
const where = `${place.name} (${place.key}), seed ${seed}`;

it(`an adult's past holds school's end and college, in ${where}`, () => {
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
        ageOnDate(makeIsoDate(p.birthDate), makeIsoDate(core.date)) >= 23,
    )
    .sort((a, b) => a.id.localeCompare(b.id));
  expect(adults.length, where).toBeGreaterThan(9);
  for (const person of adults) openWholePast(core, person.id);
  const of = (kind: string, id: PersonId) =>
    preStartHistory(core, { kind, personId: id });
  const counts = { finished: 0, college: 0, degree: 0, someCollege: 0 };
  for (const person of adults) {
    const level = educationLevelOf(core, person);
    const [finished] = of(SCHOOL_FINISHED, person.id);
    expect(finished, `${person.id} (${level}) finished, ${where}`).toBeTruthy();
    counts.finished += 1;
    const life = lifeOf(core, person.id);
    expect(
      life.some((e) => e.id === finished!.id && e.what === "finished"),
      `${finished!.id} is told in their life`,
    ).toBe(true);
    const began = of(COLLEGE_STARTED, person.id)[0];
    const ended = of(COLLEGE_ENDED, person.id)[0];
    if (level === "no-college") {
      expect(began, person.id).toBeUndefined();
      continue;
    }
    expect(
      began && ended,
      `${person.id} (${level}) college, ${where}`,
    ).toBeTruthy();
    expect(began!.date > finished!.date, began!.id).toBe(true);
    expect(ended!.date > began!.date, ended!.id).toBe(true);
    expect(ended!.date).toBe(schoolingEndsOf(core, person));
    expect(
      life.some((e) => e.id === ended!.id && e.what === "college-ended"),
      ended!.id,
    ).toBe(true);
    counts.college += 1;
    if (level === "college") counts.degree += 1;
    else counts.someCollege += 1;
    // The first job the work pass finds waits for school's end: the same
    // year or later, since the work pass tells a day before the world's
    // window on the person's birthday in its year (a job held at the start
    // may be older: the jobs engine's own record of when it began).
    const first = of(PAST_WORK_SPELL, person.id).find(
      (row) => row.facts.how === "first-job",
    );
    if (first)
      expect(
        String(first.facts.startedAt).slice(0, 4) >= ended!.date.slice(0, 4),
        `${first.id} begins after ${ended!.id}`,
      ).toBe(true);
  }
  process.stdout.write(
    `school's end in ${where}: ${counts.finished} of ${adults.length} adults 23 and over finished high school; ${counts.college} went to college (${counts.degree} with a bachelor's, ${counts.someCollege} some college).\n`,
  );
  expect(counts.college, `someone went to college, ${where}`).toBeGreaterThan(
    0,
  );
}, 1_800_000);
