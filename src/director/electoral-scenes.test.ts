import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import {
  checkEligibility,
  ELECTIONS_MODULE_ID,
  fileCandidacy,
  openContests,
  type ContestRow,
  type FilingRow,
} from "../core2/modules/elections";
import { filingClerkFor } from "../core2/modules/filing-clerk";
import { retellingsOf, SPEECH_MODULE_ID } from "../core2/modules/speech";
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
    // and a person is cast once.
    expect(supporters).toEqual(
      [...campaignFor(api, sittingFiling.id).volunteerIds].filter(
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

// A candidate who files is met by the clerk of the filing office, and a
// campaigning candidate who speaks to a crowd has a campaign stop (owner,
// Oct 15). The causes are the filing's own announcement and the speech the
// campaign gave; the clerk is the person the office's records name and the
// crowd is the speech's recorded listeners. A place with no local contest
// that has a clerk, or whose campaign gives no speech to a crowd before the
// election, is redrawn a bounded number of times; running out of draws fails.
const FILING_DRAWS = 6;
/** One draw's budget, the case's limit before it redrew. */
const DRAW_MS = 900_000;

/** Files up to three residents in a drawn place and follows them to election day, or says why the place cannot show it. */
function filingAndStops(
  drawn: ReturnType<typeof drawPlace>,
  drawSeed: string,
): { lines: string[]; stops: number } | string {
  setBookkeeping(false);
  const world = buildBenchWorld(drawn.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: drawn.key,
  });
  const { core, director } = world;
  const api = coreAPI(core);
  const where = `${drawn.name} (${drawn.key}), seed ${drawSeed}`;
  const town = [...core.people.values()]
    .filter((p) => p.alive && p.id !== core.playerId)
    .sort((a, b) => a.id.localeCompare(b.id));
  const contest = openContests(api).find(
    (row) =>
      (row.family === "municipalOffice" || row.family === "countyOffice") &&
      filingClerkFor(api, row.id),
  );
  if (!contest) return `${where}: no local contest with a clerk`;
  const clerk = filingClerkFor(api, contest.id)!;
  const filings: FilingRow[] = [];
  for (const person of town) {
    if (filings.length >= 3) break;
    if (person.id === clerk.personId) continue;
    // Only a resident who can file is watched: each one watched is followed
    // to election day, and most of a town cannot run for its offices.
    if (checkEligibility(api, person.id, contest.id, null).some((c) => !c.met))
      continue;
    director.watch(core, person.id);
    const result = fileCandidacy(api, {
      personId: person.id,
      contestId: contest.id,
      platform: [],
    });
    if (["petitioning", "on-ballot"].includes(result.status ?? ""))
      filings.push(result.filing);
  }
  expect(filings.length, `${where}: residents who can file`).toBeGreaterThan(0);
  advanceCore(core, addDays(makeIsoDate(core.date), 2));
  const lines: string[] = [];
  for (const filing of filings) {
    const book = director.ledger.people.get(filing.personId)!;
    const entry = book.schedule.find((row) =>
      row.momentId.includes(`candidate-filed:${filing.id}`),
    );
    const scene = entry?.bindings.find((row) => row.typeKey === "filing");
    expect(scene, `${where}: ${filing.id} has no filing scene`).toBeTruthy();
    expect(
      scene!.roles.find((row) => row.role === "candidate")!.personIds,
    ).toEqual([filing.personId]);
    // The clerk is the office's recorded clerk, never an invented one.
    expect(scene!.roles.find((row) => row.role === "clerk")!.personIds).toEqual(
      [clerk.personId],
    );
    lines.push(
      `${filing.personId} filed ${filing.id}; clerk ${clerk.personId} (${clerk.basis} ${clerk.recordId}); scene ${entry!.momentId}`,
    );
  }
  // The campaign runs to election day; each speech to a crowd is a stop.
  advanceCore(core, addDays(makeIsoDate(contest.electionDate), -1));
  let stops = 0;
  const speechIds = (
    api.moduleState(SPEECH_MODULE_ID).table("retellings").rows() as unknown as {
      speechId: string;
    }[]
  )
    .map((row) => row.speechId)
    .filter((id, index, all) => all.indexOf(id) === index);
  for (const filing of filings) {
    const book = director.ledger.people.get(filing.personId)!;
    for (const entry of book.schedule) {
      const scene = entry.bindings.find(
        (row) => row.typeKey === "campaign-stop",
      );
      if (!scene) continue;
      const speechId = speechIds.find((id) => entry.momentId.includes(id));
      expect(
        speechId,
        `${where}: ${entry.momentId} cites no recorded speech`,
      ).toBeTruthy();
      const heard = new Set(
        retellingsOf(api, speechId!).map((row) => row.listenerId),
      );
      expect(
        scene.roles.find((row) => row.role === "candidate")!.personIds,
      ).toEqual([filing.personId]);
      for (const id of scene.roles.find((row) => row.role === "voters")!
        .personIds)
        expect(
          heard.has(id),
          `${where}: ${id} was not in the crowd of ${speechId}`,
        ).toBe(true);
      stops += 1;
      lines.push(`${filing.personId} campaign stop ${entry.momentId}`);
    }
  }
  if (!stops)
    return `${where}: ${filings.length} filed, no campaign stop before ${contest.electionDate}`;
  return { lines, stops };
}

it(
  `filing is a scene with the office's clerk and a campaign speech is a stop with its listeners (base ${seed})`,
  () => {
    const tried: string[] = [];
    for (let draw = 0; draw < FILING_DRAWS; draw += 1) {
      const drawSeed = draw ? `${seed}:${draw}` : seed;
      const drawn = draw ? drawPlace(drawSeed, "electoral-scenes") : place;
      const shown = filingAndStops(drawn, drawSeed);
      if (typeof shown === "string") {
        tried.push(shown);
        continue;
      }
      process.stdout.write(
        `FILING ${drawn.name} (${drawn.key}) ${drawSeed} stops ${shown.stops}${tried.length ? ` after ${tried.join("; ")}` : ""}\n${shown.lines.join("\n")}\n`,
      );
      expect(shown.stops).toBeGreaterThan(0);
      return;
    }
    throw new Error(
      `no drawn place in ${FILING_DRAWS} draws showed a filing and a campaign stop: ${tried.join("; ")}`,
    );
  },
  FILING_DRAWS * DRAW_MS,
);
