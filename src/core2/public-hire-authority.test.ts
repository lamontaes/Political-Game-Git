/**
 * A person hired mid-run at a public employer joins the employer's public pay
 * authority, so the employer's payroll can pay them: a hire the authority did
 * not own stopped the year at the first payday ("Public pay does not match its
 * actual owned work obligation"). Played world in a place drawn from all 56,
 * place and seed named in every failure; draws on until a town has a public
 * employer with a paid staff member and a jobless adult.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { addDays, ageOnDate, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { coreAPI } from "./state";
import type { CoreState } from "./types";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");

it("a hire at a public employer joins its public pay authority and is paid", () => {
  setBookkeeping(false);
  const tried: string[] = [];
  try {
    for (let attempt = 0; attempt < 12; attempt += 1) {
      const place = drawPlace(seed, `public-hire-${attempt}`);
      const world = buildBenchWorld(place.seed, "2026-10-12", {
        twoLevel: true,
        placeKey: place.key,
      });
      const core = world.core as CoreState;
      const api = coreAPI(core);
      const where = `${place.name}, ${place.state} (${place.key}), seed ${place.seed}`;
      const staff = [...core.work.commitments.values()].find(
        (commitment) =>
          commitment.publicPayAuthorityId !== undefined &&
          commitment.endsAt === undefined &&
          core.jobs.get(commitment.jobId)?.endsAt === undefined &&
          core.organizations.get(commitment.organizationId)?.publicPayAuthority
            ?.id === commitment.publicPayAuthorityId,
      );
      const hire = [...core.people.values()].find(
        (person) =>
          person.alive &&
          person.placeId === world.place.context.jurisdiction.id &&
          (!person.jobId ||
            core.jobs.get(person.jobId)?.endsAt !== undefined) &&
          ageOnDate(makeIsoDate(person.birthDate), makeIsoDate(core.date)) >=
            25,
      );
      if (!staff || !hire) {
        tried.push(`${where}: no public staff member or no jobless adult`);
        continue;
      }
      const job = core.jobs.get(staff.jobId)!;
      const calendar = core.work.payrollCalendars.get(
        core.work.payrollCalendarByCommitment.get(staff.id)!,
      )!;
      const date = core.date;
      const id = `public-hire:${hire.id}:${date}`;
      const source = {
        tag: "ESTIMATED" as const,
        asOf: date,
        citation: "A hire into a public employer's existing role.",
        estimatedFrom: `The coworker's pay and schedule, ${job.id}.`,
      };
      api.startJob(
        { ...job, id: `job:${id}`, personId: hire.id, source },
        {
          ...staff,
          id: `commitment:${id}`,
          jobId: `job:${id}`,
          personId: hire.id,
          payrollCalendarId: `calendar:${id}`,
          startsAt: date,
          anchorDate: date,
          scheduleSource: source,
          paySource: source,
        },
        {
          ...calendar,
          id: `calendar:${id}`,
          workCommitmentIds: [`commitment:${id}`],
          basisRecordIds: [staff.organizationId, `job:${id}`],
          effectiveFrom: date,
          source,
        },
      );
      const authority = core.organizations.get(
        staff.organizationId,
      )!.publicPayAuthority!;
      expect(authority.workCommitmentIds, where).toContain(`commitment:${id}`);
      const cashBefore = core.people.get(hire.id)!.liquidMinor;
      // Past the employer's first payday for the new hire.
      advanceCore(core, addDays(makeIsoDate(date), 45));
      expect(
        core.people.get(hire.id)!.liquidMinor,
        `${where}: ${hire.id} was never paid`,
      ).not.toBe(cashBefore);
      return;
    }
  } finally {
    setBookkeeping(true);
  }
  throw new Error(
    `no drawn place had a public employer to hire at (seed ${seed}): ${tried.join("; ")}`,
  );
}, 900_000);
