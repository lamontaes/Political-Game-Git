/**
 * Residents' spending that leaves the town (OPUS-CORE's request): each
 * place's wider population pays, monthly, the share of its income that its
 * county's own stores, restaurants, clinics and services can't supply, to
 * sellers outside the town. That share is each category's location quotient
 * shortfall (county jobs per resident against the nation's, County Business
 * Patterns 2023), weighted by the category's share of spending (BLS CEX).
 */
import countyRows from "../../data/tables/local-business-counts.json" with { type: "json" };
import employment from "../../data/tables/town-employment.json" with { type: "json" };
import { countyPopulationSharesForPlace } from "../simulation/government-units";
import { lifePlaceByKey } from "../simulation/life-places";
import { makeIsoDate } from "../simulation/dates";
import parameters from "./data/regional/outside-spending-parameters.json" with { type: "json" };
import type { Parameter } from "./parameters";
import type { ResidentFlowInput } from "./residents";
import type { CoreInput, OrganizationInput, Source } from "./types";

export const OUTSIDE_SPENDING_PARAMETERS = parameters as unknown as Readonly<
  Record<string, Parameter>
>;
const pv = (key: string) => OUTSIDE_SPENDING_PARAMETERS[key]!.value;
const CATEGORIES: readonly [string, readonly string[]][] = [
  ["outsideSpendingCexShareRetail", ["44"]],
  ["outsideSpendingCexShareFood", ["72"]],
  ["outsideSpendingCexShareHealth", ["62"]],
  ["outsideSpendingCexShareServices", ["81", "71"]],
];

function table(text: string): Map<string, string[]> {
  return new Map(
    text.split(";").map((row) => {
      const at = row.indexOf(":");
      return [row.slice(0, at), row.slice(at + 1).split(",")];
    }),
  );
}
const POPULATION = new Map(
  [...table(countyRows.COUNTY_BUSINESS_ROWS)].map(([fips, values]) => [
    fips,
    Number(values[0]),
  ]),
);
const SECTORS = employment.TOWN_EMPLOYMENT_META.sectors;
const SECTOR_JOBS = table(employment.COUNTY_SECTOR_EMPLOYMENT);

function jobsPerPerson(fipsList: Iterable<string>, codes: readonly string[]) {
  let jobs = 0,
    people = 0;
  for (const fips of fipsList) {
    const row = SECTOR_JOBS.get(fips),
      pop = POPULATION.get(fips) ?? 0;
    if (!row || !pop) continue;
    people += pop;
    for (const code of codes) jobs += Number(row[SECTORS.indexOf(code)] || 0);
  }
  return people ? jobs / people : 0;
}

/** The share of a county's residents' spending that goes to sellers outside it. */
export function leakShare(county: string): number {
  let leak = 0;
  for (const [key, codes] of CATEGORIES) {
    const nation = jobsPerPerson(SECTOR_JOBS.keys(), codes);
    const local = jobsPerPerson([county], codes);
    if (!nation) continue;
    leak += pv(key) * Math.max(0, 1 - local / nation);
  }
  return leak;
}

export function withOutsideSpending(input: CoreInput): CoreInput {
  const residents = input.residents;
  const place = input.placeMetadata?.placeKey
    ? lifePlaceByKey(input.placeMetadata.placeKey)
    : null;
  const geoid = place?.sourceGeoid ?? "";
  const county =
    geoid.length === "SSPPPPP".length
      ? [...countyPopulationSharesForPlace(geoid)].sort(
          (a, b) => (b[1] ?? 0) - (a[1] ?? 0),
        )[0]?.[0]
      : geoid;
  if (!residents || !county) return input;
  const share = leakShare(county);
  if (share <= 0) return input;
  const start = makeIsoDate(input.startedAt);
  const source: Source = {
    tag: "ESTIMATED",
    asOf: start,
    citation:
      "County Business Patterns 2023 location quotients for retail, food service, health and services; BLS Consumer Expenditure Survey 2023 shares.",
    estimatedFrom: `County ${county}: ${(share * 100).toFixed(1)} percent of residents' income goes to sellers outside the town.`,
  };
  const organizations: OrganizationInput[] = [];
  const flows: ResidentFlowInput[] = [];
  for (const account of residents.accounts) {
    // Monthly income into this place's wider population: its wages and awards.
    let monthly = 0;
    for (const flow of residents.flows) {
      if (
        flow.payeeId !== account.accountId ||
        (flow.kind !== "wages" && flow.kind !== "retirement")
      )
        continue;
      const perMonth =
        flow.cadence.kind === "days"
          ? (flow.amountMinor * 365) / 12 / flow.cadence.every
          : flow.amountMinor / flow.cadence.every;
      monthly += perMonth;
    }
    const amount = Math.round(monthly * share);
    if (amount <= 0) continue;
    // The place's outside account (the core's, when its firms sell outside), so the money leaves the town.
    const outsideId = `outside-market:${account.placeId}`;
    const sellers: OrganizationInput = input.organizations.find(
      (row) => row.id === outsideId,
    ) ?? {
      id: outsideId,
      placeId: account.placeId,
      name: "Sellers outside the town",
      kind: "outside-market",
      liquidMinor: 0,
      outsideFlow: source,
      source,
    };
    if (!input.organizations.includes(sellers)) organizations.push(sellers);
    const firstAt = new Date(`${start}T00:00:00.000Z`);
    firstAt.setUTCMonth(
      firstAt.getUTCMonth() + 1,
      pv("outsideSpendingDayOfMonth"),
    );
    flows.push({
      id: `outside-spending:${account.placeId}`,
      kind: "purchase",
      financeKind: "household.outside-purchase",
      payerId: account.accountId,
      payeeId: sellers.id,
      residentsId: account.accountId,
      placeId: account.placeId,
      amountMinor: amount,
      firstAt: makeIsoDate(firstAt.toISOString().slice(0, 10)),
      cadence: {
        kind: "months",
        every: 1,
        day: pv("outsideSpendingDayOfMonth"),
      },
      salesReceipt: false,
      marketAdjusted: false,
      source,
    });
  }
  return {
    ...input,
    organizations: [...input.organizations, ...organizations],
    residents: { ...residents, flows: [...residents.flows, ...flows] },
  };
}
