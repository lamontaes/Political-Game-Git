/**
 * The town's community events are dated rows on the one calendar. In a
 * played world (the bench world, every module installed) of a place drawn
 * from all 56, a year holds a row for each event the table gives the
 * place's type, each on a date the table's rule allows, written on that date,
 * and the one history reader hands the rows out by place.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import {
  communityEventsFor,
  communityPlaceType,
} from "./community-events-table";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { historyOf } from "./past";
import {
  COMMUNITY_EVENT,
  startDatesOf,
  type CommunityEventRow,
} from "./modules/community-events";
import { coreAPI } from "./state";

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

it(`a played year of a drawn place holds the table's events for its type, each written on its date (seed ${seed})`, () => {
  setBookkeeping(false);
  const place = drawPlace(seed, "community-events");
  const where = `${place.name} (${place.key}), seed ${place.seed}`;
  const { core } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const api = coreAPI(core);
  const type = communityPlaceType(place.key);
  const start = core.date;
  const end = makeIsoDate(addDays(makeIsoDate(start), 400));
  advanceCore(core, end);
  const rows = [
    ...(api
      .moduleState("core2-community-events-v1")
      .table("events")
      .rows() as unknown as CommunityEventRow[]),
  ].sort((a, b) => a.date.localeCompare(b.date));
  expect(
    rows.length,
    `${where}: no community events in a year`,
  ).toBeGreaterThan(0);
  const allowed = new Set(communityEventsFor(type).map((e) => e.id));
  for (const row of rows) {
    expect(
      allowed.has(row.eventId),
      `${where}: ${row.id} is not a ${type} event`,
    ).toBe(true);
    expect(row.id, where).toBe(
      `community-event:${row.placeId}:${row.eventId}:${row.date}`,
    );
    expect(row.date > start && row.date <= end, `${where}: ${row.id}`).toBe(
      true,
    );
    expect(row.scale, `${where}: ${row.id}`).toBeGreaterThan(0);
  }
  // A 400-day span holds each event the type has, so each has a row.
  const seen = new Set(rows.map((r) => r.eventId));
  for (const id of allowed)
    expect(seen.has(id), `${where}: no row for ${id}`).toBe(true);
  // The one history reader hands the same rows to every reader, by place and kind.
  const told = historyOf(
    core,
    { place: rows[0]!.placeId },
    { kinds: [COMMUNITY_EVENT] },
  );
  expect(told.map((e) => e.id).sort(), where).toEqual(
    rows.map((r) => r.id).sort(),
  );
  expect(
    historyOf(core, { place: rows[0]!.placeId }, { kinds: ["law"] }).filter(
      (e) => e.record === COMMUNITY_EVENT,
    ),
    where,
  ).toEqual([]);
}, 900_000);
