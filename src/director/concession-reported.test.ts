import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { wordPrintedStory } from "../bench/archive-words";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gatherSignatures } from "../core2/campaign-petition-kit";
import { gameStartDate } from "../core2/game-start";
import type { EntityId } from "../core2/kernel/brands";
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
import { NEWS_MODULE_ID } from "../core2/modules/news";
import { resultOf } from "../core2/modules/voting";
import { coreAPI } from "../core2/state";
import type { PersonId } from "../core2/types";
import { purposeScene, replyInScene } from "./purpose-scene";
import type { TreeNode } from "./scene-talk";

// The concession call counts (path 6, "a real concession"): a candidate who
// lost and conceded on the call after the count, or would not concede that
// night, is put on the public record by the press, and the paper prints it
// naming the winner. Drawn places and a fresh seed; place and seed in every
// message.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const ATTEMPTS = 16;
const YEAR = 365;
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

const run = (
  drawSeed: string,
  move: "agree" | "refuse",
): { done: boolean; note: string } => {
  const place = drawPlace(drawSeed, "concession-reported");
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
  for (let day = 0; !openContests(api).length && day < YEAR; day += 7)
    advanceCore(core, addDays(makeIsoDate(core.date), 7));
  let contest: ContestRow | undefined;
  let filings: FilingRow[] = [];
  for (const race of [...openContests(api)]
    .filter((row) => addDays(makeIsoDate(row.electionDate), 2) <= end)
    .sort((a, b) => a.id.localeCompare(b.id))) {
    const clerkId = filingClerkFor(api, race.id)?.personId;
    const town = [...core.people.values()]
      .filter(
        (p) =>
          p.alive &&
          p.placeId === townId &&
          p.id !== core.playerId &&
          p.id !== clerkId &&
          p.birthDate < "2000-01-01",
      )
      .sort((a, b) => a.id.localeCompare(b.id))
      .slice(0, 40);
    filings = [];
    for (const person of town) {
      if (filings.length >= 3) break;
      director.watch(core, person.id);
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
  if (!contest) return { done: false, note: `${where}: fewer than two filers` };
  gatherSignatures(core, ...filings.map((f) => f.id));
  // The call is played the night the count comes in, as in play.
  advanceCore(core, makeIsoDate(contest.electionDate));
  for (let day = 0; day < 3 && !resultOf(api, contest.id); day += 1)
    advanceCore(core, addDays(makeIsoDate(core.date), 1));
  const result = resultOf(api, contest.id);
  if (!result?.winnerId) return { done: false, note: `${where}: no winner` };
  const causeId = `election-result:${contest.id}`;
  // The runner-up on the count: the one the race's story names.
  const totals = JSON.parse(
    String(core.durableLog.get(causeId as EntityId)?.facts?.totals ?? "{}"),
  ) as Record<string, number>;
  const loser = Object.entries(totals)
    .filter(([id]) => id !== result.winnerId && core.people.has(id))
    .sort((x, y) => y[1] - x[1])[0]?.[0] as PersonId | undefined;
  if (!loser || !filings.some((f) => f.personId === loser))
    return { done: false, note: `${where}: the runner-up is not a filer here` };
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

  // Conceded: the winner takes the call, speaking first, gracious or
  // gloating as their traits lean; a sharp answer back strains the tie.
  let call = "";
  if (move === "agree") {
    advanceCore(core, addDays(makeIsoDate(core.date), 1));
    const taken = director.ledger.people
      .get(loser)
      ?.schedule.find(
        (row) =>
          row.momentId.includes(id) &&
          row.bindings.some(
            (binding) => binding.typeKey === "concession-taken",
          ),
      );
    expect(taken, `${here}: the winner's call was not staged`).toBeTruthy();
    const heard = purposeScene(core, director, loser, taken!, {
      typeKey: "concession-taken",
    });
    expect(heard?.kind, here).toBe("composed");
    if (heard?.kind !== "composed") return { done: false, note: here };
    expect(heard.scene.askerId, here).toBe(result.winnerId);
    const sharp = pathTo(heard.scene.talk.tree, "warn", ["refuse", "accept"]);
    expect(sharp, `${here}: no sharp answer`).toBeTruthy();
    const said = replyInScene(core, director, loser, taken!, sharp!, {
      typeKey: "concession-taken",
    });
    const kept = core.durableLog.get(said as EntityId)?.facts;
    expect(kept?.keeps, `${here}: ${said}`).toBe("relationship-strained");
    const winner = core.people.get(result.winnerId as PersonId)!;
    const lean = Object.entries(winner.traits ?? {})
      .filter(([trait]) => /cocky|smug|polite|calm/.test(trait))
      .map(([trait, value]) => `${trait.split(":")[1]} ${value}`)
      .join(", ");
    call = ` | the winner's call (${lean}): "${heard.scene.talk.state.text}" / you: "${core.durableLog.get(said as EntityId)?.facts?.line}" (${said})`;
  }

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
  if (!story) return { done: false, note: `${here}: the race was not printed` };
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
    note: `${here} (${move}): ${id}, printed in ${story.id}: ${words!.headline} / ${told}${call}`,
  };
};

it(`a concession, and a refusal, on the call after the count are told in the race's story in the paper (seed ${seed})`, () => {
  const skipped: string[] = [];
  const shown: string[] = [];
  for (const move of ["agree", "refuse"] as const) {
    let done = false;
    for (let attempt = 0; attempt < ATTEMPTS && !done; attempt += 1) {
      const out = run(`${seed}:${move}:${attempt}`, move);
      if (out.done) shown.push(out.note);
      else {
        skipped.push(out.note);
        process.stdout.write(`not shown: ${out.note}\n`);
      }
      done = out.done;
    }
    if (!done)
      throw new Error(`no drawn place told a ${move}: ${skipped.join("; ")}`);
  }
  process.stdout.write(`${shown.join("\n")}\n`);
}, 3_600_000);
