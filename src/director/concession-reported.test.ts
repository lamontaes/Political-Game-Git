import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { wordPrintedStory } from "../bench/archive-words";
import { setBookkeeping } from "../core2/bookkeeping";
import { gatherSignatures } from "../core2/campaign-petition-kit";
import { gameStartDate } from "../core2/game-start";
import type { EntityId } from "../core2/kernel/brands";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import {
  ballot,
  ELECTIONS_MODULE_ID,
  fileCandidacy,
  type ContestRow,
  type FilingRow,
} from "../core2/modules/elections";
import { filingClerkFor } from "../core2/modules/filing-clerk";
import { advanceToRaceFiling } from "../core2/gov-test-clock";
import { NEWS_MODULE_ID } from "../core2/modules/news";
import { resultOf } from "../core2/modules/voting";
import { coreAPI } from "../core2/state";
import type { PersonId } from "../core2/types";
import { purposeScene, replyInScene } from "./purpose-scene";
import type { TreeNode } from "./scene-talk";

// The concession call counts (path 6, "a real concession"): a candidate who
// lost and conceded on the call after the count, or would not concede that
// night, is put on the public record by the press, and the paper prints it
// naming the winner. One pinned place and race (see Pin); place and seed in
// every message.
const PAPER_DAYS = 10;

/** The reply path that keeps choosing `move` until the talk ends. */
function pathTo(
  tree: TreeNode,
  move: string,
  then: readonly string[] = [],
): number[] | null {
  const path: number[] = [];
  let node: TreeNode | null = tree;
  for (let depth = 0; node && depth < 6; depth += 1) {
    const want = depth === 0 ? move : (then[depth - 1] ?? move);
    const at = node.replies.findIndex((row) => row.line.move === want);
    if (at < 0) return null;
    path.push(at);
    const next: TreeNode | null = node.replies[at]!.next;
    if (!next || next.end) return path;
    node = next;
  }
  return null;
}

/**
 * A place and race pinned from data (the calendar the world is built with,
 * read without playing a day: a small town with a newspaper and a local race
 * early in the year), so a failure can only mean the code failed. Found by
 * building drawn places and reading their contests and outlets.
 */
interface Pin {
  readonly name: string;
  readonly key: string;
  readonly worldSeed: string;
  readonly contestId: string;
}

const run = (
  pin: Pin,
  move: "agree" | "refuse",
): { done: boolean; note: string } => {
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
        p.birthDate < "2000-01-01",
    )
    .sort((a, b) => a.id.localeCompare(b.id))
    .slice(0, 40)) {
    if (filings.length >= 3) break;
    director.watch(core, person.id);
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
  // Two or more on the ballot on the eve: a filer short of signatures at
  // the deadline is off it.
  advanceCore(core, addDays(makeIsoDate(contest.electionDate), -1));
  const onBallot = ballot(api, contest.id).length;
  if (onBallot < 2)
    return {
      done: false,
      note: `${where}: ${contest.id} has ${onBallot} on the ballot on the eve (the filers fell short of signatures)`,
    };
  // Everyone else running is followed too, as victory-night does: whoever
  // misses the cut, a resident who filed on their own among them, gets the
  // call.
  for (const row of ballot(api, contest.id)) {
    director.watch(core, row.personId as PersonId);
    core.focusPersonIds.add(row.personId as PersonId);
  }
  // The call is played the night the count comes in, as in play.
  advanceCore(core, makeIsoDate(contest.electionDate));
  for (let day = 0; day < 3 && !resultOf(api, contest.id); day += 1)
    advanceCore(core, addDays(makeIsoDate(core.date), 1));
  const result = resultOf(api, contest.id);
  // A count with no winner is a tie the place's law sends to a second
  // election, or nobody on the ballot (named so a reader can tell which).
  if (!result?.winnerId)
    return {
      done: false,
      note: `${where}: ${contest.id} named no winner (totals ${JSON.stringify(result?.totals ?? null)}, tie ${JSON.stringify(coreAPI(core).moduleState(ELECTIONS_MODULE_ID).table("ties").get(`tie:${contest.id}`) ?? null)})`,
    };
  const causeId = `election-result:${contest.id}`;
  // The runner-up on the count: the one the race's story names, the first
  // of those who missed the cut (in an at-large race the other winners were
  // seated too and concede nothing).
  const facts = core.durableLog.get(causeId as EntityId)?.facts;
  const totals = JSON.parse(String(facts?.totals ?? "{}")) as Record<
    string,
    number
  >;
  const outIds = JSON.parse(String(facts?.outIds ?? "[]")) as string[];
  const loser = Object.entries(totals)
    .filter(([id]) => outIds.includes(id) && core.people.has(id))
    .sort((x, y) => y[1] - x[1])[0]?.[0] as PersonId | undefined;
  if (!loser)
    return { done: false, note: `${where}: no runner-up is a full person` };
  const here = `${where}: ${loser}`;
  const entry = director.ledger.people
    .get(loser)
    ?.schedule.find(
      (row) =>
        row.momentId.includes(causeId) &&
        row.bindings.some((binding) => binding.typeKey === "race-lost"),
    );
  if (!entry) return { done: false, note: `${here}: no concession call` };
  const scene = purposeScene(core, director, loser, entry, {
    typeKey: "race-lost",
  });
  expect(scene?.kind, here).toBe("composed");
  if (scene?.kind !== "composed") return { done: false, note: here };
  const path = pathTo(scene.scene.talk.tree, move);
  if (!path) return { done: false, note: `${here}: no ${move} path` };
  core.playerId = loser;
  const replyId = replyInScene(core, director, loser, entry, path, {
    typeKey: "race-lost",
  });
  const conceded = core.durableLog.get(replyId as EntityId)?.facts?.conceded;
  if (!conceded)
    return { done: false, note: `${here}: the ${move} path ended elsewhere` };
  expect(conceded, `${here}: ${move}`).toBe(move === "agree" ? "yes" : "no");
  const id = `concession:${contest.id}:${loser}:${conceded}`;
  const record = core.durableLog.get(id as EntityId);
  expect(record, `${here}: the press kept no concession`).toBeTruthy();
  expect(record!.personIds, here).toEqual([loser, result.winnerId]);

  // The race's story in the paper, read within days, says it of the
  // runner-up by name, on the concession's record.
  advanceCore(core, addDays(makeIsoDate(core.date), PAPER_DAYS));
  const story = (
    coreAPI(core)
      .moduleState(NEWS_MODULE_ID)
      .table("stories")
      .rows() as unknown as {
      id: string;
      kind: string;
      date: string;
      facts: Record<string, string>;
    }[]
  ).find(
    (s) => s.kind === "press.printed" && s.facts.sourceRecordId === causeId,
  );
  if (!story)
    return {
      done: false,
      note: `${here}: the race was not printed (stories in the window ${
        (
          coreAPI(core)
            .moduleState(NEWS_MODULE_ID)
            .table("stories")
            .rows() as unknown as { kind: string; date: string }[]
        ).filter(
          (s) => s.kind === "press.printed" && s.date >= contest!.electionDate,
        ).length
      })`,
    };
  const words = wordPrintedStory(core, story);
  expect(words, `${here}: ${story.id}`).toBeTruthy();
  const person = core.people.get(loser)!;
  const told = (words!.paragraphs ?? [words!.lede]).join(" ");
  const said = told
    .split(/(?<=\.) /)
    .find(
      (line) =>
        line.startsWith(`${person.givenName} ${person.familyName}`) &&
        /conce/.test(line),
    );
  expect(said, `${here}: ${story.id}: ${told}`).toBeTruthy();
  expect(said!, here).toMatch(
    move === "agree"
      ? /called (?:\S+ \S+ )?to concede/
      : /not called to concede|would not concede/,
  );
  expect(words!.sourceRecordIds, here).toContain(id);
  return {
    done: true,
    note: `${here} (${move}): ${id}, printed in ${story.id}: ${words!.headline} / ${told}`,
  };
};

const NORTH_WESTMINSTER: Pin = {
  name: "North Westminster, Vermont",
  key: "5052375",
  worldSeed: "18d0fb93fe003b8a20a3e4ce1848cd57da4a5e825a8dd4eab5c799ee23806b39",
  contestId: "contest:seat:gus2025:211883:board:0:2025-03-04",
};

for (const move of ["agree", "refuse"] as const)
  it(`${NORTH_WESTMINSTER.name}: a ${move} on the call after the count is told in the race's story in the paper`, () => {
    const out = run(NORTH_WESTMINSTER, move);
    process.stdout.write(`${out.done ? "shown" : "not shown"}: ${out.note}\n`);
    expect(out.done, out.note).toBe(true);
  }, 600_000);

// The town's paper never prints its own council race today: the desk weighs
// the race by its few candidates while votes and laws count every follower
// (pool item press-town-race-result-never-printed, which un-skips this as
// its failing-before test).
const SEARSBORO: Pin = {
  name: "Searsboro, Iowa",
  key: "1971355",
  worldSeed: "9230351683af4e111f4a121d1748e40e2722b7892af033ef20e633a06e1fac12",
  contestId: "contest:seat:gus2025:164548:council:0:2025-11-04",
};
it.skip(`press-town-race-result-never-printed: ${SEARSBORO.name}'s council race is printed and tells the concession`, () => {
  const out = run(SEARSBORO, "agree");
  expect(out.done, out.note).toBe(true);
}, 600_000);
