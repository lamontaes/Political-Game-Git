/**
 * PW-5 step 5: a next contest every cycle. In a place drawn with the golden
 * path's `drawPlace` (printed with its seed), every seat decided on the first
 * Election Day has its next regular contest open as soon as the result is in,
 * a full term on, and that contest's winner takes office the day the term
 * just won ends.
 */
import { execSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../tests/golden-path/place";
import { buildPopulation } from "./population";
import { advanceCore, createLifeCore } from "./life";
import { coreAPI } from "./state";
import { OFFICES_MODULE_ID, openOffices } from "./modules/offices";
import {
  ELECTIONS_MODULE_ID,
  openElections,
  type ContestRow,
} from "./modules/elections";
import { VOTING_MODULE_ID, openVoting, type ResultRow } from "./modules/voting";
import { openCampaigns } from "./modules/campaigns";
import { openParties } from "./modules/parties";
import { termEndAfter, termStartAfter } from "./elections-calendar";
import type { OfficeInput } from "./offices-local";
import { lifePlaceByKey } from "../simulation/life-places";

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

describe("PW-5 a next contest every cycle", () => {
  it("opens each decided seat's next contest with the result, a full term on", () => {
    const drawn = drawPlace(commit, "PW-5-next-contest");
    console.log(
      `PW-5 next contest: ${drawn.name}, ${drawn.state} (${drawn.key}), seed ${drawn.seed}`,
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
    openCampaigns(core);
    openParties(core);
    openVoting(core);
    const api = coreAPI(core);
    const stateKey = lifePlaceByKey(drawn.key)!.stateJurisdictionKey!;
    const contests = () =>
      api
        .moduleState(ELECTIONS_MODULE_ID)
        .table("contests")
        .rows() as unknown as ContestRow[];
    const day = contests()
      .map((c) => c.electionDate)
      .sort()[0]!;
    const next = new Date(`${day}T00:00:00Z`);
    next.setUTCDate(next.getUTCDate() + 1);
    advanceCore(core, next.toISOString().slice(0, 10));
    const results = api
      .moduleState(VOTING_MODULE_ID)
      .table("results")
      .rows() as unknown as ResultRow[];
    const decided = results.filter((r) => r.date === day && r.winnerId);
    expect(decided.length).toBeGreaterThan(0);
    let checked = 0;
    for (const result of decided) {
      const contest = contests().find((c) => c.id === result.contestId)!;
      const office = api
        .moduleState(OFFICES_MODULE_ID)
        .table("offices")
        .get(contest.officeId) as unknown as OfficeInput;
      // The presidency goes to the electoral college (world-races).
      if (office.kind === "president" || !office.termYears) continue;
      const following = contests().find(
        (c) => c.seatId === contest.seatId && c.electionDate > day,
      );
      expect(following, `${contest.seatId}: next contest`).toBeDefined();
      expect(
        Number(following!.electionDate.slice(0, 4)),
        `${contest.seatId}: ${following!.electionDate}`,
      ).toBe(Number(day.slice(0, 4)) + office.termYears);
      expect(
        termStartAfter(office, following!.electionDate, stateKey),
        contest.seatId,
      ).toBe(termEndAfter(office, day, stateKey));
      checked += 1;
    }
    expect(checked).toBeGreaterThan(0);
  });
});
