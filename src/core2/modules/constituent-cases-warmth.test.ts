/**
 * A counted resident's decided case moves the counted ballot (pool item
 * stopgap-elections-read-your-record): the warmth the electorate reads for a
 * counted resident is the warmth filling them in would write, and the counted
 * appeal moves by it. Pinned to a drawn place and seed (named in each
 * message); the place keeps counted residents with decided cases after a year.
 */
import { expect, it } from "vitest";
import { buildBenchWorld } from "../../bench/world";
import { drawPlace } from "../../../scripts/core2-year/place";
import { setBookkeeping } from "../bookkeeping";
import { gameStartDate } from "../game-start";
import { addDays, makeIsoDate } from "../kernel/dates";
import { advanceCore } from "../life";
import { coreAPI, fillInPerson } from "../state";
import { countedAppeal } from "../electorate";
import { impressionOf } from "./campaigns";
import { allCases, caseWarmthsOf } from "./constituent-cases";

setBookkeeping(false);

it("a counted resident's decided case is read as the warmth a fill-in would write, and moves their appeal", () => {
  const seed = "kw-4";
  const place = drawPlace(seed, "case-warmth");
  const where = `${place.name} (${place.key}), seed ${seed}`;
  const { core } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const api = coreAPI(core);
  advanceCore(core, addDays(makeIsoDate(core.date), 365));
  const decided = allCases(api).filter(
    (row) => !core.people.has(row.personId) && row.status !== "open",
  );
  expect(decided.length, `${where}: decided counted cases`).toBeGreaterThan(0);
  const row = decided.find((r) => core.people.get(r.officialId)?.alive)!;
  const warmth = caseWarmthsOf(api, row.personId)[row.officialId]!;
  expect(Math.sign(warmth), `${where}: ${row.id} ${row.status}`).toBe(
    row.status === "helped" ? 1 : -1,
  );
  // The same view the filled-in resident holds.
  fillInPerson(core, row.personId as never);
  expect(
    impressionOf(api, row.personId, row.officialId)?.warmth,
    `${where}: ${row.personId}'s view of ${row.officialId}`,
  ).toBeCloseTo(warmth, 6);
  // And the counted appeal moves by it, one reading against none.
  const field = [
    {
      id: row.officialId,
      side: 0,
      isIncumbent: true,
      standing: 0,
      localStanding: 0,
      recognition: 0,
      platform: [],
    },
  ];
  const away = { inTown: true, local: true, incumbentLean: 0 };
  const without = countedAppeal(0, field, away)[row.officialId]!;
  const read = countedAppeal(0, field, {
    ...away,
    warmths: { [row.officialId]: warmth },
  })[row.officialId]!;
  expect(read.total - without.total, where).toBeCloseTo(warmth, 6);
}, 900_000);
