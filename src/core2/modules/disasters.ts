/**
 * Disasters from the record (BOARD: the core owns disasters and hazards). A
 * disaster happens in play only when FEMA declared one for the town's county
 * (or its whole state): on the incident's real start date it is a public,
 * newsworthy event in town, and on the declaration date the federal Public
 * Assistance FEMA obligated to the county's own government and to the town's
 * government is paid to them from the U.S. Treasury. Nothing is rolled: a
 * world past the end of the records has no new disasters until the owner
 * rules on what should cause one (question in docs/coordination/core.md).
 */
import declarations from "../data/disasters/declarations.json" with { type: "json" };
import assistance from "../data/disasters/assistance.json" with { type: "json" };
import fundingData from "../data/opening-income-funding.json" with { type: "json" };
import lookup from "../data/places/place-lookup.json" with { type: "json" };
import { stateOfPlaceKey } from "../places";
import type { CoreAPI, CoreModule, CoreState, Source } from "../types";

export const DISASTERS_MODULE_ID = "core2-disasters-v1";
const STOPGAP = "SG-CORE-disasters-from-records";

/** A government's name reduced to its place name: "Liberty, City of" → "liberty". */
export function normalizedGovernmentName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\(.*?\)/g, " ")
    .replace(
      /\b(city|town|village|borough|township|municipality|of|the|county|parish|fiscal court|government)\b/g,
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
    },
    source: source(
      api,
      `FEMA disaster ${disaster.number} (${disaster.type}), incident beginning ${disaster.begins}, declared ${disaster.declared}${disaster.statewide ? " statewide" : " for this county"}.`,
    ),
  });
}

function declare(api: CoreAPI, rt: Runtime, disaster: Disaster): void {
  if (!rt.county || !rt.treasuryId) return;
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
