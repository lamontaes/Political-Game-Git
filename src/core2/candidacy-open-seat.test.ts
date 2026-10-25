/**
 * Pool item gov-empty-ballot-stay-out-and-late-vacancy. An incumbent who
 * stands down leaves an open seat: they weigh standing again before anyone
 * else weighs the seat, and everyone after them weighs it as one, citing the
 * decision that opened it. In St. Johnsbury, Vermont (pinned, where the
 * county treasurer stood down and nobody ran), the seat then carries a
 * filing; and in places drawn from all 56, every seat whose incumbent stood
 * down is weighed as open.
 */
import { createHash, randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import {
  CANDIDACY_MODULE_ID,
  CANDIDACY_PARAMETERS,
  type CandidacyDecision,
} from "./modules/candidacy";
import { ballot, ELECTIONS_MODULE_ID } from "./modules/elections";
import { coreAPI } from "./state";
import type { CoreState } from "./types";

const ST_JOHNSBURY = {
  key: "5062125",
  seed: "f915eb032ec8974d29313800491a231f3b0daedc594075e0adbea9c7937ef8c4",
  treasurer: "contest:seat:gus2025:176534:treasurer:0:2025-11-04",
};
const base = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const OPEN_SEAT = Number(CANDIDACY_PARAMETERS.candidacyOpenSeatWeight!.value);
/** Days played in a drawn place: past the first spring's filing deadlines. */
const DRAWN_DAYS = 160;
const DRAWS = 4;

function decisions(core: CoreState): CandidacyDecision[] {
  return coreAPI(core)
    .moduleState(CANDIDACY_MODULE_ID)
    .table("decisions")
    .rows() as unknown as CandidacyDecision[];
}

/**
 * Every seat whose incumbent stood down: the incumbent decided first, and
 * every other decision on it weighs an open seat and cites the stand-down.
 * Returns the stand-downs found.
 */
function openSeatsHold(core: CoreState, where: string): CandidacyDecision[] {
  const rows = decisions(core);
  const stoodDown = rows.filter(
    (row) => row.reasons.standAgain !== undefined && !row.run,
  );
  for (const down of stoodDown) {
    const others = rows.filter(
      (row) => row.contestId === down.contestId && row.id !== down.id,
    );
    for (const row of others) {
      expect(
        row.date >= down.date,
        `${where}: ${row.id} decided before the incumbent stood down (${down.id})`,
      ).toBe(true);
      expect(row.reasons.openSeat, `${where}: ${row.id}'s open-seat pull`).toBe(
        OPEN_SEAT,
      );
      expect(row.sourceIds, `${where}: ${row.id}'s sources`).toContain(down.id);
    }
  }
  return stoodDown;
}

it("St. Johnsbury, Vermont: the county treasurer stands down, and the open seat carries a filing whose decision cites it", () => {
  setBookkeeping(false);
  const { core } = buildBenchWorld(ST_JOHNSBURY.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: ST_JOHNSBURY.key,
  });
  const where = `St. Johnsbury, Vermont (${ST_JOHNSBURY.key}), seed ${ST_JOHNSBURY.seed}`;
  const api = coreAPI(core);
  const contest = api
    .moduleState(ELECTIONS_MODULE_ID)
    .table("contests")
    .get(ST_JOHNSBURY.treasurer) as unknown as { filingDeadline: string };
  expect(contest, where).toBeDefined();
  advanceCore(core, addDays(makeIsoDate(contest.filingDeadline), 1));
  const rows = decisions(core as CoreState).filter(
    (row) => row.contestId === ST_JOHNSBURY.treasurer,
  );
  const down = rows.find((row) => row.reasons.standAgain !== undefined);
  expect(down?.run, `${where}: the treasurer's decision to stand again`).toBe(
    false,
  );
  const filed = ballot(api, ST_JOHNSBURY.treasurer);
  expect(filed.length, `${where}: filings for the treasurer`).toBeGreaterThan(
    0,
  );
  const lines: string[] = [];
  for (const filing of filed) {
    const decision = rows.find((row) => row.personId === filing.personId)!;
    expect(decision.run, `${where}: ${filing.id}'s decision`).toBe(true);
    expect(decision.sourceIds, `${where}: ${decision.id}'s sources`).toContain(
      down!.id,
    );
    lines.push(
      `${filing.id} (decision ${decision.id}, open seat ${decision.reasons.openSeat})`,
    );
  }
  openSeatsHold(core as CoreState, where);
  process.stdout.write(
    `OPEN SEAT ${where}: ${down!.id} stood down (stand again ${down!.reasons.standAgain!.toFixed(2)}); ${lines.join("; ")}\n`,
  );
}, 1_200_000);

it(`places drawn from all 56 weigh every seat whose incumbent stood down as open (base ${base})`, () => {
  const tried: string[] = [];
  for (let i = 0; i < DRAWS; i += 1) {
    const place = drawPlace(
      createHash("sha256").update(`${base}:${i}`).digest("hex"),
      "candidacy-open-seat",
    );
    setBookkeeping(false);
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const where = `${place.name} (${place.key}), seed ${place.seed}, base ${base}`;
    advanceCore(core, addDays(gameStartDate(), DRAWN_DAYS));
    const stoodDown = openSeatsHold(core as CoreState, where);
    if (!stoodDown.length) {
      tried.push(`${where}: no incumbent stood down`);
      continue;
    }
    const weighed = decisions(core as CoreState).filter((row) =>
      stoodDown.some(
        (down) => down.contestId === row.contestId && down.id !== row.id,
      ),
    );
    process.stdout.write(
      `OPEN SEAT ${where}: ${stoodDown.length} stood down (${stoodDown
        .slice(0, 3)
        .map((row) => row.id)
        .join(
          ", ",
        )}); ${weighed.length} decisions weighed their seats as open, ${weighed.filter((row) => row.run).length} to run\n`,
    );
    expect(weighed.length, where).toBeGreaterThan(0);
    return;
  }
  throw new Error(
    `no drawn place had an incumbent stand down in ${DRAWN_DAYS} days: ${tried.join("; ")}`,
  );
}, 2_400_000);
