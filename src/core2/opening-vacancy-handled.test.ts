/**
 * A death in the 31 days before the start leaves its seat vacant on day one, and the offices
 * engine has already handled it by its own rule for the seat: filled by whoever the law names, or
 * an election called with its contest in the elections engine (pool item
 * opening-offices-vacancies-empty-at-day-0; skill day-one-in-motion). Pinned to the day-zero
 * file's first place and seed, so the result never depends on a draw.
 *
 * Where to look: a special race for a seat outside the town (another state's legislature, a
 * senator, a House district) is on the voting engine's calendar under `special:<vacancy id>:<date>`
 * and has no contest row; the offices engine's own calendar holds only the stand-in for a seat no
 * engine counts. Looking on the offices calendar makes a called election look never called.
 *
 * Time: 60 s measured (a world opening with the 31-day warm-up, then 9 days); the limit is twice that.
 */
import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { buildBenchWorld, OPENING_WARMUP_DAYS } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays } from "./kernel/dates";
import { advanceCore } from "./life";
import { coreAPI } from "./state";
import { OFFICES_MODULE_ID } from "./modules/offices";
import { ELECTIONS_MODULE_ID } from "./modules/elections";
import { VOTING_MODULE_ID } from "./modules/voting";

const place = (
  JSON.parse(
    readFileSync(
      new URL("./data/opening/day-zero.json", import.meta.url),
      "utf8",
    ),
  ) as { pinnedPlaces: { placeKey: string; seed: string }[] }
).pinnedPlaces[0]!;

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
}, 120_000);
