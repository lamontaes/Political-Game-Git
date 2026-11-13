/**
 * A governor the player seats appoints a post whose holder already worked
 * today, and the day goes on (pool item
 * gov-seated-governor-appointment-job-ends). The replaced holder's job used
 * to throw "a job ends before its day's work" at the appointment; now the post
 * changes hands at once, the new holder's job starts by record id, and the
 * replaced holder's job ends in the next calendar work, before their day.
 * Three places are drawn from all 56; set GOVERNOR_APPOINTEE_SEED to reproduce.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import executivePowers from "../../data/research/executive/executive-powers-2026.json" with { type: "json" };
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { appointStatePost, appointmentsIn } from "./modules/executive";
import { lawChain } from "./modules/laws";
import { seatPlayerInStateOffice } from "./office-day-state";
import { coreAPI } from "./state";

const seed =
  process.env.GOVERNOR_APPOINTEE_SEED ?? randomBytes(8).toString("hex");
const PLACES = 3;

it(`replacing a state post's holder who worked today ends their job tomorrow, never throws (seed ${seed})`, () => {
  setBookkeeping(false);
  const log: string[] = [];
  let proved = 0;
  for (let draw = 0; draw < 12 && proved < PLACES; draw += 1) {
    const place = drawPlace(`${seed}:${draw}`, "governor-appointee-job-ends");
    const where = `${place.name} (${place.key}), seed ${place.seed}`;
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(core);
    const player = core.playerId!;
    try {
      seatPlayerInStateOffice(api, { personId: player, role: "governor" });
    } catch (error) {
      log.push(`${where}: no governor seat (${String(error)})`);
      continue;
    }
    const state = lawChain(api).stateKey;
    const post = (
      executivePowers as unknown as {
        places: Record<
          string,
          { cabinet?: { positions: { key: string; appointedBy: string }[] } }
        >;
      }
    ).places[state]?.cabinet?.positions.find((p) =>
      /governor/.test(p.appointedBy),
    )?.key;
    if (!post) {
      log.push(`${where}: the governor appoints no post`);
      continue;
    }
    const first = appointStatePost(api, { executiveId: player, post });
    if (!first) {
      log.push(`${where}: nobody nominated for ${post}`);
      continue;
    }
    const firstJob = core.people.get(first.holderId)!.jobId!;
    // The next day the appointee has worked their shift before the governor replaces them.
    advanceCore(core, addDays(makeIsoDate(core.date), 1));
    const worked =
      core.work.lastAttendanceByJob.get(firstJob)?.date === core.date;
    const second = appointStatePost(api, { executiveId: player, post });
    expect(second, `${where}: the replacement`).toBeTruthy();
    expect(second!.holderId, `${where}: post changed hands`).not.toBe(
      first.holderId,
    );
    expect(
      appointmentsIn(api, state).find((row) => row.post === post)!.holderId,
      where,
    ).toBe(second!.holderId);
    const newJob = core.jobs.get(core.people.get(second!.holderId)!.jobId!)!;
    expect(newJob.id, where).toContain(`state:${post}`);
    expect(newJob.endsAt, where).toBeUndefined();
    if (worked) {
      // Worked today: their job stays until tomorrow's calendar work.
      expect(core.jobs.get(firstJob)!.endsAt, `${where}: ${firstJob}`).toBe(
        undefined,
      );
      advanceCore(core, addDays(makeIsoDate(core.date), 1));
      expect(core.jobs.get(firstJob)!.endsAt, `${where}: ${firstJob}`).toBe(
        core.date,
      );
      proved += 1;
    } else {
      expect(core.jobs.get(firstJob)!.endsAt, `${where}: ${firstJob}`).toBe(
        core.date,
      );
    }
    log.push(
      `${where}: ${post} ${first.holderId} (${firstJob}) replaced by ${second!.holderId} (${newJob.id}); worked today: ${worked}`,
    );
  }
  expect(
    proved,
    `no place proved the worked-today case:\n${log.join("\n")}`,
  ).toBe(PLACES);
}, 3_600_000);
