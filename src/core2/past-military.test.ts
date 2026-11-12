/**
 * Military service before the start (gap sheet, Nov 12, 2026, row 4): every
 * adult opened in a played world drawn from all 56 served or not by the ACS
 * 2024 veteran share for their sex, age and state against their own seeded
 * line. A veteran's past holds the day they enlisted and the day they were
 * discharged, both before the start and on their life, and their first
 * civilian job starts after it. The town's count of veterans is printed
 * beside the count the shares give for the same people.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { gameStartDate } from "./game-start";
import { ageOnDate, makeIsoDate } from "./kernel/dates";
import { openWholePast } from "./modules/people";
import { lifeOf } from "./person-life";
import { PAST_DISCHARGED, PAST_ENLISTED } from "./past-military";
import { PAST_WORK_SPELL, serviceOf, veteranShare } from "./past-work";
import { preStartHistory } from "./pre-start";
import type { PersonId } from "./types";

const seed = process.env.LIFE_SEED ?? randomBytes(8).toString("hex");
const place = drawPlace(seed, "past-military");
const where = `${place.name} (${place.key}), seed ${seed}`;

it(`a past holds military service at the veteran shares, in ${where}`, () => {
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
        ageOnDate(makeIsoDate(p.birthDate), makeIsoDate(core.startedAt)) >= 18,
    )
    .sort((a, b) => a.id.localeCompare(b.id));
  expect(adults.length, where).toBeGreaterThan(9);
  for (const person of adults) openWholePast(core, person.id);
  let served = 0;
  let expected = 0;
  let variance = 0;
  for (const person of adults) {
    const share = veteranShare(
      person.placeId,
      String(person.looks?.gender),
      ageOnDate(makeIsoDate(person.birthDate), makeIsoDate(core.startedAt)),
    );
    expected += share;
    variance += share * (1 - share);
    const [enlisted] = preStartHistory(core, {
      kind: PAST_ENLISTED,
      personId: person.id,
    });
    const [discharged] = preStartHistory(core, {
      kind: PAST_DISCHARGED,
      personId: person.id,
    });
    // The people engine wrote the service the rule gives, and no other.
    expect(Boolean(enlisted), `${person.id} served, ${where}`).toBe(
      Boolean(serviceOf(core, person)),
    );
    if (!enlisted) {
      expect(discharged, person.id).toBeUndefined();
      continue;
    }
    served += 1;
    expect(discharged, `${enlisted.id} has its discharge`).toBeTruthy();
    expect(discharged!.date < core.startedAt, discharged!.id).toBe(true);
    expect(enlisted.date <= discharged!.date, enlisted.id).toBe(true);
    const life = lifeOf(core, person.id);
    for (const row of [enlisted, discharged!])
      expect(
        life.some((event) => event.id === row.id && event.life === "service"),
        `${row.id} is told in their life`,
      ).toBe(true);
    // The first civilian job comes after the discharge (the same year or
    // later: a day before the world's window is told on the birthday).
    const first = preStartHistory(core, {
      kind: PAST_WORK_SPELL,
      personId: person.id,
    }).find((row) => row.facts.how === "first-job");
    if (first)
      expect(
        String(first.facts.startedAt).slice(0, 4) >=
          discharged!.date.slice(0, 4),
        `${first.id} begins after ${discharged!.id}`,
      ).toBe(true);
  }
  process.stdout.write(
    `military service in ${where}: ${served} of ${adults.length} adults served, against ${expected.toFixed(1)} by the ACS veteran shares for their sex, age and state.\n`,
  );
  expect(
    Math.abs(served - expected),
    `veterans against the shares, ${where}`,
  ).toBeLessThanOrEqual(3 * Math.sqrt(variance) + 1);
}, 1_800_000);
