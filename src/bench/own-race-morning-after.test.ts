import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import type { PersonId } from "../core2/types";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { gatherSignatures } from "../core2/campaign-petition-kit";
import { playerContests } from "../core2/modules/elections";
import { coreAPI } from "../core2/state";
import { composeJournal } from "../director/journal";
import { wordOwnResult } from "./archive-words";
import { fileForOffice, governmentView } from "./government";
import { ownRace } from "./results";
import { buildBenchWorld } from "./world";

// The morning after a race the player ran in, the Journal, the News and the
// Government screen each tell its result, each citing the count's public
// record. The player files for the first race the records let them enter in
// a drawn place once they turn 18, and the played world counts it.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");

it("the day after the player's race, Journal, News and Government cite its result record", () => {
  const tried: string[] = [];
  for (let draw = 0; draw < 6; draw += 1) {
    const place = drawPlace(`${seed}:${draw}`, "own-race-morning-after");
    const where = `${place.name} (${place.key}), seed ${seed}:${draw}`;
    setBookkeeping(false);
    const world = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const { core, director, playerId } = world;
    const api = coreAPI(core);
    // The director follows the player, as the bench does when play starts.
    director!.watch(core, playerId!);
    // The golden path starts at 18: the player files once they may.
    const born = core.people.get(playerId!)!.birthDate;
    const md = born.slice(5) === "02-29" ? "03-01" : born.slice(5);
    const eighteen = makeIsoDate(`${Number(born.slice(0, 4)) + 18}-${md}`);
    if (eighteen > core.date) advanceCore(core, eighteen);
    // The soonest race the records let the player enter.
    const filed = [...playerContests(api)]
      .sort(
        (a, b) =>
          a.electionDate.localeCompare(b.electionDate) ||
          a.id.localeCompare(b.id),
      )
      .find((contest) => {
        const result = fileForOffice(core, playerId!, contest.id) as {
          filing?: { status?: string };
        };
        return ["petitioning", "on-ballot"].includes(
          result.filing?.status ?? "",
        );
      });
    if (!filed) {
      tried.push(`${where}: no race the player could enter`);
      continue;
    }
    // Filing is a petition: the player gathers signatures until the clerk's
    // check puts them on the ballot.
    const petition = gatherSignatures(core, `filing:${filed.id}:${playerId}`);
    if (
      petition &&
      !(petition.check && petition.check.valid >= petition.needed)
    ) {
      tried.push(`${where}: the petition for ${filed.id} came up short`);
      continue;
    }
    advanceCore(core, addDays(makeIsoDate(filed.electionDate), 1));
    const race = ownRace(core, playerId!);
    if (!race || race.contestId !== filed.id) {
      tried.push(`${where}: ${filed.id} has no count the player is in`);
      continue;
    }
    expect(core.durableLog.has(race.recordId as never), where).toBe(true);

    // News: the paper's story about the player's race, from the count.
    const story = wordOwnResult(core, race, playerId!);
    expect(story, `${where}: ${race.recordId} worded`).not.toBeNull();
    expect(story!.id, where).toBe(race.recordId);
    expect(story!.sourceRecordIds, where).toContain(race.recordId);
    expect(story!.lede ?? story!.headline, where).toMatch(
      race.won ? /\b(won|beat)\b/ : /\b(lost|defeated)\b/,
    );

    // Journal: the race's line says how it went and stands on the count.
    const lines = composeJournal(
      core,
      director!,
      playerId! as PersonId,
    ).flatMap((chapter) => chapter.lines);
    const told = lines.filter((line) =>
      line.sourceRecordIds?.includes(race.recordId),
    );
    expect(told.length, `${where}: a journal line on ${race.recordId}`).toBe(1);
    expect(told[0]!.text, where).toMatch(
      race.won ? /\b(won|elected)\b/i : /\b(lost|didn't win)\b/i,
    );

    // Government: the seat's own-race line, by the same contest and record.
    const view = governmentView(core, playerId!);
    expect(view.ownRace?.contestId, where).toBe(race.contestId);
    expect(view.ownRace?.recordId, where).toBe(race.recordId);
    expect(
      view.seats.some((seat) => seat.seatId === race.seatId),
      `${where}: ${race.seatId} on the Government screen`,
    ).toBe(true);
    console.log(
      `${where}: ${race.contestId} ${race.won ? "won" : "lost"} ${race.votes} to ${race.rival?.votes ?? 0}; news "${story!.lede ?? story!.headline}"; journal "${told[0]!.text}"`,
    );
    return;
  }
  throw new Error(
    `no drawn place counted the player's race: ${tried.join("; ")}`,
  );
}, 1_800_000);
