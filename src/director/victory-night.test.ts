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
  fileCandidacy,
  openContests,
  type ContestRow,
  type FilingRow,
} from "../core2/modules/elections";
import { filingClerkFor } from "../core2/modules/filing-clerk";
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
const ATTEMPTS = 16;
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
  const winner = result.winnerId as PersonId;
  if (!filings.some((f) => f.personId === winner))
    return { done: false, note: `${where}: the winner is not a filer here` };
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
