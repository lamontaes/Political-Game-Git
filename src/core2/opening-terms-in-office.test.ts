/**
 * The opening seats the term that is in office on the day the game starts (pool item
 * gov-opening-terms-end-before-the-start-date). A world built with a warm-up opens its core
 * before that day; the seats read their next election from the start day, so no serving term ends
 * on or before it, and a term that begins during the warm-up is held from the day the world opened
 * by the person who takes it. A death in those days opens a vacancy on that term, which has begun.
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

it("every serving term is in office on the start day, and a death in the warm-up ends a term that had begun", () => {
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
  expect(serving.filter((term) => term.startDate > WORLD_OPENS)).toEqual([]);
  // A seat of the House: its term began on the office's own start day after the 2024 election, so
  // the person who takes it holds it from the day the world opened.
  const house = serving.find(
    (term) =>
      term.seatId.includes(":us-house") ||
      /seat:US-[A-Z]{2}:house/.test(term.seatId),
  );
  expect(house, "a serving House term").toBeDefined();
  advanceCore(core, addDays(makeIsoDate(core.date), 4));
  expect(core.date).toBe("2024-12-24");
  const vacancy = vacateSeat(api, house!.seatId, "death") as VacancyRow;
  expect(vacancy.vacatedTermId).toBe(house!.id);
  const ended = terms().find((term) => term.id === house!.id)!;
  expect(ended.status).toBe("ended");
  expect(ended.endDate).toBe("2024-12-24");
  expect(
    ended.endDate! >= ended.startDate,
    "a term never ends before it starts",
  ).toBe(true);
});
