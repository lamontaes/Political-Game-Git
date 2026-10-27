import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import {
  fileCandidacy,
  openContests,
  type ContestRow,
  type FilingRow,
} from "../core2/modules/elections";
import { filingClerkFor } from "../core2/modules/filing-clerk";
import { resultOf } from "../core2/modules/voting";
import { coreAPI } from "../core2/state";
import type { PersonId } from "../core2/types";
import { purposeScene, replyInScene } from "./purpose-scene";

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
    .filter((p) => p.alive && p.id !== core.playerId)
    .sort((a, b) => a.id.localeCompare(b.id));
  const open = () =>
    [...openContests(api)]
      .filter((race) => addDays(makeIsoDate(race.electionDate), 2) <= end)
      .sort(
        (a, b) =>
          a.electionDate.localeCompare(b.electionDate) ||
          a.id.localeCompare(b.id),
      );
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
      if (result.status === "on-ballot") filings.push(result.filing);
    }
    if (filings.length > 1) {
      contest = race;
      break;
    }
    filings.length = 0;
  }
  if (!contest) return `${where}: no race took two filers`;
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
  if (!filings.some((f) => f.personId === winner))
    return `${where}: the winner is not a watched filer`;

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
  // The lead is the count's own difference, citing the record.
  const lead = scene.facts.find((row) => row.key === "lead");
  expect(lead?.text, where).toMatch(/^\d+ votes?$/);
  expect(lead?.recordIds, where).toContain(causeId);
  expect(Number.parseInt(lead!.text, 10), where).toBe(
    ranked[0]![1] - ranked[1]![1],
  );
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
  const id = replyInScene(core, director, winner, entry!, [0], {});
  expect(id, where).toMatch(/^scene-reply:/);
  const written = core.durableLog.get(id!);
  expect(written?.facts?.typeKey, where).toBe("concession-received");
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

  console.log(
    `CONCESSION RECEIVED ${where}: ${causeId}\n  narrate: ${scene.talk.root.lines.map((l) => l.text).join(" / ")}\n  state: ${scene.talk.state.text}\n  replies: ${replies.map((r) => `"${r.line.text}"`).join(" ")}`,
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
