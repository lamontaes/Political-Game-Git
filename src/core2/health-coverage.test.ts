import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { outsideAccountOf } from "./budgets-treasury";
import { gameStartDate } from "./game-start";
import { makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { COVERAGE_MODULE_ID, type CoverageRow } from "./modules/coverage";
import { coreAPI } from "./state";

// Each full person holds a coverage record and the policyholder's premium is
// taken from each paycheck by the record (people-coverage-record-monthly-pass,
// premiums-from-pay). Pinned: Danville, Pennsylvania.
const place = { key: "4218136", name: "Danville, Pennsylvania" };
const seed = "cov-4218136";

it(`coverage records and a premium from each paycheck in ${place.name} [${place.key}], seed ${seed}`, () => {
  setBookkeeping(false);
  const { core } = buildBenchWorld(seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const api = coreAPI(core);
  const where = `${place.name} [${place.key}], seed ${seed}`;
  const rowsNow = () =>
    (
      api
        .moduleState(COVERAGE_MODULE_ID)
        .table("coverage")
        .rows() as unknown as CoverageRow[]
    ).filter((row) => row.to === null);
  // Every living full person who is not an office holder holds one current record.
  const people = [...core.people.values()].filter(
    (p) => p.alive && !p.id.startsWith("official:"),
  );
  const opening = new Map(rowsNow().map((row) => [row.personId, row]));
  expect(opening.size, where).toBe(people.length);
  const holders = [...opening.values()].filter(
    (row) => row.plan === "employer" && row.holderId === row.personId,
  );
  expect(holders.length, `${where}: policyholders`).toBeGreaterThan(0);
  // Dependents on a policy name their holder, who lives in their household and has a job.
  for (const row of opening.values())
    if (row.plan === "employer") {
      const holder = core.people.get(row.holderId!)!;
      expect(holder.householdId, `${where} ${row.id}`).toBe(row.householdId);
      expect(holder.jobId, `${where} ${row.id}`).toBeDefined();
    }

  // Each payday the holder's premium for the pay period goes from their own
  // account to the outside account, where the insurers are, by one journal
  // record per paycheck (premium:<paycheck>); an uncovered neighbor pays none.
  // Who holds a policy is read again on the 1st (an employer that shrinks
  // moves its workers down the ranking, and a household's policy goes to
  // whichever worker ranks first), so the paid holders are those the record
  // names, not the opening's.
  const premiums = new Map<
    string,
    { lines: { accountId: string; deltaMinor: number }[] }
  >();
  const post = api.postJournal.bind(api);
  api.postJournal = (entry) => {
    const result = post(entry);
    if (String(entry.sourceRef.id).startsWith("premium:"))
      premiums.set(entry.id, {
        lines: entry.postings.map((l) => ({
          accountId: l.accountId,
          deltaMinor: l.deltaMinor,
        })),
      });
    return result;
  };
  advanceCore(core, makeIsoDate("2025-03-15"));
  const paid = rowsNow().filter(
    (row) =>
      row.plan === "employer" &&
      row.holderId === row.personId &&
      row.lastPaidMinor > 0 &&
      premiums.has(row.lastJournalId ?? ""),
  );
  expect(paid.length, `${where}: premiums taken from pay`).toBeGreaterThan(0);
  const outside = outsideAccountOf(api)!;
  for (const row of paid) {
    // A pay period's part of the month's premium: under two months of it.
    expect(row.lastDueMinor, `${where} ${row.id}`).toBeGreaterThan(0);
    expect(row.lastDueMinor, `${where} ${row.id}`).toBeLessThan(
      2 * row.premiumMonthlyMinor,
    );
    expect(row.lastPaidMinor, `${where} ${row.id}`).toBeLessThanOrEqual(
      row.lastDueMinor,
    );
    // The journal record the row names moved what it says: the holder's own
    // account pays the outside account, to the minor unit.
    expect(
      premiums.get(row.lastJournalId!)?.lines,
      `${where} ${row.lastJournalId}`,
    ).toEqual(
      expect.arrayContaining([
        {
          accountId: api.accounts().main(row.personId),
          deltaMinor: -row.lastPaidMinor,
        },
        {
          accountId: api.accounts().main(outside),
          deltaMinor: row.lastPaidMinor,
        },
      ]),
    );
  }
  const uncovered = rowsNow().filter((row) => row.plan === "none");
  for (const row of uncovered) expect(row.lastDueMinor).toBe(0);
  process.stderr.write(
    `${where}: ${paid.length} holders paid from pay, ${premiums.size} premium entries\n`,
  );
}, 300_000);
