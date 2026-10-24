/**
 * The opening's customers and public buyers in one played year: the place and
 * seed, each researched band (read from the parameter table and the research
 * files) and where the town landed, counted from records and named by id.
 * Run: node --max-old-space-size=6144 --import tsx scripts/research/opening-customers-year.ts [seed]
 * OPENING_ONLY=1 stops after the opening records.
 */
import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { buildBenchWorld } from "../../src/bench/world";
import { DevMode } from "../../src/bench/dev-mode";
import { BenchPlayer } from "../../src/bench/player";
import { gameStartDate } from "../../src/core2/game-start";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { coreAPI } from "../../src/core2/state";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";
import type { CoreInput } from "../../src/core2/types";

interface Spread {
  low: number;
  high: number;
  unit: string;
}
interface Row {
  value: number;
  tag: string;
  spread?: Spread | { status: string; reason: string };
}
const parameters = JSON.parse(
  readFileSync("src/core2/data/parameters.json", "utf8"),
) as Record<string, Row>;
const governmentBuildings = JSON.parse(
  readFileSync(
    "data/research/core/census-2022-local-public-buildings-by-government-type.json",
    "utf8",
  ),
) as {
  national: { countyShareOfCurrentOperations: number };
  places: Record<string, { countyShareOfCurrentOperations: number }>;
};
const countyContinuity = JSON.parse(
  readFileSync(
    "data/research/core/census-gus-2021-county-identity-continuity.json",
    "utf8",
  ),
) as {
  national: { counties2017: number; matched2021: number; counties2022: number };
  places: Record<string, { continuityShare: number; tag: string }>;
};
const outsideBuyers = JSON.parse(
  readFileSync(
    "data/research/core/bea-2023-use-summary-buyer-shares.json",
    "utf8",
  ),
) as {
  classifications: Record<
    string,
    { commodities: string[]; shares: Record<string, number> }
  >;
};

const band = (key: string): string => {
  const row = parameters[key]!;
  return row.spread && "low" in row.spread
    ? `${row.value} ${row.tag} [${row.spread.low}, ${row.spread.high}] ${row.spread.unit}`
    : `${row.value} ${row.tag}${row.spread ? " (spread unmeasured)" : ""}`;
};

setBookkeeping(false);
const seed = process.argv[2] ?? randomBytes(6).toString("hex");
let opening: CoreInput | undefined;
const world = buildBenchWorld(seed, gameStartDate(), {
  twoLevel: true,
  onOpening: (input) => {
    opening = input;
  },
});
const core = world.core;
const api = coreAPI(core);
console.log(
  `${world.place.displayName} (${world.placeId}), seed ${seed}, ${core.people.size} full people`,
);
if (!opening) throw new Error("The bench world gave no opening input.");

// Opening household service agreements: full households hold contracts,
// counted households hold resident flows that keep each household's amount.
const householdKinds = new Map<
  string,
  { households: Set<string>; monthly: number }
>();
const add = (kind: string, householdId: string, monthly: number) => {
  const row = householdKinds.get(kind) ?? {
    households: new Set<string>(),
    monthly: 0,
  };
  row.households.add(householdId);
  row.monthly += monthly;
  householdKinds.set(kind, row);
};
const householdOf = (contractId: string) =>
  /:household:([^:]+):/.exec(contractId)?.[1] ?? contractId;
const contracts = opening.finance?.contracts ?? [];
for (const contract of contracts)
  if (contract.kind.startsWith("household.customer."))
    add(
      contract.kind,
      contract.householdId ?? householdOf(contract.id),
      contract.amountMinor / contract.periodMonths,
    );
const flows = (opening.residents?.flows ?? []) as unknown as {
  id: string;
  financeKind?: string;
  amountMinor: number;
  amountByContract?: Record<string, number>;
}[];
for (const flow of flows)
  if (flow.financeKind?.startsWith("household.customer."))
    for (const [contractId, monthly] of Object.entries(
      flow.amountByContract ?? {},
    ))
      add(flow.financeKind, householdOf(contractId), monthly);
console.log(
  "\nHousehold services at the opening (full households' contracts and counted households' flows):",
);
const services = (
  JSON.parse(readFileSync("src/core2/data/opening-customers.json", "utf8")) as {
    householdServices: {
      contractKind: string;
      componentAnnualParameter: string;
    }[];
  }
).householdServices;
for (const [kind, row] of [...householdKinds].sort()) {
  const component = services.find(
    (service) => service.contractKind === kind,
  )?.componentAnnualParameter;
  console.log(
    `  ${kind}: ${row.households.size} households, $${((row.monthly * 12) / 100 / Math.max(1, row.households.size)).toFixed(0)} a year each (CEX national component mean ${component ? `$${parameters[component]!.value} ${parameters[component]!.tag}` : "n/a"}; each budget is capped by the household's living-cost plan), first contract ${contracts.find((c) => c.kind === kind)?.id ?? flows.find((f) => f.financeKind === kind)?.id}`,
  );
}
console.log(
  `  CEX household-size top code: ${band("openingCustomerSizeTopCode")} (a household of that size or more takes the published five-or-more column)`,
);
console.log(
  `  billing period: ${band("openingCustomerPeriodMonths")} months; prior-agreement lead: ${band("openingCustomerAgreementLeadDays")} days (calendar conventions, no band)`,
);

// Opening public custodial budgets, from the facts saved on each buyer.
interface Agreement {
  id: string;
  buyerAccountId: string;
  supplierIds: string[];
  contractIds: string[];
  monthlyBudgetMinor?: number;
}
const publicRows: string[] = [];
const representedCounts: number[] = [];
let monthlyTotal = 0;
for (const organization of opening.organizations) {
  for (const [key, value] of Object.entries(
    organization.governmentFacts ?? {},
  )) {
    if (!key.startsWith("openingCustomers.agreement:")) continue;
    const agreement = JSON.parse(value) as Agreement;
    const appropriation = JSON.parse(
      organization.governmentFacts![
        key.replace(".agreement:", ".appropriation:")
      ] ?? "{}",
    ) as {
      monthlyBudgetMinor?: number;
      coveredOriginalResidentCount?: number;
      sourcePriorKey?: string;
    };
    monthlyTotal += appropriation.monthlyBudgetMinor ?? 0;
    representedCounts.push(appropriation.coveredOriginalResidentCount ?? 0);
    publicRows.push(
      `  ${agreement.id}: buyer ${organization.id} (${organization.classification}), ${appropriation.coveredOriginalResidentCount ?? "?"} represented residents, prior ${appropriation.sourcePriorKey}, $${(((appropriation.monthlyBudgetMinor ?? 0) * 12) / 100).toFixed(0)} a year, suppliers ${agreement.supplierIds.join(", ") || "none"}`,
    );
  }
}
const stateKey = (world.place.stateJurisdictionKey ?? "US").replace("-", "_");
const priorKey = parameters[`openingCustomerLocalBuildingTotalUsd_${stateKey}`]
  ? stateKey
  : "US";
const perResident =
  parameters[`openingCustomerLocalBuildingTotalUsd_${priorKey}`]!.value /
  parameters[`openingCustomerPopulation2023_${priorKey}`]!.value;
// The place's residents before the two-level collapse: the largest group a
// buyer represents (the place's own government represents all of them).
const residents = Math.max(0, ...representedCounts);
const share = parameters.openingCustomerPublicCleaningBudgetShare!;
const coverage = parameters.openingCustomerLocalAuthorityBudgetCoverage!;
const bounds = (row: Row): [number, number] =>
  row.spread && "low" in row.spread
    ? [row.spread.low, row.spread.high]
    : [row.value, row.value];
const suppliersHere = opening.organizations.filter(
  (organization) =>
    organization.placeId === world.placeId &&
    organization.classification === "enterprise:building-services",
);
console.log(
  `\nPublic custodial budgets at the opening (local public-building spending $${perResident.toFixed(2)} a resident, prior ${priorKey}; ${suppliersHere.length} building-services firms in the place: ${suppliersHere.map((row) => row.id).join(", ") || "none"}):`,
);
for (const row of publicRows) console.log(row);
console.log(
  `  cleaning share ${band("openingCustomerPublicCleaningBudgetShare")}; buyer coverage ${band("openingCustomerLocalAuthorityBudgetCoverage")}`,
);
if (publicRows.length) {
  const [shareLow, shareHigh] = bounds(share);
  const [coverageLow, coverageHigh] = bounds(coverage);
  console.log(
    `  the town's custodial budget: $${((monthlyTotal * 12) / 100).toFixed(0)} a year for ${residents} residents; the band from the two spreads: $${(perResident * residents * shareLow * coverageLow).toFixed(0)} to $${(perResident * residents * shareHigh * coverageHigh).toFixed(0)}`,
  );
} else
  console.log(
    `  not observable in this place: no public custodial agreement opened (${suppliersHere.length ? "no qualified buyer coverage" : "no building-services firm to buy from"})`,
  );
const stateCounty =
  governmentBuildings.places[priorKey.replace("US_", "")]
    ?.countyShareOfCurrentOperations;
console.log(
  `  county governments' share of local public-building current operations: ${stateCounty ?? "n/a"} in this state, ${governmentBuildings.national.countyShareOfCurrentOperations} nationally (Census 2022)`,
);

// County owners carried forward from the 2017 listing.
const carried = opening.organizations.filter(
  (organization) =>
    organization.governmentFacts?.["openingPublicOwner.recordId"],
);
console.log(
  `\nCounty buyer identities carried forward from 2017: ${carried.length} (${carried.map((row) => `${row.id} = ${row.governmentFacts!["openingPublicOwner.recordId"]}`).join("; ") || "none"})`,
);
const { counties2017, matched2021, counties2022 } = countyContinuity.national;
const stateContinuity = countyContinuity.places[priorKey.replace("US_", "")];
console.log(
  `  band: ${matched2021} of ${counties2017} county governments of the 2017 listing are the same active government (PID, GID, county FIPS) in the 2021 listing, and ${counties2022} are counted in 2022; this state's continuity share ${stateContinuity?.continuityShare ?? "n/a"} (${stateContinuity?.tag ?? "n/a"})`,
);

// Outside buyers by class: the research the crosswalk will read.
console.log(
  "\nOutside-product buyer classes (BEA 2023 use table, by commodity):",
);
const outsideSales = flows.filter((flow) =>
  flow.id.startsWith("outside-sales:"),
);
for (const [classification, row] of Object.entries(
  outsideBuyers.classifications,
))
  console.log(
    `  ${classification} (${row.commodities.join("+")}): ${Object.entries(
      row.shares,
    )
      .map(([buyer, value]) => `${buyer} ${value}`)
      .join(", ")}`,
  );
console.log(
  `  in the town: ${outsideSales.length} outside-sales flows from the existing outside-market shares; no engine reads the buyer classes yet (SG-P8-outside-product-demand-crosswalk stays open)`,
);

if (process.env.OPENING_ONLY) process.exit(0);

// The year: counted households pay through resident purchase flows (journal
// entries credited to the firm); full households and public buyers through
// finance contracts (their settled dates and arrears, read at year's end).
const flowPaid = new Map<
  string,
  { entries: number; minor: number; first: string }
>();
const post = api.postJournal.bind(api);
api.postJournal = (entry) => {
  const id = entry.sourceRef.id;
  const service =
    /^residents:purchase:([^|]+)\|household\.customer\.([a-z-]+)/.exec(id);
  if (service) {
    const firm = service[1]!;
    const credited = entry.postings
      .filter(
        (posting) => posting.deltaMinor > 0 && posting.accountId.includes(firm),
      )
      .reduce((total, posting) => total + posting.deltaMinor, 0);
    const row = flowPaid.get(service[2]!) ?? {
      entries: 0,
      minor: 0,
      first: id,
    };
    row.entries += 1;
    row.minor += credited;
    flowPaid.set(service[2]!, row);
  }
  return post(entry);
};
const dev = new DevMode(
  core,
  world.director,
  new BenchPlayer(core, world.director),
  world.placeId,
);
const end = addDays(makeIsoDate(core.date), Number(process.env.DAYS ?? 365));
while (core.date < end) dev.advance(addDays(makeIsoDate(core.date), 1));
console.log(`\nThe played year (to ${core.date}):`);
for (const [service, row] of [...flowPaid].sort())
  console.log(
    `  counted households, ${service}: ${row.entries} monthly payments, $${(row.minor / 100).toFixed(0)} credited to the firm, first ${row.first}`,
  );
const closed = (organizationId: string) => {
  const book = core.finance.businesses.get(organizationId);
  return book?.closedAt
    ? ` (firm closed ${book.closedAt}, ${book.closingReasonKey})`
    : "";
};
const byKind = new Map<string, string[]>();
for (const contract of core.finance.contracts.values()) {
  if (
    !contract.kind.startsWith("household.customer.") &&
    !contract.kind.startsWith("public.customer.")
  )
    continue;
  const rows = byKind.get(contract.kind) ?? [];
  rows.push(
    `${contract.id}: due from ${contract.firstDueAt}, last settled ${contract.lastSettledAt ?? "never"}, next due ${contract.dueAt}, arrears ${contract.arrearsMinor}${contract.endedAt ? `, ended ${contract.endedAt}` : ""}${closed(contract.payeeId)}`,
  );
  byKind.set(contract.kind, rows);
}
for (const [kind, rows] of [...byKind].sort())
  console.log(`  finance contracts, ${kind}: ${rows.length}; first ${rows[0]}`);
if (![...byKind.keys()].some((kind) => kind.startsWith("public.customer.")))
  console.log(
    "  no public custodial contract existed, so none was paid in the year",
  );
