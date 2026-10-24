import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { OUTSIDE_MARKET_KIND } from "./opening-outside-market";
import { coreAPI } from "./state";
import type { CoreState, JobInput } from "./types";

// A worker whose employer is the place's outside account is paid from it
// against an exact due record; an employer with no pay authority pays nothing
// of the kind (core-outside-pay-authority). A place is drawn from all 56; set
// GOLDEN_PATH_SEED to reproduce a run.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");

it(`a worker hired by the outside account is paid from it against due records, seed ${seed}`, () => {
  setBookkeeping(false);
  const tried: string[] = [];
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const place = drawPlace(seed, `outside-pay:${attempt}`);
    tried.push(place.name);
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const state = core as CoreState;
    const api = coreAPI(core);
    const where = `${place.name} [${place.key}], seed ${seed}`;
    const outside = [...state.organizations.values()].find(
      (o) => o.kind === OUTSIDE_MARKET_KIND && o.publicPayAuthority,
    );
    expect(
      outside,
      `${where}: an outside account with a pay authority`,
    ).toBeDefined();
    // A full person with a job, commitment and calendar leaves it for the outside account.
    const template = [...state.jobs.values()].find(
      (job) =>
        job.endsAt === undefined &&
        job.personId !== state.playerId &&
        [...(state.work.commitmentsByPerson.get(job.personId) ?? [])].length >
          0 &&
        state.work.payrollCalendarByJob.get(job.id),
    );
    if (!template) continue;
    const hire = state.people.get(template.personId)!;
    const commitment = state.work.commitments.get(
      [...state.work.commitmentsByPerson.get(template.personId)!][0]!,
    )!;
    const calendar = state.work.payrollCalendars.get(
      state.work.payrollCalendarByJob.get(template.id)!,
    )!;
    api.endJob(template.id, `test:outside-pay:${core.date}`);
    const jobId = `job:outside-pay:${hire.id}`;
    const commitmentId = `work-commitment:${jobId}`;
    const startsAt = addDays(makeIsoDate(core.date), 1);
    const job: JobInput = {
      ...template,
      id: jobId,
      personId: hire.id,
      organizationId: outside!.id,
      title: "Worker for an employer outside the town",
      endsAt: undefined,
    };
    api.startJob(
      job,
      {
        ...commitment,
        id: commitmentId,
        jobId,
        personId: hire.id,
        organizationId: outside!.id,
        payrollCalendarId: `payroll-calendar:${jobId}`,
        publicPayAuthorityId: outside!.publicPayAuthority!.id,
        startsAt,
        endsAt: undefined,
      },
      {
        ...calendar,
        id: `payroll-calendar:${jobId}`,
        organizationId: outside!.id,
        workCommitmentIds: [commitmentId],
        basisRecordIds: [outside!.id],
        effectiveFrom: startsAt,
      },
    );
    advanceCore(core, addDays(makeIsoDate(core.date), 70));
    // The wages came from the outside account against pay records: the payroll ledger shows pay and a receipt.
    const ledger = state.work.payrollLedgerByCommitment.get(commitmentId);
    expect(
      ledger?.paidMinor ?? 0,
      `${where}: ${hire.id} was paid by the outside account`,
    ).toBeGreaterThan(0);
    expect(
      ledger?.lastPayrollReceiptId,
      `${where}: a payroll receipt`,
    ).toBeTruthy();
    expect(state.organizations.get(outside!.id)!.liquidMinor).toBe(0);
    // An employer with no pay authority cannot take a commitment that names one.
    const plain = [...state.organizations.values()].find(
      (o) =>
        o.id !== outside!.id && !o.publicPayAuthority && o.liquidMinor >= 0,
    )!;
    const other = [...state.jobs.values()].find(
      (j) => j.endsAt === undefined && j.personId !== hire.id,
    )!;
    expect(
      () =>
        api.startJob(
          {
            ...job,
            id: `${jobId}:refused`,
            personId: other.personId,
            organizationId: plain.id,
            endsAt: undefined,
          },
          {
            ...commitment,
            id: `${commitmentId}:refused`,
            jobId: `${jobId}:refused`,
            personId: other.personId,
            organizationId: plain.id,
            publicPayAuthorityId: outside!.publicPayAuthority!.id,
            startsAt: makeIsoDate(core.date),
            endsAt: undefined,
          },
          {
            ...calendar,
            id: `payroll-calendar:${jobId}:refused`,
            organizationId: plain.id,
            workCommitmentIds: [`${commitmentId}:refused`],
          },
        ),
      `${where}: an employer without the authority is refused`,
    ).toThrow();
    expect(core.cashJournal.totals.grossDebitMinor).toBe(
      core.cashJournal.totals.grossCreditMinor,
    );
    return;
  }
  throw new Error(
    `no drawn place had a hire and a template (${tried.join(", ")}; seed ${seed})`,
  );
}, 1_800_000);
