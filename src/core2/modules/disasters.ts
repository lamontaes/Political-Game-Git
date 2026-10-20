/**
 * Disasters from the record (BOARD: the core owns disasters and hazards). A
 * disaster happens in play only when FEMA declared one for the town's county
 * (or its whole state): on the incident's real start date it is a public,
 * newsworthy event in town, and on the declaration date the federal Public
 * Assistance FEMA obligated to the county's own government and to the town's
 * government is paid to them from the U.S. Treasury, and the housing
 * assistance FEMA approved for the town's households (Individuals and
 * Households Program) is paid to the town's residents. Nothing is rolled: a
 * world past the end of the records has no new disasters until the owner
 * rules on what should cause one (question in docs/coordination/core.md).
 */
import declarations from "../data/disasters/declarations.json" with { type: "json" };
import assistance from "../data/disasters/assistance.json" with { type: "json" };
import households from "../data/disasters/households.json" with { type: "json" };
import fundingData from "../data/opening-income-funding.json" with { type: "json" };
import lookup from "../data/places/place-lookup.json" with { type: "json" };
import { stateOfPlaceKey } from "../places";
import type { CoreAPI, CoreModule, CoreState, PlaceId, Source } from "../types";
import { placePopulation } from "../gov-rules/place-population";
import {
  outsideMarketFor,
  residentCounts,
  residentsAccountFor,
  residentsRuntime,
} from "./residents";

export const DISASTERS_MODULE_ID = "core2-disasters-v1";
const STOPGAP = "SG-CORE-disasters-from-records";
const BUILDER_CLASSIFICATION = "enterprise:construction";

/** A government's name reduced to its place name: "Liberty, City of" → "liberty". */
export function normalizedGovernmentName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\(.*?\)/g, " ")
    .replace(
      /\b(city|town|village|borough|township|municipality|municipio|census area|of|the|county|parish|fiscal court|government)\b/g,
      " ",
    )
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

type Row = [string, string, number, number, number];

interface Disaster {
  number: number;
  title: string;
  type: string;
  begins: string;
  declared: string;
  statewide: boolean;
}

interface Runtime {
  county?: string;
  countyOrgId?: string;
  townOrgId?: string;
  townName: string;
  treasuryId?: string;
  byBegin: Map<string, Disaster[]>;
  byDeclared: Map<string, Disaster[]>;
  /** Assistance paid so far: disaster, receiving government, cents. */
  paid: { disaster: number; orgId: string; cents: number }[];
  /** Repairs households paid: disaster, receiving account, cents. */
  repairs: { disaster: number; to: string; cents: number }[];
}
const runtimes = new WeakMap<CoreState, Runtime>();

/** The town's county code, from its recorded county name and state. */
function countyCode(core: CoreState): string | undefined {
  const state = stateOfPlaceKey(core.placeMetadata.placeKey ?? "");
  const named = core.placeMetadata.countyNames?.split(", ")[0]?.toLowerCase();
  if (!state || !named) return undefined;
  const usps = state.replace(/^US-/, "");
  for (const [geoid, name, rowState] of lookup.counties.rows as [
    string,
    string,
    string,
  ][])
    if (rowState === usps && name.toLowerCase() === named) return geoid;
  return undefined;
}

function runtime(api: CoreAPI): Runtime {
  const core = api.state;
  const known = runtimes.get(core);
  if (known) return known;
  const county = countyCode(core);
  const town = core.people.get(core.playerId ?? "")?.placeId;
  let countyOrgId: string | undefined, townOrgId: string | undefined;
  let treasuryId: string | undefined;
  for (const org of core.organizations.values()) {
    if (org.classification === "service:county-government" && !countyOrgId)
      countyOrgId = org.id;
    if (
      org.classification === "service:municipal-government" &&
      org.placeId === town
    )
      townOrgId = org.id;
    if (org.classification === fundingData.contributorClassification)
      treasuryId = org.id;
  }
  const byBegin = new Map<string, Disaster[]>(),
    byDeclared = new Map<string, Disaster[]>();
  const seen = new Set<number>();
  const rows = declarations.byCounty as unknown as Record<string, Row[]>;
  const add = (row: Row, statewide: boolean) => {
    if (seen.has(row[4])) return;
    seen.add(row[4]);
    const disaster: Disaster = {
      number: row[4],
      title: (declarations.titles as Record<string, string>)[row[4]] ?? "",
      type: declarations.types[row[2]] ?? "",
      begins: row[0],
      declared: row[1],
      statewide,
    };
    if (disaster.begins > core.date)
      byBegin.set(disaster.begins, [
        ...(byBegin.get(disaster.begins) ?? []),
        disaster,
      ]);
    if (disaster.declared > core.date)
      byDeclared.set(disaster.declared, [
        ...(byDeclared.get(disaster.declared) ?? []),
        disaster,
      ]);
  };
  if (county) {
    for (const row of rows[county] ?? []) add(row, false);
    for (const row of rows[`${county.slice(0, 2)}000`] ?? []) add(row, true);
  }
  const rt: Runtime = {
    ...(county ? { county } : {}),
    ...(countyOrgId ? { countyOrgId } : {}),
    ...(townOrgId ? { townOrgId } : {}),
    ...(treasuryId ? { treasuryId } : {}),
    townName: normalizedGovernmentName(
      (core.placeMetadata.placeName ?? "").split(",")[0] ?? "",
    ),
    byBegin,
    byDeclared,
    paid: [],
    repairs: [],
  };
  runtimes.set(core, rt);
  return rt;
}

const source = (api: CoreAPI, detail: string): Source => ({
  tag: "SOURCED",
  asOf: api.state.date,
  citation: declarations.source,
  estimatedFrom: detail,
});

/** Homes FEMA found damaged in the town, scaled to the world's share. */
function damagedHomes(
  core: CoreState,
  rt: Runtime,
  disaster: Disaster,
  town: PlaceId,
): { damagedHomes?: string } {
  const row = townRow(rt, disaster);
  const homes = row ? Math.round(row[2] * townShare(core, town)) : 0;
  return homes > 0 ? { damagedHomes: String(homes) } : {};
}

function begin(api: CoreAPI, rt: Runtime, disaster: Disaster): void {
  const core = api.state;
  const town = core.people.get(core.playerId ?? "")?.placeId;
  if (!town) return;
  api.stopgap(STOPGAP);
  api.emit({
    id: `disaster:${disaster.number}:${town}`,
    date: core.date,
    kind: "hazard.disaster",
    personIds: [],
    placeId: town,
    publicRecord: true,
    news: true,
    facts: {
      disasterNumber: String(disaster.number),
      title: disaster.title,
      incidentType: disaster.type,
      ...(rt.county ? { countyCode: rt.county } : {}),
      statewide: String(disaster.statewide),
      ...damagedHomes(core, rt, disaster, town),
    },
    source: source(
      api,
      `FEMA disaster ${disaster.number} (${disaster.type}), incident beginning ${disaster.begins}, declared ${disaster.declared}${disaster.statewide ? " statewide" : " for this county"}.`,
    ),
  });
}

function declare(api: CoreAPI, rt: Runtime, disaster: Disaster): void {
  if (!rt.county || !rt.treasuryId) return;
  payHouseholds(api, rt, disaster);
  const row = (
    assistance.byCountyDisaster as Record<
      string,
      { county: number; towns: Record<string, number> }
    >
  )[`${rt.county}|${disaster.number}`];
  if (!row) return;
  const accounts = api.accounts();
  const pay = (orgId: string | undefined, cents: number, who: string) => {
    if (!orgId || cents <= 0) return;
    // A government kept outside the town (its money is not simulated here)
    // receives nothing the world can see; the treasury is outside too.
    if (api.state.cashJournal.accounts.get(accounts.main(orgId))?.outsideFlow)
      return;
    api.stopgap(STOPGAP);
    rt.paid.push({ disaster: disaster.number, orgId, cents });
    accounts.transfer({
      id: `disaster-assistance:${disaster.number}:${orgId}`,
      from: accounts.main(rt.treasuryId!),
      to: accounts.main(orgId),
      amountMinor: cents,
      reasonKey: "federal.disaster-public-assistance",
      source: source(
        api,
        `FEMA Public Assistance obligated to ${who} for disaster ${disaster.number} (${disaster.title}), paid on the declaration date.`,
      ),
    });
  };
  pay(rt.countyOrgId, row.county, "the county's government");
  pay(rt.townOrgId, row.towns[rt.townName] ?? 0, "the town's government");
}

type TownRow = [aid: number, damage: number, damagedHomes: number];

/** FEMA's household figures for the town in this disaster, if any. */
function townRow(rt: Runtime, disaster: Disaster): TownRow | undefined {
  return (
    households.byCountyDisaster as unknown as Record<
      string,
      Record<string, TownRow>
    >
  )[`${rt.county}|${disaster.number}`]?.[rt.townName];
}

/**
 * The world's share of the real town: its people over the Census estimate (a
 * place without one is taken as the whole town).
 */
function townShare(core: CoreState, town: PlaceId): number {
  const recorded = placePopulation(
    (core.placeMetadata.placeKey ?? "").replace(/^.*:/, ""),
  );
  let people = 0;
  for (const person of core.people.values())
    if (person.placeId === town) people += 1;
  for (const row of residentCounts(core))
    if (row.placeId === town) people += row.people;
  return recorded && recorded > people ? people / recorded : 1;
}

/**
 * The town's households on the declaration date: FEMA's approved housing
 * assistance is paid to them, and they pay for repairing the damage FEMA
 * inspected in owners' homes, to the town's builders by their size (or to
 * builders outside the town when it has none open).
 */
function payHouseholds(api: CoreAPI, rt: Runtime, disaster: Disaster): void {
  const core = api.state;
  const town = core.people.get(core.playerId ?? "")?.placeId as
    PlaceId | undefined;
  const row = townRow(rt, disaster);
  const residents = town ? residentsAccountFor(core, town) : undefined;
  if (!row || !town || !residents) return;
  const share = townShare(core, town);
  const accounts = api.accounts();
  const aid = Math.round(row[0] * share);
  const source = (detail: string): Source => ({
    tag: "SOURCED",
    asOf: core.date,
    citation: households.source,
    estimatedFrom: `${detail} Scaled to the world's share of the town (${share.toFixed(4)} of its Census estimate).`,
  });
  if (aid > 0) {
    api.stopgap(STOPGAP);
    rt.paid.push({ disaster: disaster.number, orgId: residents, cents: aid });
    accounts.transfer({
      id: `disaster-households:${disaster.number}:${residents}`,
      from: accounts.main(rt.treasuryId!),
      to: residents,
      amountMinor: aid,
      reasonKey: "federal.disaster-household-assistance",
      source: source(
        `FEMA housing assistance approved for this town's households in disaster ${disaster.number} (${disaster.title}), paid on the declaration date.`,
      ),
    });
  }
  const damage = Math.round(row[1] * share);
  if (damage <= 0) return;
  api.stopgap(STOPGAP);
  const staff = new Map<string, number>();
  for (const job of core.jobs.values())
    staff.set(job.organizationId, (staff.get(job.organizationId) ?? 0) + 1);
  const builders = [...core.organizations.values()]
    .filter(
      (org) =>
        org.classification === BUILDER_CLASSIFICATION &&
        org.placeId === town &&
        !core.finance.closures.has(org.id),
    )
    .sort((a, b) => a.id.localeCompare(b.id));
  const size = (id: string) => Math.max(1, staff.get(id) ?? 0);
  const total = builders.reduce((n, org) => n + size(org.id), 0);
  // With no open builder in town the repairs go to builders outside it; a
  // world that records no outside market for the town has nobody to pay, so
  // the households pay nothing for repairs there (they would otherwise stop
  // the game on the declaration day).
  let outside: string | undefined;
  if (!builders.length)
    try {
      outside = outsideMarketFor(core, residentsRuntime(core)!, town);
    } catch {
      return;
    }
  const parts: [string, number][] = builders.length
    ? builders.map((org) => [
        accounts.main(org.id),
        Math.floor((damage * size(org.id)) / total),
      ])
    : [[accounts.main(outside!), damage]];
  parts[0]![1] += damage - parts.reduce((n, [, v]) => n + v, 0);
  for (const [to, cents] of parts) {
    if (cents <= 0) continue;
    // Households repair what they can pay for now.
    const receipt = accounts.transfer({
      id: `disaster-repairs:${disaster.number}:${to}`,
      from: residents,
      to,
      amountMinor: cents,
      partial: true,
      reasonKey: "household.disaster-repairs",
      source: source(
        `Repairs to the damage FEMA inspected in owners' homes in this town in disaster ${disaster.number} (${disaster.title}), paid to ${builders.length ? "the town's builders by their staff" : "builders outside the town (none open here)"}.`,
      ),
    });
    rt.repairs.push({
      disaster: disaster.number,
      to,
      cents: receipt.paidMinor,
    });
  }
}

export const DISASTERS_MODULE: CoreModule = {
  id: DISASTERS_MODULE_ID,
  onDay(api) {
    const rt = runtime(api);
    const date = api.state.date;
    for (const disaster of rt.byBegin.get(date) ?? []) begin(api, rt, disaster);
    for (const disaster of rt.byDeclared.get(date) ?? [])
      declare(api, rt, disaster);
    return undefined;
  },
};

/** The declarations reaching this world's town, for tests and screens. */
export function townDisasters(api: CoreAPI): readonly Disaster[] {
  const rt = runtime(api);
  return [...rt.byDeclared.values()].flat();
}

/** Federal assistance this world has paid, for tests and screens. */
export function disasterAssistancePaid(
  api: CoreAPI,
): readonly { disaster: number; orgId: string; cents: number }[] {
  return runtime(api).paid;
}

/** Repairs this world's households have paid, for tests and screens. */
export function disasterRepairsPaid(
  api: CoreAPI,
): readonly { disaster: number; to: string; cents: number }[] {
  return runtime(api).repairs;
}
