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
import severityData from "../data/disasters/severity.json" with { type: "json" };
import fundingData from "../data/opening-income-funding.json" with { type: "json" };
import lookup from "../data/places/place-lookup.json" with { type: "json" };
import { placeStateKey } from "../place-map";
import { lawApplied } from "../law-reach/applied";
import { lawInForce, LAWS_MODULE_ID } from "./laws";
import type {
  CoreAPI,
  CoreModule,
  CoreState,
  PersonId,
  PlaceId,
  Source,
} from "../types";
import { OFFICES_MODULE_ID, townSeats } from "./offices";
import { placePopulation } from "../gov-rules/place-population";
import { addDays, makeIsoDate } from "../kernel/dates";
import {
  hazardOfIncident,
  hazardRate,
  RECORD_END,
  type Hazard,
} from "./climate";
import type { ModuleRow } from "../module-data";
import { dwellingKind, ownedHomes } from "./housing";
import {
  countedMovesRunning,
  moveCountedHouseholdAway,
  outsideMarketFor,
  residentCounts,
  residentsAccountFor,
  residentsRuntime,
} from "./residents";

export const DISASTERS_MODULE_ID = "core2-disasters-v1";
const STOPGAP = "SG-CORE-disasters-from-records";
const VULNERABILITY_STOPGAP = "SG-NATION-vulnerability-proxy";
/** The record a damaged home's household gets on the declaration date (the story director reads it). */
export const HOME_DAMAGED_EVENT = "disaster.home-damaged";
const STATES_SHARE_DISASTER_COSTS =
  "us-federal-positions:emergencies.states-share-disaster-costs";
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
  /** The FEMA disaster whose figures (aid, homes damaged) this one reads: its own number for a recorded one, the template's for one the climate made. */
  recorded?: number;
  title: string;
  type: string;
  begins: string;
  declared: string;
  statewide: boolean;
}

interface Runtime {
  /** The town the world opened in, whose FEMA figures these are: set at the first run, wherever the player lives later. */
  town?: PlaceId;
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
  /** Disasters the climate made, by their number. */
  made: Map<number, Disaster>;
  /** The county's recorded disasters by hazard, oldest first: the figures a made one takes in turn. */
  templates: Map<Hazard, Disaster[]>;
}
const runtimes = new WeakMap<CoreState, Runtime>();

/** The town's county code, from its recorded county name and state. */
export function countyCode(core: CoreState): string | undefined {
  const state = placeStateKey(core.placeMetadata.placeKey ?? "");
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
  const town = (core.placeMetadata?.housingTown ??
    core.people.get(core.playerId ?? "")?.placeId) as PlaceId | undefined;
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
    ...(town ? { town } : {}),
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
    made: new Map(),
    templates: recordedByHazard(rows, county),
  };
  runtimes.set(core, rt);
  return rt;
}

/** The county's recorded disasters (its own and its state's) by hazard, oldest first. */
function recordedByHazard(
  rows: Record<string, Row[]>,
  county: string | undefined,
): Map<Hazard, Disaster[]> {
  const out = new Map<Hazard, Disaster[]>();
  if (!county) return out;
  const seen = new Set<number>();
  const all: [Row, boolean][] = [
    ...(rows[county] ?? []).map((row): [Row, boolean] => [row, false]),
    ...(rows[`${county.slice(0, 2)}000`] ?? []).map((row): [Row, boolean] => [
      row,
      true,
    ]),
  ];
  // The county's own and its state's together, oldest first.
  for (const [row, statewide] of all.sort((a, b) =>
    a[0][0].localeCompare(b[0][0]),
  )) {
    const hazard = hazardOfIncident(declarations.types[row[2]] ?? "");
    if (!hazard || row[0] < "2000-01-01" || row[0] > RECORD_END) continue;
    if (seen.has(row[4])) continue;
    seen.add(row[4]);
    out.set(hazard, [
      ...(out.get(hazard) ?? []),
      {
        number: row[4],
        title: (declarations.titles as Record<string, string>)[row[4]] ?? "",
        type: declarations.types[row[2]] ?? "",
        begins: row[0],
        declared: row[1],
        statewide,
      },
    ]);
  }
  return out;
}

interface Exposure {
  readonly id: string;
  readonly hazard: Hazard;
  readonly expected: number;
  readonly fired: number;
}

const GENERATED_HAZARDS: readonly Hazard[] = ["flood", "storm", "wildfire"];

/**
 * After the record, the town's weather: on the first of each month the
 * county's exposure to each hazard grows by the climate's rate for the month
 * (`hazardRate`, the county's recorded declarations by season moved by the
 * warming); a disaster happens the month the exposure holds one more whole
 * one than have happened. It takes the days and the figures of a recorded
 * disaster of the county in turn (SG-NATION-hazard-replay) under a number of
 * its own, and goes through the same begin and declare as a recorded one.
 */
function makeWeather(api: CoreAPI, rt: Runtime): void {
  const core = api.state;
  const month = core.date.slice(0, "YYYY-MM".length);
  const state = api.moduleState(DISASTERS_MODULE_ID).table("state");
  const done = state.get("weather:state") as
    { generatedMonth: string } | undefined;
  if (!rt.county || done?.generatedMonth === month) return;
  state.put({
    id: "weather:state",
    generatedMonth: month,
  } as unknown as ModuleRow);
  if (`${month}-01` <= RECORD_END) return;
  const exposures = api.moduleState(DISASTERS_MODULE_ID).table("exposure");
  const monthNumber = Number(month.slice(5, 7));
  const lastDay = Number(
    addDays(
      addDays(makeIsoDate(`${month}-01`), 32),
      -Number(addDays(makeIsoDate(`${month}-01`), 32).slice(8, 10)),
    ).slice(8, 10),
  );
  for (const hazard of GENERATED_HAZARDS) {
    const list = rt.templates.get(hazard) ?? [];
    if (!list.length) continue;
    const id = `exposure:${rt.county}:${hazard}`;
    const row = (exposures.get(id) as unknown as Exposure | undefined) ?? {
      id,
      hazard,
      expected: 0,
      fired: 0,
    };
    const expected =
      row.expected + hazardRate(api, rt.county, hazard, monthNumber);
    const due = Math.floor(expected) - row.fired;
    for (let i = 0; i < due; i++) {
      const k = row.fired + i;
      const template = list[k % list.length]!;
      // The template's day of the month (the second at the earliest: the first is today).
      const day = Math.min(
        Math.max(Number(template.begins.slice(8, 10)), 2),
        lastDay,
      );
      const begins = `${month}-${String(day).padStart(2, "0")}`;
      const lag = Math.round(
        (Date.parse(template.declared) - Date.parse(template.begins)) /
          86_400_000,
      );
      const made: Disaster = {
        ...template,
        number: template.number + 1_000_000 * (k + 1),
        recorded: template.number,
        begins,
        declared: addDays(makeIsoDate(begins), Math.max(0, lag)),
      };
      rt.made.set(made.number, made);
      rt.byBegin.set(begins, [...(rt.byBegin.get(begins) ?? []), made]);
      rt.byDeclared.set(made.declared, [
        ...(rt.byDeclared.get(made.declared) ?? []),
        made,
      ]);
    }
    exposures.put({
      ...row,
      expected,
      fired: row.fired + Math.max(0, due),
    } as unknown as ModuleRow);
  }
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

/**
 * How severe the disaster was in this town, 0 to 1: the homes FEMA inspected
 * as damaged per resident, on a straight ramp from the damage below which
 * research finds the longer-run price and population response slightly
 * positive to the damage above which it finds the most severe disasters
 * (src/core2/data/disasters/severity.json). The ramp has no step: a disaster
 * between the two ends is severe by the share of the way it reaches.
 */
export function severityOf(damagedHomesPerResident: number): number {
  const low = severityData.lowCutoff.value,
    high = severityData.highCutoff.value;
  return Math.min(
    1,
    Math.max(0, (damagedHomesPerResident - low) / (high - low)),
  );
}

/**
 * The severity fact of a disaster's news event. Absent where FEMA's figures
 * show nothing for the town or the town has no recorded population: its
 * damage is then not known, and the town reads no severity from the disaster.
 */
function severityFact(
  core: CoreState,
  rt: Runtime,
  disaster: Disaster,
): { severity?: string } {
  const row = townRow(rt, disaster);
  const residents = placePopulation(
    (core.placeMetadata.placeKey ?? "").replace(/^.*:/, ""),
    core.seed,
  );
  if (!row || !residents || residents <= 0) return {};
  return { severity: String(severityOf(row[2] / residents)) };
}

/** A home a disaster damaged, and what its household was paid and paid out. */
export interface DamagedHome {
  readonly id: string;
  readonly disasterNumber: number;
  readonly householdId: string;
  readonly placeId: string;
  /** The person whose account takes the aid and pays the repairs; none for a counted household. */
  readonly headId: string | null;
  readonly kind: string;
  readonly valueMinor: number;
  readonly aidMinor: number;
  readonly repairsPaidMinor: number;
  readonly repairsOwedMinor: number;
  readonly moved: boolean;
}

const damagedTable = (api: CoreAPI) =>
  api.moduleState(DISASTERS_MODULE_ID).table("damaged");

/** Weakest first: the kinds of home that fail soonest, then the cheaper home. */
const KIND_ORDER = [
  "mobile-home",
  "farmhouse",
  "house",
  "rowhouse",
  "apartment",
];

/**
 * Which owners' homes were the damaged ones. FEMA counts damaged homes for
 * the town but not whose; the homes that fail first are the weakest kinds
 * and then the lowest valued. stopgapId: SG-NATION-vulnerability-proxy
 */
function markDamaged(
  api: CoreAPI,
  disaster: Disaster,
  town: PlaceId,
  homes: number,
): void {
  if (homes <= 0) return;
  const core = api.state;
  const weak = (id: string) => {
    const at = KIND_ORDER.indexOf(dwellingKind(api, id) ?? "house");
    return at < 0 ? KIND_ORDER.length : at;
  };
  const ranked = ownedHomes(api, town)
    .map((home) => ({ ...home, weak: weak(home.householdId) }))
    .sort(
      (a, b) =>
        a.weak - b.weak ||
        a.valueMinor - b.valueMinor ||
        a.householdId.localeCompare(b.householdId),
    )
    .slice(0, homes);
  if (!ranked.length) return;
  api.stopgap(VULNERABILITY_STOPGAP);
  for (const home of ranked) {
    const head = core.households
      .get(home.householdId)
      ?.memberIds.find((id) => core.people.get(id)?.alive);
    const row: DamagedHome = {
      id: `damaged:${disaster.number}:${home.householdId}`,
      disasterNumber: disaster.number,
      householdId: home.householdId,
      placeId: town,
      headId: head ?? null,
      kind: dwellingKind(api, home.householdId) ?? "house",
      valueMinor: home.valueMinor,
      aidMinor: 0,
      repairsPaidMinor: 0,
      repairsOwedMinor: 0,
      moved: false,
    };
    damagedTable(api).put(row as unknown as ModuleRow);
  }
}

/** The homes a disaster damaged in this world's town, most vulnerable first. */
export function damagedHomesOf(
  api: CoreAPI,
  disasterNumber: number,
): readonly DamagedHome[] {
  return (damagedTable(api).rows() as unknown as DamagedHome[]).filter(
    (row) => row.disasterNumber === disasterNumber,
  );
}

/** The offices whose holder is the executive of a government the disaster touches: the town's mayor, the county's executive and the state's governor. */
const EXECUTIVE_OFFICES: ReadonlySet<string> = new Set([
  "mayor",
  "county-executive",
  "governor",
]);

/**
 * Whoever sits in the executive offices over the town on the day, as full
 * people: the record names them so a first-hours scene can find its executive.
 */
function executivesOf(api: CoreAPI): readonly PersonId[] {
  const ids = new Set<PersonId>();
  if (!api.state.modules.has(OFFICES_MODULE_ID)) return [];
  for (const { office, holder } of townSeats(api)) {
    const id = holder?.personId as PersonId | undefined;
    if (EXECUTIVE_OFFICES.has(office.kind) && id && api.state.people.has(id))
      ids.add(id);
  }
  return [...ids].sort();
}

function begin(api: CoreAPI, rt: Runtime, disaster: Disaster): void {
  const core = api.state;
  const town = rt.town;
  if (!town) return;
  api.stopgap(STOPGAP);
  api.emit({
    id: `disaster:${disaster.number}:${town}`,
    date: core.date,
    kind: "hazard.disaster",
    personIds: executivesOf(api),
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
      ...severityFact(core, rt, disaster),
    },
    source: source(
      api,
      `FEMA disaster ${disaster.number} (${disaster.type}), incident beginning ${disaster.begins}, declared ${disaster.declared}${disaster.statewide ? " statewide" : " for this county"}.`,
    ),
  });
  markDamaged(
    api,
    disaster,
    town,
    Number(damagedHomes(core, rt, disaster, town).damagedHomes ?? 0),
  );
}

function declare(api: CoreAPI, rt: Runtime, disaster: Disaster): void {
  if (!rt.county || !rt.treasuryId) return;
  payHouseholds(api, rt, disaster);
  const row = (
    assistance.byCountyDisaster as Record<
      string,
      { county: number; towns: Record<string, number> }
    >
  )[`${rt.county}|${disaster.recorded ?? disaster.number}`];
  if (!row) return;
  const accounts = api.accounts();
  // A law having states share disaster costs lowers the federal share of
  // eligible costs from the statutory 75 percent; the governments receive that
  // much less. stopgapId: SG-LAWS-disaster-share-size
  const sharingLaw = api.state.modules.has(LAWS_MODULE_ID)
    ? lawInForce(api, STATES_SHARE_DISASTER_COSTS)
    : null;
  const sharing = sharingLaw?.value === 1;
  if (sharing) api.stopgap("SG-LAWS-disaster-share-size");
  const federalShare = sharing
    ? api.parameter("disasterFederalShareWhenStatesShare") /
      api.parameter("disasterStatutoryFederalShare")
    : 1;
  const pay = (orgId: string | undefined, paying: number, who: string) => {
    const cents = Math.round(paying * federalShare);
    if (!orgId || cents <= 0) return;
    // A government kept outside the town (its money is not simulated here)
    // receives nothing the world can see; the treasury is outside too.
    if (api.state.cashJournal.accounts.get(accounts.main(orgId))?.outsideFlow)
      return;
    api.stopgap(STOPGAP);
    // The law reached this government: the federal share it was paid fell.
    if (sharing && sharingLaw?.governing && cents !== paying)
      lawApplied(api, {
        key: STATES_SHARE_DISASTER_COSTS,
        lawId: sharingLaw.governing.id,
        targetId: orgId,
        target: "organization",
        engine: DISASTERS_MODULE_ID,
        what: "disaster-federal-share-lowered",
        amountMinor: cents - paying,
      });
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
  )[`${rt.county}|${disaster.recorded ?? disaster.number}`]?.[rt.townName];
}

/**
 * The world's share of the real town: its people over the Census estimate (a
 * place without one is taken as the whole town).
 */
function townShare(core: CoreState, town: PlaceId): number {
  const recorded = placePopulation(
    (core.placeMetadata.placeKey ?? "").replace(/^.*:/, ""),
    core.seed,
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
  const town = rt.town;
  const row = townRow(rt, disaster);
  const pool = town ? residentsAccountFor(core, town) : undefined;
  if (!row || !town || !pool) return;
  const share = townShare(core, town);
  const accounts = api.accounts();
  const aid = Math.round(row[0] * share);
  const damage = Math.round(row[1] * share);
  const source = (detail: string): Source => ({
    tag: "SOURCED",
    asOf: core.date,
    citation: households.source,
    estimatedFrom: `${detail} Scaled to the world's share of the town (${share.toFixed(4)} of its Census estimate).`,
  });
  // The damaged homes the disaster marked: each household takes an equal part
  // of the aid and of the repair bill, named ones in their own accounts and
  // counted ones through the town's pool (the same rule, times their count).
  const homes = damagedHomesOf(api, disaster.number);
  const parts = homes.length ? homes.length : 1;
  const split = (total: number, i: number) =>
    Math.floor(total / parts) +
    (i === 0 ? total - Math.floor(total / parts) * parts : 0);
  const accountOf = (home: DamagedHome | undefined) =>
    home?.headId ? accounts.main(home.headId) : pool;
  const aidTo = new Map<string, number>();
  const billOf = new Map<string, number>();
  (homes.length ? homes : [undefined]).forEach((home, i) => {
    const to = accountOf(home);
    aidTo.set(to, (aidTo.get(to) ?? 0) + split(aid, i));
    billOf.set(to, (billOf.get(to) ?? 0) + split(damage, i));
  });
  if (homes.length) {
    // Aid for the households each in their own account.
    homes.forEach((home, i) => {
      const cents = split(aid, i);
      if (cents <= 0 || !home.headId) return;
      api.stopgap(STOPGAP);
      rt.paid.push({
        disaster: disaster.number,
        orgId: accounts.main(home.headId),
        cents,
      });
      accounts.transfer({
        id: `disaster-households:${disaster.number}:${home.householdId}`,
        from: accounts.main(rt.treasuryId!),
        to: accounts.main(home.headId),
        amountMinor: cents,
        reasonKey: "federal.disaster-household-assistance",
        source: source(
          `FEMA housing assistance approved for this town's households in disaster ${disaster.number} (${disaster.title}), this household's part, paid on the declaration date.`,
        ),
      });
    });
    const countedAid = homes.reduce(
      (n, home, i) => n + (home.headId ? 0 : split(aid, i)),
      0,
    );
    payPool(countedAid);
  } else payPool(aid);

  function payPool(cents: number): void {
    if (cents <= 0) return;
    api.stopgap(STOPGAP);
    rt.paid.push({ disaster: disaster.number, orgId: pool!, cents });
    accounts.transfer({
      id: `disaster-households:${disaster.number}:${pool}`,
      from: accounts.main(rt.treasuryId!),
      to: pool!,
      amountMinor: cents,
      reasonKey: "federal.disaster-household-assistance",
      source: source(
        `FEMA housing assistance approved for this town's households in disaster ${disaster.number} (${disaster.title}), paid on the declaration date.`,
      ),
    });
  }

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
  /** One payer's repair bill, paid to the builders by their staff; returns what was paid. */
  const payBill = (from: string, bill: number): number => {
    const toBuilders: [string, number][] = builders.length
      ? builders.map((org) => [
          accounts.main(org.id),
          Math.floor((bill * size(org.id)) / total),
        ])
      : [[accounts.main(outside!), bill]];
    toBuilders[0]![1] += bill - toBuilders.reduce((n, [, v]) => n + v, 0);
    let paid = 0;
    for (const [to, cents] of toBuilders) {
      if (cents <= 0) continue;
      // Households repair what they can pay for now.
      const receipt = accounts.transfer({
        id: `disaster-repairs:${disaster.number}:${from}:${to}`,
        from,
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
      paid += receipt.paidMinor;
    }
    return paid;
  };
  const paidBy = new Map<string, number>();
  for (const [from, bill] of billOf) paidBy.set(from, payBill(from, bill));
  if (!homes.length) return;
  // What each home's household paid of its part, and the counted ones that
  // could not pay for the repairs (the pool's shortfall, least valued home
  // first) leaving the town. A named household's shortfall is recorded.
  const poolBill = billOf.get(pool) ?? 0;
  const poolShort = poolBill ? 1 - (paidBy.get(pool) ?? 0) / poolBill : 0;
  const counted = homes.filter((home) => !home.headId);
  const leaving = new Set(
    counted.slice(0, Math.round(counted.length * poolShort)).map((h) => h.id),
  );
  homes.forEach((home, i) => {
    const owed = split(damage, i);
    const paid = home.headId
      ? Math.min(owed, paidBy.get(accounts.main(home.headId)) ?? 0)
      : Math.round(owed * (1 - poolShort));
    let moved = false;
    if (leaving.has(home.id) && countedMovesRunning(api))
      moved = moveCountedHouseholdAway(api, home.householdId, town, {
        disasterRepairShortfall: poolShort,
      });
    const filled: DamagedHome = {
      ...home,
      aidMinor: split(aid, i),
      repairsPaidMinor: paid,
      repairsOwedMinor: owed,
      moved,
    };
    damagedTable(api).put(filled as unknown as ModuleRow);
    // The household learns what the aid came to and what the repairs cost:
    // a record of its own that the story director reads (the household talks
    // it over at home). Counted households have no one to tell.
    const living = (
      core.households.get(home.householdId)?.memberIds ?? []
    ).filter((member) => core.people.get(member)?.alive);
    if (home.headId && living.length)
      api.emit({
        id: `event:${HOME_DAMAGED_EVENT}:${home.id}`,
        date: core.date,
        kind: HOME_DAMAGED_EVENT,
        personIds: living,
        placeId: town,
        facts: {
          damagedId: home.id,
          disasterNumber: String(disaster.number),
          title: disaster.title,
          incidentType: disaster.type,
          homeKind: home.kind,
          headId: home.headId,
          valueMinor: String(home.valueMinor),
          aidMinor: String(filled.aidMinor),
          repairsPaidMinor: String(filled.repairsPaidMinor),
          repairsOwedMinor: String(filled.repairsOwedMinor),
        },
        source: source(
          `The damaged home's record for FEMA disaster ${disaster.number} (${disaster.title}): the aid its household was paid and the repairs it paid for, on the declaration date.`,
        ),
      });
  });
}

export const DISASTERS_MODULE: CoreModule = {
  id: DISASTERS_MODULE_ID,
  state: {
    schemaVersion: 1,
    tables: {
      damaged: { indexes: { byHousehold: { fields: ["householdId"] } } },
      exposure: {},
      state: {},
    },
  },
  onDay(api) {
    const rt = runtime(api);
    const date = api.state.date;
    makeWeather(api, rt);
    for (const disaster of rt.byBegin.get(date) ?? []) begin(api, rt, disaster);
    for (const disaster of rt.byDeclared.get(date) ?? [])
      declare(api, rt, disaster);
    return undefined;
  },
};

/**
 * What FEMA obligated to the town's county and town governments for a
 * disaster, in cents: the federal share of the public assistance the
 * declaration pays on its declared date. Zero where none was obligated.
 */
export function federalAidFor(api: CoreAPI, disasterNumber: number): number {
  const rt = runtime(api);
  disasterNumber = rt.made.get(disasterNumber)?.recorded ?? disasterNumber;
  if (!rt.county) return 0;
  const row = (
    assistance.byCountyDisaster as Record<
      string,
      { county: number; towns: Record<string, number> }
    >
  )[`${rt.county}|${disasterNumber}`];
  return row ? row.county + (row.towns[rt.townName] ?? 0) : 0;
}

/** The declarations reaching this world's town, for tests and screens. */
export function townDisasters(api: CoreAPI): readonly Disaster[] {
  const rt = runtime(api);
  return [...rt.byDeclared.values()].flat();
}

/** The declarations whose FEMA figures show damaged homes in this world's town, for tests and screens. */
export function townDisastersWithDamage(api: CoreAPI): readonly Disaster[] {
  const rt = runtime(api);
  return townDisasters(api).filter((d) => (townRow(rt, d)?.[2] ?? 0) > 0);
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
