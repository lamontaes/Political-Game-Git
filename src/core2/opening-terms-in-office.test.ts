/**
 * The opening seats the term that is in office on the day the game starts (pool item
 * gov-opening-terms-end-before-the-start-date). A world built with a warm-up opens its core
 * before that day; the seats read their next election from the start day, so no serving term ends
 * on or before it, and a term that begins during the warm-up is serving on the record from the day the
 * world opened, its holder taking office on its true first day. A death in those days opens a vacancy on
 * that term, which ends on the day it began or, if it had not begun, on its first day.
 *
 * Pinned to place 5522550 and seed "opening-terms-in-office" with a bare population (60 people):
 * the opening writes terms and the death goes through the offices engine's own `vacateSeat`.
 * Time: about 2 s measured; the limit is 30 s.
 */
import { expect, it } from "vitest";
import { buildPopulation } from "./population";
import { advanceCore, createLifeCore } from "./life";
import { addDays, makeIsoDate } from "./kernel/dates";
import { coreAPI } from "./state";
import { traceNode } from "../bench/dev-trace";
import {
  OFFICES_MODULE_ID,
  openOffices,
  vacateSeat,
  type TermRow,
  type VacancyRow,
} from "./modules/offices";

const SEED = "opening-terms-in-office";
const WORLD_OPENS = "2024-12-20";
const GAME_STARTS = "2025-01-20";

it("every serving term is in office on the start day, and a death in the warm-up ends a term on the day it begins at the earliest", () => {
  const core = createLifeCore(
    buildPopulation({
      seed: SEED,
      placeKey: "5522550",
      startedAt: WORLD_OPENS,
      minimumPeople: 60,
    }),
  );
  openOffices(core, SEED, GAME_STARTS);
  const api = coreAPI(core);
  const terms = () =>
    api
      .moduleState(OFFICES_MODULE_ID)
      .table("terms")
      .rows() as unknown as TermRow[];
  const serving = terms().filter((term) => term.status === "serving");
  expect(serving.length, "serving terms").toBeGreaterThan(1000);
  const over = serving.filter(
    (term) => term.endDate && term.endDate <= GAME_STARTS,
  );
  expect(
    over.map((term) => term.id),
    "serving terms ending on or before the start",
  ).toEqual([]);
  // A term for a start day in the warm-up's last days is serving on the record from the first day,
  // and its holder takes office on its true first day (`termHasBegun`); none starts after the game does.
  expect(serving.filter((term) => term.startDate > GAME_STARTS)).toEqual([]);
  // A seat of the House: its term begins on the office's own start day after the 2024 election, so
  // the person who takes it is serving on the record from the day the world opened.
  const house = serving.find(
    (term) =>
      term.seatId.includes(":us-house") ||
      /seat:US-[A-Z]{2}:house/.test(term.seatId),
  );
  expect(house, "a serving House term").toBeDefined();
  // Dev mode's Trace on the seat names the term in office first, and the term's own Trace shows its start and end.
  const seatTrace = traceNode(core, undefined, house!.seatId);
  expect(seatTrace.children.map((child) => child.id)[0]).toBe(house!.id);
  const termTrace = traceNode(core, undefined, house!.id);
  expect(termTrace.record).toMatchObject({
    startDate: house!.startDate,
    endDate: house!.endDate,
  });
  advanceCore(core, addDays(makeIsoDate(core.date), 4));
  expect(core.date).toBe("2024-12-24");
  const vacancy = vacateSeat(api, house!.seatId, "death") as VacancyRow;
  expect(vacancy.vacatedTermId).toBe(house!.id);
  const ended = terms().find((term) => term.id === house!.id)!;
  expect(ended.status).toBe("ended");
  // A term that has begun ends on the day of the death; one whose holder has not yet taken the
  // seat (the House's begins Jan 3) ends on its own first day, never before it.
  expect(ended.endDate).toBe(
    house!.startDate > "2024-12-24" ? house!.startDate : "2024-12-24",
  );
  expect(
    ended.endDate! >= ended.startDate,
    "a term never ends before it starts",
  ).toBe(true);
});
