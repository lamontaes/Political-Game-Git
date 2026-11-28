/**
 * The town's community events are dated rows on the one calendar. In a
 * played world (the bench world, every module installed) of a place drawn
 * from all 56, a year holds a row for each event the table gives the
 * place's type, each on a date the table's rule allows, written on that date,
 * and the one history reader hands the rows out by place.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../../scripts/core2-year/place";
import { buildBenchWorld } from "../../../src/bench/world";
import { setBookkeeping } from "../../../src/core2/bookkeeping";
import {
  communityEventsFor,
  communityPlaceType,
} from "../../../src/core2/community-events-table";
import { gameStartDate } from "../../../src/core2/game-start";
import { addDays, makeIsoDate } from "../../../src/core2/kernel/dates";
import { advanceCore } from "../../../src/core2/life";
import { lawChain } from "../../../src/core2/modules/laws";
import { historyOf } from "../../../src/core2/past";
import {
  COMMUNITY_EVENT,
  startDatesOf,
  type CommunityEventRow,
} from "../../../src/core2/modules/community-events";
import { coreAPI } from "../../../src/core2/state";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const saturday = (date: string) =>
  new Date(`${date}T00:00:00Z`).getUTCDay() === 6;

it("the table's rules give dates with no roll: a fixed date, a season's Saturday (two for a season over New Year) and a monthly Saturday", () => {
  expect(startDatesOf({ kind: "fixed-date", month: 7, day: 4 }, 2027)).toEqual([
    "2027-07-04",
  ]);
  const homecoming = startDatesOf(
    { kind: "season", from: [9, 20], to: [10, 31] },
    2027,
  );
  expect(homecoming).toHaveLength(1);
  expect(saturday(homecoming[0]!)).toBe(true);
  expect(homecoming[0]! >= "2027-09-20" && homecoming[0]! <= "2027-10-31").toBe(
    true,
  );
  const play = startDatesOf(
    { kind: "season", from: [11, 1], to: [5, 31], days: 2 },
    2027,
  );
  expect(play.map((d) => d.slice(0, 4))).toEqual(["2027", "2027"]);
  expect(play[0]! <= "2027-05-31" && play[1]! >= "2027-11-01").toBe(true);
  const monthly = startDatesOf({ kind: "monthly", week: 2 }, 2027);
  expect(monthly).toHaveLength(12);
  expect(monthly.every(saturday)).toBe(true);
  expect(monthly[0]).toBe("2027-01-09");
});

// One place of each size band that holds a different mix of events: a hamlet, a town and a city.
for (const type of ["hamlet", "town", "city"]) {
  it(`a played year of a drawn ${type} holds the table's events for its type: the held ones at open, the rest written on their dates (seed ${seed})`, () => {
    setBookkeeping(false);
    const place = drawPlace(
      seed,
      `community-events-${type}`,
      (key) => communityPlaceType(key) === type,
    );
    const where = `${place.name} (${place.key}), seed ${place.seed}, ${type}`;
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(core);
    const allowed = new Set(communityEventsFor(type).map((e) => e.id));
    const rowsOf = () =>
      [
        ...(api
          .moduleState("core2-community-events-v1")
          .table("events")
          .rows() as unknown as CommunityEventRow[]),
      ].sort((a, b) => a.date.localeCompare(b.date));
    const start = core.date;
    // Day 0: the events this year and last year have been held already.
    const opening = rowsOf();
    expect(opening.length, `${where}: no events held at open`).toBeGreaterThan(
      0,
    );
    expect(
      opening.every((r) => r.date <= start),
      where,
    ).toBe(true);
    const end = makeIsoDate(addDays(makeIsoDate(start), 400));
    advanceCore(core, end);
    const rows = rowsOf();
    const written = rows.filter((r) => r.date > start);
    expect(
      written.length,
      `${where}: nothing written in 400 days`,
    ).toBeGreaterThan(0);
    for (const row of rows) {
      expect(
        allowed.has(row.eventId),
        `${where}: ${row.id} is not a ${type} event`,
      ).toBe(true);
      expect(row.id, where).toBe(
        `community-event:${row.placeId}:${row.eventId}:${row.date}`,
      );
      expect(row.scale, `${where}: ${row.id}`).toBeGreaterThan(0);
    }
    expect(
      written.every((r) => r.date <= end),
      where,
    ).toBe(true);
    // A 400-day span holds each event the type has, so each has a row.
    const seen = new Set(rows.map((r) => r.eventId));
    for (const id of allowed)
      expect(seen.has(id), `${where}: no row for ${id}`).toBe(true);
    // The one history reader hands the same rows out by the town's place id
    // (the one the town's own readers pass) and kind.
    const town = lawChain(api).townPlaceId;
    expect(town, where).toBe(rows[0]!.placeId);
    const told = historyOf(core, { place: town }, { kinds: [COMMUNITY_EVENT] });
    expect(told.map((e) => e.id).sort(), where).toEqual(
      rows.map((r) => r.id).sort(),
    );
    expect(
      historyOf(core, { place: town }, { kinds: ["law"] }).filter(
        (e) => e.record === COMMUNITY_EVENT,
      ),
      where,
    ).toEqual([]);
  }, 900_000);
}
