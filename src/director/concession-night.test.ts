import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
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
import { resultOf } from "../core2/modules/voting";
import { coreAPI } from "../core2/state";
import type { PersonId } from "../core2/types";
import { purposeScene, replyInScene } from "./purpose-scene";
import type { TreeNode } from "./scene-talk";

// The night of a race, the loser calls the winner (scenes-from-life; the
// look-first search found the scenes already built: race-lost with the
// concession-call purpose is the loser's side, concession-received the
// winner's, concession-taken the winner answering a conceded call). This
// proves both sides fire together in one played race, in drawn places and a
// fresh seed: a race counted within the year, two or more residents on the
// ballot; the runner-up on the count is cast to call the winner, and the same
// count fires both people's scenes from the same election-result record. Each
// person stands in for the player in turn (the core keeps a reply as the
// player's), and what is written back is printed with its record ids.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const ATTEMPTS = 12;
const YEAR = 365;

/** The reply path that keeps choosing `move` until the talk ends. */
function pathTo(tree: TreeNode, move: string): number[] | null {
  const path: number[] = [];
  let node: TreeNode | null = tree;
  for (let depth = 0; node && depth < 6; depth += 1) {
    const at = node.replies.findIndex((row) => row.line.move === move);
    if (at < 0) return null;
    path.push(at);
    const next: TreeNode | null = node.replies[at]!.next;
    if (!next || next.end) return path;
    node = next;
  }
  return null;
}

it(`the loser's call and the winner's side both fire from one count (seed ${seed})`, () => {
  setBookkeeping(false);
  const tried: string[] = [];
  for (let attempt = 0; attempt < ATTEMPTS; attempt += 1) {
    const place = drawPlace(seed, `concession-night:${attempt}`);
    const where = `${place.name} (${place.key}), seed ${place.seed}`;
    const { core, director } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(core);
    const end = addDays(makeIsoDate(core.date), YEAR);
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
    const townId = core.people.get(core.playerId!)?.placeId;
    let contest: ContestRow | undefined;
    const filings: FilingRow[] = [];
    for (const race of open()) {
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
      if (filings.length > 1) {
        contest = race;
        break;
      }
      filings.length = 0;
    }
    if (!contest) {
      tried.push(`${where}: no race took two filers`);
      continue;
    }
    advanceCore(core, addDays(makeIsoDate(contest.electionDate), -1));
    const onBallot = (
      api
        .moduleState(ELECTIONS_MODULE_ID)
        .table("filings")
        .rows() as unknown as FilingRow[]
    ).filter((f) => f.contestId === contest!.id && f.status === "on-ballot");
    if (onBallot.length < 2) {
      tried.push(`${where}: ${onBallot.length} on the ballot`);
      continue;
    }
    for (const f of onBallot) director.watch(core, f.personId as PersonId);
    advanceCore(core, addDays(makeIsoDate(contest.electionDate), 2));
    const result = resultOf(api, contest.id);
    if (!result?.winnerId) {
      tried.push(`${where}: no winner`);
      continue;
    }
    const winner = result.winnerId as PersonId;
    const causeId = `election-result:${contest.id}`;
    const totals = JSON.parse(
      String(core.durableLog.get(causeId as EntityId)?.facts?.totals ?? "{}"),
    ) as Record<string, number>;
    // The runner-up: the first of those who missed the cut (in an at-large
    // race the other winners were seated too and lost nothing).
    const outIds = JSON.parse(
      String(core.durableLog.get(causeId as EntityId)?.facts?.outIds ?? "[]"),
    ) as string[];
    const loser = Object.entries(totals)
      .filter(([id]) => outIds.includes(id) && core.people.has(id as PersonId))
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] as
      PersonId | undefined;
    const entryOf = (personId: PersonId, typeKey: string) =>
      director.ledger.people
        .get(personId)
        ?.schedule.find(
          (row) =>
            row.momentId.includes(causeId) &&
            row.bindings.some((binding) => binding.typeKey === typeKey),
        );
    const callEntry = loser ? entryOf(loser, "race-lost") : undefined;
    const receiveEntry = entryOf(winner, "concession-received");
    if (!loser || !callEntry || !receiveEntry) {
      tried.push(
        `${where}: loser ${loser ?? "none"}, call ${!!callEntry}, received ${!!receiveEntry}`,
      );
      continue;
    }

    // The loser, as the player, makes the call and concedes.
    core.playerId = loser;
    const call = purposeScene(core, director, loser, callEntry, {
      typeKey: "race-lost",
    });
    // The loser's side is asked by the people who worked their campaign: a
    // filer nobody volunteered for has no one to ask, and the place is passed
    // over by name (Central Falls, Rhode Island, run seed 895d11aee1c0c343).
    if (call?.kind === "skipped" && call.reason === "no supporters on record") {
      tried.push(`${where}: ${loser} had no supporters on record`);
      continue;
    }
    expect(call?.kind, `${where}: ${JSON.stringify(call)}`).toBe("composed");
    if (call?.kind !== "composed") return;
    expect(call.scene.cause.id, where).toBe(causeId);
    expect(call.scene.purpose, where).toBe("concession-call");
    // The loser's supporters press the question; the loser is the one asked.
    expect(call.scene.askedId, where).toBe(loser);
    expect(call.scene.askerId, where).not.toBe(loser);
    const path = pathTo(call.scene.talk.tree, "agree");
    expect(path, `${where}: a conceding path`).toBeTruthy();
    const callReply = replyInScene(core, director, loser, callEntry, path!, {
      typeKey: "race-lost",
    });
    expect(
      core.durableLog.get(callReply as EntityId)?.facts?.conceded,
      where,
    ).toBe("yes");
    const concession = `concession:${contest.id}:${loser}:yes`;
    const kept = core.durableLog.get(concession as EntityId);
    expect(kept?.personIds, where).toEqual([loser, winner]);

    // The call itself, from the conceder's side the day after: the winner
    // takes it, speaking first, from the press's concession record.
    advanceCore(core, addDays(makeIsoDate(core.date), 1));
    const takenEntry = director.ledger.people
      .get(loser)
      ?.schedule.find(
        (row) =>
          row.momentId.includes(concession) &&
          row.bindings.some((b) => b.typeKey === "concession-taken"),
      );
    expect(
      takenEntry,
      `${where}: the winner's call was not staged`,
    ).toBeTruthy();
    const taken = purposeScene(core, director, loser, takenEntry!, {
      typeKey: "concession-taken",
    });
    expect(taken?.kind, `${where}: ${JSON.stringify(taken)}`).toBe("composed");
    if (taken?.kind !== "composed") return;
    expect(taken.scene.askerId, where).toBe(winner);

    // The winner, as the player, takes the call from the same count.
    core.playerId = winner;
    const heard = purposeScene(core, director, winner, receiveEntry, {
      typeKey: "concession-received",
    });
    expect(heard?.kind, `${where}: ${JSON.stringify(heard)}`).toBe("composed");
    if (heard?.kind !== "composed") return;
    expect(heard.scene.cause.id, where).toBe(causeId);
    expect(heard.scene.askerId, where).toBe(loser);
    expect(heard.scene.askedId, where).toBe(winner);
    const heardReply = replyInScene(core, director, winner, receiveEntry, [0], {
      typeKey: "concession-received",
    });
    expect(
      core.durableLog.get(heardReply as EntityId)?.facts?.causeId,
      where,
    ).toBe(causeId);

    process.stdout.write(
      `CONCESSION NIGHT ${where}${tried.length ? ` after ${tried.length} places without a contested count` : ""}: ${causeId}\n  LOSER ASKED TO CALL (${loser}, asked by ${call.scene.askerId}): "${call.scene.talk.state.text}" -> reply ${callReply}, conceded yes, press record ${concession}\n  WINNER ANSWERS THE CALL (${winner}, from ${concession}): "${taken.scene.talk.state.text}"\n  WINNER HEARS (${winner}): "${heard.scene.talk.state.text}" -> reply ${heardReply}\n`,
    );
    return;
  }
  throw new Error(
    `no drawn place counted a contested race in the year: ${tried.join("; ")} (seed ${seed})`,
  );
}, 3_600_000);
