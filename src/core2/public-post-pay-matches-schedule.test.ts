/**
 * Every public post started through the government payroll pays, over the
 * minutes its work schedule runs in a year, the annual pay the post states
 * (its hourly rate times its stated hours): payroll, the post's budget line
 * and the director read one figure. Played world, a place and seed nobody
 * chose; a year of play so the posts hired after the opening are in it.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const DAYS_PER_YEAR = 365;

it("a public post pays its stated annual pay over the minutes its schedule runs", () => {
  const place = drawPlace(seed, "public-post-pay-schedule");
  const where = `${place.name} (${place.key}), seed ${seed}`;
  setBookkeeping(false);
  const { core } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  advanceCore(core, addDays(makeIsoDate(core.date), 120));
  const posts = [...core.jobs.values()].filter(
    (job) => job.id.startsWith("job:public:") && job.endsAt === undefined,
  );
  expect(posts.length, `${where}: public posts`).toBeGreaterThan(0);
  // The posts hired through the payroll after the opening are in the check:
  // an official's aides, and the posts appointees and outlets fill.
  expect(
    posts.some((job) => job.id.startsWith("job:public:staff:")),
    `${where}: no staff post`,
  ).toBe(true);
  const off: string[] = [];
  for (const job of posts) {
    const commitment = [...core.work.commitments.values()].find(
      (row) => row.jobId === job.id && row.endsAt === undefined,
    );
    expect(commitment, `${where}: ${job.id}`).toBeDefined();
    const scheduled =
      (commitment!.hourlyMinor *
        commitment!.expectedWeeklyMinutes *
        DAYS_PER_YEAR) /
      7 /
      60;
    const stated = job.wageDailyMinor * DAYS_PER_YEAR;
    const ratio = scheduled / stated;
    if (Math.abs(ratio - 1) > 0.02) off.push(`${job.id} ${ratio.toFixed(3)}`);
  }
  expect(off, `${where}: posts off their stated pay`).toEqual([]);
}, 1_800_000);
