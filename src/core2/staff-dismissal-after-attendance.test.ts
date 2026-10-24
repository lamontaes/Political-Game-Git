/**
 * Pool item play-staff-dismissal-after-attendance. The player's clock runs a
 * day's calendar work after the day's work, so an official's attendance
 * review can let go an aide who has already worked today; ending the job then
 * stopped the game. The official decides at the review and the job ends in
 * the next day's calendar work, before that day's work: the day worked stays
 * the aide's last attendance, the post's pay stays on record and the post is
 * refilled. Bruceton Mills, West Virginia (pinned, where the game stopped)
 * and one place drawn from all 56; set GOLDEN_PATH_SEED to reproduce the draw.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { BenchPlayer } from "../bench/player";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { declineJobOffer, JOBS_MODULE_ID } from "./modules/jobs";
import { STAFF_MODULE_ID, type StafferRow } from "./modules/staff";
import { coreAPI } from "./state";

const BRUCETON_MILLS = {
  seed: "f3a19e9b0b076c3226803a277a9c30fd5b0454de",
  salt: "offer-deadline-held",
};
const base = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");

/** A year of the player's clock; returns the aides let go after a worked day. */
function playYear(seed: string, salt: string) {
  const place = drawPlace(seed, salt);
  const where = `${place.name} (${place.key}), seed ${seed}, salt ${salt}`;
  setBookkeeping(false);
  const world = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const { core } = world;
  const api = coreAPI(core);
  const player = new BenchPlayer(core, world.director);
  player.select(core.playerId!);
  const end = addDays(makeIsoDate(core.date), 365);
  for (let guard = 0; guard < 3000 && core.date < end; guard += 1) {
    if (player.pollingPlace) player.leavePolls();
    const packet = player.packet;
    if (packet?.kind === "choice") {
      player.resume({ kind: "own-choice", pauseId: packet.pauseId });
      continue;
    }
    if (packet?.kind === "stop") {
      // A held job offer is answered so the clock can go on.
      for (const stop of packet.stop.modules)
        if (
          stop.moduleId === JOBS_MODULE_ID &&
          stop.recordId.endsWith(":deadline")
        )
          declineJobOffer(api, stop.recordId.slice(0, -":deadline".length));
      player.resume({ kind: "stop", pauseId: packet.pauseId });
      continue;
    }
    player.advance("week");
  }
  expect(core.date >= end, `${where}: the clock reached ${end}`).toBe(true);
  const rows = api
    .moduleState(STAFF_MODULE_ID)
    .table("staff")
    .rows() as unknown as StafferRow[];
  const late = rows.filter(
    (row) =>
      row.dismissed &&
      (core.jobs.get(row.dismissed.jobId)?.endsAt ?? "") > row.dismissed.on,
  );
  for (const row of late) {
    const why = row.dismissed!;
    const job = core.jobs.get(why.jobId)!;
    // Ended in the next day's calendar work, after the day it was decided.
    expect(job.endsAt, `${where}: ${row.id}`).toBe(
      addDays(makeIsoDate(why.on), 1),
    );
    // The day worked stays the last attendance, and nothing was worked after.
    expect(
      core.work.lastAttendanceByJob.get(why.jobId)?.date,
      `${where}: ${row.id} last attendance`,
    ).toBe(why.on);
    expect(core.people.get(row.personId)!.jobId).not.toBe(why.jobId);
    // The post's pay stays on record.
    expect(
      core.work.latestPayrollByJob.has(why.jobId),
      `${where}: ${row.id} pay`,
    ).toBe(true);
    // The official refilled the post.
    expect(
      rows.some((other) => other.replacesStafferId === row.id),
      `${where}: ${row.id} was never replaced`,
    ).toBe(true);
    expect(row.dismissing, `${where}: ${row.id}`).toBeUndefined();
  }
  // No decision waits past the end of the year.
  expect(
    rows.filter((row) => row.dismissing).map((row) => row.id),
    where,
  ).toEqual([]);
  process.stdout.write(
    `STAFF DISMISSAL ${where}: player ${core.playerId}, aides let go ${rows.filter((r) => r.dismissed).length}, after a worked day ${late.map((r) => `${r.id} (job ${r.dismissed!.jobId}, decided ${r.dismissed!.on}, ended ${core.jobs.get(r.dismissed!.jobId)!.endsAt}, replaced by ${rows.find((o) => o.replacesStafferId === r.id)?.id})`).join(", ") || "none"}\n`,
  );
  return late;
}

it("Bruceton Mills, West Virginia: a year of the player's clock through an aide let go after their day's work", () => {
  const late = playYear(BRUCETON_MILLS.seed, BRUCETON_MILLS.salt);
  expect(late.length, "an aide let go after a worked day").toBeGreaterThan(0);
}, 1_800_000);

it(`a drawn place: a year of the player's clock through the staff reviews (base ${base})`, () => {
  playYear(base, "staff-dismissal-after-attendance");
}, 1_800_000);
