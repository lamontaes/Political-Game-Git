/**
 * An arrest before the start (gap sheet, Nov 12, 2026, row 4): every adult
 * opened in a played world drawn from all 56 was arrested by 23 or not by
 * the NLSY97 shares, against their own seeded line; a conviction follows at
 * the share of adults with a felony record. Each record is before the start, in order, on the person's
 * life and told by the card's law lines. The town's counts are printed
 * beside the shares for the same people.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { knownCard } from "../bench/card";
import { drawPlace } from "../../scripts/core2-year/place";
import pastRows from "./data/past/parameters.json" with { type: "json" };
import { gameStartDate } from "./game-start";
import { ageOnDate, makeIsoDate } from "./kernel/dates";
import { openWholePast } from "./modules/people";
import { lifeOf } from "./person-life";
import {
  PAST_ARRESTED,
  PAST_CONVICTED,
  PAST_IMPRISONED,
  PAST_RELEASED,
  pastArrestOf,
} from "./past-justice";
import {
  PAST_WORK_OUT,
  PAST_WORK_SPELL,
  prisonTermOf,
  serviceOf,
} from "./past-work";
import { preStartHistory } from "./pre-start";
import type { PersonId } from "./types";

const seed = process.env.LIFE_SEED ?? randomBytes(8).toString("hex");
const place = drawPlace(seed, "past-justice");
const where = `${place.name} (${place.key}), seed ${seed}`;
const share = (key: string) =>
  (pastRows as unknown as Record<string, { value: number }>)[key]!.value;

it(`a past can hold an arrest, a conviction and a prison term, in ${where}`, () => {
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
        ageOnDate(makeIsoDate(p.birthDate), makeIsoDate(core.startedAt)) >= 24,
    )
    .sort((a, b) => a.id.localeCompare(b.id));
  expect(adults.length, where).toBeGreaterThan(9);
  for (const person of adults) openWholePast(core, person.id);
  const count = { arrested: 0, convicted: 0, imprisoned: 0 };
  let toldOnCard = 0;
  for (const person of adults) {
    const of = (kind: string) =>
      preStartHistory(core, { kind, personId: person.id })[0];
    const rows = [
      PAST_ARRESTED,
      PAST_CONVICTED,
      PAST_IMPRISONED,
      PAST_RELEASED,
    ].map(of);
    const found = pastArrestOf(core, person, core.startedAt);
    // The people engine wrote what the rule gives, and no other.
    expect(Boolean(rows[0]), `${person.id} arrested, ${where}`).toBe(
      Boolean(found),
    );
    if (!rows[0]) continue;
    count.arrested += 1;
    if (rows[1]) count.convicted += 1;
    // A prison term is the work pass's, and no work or search runs inside it.
    expect(Boolean(rows[2]), `${person.id} in prison, ${where}`).toBe(
      Boolean(prisonTermOf(core, person)),
    );
    if (rows[2]) {
      count.imprisoned += 1;
      const term = prisonTermOf(core, person)!;
      // Never in prison while in the service.
      const served = serviceOf(core, person);
      expect(
        !served || term.to <= served.enlisted || term.from >= served.discharged,
        `${person.id} in prison ${term.from} to ${term.to} while serving, ${where}`,
      ).toBe(true);
      for (const kind of [PAST_WORK_SPELL, PAST_WORK_OUT])
        for (const row of preStartHistory(core, {
          kind,
          personId: person.id,
        })) {
          const from = String(row.facts.startedAt ?? row.date);
          const to = String(row.facts.endedAt ?? core.startedAt);
          // Before or after the term, to the year (a day before the world's
          // window is told on the birthday in its year).
          expect(
            to.slice(0, 4) <= term.from.slice(0, 4) ||
              from.slice(0, 4) >= term.to.slice(0, 4),
            `${row.id} (${from} to ${to}) against prison ${term.from} to ${term.to}, ${where}`,
          ).toBe(true);
        }
    }
    const dates = rows.flatMap((row) => (row ? [row.date] : []));
    expect(dates, `${person.id} in order`).toEqual([...dates].sort());
    expect(
      dates.every((date) => date < core.startedAt),
      person.id,
    ).toBe(true);
    const life = lifeOf(core, person.id);
    for (const row of rows)
      if (row)
        expect(
          life.some((event) => event.id === row.id && event.life === "law"),
          `${row.id} is told in their life`,
        ).toBe(true);
    const card = JSON.stringify(
      knownCard(core, core.playerId!, person.id).history,
    );
    if (/\barrested in \d{4}\b/.test(card)) toldOnCard += 1;
  }
  const n = adults.length;
  const expected = {
    arrested: n * share("pastArrestShareBy23"),
    convicted: n * share("pastFelonyConvictionShare"),
    imprisoned: n * share("pastPrisonShare"),
  };
  process.stdout.write(
    `past arrests in ${where}: of ${n} adults 24 and over, ${count.arrested} arrested by 23 (shares give ${expected.arrested.toFixed(1)}), ${count.convicted} convicted (${expected.convicted.toFixed(1)}), ${count.imprisoned} in prison before the start (${expected.imprisoned.toFixed(1)} by the share of adults ever in prison); ${toldOnCard} cards tell it.\n`,
  );
  const p = share("pastArrestShareBy23");
  expect(
    Math.abs(count.arrested - expected.arrested),
    `arrests against the share, ${where}`,
  ).toBeLessThanOrEqual(3 * Math.sqrt(n * p * (1 - p)) + 1);
  expect(count.arrested, `someone was arrested, ${where}`).toBeGreaterThan(0);
  // The card tells every arrest with the law lines already in the bank.
  expect(toldOnCard, `cards that tell the arrest, ${where}`).toBe(
    count.arrested,
  );
}, 1_800_000);
