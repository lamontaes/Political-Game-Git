/**
 * A counted worker hired from a job with no occupation code (a press outlet's
 * staff job) keeps a job record a module row can hold. A business closure
 * copies the counted job whole into its seeker row (jobs.ts), and module data
 * refuses an undefined field, so one such job stopped the world build. Such a
 * hire is rare in play (none in a year of four drawn towns), so the case opens
 * one opening on an outlet's staff job, as the engine opens one when a
 * reporter leaves, and lets the weekly round fill it from the counts.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import jobsData from "./data/jobs/jobs.json" with { type: "json" };
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { moduleData, type ModuleRow } from "./module-data";
import { JOBS_MODULE_ID, type PositionRow } from "./modules/jobs";
import { residentsRuntime } from "./modules/residents";
import { coreAPI } from "./state";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");
const DRAWS = 6;

it(`a counted job hired from a job with no occupation code is module data, seed ${seed}`, () => {
  setBookkeeping(false);
  const tried: string[] = [];
  for (let draw = 0; draw < DRAWS; draw += 1) {
    const place = drawPlace(`${seed}:${draw}`, "closure-counted-seeker");
    const where = `${place.name} (${place.key}), seed ${place.seed}`;
    // Written straight to stdout, so a world that fails to build still names its place.
    process.stdout.write(`closure-counted-seeker-finite: ${where}\n`);
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      placeKey: place.key,
      twoLevel: true,
    });
    const api = coreAPI(core);
    const rt = residentsRuntime(core)!;
    // An outlet's staff job in town carries no occupation code.
    const template = [...core.jobs.values()].find(
      (job) =>
        job.id.startsWith("job:public:press:") &&
        !job.occupationClassification &&
        (job.hourlyMinor ?? 0) > 0 &&
        core.organizations.get(job.organizationId)?.placeId,
    );
    if (!template) {
      tried.push(`${where}: no outlet staff job without an occupation code`);
      continue;
    }
    const organization = core.organizations.get(template.organizationId)!;
    const position: PositionRow = {
      id: `position:${organization.id}:${core.date}:0`,
      organizationId: organization.id,
      placeId: organization.placeId!,
      templateJobId: template.id,
      title: template.title,
      occupation: template.title,
      hourlyMinor: template.hourlyMinor!,
      openedAt: core.date,
      status: "open",
      reasonKey: jobsData.reasons.opening,
    };
    api
      .moduleState(JOBS_MODULE_ID)
      .table("positions")
      .put(position as unknown as ModuleRow);
    // The weekly round fills it within a month when a counted seeker applies.
    const hired = () =>
      [...rt.jobs.values()].filter((job) =>
        job.id.startsWith(`job:${position.id}:`),
      );
    for (let week = 0; week < 5 && !hired().length; week += 1)
      advanceCore(core, addDays(makeIsoDate(core.date), 7));
    const jobs = hired();
    if (!jobs.length) {
      tried.push(`${where}: no counted seeker took ${position.id}`);
      continue;
    }
    expect(jobs[0]!.occupationClassification, jobs[0]!.id).toBeUndefined();
    setBookkeeping(true);
    try {
      for (const job of jobs)
        // What the closure handler writes for this worker's seeker row.
        expect(
          () => moduleData({ id: job.personId, lastJob: { ...job } }),
          `${where}: ${job.id}`,
        ).not.toThrow();
    } finally {
      setBookkeeping(false);
    }
    process.stdout.write(
      `closure-counted-seeker-finite: ${where}: ${jobs[0]!.id} hired on ${core.date} from ${template.id}; passed over: ${tried.join("; ") || "none"}\n`,
    );
    return;
  }
  throw new Error(
    `no drawn town hired a counted worker into an outlet staff job in ${DRAWS} draws (seed ${seed}): ${tried.join("; ")}`,
  );
}, 900_000);
