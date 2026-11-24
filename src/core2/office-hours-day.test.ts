/**
 * An official's office takes up their day (pool item
 * office-hours-never-fill-an-officials-day). Officials who hold their office
 * as their job sit in a salaried post with no shift hours, and their sittings
 * never reached the work clock: every legislator had the whole day free on a
 * session day (15.3 hours at 4846968, Feb 2025, before this change). Now each
 * office's own records put its hours on the holder's day, on the clock a
 * shift's minutes use: a floor day is the session day at the Capitol
 * (`legislatureSessionDayHours`), a district weekday a day at the post
 * (`postDayHours`), a town body's meeting its evening (`sittingHours`) on top
 * of a member's own job; a floor the record shows the member away from takes
 * nothing, and the day the player lives is counted once.
 *
 * Pinned place and seed (Texas, 4846968, 8647-mason): the state senate's
 * sixteenth member by id as the player and its twenty-second as the senator
 * read; the town council's member person_78bac2d6574175cb, who keeps a job,
 * at the council's meeting of Feb 4, 2025 (found by a script outside the
 * test, the first council member with a job of their own).
 */
import { expect, it } from "vitest";
import { DevMode } from "../bench/dev-mode";
import personDay from "../bench/dev-views/person-day";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { campaignParameter } from "./campaign-data";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { bodyOf, memberKey, members } from "./modules/legislature";
import { townSeats } from "./modules/offices";
import { discretionaryHours } from "./modules/work";
import {
  doEntry,
  resultsOf,
  stateDayParameter,
  waitingEntries,
} from "./office-day-state";
import { coreAPI, fillInPerson } from "./state";
import type { PersonId } from "./types";

const COUNCIL_MEMBER = "person_78bac2d6574175cb" as PersonId;
const COUNCIL_DAY = "2025-02-04";

it("an official's sittings and post fill their day, once, and not a day they stayed away", () => {
  setBookkeeping(false);
  const { core, placeId } = buildBenchWorld("8647-mason", gameStartDate(), {
    twoLevel: true,
    placeKey: "4846968",
  });
  const api = coreAPI(core);
  const seat = townSeats(api).find(
    (r) =>
      r.office.level === "state" &&
      bodyOf(api, r.office.id) &&
      members(api, r.office.id).length >= 3 &&
      members(api, r.office.id).every((t) => t.personId),
  )!;
  const ids = members(api, seat.office.id).map(memberKey).sort();
  for (const id of ids) fillInPerson(core, id);
  const player = ids[15]! as PersonId;
  const senator = ids[21]! as PersonId;
  core.playerId = player;
  advanceCore(core, makeIsoDate("2025-01-31"));
  const minutes = (id: PersonId) => {
    const t = core.work.timeByPerson.get(id);
    return t?.date === core.date
      ? { work: t.workMinutes, free: t.discretionaryMinutes }
      : { work: 0, free: 0 };
  };
  const day = new Map<string, Record<string, ReturnType<typeof minutes>>>();
  const left = new Map<string, number>();
  for (
    let date = makeIsoDate("2025-02-01");
    date <= "2025-02-14";
    date = addDays(date, 1)
  ) {
    // The player stays away from the senate's floor on Tuesday the 11th,
    // pressing their own choice on the entry the evening before.
    if (date === "2025-02-11") {
      const floor = waitingEntries(api, player).find(
        (e) => e.date === date && e.kind === "floor-session",
      )!;
      doEntry(api, floor.id, { kind: "attend", attend: false });
    }
    advanceCore(core, date);
    day.set(date, {
      senator: minutes(senator),
      player: minutes(player),
      council: minutes(COUNCIL_MEMBER),
    });
    left.set(`${date}:${senator}`, discretionaryHours(api, senator));
    left.set(
      `${date}:${COUNCIL_MEMBER}`,
      discretionaryHours(api, COUNCIL_MEMBER),
    );
  }
  const hour = api.parameter("minutesPerHour");
  const session = campaignParameter("legislatureSessionDayHours") * hour;
  const post = stateDayParameter("postDayHours") * hour;
  // The senator: a floor day (Tuesday) is the session day, a district day
  // (Monday) a day at the post, a Saturday nothing.
  expect(day.get("2025-02-04")!.senator.work).toBe(session);
  expect(day.get("2025-02-03")!.senator.work).toBe(post);
  expect(day.get("2025-02-08")!.senator.work).toBe(0);
  // Their day adds up: the office, their free time and the sleep the day
  // keeps back come to the day's hours, never more.
  const dayHours = api.parameter("hoursPerDay");
  const sleep = api.parameter(core.data.work!.sleepReserveParameter);
  for (const [date, row] of day) {
    expect(
      (row.senator.work + row.senator.free) / hour +
        left.get(`${date}:${senator}`)! +
        sleep,
    ).toBeCloseTo(dayHours, 6);
  }
  // The player: the floor they attended is counted once (their own entry and
  // the day's pass both read it); the floor they stayed away from is not.
  expect(day.get("2025-02-12")!.player.work).toBe(session);
  expect(
    resultsOf(api, player).find(
      (r) => r.date === "2025-02-11" && r.kind === "floor-session",
    )?.choice,
  ).toEqual({ kind: "attend", attend: false });
  expect(day.get("2025-02-11")!.player.work).toBeLessThan(post);
  // The council member keeps their own job: the meeting's evening comes on
  // top of their shift, and the day still adds up.
  const council = day.get(COUNCIL_DAY)!.council;
  const evening = campaignParameter("sittingHours") * hour;
  const shift = day.get("2025-02-03")!.council.work;
  expect(shift).toBeGreaterThan(0);
  expect(council.work).toBeGreaterThanOrEqual(evening);
  expect(council.work - evening).toBeGreaterThan(0);
  expect(
    (council.work + council.free) / hour +
      left.get(`${COUNCIL_DAY}:${COUNCIL_MEMBER}`)! +
      sleep,
  ).toBeCloseTo(dayHours, 6);
  // Dev mode's Day view (dev-views/person-day.ts) shows the same day: on Friday the 14th, a
  // district day, the senator's minutes at work are the post's, and the
  // office's hours name the office day's entry they come from.
  const dev = new DevMode(core, undefined, undefined, placeId);
  const shown = personDay.routes!["GET person-day"]!({
    mode: dev,
    q: (key) => (key === "id" ? senator : ""),
    input: {},
  }) as {
    workMinutes: number;
    office: { hours: number; sourceId: string } | null;
    hoursLeft: number;
  };
  expect(shown.workMinutes).toBe(post);
  expect(shown.office?.hours).toBe(stateDayParameter("postDayHours"));
  expect(shown.office?.sourceId).toMatch(
    new RegExp(`^${senator}:2025-02-14:district-office:`),
  );
  expect(shown.hoursLeft).toBe(left.get(`2025-02-14:${senator}`));
}, 85_000);
