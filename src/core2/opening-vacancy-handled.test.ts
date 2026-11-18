/**
 * A death in the 31 days before the start leaves its seat vacant on day one, and the offices
 * engine has already handled it by its own rule for the seat: filled by whoever the law names, or
 * an election called with its contest in the elections engine (pool item
 * opening-offices-vacancies-empty-at-day-0; skill day-one-in-motion). Pinned to a place and seed a scan
 * chose, so the result never depends on a draw.
 *
 * Where to look: a special race for a seat outside the town (another state's legislature, a
 * senator, a House district) is on the voting engine's calendar under `special:<vacancy id>:<date>`
 * and has no contest row; the offices engine's own calendar holds only the stand-in for a seat no
 * engine counts. Looking on the offices calendar makes a called election look never called.
 *
 * Dev mode's Trace on the vacancy names the term that ended (who left and how) and, once it is
 * filled, the term that filled it, so no one reads the code to see why a seat was empty.
 *
 * Time: 31 s measured alone (a world opening with the 31-day warm-up, then the days to the last election called); the limit is 75 s.
 */
import { expect, it } from "vitest";
import { buildBenchWorld, OPENING_WARMUP_DAYS } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays } from "./kernel/dates";
import { advanceCore } from "./life";
import { traceNode } from "../bench/dev-trace";
import { coreAPI } from "./state";
import { OFFICES_MODULE_ID } from "./modules/offices";
import { ELECTIONS_MODULE_ID } from "./modules/elections";
import { VOTING_MODULE_ID } from "./modules/voting";

// Pinned by a scan outside the test (40 seeds of this place, no time limit): this seed's world has
// a vacancy a death left on each of Dec 23, 25, 29 and 31, three awaiting an election, one filled.
const place = { placeKey: "5522550", seed: "day-one-vacancy-3" };

it("every vacancy a death before the start left is filled, or has its election called, on day one", () => {
  setBookkeeping(false);
  const world = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.placeKey,
    warmUpDays: OPENING_WARMUP_DAYS,
  });
  const api = coreAPI(world.core);
  const start = world.core.date;
  const offices = api.moduleState(OFFICES_MODULE_ID);
  const vacancies = offices.table("vacancies").rows() as unknown as {
    id: string;
    seatId: string;
    since: string;
    cause: string;
    status: string;
    vacatedTermId?: string;
    unheld?: object;
    filledBy?: string;
    electionDate?: string;
    rule: { method: string };
  }[];
  const past = vacancies.filter((v) => v.since < start);
  expect(past.length, "vacancies dated before the start").toBeGreaterThan(0);
  const terms = offices.table("terms").rows() as unknown as {
    id: string;
    seatId: string;
    status: string;
    startDate: string;
  }[];
  const contests = api
    .moduleState(ELECTIONS_MODULE_ID)
    .table("contests")
    .rows() as unknown as { seatId: string; electionDate: string }[];
  const calendar = api.moduleCalendar(VOTING_MODULE_ID);
  const waiting: typeof past = [];
  // A seat of another state's Congress is kept by the officials engine, with no term here
  // (`VacancyRow.unheld`); the rest name the term that ended.
  const held = past.filter((v) => !v.unheld);
  expect(held.length, "vacancies of seats with a term here").toBeGreaterThan(0);
  for (const v of held) {
    const caused = (traceNode(world.core, undefined, v.id).causes ?? []).map(
      (c) => c.id,
    );
    expect(v.vacatedTermId, `${v.id}: the term that ended`).toBeDefined();
    expect(caused, `${v.id}: its Trace names the term that ended`).toContain(
      v.vacatedTermId,
    );
  }
  for (const v of past) {
    const why = `${v.id} (${v.cause}, rule ${v.rule.method}, ${v.status})`;
    expect(v.status, why).not.toBe("open");
    if (v.status === "filled") {
      const term = terms.find((t) => t.id === v.filledBy);
      expect(term, `${why}: the term that filled it`).toBeDefined();
      expect(term!.seatId, why).toBe(v.seatId);
    } else {
      // The election is called: a contest where the elections engine counts the seat, else the
      // voting engine's special race for a seat outside the town, on the vacancy's own record.
      expect(v.electionDate, `${why}: its election date`).toBeDefined();
      const contest = contests.some(
        (c) => c.seatId === v.seatId && c.electionDate === v.electionDate,
      );
      const entry = calendar.get(`special:${v.id}:${v.electionDate}`);
      expect(
        contest || entry?.date === v.electionDate,
        `${why}: a contest or the special race on ${v.electionDate}`,
      ).toBe(true);
      waiting.push(v);
    }
  }
  // The day after the election, the seat has its holder.
  const last = waiting
    .map((v) => v.electionDate!)
    .sort()
    .at(-1);
  if (last) {
    advanceCore(world.core, addDays(last, 1));
    const after = api
      .moduleState(OFFICES_MODULE_ID)
      .table("vacancies")
      .rows() as unknown as typeof vacancies;
    const seated = api
      .moduleState(OFFICES_MODULE_ID)
      .table("terms")
      .rows() as unknown as typeof terms;
    for (const v of waiting) {
      const now = after.find((x) => x.id === v.id)!;
      expect(now.status, `${v.id} after its election`).toBe("filled");
      if (v.unheld) continue;
      expect(
        (traceNode(world.core, undefined, v.id).causes ?? []).map((c) => c.id),
        `${v.id}: its Trace names the term that filled it`,
      ).toContain(now.filledBy);
      expect(
        seated.some(
          (t) =>
            t.id === now.filledBy &&
            t.seatId === v.seatId &&
            t.status === "serving",
        ),
        `${v.id}: the serving term that filled it`,
      ).toBe(true);
    }
  }
}, 75_000);
