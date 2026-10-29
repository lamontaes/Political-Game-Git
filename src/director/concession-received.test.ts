import { randomBytes } from "node:crypto";
import { writeFileSync } from "node:fs";
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
import { resultOf } from "../core2/modules/voting";
import { coreAPI } from "../core2/state";
import type { PersonId } from "../core2/types";
import { storyReply, storyScene } from "../bench/story";
import { purposeScene, replyInScene } from "./purpose-scene";
import type { TreeNode } from "./scene-talk";

// The call after the count, from the winner's side (episode
// docs/design/scenes/from-life/concession-call-received.md). In the played
// world, on a fresh seed and places drawn from all 56, residents file for a
// race counted within the year. The count's result record names the winner and
// the totals: it fires the winner's phone scene with the runner-up on those
// totals as the caller, worded by the English engine, and the runner-up's own
// count (a loss) fires no such scene. The winner's reply is a recorded scene
// reply and reaches the pair's tie.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const ATTEMPTS = 32;
const YEAR = 365;

const run = (drawSeed: string): string | null => {
  const place = drawPlace(drawSeed, "concession-received");
  const where = `${place.name} (${place.key}), seed ${drawSeed}`;
  setBookkeeping(false);
  const world = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const { core, director } = world;
  const api = coreAPI(core);
  const end = addDays(makeIsoDate(core.date), YEAR);
  const town = [...core.people.values()]
    .filter(
      (p) =>
        p.alive &&
        p.id !== core.playerId &&
        (core.households.get(p.householdId)?.memberIds ?? []).some(
          (id) => id !== p.id && core.people.get(id)?.alive,
        ),
    )
    .sort((a, b) => a.id.localeCompare(b.id));
  const open = () =>
    [...openContests(api)]
      .filter((race) => addDays(makeIsoDate(race.electionDate), 2) <= end)
      .sort(
        (a, b) =>
          a.electionDate.localeCompare(b.electionDate) ||
          a.id.localeCompare(b.id),
      );
  // Many places elect their seats only in even years: a place with no race
  // counted within the year is passed over the day it is built.
  const contests = api
    .moduleState(ELECTIONS_MODULE_ID)
    .table("contests")
    .rows() as unknown as ContestRow[];
  if (
    !contests.some(
      (race) =>
        race.filingDeadline >= core.date &&
        addDays(makeIsoDate(race.electionDate), 2) <= end,
    )
  )
    return `${where}: no race is counted within the year`;
  for (let day = 0; !open().length && day < YEAR; day += 7)
    advanceCore(core, addDays(makeIsoDate(core.date), 7));
  let contest: ContestRow | undefined;
  const filings: FilingRow[] = [];
  for (const race of open()) {
    const clerkId = filingClerkFor(api, race.id)?.personId;
    for (const person of town.filter((p) => p.id !== clerkId).slice(0, 12)) {
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
    if (filings.length > 1) {
      contest = race;
      break;
    }
    filings.length = 0;
  }
  if (!contest) return `${where}: no race took two filers`;
  // Anyone else who filed on their own is watched too, so the winner is
  // someone the director follows, as it follows the player's circle.
  advanceCore(core, addDays(makeIsoDate(contest.electionDate), -1));
  const onBallot = (
    api
      .moduleState(ELECTIONS_MODULE_ID)
      .table("filings")
      .rows() as unknown as FilingRow[]
  ).filter((f) => f.contestId === contest!.id && f.status === "on-ballot");
  // A filer whose petition fell short is not on the ballot; with one name
  // left the winner is unopposed and nobody calls (the race is passed over).
  if (onBallot.length < 2)
    return `${where}: ${contest.id} has ${onBallot.length} on the ballot`;
  for (const f of onBallot) director.watch(core, f.personId as PersonId);
  advanceCore(core, addDays(makeIsoDate(contest.electionDate), 2));
  const result = resultOf(api, contest.id);
  if (!result?.winnerId) return `${where}: ${contest.id} named no winner`;
  const winner = result.winnerId as PersonId;
  const causeId = `election-result:${contest.id}`;
  const record = core.durableLog.get(causeId);
  const totals = JSON.parse(String(record?.facts?.totals)) as Record<
    string,
    number
  >;
  const ranked = Object.entries(totals).sort(
    (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
  );

  const entryOf = (personId: PersonId) =>
    director.ledger.people
      .get(personId)
      ?.schedule.find((row) => row.momentId.includes(causeId));

  // The winner's count binds the call, cast from the totals.
  const entry = entryOf(winner);
  expect(entry, `${where}: the count fired nothing for ${winner}`).toBeTruthy();
  const binding = entry!.bindings.find(
    (row) => row.typeKey === "concession-received",
  );
  expect(binding, `${where}: no concession-received binding`).toBeTruthy();
  const callerId = binding!.roles.find((row) => row.role === "loser")
    ?.personIds[0];
  const runnerUp = ranked.find(([id]) => id !== winner)![0];
  expect(callerId, where).toBe(runnerUp);
  expect(binding!.setting?.kind ?? "phone", where).toBe("phone");

  const composed = purposeScene(core, director, winner, entry!, {
    typeKey: "concession-received",
  });
  expect(composed?.kind, `${where}: ${JSON.stringify(composed)}`).toBe(
    "composed",
  );
  if (composed?.kind !== "composed") return null;
  const { scene } = composed;
  expect(scene.cause.id, where).toBe(causeId);
  expect(scene.askerId, where).toBe(callerId);
  expect(scene.askedId, where).toBe(winner);
  // The lead is the count's own difference, citing the record; the bank's
  // lines say "votes", or "one vote" where the flag says it was one.
  // A tie at the top (decided by lot) leaves nobody ahead, so no lead is
  // said (Nashville, Ohio, run seed 62c54aceac792551: 1 to 1).
  const lead = scene.facts.find((row) => row.key === "lead");
  const margin = ranked[0]![1] - ranked[1]![1];
  if (margin === 0) {
    expect(lead, `${where}: a tie`).toBeUndefined();
    // A tie with a winner was settled by a drawing or by a body's vote (a
    // tie the law sends to a second election names no winner yet), and the
    // tie record says which.
    expect(
      scene.facts.some(
        (row) => row.key === "tied-lot" || row.key === "tied-vote",
      ),
      `${where}: how the tie was settled`,
    ).toBe(true);
  } else {
    expect(lead?.text, where).toMatch(/^[\d,]+$/);
    expect(
      scene.facts.some((row) => row.key === "lead-one"),
      where,
    ).toBe(lead?.text === "1");
    expect(lead?.recordIds, where).toContain(causeId);
    expect(Number.parseInt(lead!.text.replaceAll(",", ""), 10), where).toBe(
      margin,
    );
  }
  // Four replies that are four stances.
  const replies = scene.talk.tree.replies;
  expect(replies.length, where).toBe(4);
  expect(new Set(replies.map((row) => row.line.move)).size, where).toBe(4);
  // Each stance leads somewhere and the scene ends in a named ending.
  for (const reply of replies)
    expect(
      reply.next?.replies.length || reply.next?.lines.length,
      where,
    ).toBeGreaterThan(0);

  // The reply is a record and reaches the pair's tie.
  // The winner is the player here: the core keeps the reasons of the player's
  // own circle, and a reply is a record of what they said to whom.
  core.playerId = winner;

  // In ordinary play through the bench, the count's scenes come in turn: each
  // ends with a reply, and the moment then plays the next one it staged, the
  // victory night before the call, never the same scene twice.
  const played: string[] = [];
  for (;;) {
    const shown = storyScene(core, director, winner, entry!.momentId, 20 * 60);
    const typeKey = shown.talk?.typeKey;
    if (!typeKey || played.includes(typeKey)) break;
    played.push(typeKey);
    const kept = storyReply(core, director, winner, entry!.momentId, [0], {
      typeKey,
    });
    expect(core.durableLog.get(kept.recordId)?.facts?.causeId, where).toBe(
      causeId,
    );
  }
  process.stdout.write(
    `IN TURN ${where}: ${played.join(" then ")}, from ${causeId}\n`,
  );
  expect(played, `${where}: the count's scenes in turn`).toContain(
    "concession-received",
  );
  if (entry!.bindings.some((row) => row.typeKey === "race-won"))
    expect(
      played.indexOf("race-won"),
      `${where}: ${played.join(", ")}`,
    ).toBeLessThan(played.indexOf("concession-received"));
  const id = replyInScene(core, director, winner, entry!, [0], {
    typeKey: "concession-received",
  });
  expect(id, where).toMatch(/^scene-reply:/);
  const written = core.durableLog.get(id!);
  expect(written?.facts?.causeId, where).toBe(causeId);
  expect(written?.facts?.line, where).toBe(replies[0]!.line.text);
  expect(written?.personIds, where).toEqual(
    expect.arrayContaining([winner, callerId]),
  );

  // The trigger absent: the runner-up lost this count, so it fires no call.
  const loserEntry = entryOf(callerId as PersonId);
  expect(
    loserEntry?.bindings.some((row) => row.typeKey === "concession-received") ??
      false,
    `${where}: the loser got the winner's call`,
  ).toBe(false);

  // The bank has a line for every node: the engine lists what it lacks.
  expect(
    scene.talk.gaps,
    `${where}: bank gaps ${JSON.stringify(scene.talk.gaps)}`,
  ).toEqual([]);
  // The exchange reaches more than one named ending.
  expect(
    Object.keys(scene.talk.endingCounts).length,
    `${where}: ${JSON.stringify(scene.talk.endingCounts)}`,
  ).toBeGreaterThan(2);

  // CONCESSION_DUMP=<file> writes every branch of the scene for review.
  if (process.env.CONCESSION_DUMP) {
    const out: string[] = [
      `${where}: ${causeId}`,
      ...scene.talk.narration.map((l) => `NARRATOR: ${l.text}`),
      `OPEN (${scene.talk.open?.speaker}): ${scene.talk.open?.text}`,
      `STATE (${scene.talk.state.speaker}): ${scene.talk.state.text}`,
    ];
    const walk = (node: TreeNode, depth: number) => {
      const pad = "  ".repeat(depth);
      for (const l of node.lines) out.push(`${pad}${l.speaker}: ${l.text}`);
      for (const r of node.replies) {
        out.push(`${pad}> [${r.line.move}] ${r.line.text}`);
        if (r.next) walk(r.next, depth + 1);
      }
      if (node.end)
        out.push(
          `${pad}= ${node.end.ending?.label ?? node.end.outcome} (${node.end.ending?.keeps ?? "none"})${node.end.close ? ` / ${node.end.close.speaker}: ${node.end.close.text}` : ""}`,
        );
    };
    walk(scene.talk.tree, 1);
    writeFileSync(process.env.CONCESSION_DUMP, out.join("\n") + "\n");
  }
  console.log(
    `CONCESSION RECEIVED ${where}: ${causeId}\n  narrate: ${scene.talk.narration.map((l) => l.text).join(" / ")}\n  open: ${scene.talk.open?.text}\n  state: ${scene.talk.state.text}\n  replies: ${replies.map((r) => `"${r.line.text}"`).join(" ")}\n  endings: ${JSON.stringify(scene.talk.endingCounts)}\n  gaps: ${JSON.stringify(scene.talk.gaps)}`,
  );
  return null;
};

it(`a count fires the winner's phone call from the runner-up (seed ${seed})`, () => {
  const skipped: string[] = [];
  for (let attempt = 0; attempt < ATTEMPTS; attempt += 1) {
    const why = run(`${seed}:${attempt}`);
    if (!why) return;
    skipped.push(why);
  }
  throw new Error(`no drawn place showed the call: ${skipped.join("; ")}`);
}, 3_600_000);
