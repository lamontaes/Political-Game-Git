/**
 * The life record, part 6: an adult opened in a played world drawn from all
 * 56 may have an earlier partnership that ended before the start, made by
 * the opening's own partnership chain against their seeded lines. Each is a
 * record with a year and the partner's name; opening again or building the
 * world again gives the same past. The town's share, among adults living
 * without a partner now, of those the past gives an earlier partnership is
 * printed beside the place's ACS share of such adults ever married.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import data from "./data/opening-partnership.json" with { type: "json" };
import { gameStartDate } from "./game-start";
import { ageOnDate, makeIsoDate } from "./kernel/dates";
import { lifeOf, openWholePast } from "./modules/people";
import { partnershipGeo } from "./opening-partnership";
import { PAST_PARTNERSHIP_ENDED } from "./past-partners";
import {
  hospitalStayAges,
  hospitalStayShare,
  PAST_HOSPITAL_STAY,
} from "./past-health";
import { preStartHistory } from "./pre-start";
import type { CoreState, PersonId, PersonState } from "./types";

const seed = process.env.LIFE_SEED ?? randomBytes(8).toString("hex");
const place = drawPlace(seed, "past-partners");
const where = `${place.name} (${place.key}), seed ${seed}`;

const build = () => {
  const built = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  return built.core;
};

/** The town's residents who are grown (officials elsewhere live alone on record). */
const adultsOf = (core: CoreState, town: string) =>
  [...core.people.values()]
    .filter(
      (p) =>
        p.alive &&
        p.placeId === town &&
        ageOnDate(makeIsoDate(p.birthDate), makeIsoDate(core.date)) >= 18,
    )
    .sort((a, b) => a.id.localeCompare(b.id));

const partneredNow = (core: CoreState, person: PersonState) =>
  (person.pastFacts ?? []).some((fact) => fact.kind === "family:partner") ||
  [...core.familyLinks.values()].some(
    (link) => link.kind === "partner" && link.personIds.includes(person.id),
  );

const endedOf = (core: CoreState, id: PersonId) =>
  preStartHistory(core, { kind: PAST_PARTNERSHIP_ENDED, personId: id });

it(`an earlier partnership comes from the opening's chain, in ${where}`, () => {
  const core = build();
  const town = core.people.get(core.playerId as PersonId)!.placeId;
  const adults = adultsOf(core, town);
  expect(adults.length, where).toBeGreaterThan(9);
  for (const person of adults) openWholePast(core, person.id);
  const ended = adults.filter((p) => endedOf(core, p.id).length);
  // Every one is a year, a name and how it ended, on the person's own life.
  for (const person of ended) {
    const [row] = endedOf(core, person.id);
    expect(row!.date < core.date, `${row!.id}: before the start`).toBe(true);
    expect(String(row!.facts.partnerName)).toMatch(/\S+ \S+/);
    expect(["parted", "widowed"]).toContain(row!.facts.ended);
    expect(
      lifeOf(core, person.id).some(
        (event) => event.id === row!.id && event.what === "separated",
      ),
      `${row!.id} is told in their life`,
    ).toBe(true);
    // Before their present partnership began, where they have one.
    const since = preStartHistory(core, {
      kind: "family.partnered",
      personId: person.id,
    })[0]?.date;
    if (since) expect(row!.date <= since, row!.id).toBe(true);
  }
  // Opened again, and in the world built again, the same past.
  const once = ended.map(
    (p) => endedOf(core, p.id)[0]!.id + endedOf(core, p.id)[0]!.date,
  );
  for (const person of adults.slice(0, 10)) openWholePast(core, person.id);
  expect(
    ended.map((p) => endedOf(core, p.id)[0]!.id + endedOf(core, p.id)[0]!.date),
  ).toEqual(once);
  const again = build();
  for (const person of ended.slice(0, 5)) openWholePast(again, person.id);
  expect(
    ended
      .slice(0, 5)
      .map((p) => endedOf(again, p.id)[0]?.facts.partnerName ?? ""),
    `the rebuilt world, ${where}`,
  ).toEqual(
    ended
      .slice(0, 5)
      .map((p) => String(endedOf(core, p.id)[0]!.facts.partnerName)),
  );
  // The town's share beside the place's: among adults 35 and over living
  // without a partner now, those ever married (ACS: marital less never
  // married, less those with a spouse present, over marital less spouse
  // present, in the bands from 35).
  const geo = partnershipGeo(core.placeMetadata?.placeKey).rows as unknown as {
    marital: Record<string, number[]>;
    neverMarried: Record<string, number[]>;
    spousePresent: Record<string, number[]>;
  };
  const from = data.maritalBands.indexOf("35-39");
  let ever = 0,
    single = 0;
  for (const sex of ["female", "male"])
    for (let i = from; i < data.maritalBands.length; i++) {
      const marital = geo.marital[sex]![i]!;
      const present = geo.spousePresent[sex]![i]!;
      ever += marital - geo.neverMarried[sex]![i]! - present;
      single += marital - present;
    }
  const older = adults.filter(
    (p) =>
      ageOnDate(makeIsoDate(p.birthDate), makeIsoDate(core.date)) >= 35 &&
      !partneredNow(core, p),
  );
  const told = older.filter((p) => endedOf(core, p.id).length).length;
  process.stdout.write(
    `past partners in ${where}: ${ended.length} of ${adults.length} opened adults had an earlier partnership (${ended.filter((p) => endedOf(core, p.id)[0]!.facts.ended === "widowed").length} widowed); of ${older.length} adults 35 and over living without a partner, ${told} (${older.length ? ((100 * told) / older.length).toFixed(0) : "-"}%) against the place's ACS ${((100 * ever) / single).toFixed(0)}% ever married.\n`,
  );
  expect(
    ended.length,
    `someone had an earlier partner, in ${where}`,
  ).toBeGreaterThan(0);
  // A night in hospital before the start: the most recent, with how many.
  const stays = adults.filter(
    (p) =>
      preStartHistory(core, { kind: PAST_HOSPITAL_STAY, personId: p.id })
        .length,
  );
  for (const person of stays) {
    const [row] = preStartHistory(core, {
      kind: PAST_HOSPITAL_STAY,
      personId: person.id,
    });
    const ages = hospitalStayAges(core, person, core.startedAt);
    expect(row!.facts.stays, row!.id).toBe(ages.length);
    expect(row!.facts.age, row!.id).toBe(ages.at(-1));
    expect(row!.date < core.startedAt, row!.id).toBe(true);
    expect(
      lifeOf(core, person.id).some((event) => event.id === row!.id),
      `${row!.id} is told in their life`,
    ).toBe(true);
  }
  // The town's yearly share in the year before the start, beside the table's.
  const bands = [
    [18, 45],
    [45, 65],
    [65, 120],
  ] as const;
  const lines = bands.map(([low, high]) => {
    const band = adults.filter((p) => {
      const age = ageOnDate(
        makeIsoDate(p.birthDate),
        makeIsoDate(core.startedAt),
      );
      return age >= low + 1 && age < high;
    });
    const lastYear = band.filter((p) => {
      const age = ageOnDate(
        makeIsoDate(p.birthDate),
        makeIsoDate(core.startedAt),
      );
      return hospitalStayAges(core, p, core.startedAt).at(-1) === age - 1;
    }).length;
    return `${low}-${high - 1}: ${lastYear} of ${band.length} in the last year against ${(100 * hospitalStayShare(low)).toFixed(1)}%`;
  });
  process.stdout.write(
    `past hospital stays in ${where}: ${stays.length} of ${adults.length} opened adults had one before the start; ${lines.join("; ")}.\n`,
  );
  expect(stays.length, `someone had a stay, in ${where}`).toBeGreaterThan(0);
}, 1_800_000);
