import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gatherSignatures } from "../core2/campaign-petition-kit";
import { gameStartDate } from "../core2/game-start";
import type { EntityId } from "../core2/kernel/brands";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import {
  ballot,
  checkEligibility,
  ELECTIONS_MODULE_ID,
  fileCandidacy,
  type ContestRow,
  type FilingRow,
} from "../core2/modules/elections";
import { filingClerkFor } from "../core2/modules/filing-clerk";
import {
  advanceToRaceFiling,
  racesToFileBefore,
} from "../core2/gov-test-clock";
import { resultOf } from "../core2/modules/voting";
import { coreAPI } from "../core2/state";
import type { PersonId } from "../core2/types";
import { purposeScene } from "./purpose-scene";

// The night you win plays (words-victory-night-worded): the winner's
// race-won scene is composed from the count, with the runner-up as the
// opponent the room asks about. Before, the opponent was read only from a
// rival the record named, which a result record never does, so the scene
// was skipped ("the ask that states victory-night cannot be worded").
// Drawn places and a fresh seed; place and seed in every message.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
// A place with no race in the year costs only its build, so more are drawn.
const ATTEMPTS = 40;
const YEAR = 365;

const run = (drawSeed: string): { done: boolean; note: string } => {
  const place = drawPlace(drawSeed, "victory-night");
  const where = `${place.name} (${place.key}), seed ${drawSeed}`;
  setBookkeeping(false);
  const { core, director } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const api = coreAPI(core);
  const end = addDays(makeIsoDate(core.date), YEAR);
  // Residents of the town file: a filing refuses a resident of another place.
  const townId = core.people.get(core.playerId!)?.placeId;
  // The races on the calendar the world was built with, read before any day
  // is played: a place with none counted within the year is passed over at
  // once. Each race is tried the day its filing opens, soonest first. Only
  // residents who may run and are not already running file.
  // The town's own races first (a resident's first race is a local one;
  // a statewide race is won by an official the place holds only as results).
  const local = (race: ContestRow) =>
    ["city", "township", "county", "school"].includes(race.level);
  const races = racesToFileBefore(core, end).sort(
    (a, b) => Number(local(b)) - Number(local(a)),
  );
  if (!races.length)
    return {
      done: false,
      note: `${where}: no race on the calendar counted by ${end}`,
    };
  let contest: ContestRow | undefined;
  let filings: FilingRow[] = [];
  const running = (personId: string) =>
    (
      api
        .moduleState(ELECTIONS_MODULE_ID)
        .table("filings")
        .query("byPerson", [personId]) as unknown as FilingRow[]
    ).some((row) => ["petitioning", "on-ballot"].includes(row.status));
  for (const race of races) {
    if (contest) break;
    if (race.filingDeadline < core.date) continue;
    advanceToRaceFiling(core, race);
    const clerkId = filingClerkFor(api, race.id)?.personId;
    const town = [...core.people.values()]
      .filter(
        (p) =>
          p.alive &&
          p.placeId === townId &&
          p.id !== core.playerId &&
          p.id !== clerkId &&
          !running(p.id) &&
          !checkEligibility(api, p.id, race.id, null).some((c) => !c.met),
      )
      .sort((a, b) => a.id.localeCompare(b.id))
      .slice(0, 40);
    filings = [];
    for (const person of town) {
      if (filings.length >= 3) break;
      director.watch(core, person.id);
      // The log keeps a private record only for the people in focus.
      core.focusPersonIds.add(person.id);
      const result = fileCandidacy(api, {
        personId: person.id,
        contestId: race.id,
        platform: [],
      });
      if (["petitioning", "on-ballot"].includes(result.status ?? ""))
        filings.push(result.filing);
    }
    if (filings.length >= 2) {
      contest = race;
      break;
    }
  }
  if (!contest)
    return { done: false, note: `${where}: no race took two filers` };
  gatherSignatures(core, ...filings.map((f) => f.id));
  // Everyone else running for the seat is followed too: whoever wins the
  // count, a resident who filed on their own among them, has their night.
  advanceCore(core, addDays(makeIsoDate(contest.electionDate), -1));
  // A filer short of signatures at the deadline is off the ballot; with
  // fewer than two on it there is no count to lose (Hillsview, South
  // Dakota, seed de4ef0f8ff6efdfb:agree:13).
  const onBallot = ballot(api, contest.id).length;
  if (onBallot < 2)
    return {
      done: false,
      note: `${where}: ${contest.id} has ${onBallot} on the ballot on the eve (the filers fell short of signatures)`,
    };
  for (const row of ballot(api, contest.id)) {
    director.watch(core, row.personId as PersonId);
    core.focusPersonIds.add(row.personId as PersonId);
  }
  // The call is played the night the count comes in, as in play.
  advanceCore(core, makeIsoDate(contest.electionDate));
  for (let day = 0; day < 3 && !resultOf(api, contest.id); day += 1)
    advanceCore(core, addDays(makeIsoDate(core.date), 1));
  const result = resultOf(api, contest.id);
  if (!result?.winnerId) return { done: false, note: `${where}: no winner` };
  const causeId = `election-result:${contest.id}`;
  // The runner-up on the count: the one the race's story names, the first
  // of those who missed the cut (in an at-large race the other winners were
  // seated too).
  const facts = core.durableLog.get(causeId as EntityId)?.facts;
  const totals = JSON.parse(String(facts?.totals ?? "{}")) as Record<
    string,
    number
  >;
  const outIds = JSON.parse(String(facts?.outIds ?? "[]")) as string[];
  const loser = Object.entries(totals)
    .filter(([id]) => outIds.includes(id) && core.people.has(id))
    .sort((x, y) => y[1] - x[1])[0]?.[0] as PersonId | undefined;
  if (!loser) return { done: false, note: `${where}: no runner-up` };
  const winner = result.winnerId as PersonId;
  // A sitting official the place holds only as results (a statewide office's
  // holder, Abrams, Wisconsin, seed c06b4e8f1a925d7e:3) filed nothing here
  // and has no campaign or room to stage a night in: passed over by name.
  const winnerFiled = (
    api
      .moduleState(ELECTIONS_MODULE_ID)
      .table("filings")
      .query("byPerson", [winner]) as unknown as FilingRow[]
  ).some((row) => row.contestId === contest.id);
  if (!core.people.has(winner) || !winnerFiled)
    return {
      done: false,
      note: `${where}: ${contest.id} was won by ${winner}, who filed no candidacy here`,
    };
  const here = `${where}: ${winner}`;
  const entry = director.ledger.people
    .get(winner)
    ?.schedule.find(
      (row) =>
        row.momentId.includes(causeId) &&
        row.bindings.some((binding) => binding.typeKey === "race-won"),
    );
  if (!entry) return { done: false, note: `${here}: no victory night` };
  const scene = purposeScene(core, director, winner, entry, {
    typeKey: "race-won",
  });
  // The night of a win is worded from the count: the runner-up is the
  // opponent the room asks about.
  expect(scene?.kind, `${here}: ${JSON.stringify(scene)}`).toBe("composed");
  if (scene?.kind !== "composed") return { done: false, note: here };
  const opponent = scene.scene.facts.find((row) => row.key === "opponent");
  expect(opponent?.recordIds, here).toContain(loser);
  process.stdout.write(
    `VICTORY ${here}: "${scene.scene.talk.state.text}" (opponent ${loser})\n`,
  );
  return { done: true, note: here };
};

it(`the winner's victory night is worded from the count (seed ${seed})`, () => {
  const notes: string[] = [];
  for (let attempt = 0; attempt < ATTEMPTS; attempt += 1) {
    const { done, note } = run(`${seed}:${attempt}`);
    if (done) return;
    notes.push(note);
  }
  throw new Error(`No drawn place staged a victory night: ${notes.join("; ")}`);
}, 3_600_000);
