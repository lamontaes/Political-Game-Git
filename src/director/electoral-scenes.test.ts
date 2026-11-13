import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import {
  ELECTIONS_MODULE_ID,
  type ContestRow,
  type FilingRow,
} from "../core2/modules/elections";
import { askToVolunteer, campaignFor } from "../core2/modules/campaigns";
import { resultOf } from "../core2/modules/voting";
import { coreAPI } from "../core2/state";

// A race won or lost is a scene for the candidate (owner, Oct 15): the night
// of the count, with the campaign's own people and the household. The cause
// is the election's result record; the winner is in it.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");
const place = drawPlace(seed, "electoral-scenes");

it(`a candidate's night of the count is a won or lost scene citing the result, in ${place.name}, seed ${seed}`, () => {
  setBookkeeping(false);
  const world = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const { core, director } = world;
  const api = coreAPI(core);
  const elections = api.moduleState(ELECTIONS_MODULE_ID);
  const contests = () =>
    elections.table("contests").rows() as unknown as ContestRow[];
  // The next election day the town votes on a contest with named candidates.
  const nextDay = () =>
    contests()
      .map((row) => row.electionDate)
      .filter((date) => date > core.date)
      .sort()[0];
  let day: string | undefined;
  let filings: FilingRow[] = [];
  for (let guard = 0; guard < 8; guard += 1) {
    day = nextDay();
    expect(day, "an election day ahead").toBeDefined();
    advanceCore(core, addDays(makeIsoDate(day!), -1));
    const ids = new Set(
      contests()
        .filter((row) => row.electionDate === day)
        .map((row) => row.id),
    );
    filings = (
      elections.table("filings").rows() as unknown as FilingRow[]
    ).filter((row) => ids.has(row.contestId) && core.people.has(row.personId));
    if (filings.length) break;
    advanceCore(core, day!);
  }
  expect(filings.length, "candidates who are full people").toBeGreaterThan(0);
  for (const filing of filings) director.watch(core, filing.personId);
  // Each candidate asks the people around them to work the campaign; those
  // who say yes are its volunteers on record.
  for (const filing of filings) {
    const person = core.people.get(filing.personId)!;
    const around = [...person.familyIds, ...person.knownIds]
      .filter((id) => id !== filing.personId && core.people.get(id)?.alive)
      .sort()
      .slice(0, 40);
    for (const id of around) askToVolunteer(api, filing.id, id);
  }
  advanceCore(core, addDays(makeIsoDate(day!), 3));

  const stated: string[] = [];
  for (const filing of filings) {
    const result = resultOf(api, filing.contestId);
    if (!result?.winnerId) continue;
    const book = director.ledger.people.get(filing.personId)!;
    // A candidate the director saw the count reach (an official on the
    // calendar, in a race beyond the town, has no day-by-day ledger).
    const entry = book.schedule.find((row) =>
      row.momentId.includes(`election-result:${filing.contestId}`),
    );
    if (!entry) continue;
    // Two races lost (or won) the same night are one sitting: the day's
    // scene for the first takes the second in and cites its record, so the
    // second's own entry stages nothing of its own.
    const sitting = entry.bindings.length
      ? entry
      : book.schedule.find(
          (row) =>
            row.date === entry.date &&
            row.bindings.some((binding) =>
              binding.joined?.some((item) => item.momentId === entry.momentId),
            ),
        );
    expect(
      sitting,
      `${entry.momentId}: staged or taken into the night's sitting`,
    ).toBeDefined();
    const types = sitting!.bindings.map((row) => row.typeKey);
    const won = result.winnerId === filing.personId;
    expect(types).toContain(won ? "race-won" : "race-lost");
    expect(types).not.toContain(won ? "race-lost" : "race-won");
    const scene = sitting!.bindings.find(
      (row) => row.typeKey === (won ? "race-won" : "race-lost"),
    )!;
    // The candidate is the subject, and the household is theirs on record.
    expect(
      scene.roles.find((row) => row.role === "candidate")!.personIds,
    ).toEqual([filing.personId]);
    const family = scene.roles.find((row) => row.role === "family")!.personIds;
    for (const id of family)
      expect(core.people.get(id)!.householdId).toBe(
        core.people.get(filing.personId)!.householdId,
      );
    const supporters = scene.roles.find(
      (row) => row.role === "supporters",
    )!.personIds;
    // The campaign's own volunteers are the supporters, from its record: the
    // sitting's own race's campaign, when this race was taken into it.
    const sittingContest = core.durableLog.get(
      book.momentsById.get(sitting!.momentId)?.causeId ?? "",
    )?.facts?.contestId;
    const sittingFiling =
      filings.find(
        (row) =>
          row.personId === filing.personId && row.contestId === sittingContest,
      ) ?? filing;
    // Read from the campaign's record now: a candidate in several races who
    // asks the same people for each moves them to the last campaign asked.
    // A volunteer who lives with the candidate stands in the scene as family,
    // and a person is cast once. The campaign's staff stand with its
    // volunteers, and a staffer who also volunteers is cast once
    // (Manchester, Connecticut, seed own-g1: one was cast twice).
    const run = campaignFor(api, sittingFiling.id);
    expect(supporters).toEqual(
      [...new Set([...run.volunteerIds, ...(run.staffIds ?? [])])].filter(
        (id) =>
          core.people.get(id)?.alive &&
          id !== filing.personId &&
          !family.includes(id),
      ),
    );
    stated.push(
      `${filing.personId} ${won ? "won" : "lost"} ${filing.contestId} (${scene.setting.kind} ${scene.setting.recordId}; supporters ${supporters.length}, family ${family.length})`,
    );
  }
  expect(stated.length).toBeGreaterThan(0);
  console.log(`SCENES ${place.name} ${seed}\n${stated.join("\n")}`);
}, 900_000);
