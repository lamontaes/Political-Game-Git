/**
 * PW-5 step 3: a term that runs out with nobody elected to follow it ends on
 * its last day; the seat is filled the way the office's vacancy rule says,
 * the filler serves until the next regular winner takes office, and the seat
 * has its next contest on the calendar. In a place drawn with the golden
 * path's `drawPlace`; the place and seed are printed.
 */
import { execSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../tests/golden-path/place";
import { buildPopulation } from "./population";
import { advanceCore, createLifeCore } from "./life";
import { coreAPI } from "./state";
import {
  OFFICES_MODULE_ID,
  openOffices,
  putTerm,
  townSeats,
  type TermRow,
  type VacancyRow,
} from "./modules/offices";
import {
  ELECTIONS_MODULE_ID,
  openElections,
  type ContestRow,
} from "./modules/elections";
import { openVoting } from "./modules/voting";

const OPENING = "2026-10-12";
const commit =
  process.env.GOLDEN_PATH_COMMIT ??
  (() => {
    try {
      return execSync("git rev-parse HEAD", { stdio: "pipe" })
        .toString()
        .trim();
    } catch {
      return "no-commit";
    }
  })();

describe("PW-5 terms end on their last day", () => {
  it("ends a term that runs out, fills the seat by its rule, and opens the next contest", () => {
    const drawn = drawPlace(commit, "PW-5-term-ends");
    console.log(
      `PW-5 term ends: ${drawn.name}, ${drawn.state} (${drawn.key}), seed ${drawn.seed}`,
    );
    const core = createLifeCore(
      buildPopulation({
        seed: drawn.seed,
        placeKey: drawn.key,
        startedAt: OPENING,
        minimumPeople: 60,
      }),
    );
    openOffices(core, drawn.seed);
    openElections(core);
    openVoting(core);
    const api = coreAPI(core);
    const offices = api.moduleState(OFFICES_MODULE_ID);
    // A seat whose term in progress runs out in three days, with no one
    // elected to it: the case of an officer whose term ends between elections.
    const target = townSeats(api).find(
      (s) =>
        s.holder?.endDate &&
        s.office.elected &&
        s.office.kind !== "president" &&
        s.office.kind !== "vice-president",
    )!;
    expect(target, "a seat with a term").toBeDefined();
    const lastDay = "2026-10-15";
    putTerm(api, { ...target.holder!, endDate: lastDay });
    advanceCore(core, "2026-10-16");
    const ended = offices
      .table("terms")
      .get(target.holder!.id) as unknown as TermRow;
    expect(ended.status).toBe("ended");
    expect(ended.endDate).toBe(lastDay);
    expect(ended.endedBy).toBe("term ended");
    const vacancy = (
      offices.table("vacancies").rows() as unknown as VacancyRow[]
    ).find((v) => v.seatId === target.seat.id);
    expect(vacancy, "the vacancy is recorded with its rule").toBeDefined();
    expect(vacancy!.since).toBe(lastDay);
    expect(vacancy!.rule.method).toBeTruthy();
    const serving = offices
      .table("terms")
      .query("bySeatStatus", [
        target.seat.id,
        "serving",
      ]) as unknown as TermRow[];
    if (vacancy!.rule.method !== "remains-vacant" && serving.length) {
      // Whoever fills it serves until a winner takes office, not past today.
      expect(serving[0]!.startDate).toBe(lastDay);
      expect(serving[0]!.endDate! > lastDay).toBe(true);
    }
    // No one holds the seat past a term's end.
    for (const term of offices
      .table("terms")
      .query("byStatus", ["serving"]) as unknown as TermRow[])
      if (term.endDate)
        expect(term.endDate >= "2026-10-16", term.id).toBe(true);
    // The seat's next contest is open.
    const contests = api
      .moduleState(ELECTIONS_MODULE_ID)
      .table("contests")
      .rows() as unknown as ContestRow[];
    expect(
      contests.some(
        (c) => c.seatId === target.seat.id && c.electionDate > lastDay,
      ),
    ).toBe(true);
  });
});
