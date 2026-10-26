/**
 * An official reads their aides' attendance and lets one go who does not come
 * to work (an aide has no money need, so whether they come is left to their
 * own traits). The post is refilled, and no aide who never comes keeps the
 * job. Played world, a place and seed nobody chose.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { STAFF_MODULE_ID, type StafferRow } from "./modules/staff";
import { coreAPI } from "./state";
import { drawPlace } from "../../scripts/core2-year/place";

const seed = process.env.STAFF_ABSENCE_SEED || randomBytes(8).toString("hex");

it("lets an aide who never comes go, records why, and refills the post", () => {
  for (let draw = 0; draw < 8; draw += 1) {
    const place = drawPlace(`${seed}:${draw}`, "staff-absence");
    const where = `${place.name} (${place.key}), seed ${seed}:${draw}`;
    setBookkeeping(false);
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const opened = core.date;
    advanceCore(core, addDays(makeIsoDate(core.date), 150));
    const api = coreAPI(core);
    const rows = api
      .moduleState(STAFF_MODULE_ID)
      .table("staff")
      .rows() as unknown as StafferRow[];
    const dismissed = rows.filter((row) => row.dismissed);
    // No aide keeps the job after four months of never coming.
    for (const row of rows) {
      const person = core.people.get(row.personId)!;
      if (person.jobId !== row.jobId || !row.jobId) continue;
      const totals = core.work.totalsByJob.get(row.jobId);
      const days =
        (Date.parse(core.date) - Date.parse(row.hiredOn)) / 86_400_000;
      if (days >= 60)
        expect(
          totals?.workedDays ?? 0,
          `${where}: ${row.id} serves and has never worked`,
        ).toBeGreaterThan(0);
    }
    if (!dismissed.length) continue;
    for (const row of dismissed) {
      const why = row.dismissed!;
      expect(why.missedDays, `${where}: ${row.id}`).toBeGreaterThan(0);
      expect(why.absentShare, `${where}: ${row.id}`).toBeGreaterThan(0);
      // The job is over and the official hired someone in the post.
      expect(
        core.jobs.get(why.jobId)?.endsAt,
        `${where}: ${row.id}`,
      ).toBeDefined();
      expect(core.people.get(row.personId)!.jobId).not.toBe(why.jobId);
      expect(
        rows.some((other) => other.replacesStafferId === row.id),
        `${where}: ${row.id} was never replaced`,
      ).toBe(true);
      expect(why.on >= opened, where).toBe(true);
    }
    return;
  }
  throw new Error(`no aide was let go in eight drawn places, seed ${seed}`);
}, 1_800_000);
