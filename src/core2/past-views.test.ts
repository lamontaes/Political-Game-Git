/**
 * Big events in a past move a person's view, either way (the owner, Nov 12;
 * part 14): in a played world drawn from all 56, every town adult is opened.
 * A parent's layoff while they were a child moves them toward or away from
 * that parent's view, by their traits; their own layoff as an adult moves
 * them left, fading with the years back at work. Every shift names the work
 * spell that holds the event, and the town's liberal and conservative shares
 * barely move. The counts by kind, the mean shift and the share that moved
 * toward the parent are printed.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { traceNode } from "../bench/dev-trace";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { gameStartDate } from "./game-start";
import { ageOnDate, makeIsoDate } from "./kernel/dates";
import { openWholePast } from "./modules/people";
import { viewOf } from "./modules/views";
import { PAST_WORK_SPELL } from "./past-work";
import { preStartHistory } from "./pre-start";
import { coreAPI } from "./state";
import type { PersonId } from "./types";

const seed = process.env.LIFE_SEED ?? randomBytes(8).toString("hex");
const place = drawPlace(seed, "past-views");
const where = `${place.name} (${place.key}), seed ${seed}`;
/** How far the town's liberal or conservative share may move: inside the CES state cell's spread for a town this size. */
const SHARE_MOVE = 0.06;

it(`a past's layoffs move views either way, by record, in ${where}`, () => {
  const { core, director } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const api = coreAPI(core);
  const age = (birthDate: string, on: string) =>
    ageOnDate(makeIsoDate(birthDate), makeIsoDate(on));
  const town = core.people.get(core.playerId as PersonId)!.placeId;
  const adults = [...core.people.values()]
    .filter(
      (p) =>
        p.alive &&
        p.tier !== "husk" &&
        p.placeId === town &&
        age(p.birthDate, core.startedAt) >= 18,
    )
    .sort((a, b) => a.id.localeCompare(b.id));
  expect(adults.length, where).toBeGreaterThan(9);
  // Half have their view read before their past is written, as a screen or
  // a talk can: the shift reaches it the day the past is opened.
  adults.forEach((person, index) => {
    if (index % 2) viewOf(api, person.id);
    openWholePast(core, person.id);
  });
  const spells = new Map(
    preStartHistory(core, { kind: PAST_WORK_SPELL }).map((row) => [
      row.id,
      row,
    ]),
  );
  const count = { "parent-job-lost": 0, "own-job-lost": 0 };
  let moved = 0;
  let total = 0;
  let toward = 0;
  const before = { liberal: 0, conservative: 0 };
  const after = { liberal: 0, conservative: 0 };
  for (const person of adults) {
    const view = viewOf(api, person.id)!;
    const shifts = view.pastShifts ?? [];
    let sum = 0;
    for (const shift of shifts) {
      const spell = spells.get(shift.recordId);
      expect(spell, `${person.id}: ${shift.recordId}, ${where}`).toBeDefined();
      expect(spell!.facts.end, shift.recordId).toBe("let-go");
      const ended = String(spell!.facts.endedAt);
      expect(ended < core.startedAt, shift.recordId).toBe(true);
      if (shift.kind === "parent-job-lost") {
        // The parent's own record, ended while the person was a child.
        expect(spell!.facts.personId, shift.recordId).toBe(shift.parentId);
        expect(
          person.pastFacts?.some(
            (fact) =>
              ["family:parent", "family:other-parent"].includes(fact.kind) &&
              fact.facts?.otherPersonId === shift.parentId,
          ),
          `${shift.recordId} names a parent of ${person.id}`,
        ).toBe(true);
        expect(age(person.birthDate, ended), shift.recordId).toBeLessThan(18);
        if ((shift.follow ?? 0) > 0) toward += 1;
      } else {
        expect(spell!.facts.personId, shift.recordId).toBe(person.id);
        expect(
          age(person.birthDate, ended),
          shift.recordId,
        ).toBeGreaterThanOrEqual(18);
        // A layoff moves its person left, never right.
        expect(shift.change, shift.recordId).toBeLessThanOrEqual(0);
      }
      count[shift.kind] += 1;
      total += Math.abs(shift.change);
      sum += shift.change;
    }
    if (shifts.length) {
      moved += 1;
      // Dev mode's Trace on the person names each event by its record.
      const traced = traceNode(core, director, person.id).children.filter(
        (child) => child.via.startsWith("views.pastShifts."),
      );
      expect(
        traced.map((child) => child.id).sort(),
        `${person.id}: Trace, ${where}`,
      ).toEqual(shifts.map((shift) => shift.recordId).sort());
    }
    const start = view.lean - sum;
    before.liberal += start <= -0.5 ? 1 : 0;
    before.conservative += start >= 0.5 ? 1 : 0;
    after.liberal += view.lean <= -0.5 ? 1 : 0;
    after.conservative += view.lean >= 0.5 ? 1 : 0;
  }
  const n = adults.length;
  const shifted = count["parent-job-lost"] + count["own-job-lost"];
  process.stdout.write(
    `past views in ${where}: of ${n} adults, ${moved} moved by their past ` +
      `(${count["parent-job-lost"]} by a parent's layoff, ${toward} of them toward the parent; ` +
      `${count["own-job-lost"]} by their own), mean shift ${(shifted ? total / shifted : 0).toFixed(3)}; ` +
      `liberal ${before.liberal} to ${after.liberal}, conservative ${before.conservative} to ${after.conservative}.\n`,
  );
  expect(moved, `${where}: nobody's past moved their view`).toBeGreaterThan(0);
  expect(
    Math.abs(after.liberal - before.liberal) / n,
    where,
  ).toBeLessThanOrEqual(SHARE_MOVE);
  expect(
    Math.abs(after.conservative - before.conservative) / n,
    where,
  ).toBeLessThanOrEqual(SHARE_MOVE);
}, 600_000);
