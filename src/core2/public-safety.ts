/**
 * Ordinary crime, courts, jail and prison, firearm laws, civilian oversight
 * and fire service for the town, at both tiers (one model, two tiers). Once a
 * month the town's crime measures (the outcome web keeps them) become
 * expected arrests by offense, shared across age bands in proportion to the
 * recorded ages of every person: full people one by one (a fractional
 * exposure carried until it is a whole arrest, never a roll) and counted
 * groups by their count. A case then runs the law in force: the juvenile age
 * picks the court, the bail law and the defendant's cash pick who waits in
 * custody, stand-your-ground and the duty to retreat pick which self-defense
 * claims end at charging, and the sentence is jail or prison paid for by the
 * county or state treasury. Firearm laws reach the households that keep a
 * gun (the state's survey rate), their compliance costs and permit fees move
 * through the journal, the oversight board costs the city, immigration
 * partnership holds arrested noncitizens for agents, and the police, fire and
 * corrections lines set how much service the departments give.
 *
 * Every application is recorded with `lawApplied` where the engine reads
 * the law. Nothing here is rolled: counts come from rates and the person's
 * or group's recorded facts.
 */
import parameters from "./data/public-safety/parameters.json" with { type: "json" };
import { ageOn } from "./counted-groups";
import { fundBalance, fundGroups, fundOf } from "./counted-money";
import { isNoncitizen } from "./citizenship";
import { citizenShareOf } from "./electorate-places";
import {
  householdOwnsFirearm,
  firearmOwnershipRate,
} from "./firearm-ownership";
import { transfer, transferSplit } from "./accounts";
import { justiceParameter } from "./justice-law";
import { END_CASH_BAIL } from "./justice-pretrial";
import { lawApplied } from "./law-reach/applied";
import type { ModuleRow } from "./module-data";
import {
  BUDGETS_MODULE_ID,
  adoptedLine,
  budgetsOf,
  governments,
  type GovernmentRow,
} from "./modules/budgets";
import { LAWS_MODULE_ID, lawChain, lawInForce } from "./modules/laws";
import { baseOf } from "./outcome-web-model";
import { OUTCOME_WEB_MODULE_ID, placeOutcome } from "./modules/outcome-web";
import { residentsRuntime } from "./modules/residents";
import type { CoreAPI, CoreState, PersonId, Source } from "./types";

export const PUBLIC_SAFETY_MODULE_ID = "core2-public-safety-v1";

const P = "us-policy-positions:justice-public-safety.";
export const OVERSIGHT = `${P}civilian-oversight-of-police`;
export const IMMIGRATION = `${P}partner-with-federal-immigration-enforcement`;
export const CASH_BAIL = END_CASH_BAIL;
export const JUVENILE_AGE = `${P}raise-juvenile-court-age`;
export const CHILD_ACCESS = `${P}child-access-prevention`;
export const CARRY_PERMIT = `${P}permit-to-carry-concealed`;
export const HANDGUN_AGE = `${P}raise-handgun-purchase-age`;
export const STAND_GROUND = `${P}stand-your-ground`;
export const POLICE_LINE = "budget-line:police";
export const FIRE_LINE = "budget-line:fire";
export const CORRECTIONS_LINE = "budget-line:corrections";

interface Row {
  readonly value: number;
}
const PARAMS = parameters.parameters as unknown as Readonly<
  Record<string, Row>
>;
export function safetyParameter(key: string): number {
  const row = PARAMS[key];
  if (!row) throw new Error(`Untagged public-safety parameter: ${key}`);
  return row.value;
}
const BANDS = parameters.ageProfile.bands;

const OFFENSES = [
  {
    key: "assault",
    measure: "crime.assault",
    per: "persons",
    violent: true,
  },
  {
    key: "robbery",
    measure: "crime.robbery",
    per: "persons",
    violent: true,
  },
  {
    key: "burglary",
    measure: "crime.burglary",
    per: "households",
    violent: false,
  },
  {
    key: "property",
    measure: "crime.property",
    per: "households",
    violent: false,
  },
] as const;
type OffenseKey = (typeof OFFENSES)[number]["key"];

const table = (api: CoreAPI, name: string) =>
  api.moduleState(PUBLIC_SAFETY_MODULE_ID).table(name);

const sourceOf = (
  api: CoreAPI,
  citation: string,
  estimatedFrom?: string,
): Source => ({
  tag: estimatedFrom ? "ESTIMATED" : "SOURCED",
  citation,
  asOf: api.state.date,
  ...(estimatedFrom ? { estimatedFrom } : {}),
});

// ---- law and budget reads ---------------------------------------------------

/** The statute in force on a question that says yes, else null. */
function lawIdOf(api: CoreAPI, key: string): string | null {
  if (!api.state.modules.has(LAWS_MODULE_ID)) return null;
  const law = lawInForce(api, key);
  return law.value === 1 && law.governing ? law.governing.id : null;
}

/** The government of the first of these levels the world has. */
function govAt(
  api: CoreAPI,
  levels: readonly GovernmentRow["level"][],
): GovernmentRow | null {
  if (!api.state.modules.has(BUDGETS_MODULE_ID)) return null;
  const all = governments(api);
  for (const level of levels) {
    const gov = all.find((g) => g.level === level);
    if (gov) return gov;
  }
  return null;
}

interface Service {
  /** The line today against its adopted base year, bounded. */
  readonly ratio: number;
  /** The statute that last changed the line, when one did. */
  readonly lawId: string | null;
}

/** A department's service: its budget line today against the line the town began with. */
function serviceOf(
  api: CoreAPI,
  line: string,
  levels: readonly GovernmentRow["level"][],
): Service {
  const gov = govAt(api, levels);
  const floor = safetyParameter("serviceFloor");
  const ceiling = safetyParameter("serviceCeiling");
  if (!gov) return { ratio: 1, lawId: null };
  const date = api.state.date;
  const budget = budgetsOf(api, gov.id)
    .filter((b) => b.startsOn <= date)
    .sort((a, b) => b.startsOn.localeCompare(a.startsOn))[0];
  if (!budget) return { ratio: 1, lawId: null };
  const name = line.slice("budget-line:".length);
  const base = adoptedLine(api, gov, budget.fiscalYear, name);
  const now = budget.spendingMinor[name] ?? 0;
  const ratio = base > 0 ? Math.min(ceiling, Math.max(floor, now / base)) : 1;
  return { ratio, lawId: lineLawId(api, line) };
}

/** The statute that last amended a budget line, from the staffing it set. */
function lineLawId(api: CoreAPI, line: string): string | null {
  if (!api.state.modules.has("core2-law-reach-a-v1")) return null;
  const rows = api
    .moduleState("core2-law-reach-a-v1")
    .table("staffing")
    .rows() as unknown as { key: string; lawId: string; setOn: string }[];
  return (
    rows
      .filter((r) => r.key === line)
      .sort((a, b) => b.setOn.localeCompare(a.setOn))[0]?.lawId ?? null
  );
}

// ---- the town's people, both tiers ------------------------------------------

interface FullPerson {
  readonly id: PersonId;
  readonly householdId: string;
  readonly age: number;
  readonly band: number;
  readonly noncitizen: boolean;
  readonly gunHome: boolean;
  readonly childHome: boolean;
}

interface GroupCensus {
  readonly index: number;
  readonly id: string;
  /** People 12 and older by age band. */
  readonly band: number[];
  /** Noncitizens by age band. */
  readonly nonCitizen: number[];
  readonly people: number;
  readonly households: number;
  /** Adults aged 21 and older, 18 to 20, and young people, before the gun-home rate. */
  readonly adults21: number;
  readonly adults18to20: number;
  readonly childHouseholds: number;
  readonly youth: number;
  readonly youthTeens: number;
  /** What the group's people hold, in minor units. */
  readonly cash: number;
}

interface Census {
  readonly placeId: string;
  readonly stateKey: string;
  readonly gunRate: number;
  readonly full: FullPerson[];
  readonly groups: GroupCensus[];
  readonly people12: number;
  readonly households: number;
  readonly residents: number;
  readonly bandTotals: number[];
}

const bandOf = (age: number): number => {
  for (let i = 0; i < BANDS.length; i++) if (age < BANDS[i]!.below) return i;
  return BANDS.length - 1;
};

function takeCensus(api: CoreAPI): Census {
  const core = api.state as CoreState;
  const chain = lawChain(api);
  const placeId = chain.townPlaceId;
  const date = core.date;
  const citizenShare = citizenShareOf(
    core.placeMetadata.placeKey as string | undefined,
    chain.stateKey.slice(3),
  );
  const minAge = safetyParameter("offendingAgeFrom");
  const playerHome = core.playerId
    ? core.people.get(core.playerId)?.householdId
    : undefined;
  const full: FullPerson[] = [];
  const bandTotals = BANDS.map(() => 0);
  let people12 = 0,
    households = 0,
    residents = 0;
  const homes = new Map<string, PersonId[]>();
  for (const id of core.peopleByPlace.get(placeId) ?? []) {
    const p = core.people.get(id);
    if (!p?.alive) continue;
    homes.set(p.householdId, [...(homes.get(p.householdId) ?? []), id]);
  }
  for (const [householdId, ids] of homes) {
    households += 1;
    const ages = ids.map((id) => ageOn(core.people.get(id)!.birthDate, date));
    const childHome = ages.some((a) => a < safetyParameter("childAgeBelow"));
    const gunHome = householdOwnsFirearm(api, householdId, chain.stateKey);
    ids.forEach((id, i) => {
      residents += 1;
      const age = ages[i]!;
      if (age < minAge) return;
      people12 += 1;
      const band = bandOf(age);
      bandTotals[band]! += 1;
      // The player's own household is not scripted into the case flow.
      if (householdId === playerHome) return;
      full.push({
        id,
        householdId,
        age,
        band,
        noncitizen: isNoncitizen(core.seed, id, citizenShare),
        gunHome,
        childHome,
      });
    });
  }
  // Counted groups: each member's packed age, weighted by their household.
  const groups = new Map<number, GroupCensus>();
  const rt = residentsRuntime(core);
  if (rt) {
    const store = rt.store;
    for (const h of store.liveHouseholds()) {
      if (h.placeId !== placeId) continue;
      const weight = store.weightOf(h);
      const members = store.countedMembers(h);
      if (!members.length) continue;
      let g = groups.get(h.group);
      if (!g) {
        g = {
          index: h.group,
          id: store.groups[h.group]!.id,
          band: BANDS.map(() => 0),
          nonCitizen: BANDS.map(() => 0),
          people: 0,
          households: 0,
          adults21: 0,
          adults18to20: 0,
          childHouseholds: 0,
          youth: 0,
          youthTeens: 0,
          cash: 0,
        };
        groups.set(h.group, g);
      }
      const ages = members.map((m) => ageOn(store.born[m]!, date));
      const child = ages.some((a) => a < safetyParameter("childAgeBelow"));
      (g as { households: number }).households += weight;
      (g as { cash: number }).cash += rt.funded
        ? 0
        : members.reduce((n, m) => n + (store.liquid[m] ?? 0), 0) * weight;
      if (child) (g as { childHouseholds: number }).childHouseholds += weight;
      members.forEach((m, i) => {
        const age = ages[i]!;
        const w = weight;
        (g as { people: number }).people += w;
        residents += w;
        if (age >= safetyParameter("youthDeathAgeFrom") && age < 20)
          (g as { youth: number }).youth += w;
        if (age >= safetyParameter("youthSuicideAgeFrom") && age < 20)
          (g as { youthTeens: number }).youthTeens += w;
        if (age >= safetyParameter("permitAge"))
          (g as { adults21: number }).adults21 += w;
        else if (age >= safetyParameter("adultAge"))
          (g as { adults18to20: number }).adults18to20 += w;
        if (age < minAge) return;
        const band = bandOf(age);
        g!.band[band]! += w;
        people12 += w;
        bandTotals[band]! += w;
        if (isNoncitizen(core.seed, store.ids[m]!, citizenShare))
          g!.nonCitizen[band]! += w;
      });
      households += weight;
    }
  }
  if (rt?.funded)
    for (const g of groups.values())
      (g as { cash: number }).cash = fundBalance(api, rt, g.index);
  return {
    placeId,
    stateKey: chain.stateKey,
    gunRate: firearmOwnershipRate(chain.stateKey),
    full,
    groups: [...groups.values()],
    people12,
    households,
    residents,
    bandTotals,
  };
}

// ---- money ------------------------------------------------------------------

/** The outside account (main) public money buys from: the town's, else any. */
function outsideOf(api: CoreAPI): string | null {
  const town = lawChain(api).townPlaceId;
  const org = [...api.state.organizations.values()]
    .filter((o) => o.outsideFlow !== undefined)
    .sort(
      (a, b) =>
        Number(b.placeId === town) - Number(a.placeId === town) ||
        a.id.localeCompare(b.id),
    )[0];
  return org ? api.accounts().main(org.id) : null;
}

interface Levy {
  readonly id: string;
  readonly to: string;
  readonly reason: string;
  readonly source: Source;
  readonly groups: ReadonlyMap<number, number>;
  readonly people: ReadonlyMap<PersonId, number>;
}

/** Charge counted groups and full people what they owe, as much as they hold; returns what each paid. */
function levy(
  api: CoreAPI,
  input: Levy,
): {
  groups: Map<number, number>;
  people: Map<PersonId, number>;
} {
  const core = api.state as CoreState;
  const paid = {
    groups: new Map<number, number>(),
    people: new Map<PersonId, number>(),
  };
  const rt = residentsRuntime(core);
  if (rt && input.groups.size) {
    fundGroups(api, rt);
    const lines: { accountId: string; deltaMinor: number }[] = [];
    let total = 0;
    for (const [group, want] of input.groups) {
      const pay = Math.min(Math.round(want), fundBalance(api, rt, group));
      if (pay <= 0) continue;
      lines.push({ accountId: fundOf(api, rt, group), deltaMinor: -pay });
      paid.groups.set(group, pay);
      total += pay;
    }
    if (total > 0) {
      lines.push({ accountId: input.to, deltaMinor: total });
      transferSplit(core, api, {
        id: input.id,
        lines,
        reasonKey: input.reason,
        source: input.source,
      });
    }
  }
  const accounts = api.accounts();
  for (const [personId, want] of input.people) {
    if (want < 1 || !core.people.has(personId)) continue;
    const receipt = accounts.transfer({
      id: `${input.id}:${personId}`,
      from: accounts.main(personId),
      to: input.to,
      amountMinor: Math.round(want),
      reasonKey: input.reason,
      source: input.source,
      partial: true,
    });
    if (receipt.paidMinor > 0) paid.people.set(personId, receipt.paidMinor);
  }
  return paid;
}

/** A treasury pays outside vendors; returns what it paid. */
function treasuryPays(
  api: CoreAPI,
  gov: GovernmentRow | null,
  id: string,
  reason: string,
  amountMinor: number,
  source: Source,
): number {
  const outside = outsideOf(api);
  const amount = Math.round(amountMinor);
  if (!gov || !outside || amount < 1) return 0;
  const accounts = api.accounts();
  return transfer(api.state as CoreState, api, {
    id,
    from: accounts.main(gov.organizationId),
    to: outside,
    amountMinor: amount,
    reasonKey: reason,
    source,
    partial: true,
  }).paidMinor;
}

// ---- records ----------------------------------------------------------------

export interface CaseRow {
  readonly id: string;
  /** "batch" stands for counted people; "person" is one full defendant. */
  readonly kind: "batch" | "person";
  readonly month: string;
  readonly offense: OffenseKey;
  readonly court: "adult" | "juvenile";
  readonly band: number;
  /** The people this record stands for. */
  readonly count: number;
  readonly personId: string;
  /** Counted people by group id. */
  readonly groups: Readonly<Record<string, number>>;
  readonly detained: number;
  readonly noncitizens: number;
  readonly bailLawId: string;
  readonly dueMonth: string;
  readonly status: "open" | "closed";
  readonly verdict: string;
}

interface TermRow {
  readonly id: string;
  readonly caseId: string;
  readonly court: "jail" | "prison" | "juvenile";
  readonly count: number;
  readonly daysLeft: number;
  readonly status: "serving" | "done";
}

export interface SafetyMonth {
  readonly id: string;
  readonly month: string;
  readonly arrests: number;
  readonly juvenileCases: number;
  readonly detained: number;
  readonly convicted: number;
  readonly incarcerated: number;
  readonly jailDays: number;
  readonly detainerHolds: number;
  readonly policeService: number;
  readonly correctionsService: number;
  readonly fireService: number;
  readonly fireIncidents: number;
  readonly youthFirearmDeathsExpected: number;
  readonly youthFirearmSuicidesExpected: number;
  readonly pretrialDetainedPer100k: number;
}

const monthOf = (date: string) => date.slice(0, 7);
function addMonths(month: string, n: number): string {
  const total =
    Number(month.slice(0, 4)) * 12 + Number(month.slice(5, 7)) - 1 + n;
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, "0")}`;
}

interface Carry {
  readonly id: string;
  readonly arrest: Readonly<Record<string, number>>;
  readonly permit: number;
  readonly buy: number;
  readonly fire: number;
  readonly storage: boolean;
  readonly holder: boolean;
}

const carryOf = (api: CoreAPI, id: string): Carry =>
  (table(api, "carry").get(id) as unknown as Carry | undefined) ?? {
    id,
    arrest: {},
    permit: 0,
    buy: 0,
    fire: 0,
    storage: false,
    holder: false,
  };

// ---- the month --------------------------------------------------------------

interface Tally {
  arrests: number;
  juvenileCases: number;
  detained: number;
  convicted: number;
  incarcerated: number;
  jailDays: number;
  detainerHolds: number;
}

/** The full residents' share of the town, as one unnamed group for the case flow. */
function namedResidents(api: CoreAPI, census: Census): GroupCensus {
  const core = api.state as CoreState;
  const band = BANDS.map((_, b) =>
    Math.max(
      0,
      census.bandTotals[b]! - census.groups.reduce((n, g) => n + g.band[b]!, 0),
    ),
  );
  const nonCitizen = BANDS.map(() => 0);
  let cash = 0;
  for (const p of census.full) {
    if (p.noncitizen) nonCitizen[p.band]! += 1;
    cash += core.people.get(p.id)?.liquidMinor ?? 0;
  }
  const people = band.reduce((n, v) => n + v, 0);
  return {
    index: -1,
    id: "named-residents",
    band,
    nonCitizen: nonCitizen.map((v, b) => Math.min(v, band[b]!)),
    people,
    households: 0,
    adults21: 0,
    adults18to20: 0,
    childHouseholds: 0,
    youth: 0,
    youthTeens: 0,
    cash,
  };
}

/** One month of the town's public safety, run on the sixth. */
export function runSafetyMonth(api: CoreAPI): void {
  const core = api.state as CoreState;
  if (!core.modules.has(LAWS_MODULE_ID)) return;
  const month = monthOf(core.date);
  if (table(api, "months").get(`safety:${month}`)) return;
  const census = takeCensus(api);
  if (!census.people12) return;
  const police = serviceOf(api, POLICE_LINE, ["city", "county", "state"]);
  const fire = serviceOf(api, FIRE_LINE, ["city", "county", "state"]);
  const corrections = serviceOf(api, CORRECTIONS_LINE, [
    "county",
    "city",
    "state",
  ]);
  const tally: Tally = {
    arrests: 0,
    juvenileCases: 0,
    detained: 0,
    convicted: 0,
    incarcerated: 0,
    jailDays: 0,
    detainerHolds: 0,
  };
  resolveDue(api, census, month, tally);
  arrest(api, census, month, police, tally);
  serveTerms(api, month, corrections, tally);
  firearms(api, census);
  oversight(api, census);
  const fireIncidents = fireService(api, census, fire);
  const youth = youthHarm(api, census);
  policeApplied(api, census, police);
  const open = (
    table(api, "cases").query("byStatus", ["open"]) as unknown as CaseRow[]
  ).reduce((n, c) => n + c.detained, 0);
  table(api, "months").put({
    id: `safety:${month}`,
    month,
    ...tally,
    policeService: police.ratio,
    correctionsService: corrections.ratio,
    fireService: fire.ratio,
    fireIncidents,
    youthFirearmDeathsExpected: youth.deaths,
    youthFirearmSuicidesExpected: youth.suicides,
    pretrialDetainedPer100k: census.residents
      ? (open / census.residents) * 100000
      : 0,
  } satisfies SafetyMonth as unknown as ModuleRow);
}

function rateOf(
  api: CoreAPI,
  placeId: string,
  stateKey: string,
  measure: string,
): number {
  const web = api.state.modules.has(OUTCOME_WEB_MODULE_ID)
    ? placeOutcome(api, placeId, measure)
    : undefined;
  return web?.value ?? baseOf(measure, stateKey).value;
}

const reported = (o: OffenseKey) => safetyParameter(`reported${cap(o)}`);
const cleared = (o: OffenseKey) => safetyParameter(`cleared${cap(o)}`);
const cap = (s: string) => s[0]!.toUpperCase() + s.slice(1);

/** The age at which adult court begins: raised where the juvenile age law is in force. */
function adultCourtAge(api: CoreAPI): { age: number; lawId: string | null } {
  const lawId = lawIdOf(api, JUVENILE_AGE);
  return {
    age: lawId
      ? safetyParameter("juvenileAgeRaised")
      : safetyParameter("juvenileAgeDefault"),
    lawId,
  };
}

/** New arrests this month by offense, shared out by age and then run through charging and bail. */
function arrest(
  api: CoreAPI,
  census: Census,
  month: string,
  police: Service,
  tally: Tally,
): void {
  const court = adultCourtAge(api);
  const syg = lawIdOf(api, STAND_GROUND);
  const bailLaw = lawIdOf(api, CASH_BAIL);
  const immigration = lawIdOf(api, IMMIGRATION);
  const months = safetyParameter("monthsPerYear");
  // Weight: the age band's arrest ratio times the people in it, both tiers.
  const weightTotal = BANDS.reduce(
    (n, b, i) => n + b.ratio * census.bandTotals[i]!,
    0,
  );
  if (weightTotal <= 0) return;
  // stopgapId: SG-LAW-justice-named-offender-acts
  api.stopgap("SG-LAW-justice-named-offender-acts");
  // Named residents' share of the arrests is folded into an unnamed batch:
  // no named person is charged from a band share.
  const pool: Census = {
    ...census,
    groups: [...census.groups, namedResidents(api, census)],
  };
  const cases: CaseRow[] = [];
  const countedHolds = new Map<number, number>();
  for (const offense of OFFENSES) {
    const rate = rateOf(api, census.placeId, census.stateKey, offense.measure);
    const units =
      offense.per === "persons" ? census.people12 : census.households;
    const victims = (rate * units) / 1000 / months;
    const service = Math.pow(
      police.ratio,
      safetyParameter("policeServiceElasticity"),
    );
    const expected =
      victims * reported(offense.key) * cleared(offense.key) * service;
    if (expected <= 0) continue;
    // Counted groups and the named residents' unnamed share, by band weights.
    const byBand = new Map<
      number,
      {
        groups: Record<string, number>;
        count: number;
        nonCitizens: number;
        ix: number[];
      }
    >();
    for (const group of pool.groups)
      for (let b = 0; b < BANDS.length; b++) {
        const n = group.band[b]!;
        if (n <= 0) continue;
        const share = (expected * BANDS[b]!.ratio * n) / weightTotal;
        if (share <= 0) continue;
        const row = byBand.get(b) ?? {
          groups: {},
          count: 0,
          nonCitizens: 0,
          ix: [],
        };
        row.groups[group.id] = (row.groups[group.id] ?? 0) + share;
        row.count += share;
        row.nonCitizens += share * (group.nonCitizen[b]! / n);
        if (immigration)
          countedHolds.set(
            group.index,
            (countedHolds.get(group.index) ?? 0) +
              share * (group.nonCitizen[b]! / n),
          );
        byBand.set(b, row);
      }
    for (const [band, row] of byBand) {
      const adult = BANDS[band]!.from >= court.age;
      cases.push(
        batchCase(api, pool, {
          offense: offense.key,
          violent: offense.violent,
          band,
          month,
          court: adult ? "adult" : "juvenile",
          count: row.count,
          groups: row.groups,
          noncitizens: row.nonCitizens,
          syg,
          bailLaw,
          juvenileLaw: court.lawId,
        }),
      );
    }
  }
  const caseTable = table(api, "cases");
  for (const c of cases) {
    caseTable.put(c as unknown as ModuleRow);
    tally.arrests += c.count;
    if (c.court === "juvenile") tally.juvenileCases += c.count;
    tally.detained += c.detained;
  }
  if (immigration) detainers(api, pool, immigration, countedHolds, tally);
  // The county pays what each adult case costs at filing.
  courtCosts(api, cases);
}

const dueMonths = (offense: OffenseKey) =>
  Math.max(1, Math.round(safetyParameter(`dispositionMonths.${offense}`)));

/** The share of a group's defendants who cannot post bail: a sliding scale on what its people hold against the bail. */
function unableToPost(api: CoreAPI, group: GroupCensus): number {
  if (group.people <= 0) return 1;
  const bail = justiceParameter(api, "pretrialBailMinor");
  const perPerson =
    (group.cash / group.people) * safetyParameter("liquidMedianToMean");
  return Math.min(1, Math.max(0, 1 - perPerson / bail));
}

function batchCase(
  api: CoreAPI,
  census: Census,
  input: {
    offense: OffenseKey;
    violent: boolean;
    band: number;
    month: string;
    court: "adult" | "juvenile";
    count: number;
    groups: Record<string, number>;
    noncitizens: number;
    syg: string | null;
    bailLaw: string | null;
    juvenileLaw: string | null;
  },
): CaseRow {
  const id = `case:${input.month}:${input.offense}:${input.court}:${input.band}`;
  let detained = 0;
  const byId = new Map(census.groups.map((g) => [g.id, g]));
  if (input.court === "adult") {
    const dangerous = input.violent
      ? safetyParameter("dangerDetentionShare")
      : 0;
    let avoided = 0;
    for (const [gid, n] of Object.entries(input.groups)) {
      const g = byId.get(gid)!;
      const cash = unableToPost(api, g);
      detained += n * (input.bailLaw ? dangerous : cash);
      avoided += n * Math.max(0, cash - (input.bailLaw ? dangerous : cash));
    }
    if (input.bailLaw && avoided > 0) {
      const days = dueMonths(input.offense) * safetyParameter("daysPerMonth");
      const perDiem =
        safetyParameter("jailPerDiemMinor") *
        safetyParameter("marginalCostShare");
      for (const [gid, n] of Object.entries(input.groups)) {
        const g = byId.get(gid)!;
        const cash = unableToPost(api, g);
        lawApplied(api, {
          key: CASH_BAIL,
          lawId: input.bailLaw,
          targetId: `group:${gid}`,
          target: "group",
          engine: PUBLIC_SAFETY_MODULE_ID,
          what: "released-without-bail",
          count: Math.max(1, Math.round(n * cash)),
          amountMinor: -(n * Math.max(0, cash - dangerous) * days * perDiem),
        });
      }
    }
  }
  if (input.court === "juvenile" && input.juvenileLaw) {
    // Young adults whose cases the raised age sends to juvenile court.
    for (const [gid, n] of Object.entries(input.groups)) {
      if (BANDS[input.band]!.from < safetyParameter("juvenileAgeDefault"))
        break;
      lawApplied(api, {
        key: JUVENILE_AGE,
        lawId: input.juvenileLaw,
        targetId: `group:${gid}`,
        target: "group",
        engine: PUBLIC_SAFETY_MODULE_ID,
        what: "case-in-juvenile-court",
        count: Math.max(1, Math.round(n)),
        amountMinor: n * juvenileMinusAdultCost(input.offense),
      });
    }
  }
  // Self-defense claims end at charging: all of them where there is no duty
  // to retreat, and the ones with no safe retreat where there is one.
  let count = input.count;
  if (input.court === "adult" && input.offense === "assault") {
    const claims = input.count * safetyParameter("forceClaimShare");
    const retreat = safetyParameter("retreatPossibleShare");
    const dismissed = claims * (input.syg ? 1 : 1 - retreat);
    const saved = claims * retreat;
    count = input.count - dismissed;
    detained *= input.count > 0 ? count / input.count : 1;
    if (input.syg)
      for (const [gid, n] of Object.entries(input.groups))
        lawApplied(api, {
          key: STAND_GROUND,
          lawId: input.syg,
          targetId: `group:${gid}`,
          target: "group",
          engine: PUBLIC_SAFETY_MODULE_ID,
          what: "force-claim-dismissed",
          count: Math.max(
            1,
            Math.round(n * safetyParameter("forceClaimShare") * retreat),
          ),
          amountMinor:
            -(saved * (n / input.count)) * adultCaseCost(input.offense),
        });
  }
  return {
    id,
    kind: "batch",
    month: input.month,
    offense: input.offense,
    court: input.court,
    band: input.band,
    count,
    personId: "",
    groups: input.groups,
    detained,
    noncitizens: input.noncitizens,
    bailLawId: input.bailLaw ?? "",
    dueMonth: addMonths(input.month, dueMonths(input.offense)),
    status: "open",
    verdict: "",
  };
}

/** What one juvenile case costs the treasuries beyond what the same adult case would. */
function juvenileMinusAdultCost(offense: OffenseKey): number {
  const adult =
    safetyParameter("courtCostPerCaseMinor") +
    safetyParameter(`convictedShare.${offense}`) *
      safetyParameter(`incarceratedShare.${offense}`) *
      safetyParameter("jailSentenceDays") *
      safetyParameter("jailPerDiemMinor") *
      safetyParameter("marginalCostShare");
  const juvenile =
    safetyParameter("juvenileCourtCostPerCaseMinor") +
    safetyParameter("juvenileAdjudicatedShare") *
      safetyParameter("juvenilePlacedShare") *
      safetyParameter("juvenilePlacementDays") *
      safetyParameter("juvenilePerDiemMinor") *
      safetyParameter("marginalCostShare");
  return juvenile - adult;
}

/** The county pays the added defense and prosecution cost of each case it files. */
function courtCosts(api: CoreAPI, cases: readonly CaseRow[]): void {
  const adult = cases
    .filter((c) => c.court === "adult")
    .reduce((n, c) => n + c.count, 0);
  const juvenile = cases
    .filter((c) => c.court === "juvenile")
    .reduce((n, c) => n + c.count, 0);
  const cost =
    adult * safetyParameter("courtCostPerCaseMinor") +
    juvenile * safetyParameter("juvenileCourtCostPerCaseMinor");
  treasuryPays(
    api,
    govAt(api, ["county", "city", "state"]),
    `public-safety:court:${api.state.date}`,
    "public-safety:court-costs",
    cost,
    sourceOf(
      api,
      "County defense and prosecution contract cost per case (BJS Indigent Defense Systems; OJJDP Juvenile Court Statistics).",
      "Marginal county cost per adult and juvenile case.",
    ),
  );
}

/** Cases whose month has come: charging, verdict, sentence. */
function resolveDue(
  api: CoreAPI,
  census: Census,
  month: string,
  tally: Tally,
): void {
  const caseTable = table(api, "cases");
  const open = caseTable.query("byStatus", ["open"]) as unknown as CaseRow[];
  for (const c of open) {
    if (c.dueMonth > month) continue;
    const count = c.count;
    let verdict = "closed";
    if (c.court === "adult") {
      const heldShare = c.count > 0 ? c.detained / c.count : 0;
      const base = safetyParameter(`convictedShare.${c.offense}`);
      const ratio = safetyParameter("detentionConvictionRatio");
      const released = base / (1 + (ratio - 1) * heldShare);
      const convicted =
        count * (heldShare * released * ratio + (1 - heldShare) * released);
      const incarcerated =
        convicted * safetyParameter(`incarceratedShare.${c.offense}`);
      const prison = incarcerated * safetyParameter(`prisonShare.${c.offense}`);
      sentence(api, c, "jail", incarcerated - prison);
      sentence(api, c, "prison", prison);
      tally.convicted += convicted;
      tally.incarcerated += incarcerated;
      verdict = "adjudicated";
    } else {
      const adjudicated = count * safetyParameter("juvenileAdjudicatedShare");
      sentence(
        api,
        c,
        "juvenile",
        adjudicated * safetyParameter("juvenilePlacedShare"),
      );
      verdict = "adjudicated";
    }
    caseTable.put({
      ...c,
      status: "closed",
      verdict,
    } as unknown as ModuleRow);
  }
}

const adultCaseCost = (offense: OffenseKey) =>
  safetyParameter("courtCostPerCaseMinor") +
  safetyParameter(`convictedShare.${offense}`) *
    safetyParameter(`incarceratedShare.${offense}`) *
    safetyParameter("jailSentenceDays") *
    safetyParameter("jailPerDiemMinor") *
    safetyParameter("marginalCostShare");

function sentence(
  api: CoreAPI,
  c: CaseRow,
  court: TermRow["court"],
  count: number,
): void {
  if (count <= 0) return;
  const days =
    court === "jail"
      ? safetyParameter("jailSentenceDays")
      : court === "prison"
        ? safetyParameter("prisonSentenceDays")
        : safetyParameter("juvenilePlacementDays");
  table(api, "terms").put({
    id: `term:${c.id}:${court}`,
    caseId: c.id,
    court,
    count,
    daysLeft: days,
    status: "serving",
  } satisfies TermRow as unknown as ModuleRow);
}

/** Jail and prison days the treasuries pay for this month, scaled to what the corrections line can house. */
function serveTerms(
  api: CoreAPI,
  month: string,
  corrections: Service,
  tally: Tally,
): void {
  const days = safetyParameter("daysPerMonth");
  const share = safetyParameter("marginalCostShare");
  const served = Math.min(1, corrections.ratio);
  const terms = table(api, "terms");
  const cases = table(api, "cases");
  const owed = { jail: 0, prison: 0, juvenile: 0 };
  // Pretrial custody: detained defendants of every open adult case.
  let pretrialDays = 0;
  for (const c of cases.query("byStatus", ["open"]) as unknown as CaseRow[])
    pretrialDays += c.detained * days;
  owed.jail += pretrialDays * safetyParameter("jailPerDiemMinor") * share;
  for (const t of terms.query("byStatus", [
    "serving",
  ]) as unknown as TermRow[]) {
    const billed = Math.min(days, t.daysLeft);
    const perDiem =
      t.court === "prison"
        ? safetyParameter("prisonPerDiemMinor")
        : t.court === "juvenile"
          ? safetyParameter("juvenilePerDiemMinor")
          : safetyParameter("jailPerDiemMinor");
    owed[t.court] += t.count * billed * served * perDiem * share;
    tally.jailDays += t.count * billed * served;
    const left = t.daysLeft - billed;
    terms.put({
      ...t,
      daysLeft: left,
      status: left <= 0 ? "done" : "serving",
    } as unknown as ModuleRow);
  }
  tally.jailDays += pretrialDays;
  const source = sourceOf(
    api,
    "Jail, prison and juvenile placement per diems (Vera Institute of Justice, The Price of Jails and The Price of Prisons, 2015; Justice Policy Institute, Sticker Shock 2020), marginal share.",
    "Food, medical and supplies for each added day.",
  );
  treasuryPays(
    api,
    govAt(api, ["county", "city", "state"]),
    `public-safety:jail:${month}`,
    "public-safety:jail-days",
    owed.jail,
    source,
  );
  treasuryPays(
    api,
    govAt(api, ["state", "county"]),
    `public-safety:prison:${month}`,
    "public-safety:prison-days",
    owed.prison,
    source,
  );
  treasuryPays(
    api,
    govAt(api, ["state", "county"]),
    `public-safety:juvenile:${month}`,
    "public-safety:juvenile-placement-days",
    owed.juvenile,
    source,
  );
  if (corrections.lawId && owed.jail + owed.prison > 0)
    lawApplied(api, {
      key: CORRECTIONS_LINE,
      lawId: corrections.lawId,
      targetId: "service:corrections",
      target: "government",
      engine: PUBLIC_SAFETY_MODULE_ID,
      what: "jail-capacity-served",
      amountMinor: owed.jail + owed.prison,
    });
}

/** Arrested noncitizens held for immigration agents: a short hold at the county jail's cost. */
function detainers(
  api: CoreAPI,
  census: Census,
  lawId: string,
  countedHolds: ReadonlyMap<number, number>,
  tally: Tally,
): void {
  // stopgapId: SG-LAW-justice-enforcement-outcome-readers
  api.stopgap("SG-LAW-justice-enforcement-outcome-readers");
  const days = safetyParameter("detainerHoldDays");
  const perDiem =
    safetyParameter("jailPerDiemMinor") * safetyParameter("marginalCostShare");
  let total = 0;
  const byIx = new Map(census.groups.map((g) => [g.index, g]));
  for (const [ix, holds] of countedHolds) {
    const g = byIx.get(ix);
    if (!g || holds <= 0) continue;
    total += holds;
    lawApplied(api, {
      key: IMMIGRATION,
      lawId,
      targetId: `group:${g.id}`,
      target: "group",
      engine: PUBLIC_SAFETY_MODULE_ID,
      what: "detainer-hold",
      count: Math.max(1, Math.round(holds)),
      amountMinor: holds * days * perDiem,
    });
  }
  tally.detainerHolds += total;
  treasuryPays(
    api,
    govAt(api, ["county", "city", "state"]),
    `public-safety:detainer:${api.state.date}`,
    "public-safety:detainer-hold-days",
    total * days * perDiem,
    sourceOf(
      api,
      "8 CFR 287.7(d) detainer hold, billed at the jail's marginal day.",
      "Marginal share of the jail per diem.",
    ),
  );
}

// ---- firearm laws -----------------------------------------------------------

function firearms(api: CoreAPI, census: Census): void {
  const accounts = api.accounts();
  const outside = outsideOf(api);
  const state = govAt(api, ["state", "county"]);
  const rate = census.gunRate;
  const months = safetyParameter("monthsPerYear");
  // Child access prevention: the households with a gun and a child buy a lock.
  const cap = lawIdOf(api, CHILD_ACCESS);
  if (cap && outside) {
    const price = safetyParameter("storageDeviceMinor");
    const groups = new Map<number, number>();
    const people = new Map<PersonId, number>();
    const households = new Set<string>();
    for (const p of census.full) {
      if (!p.gunHome || !p.childHome || households.has(p.householdId)) continue;
      households.add(p.householdId);
      const c = carryOf(api, p.id);
      if (c.storage) continue;
      people.set(p.id, price);
    }
    for (const g of census.groups) {
      const target = g.childHouseholds * rate;
      const held =
        (
          table(api, "storage").get(`storage:${g.id}`) as unknown as
            { households: number } | undefined
        )?.households ?? 0;
      const fresh = Math.max(0, target - held);
      if (fresh > 0) groups.set(g.index, fresh * price);
      table(api, "storage").put({
        id: `storage:${g.id}`,
        households: Math.max(held, target),
      });
      if (target > 0)
        lawApplied(api, {
          key: CHILD_ACCESS,
          lawId: cap,
          targetId: `group:${g.id}`,
          target: "group",
          engine: PUBLIC_SAFETY_MODULE_ID,
          what: "storage-duty",
          count: Math.max(1, Math.round(target)),
        });
    }
    const paid = levy(api, {
      id: `public-safety:storage:${api.state.date}`,
      to: outside,
      reason: "public-safety:safe-storage-device",
      source: sourceOf(
        api,
        "Gun locks and lockboxes bought to comply with a child access prevention law.",
        "Mean retail price of a lock or lockbox.",
      ),
      groups,
      people,
    });
    for (const g of census.groups) {
      const amount = paid.groups.get(g.index);
      if (amount)
        lawApplied(api, {
          key: CHILD_ACCESS,
          lawId: cap,
          targetId: `group:${g.id}`,
          target: "group",
          engine: PUBLIC_SAFETY_MODULE_ID,
          what: "storage-duty",
          count: Math.max(1, Math.round(g.childHouseholds * rate)),
          amountMinor: amount,
        });
    }
    for (const [personId, amount] of paid.people) {
      const c = carryOf(api, personId);
      table(api, "carry").put({ ...c, storage: true } as unknown as ModuleRow);
      lawApplied(api, {
        key: CHILD_ACCESS,
        lawId: cap,
        targetId: personId,
        target: "person",
        engine: PUBLIC_SAFETY_MODULE_ID,
        what: "storage-duty",
        amountMinor: amount,
      });
    }
  }
  // Permit to carry: adults in gun homes apply, pay the state fee and the class.
  const permit = lawIdOf(api, CARRY_PERMIT);
  if (permit && state) {
    const target = safetyParameter("permitHolderShare");
    const ramp = safetyParameter("permitRampShare");
    const renewal = 1 / safetyParameter("permitTermMonths");
    const fee = safetyParameter("permitFeeMinor");
    const training = safetyParameter("permitTrainingMinor");
    const groupFees = new Map<number, number>();
    const groupTraining = new Map<number, number>();
    const groupCount = new Map<number, number>();
    for (const g of census.groups) {
      const adults = g.adults21 * rate;
      const held =
        (
          table(api, "permits").get(`permits:${g.id}`) as unknown as
            { holders: number } | undefined
        )?.holders ?? 0;
      const fresh = Math.max(0, (adults * target - held) * ramp);
      const renewing = held * renewal;
      groupFees.set(g.index, (fresh + renewing) * fee);
      groupTraining.set(g.index, fresh * training);
      groupCount.set(g.index, adults);
      table(api, "permits").put({
        id: `permits:${g.id}`,
        holders: held + fresh,
      });
    }
    const personFees = new Map<PersonId, number>();
    const personTraining = new Map<PersonId, number>();
    const adultsFull = census.full.filter((p) => p.gunHome && p.age >= 21);
    for (const p of adultsFull) {
      const c = carryOf(api, p.id);
      const want = c.holder ? renewal : target * ramp;
      const owed = c.permit + want;
      const apply = owed >= 1 - 1e-9;
      table(api, "carry").put({
        ...c,
        permit: apply ? owed - 1 : owed,
        holder: c.holder || apply,
      } as unknown as ModuleRow);
      if (!apply) continue;
      personFees.set(p.id, fee);
      if (!c.holder) personTraining.set(p.id, training);
    }
    const source = sourceOf(
      api,
      "State concealed carry permit fee schedules (Giffords Law Center, Concealed Carry, 2024).",
      "Mean state application fee.",
    );
    const paidFees = levy(api, {
      id: `public-safety:permit-fee:${api.state.date}`,
      to: accounts.main(state.organizationId),
      reason: "public-safety:permit-fee",
      source,
      groups: groupFees,
      people: personFees,
    });
    if (outside)
      levy(api, {
        id: `public-safety:permit-class:${api.state.date}`,
        to: outside,
        reason: "public-safety:permit-training",
        source: sourceOf(
          api,
          "Live-fire class prices where a state requires training.",
          "Mean class price.",
        ),
        groups: groupTraining,
        people: personTraining,
      });
    for (const g of census.groups) {
      const count = groupCount.get(g.index) ?? 0;
      if (count > 0)
        lawApplied(api, {
          key: CARRY_PERMIT,
          lawId: permit,
          targetId: `group:${g.id}`,
          target: "group",
          engine: PUBLIC_SAFETY_MODULE_ID,
          what: "permit-fee",
          count: Math.max(1, Math.round(count)),
          amountMinor: paidFees.groups.get(g.index) ?? 0,
        });
      // Adults under 21 may not hold a permit: the refusal is the application.
      const young = g.adults18to20 * rate;
      if (young > 0)
        lawApplied(api, {
          key: CARRY_PERMIT,
          lawId: permit,
          targetId: `group:${g.id}:under-age`,
          target: "group",
          engine: PUBLIC_SAFETY_MODULE_ID,
          what: "permit-refused-under-age",
          count: Math.max(1, Math.round(young)),
        });
    }
    for (const [personId, amount] of paidFees.people)
      lawApplied(api, {
        key: CARRY_PERMIT,
        lawId: permit,
        targetId: personId,
        target: "person",
        engine: PUBLIC_SAFETY_MODULE_ID,
        what: "permit-fee",
        amountMinor: amount,
      });
  }
  // Handgun purchase age: young adults in gun homes buy from private sellers
  // where no age limit applies; where one does, the sale is refused.
  const age = lawIdOf(api, HANDGUN_AGE);
  const price = safetyParameter("handgunPriceMinor");
  const perMonth = safetyParameter("handgunPurchaseRate") / months;
  const groups = new Map<number, number>();
  const people = new Map<PersonId, number>();
  for (const g of census.groups) {
    const buyers = g.adults18to20 * rate * perMonth;
    if (buyers <= 0) continue;
    if (age)
      lawApplied(api, {
        key: HANDGUN_AGE,
        lawId: age,
        targetId: `group:${g.id}`,
        target: "group",
        engine: PUBLIC_SAFETY_MODULE_ID,
        what: "sale-refused-under-age",
        count: Math.max(1, Math.round(g.adults18to20 * rate)),
        amountMinor: -(buyers * price),
      });
    else groups.set(g.index, buyers * price);
  }
  for (const p of census.full) {
    if (!p.gunHome || p.age < 18 || p.age >= 21) continue;
    const c = carryOf(api, p.id);
    const owed = c.buy + perMonth;
    const buy = owed >= 1 - 1e-9;
    table(api, "carry").put({
      ...c,
      buy: buy ? owed - 1 : owed,
    } as unknown as ModuleRow);
    if (!buy) continue;
    if (age)
      lawApplied(api, {
        key: HANDGUN_AGE,
        lawId: age,
        targetId: p.id,
        target: "person",
        engine: PUBLIC_SAFETY_MODULE_ID,
        what: "sale-refused-under-age",
        amountMinor: -price,
      });
    else people.set(p.id, price);
  }
  if (!age && outside && (groups.size || people.size))
    levy(api, {
      id: `public-safety:handgun-sales:${api.state.date}`,
      to: outside,
      reason: "public-safety:private-handgun-sale",
      source: sourceOf(
        api,
        "Private handgun sales to adults under 21 where no state age limit applies (NICS and ATF purchase data).",
        "Yearly purchase rate among young adults in firearm-owning households.",
      ),
      groups,
      people,
    });
}

// ---- oversight, fire, youth harm, police -------------------------------------

function oversight(api: CoreAPI, census: Census): void {
  const lawId = lawIdOf(api, OVERSIGHT);
  if (!lawId) return;
  // stopgapId: SG-GOV-REACH-A-police-oversight
  api.stopgap("SG-GOV-REACH-A-police-oversight");
  const gov = govAt(api, ["city", "county", "state"]);
  const cost =
    (census.residents * safetyParameter("boardCostPerResidentYearMinor")) /
    safetyParameter("monthsPerYear");
  const paid = treasuryPays(
    api,
    gov,
    `public-safety:oversight:${api.state.date}`,
    "public-safety:oversight-board",
    cost,
    sourceOf(
      api,
      "Civilian oversight agency budgets (NACOLE Oversight Agency Survey 2016).",
      "Yearly cost per resident served.",
    ),
  );
  const departments = [...api.state.organizations.values()].filter(
    (o) =>
      o.placeId === census.placeId &&
      (o.classification ?? "").startsWith("service:police"),
  );
  for (const org of departments)
    lawApplied(api, {
      key: OVERSIGHT,
      lawId,
      targetId: org.id,
      target: "organization",
      engine: PUBLIC_SAFETY_MODULE_ID,
      what: "records-to-board",
      amountMinor: -paid / departments.length,
    });
  if (gov)
    lawApplied(api, {
      key: OVERSIGHT,
      lawId,
      targetId: gov.id,
      target: "government",
      engine: PUBLIC_SAFETY_MODULE_ID,
      what: "board-cost",
      amountMinor: -paid,
    });
}

/** Structure fires: more loss where the fire line has been cut. */
function fireService(api: CoreAPI, census: Census, fire: Service): number {
  const outside = outsideOf(api);
  const months = safetyParameter("monthsPerYear");
  const incidents =
    (census.households * safetyParameter("fireStructureRatePer1000")) /
    1000 /
    months;
  if (!outside || incidents <= 0) return incidents;
  const factor = Math.max(
    0.3,
    1 + safetyParameter("fireServiceLossSlope") * (1 - fire.ratio),
  );
  const loss =
    safetyParameter("fireLossMinor") *
    factor *
    safetyParameter("fireUninsuredShare");
  const groups = new Map<number, number>();
  const people = new Map<PersonId, number>();
  const per = incidents / Math.max(1, census.households);
  for (const g of census.groups) groups.set(g.index, g.households * per * loss);
  const heads = new Map<string, FullPerson>();
  for (const p of census.full)
    if (!heads.has(p.householdId) || p.age > heads.get(p.householdId)!.age)
      heads.set(p.householdId, p);
  for (const p of heads.values()) {
    const c = carryOf(api, p.id);
    const owed = c.fire + per;
    const burns = owed >= 1 - 1e-9;
    table(api, "carry").put({
      ...c,
      fire: burns ? owed - 1 : owed,
    } as unknown as ModuleRow);
    if (burns) people.set(p.id, loss);
  }
  const paid = levy(api, {
    id: `public-safety:fire-loss:${api.state.date}`,
    to: outside,
    reason: "public-safety:fire-repair",
    source: sourceOf(
      api,
      "Uninsured share of direct structure fire loss (NFPA Fire Loss in the United States 2022; Insurance Information Institute).",
      "Households' share of the loss per fire.",
    ),
    groups,
    people,
  });
  if (fire.lawId)
    for (const g of census.groups)
      lawApplied(api, {
        key: FIRE_LINE,
        lawId: fire.lawId,
        targetId: `group:${g.id}`,
        target: "group",
        engine: PUBLIC_SAFETY_MODULE_ID,
        what: "fire-response",
        count: Math.max(1, Math.round(g.households)),
        amountMinor: paid.groups.get(g.index) ?? 0,
      });
  return incidents;
}

/**
 * The youth firearm death and suicide measures the outcome web keeps (moved
 * by child access prevention and the handgun purchase age) become the
 * expected young people lost in the town this month.
 */
function youthHarm(
  api: CoreAPI,
  census: Census,
): { deaths: number; suicides: number } {
  const months = safetyParameter("monthsPerYear");
  const youth =
    census.groups.reduce((n, g) => n + g.youth, 0) +
    youthCount(api, safetyParameter("youthDeathAgeFrom"));
  const teens =
    census.groups.reduce((n, g) => n + g.youthTeens, 0) +
    youthCount(api, safetyParameter("youthSuicideAgeFrom"));
  const deaths =
    (rateOf(
      api,
      census.placeId,
      census.stateKey,
      "health.youth-firearm-deaths",
    ) *
      youth) /
    100000 /
    months;
  const suicides =
    (rateOf(
      api,
      census.placeId,
      census.stateKey,
      "health.youth-firearm-suicide",
    ) *
      teens) /
    100000 /
    months;
  // stopgapId: SG-LAW-justice-youth-firearm-harm
  api.stopgap("SG-LAW-justice-youth-firearm-harm");
  const cap = lawIdOf(api, CHILD_ACCESS);
  const age = lawIdOf(api, HANDGUN_AGE);
  for (const [key, lawId, what, count] of [
    [CHILD_ACCESS, cap, "youth-firearm-deaths-read", youth],
    [HANDGUN_AGE, age, "youth-firearm-suicides-read", teens],
  ] as const)
    if (lawId)
      lawApplied(api, {
        key,
        lawId,
        targetId: `youth:${census.placeId}`,
        target: "group",
        engine: PUBLIC_SAFETY_MODULE_ID,
        what,
        count: Math.max(1, Math.round(count)),
      });
  return { deaths, suicides };
}

function youthCount(api: CoreAPI, from: number): number {
  const core = api.state as CoreState;
  const place = lawChain(api).townPlaceId;
  let n = 0;
  for (const id of core.peopleByPlace.get(place) ?? []) {
    const p = core.people.get(id);
    if (!p?.alive) continue;
    const a = ageOn(p.birthDate, core.date);
    if (a >= from && a < 20) n += 1;
  }
  return n;
}

/** The police line's service, applied to the people it polices. */
function policeApplied(api: CoreAPI, census: Census, police: Service): void {
  if (!police.lawId) return;
  for (const g of census.groups)
    lawApplied(api, {
      key: POLICE_LINE,
      lawId: police.lawId,
      targetId: `group:${g.id}`,
      target: "group",
      engine: PUBLIC_SAFETY_MODULE_ID,
      what: "police-service",
      count: Math.max(1, Math.round(g.people)),
    });
}
