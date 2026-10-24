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
import { lastTuitionRanking, tuitionPlans } from "./private-tuition-reenroll";
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
    const startDate = core.date;
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
    // The ranking reads what families hold on the day it runs, so the test
    // keeps the list the engine ordered (kept while bookkeeping is on).
    setBookkeeping(true);
    advanceCore(core, addDays(makeIsoDate(`${year}-${tuition.reenrollOn}`), 1));
    setBookkeeping(false);
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
    // A full and a counted household are ranked on one list by cash per
    // child, so they enroll or stay out together: in a town, no full family
    // that holds more per child than an enrolled counted one is out, and no
    // counted family that holds more than an enrolled full one is out.
    const ranking = lastTuitionRanking(state);
    expect(ranking, `${where}: the August ranking was kept`).toBeDefined();
    // A full family pays the school through its living plan or, with no plan,
    // through a tuition contract.
    const fullPaying = new Set(tuitionPlans(state).keys());
    for (const contract of state.finance.contracts.values())
      if (
        !contract.endedAt &&
        contract.kind === tuition.contractKind &&
        schoolIds.has(contract.payeeId) &&
        contract.amountMinor > 0 &&
        contract.householdId
      )
        fullPaying.add(contract.householdId);
    const fullFamilies = ranking!
      .filter((row) => !row.counted)
      .map((row) => ({
        id: row.id,
        placeId: row.placeId,
        cash: row.cashPerChild,
      }));
    // A household that left the counts that day (moved, died, filled in)
    // cannot start a contract, so it is not a pair.
    const stillCounted = (id: string) => {
      const ix = rt.store.householdOf.get(id);
      return ix !== undefined && !rt.store.households[ix]!.gone;
    };
    const rankedCounted = ranking!
      .filter((row) => row.counted && stillCounted(row.id))
      .map((row) => ({
        householdId: row.id,
        placeId: row.placeId,
        cashPerChild: row.cashPerChild,
      }));
    const pairs: {
      fullId: string;
      countedId: string;
      gap: number;
      together: boolean;
    }[] = [];
    for (const full of fullFamilies)
      for (const counted of rankedCounted) {
        if (counted.placeId !== full.placeId) continue;
        const fullIn = fullPaying.has(full.id),
          countedIn = plans.has(counted.householdId);
        // The rule ranks by cash per child, then by id (a tie at the quota's
        // edge goes to the smaller id), so the ranking decides the pair.
        const fullFirst =
          full.cash > counted.cashPerChild ||
          (full.cash === counted.cashPerChild &&
            full.id.localeCompare(counted.householdId) < 0);
        const [firstIn, lastIn] = fullFirst
          ? [fullIn, countedIn]
          : [countedIn, fullIn];
        if (lastIn)
          expect(
            firstIn,
            `${where}: ${full.id} (${full.cash}) and ${counted.householdId} (${counted.cashPerChild}) rank on one list, so the one ranked first is in when the other is`,
          ).toBe(true);
        pairs.push({
          fullId: full.id,
          countedId: counted.householdId,
          gap: Math.abs(full.cash - counted.cashPerChild),
          together: fullIn === countedIn,
        });
      }
    // An exact pair: a full and a counted household in one town holding the
    // same cash per child, who are enrolled or left out together. A town with
    // none is passed over and named; the draw goes on.
    const exact = pairs.find((row) => row.gap === 0 && row.together);
    if (!exact) {
      tried[tried.length - 1] +=
        " (no full and counted household hold the same cash per child)";
      continue;
    }
    // The closest pair of one full and one counted household that enrolled
    // together and the closest that stayed out together both exist.
    const nearest = (enrolledTogether: boolean) =>
      pairs
        .filter(
          (row) =>
            row.together && plans.has(row.countedId) === enrolledTogether,
        )
        .sort((a, b) => a.gap - b.gap)[0];
    const inPair = nearest(true),
      outPair = nearest(false);
    expect(
      inPair,
      `${where}: a full and a counted household enrolled together`,
    ).toBeDefined();
    expect(
      outPair,
      `${where}: a full and a counted household stayed out together`,
    ).toBeDefined();
    process.stdout.write(
      `${where}: exact pair full ${exact.fullId} and counted ${exact.countedId} with the same cash per child ${plans.has(exact.countedId) ? "enrolled" : "stayed out"} together\n`,
    );
    process.stdout.write(
      `${where}: full ${inPair!.fullId} and counted ${inPair!.countedId} enrolled together (gap ${inPair!.gap.toFixed(2)} minor per child); full ${outPair!.fullId} and counted ${outPair!.countedId} stayed out together (gap ${outPair!.gap.toFixed(2)})\n`,
    );
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
    // The rest of the year, a day at a time as the game runs it: 365 days from the start.
    advanceCore(core, addDays(makeIsoDate(startDate), 365));
    expect(core.date, where).toBe(addDays(makeIsoDate(startDate), 365));
    expect(
      flow.lastPaidMinor ?? 0,
      `${where}: ${flow.id} was paid`,
    ).toBeGreaterThan(0);
    // The tuition reached the school's account as a journal record.
    const record0 = state.cashJournal.latestByOwner.get(school);
    expect(record0, `${where}: the school's journal record`).toBeDefined();
    process.stdout.write(
      `${where}: ${flow.id} paid school ${school}, journal record ${record0!.id}\n`,
    );
    // Filling a family in leaves its enrollment and its tuition as they were.
    const plansNow = countedTuitionPlans(
      state,
      schoolIds,
      tuition.contractKind,
    );
    const kept = enrolled.find((row) => plansNow.has(row.householdId));
    // A school can close in the year (its tuition flow ends "payee-closed")
    // and, with no other private school in town, its families have nowhere
    // to go. That town has no enrolled family left to fill in, so the next
    // drawn town is tried; any other loss of enrollment fails below.
    const closedSchool = (householdId: string) =>
      [...rt.flows.values()].some(
        (f) =>
          f.endedReason === "payee-closed" &&
          f.financeKind === tuition.contractKind &&
          (f.amountByContract?.[`hh:${householdId}`] ?? 0) > 0,
      );
    if (!kept && enrolled.every((row) => closedSchool(row.householdId))) {
      tried[tried.length - 1] +=
        " (its private school closed in the year; no enrolled family left to fill in)";
      continue;
    }
    expect(
      kept,
      `${where}: an enrolled counted family is still counted and enrolled at the year's end`,
    ).toBeDefined();
    const before = plansNow.get(kept!.householdId)!;
    const record =
      rt.store.households[rt.store.householdOf.get(kept!.householdId)!]!;
    fillInPerson(state, rt.store.ids[rt.store.countedMembers(record)[0]!]!);
    // Its part became what its own living plan pays that school.
    const own = tuitionPlans(state).get(kept!.householdId);
    expect(own, `${where}: the filled-in family pays the school`).toEqual(
      before,
    );
    expect(
      countedTuitionPlans(state, schoolIds, tuition.contractKind).has(
        kept!.householdId,
      ),
      `${where}: its part left the merged flow`,
    ).toBe(false);
    process.stdout.write(
      `${where}: filled in ${kept!.householdId}; its tuition stays ${own!.monthlyMinor} minor a month to ${own!.schoolId}\n`,
    );
    expect(core.cashJournal.totals.grossDebitMinor).toBe(
      core.cashJournal.totals.grossCreditMinor,
    );
    return;
  }
  throw new Error(
    `no drawn town had a private school with enrolled and unenrolled counted families (${tried.join("; ")})`,
  );
}, 1_800_000);
