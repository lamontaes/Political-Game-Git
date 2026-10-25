/**
 * Who is poor, from incomes: every household in a place (the named people's
 * and the counted residents', each counted record standing for its weight)
 * has a yearly cash income (pay plus recorded awards) and a Census poverty
 * threshold for its size, its children and its eldest member. A person is
 * poor when their household's income is under its threshold. World-metrics
 * records the share monthly; the outcome web reads that record.
 */
import thresholds from "./data/world-metrics/poverty-thresholds-2024.json" with { type: "json" };
import { ageOnDate, makeIsoDate } from "./kernel/dates";
import { ageOn, type HouseholdKind } from "./counted-groups";
import { householdIncome, residentsRuntime } from "./modules/residents";
import type { CoreState } from "./types";

const T = thresholds as unknown as {
  minorPerDollar: number;
  adultAgeFrom: number;
  elderAgeFrom: number;
  onePerson: { under65: number; from65: number };
  twoPeople: { under65: number[]; from65: number[] };
  bySize: Record<string, number[]>;
};

/** The official line, in minor units a year, for a household. */
export function povertyThresholdMinor(
  size: number,
  children: number,
  eldestAge: number,
): number {
  const elder = eldestAge >= T.elderAgeFrom;
  const kids = Math.max(0, Math.min(children, size - 1));
  let dollars: number;
  if (size <= 1) dollars = elder ? T.onePerson.from65 : T.onePerson.under65;
  else if (size === 2) {
    const row = elder ? T.twoPeople.from65 : T.twoPeople.under65;
    dollars = row[Math.min(kids, row.length - 1)]!;
  } else {
    const row = T.bySize[String(Math.min(size, 9))]!;
    dollars = row[Math.min(kids, row.length - 1)]!;
  }
  return dollars * T.minorPerDollar;
}

export interface HouseholdPoverty {
  readonly householdId: string;
  readonly placeId: string;
  readonly named: boolean;
  readonly size: number;
  readonly children: number;
  readonly eldestAge: number;
  readonly kind: HouseholdKind;
  readonly incomeMinor: number;
  readonly thresholdMinor: number;
  readonly poor: boolean;
  /** Real households this record stands for. */
  readonly weight: number;
}

/** Every household's income against its line today, named and counted. */
export function householdPoverty(core: CoreState): HouseholdPoverty[] {
  const out: HouseholdPoverty[] = [];
  const date = makeIsoDate(core.date);
  const add = (
    householdId: string,
    placeId: string,
    named: boolean,
    ages: readonly number[],
    incomeMinor: number,
    weight: number,
  ) => {
    if (!ages.length) return;
    const children = ages.filter((a) => a < T.adultAgeFrom).length;
    const eldestAge = Math.max(...ages);
    const adults = ages.length - children;
    const thresholdMinor = povertyThresholdMinor(
      ages.length,
      children,
      eldestAge,
    );
    out.push({
      householdId,
      placeId,
      named,
      size: ages.length,
      children,
      eldestAge,
      kind:
        children > 0 ? "with-children" : adults <= 1 ? "one-adult" : "adults",
      incomeMinor,
      thresholdMinor,
      poor: incomeMinor < thresholdMinor,
      weight,
    });
  };
  // Named households: their members' jobs and the awards paid to them.
  const awards = new Map<string, number>();
  for (const contract of core.finance.contracts.values()) {
    if (contract.endedAt || !contract.recipientIncome) continue;
    const id = contract.recipientIncome.householdId;
    awards.set(
      id,
      (awards.get(id) ?? 0) +
        (contract.amountMinor * 12) / Math.max(1, contract.periodMonths),
    );
  }
  for (const household of core.households.values()) {
    const ages: number[] = [];
    let income = awards.get(household.id) ?? 0;
    for (const id of household.memberIds) {
      const person = core.people.get(id);
      if (!person?.alive) continue;
      ages.push(ageOnDate(makeIsoDate(person.birthDate), date));
      const job = person.jobId ? core.jobs.get(person.jobId) : undefined;
      if (job && job.endsAt === undefined) income += job.wageDailyMinor * 365;
    }
    add(household.id, household.placeId, true, ages, income, 1);
  }
  // Counted residents: the same line on each record, times its weight.
  const rt = residentsRuntime(core);
  if (rt)
    for (const h of rt.store.liveHouseholds()) {
      const ages = rt.store
        .countedMembers(h)
        .map((m) => ageOn(rt.store.born[m]!, core.date));
      add(
        h.id,
        h.placeId,
        false,
        ages,
        householdIncome(rt, h),
        rt.store.weightOf(h),
      );
    }
  return out;
}

/** Each place's share of people living in a household under its line. */
export function povertyByPlace(
  core: CoreState,
): Map<string, { people: number; poor: number }> {
  const out = new Map<string, { people: number; poor: number }>();
  for (const row of householdPoverty(core)) {
    const at = out.get(row.placeId) ?? { people: 0, poor: 0 };
    at.people += row.size * row.weight;
    if (row.poor) at.poor += row.size * row.weight;
    out.set(row.placeId, at);
  }
  return out;
}
