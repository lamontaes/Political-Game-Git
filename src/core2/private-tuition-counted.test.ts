import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import tuition from "./data/opening-private-tuition.json";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import {
  countedSchoolFamilies,
  countedTuitionPlans,
  residentsRuntime,
} from "./modules/residents";
import { parameter as p } from "./parameters";
import { tuitionPlans } from "./private-tuition-reenroll";
import { fillInPerson } from "./state";
import type { CoreState } from "./types";

// Counted families enroll by the same yearly rule as full ones
// (core-private-tuition-counted).
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");

it(`counted families are ranked with full ones each August, pay the school as a purchase, and keep their tuition when filled in, seed ${seed}`, () => {
  setBookkeeping(false);
  const tried: string[] = [];
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const place = drawPlace(seed, `tuition-counted:${attempt}`);
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const state = core as CoreState;
    const rt = residentsRuntime(state)!;
    const where = `${place.name} [${place.key}], seed ${seed}`;
    const schools = [...state.organizations.values()].filter(
      (row) => row.classification === tuition.supplierClassification,
    );
    tried.push(where);
    if (!schools.length) continue;
    const schoolIds = new Set(schools.map((row) => row.id));
    const towns = new Set(schools.map((row) => row.placeId));
    const year = Number(core.date.slice(0, 4));
    advanceCore(core, makeIsoDate(`${year}-${tuition.reenrollOn}`));
    const families = countedSchoolFamilies(
      state,
      towns,
      p("openingSchoolAgeFirst"),
      p("openingSchoolAgeLast"),
    );
    const plans = countedTuitionPlans(state, schoolIds, tuition.contractKind);
    const enrolled = families.filter((row) => plans.has(row.householdId));
    const out = families.filter((row) => !plans.has(row.householdId));
    if (!enrolled.length || !out.length) continue;
    // The best-off per child enroll: the enrolled families hold more per
    // child than the ones left out, as full families do.
    const median = (rows: typeof families) =>
      rows.map((row) => row.cashPerChild).sort((a, b) => a - b)[
        Math.floor(rows.length / 2)
      ]!;
    expect(
      median(enrolled),
      `${where}: enrolled hold more per child`,
    ).toBeGreaterThanOrEqual(median(out));
    // Each pays a child's tuition times its children, as a part of the school's flow.
    const perChild = Math.round(
      (p("openingPrivateTuitionAnnualUsd") * p("minorPerDollar")) /
        p("monthsPerYear"),
    );
    for (const family of enrolled)
      expect(plans.get(family.householdId)!.monthlyMinor, where).toBe(
        family.children * perChild,
      );
    // The tuition is paid to the school from the counted groups.
    const school = plans.get(enrolled[0]!.householdId)!.schoolId;
    const flow = [...rt.flows.values()].find(
      (row) =>
        row.payeeId === school &&
        row.financeKind === tuition.contractKind &&
        !row.endedAt,
    )!;
    advanceCore(core, addDays(makeIsoDate(core.date), 45));
    expect(
      flow.lastPaidMinor ?? 0,
      `${where}: ${flow.id} was paid`,
    ).toBeGreaterThan(0);
    // Filling a family in leaves its enrollment and its tuition as they were.
    const before = plans.get(enrolled[0]!.householdId)!;
    const record =
      rt.store.households[rt.store.householdOf.get(enrolled[0]!.householdId)!]!;
    fillInPerson(state, rt.store.ids[rt.store.countedMembers(record)[0]!]!);
    // Its part became what its own living plan pays that school.
    const own = tuitionPlans(state).get(enrolled[0]!.householdId);
    expect(own, `${where}: the filled-in family pays the school`).toEqual(
      before,
    );
    expect(
      countedTuitionPlans(state, schoolIds, tuition.contractKind).has(
        enrolled[0]!.householdId,
      ),
      `${where}: its part left the merged flow`,
    ).toBe(false);
    expect(core.cashJournal.totals.grossDebitMinor).toBe(
      core.cashJournal.totals.grossCreditMinor,
    );
    return;
  }
  throw new Error(
    `no drawn town had a private school with enrolled and unenrolled counted families (${tried.join("; ")})`,
  );
}, 1_800_000);
