/**
 * A full worker hired away outside the jobs engine (to an official's staff,
 * a death, a move) who held a firm's last job is a leaver: the firm, still
 * open and short of staff, posts that job again within a month and a half.
 * A place drawn from all 56 by a seed named in the output; up to six draws are
 * searched for a firm whose last live job ended outside the jobs engine.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { JOBS_MODULE_ID } from "./modules/jobs";
import { residentsRuntime } from "./modules/residents";
import { coreAPI } from "./state";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const DRAWS = 6;
const DAYS = 150;
// The jobs engine's own endings; any other end of a job is a worker leaving outside it.
const OWN_ENDINGS = ["layoff", "quit", "left-work", "closure", "staff-shed"];

it(`posts the job of a firm's last worker again after they are hired away (seed ${seed})`, () => {
  setBookkeeping(false);
  const tried: string[] = [];
  try {
    for (let draw = 0; draw < DRAWS; draw += 1) {
      const place = drawPlace(`${seed}:${draw}`, "hired-away");
      const where = `${place.name} (${place.key}), seed ${place.seed}`;
      const { core } = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
      const start = core.date;
      for (let day = 0; day < DAYS; day += 1)
        advanceCore(core, addDays(makeIsoDate(core.date), 1));
      const api = coreAPI(core);
      const changes = api
        .moduleState(JOBS_MODULE_ID)
        .table("changes")
        .rows() as unknown as { jobId: string; kind: string }[];
      const own = new Set(
        changes
          .filter((row) => OWN_ENDINGS.includes(row.kind))
          .map((row) => row.jobId),
      );
      // Heads the firm had left on the day a job ended outside the jobs engine: its full jobs still running then, and its counted jobs now.
      const countedLive = new Map<string, number>();
      for (const job of residentsRuntime(core)?.jobs.values() ?? [])
        if (!job.endsAt)
          countedLive.set(
            job.organizationId,
            (countedLive.get(job.organizationId) ?? 0) + 1,
          );
      const leftAfter = (job: {
        id: string;
        organizationId: string;
        endsAt?: string;
      }) =>
        [...core.jobs.values()].filter(
          (other) =>
            other.id !== job.id &&
            other.organizationId === job.organizationId &&
            (other.endsAt === undefined || other.endsAt > job.endsAt!),
        ).length + (countedLive.get(job.organizationId) ?? 0);
      const cutoff = addDays(makeIsoDate(core.date), -45);
      const opened = addDays(makeIsoDate(start), 1);
      // A firm still open whose last job ended outside the jobs engine, after the opening day, in time to be posted again.
      const cases = [...core.jobs.values()].filter(
        (job) =>
          job.endsAt !== undefined &&
          makeIsoDate(job.endsAt) <= cutoff &&
          makeIsoDate(job.endsAt) >= opened &&
          !own.has(job.id) &&
          leftAfter(job) === 0 &&
          core.organizations.get(job.organizationId)?.kind === "employer" &&
          core.finance.businesses.get(job.organizationId) !== undefined &&
          !core.finance.businesses.get(job.organizationId)!.closedAt,
      );
      tried.push(`${where}: ${cases.length} firms qualify`);
      if (!cases.length) continue;
      const positions = api
        .moduleState(JOBS_MODULE_ID)
        .table("positions")
        .rows() as unknown as {
        organizationId: string;
        replacesJobId?: string;
        openedAt: string;
      }[];
      for (const job of cases) {
        const ended = makeIsoDate(job.endsAt!);
        const posted = positions.filter(
          (row) =>
            row.organizationId === job.organizationId &&
            row.replacesJobId === job.id,
        );
        expect(
          posted.length,
          `${where}: ${job.organizationId} posts the job ${job.id} again`,
        ).toBe(1);
        expect(
          posted[0]!.openedAt <= addDays(ended, 45),
          `${where}: posted ${posted[0]!.openedAt}, job ended ${ended}`,
        ).toBe(true);
      }
      process.stdout.write(
        `hired-away: ${where}: ${cases.length} firm(s) posted the last worker's job again\n`,
      );
      return;
    }
    throw new Error(
      `no drawn world had a firm whose last worker was hired away (seed ${seed}); tried: ${tried.join("; ")}`,
    );
  } finally {
    setBookkeeping(true);
  }
}, 3_600_000);
