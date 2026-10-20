/**
 * Every game starts on Inauguration Day, January 20, 2025 (owner ruling,
 * Oct 14, 2026). In a random place of all 56 (the golden-path draw when the
 * suite runs it), on the start date: the law in force resolves, the
 * president and vice president take office as a public record, every seat's
 * term runs past the start, and the next contests come after it with their
 * filing deadlines.
 */
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { gameStartDate } from "./game-start";
import { buildPopulation } from "./population";
import { createLifeCore } from "./life";
import { coreAPI } from "./state";
import { lawChain, lawInForce, openLaws } from "./modules/laws";
import { openOffices, townSeats } from "./modules/offices";
import { ELECTIONS_MODULE_ID, openElections } from "./modules/elections";
import type { ContestRow } from "./modules/elections";
import { placeLocalities, placeStateKeys } from "./places";
import filingResearch from "../../data/research/elections/filing-requirements.json" with { type: "json" };

const filing = filingResearch as unknown as {
  id: string;
  places: Record<
    string,
    Record<
      string,
      { offeredIn2026?: boolean; nextRegularElection?: string | null }
    >
  >;
};

const seed =
  process.env.GOLDEN_PATH_SEED ??
  createHash("sha256").update(`game-start:${Date.now()}`).digest("hex");
const hash = (salt: string) =>
  parseInt(
    createHash("sha256").update(`${seed}:${salt}`).digest("hex").slice(0, 8),
    16,
  );
const states = [...placeStateKeys()].sort();
const state = states[hash("state") % states.length]!;
const places = [...placeLocalities(state)].sort((a, b) =>
  a.key.localeCompare(b.key),
);
const place =
  process.env.GOLDEN_PATH_PLACE_KEY ??
  places[hash("place") % places.length]!.key;

describe(`the game starts on Inauguration Day (${place}, seed ${seed})`, () => {
  const start = gameStartDate();
  const core = createLifeCore(
    buildPopulation({
      seed,
      placeKey: place,
      startedAt: start,
      minimumPeople: 200,
    }),
  );
  openLaws(core);
  openOffices(core, seed);
  openElections(core);
  const api = coreAPI(core);
  const stateKey = lawChain(api).stateKey;

  it("opens on January 20, the day the 20th Amendment begins a presidential term", () => {
    expect(core.date).toBe(start);
    expect(start.slice(5)).toBe("01-20");
  });

  it("resolves the law in force on the start date", () => {
    for (const series of ["minimum-wage", "income-tax", "medicaid-match"]) {
      const answer = lawInForce(api, series);
      expect(answer.value, `${series} in ${place}`).not.toBeNull();
      expect(answer.governing?.effectiveDate <= start).toBe(true);
    }
    // A state without a phase recorded on the start date still has a law.
    if (!/^US-(AS|GU|MP|PR|VI)$/.test(stateKey))
      for (const series of ["sales-tax", "snap-maximum"])
        expect(lawInForce(api, series).value, series).not.toBeNull();
  });

  it("records the president and vice president taking office as a public event", () => {
    expect(core.eventIds.has(`inauguration:${start}`)).toBe(true);
    const seats = townSeats(api);
    // A territory has no presidential electors, so the president is not one of
    // the offices its voters choose: it holds no town seat there.
    const territory = /^US-(AS|GU|MP|PR|VI)$/.test(stateKey);
    for (const id of ["seat:US:president", "seat:US:vice-president"]) {
      const holder = seats.find((s) => s.seat.id === id)?.holder;
      if (territory) expect(holder, `${id} in ${place}`).toBeUndefined();
      else expect(holder?.startDate, `${id} in ${place}`).toBe(start);
    }
  });

  it("seats every officeholder from a real start, with a term running past the start", () => {
    for (const { office, holder } of townSeats(api)) {
      if (!holder) continue;
      expect(holder.startDate <= start, office.id).toBe(true);
      if (holder.endDate)
        expect(
          holder.endDate > start,
          `${office.id} ends ${holder.endDate}`,
        ).toBe(true);
    }
  });

  it("puts the next contests after the start, with filing deadlines before election day", () => {
    const contests = api
      .moduleState(ELECTIONS_MODULE_ID)
      .table("contests")
      .rows() as unknown as ContestRow[];
    expect(contests.length).toBeGreaterThan(0);
    for (const contest of contests) {
      expect(contest.electionDate > start, contest.id).toBe(true);
      expect(contest.filingDeadline <= contest.electionDate, contest.id).toBe(
        true,
      );
    }
    // Each elected seat's next contest comes before its holder's term ends.
    const bySeat = new Map(contests.map((c) => [c.seatId, c]));
    for (const { office, seat, holder } of townSeats(api)) {
      const contest = bySeat.get(seat.id);
      if (!contest || !holder?.endDate) continue;
      expect(
        contest.electionDate < holder.endDate,
        `${office.id}: election ${contest.electionDate}, term ends ${holder.endDate}`,
      ).toBe(true);
    }
    // Legislative contests fall in a year the state holds them: in step with
    // the filing research's year when offered then, else its next regular one.
    const research = filing.places[stateKey]?.stateLegislative;
    const anchor =
      research?.offeredIn2026 === false && research.nextRegularElection
        ? Number(research.nextRegularElection)
        : Number(filing.id.slice(-4));
    for (const contest of contests.filter((c) =>
      c.officeId.includes(":legislature-"),
    ))
      expect(
        Math.abs(Number(contest.electionDate.slice(0, 4)) - anchor) % 2,
        `${contest.officeId} on ${contest.electionDate}`,
      ).toBe(0);
    // The 2026 midterm (U.S. House, every two years) is on the calendar.
    expect(contests.some((c) => c.electionDate.startsWith("2026-11-"))).toBe(
      true,
    );
  });
});
