/**
 * PW-5 acceptance check 5: in five places drawn with the golden path's
 * `drawPlace`, every seat that covers the town has its first contest dated by
 * the rule row for its state and office kind: the election falls in a year the
 * row's cycle holds, on the row's day; the filing deadline and primary come
 * before it; the winner takes office on the row's take-office day; and the
 * sitting holder's term ends that same day, so no seat is held past its end
 * and no winner starts on Election Day. Places and seeds are printed.
 */
import { execSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../tests/golden-path/place";
import { buildPopulation } from "./population";
import { createLifeCore } from "./life";
import { coreAPI } from "./state";
import { openOffices, townSeats } from "./modules/offices";
import {
  ELECTIONS_MODULE_ID,
  openElections,
  type ContestRow,
} from "./modules/elections";
import { termStartAfter } from "./elections-calendar";
import {
  cycleHolds,
  officeStateKey,
  primaryIn,
  takeOfficeDate,
  termRuleFor,
} from "./term-rules";
import { novemberGeneralElectionDay } from "./gov-rules/town-election-calendar";
import { governmentUnit } from "../simulation/government-units";
import { nextCountyElection } from "./gov-rules/county-election-calendar";
import { makeIsoDate } from "../simulation/dates";
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

/** Whether a county's own published calendar (the locality's record) dates this election. */
function countyRecordDates(
  officeJurisdiction: string,
  electionDate: string,
): boolean {
  const unit = governmentUnit(officeJurisdiction);
  if (!unit) return false;
  const read = nextCountyElection(
    unit,
    makeIsoDate(`${electionDate.slice(0, 4)}-01-01`),
  );
  return read.status === "read" && !read.dates.estimated;
}

describe("PW-5 first contests dated by the rule rows, five random places", () => {
  for (const n of [1, 2, 3, 4, 5])
    it(`place ${n}`, () => {
      const drawn = drawPlace(commit, `PW-5-dating-${n}`);
      console.log(
        `PW-5 dating place ${n}: ${drawn.name}, ${drawn.state} (${drawn.key}), seed ${drawn.seed}`,
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
      const api = coreAPI(core);
      const stateKey = lifePlaceByKey(drawn.key)!.stateJurisdictionKey!;
      const contests = api
        .moduleState(ELECTIONS_MODULE_ID)
        .table("contests")
        .rows() as unknown as ContestRow[];
      let checked = 0;
      for (const { office, seat, holder } of townSeats(api)) {
        if (!office.elected || office.kind === "vice-president") continue;
        const contest = contests.find((c) => c.seatId === seat.id);
        const where = `${drawn.key} ${seat.id}`;
        const row = termRuleFor(officeStateKey(office, stateKey), office);
        expect(row, `${where}: no rule row`).not.toBeNull();
        if (!contest) continue;
        checked += 1;
        const year = Number(contest.electionDate.slice(0, 4));
        expect(contest.electionDate > OPENING, where).toBe(true);
        // The filing deadline and the primary come before Election Day.
        expect(contest.filingDeadline < contest.electionDate, where).toBe(true);
        if (contest.primaryDate) {
          expect(contest.primaryDate < contest.electionDate, where).toBe(true);
          expect(contest.filingDeadline <= contest.primaryDate, where).toBe(
            true,
          );
        }
        const local = ["city", "county", "township"].includes(office.level);
        const record =
          office.level === "county" &&
          countyRecordDates(office.jurisdiction, contest.electionDate);
        if (!local) {
          // A state or federal seat: the row's cycle holds the year, on the
          // general election day, with the row's primary.
          expect(cycleHolds(row!, office, year), where).not.toBe(false);
          expect(contest.electionDate, where).toBe(
            novemberGeneralElectionDay(year),
          );
          const primary = primaryIn(row!, year, nominationKey(office.kind));
          expect(contest.primaryDate, where).toBe(
            primary && primary < contest.electionDate ? primary : null,
          );
        }
        // The winner takes office on the row's day (or the county's own
        // published calendar, where one is read).
        const starts = termStartAfter(office, contest.electionDate, stateKey);
        if (!record)
          expect(starts, where).toBe(
            takeOfficeDate(row!, contest.electionDate),
          );
        expect(starts > contest.electionDate, where).toBe(true);
        // The sitting holder serves until the winner starts, not past it.
        if (holder?.endDate && contest.incumbentTermId === holder.id)
          expect(holder.endDate, `${where} holder ${holder.id}`).toBe(starts);
      }
      expect(checked).toBeGreaterThan(0);
    });
});

/** Which column of the 2026 dates table an office reads, as the calendar does. */
function nominationKey(kind: string): string {
  if (kind === "us-senate") return "us-senate";
  if (kind.startsWith("us-house")) return "us-house";
  if (kind === "governor") return "governor";
  return "all";
}
