/**
 * Pool item jobs-layoff-worked-today: the player plays their own day before
 * the calendar runs, so the employer review could choose to lay off someone
 * who had already worked today, and ending that job stopped the game ("A job
 * ends before its day's work, from calendar work"). The business now makes
 * the same choice at the next review, before that day's work.
 *
 * Medicine Lake, Montana is the M0-03 draw where it stopped: the controlled
 * character works their March 1, 2025 shift, then the month's review picks
 * them. Played as M0-03 plays it (src/bench/m0-check.ts) and on through the
 * next review, nobody loses a job on a day they worked it, and the character
 * is laid off at the April 1 review instead. With the old choice the March 1
 * review throws.
 */
import { createHash } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { BenchPlayer, ownPick } from "../bench/player";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { coreAPI } from "./state";

const PLACE = {
  seed: "f1581305148c217d80a6ee5f927e879713d25c27409cce441aa7c94ed61c5d95",
  key: "3048775",
  name: "Medicine Lake, Montana",
};
const hash = (text: string) =>
  parseInt(createHash("sha256").update(text).digest("hex").slice(0, 8), 16);

it("a layoff whose choice worked today waits for the next review", () => {
  const where = `${PLACE.name} (${PLACE.key}) seed ${PLACE.seed}`;
  const w = buildBenchWorld(PLACE.seed, gameStartDate(), {
    placeKey: PLACE.key,
    minimumPeople: 400,
  });
  const c = w.core;
  // M0-03's character: an employed adult drawn from the seed.
  const adults = w.residents
    .filter((row) => row.age >= 18 && row.jobId)
    .sort((a, b) => a.id.localeCompare(b.id));
  const chosen = adults[hash(`${PLACE.seed}:m0-03`) % adults.length]!;
  const lost: { personId: string; date: string; workedToday: boolean }[] = [];
  coreAPI(c).subscribeEvents(
    "layoff-worked-today",
    ["work.job-lost"],
    (_api, e) => {
      const jobId = e.id.split(":").at(-1)!;
      for (const personId of e.personIds)
        lost.push({
          personId,
          date: e.date,
          workedToday:
            c.work.lastAttendanceByJob.get(jobId as never)?.date === e.date,
        });
    },
  );
  const player = new BenchPlayer(c, w.director);
  player.select(chosen.id);
  const until = (date: string) => {
    let result = player.advance("calendar", date as never);
    for (
      let guard = 0;
      result.packet.kind !== "complete" && guard < 400;
      guard++
    )
      result = {
        ...result,
        ...(result.packet.kind === "choice"
          ? player.resume({
              kind: "choice",
              pauseId: result.packet.pauseId,
              offerId: ownPick(result.packet)!.offerId,
            })
          : player.resume({ kind: "stop", pauseId: result.packet.pauseId })),
      };
    return result.packet;
  };
  // M0-03's opening day, its month's skip (through the March 1 review), then on past April 1.
  const from = addDays(
    makeIsoDate(gameStartDate()),
    2 + (hash(`${PLACE.seed}:m0-03:date`) % 14),
  );
  const at = until(from).at.date;
  until(addDays(makeIsoDate(at), 30));
  until("2025-04-03");
  expect(c.date >= "2025-04-03", where).toBe(true);
  expect(
    lost.filter((row) => row.workedToday),
    `${where}: jobs ended on a day they were worked`,
  ).toEqual([]);
  expect(
    lost.filter((row) => row.personId === chosen.id).map((row) => row.date),
    `${where}: ${chosen.id} is laid off at the review after the day they worked`,
  ).toEqual(["2025-04-01"]);
}, 1_200_000);
