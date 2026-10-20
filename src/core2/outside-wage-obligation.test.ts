/**
 * A private employer outside the town pays a worker from the place's outside
 * account against an exact due record (core-outside-wage-obligation). The
 * account's pay authority names the commitments it pays; a commitment it does
 * not name is refused at payroll. Place and seed from GOLDEN_PATH_SEED
 * (random when unset), printed.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { gameStartDate } from "./game-start";
import { drawPlace } from "../../scripts/core2-year/place";
import { advanceCore } from "./life";
import { coreAPI } from "./state";
import { setBookkeeping } from "./bookkeeping";
import { addDays, makeIsoDate } from "./kernel/dates";
import { OUTSIDE_MARKET_KIND } from "./opening-outside-market";
import { withholdingOf } from "./modules/budgets";
import type { CoreState } from "./types";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");

function open() {
  setBookkeeping(false);
  const place = drawPlace(seed, "outside-wage-obligation");
  console.log(`outside-wage-obligation: place ${place.key}, seed ${seed}`);
  const { core } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  return { core, where: `seed ${seed}, ${place.name} (${place.key})` };
}

/** The player takes a commuter's job at the outside account, naming the authority or not. */
function commute(core: CoreState, named: boolean) {
  const api = coreAPI(core);
  const playerId = core.playerId!;
  const player = core.people.get(playerId)!;
  const outside = [...core.organizations.values()].find(
    (row) => row.kind === OUTSIDE_MARKET_KIND && row.placeId === player.placeId,
  )!;
  // Any private worker's schedule and payday are the template.
  const template = [...core.work.commitments.values()].find(
    (row) =>
      row.endsAt === undefined &&
      !row.publicPayAuthorityId &&
      row.payrollCalendarId &&
      core.work.payrollCalendars.has(row.payrollCalendarId),
  )!;
  const calendar = core.work.payrollCalendars.get(template.payrollCalendarId!)!;
  const startsAt = addDays(makeIsoDate(core.date), 1);
  const jobId = `job:outside:${playerId}`;
  const commitmentId = `work-commitment:${jobId}`;
  const hourlyMinor = 1500;
  const hours = core.jobs.get(template.jobId)?.hoursDaily ?? 8;
  api.startJob(
    {
      id: jobId,
      personId: playerId,
      organizationId: outside.id,
      title: "Commuter",
      hourlyMinor,
      hoursDaily: hours,
      wageDailyMinor: Math.round(hourlyMinor * hours),
      source: player.source,
    },
    {
      ...template,
      id: commitmentId,
      jobId,
      personId: playerId,
      organizationId: outside.id,
      payrollCalendarId: `payroll-calendar:${jobId}`,
      startsAt,
      endsAt: undefined,
      hourlyMinor,
      paySource: player.source,
      scheduleSource: player.source,
      ...(named
        ? { publicPayAuthorityId: outside.publicPayAuthority!.id }
        : { publicPayAuthorityId: undefined }),
    },
    {
      ...calendar,
      organizationId: outside.id,
      id: `payroll-calendar:${jobId}`,
      workCommitmentIds: [commitmentId],
      basisRecordIds: [outside.id],
      effectiveFrom: startsAt,
      source: player.source,
    },
  );
  return { api, playerId, jobId, outside };
}

describe(
  "an outside employer's wage obligation",
  { timeout: 1_800_000 },
  () => {
    it("pays a commuter from the outside account, taxed, against the authority that names the commitment", () => {
      const { core, where } = open();
      const { api, playerId, jobId, outside } = commute(core, true);
      advanceCore(core, addDays(makeIsoDate(core.date), 60));
      const taxed = withholdingOf(api, playerId).filter((row) =>
        row.payrollReceiptId.includes(jobId),
      );
      const paid = taxed.reduce((n, row) => n + row.paidMinor, 0);
      console.log(
        `outside-wage-obligation: ${taxed.length} taxed payday(s), ${paid} paid by ${outside.id}: ${taxed.map((row) => row.id).join(", ")}`,
      );
      expect(paid, where).toBeGreaterThan(0);
      expect(core.organizations.get(outside.id)!.liquidMinor, where).toBe(0);
      expect(taxed.length, where).toBeGreaterThan(0);
    });

    it("refuses a commitment the authority does not name", () => {
      const { core, where } = open();
      commute(core, false);
      expect(
        () => advanceCore(core, addDays(makeIsoDate(core.date), 60)),
        where,
      ).toThrow(/Public pay does not match its actual owned work obligation/);
    });
  },
);
