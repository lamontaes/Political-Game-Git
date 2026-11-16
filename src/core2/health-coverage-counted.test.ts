import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { outsideAccountOf } from "./budgets-treasury";
import { gameStartDate } from "./game-start";
import { addDays, ageOnDate, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import {
  COVERAGE_MODULE_ID,
  countedCoverageOf,
  coverageOf,
  staffOf,
  type CountedCoverageRow,
  type CoverageRow,
} from "./modules/coverage";
import { countedJob, residentsRuntime } from "./modules/residents";
import { coreAPI, fillInPerson } from "./state";

// Counted households hold a coverage record and pay a premium by the same rule
// as a full person (people-coverage-counted): the premium is set by the same
// table, taken from the pay that carries the policy (a counted wage flow's
// payment, premiums-from-pay), and a household filled in part way through the
// year keeps its plan and pays from its own paychecks. Pinned: Danville,
// Pennsylvania.
const place = { key: "4218136", name: "Danville, Pennsylvania" };
const seed = "cov-4218136";

it(`a counted household pays the premium a full household of its shape pays, and filling it in changes nothing, in ${place.name} [${place.key}], seed ${seed}`, () => {
  setBookkeeping(false);
  const { core } = buildBenchWorld(seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const api = coreAPI(core);
  const rt = residentsRuntime(core)!;
  const where = `${place.name} [${place.key}], seed ${seed}`;
  const start = core.date;
  const year = Number(start.slice(0, 4));
  const outside = api.accounts().main(outsideAccountOf(api)!);

  // Every premium entry the world posts: a counted wage flow's by its payment
  // (<payment>:health.premium), a full worker's by the paycheck (premium:<paycheck>).
  const countedEntries: {
    journalId: string;
    balanced: boolean;
    toOutside: number;
  }[] = [];
  const fullEntries = new Map<
    string,
    { accountId: string; deltaMinor: number }[]
  >();
  const post = api.postJournal.bind(api);
  api.postJournal = (entry) => {
    const result = post(entry);
    const sourceId = String(entry.sourceRef.id);
    if (sourceId.endsWith(":health.premium"))
      countedEntries.push({
        journalId: entry.id,
        balanced: entry.postings.reduce((n, l) => n + l.deltaMinor, 0) === 0,
        toOutside: entry.postings
          .filter((l) => l.accountId === outside)
          .reduce((n, l) => n + l.deltaMinor, 0),
      });
    else if (sourceId.startsWith("premium:"))
      fullEntries.set(
        entry.id,
        entry.postings.map((l) => ({
          accountId: l.accountId,
          deltaMinor: l.deltaMinor,
        })),
      );
    return result;
  };

  const counted = () =>
    (
      api
        .moduleState(COVERAGE_MODULE_ID)
        .table("countedCoverage")
        .rows() as unknown as CountedCoverageRow[]
    ).filter((row) => row.to === null);
  const full = () =>
    (
      api
        .moduleState(COVERAGE_MODULE_ID)
        .table("coverage")
        .rows() as unknown as CoverageRow[]
    ).filter((row) => row.to === null);
  const medicareAge = api.parameter("healthMedicareAge");
  const single = api.parameter("healthWorkerContributionSingleAnnualUsd");
  const family = api.parameter("healthWorkerContributionFamilyAnnualUsd");
  const perMonth = (usd: number) =>
    Math.round(
      (usd * api.parameter("minorPerDollar")) / api.parameter("monthsPerYear"),
    );

  // The opening review gave counted households their policies by the full
  // person's rule, single for one covered and family for more, and full
  // policyholders theirs by the same table: a counted household pays what a
  // full household of its shape pays, times the households it stands for.
  const opening = counted();
  expect(opening.length, `${where}: counted policies`).toBeGreaterThan(0);
  for (const row of opening)
    expect(row.premiumMonthlyMinor, `${where} ${row.id}`).toBe(
      perMonth(row.covered > 1 ? family : single),
    );
  const fullOpening = full();
  const onPolicy = (holderId: string) =>
    fullOpening.filter(
      (row) => row.plan === "employer" && row.holderId === holderId,
    ).length;
  const fullHolders = fullOpening.filter(
    (row) => row.plan === "employer" && row.holderId === row.personId,
  );
  expect(fullHolders.length, `${where}: full policies`).toBeGreaterThan(0);
  for (const row of fullHolders)
    expect(row.premiumMonthlyMinor, `${where} ${row.id}`).toBe(
      perMonth(onPolicy(row.personId) > 1 ? family : single),
    );

  // Five months in, the day before the 1st of July: the counted wage flows'
  // paydays took the premiums, each by a balanced entry to the outside account.
  const fillDay = makeIsoDate(`${year}-06-30`);
  advanceCore(core, fillDay);
  expect(
    countedEntries.length,
    `${where}: counted premium entries`,
  ).toBeGreaterThan(0);
  for (const entry of countedEntries) {
    expect(entry.balanced, `${where} ${entry.journalId}`).toBe(true);
    expect(entry.toOutside, `${where} ${entry.journalId}`).toBeGreaterThan(0);
  }
  const inGoodStanding = counted()
    .filter(
      (row) =>
        row.premiumMonthlyMinor > 0 && row.lastPaidMinor >= row.lastDueMinor,
    )
    .sort((a, b) => a.householdId.localeCompare(b.householdId));
  expect(
    inGoodStanding.length,
    `${where}: counted policies paid up`,
  ).toBeGreaterThan(0);

  // Fill ten households in, the day before the next 1st: the counted record
  // ends the same day and its people hold full records on the plan,
  // policyholder and premium it said.
  const handed = inGoodStanding.slice(0, 10).map((row) => ({
    record: row,
    members: rt.store.memberIdsOf(rt.store.liveHousehold(row.householdId)!),
  }));
  const withoutPolicy = [...rt.store.liveHouseholds()]
    .filter((h) => !countedCoverageOf(api, h.id) && rt.store.countedCount(h))
    .slice(0, 3)
    .map((h) => ({ id: h.id, members: rt.store.memberIdsOf(h) }));
  expect(withoutPolicy.length, `${where}: households with no policy`).toBe(3);
  for (const h of handed) fillInPerson(core, h.record.holderId);
  for (const h of withoutPolicy) fillInPerson(core, h.members[0]!);
  for (const h of handed) {
    const label = `${where} ${h.record.id}`;
    expect(countedCoverageOf(api, h.record.householdId), label).toBeUndefined();
    const holder = coverageOf(api, h.record.holderId);
    expect(holder?.plan, `${label}: the filled-in holder's plan`).toBe(
      "employer",
    );
    expect(holder?.holderId, label).toBe(h.record.holderId);
    expect(holder?.premiumMonthlyMinor, `${label}: premium`).toBe(
      h.record.premiumMonthlyMinor,
    );
    expect(holder?.id, label).toBe(`coverage:${h.record.holderId}:${fillDay}`);
    // Ages as of the last review, when the counted record was set: someone who
    // has turned 65 since keeps the plan until the next review, as a full person does.
    for (const id of h.members) {
      const record = coverageOf(api, id);
      const age = ageOnDate(
        makeIsoDate(core.people.get(id)!.birthDate),
        makeIsoDate(`${year}-06-01`),
      );
      expect(record?.plan, `${label}: ${id}`).toBe(
        age >= medicareAge ? "medicare" : "employer",
      );
      if (age < medicareAge)
        expect(record?.holderId, `${label}: ${id}`).toBe(h.record.holderId);
    }
  }
  for (const h of withoutPolicy)
    for (const id of h.members) {
      const record = coverageOf(api, id);
      expect(
        record,
        `${where} ${h.id}: ${id} holds a record at once`,
      ).toBeDefined();
      expect(record?.plan, `${where} ${h.id}: ${id}`).not.toBe("employer");
    }

  // Through July: a handed household that still holds a policy pays it from
  // the holder's own paychecks, by a journal record from their account.
  const monthEnd = makeIsoDate(`${year}-07-31`);
  advanceCore(core, monthEnd);
  const continuing = handed.flatMap((h) => {
    const row = (core.households.get(h.record.householdId)?.memberIds ?? [])
      .map((id) => coverageOf(api, id))
      .find(
        (held) => held?.plan === "employer" && held.holderId === held.personId,
      );
    return row ? [{ ...h, row }] : [];
  });
  expect(
    continuing.length,
    `${where}: households handed a policy that still hold one in July`,
  ).toBeGreaterThan(0);
  let fromPay = 0;
  for (const { row } of continuing) {
    const label = `${where} ${row.id}`;
    expect(row.lastPaidMinor, label).toBeLessThanOrEqual(row.lastDueMinor);
    const lines = fullEntries.get(row.lastJournalId ?? "");
    if (!lines) continue;
    fromPay++;
    expect(row.lastDueMinor, label).toBeLessThan(2 * row.premiumMonthlyMinor);
    expect(lines, `${label} ${row.lastJournalId}`).toEqual(
      expect.arrayContaining([
        {
          accountId: api.accounts().main(row.personId),
          deltaMinor: -row.lastPaidMinor,
        },
        { accountId: outside, deltaMinor: row.lastPaidMinor },
      ]),
    );
  }
  expect(
    fromPay,
    `${where}: handed holders who paid from their own pay`,
  ).toBeGreaterThan(0);

  // The rest of the year.
  advanceCore(core, addDays(makeIsoDate(start), 365));
  expect(core.cashJournal.totals.grossDebitMinor).toBe(
    core.cashJournal.totals.grossCreditMinor,
  );
  for (const entry of countedEntries)
    expect(entry.balanced, `${where} ${entry.journalId}`).toBe(true);
  // No one is on both tiers' books: a household with a counted policy holds no full one.
  for (const row of counted())
    for (const id of core.households.get(row.householdId)?.memberIds ?? [])
      expect(
        coverageOf(api, id)?.plan,
        `${where}: ${id} in counted ${row.householdId}`,
      ).not.toBe("employer");
  process.stderr.write(
    `${JSON.stringify({
      where,
      countedPremiumEntries: countedEntries.length,
      paidUpInJune: inGoodStanding.length,
      filledIn: handed.length,
      stillInForce: continuing.length,
      paidFromOwnPay: fromPay,
    })}\n`,
  );
}, 300_000);

// One model, two tiers: ranking by an employer's size counts a counted job as
// many jobs as the households its record stands for. A drawn place opened with
// every counted household standing for three.
it(`an employer's staff counts each counted job times its household's weight, in ${place.name} [${place.key}], seed ${seed}`, () => {
  setBookkeeping(false);
  const { core } = buildBenchWorld(seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
    countScale: 3,
  });
  const api = coreAPI(core);
  const rt = residentsRuntime(core)!;
  const where = `${place.name} [${place.key}], seed ${seed}`;
  const expected = new Map<string, number>();
  const add = (id: string, n: number) =>
    expected.set(id, (expected.get(id) ?? 0) + n);
  for (const job of core.jobs.values())
    if (job.endsAt === undefined) add(job.organizationId, 1);
  let records = 0;
  for (const h of rt.store.liveHouseholds())
    for (const job of h.jobs)
      if (job.endsAt === undefined && countedJob(core, job.id)) {
        add(job.organizationId, rt.store.weightOf(h));
        records++;
      }
  expect(records, `${where}: counted jobs`).toBeGreaterThan(0);
  const staff = staffOf(api);
  expect(staff.size, where).toBe(expected.size);
  for (const [id, jobs] of expected)
    expect(staff.get(id), `${where} ${id}`).toBeCloseTo(jobs, 6);
  // Standing for three, the counted jobs are worth well over their records.
  const total = [...staff.values()].reduce((n, v) => n + v, 0);
  const fullJobs = [...core.jobs.values()].filter(
    (job) => job.endsAt === undefined,
  ).length;
  expect(total - fullJobs, `${where}: counted jobs, weighted`).toBeGreaterThan(
    records * 2,
  );
}, 900_000);
