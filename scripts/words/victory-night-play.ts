/**
 * Plays a drawn place's local race to its count, for the tests and the walk of the night a winner
 * has (Story lead, Nov 17; development tooling, shipped play never imports it). Residents of the
 * town file for the soonest local race that holds two of them, their campaigns run as the
 * campaigns engine runs a world candidate's (volunteers, a manager, doors, ads, gifts), the world
 * runs to the voting engine's own count, and the winner's night is the scene the director staged.
 */
import { buildBenchWorld } from "../../src/bench/world";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { gatherSignatures } from "../../src/core2/campaign-petition-kit";
import { gameStartDate } from "../../src/core2/game-start";
import { advanceToRaceFiling } from "../../src/core2/gov-test-clock";
import type { EntityId } from "../../src/core2/kernel/brands";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";
import { advanceCore } from "../../src/core2/life";
import {
  ballot,
  checkEligibility,
  ELECTIONS_MODULE_ID,
  fileCandidacy,
  type ContestRow,
  type FilingRow,
} from "../../src/core2/modules/elections";
import { filingClerkFor } from "../../src/core2/modules/filing-clerk";
import { resultOf } from "../../src/core2/modules/voting";
import { coreAPI } from "../../src/core2/state";
import type { CoreState, PersonId } from "../../src/core2/types";
import type { Director } from "../../src/director/ledger";
import type { ScheduleEntry } from "../../src/director/scheduling";

/** A race played to its count, with the winner's night staged. */
export interface PlayedNight {
  readonly where: string;
  readonly core: CoreState;
  readonly director: Director;
  readonly contest: ContestRow;
  readonly winner: PersonId;
  readonly filings: readonly FilingRow[];
  readonly entry: ScheduleEntry;
  readonly causeId: string;
}

/** Why a drawn place gave no night, by name. */
export interface NoNight {
  readonly where: string;
  readonly why: string;
}

const LOCAL = ["city", "township", "county"];

/**
 * The soonest local races of a place, one by one, until one holds two resident filers whose count
 * is written and stages a night for its winner. `passed` names every race passed over and why.
 */
export function playNight(
  place: { name: string; key: string; seed: string },
  passed: string[],
  options: { fileLimit?: number } = {},
): PlayedNight | NoNight {
  const where = `${place.name} (${place.key}), world seed ${place.seed}`;
  const limit = options.fileLimit ?? 3;
  setBookkeeping(false);
  const { core, director } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const api = coreAPI(core);
  const townId = core.people.get(core.playerId!)?.placeId;
  const contests = (
    api
      .moduleState(ELECTIONS_MODULE_ID)
      .table("contests")
      .rows() as unknown as ContestRow[]
  )
    .filter((row) => LOCAL.includes(row.level) && row.filingOpens !== null)
    .sort(
      (a, b) =>
        a.electionDate.localeCompare(b.electionDate) ||
        a.id.localeCompare(b.id),
    );
  if (!contests.length) return { where, why: "no local race on the calendar" };
  for (const contest of contests.slice(0, 6)) {
    if (core.date > contest.electionDate) {
      passed.push(`${where}: ${contest.id} is already past`);
      continue;
    }
    const running = (personId: string) =>
      (
        api
          .moduleState(ELECTIONS_MODULE_ID)
          .table("filings")
          .query("byPerson", [personId]) as unknown as FilingRow[]
      ).some((row) => ["petitioning", "on-ballot"].includes(row.status));
    advanceToRaceFiling(core, contest);
    if (core.date > contest.filingDeadline) {
      passed.push(
        `${where}: ${contest.id} closed its filing before the world got there`,
      );
      continue;
    }
    const clerkId = filingClerkFor(api, contest.id)?.personId;
    const filings: FilingRow[] = [];
    for (const person of [...core.people.values()]
      .filter(
        (p) =>
          p.alive &&
          p.placeId === townId &&
          p.id !== core.playerId &&
          p.id !== clerkId &&
          !running(p.id) &&
          !checkEligibility(api, p.id, contest.id, null).some((c) => !c.met),
      )
      .sort((a, b) => a.id.localeCompare(b.id))
      .slice(0, 40)) {
      if (filings.length >= limit) break;
      director.watch(core, person.id);
      core.focusPersonIds.add(person.id);
      const result = fileCandidacy(api, {
        personId: person.id,
        contestId: contest.id,
        platform: [],
      });
      if (
        "filing" in result &&
        ["petitioning", "on-ballot"].includes(result.status)
      )
        filings.push(result.filing);
    }
    if (filings.length < 2) {
      passed.push(`${where}: ${contest.id} took ${filings.length} filers`);
      continue;
    }
    gatherSignatures(core, ...filings.map((f) => f.id));
    advanceCore(core, addDays(makeIsoDate(contest.electionDate), -1));
    const onBallot = ballot(api, contest.id);
    if (onBallot.length < 2) {
      passed.push(
        `${where}: ${contest.id} had ${onBallot.length} on the ballot on the eve`,
      );
      continue;
    }
    for (const row of onBallot) {
      director.watch(core, row.personId as PersonId);
      core.focusPersonIds.add(row.personId as PersonId);
    }
    advanceCore(core, makeIsoDate(contest.electionDate));
    for (let day = 0; day < 3 && !resultOf(api, contest.id); day += 1)
      advanceCore(core, addDays(makeIsoDate(core.date), 1));
    const result = resultOf(api, contest.id);
    if (!result?.winnerId) {
      passed.push(`${where}: ${contest.id} had no winner`);
      continue;
    }
    const winner = result.winnerId as PersonId;
    const causeId = `election-result:${contest.id}`;
    if (!core.durableLog.has(causeId as EntityId)) {
      passed.push(`${where}: ${contest.id} wrote no ${causeId}`);
      continue;
    }
    const entry = director.ledger.people
      .get(winner)
      ?.schedule.find(
        (row) =>
          row.momentId.includes(causeId) &&
          row.bindings.some((binding) => binding.typeKey === "race-won"),
      );
    if (!entry) {
      passed.push(
        `${where}: ${contest.id} staged no victory night for ${winner}`,
      );
      continue;
    }
    return { where, core, director, contest, winner, filings, entry, causeId };
  }
  return { where, why: "every race passed over: " + passed.join("; ") };
}

/** Whether `playNight` found a night. */
export const found = (row: PlayedNight | NoNight): row is PlayedNight =>
  "entry" in row;
