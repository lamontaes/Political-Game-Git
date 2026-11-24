/**
 * Pool item jobs-layoff-worked-today: the player plays their own day before
 * the calendar runs, so the employer review could choose to lay off someone
 * who had already worked today, and ending that job stopped the game ("A job
 * ends before its day's work, from calendar work"). The business now makes
 * the same choice at the next review, before that day's work.
 *
 * Medicine Lake, Montana is the M0-03 draw where it stopped. Played as M0-03
 * plays it (src/bench/m0-check.ts) and on through the next monthly review,
 * the game runs and no job ends on a day it was worked. The rule itself is
 * shown on that world's own staff: a business whose only candidate worked
 * today lays no one off, and at the next review it lays that worker off.
 */
import { createHash } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { BenchPlayer, ownPick } from "../bench/player";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { currentJobs, layOff } from "./modules/jobs";
import { coreAPI } from "./state";

const PLACE = {
  seed: "f1581305148c217d80a6ee5f927e879713d25c27409cce441aa7c94ed61c5d95",
  key: "3048775",
  name: "Medicine Lake, Montana",
};
const where = `${PLACE.name} (${PLACE.key}) seed ${PLACE.seed}`;
const hash = (text: string) =>
  parseInt(createHash("sha256").update(text).digest("hex").slice(0, 8), 16);

it("a controlled character's month runs past the review and no job ends on a day it was worked", () => {
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
  const lost: { id: string; workedToday: boolean }[] = [];
  coreAPI(c).subscribeEvents(
    "layoff-worked-today",
    ["work.job-lost"],
    (_api, e) => {
      const prefix = `event:work.job-lost:${e.date}:`;
      expect(e.id.startsWith(prefix), where).toBe(true);
      const jobId = e.id.slice(prefix.length);
      expect(jobId, where).not.toBe("");
      lost.push({
        id: e.id,
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
  const end = until("2025-04-03");
  expect(`${end.kind} ${end.at.date}`, where).toBe("complete 2025-04-03");
  expect(lost.length, `${where}: no job was lost to check`).toBeGreaterThan(0);
  expect(
    lost.filter((row) => row.workedToday).map((row) => row.id),
    `${where}: jobs ended on a day they were worked`,
  ).toEqual([]);
}, 1_200_000);

it("a business whose only candidate worked today lays them off at the next review instead", () => {
  setBookkeeping(false);
  const { core: c } = buildBenchWorld(PLACE.seed, gameStartDate(), {
    placeKey: PLACE.key,
    twoLevel: true,
  });
  const api = coreAPI(c);
  // A full worker's job in the world's own books.
  const job = [...c.jobs.values()]
    .filter((row) => row.endsAt === undefined && c.people.has(row.personId))
    .sort((a, b) => a.id.localeCompare(b.id))[0]!;
  const staff = currentJobs(api, job.organizationId).filter(
    (row) => row.id === job.id,
  );
  expect(staff.length, where).toBe(1);
  const today = c.date;
  // They worked today: the review lays no one off, and the job stands.
  c.work.lastAttendanceByJob.set(job.id, { date: today } as never);
  expect(layOff(api, job.organizationId, staff, 1, {}), where).toBeUndefined();
  expect(c.jobs.get(job.id)?.endsAt, where).toBeUndefined();
  // Controlled review inputs on the next month's first day, before work:
  // keep today's actual attendance stamp. Calendar scheduling itself is
  // exercised by the played case above.
  const nextMonth = addDays(makeIsoDate(`${today.slice(0, 7)}-01`), 32);
  c.date = makeIsoDate(`${nextMonth.slice(0, 7)}-01`);
  expect(c.work.lastAttendanceByJob.get(job.id)?.date, where).toBe(today);
  const laid = layOff(api, job.organizationId, staff, 1, {});
  expect(laid, where).toMatchObject({ heads: 1 });
  expect(
    currentJobs(api, job.organizationId).some((row) => row.id === job.id),
    `${where}: ${job.id} is still on the staff`,
  ).toBe(false);
}, 600_000);
