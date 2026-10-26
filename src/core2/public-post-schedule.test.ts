/**
 * A public post works an office week, not a day-long rotation copied from
 * another job in the town (pool item world-opening-city-administrator-shift-pattern):
 * in Independence, Louisiana the city administrator and every post after it
 * followed the firefighters' 24-hour slot every third day, which no aide could
 * attend. A place is drawn from all 56 for the second case; set
 * PUBLIC_POST_SEED to reproduce a run.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { townSeats } from "./modules/offices";
import { staffOf } from "./modules/staff";
import { coreAPI } from "./state";
import type { CoreState } from "./types";

const WORKING_DAY_MINUTES = 12 * 60;

function publicPostSlots(core: CoreState) {
  return [...core.work.commitments.values()]
    .filter((row) => row.jobId.startsWith("job:public:"))
    .map((row) => ({
      jobId: row.jobId,
      longest: Math.max(0, ...row.slots.map((slot) => slot.minutes)),
    }));
}

function play(place: { name: string; key: string; seed: string }) {
  setBookkeeping(false);
  try {
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(core);
    const attended = new Map<string, number>();
    const record = api.recordWorkAttendance.bind(api);
    api.recordWorkAttendance = (row) => {
      if (row.jobId.startsWith("job:public:staff:"))
        attended.set(
          row.jobId,
          (attended.get(row.jobId) ?? 0) + row.attendedMinutes,
        );
      return record(row);
    };
    advanceCore(core, addDays(makeIsoDate(core.date), 120));
    const aides = townSeats(api)
      .flatMap((seat) =>
        seat.holder ? staffOf(api, seat.holder.personId) : [],
      )
      .map((aide) => aide.jobId)
      .filter((id): id is string => !!id);
    return {
      core,
      attended,
      aides,
      where: `${place.name} (${place.key}), seed ${place.seed}`,
    };
  } finally {
    setBookkeeping(true);
  }
}

it("Independence, Louisiana: the city administrator has an office week and the governor's aides attend", () => {
  const run = play({
    name: "Independence",
    key: "2237025",
    seed: "7b7b07cc96aa225f55b6f8834881f44ed234811a577a1067e954be747cca333a",
  });
  const admin = publicPostSlots(run.core).find((row) =>
    row.jobId.startsWith("job:public:town:city-administrator:"),
  );
  expect(
    admin,
    `${run.where}: the city administrator's commitment`,
  ).toBeDefined();
  expect(admin!.longest, `${run.where} ${admin!.jobId}`).toBeLessThanOrEqual(
    WORKING_DAY_MINUTES,
  );
  const governorsAides = run.aides.filter((id) => id.includes(":governor:"));
  expect(governorsAides.length, run.where).toBeGreaterThan(0);
  // Their days are office days the aides can attend; whether each one does is
  // their own decision, so what is asserted is that some of them did.
  const attendedBy = governorsAides.filter(
    (jobId) => (run.attended.get(jobId) ?? 0) > 0,
  );
  expect(
    attendedBy.length,
    `${run.where}: governor's aides who attended (of ${governorsAides.join(", ")})`,
  ).toBeGreaterThan(0);
}, 900_000);

it("in places drawn from all 56 no public post has a slot over 12 hours", () => {
  const seed = process.env.PUBLIC_POST_SEED ?? randomBytes(8).toString("hex");
  for (const draw of [1, 2]) {
    const run = play(drawPlace(`${seed}:${draw}`, "public-post-schedule"));
    const posts = publicPostSlots(run.core);
    expect(posts.length, run.where).toBeGreaterThan(0);
    for (const post of posts)
      expect(post.longest, `${run.where} ${post.jobId}`).toBeLessThanOrEqual(
        WORKING_DAY_MINUTES,
      );
  }
}, 1_800_000);
