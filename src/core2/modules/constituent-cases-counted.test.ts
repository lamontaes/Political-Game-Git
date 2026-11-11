/**
 * A counted resident out of work brings their problem to an official and
 * stays counted (pool item
 * play-golden-path-m0-13-red-st-johnsbury-part-2-heap-growth): the case is
 * kept by their id and decided by the same rule as a full person's, with its
 * reason recorded, and a filled-in copy of the resident gets the same
 * decision. A case fills its resident in only where it reaches an official
 * the player deals with (`keepsWhy`).
 * Three places are drawn from all 56 and run for a year; a place where no
 * counted resident brought a case is passed over and named. Replay with
 * COUNTED_CASES_SEED; COUNTED_CASES_LOG names a file for the report.
 */
import { randomBytes } from "node:crypto";
import { appendFileSync } from "node:fs";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../../bench/world";
import { drawPlace } from "../../../scripts/core2-year/place";
import { setBookkeeping } from "../bookkeeping";
import { gameStartDate } from "../game-start";
import { addDays, makeIsoDate } from "../kernel/dates";
import { advanceCore } from "../life";
import { coreAPI, fillInPerson, registerModule } from "../state";
import { closenessBetween } from "../closeness";
import { impressionOf } from "./campaigns";
import { allCases, ownCaseDecision } from "./constituent-cases";
import { keepsWhy } from "../why-kept";
import { residentFacts } from "./residents";

setBookkeeping(false);
const base = process.env.COUNTED_CASES_SEED ?? randomBytes(8).toString("hex");
const PLACES = 3;
const DRAWS = 8;

it(`counted residents' cases stay counted and are decided by one rule, ${PLACES} drawn places, seed ${base}`, () => {
  const passed: string[] = [];
  const said: string[] = [];
  let checked = 0;
  for (let draw = 0; draw < DRAWS && checked < PLACES; draw += 1) {
    const seed = `${base}:${draw}`;
    const place = drawPlace(seed, "counted-cases");
    const where = `${place.name} (${place.key}), seed ${seed}`;
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(core);
    // Who fills people in, read from the call that did it: each fill-in
    // brings a whole household, on its day.
    const fromCases: { date: string; ids: readonly string[] }[] = [];
    registerModule(core, {
      id: "test-fill-in-callers",
      onFillIn: (_api: unknown, filled: { memberIds: readonly string[] }) => {
        if (/\bbringCases?\b/.test(new Error().stack ?? ""))
          fromCases.push({ date: core.date, ids: filled.memberIds });
      },
    } as never);
    advanceCore(core, addDays(makeIsoDate(core.date), 365));
    // A case fills in only a household one of whose members brought that
    // day's case to an official the player deals with. (Another member may
    // have brought their own case elsewhere earlier; the household comes in
    // whole, so that member is filled in by this case, not theirs.)
    const filledByCase = fromCases.map((fill) => {
      const brought = allCases(api).filter(
        (row) => row.opened === fill.date && fill.ids.includes(row.personId),
      );
      expect(
        brought.some((row) => keepsWhy(core, row.officialId)),
        `${where}: household ${fill.ids.join(", ")} filled in on ${fill.date} by ${brought.map((row) => `${row.id} to ${row.officialId}`).join(", ") || "no case of theirs"}`,
      ).toBe(true);
      return fill;
    });
    const counted = allCases(api).filter(
      (row) => !core.people.has(row.personId),
    );
    const decided = counted.filter((row) => row.status !== "open");
    if (!decided.length) {
      passed.push(`${where} (${counted.length} counted cases, none decided)`);
      continue;
    }
    checked += 1;
    for (const row of decided) {
      expect(["helped", "declined"], `${where}: ${row.id}`).toContain(
        row.status,
      );
      expect(row.handledBy, `${where}: ${row.id} handled by`).not.toBeNull();
      expect(row.outcome, `${where}: ${row.id} outcome`).not.toBeNull();
      // The office's call is recorded with its reason: its sense of duty.
      if (row.handledBy !== "official")
        expect(Number.isFinite(row.duty), `${where}: ${row.id} duty`).toBe(
          true,
        );
      expect(row.standing, `${where}: ${row.id} standing`).toBe(0);
    }
    // The same case for a filled-in copy of the resident: the same decision
    // and the same reason, and the fill-in carries what the case kept. Only
    // a resident still in the town's counts can be filled in; one who has
    // since moved away or died is no longer there to meet.
    for (const row of decided
      .filter((c) => residentFacts(core, c.personId as never))
      .slice(0, 5)) {
      const before = ownCaseDecision(api, row.officialId, row);
      const person = fillInPerson(core, row.personId as never);
      const after = ownCaseDecision(api, row.officialId, row);
      expect(after, `${where}: ${row.id} filled in`).toEqual(before);
      expect(person.id, where).toBe(row.personId);
      if (core.people.get(row.officialId)?.alive) {
        expect(
          impressionOf(api, row.personId, row.officialId),
          `${where}: ${row.personId}'s view of ${row.officialId}`,
        ).toBeTruthy();
        expect(
          closenessBetween(core, row.personId, row.officialId),
          `${where}: ${row.personId}'s tie to ${row.officialId}`,
        ).toBeGreaterThan(0);
      }
    }
    said.push(
      `${where}: ${counted.length} counted cases, ${decided.length} decided, ${filledByCase.length} filled in by a case, ${core.people.size} full people`,
    );
  }
  appendFileSync(
    process.env.COUNTED_CASES_LOG ?? "/dev/null",
    `\ncounted-cases (${base}): ${said.join("; ")}; passed over: ${passed.join("; ") || "none"}`,
  );
  expect(
    checked,
    `checked ${said.join("; ")}; passed over ${passed.join("; ")}`,
  ).toBe(PLACES);
}, 3_600_000);
