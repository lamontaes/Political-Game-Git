import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
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
import { advanceToRaceFiling } from "../core2/gov-test-clock";
import { resultOf } from "../core2/modules/voting";
import { coreAPI } from "../core2/state";
import type { PersonId } from "../core2/types";
import { purposeScene } from "./purpose-scene";

// The night you win plays (words-victory-night-worded): the winner's
// race-won scene is composed from the count, with the runner-up as the
// opponent the room asks about. Before, the opponent was read only from a
// rival the record named, which a result record never does, so the scene
// was skipped ("the ask that states victory-night cannot be worded").
// One pinned place and race (see Pin); place and seed in every message.

/**
 * A place and race pinned from data (the calendar the world is built with,
 * read without playing a day: a small town with a local race early in the
 * year), so a failure can only mean the code failed.
 */
interface Pin {
  readonly name: string;
  readonly key: string;
  readonly worldSeed: string;
  readonly contestId: string;
}

const run = (pin: Pin): { done: boolean; note: string } => {
  const where = `${pin.name} (${pin.key}), world seed ${pin.worldSeed}`;
  setBookkeeping(false);
  const { core, director } = buildBenchWorld(pin.worldSeed, gameStartDate(), {
    twoLevel: true,
    placeKey: pin.key,
  });
  const api = coreAPI(core);
  // Residents of the town file: a filing refuses a resident of another place.
  const townId = core.people.get(core.playerId!)?.placeId;
  const contest = api
    .moduleState(ELECTIONS_MODULE_ID)
    .table("contests")
    .get(pin.contestId) as unknown as ContestRow | undefined;
  if (!contest)
    return {
      done: false,
      note: `${where}: no ${pin.contestId} on the calendar`,
    };
  const running = (personId: string) =>
    (
      api
        .moduleState(ELECTIONS_MODULE_ID)
        .table("filings")
        .query("byPerson", [personId]) as unknown as FilingRow[]
    ).some((row) => ["petitioning", "on-ballot"].includes(row.status));
  advanceToRaceFiling(core, contest);
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
    if (filings.length >= 3) break;
    director.watch(core, person.id);
    // The log keeps a private record only for the people in focus.
    core.focusPersonIds.add(person.id);
    const result = fileCandidacy(api, {
      personId: person.id,
      contestId: contest.id,
      platform: [],
    });
    if (["petitioning", "on-ballot"].includes(result.status ?? ""))
      filings.push(result.filing);
  }
  if (filings.length < 2)
    return {
      done: false,
      note: `${where}: ${contest.id} took ${filings.length} filers`,
    };
  gatherSignatures(core, ...filings.map((f) => f.id));
  // Everyone else running for the seat is followed too: whoever wins the
  // count, a resident who filed on their own among them, has their night.
  advanceCore(core, addDays(makeIsoDate(contest.electionDate), -1));
  // Two or more on the ballot on the eve: a filer short of signatures at
  // the deadline is off it.
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
  // The winner is one who filed for the race, a full person with a
  // campaign to stage a night in.
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

const NORTH_WESTMINSTER: Pin = {
  name: "North Westminster, Vermont",
  key: "5052375",
  worldSeed: "18d0fb93fe003b8a20a3e4ce1848cd57da4a5e825a8dd4eab5c799ee23806b39",
  contestId: "contest:seat:gus2025:211883:board:0:2025-03-04",
};

it(`${NORTH_WESTMINSTER.name}: the winner's victory night is worded from the count`, () => {
  const out = run(NORTH_WESTMINSTER);
  expect(out.done, out.note).toBe(true);
}, 600_000);
