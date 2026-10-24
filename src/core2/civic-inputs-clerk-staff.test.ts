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
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
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
    tried.push(where);
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
    )
      continue;
    advanceCore(core, addDays(makeIsoDate(core.date), 365));
    const governed = [...core.jobs.values()].filter((job) =>
      governedClerk(job),
    );
    for (const job of governed) {
      const office = core.publicOrganizations.get(job.organizationId);
      process.stdout.write(
        `${where}: job ${job.id} (${job.title}) at organization ${job.organizationId} ` +
          `-> office staff ${office?.staff?.map((row) => row.jobId).join(",") ?? "none"}\n`,
      );
      // The staff list is the opening's (SG-CORE-public-office-staff-opening-only):
      // a clerk hired since is printed above, not held to it.
      if (!atOpening.has(job.id)) continue;
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
    return;
  }
  throw new Error(
    `no drawn place had a town clerk at a government employer; tried ${tried.join("; ")}`,
  );
}, 1_800_000);
