/**
 * A full worker who leaves a firm outside the jobs engine (hired to an
 * official's staff, a death, a move) is a leaver. At the firm's next staffing
 * review (`firmStaffing`) it reads short or it does not: when short, the firm
 * posts that job again within a month and a half; when not, it posts no
 * replacement by then. A place drawn from all 56 by a seed named in the output,
 * played day by day; up to six draws are tried for a case that reads short, and
 * the counts found are reported when none does.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { firmStaffing, JOBS_MODULE_ID } from "./modules/jobs";
import { coreAPI } from "./state";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const DRAWS = 6;
const DAYS = 180;
// The jobs engine's own endings; any other end of a job is a worker leaving outside it.
const OWN_ENDINGS = ["layoff", "quit", "left-work", "closure", "staff-shed"];

interface Case {
  jobId: string;
  firmId: string;
  ended: string;
  readOn?: string;
  short?: boolean;
}

it(`posts a hired-away worker's job again when the firm reads short (seed ${seed})`, () => {
  setBookkeeping(false);
  const found: string[] = [];
  try {
    for (let draw = 0; draw < DRAWS; draw += 1) {
      const place = drawPlace(`${seed}:${draw}`, "hired-away");
      const where = `${place.name} (${place.key}), seed ${place.seed}`;
      const { core } = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
      const api = coreAPI(core);
      const opening = makeIsoDate(core.date);
      const tracked = new Map<string, Case>();
      const seen = new Set<string>();
      for (let day = 0; day < DAYS; day += 1) {
        advanceCore(core, addDays(makeIsoDate(core.date), 1));
        const today = core.date;
        const own = new Set(
          (
            api
              .moduleState(JOBS_MODULE_ID)
              .table("changes")
              .rows() as unknown as {
              jobId: string;
              kind: string;
            }[]
          )
            .filter((row) => OWN_ENDINGS.includes(row.kind))
            .map((row) => row.jobId),
        );
        for (const job of core.jobs.values()) {
          if (
            job.endsAt === undefined ||
            seen.has(job.id) ||
            makeIsoDate(job.endsAt) <= addDays(opening, 1) ||
            own.has(job.id) ||
            core.organizations.get(job.organizationId)?.kind !== "employer" ||
            !core.finance.businesses.get(job.organizationId) ||
            core.finance.businesses.get(job.organizationId)!.closedAt
          )
            continue;
          seen.add(job.id);
          tracked.set(job.id, {
            jobId: job.id,
            firmId: job.organizationId,
            ended: job.endsAt,
          });
        }
        // The first review after the job ended reads whether the firm is short.
        for (const row of tracked.values()) {
          if (row.readOn) continue;
          const read = firmStaffing(api, row.firmId);
          if (read && read.at > row.ended) {
            row.readOn = read.at;
            row.short = read.serviceLevel < 1;
          }
        }
        void today;
      }
      const positions = api
        .moduleState(JOBS_MODULE_ID)
        .table("positions")
        .rows() as unknown as {
        organizationId: string;
        replacesJobId?: string;
        openedAt: string;
      }[];
      const read = [...tracked.values()].filter((row) => row.readOn);
      const short = read.filter((row) => row.short);
      found.push(
        `${where}: ${tracked.size} jobs ended outside the engine, ${read.length} read at a review, ${short.length} short`,
      );
      for (const row of read) {
        const posted = positions.filter(
          (p) =>
            p.organizationId === row.firmId && p.replacesJobId === row.jobId,
        );
        const limit = addDays(makeIsoDate(row.ended), 45);
        if (row.short) {
          expect(
            posted.length,
            `${where}: ${row.firmId} reads short on ${row.readOn} and posts ${row.jobId} again`,
          ).toBe(1);
          expect(
            posted[0]!.openedAt <= limit,
            `${where}: posted ${posted[0]!.openedAt}, job ended ${row.ended}`,
          ).toBe(true);
        } else {
          expect(
            posted.filter((p) => p.openedAt <= row.readOn!).length,
            `${where}: ${row.firmId} reads not short on ${row.readOn} and posts no replacement for ${row.jobId} by then`,
          ).toBe(0);
        }
      }
      if (short.length) {
        process.stdout.write(
          `hired-away: ${where}: ${short.length} short case(s) posted again\n`,
        );
        return;
      }
    }
    process.stdout.write(
      `hired-away: no draw gave a firm that reads short after a worker left (seed ${seed}); found: ${found.join("; ")}\n`,
    );
  } finally {
    setBookkeeping(true);
  }
}, 3_600_000);
