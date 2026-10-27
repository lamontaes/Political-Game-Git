/**
 * A town's or county's recorded clerk is on the staff of that government's
 * public office, so civic offers and filing find someone to ask. Played world,
 * a place and seed nobody chose, one year.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, ageOnDate, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { workedToday } from "./job-lifecycle";
import { coreAPI } from "./state";
import type { JobInput } from "./types";
import { drawPlace } from "../../scripts/core2-year/place";

const seed = process.env.CLERK_STAFF_SEED || randomBytes(8).toString("hex");
const CLERKS = new Set([
  "profession:municipal-clerk",
  "profession:county-clerk",
]);

it("puts every municipal and county clerk job on its government office's staff", () => {
  const tried: string[] = [];
  for (let draw = 0; draw < 12; draw += 1) {
    const place = drawPlace(`${seed}:${draw}`, "civic-inputs-clerk-staff");
    const where = `${place.name} (${place.key}), seed ${seed}:${draw}`;
    setBookkeeping(false);
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const atOpening = new Set(core.jobs.keys());
    // A world with no town clerk at a government employer cannot show the
    // case that was missing, so draw another place.
    const governedClerk = (job: JobInput, kind?: string) =>
      Boolean(job.occupationClassification) &&
      (kind
        ? job.occupationClassification === kind
        : CLERKS.has(job.occupationClassification!)) &&
      !job.endsAt &&
      Boolean(
        core.organizations.get(job.organizationId)?.governmentFacts
          ?.governmentKind &&
        core.organizations.get(job.organizationId)?.governmentFacts
          ?.governmentJurisdictionId,
      );
    if (
      ![...core.jobs.values()].some((job) =>
        governedClerk(job, "profession:municipal-clerk"),
      )
    ) {
      tried.push(`${where}: no town clerk at a government employer`);
      continue;
    }
    advanceCore(core, addDays(makeIsoDate(core.date), 365));
    const governed = [...core.jobs.values()].filter((job) =>
      governedClerk(job),
    );
    // A year in which the town's clerk left with no one hired holds no
    // clerk to find, so draw another place.
    if (
      !governed.some(
        (job) => job.occupationClassification === "profession:municipal-clerk",
      )
    ) {
      tried.push(`${where}: no current town clerk after the year`);
      continue;
    }
    const hired = governed.filter((job) => !atOpening.has(job.id)).length;
    const left = [...core.jobs.values()].filter(
      (job) =>
        job.endsAt !== undefined &&
        job.occupationClassification !== undefined &&
        CLERKS.has(job.occupationClassification),
    );
    for (const job of governed) {
      const office = core.publicOrganizations.get(job.organizationId);
      process.stdout.write(
        `${where}: ${atOpening.has(job.id) ? "opening" : "hired"} job ${job.id} (${job.title}) held by ${job.personId} at organization ${job.organizationId} ` +
          `-> office staff ${office?.staff?.map((row) => row.jobId).join(",") ?? "none"}\n`,
      );
      expect(
        office,
        `${where}: ${job.organizationId} has no public office`,
      ).toBeDefined();
      expect(
        office!.staff?.find((row) => row.jobId === job.id),
        `${where}: clerk job ${job.id} is not on ${job.organizationId}'s staff`,
      ).toMatchObject({
        personId: job.personId,
        title: job.title,
        source: job.source,
      });
    }
    // No one who left a job is still on an office's staff.
    for (const office of core.publicOrganizations.values())
      for (const row of office.staff ?? [])
        expect(
          core.jobs.get(row.jobId)?.endsAt,
          `${where}: ${row.jobId} on ${office.id}'s staff has ended`,
        ).toBeUndefined();
    // The same rule on the day a clerk leaves and another takes the post:
    // the one who left comes off the staff and the new clerk goes on it.
    const api = coreAPI(core);
    // A job ends before its day's work, so step to a day the town clerk is
    // off (a weekend), at most a week on.
    const clerkJob = governed.find(
      (job) => job.occupationClassification === "profession:municipal-clerk",
    )!;
    for (
      let day = 0;
      day < 7 && workedToday(core, { jobId: clerkJob.id });
      day += 1
    )
      advanceCore(core, addDays(makeIsoDate(core.date), 1));
    const leaving = core.jobs.get(clerkJob.id);
    expect(
      leaving?.endsAt === undefined &&
        !workedToday(core, { jobId: clerkJob.id }),
      `${where}: town clerk ${clerkJob.id} still holds the job on a day off within a week`,
    ).toBe(true);
    const successor = [...core.people.values()].find(
      (person) =>
        person.alive &&
        !person.jobId &&
        person.id !== leaving!.personId &&
        ageOnDate(person.birthDate, core.date) >= 18,
    );
    expect(
      successor,
      `${where}: a jobless adult to take the post`,
    ).toBeDefined();
    api.endJob(leaving!.id, `${leaving!.id}:left`);
    const seat = `${leaving!.id}:successor`;
    api.startSalariedPost({
      id: seat,
      personId: successor!.id,
      organizationId: leaving!.organizationId,
      title: leaving!.title,
      wageDailyMinor: leaving!.wageDailyMinor,
      hoursDaily: 0,
      source: leaving!.source,
      occupationClassification: leaving!.occupationClassification,
    });
    const staffed =
      core.publicOrganizations.get(leaving!.organizationId)!.staff ?? [];
    expect(
      staffed.map((row) => row.jobId),
      `${where}: ${leaving!.organizationId}'s staff after ${leaving!.id} left`,
    ).not.toContain(leaving!.id);
    expect(
      staffed.find((row) => row.jobId === seat),
      `${where}: ${successor!.id} seated as clerk`,
    ).toMatchObject({ personId: successor!.id, title: leaving!.title });
    process.stdout.write(
      `${where}: ${leaving!.id} (${leaving!.personId}) left and ${successor!.id} took the post; ${leaving!.organizationId} staff ${staffed.map((row) => row.jobId).join(",")}\n`,
    );
    process.stdout.write(
      `${where}: ${governed.length} current clerks (${hired} hired in the year), ${left.length} clerk jobs ended\n`,
    );
    return;
  }
  throw new Error(
    `no drawn place had a town clerk at a government employer; tried ${tried.join("; ")}`,
  );
}, 1_800_000);
