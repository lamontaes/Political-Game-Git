import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import {
  COVERAGE_MODULE_ID,
  countedCoverageOf,
  coverageOf,
  type CountedCoverageRow,
} from "./modules/coverage";
import { residentPerson } from "./modules/residents";
import { fillInPerson } from "./state";
import { coreAPI } from "./state";

// Counted households hold a coverage record and pay a premium by the same rule
// as a full person (people-coverage-counted).
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const place = drawPlace(seed, "health-coverage-counted");

it(`a counted household pays the premium a full household of its shape would, and filling it in changes nothing, in ${place.name} [${place.key}], seed ${seed}`, () => {
  setBookkeeping(false);
  const { core } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const api = coreAPI(core);
  const where = `${place.name} [${place.key}], seed ${seed}`;
  const rows = () =>
    (
      api
        .moduleState(COVERAGE_MODULE_ID)
        .table("countedCoverage")
        .rows() as unknown as CountedCoverageRow[]
    ).filter((row) => row.to === null);
  const opening = rows();
  expect(opening.length, `${where}: counted policies`).toBeGreaterThan(0);
  const single = api.parameter("healthWorkerContributionSingleAnnualUsd");
  const family = api.parameter("healthWorkerContributionFamilyAnnualUsd");
  for (const row of opening) {
    // The premium is the full person's rule: single for one covered, family for more.
    const usd = row.covered > 1 ? family : single;
    expect(row.premiumMonthlyMinor, `${where} ${row.id}`).toBe(
      Math.round(
        (usd * api.parameter("minorPerDollar")) /
          api.parameter("monthsPerYear"),
      ),
    );
    expect(
      residentPerson(core, row.holderId),
      `${where} ${row.id}`,
    ).toBeDefined();
  }
  // The first of next month each pays, once for each real household the record stands for.
  advanceCore(core, addDays(makeIsoDate(core.date), 14));
  const paid = rows().filter((row) => row.lastPaidMinor > 0);
  expect(paid.length, `${where}: counted premiums paid`).toBeGreaterThan(0);
  for (const row of paid)
    expect(row.lastDueMinor).toBe(row.premiumMonthlyMinor);
  expect(core.cashJournal.totals.grossDebitMinor).toBe(
    core.cashJournal.totals.grossCreditMinor,
  );
  // Fill a policyholder in: next review its holder holds a full record on
  // the same plan at the same premium, and the counted record ends.
  // A woman's plan does not move with the unemployment link (Cawley, Moriya
  // and Simon 2015), so her plan stays the same on the next review; a man's
  // may end with the web's factor, for a counted man the same as for a full one.
  const pick =
    paid.find(
      (row) => residentPerson(core, row.holderId)?.looks?.gender === "female",
    ) ?? paid[0]!;
  const before = pick.premiumMonthlyMinor;
  fillInPerson(core, pick.holderId);
  expect(core.people.has(pick.holderId), `${where}: filled in`).toBe(true);
  advanceCore(core, addDays(makeIsoDate(core.date), 30));
  expect(
    countedCoverageOf(api, pick.householdId),
    `${where}: the counted record ends once filled in`,
  ).toBeUndefined();
  const full = coverageOf(api, pick.holderId);
  const woman = core.people.get(pick.holderId)?.looks?.gender === "female";
  // Only a man's plan may end with the web's factor; a woman's stays the same.
  if (woman || full?.plan === "employer") {
    expect(full?.plan, `${where}: filled-in plan`).toBe("employer");
    expect(full?.holderId).toBe(pick.holderId);
    expect(full?.premiumMonthlyMinor, `${where}: filled-in premium`).toBe(
      before,
    );
  } else expect(full?.plan, `${where}: filled-in plan`).toBe("none");
}, 900_000);
