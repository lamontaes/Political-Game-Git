/** Controlled service-return regression; the four-year replay is the played proof. */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import type { CashJournalInput } from "./journal";
import { setJournalTrace } from "./journal-state";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import {
  OFFICIAL_PAY_MODULE,
  OFFICIAL_PAY_MODULE_ID,
} from "./modules/official-pay";
import { OFFICIALS_MODULE_ID, type OfficialRow } from "./modules/officials";
import {
  OFFICES_MODULE_ID,
  seatTerm,
  vacateSeat,
  vacancyFilled,
  type TermRow,
} from "./modules/offices";
import { coreAPI } from "./state";

const nextPayday = (date: string) => {
  let next = addDays(makeIsoDate(date), 1);
  while (!next.endsWith("-01")) next = addDays(next, 1);
  return next;
};

it("keeps a former office job and pays a returned official through a new service record", () => {
  const replay =
    process.env.OFFICIAL_RETURN_SEED ?? randomBytes(8).toString("hex");
  const place = drawPlace(replay, "official-pay-return");
  const where = `${place.name} (${place.key}), replay ${replay}`;
  console.log(JSON.stringify({ phase: "drawn", replay, place }));
  const previous = setBookkeeping(false);
  const paid: CashJournalInput[] = [];
  try {
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(core);
    const reviewPay = () =>
      OFFICIAL_PAY_MODULE.onDay!(
        api,
        () => {
          throw new Error("Payroll must not choose an actor action");
        },
        () => undefined,
      );
    const pay = api.moduleState(OFFICIAL_PAY_MODULE_ID).table("pay");
    const roster = api.moduleState(OFFICIALS_MODULE_ID).table("officials");
    const original = (roster.rows() as unknown as OfficialRow[]).find((row) => {
      const person = core.people.get(row.id);
      const record = pay.get(row.id) as { jobId: string } | undefined;
      return (
        row.ended === null &&
        row.termId !== null &&
        row.bodyKind === "us-house" &&
        person?.alive &&
        record?.jobId.startsWith("job:office:") &&
        core.jobs.get(record.jobId)?.endsAt === undefined
      );
    });
    expect(original, `${where}: a serving salaried House member`).toBeDefined();
    const official = original!;
    const initialPay = pay.get(official.id) as {
      jobId: string;
      payerId: string;
    };
    const oldJobId = initialPay.jobId;
    const term = api
      .moduleState(OFFICES_MODULE_ID)
      .table("terms")
      .get(official.termId!) as unknown as TermRow;
    const person = core.people.get(official.id)!;
    setJournalTrace((input) => {
      if (input.sourceRef.id.startsWith(`salary:${official.id}:`))
        paid.push(structuredClone(input));
    });
    advanceCore(core, addDays(makeIsoDate(core.date), 5));
    const vacancy = vacateSeat(api, official.seatId, "resigned");
    expect(vacancy, where).not.toBeNull();
    const ended = core.date;
    advanceCore(core, nextPayday(core.date));
    expect(
      pay.get(official.id),
      `${where}: final service paid and closed`,
    ).toBeUndefined();
    expect(
      paid.length,
      `${where}: salary earned before leaving is paid`,
    ).toBeGreaterThan(0);
    const oldJob = structuredClone(core.jobs.get(oldJobId)!);
    expect(oldJob.endsAt, where).toBeDefined();
    const returned = nextPayday(core.date);
    advanceCore(core, returned);
    // A controlled reappointment through the actual term writer, not a claimed election.
    const newTerm = seatTerm(api, {
      seatId: term.seatId,
      officeId: term.officeId,
      personId: official.id,
      identity: term.identity,
      party: term.party,
      startDate: core.date,
      endDate: null,
      endEstimated: false,
      reached: "controlled payroll reappointment",
      endsServingBecause: "controlled payroll reappointment",
      tookOffice: {
        placeId: person.placeId,
        source: {
          tag: "SOURCED",
          citation: "Controlled payroll lifecycle regression",
          asOf: core.date,
        },
        news: false,
        facts: { seatId: term.seatId },
      },
    });
    const heldVacancy = api
      .moduleState(OFFICES_MODULE_ID)
      .table("vacancies")
      .get(vacancy!.id);
    if (heldVacancy && heldVacancy.status !== "filled")
      vacancyFilled(api, vacancy!.id, newTerm.id);
    reviewPay();
    const next = pay.get(official.id) as {
      jobId: string;
      payerId: string;
      paidFrom: string;
    };
    expect(next, where).toBeDefined();
    expect(next.jobId, `${where}: distinct service record`).not.toBe(oldJobId);
    expect(
      core.jobs.get(oldJobId),
      `${where}: old history is unchanged`,
    ).toEqual(oldJob);
    expect(core.jobs.get(next.jobId)?.personId, where).toBe(official.id);
    expect(core.jobs.get(next.jobId)?.organizationId, where).toBe(next.payerId);
    expect(core.jobs.get(next.jobId)?.endsAt, where).toBeUndefined();
    expect(core.people.get(official.id)?.jobId, where).toBe(next.jobId);
    const jobCount = core.jobs.size;
    reviewPay();
    expect(core.jobs.size, `${where}: a second review does not add a job`).toBe(
      jobCount,
    );
    const payday = nextPayday(core.date);
    advanceCore(core, payday);
    const newSalary = paid.filter(
      (entry) => entry.sourceRef.id === `salary:${official.id}:${payday}`,
    );
    expect(
      newSalary,
      `${where}: one paycheck for the new service`,
    ).toHaveLength(1);
    expect(
      newSalary[0]!.postings.find(
        (post) => post.accountId === api.accounts().main(official.id),
      )?.deltaMinor,
      where,
    ).toBeGreaterThan(0);
    expect(core.jobs.get(oldJobId), where).toEqual(oldJob);
    console.log(
      JSON.stringify({
        phase: "returned",
        where,
        person: official.id,
        name: `${person.givenName} ${person.familyName}`,
        oldTerm: term.id,
        newTerm: newTerm.id,
        oldJob: oldJobId,
        newJob: next.jobId,
        payer: next.payerId,
        ended,
        returned,
        paycheck: newSalary[0],
      }),
    );
  } finally {
    setJournalTrace(null);
    setBookkeeping(previous);
  }
}, 600_000);
