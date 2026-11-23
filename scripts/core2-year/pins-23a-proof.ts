/**
 * Played-year proof for pins family 23, part A (coverage, premiums, the price
 * of care, collections): three drawn places, a year and two weeks each, so
 * the second January's rate is set from the plans' own claims. Prints one
 * line a month and the records a reader can open. One process, one place at a
 * time (heavy-runs).
 *
 *   node --max-old-space-size=8192 --import tsx scripts/core2-year/pins-23a-proof.ts <seed>
 */
import { randomBytes } from "node:crypto";
import { drawPlace } from "./place";
import { buildBenchWorld } from "../../src/bench/world";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { gameStartDate } from "../../src/core2/game-start";
import { makeIsoDate } from "../../src/core2/kernel/dates";
import { advanceCore } from "../../src/core2/life";
import type { MedicalBillRow } from "../../src/core2/medical-bills";
import {
  COVERAGE_MODULE_ID,
  employerPlansToday,
  planRateOf,
  type CountedCoverageRow,
  type CoverageRow,
} from "../../src/core2/modules/coverage";
import { coreAPI } from "../../src/core2/state";

const seed = process.argv[2] ?? randomBytes(8).toString("hex");
const PLACES = 3;
const MONTHS = 12;
const dollars = (minor: number) => "$" + (minor / 100).toFixed(2);

for (let at = 0; at < PLACES; at++) {
  const drawSeed = at === 0 ? seed : seed + ":" + at;
  const place = drawPlace(drawSeed, "pins-23a-proof");
  setBookkeeping(false);
  const started = Date.now();
  const { core } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const api = coreAPI(core);
  const where = place.name + " [" + place.key + "], seed " + drawSeed;
  console.log("\nPLACE " + where);
  const tables = api.moduleState(COVERAGE_MODULE_ID);
  const billRows = () =>
    tables.table("medicalBills").rows() as unknown as MedicalBillRow[];
  const line = () => {
    const plans = employerPlansToday(api)!;
    const rate = planRateOf(api)!;
    let people = 0,
      bill = 0,
      past = 0,
      sent = 0,
      unit = 0,
      weight = 0;
    for (const row of billRows()) {
      if (row.date.slice(0, 7) !== core.date.slice(0, 7)) continue;
      weight += row.weight;
      people += row.members.length * row.weight;
      bill += row.billMinor * row.weight;
      past += row.pastWaitMinor * row.weight;
      sent += row.toCollectionsMinor * row.weight;
      unit += row.careUnitMonthlyMinor * row.weight;
    }
    console.log(
      [
        core.date,
        "workers " + Math.round(plans.workers),
        "offered " + (plans.offered / plans.workers).toFixed(3),
        "hold " + (plans.held / plans.workers).toFixed(3),
        "lapsed " + Math.round(plans.lapsed),
        "rate " + rate.year + " " + dollars(rate.rateMonthlyMinor),
        "claim months " + rate.months.length,
        "care unit " + (weight ? dollars(unit / weight) : "-"),
        "bill a person " + (people ? dollars(bill / people) : "-"),
        "sent to collections " +
          (past ? (sent / past).toFixed(3) : "-") +
          " of past-wait",
      ].join(" | "),
    );
  };
  line();
  const year = Number(core.date.slice(0, 4));
  const stops = [
    ...Array.from(
      { length: MONTHS - 1 },
      (_, i) => year + "-" + String(i + 2).padStart(2, "0") + "-02",
    ),
    year + 1 + "-01-02",
    year + 1 + "-02-02",
  ];
  let before = planRateOf(api)!;
  for (const stop of stops) {
    advanceCore(core, makeIsoDate(stop));
    line();
    const rate = planRateOf(api)!;
    if (rate.year !== before.year) {
      // The new year's rate against the claims the row held when it was set.
      const missing = Math.max(0, MONTHS - before.months.length);
      let insurer = before.opening.insurerMinor * missing,
        members = before.opening.members * missing;
      for (const month of before.months) {
        insurer += month.insurerMinor;
        members += month.members;
      }
      const expected = Math.round(
        (insurer / members) * api.parameter("healthPlanLoad"),
      );
      console.log(
        "RATE SET " +
          rate.year +
          ": " +
          dollars(rate.rateMonthlyMinor) +
          " a covered person a month; the " +
          before.months.length +
          " months of claims before it give " +
          dollars(expected) +
          (rate.rateMonthlyMinor === expected ? " (equal)" : " (DIFFERENT)") +
          "; last year's was " +
          dollars(before.rateMonthlyMinor),
      );
    }
    before = rate;
  }
  const holder = (
    tables.table("coverage").rows() as unknown as CoverageRow[]
  ).find((row) => row.to === null && row.plan === "employer" && row.reasons);
  const counted = (
    tables.table("countedCoverage").rows() as unknown as CountedCoverageRow[]
  ).find((row) => row.to === null && row.reasons);
  const sentBill = billRows().find((row) => row.toCollectionsMinor > 0);
  const rate = planRateOf(api)!;
  console.log("RECORDS " + where);
  console.log(
    "  rate row: " +
      COVERAGE_MODULE_ID +
      '.planRate "rate" ' +
      JSON.stringify({
        year: rate.year,
        rateMonthlyMinor: rate.rateMonthlyMinor,
        claimsMonthlyMinor: rate.claimsMonthlyMinor,
        months: rate.months.length,
      }),
  );
  if (holder)
    console.log(
      "  full policy: " +
        holder.id +
        " premium " +
        dollars(holder.premiumMonthlyMinor) +
        " journal " +
        holder.lastJournalId +
        " reasons " +
        JSON.stringify(holder.reasons),
    );
  if (counted)
    console.log(
      "  counted policy: " +
        counted.id +
        " premium " +
        dollars(counted.premiumMonthlyMinor) +
        " reasons " +
        JSON.stringify(counted.reasons),
    );
  if (sentBill)
    console.log(
      "  bill sent to collections: " +
        sentBill.id +
        " income over poverty " +
        sentBill.incomeOverPoverty.toFixed(2) +
        " share " +
        sentBill.collectionsShare.toFixed(3) +
        " debt " +
        sentBill.debtId +
        " care unit " +
        dollars(sentBill.careUnitMonthlyMinor) +
        " from pay " +
        dollars(sentBill.carePayDailyMinor) +
        " a day",
    );
  console.log(
    "TIME " + where + ": " + Math.round((Date.now() - started) / 1000) + " s",
  );
}
