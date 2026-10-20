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
  fileCandidacy,
  openContests,
  type ContestRow,
  type FilingRow,
} from "../core2/modules/elections";
import { filingClerkFor } from "../core2/modules/filing-clerk";
import { retellingsOf, SPEECH_MODULE_ID } from "../core2/modules/speech";
import { askToVolunteer, campaignFor } from "../core2/modules/campaigns";
import { resultOf } from "../core2/modules/voting";
import { composeScene } from "./scene";
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
  const asked = new Map<string, string[]>();
  for (const filing of filings) {
    const person = core.people.get(filing.personId)!;
    const around = [...person.familyIds, ...person.knownIds]
      .filter((id) => id !== filing.personId && core.people.get(id)?.alive)
      .sort()
      .slice(0, 40);
    for (const id of around) askToVolunteer(api, filing.id, id);
    asked.set(filing.id, [...campaignFor(api, filing.id).volunteerIds]);
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
    const types = entry!.bindings.map((row) => row.typeKey);
    const won = result.winnerId === filing.personId;
    expect(types).toContain(won ? "race-won" : "race-lost");
    expect(types).not.toContain(won ? "race-lost" : "race-won");
    const scene = entry!.bindings.find(
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
    // The campaign's own volunteers are the supporters, from its record.
    expect(supporters).toEqual(
      (asked.get(filing.id) ?? []).filter(
        (id) => core.people.get(id)?.alive && id !== filing.personId,
      ),
    );
    // The night's words: a victory for the winner and a concession for the
    // loser, citing the result record the scene rests on.
    const staged = composeScene(core, director, filing.personId, entry);
    expect(
      staged?.speech,
      `${filing.personId} ${won ? "won" : "lost"} ${filing.contestId}: no words`,
    ).toBeDefined();
    expect(staged!.speech!.speakerId).toBe(filing.personId);
    expect(staged!.speech!.text.length).toBeGreaterThan(3);
    expect(staged!.speech!.sourceRecordIds).toContain(
      `election-result:${filing.contestId}`,
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
// crowd is the speech's recorded listeners.
it(`filing is a scene with the office's clerk and a campaign speech is a stop with its listeners, in ${place.name}, seed ${seed}`, () => {
  setBookkeeping(false);
  const world = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const { core, director } = world;
  const api = coreAPI(core);
  const town = [...core.people.values()]
    .filter((p) => p.alive && p.id !== core.playerId)
    .sort((a, b) => a.id.localeCompare(b.id));
  const contest = openContests(api).find(
    (row) =>
      (row.family === "municipalOffice" || row.family === "countyOffice") &&
      filingClerkFor(api, row.id),
  );
  if (!contest) {
    console.log(`NO CLERK CONTEST ${place.name} ${seed}`);
    return;
  }
  const clerk = filingClerkFor(api, contest.id)!;
  const filings: FilingRow[] = [];
  for (const person of town) {
    if (filings.length >= 3) break;
    if (person.id === clerk.personId) continue;
    director.watch(core, person.id);
    const result = fileCandidacy(api, {
      personId: person.id,
      contestId: contest.id,
      platform: [],
    });
    if (result.status === "on-ballot") filings.push(result.filing);
  }
  expect(filings.length, "residents who can file").toBeGreaterThan(0);
  advanceCore(core, addDays(makeIsoDate(core.date), 2));
  const lines: string[] = [];
  for (const filing of filings) {
    const book = director.ledger.people.get(filing.personId)!;
    const entry = book.schedule.find((row) =>
      row.momentId.includes(`candidate-filed:${filing.id}`),
    );
    const scene = entry?.bindings.find((row) => row.typeKey === "filing");
    expect(scene, `${filing.id} has no filing scene`).toBeTruthy();
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
        `${entry.momentId} cites no recorded speech`,
      ).toBeTruthy();
      const heard = new Set(
        retellingsOf(api, speechId!).map((row) => row.listenerId),
      );
      expect(
        scene.roles.find((row) => row.role === "candidate")!.personIds,
      ).toEqual([filing.personId]);
      for (const id of scene.roles.find((row) => row.role === "voters")!
        .personIds)
        expect(heard.has(id), `${id} was not in the crowd of ${speechId}`).toBe(
          true,
        );
      stops += 1;
      lines.push(`${filing.personId} campaign stop ${entry.momentId}`);
    }
  }
  console.log(
    `FILING ${place.name} ${seed} stops ${stops}\n${lines.join("\n")}`,
  );
  expect(stops, "a campaign stop for a speaking candidate").toBeGreaterThan(0);
}, 900_000);
