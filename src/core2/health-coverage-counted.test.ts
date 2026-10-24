import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
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
// as a full person (people-coverage-counted): one year of a drawn place, with
// the premiums read off the cash journal by record id, and households filled in
// part way through the year.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const place = drawPlace(seed, "health-coverage-counted");

interface Posting {
  /** The cash journal record, journal:<date>:<sequence>. */
  readonly journalId: string;
  /** What the outside account received in that one entry (the weighted amount for a counted household). */
  readonly paidMinor: number;
  /** The entry's postings sum to nothing. */
  readonly balanced: boolean;
  /** The real households the payer stood for when it paid. */
  readonly weight: number;
}

it(`a counted household pays the premium a full household of its shape pays, and filling it in changes nothing, in ${place.name} [${place.key}], seed ${seed}`, () => {
  setBookkeeping(false);
  const { core } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const api = coreAPI(core);
  const rt = residentsRuntime(core)!;
  const where = `${place.name} [${place.key}], seed ${seed}`;
  const start = core.date;
  const year = Number(start.slice(0, 4));

  // Every premium entry the world posts, by its source id (premium:<payer>:<date>).
  const posted = new Map<string, Posting>();
  const post = api.postJournal.bind(api);
  api.postJournal = (entry) => {
    const result = post(entry);
    const sourceId = String(entry.sourceRef.id);
    if (sourceId.startsWith("premium:")) {
      const payer = sourceId.split(":")[1]!;
      const household = rt.store.liveHousehold(payer);
      posted.set(sourceId, {
        journalId: entry.id,
        paidMinor: entry.postings
          .filter((line) => line.deltaMinor > 0)
          .reduce((n, line) => n + line.deltaMinor, 0),
        balanced: entry.postings.reduce((n, l) => n + l.deltaMinor, 0) === 0,
        weight: household ? rt.store.weightOf(household) : 1,
      });
    }
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
  const underMedicare = (householdId: string) =>
    (core.households.get(householdId)?.memberIds ?? []).filter((id) => {
      const person = core.people.get(id);
      return (
        person?.alive &&
        ageOnDate(makeIsoDate(person.birthDate), makeIsoDate(core.date)) <
          medicareAge
      );
    }).length;
  const paidInFull = (row: { lastDueMinor: number; lastPaidMinor: number }) =>
    row.lastDueMinor > 0 && row.lastPaidMinor === row.lastDueMinor;

  // The opening review gave counted households their policies, by the full
  // person's rule: single for one covered, family for more.
  const opening = counted();
  expect(opening.length, `${where}: counted policies`).toBeGreaterThan(0);
  const single = api.parameter("healthWorkerContributionSingleAnnualUsd");
  const family = api.parameter("healthWorkerContributionFamilyAnnualUsd");
  const perMonth = (usd: number) =>
    Math.round(
      (usd * api.parameter("minorPerDollar")) / api.parameter("monthsPerYear"),
    );
  for (const row of opening)
    expect(row.premiumMonthlyMinor, `${where} ${row.id}`).toBe(
      perMonth(row.covered > 1 ? family : single),
    );

  // Five months in, the day before the 1st: each household that holds a policy
  // has paid on the 1st by a journal record.
  const fillDay = makeIsoDate(`${year}-06-30`);
  const lastPayday = `${year}-06-01`;
  advanceCore(core, fillDay);
  const paidCounted = counted()
    .filter(paidInFull)
    .sort((a, b) => a.householdId.localeCompare(b.householdId));
  const paidFull = full().filter(
    (row) =>
      row.plan === "employer" &&
      row.holderId === row.personId &&
      paidInFull(row),
  );
  expect(paidCounted.length, `${where}: counted premiums paid`).toBeGreaterThan(
    0,
  );
  expect(paidFull.length, `${where}: full premiums paid`).toBeGreaterThan(0);

  // The named household: a counted household with an employed adult, whose
  // premium on the 1st sits in the journal beside a full household's of the
  // same shape (the same number of people on the policy).
  const twinOf = (covered: number) =>
    paidFull.find(
      (f) =>
        underMedicare(f.householdId) === covered &&
        posted.has(`premium:${f.personId}:${lastPayday}`),
    );
  const named = paidCounted.find(
    (row) =>
      posted.has(`premium:${row.householdId}:${lastPayday}`) &&
      twinOf(row.covered) !== undefined,
  );
  expect(
    named,
    `${where}: a counted household with a full household of its shape`,
  ).toBeDefined();
  const countedPosting = posted.get(
    `premium:${named!.householdId}:${lastPayday}`,
  )!;
  const twin = twinOf(named!.covered)!;
  const fullPosting = posted.get(`premium:${twin.personId}:${lastPayday}`)!;
  // The counted entry is the full household's, times the households it stands for.
  expect(countedPosting.balanced, `${where} ${countedPosting.journalId}`).toBe(
    true,
  );
  expect(fullPosting.balanced, `${where} ${fullPosting.journalId}`).toBe(true);
  expect(
    countedPosting.paidMinor,
    `${where}: ${countedPosting.journalId} (counted ${named!.householdId}) against ${fullPosting.journalId} (full ${twin.personId})`,
  ).toBe(Math.round(fullPosting.paidMinor * countedPosting.weight));
  expect(
    Math.round(countedPosting.paidMinor / countedPosting.weight),
    `${where}: one counted household pays what a full household of its shape pays`,
  ).toBe(fullPosting.paidMinor);
  expect(twin.lastJournalId, `${where} ${twin.id}`).toBe(fullPosting.journalId);

  // Fill the named household in with others, the day before the next 1st: the
  // counted record ends the same day and its people hold full records on the
  // plan, policyholder and premium it said.
  const handed = [
    named!,
    ...paidCounted.filter((row) => row !== named).slice(0, 9),
  ].map((row) => ({
    record: row,
    members: rt.store.memberIdsOf(rt.store.liveHousehold(row.householdId)!),
    weight: posted.get(`premium:${row.householdId}:${lastPayday}`)?.weight ?? 1,
    paidMinor:
      posted.get(`premium:${row.householdId}:${lastPayday}`)?.paidMinor ?? 0,
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
    for (const id of h.members) {
      const record = coverageOf(api, id);
      const age = ageOnDate(
        makeIsoDate(core.people.get(id)!.birthDate),
        makeIsoDate(core.date),
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

  // The 1st: they pay as full households. A policy still in force pays what the
  // counted household paid for one household, by its own journal record.
  const nextPayday = `${year}-07-01`;
  advanceCore(core, makeIsoDate(nextPayday));
  const continuing = handed.filter(
    (h) =>
      coverageOf(api, h.record.holderId)?.id ===
      `coverage:${h.record.holderId}:${fillDay}`,
  );
  expect(
    continuing.length,
    `${where}: policies handed over that are still in force on the 1st`,
  ).toBeGreaterThan(0);
  let inFull = 0;
  for (const h of continuing) {
    const row = coverageOf(api, h.record.holderId)!;
    const posting = posted.get(`premium:${h.record.holderId}:${nextPayday}`);
    const label = `${where} ${row.id}`;
    // The premium due is the counted household's, to the minor unit.
    expect(row.lastDueMinor, `${label}: premium due`).toBe(
      h.record.premiumMonthlyMinor,
    );
    expect(row.premiumMonthlyMinor, label).toBe(h.record.premiumMonthlyMinor);
    // It pays what it holds, up to that, by one journal record; a household
    // that pays in full pays what the counted household paid for one.
    expect(row.lastPaidMinor, label).toBeLessThanOrEqual(row.lastDueMinor);
    if (row.lastPaidMinor === 0) {
      expect(posting, label).toBeUndefined();
      continue;
    }
    expect(posting, `${label}: premium on ${nextPayday}`).toBeDefined();
    expect(row.lastJournalId, label).toBe(posting!.journalId);
    expect(posting!.paidMinor, label).toBe(row.lastPaidMinor);
    if (row.lastPaidMinor === row.lastDueMinor) {
      inFull++;
      expect(
        posting!.paidMinor,
        `${where}: ${posting!.journalId} (filled in ${h.record.holderId}) against ${posted.get(`premium:${h.record.householdId}:${lastPayday}`)!.journalId} (counted ${h.record.householdId})`,
      ).toBe(Math.round(h.paidMinor / h.weight));
    }
  }

  // The rest of the year.
  advanceCore(core, addDays(makeIsoDate(start), 365));
  expect(core.cashJournal.totals.grossDebitMinor).toBe(
    core.cashJournal.totals.grossCreditMinor,
  );
  const unbalanced = [...posted].filter(([, row]) => !row.balanced);
  expect(unbalanced, `${where}: unbalanced premium entries`).toEqual([]);
  // No one is on both tiers' books: a household with a counted policy holds no full one.
  for (const row of counted())
    for (const id of core.households.get(row.householdId)?.memberIds ?? [])
      expect(
        coverageOf(api, id)?.plan,
        `${where}: ${id} in counted ${row.householdId}`,
      ).not.toBe("employer");
  console.log(
    JSON.stringify({
      where,
      named: named!.householdId,
      countedEntry: countedPosting.journalId,
      countedPaidMinor: countedPosting.paidMinor,
      countedWeight: countedPosting.weight,
      fullHousehold: twin.personId,
      fullEntry: fullPosting.journalId,
      fullPaidMinor: fullPosting.paidMinor,
      filledIn: handed.length,
      stillInForce: continuing.length,
      paidInFullAfterFillIn: inFull,
      handedOverEntries: continuing.map(
        (h) =>
          posted.get(`premium:${h.record.holderId}:${nextPayday}`)?.journalId ??
          null,
      ),
      countedPremiumEntriesInYear: [...posted.keys()].filter((id) =>
        id.startsWith("premium:household_"),
      ).length,
    }),
  );
}, 3_600_000);

// One model, two tiers: ranking by an employer's size counts a counted job as
// many jobs as the households its record stands for. A drawn place opened with
// every counted household standing for three.
it(`an employer's staff counts each counted job times its household's weight, in ${place.name} [${place.key}], seed ${seed}`, () => {
  setBookkeeping(false);
  const { core } = buildBenchWorld(place.seed, gameStartDate(), {
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
