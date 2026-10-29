/**
 * Ordinary crime, courts, jail and prison, firearm laws, civilian oversight
 * and fire service for the town, at both tiers (one model, two tiers). Once a
 * month the crimes the crime engine recorded and the police were told of
 * (its month record for the town) become expected arrests by offense, at
 * each offense's clearance rate and the police the town's lines fund, shared
 * across age bands in proportion to the recorded ages of every person. The
 * cases are filed, decided and served in the justice engine (one case and
 * sentence engine, engine map E13); this engine brings the arrests, posts and
 * returns bail and pays for the days. A case runs the law in force: the juvenile age
 * picks the court, the bail law and the defendant's cash pick who waits in
 * custody, stand-your-ground and the duty to retreat pick which self-defense
 * claims end at charging, and the sentence is jail or prison paid for by the
 * county or state treasury. Firearm laws reach the households that keep a
 * gun (the state's survey rate), their compliance costs and permit fees move
 * through the journal, the oversight board costs the city, immigration
 * partnership holds arrested noncitizens for agents, and the police, fire and
 * corrections lines set how much service the departments give.
 *
 * Minor quality-of-life offenses (disorderly conduct, drunkenness, liquor law
 * violations, loitering, vagrancy and drug possession) are six more streams,
 * one per category: police start them, so no victimization stands behind
 * them. Their count is the state's real 2024 arrest rate for each category
 * times the outcome web's factor for the place, and that factor is the police
 * staffing the town's budget line funds, read through the sized
 * police-to-low-level-arrests link (`webReach`). A larger force makes more of
 * these arrests; a cut makes fewer. Every category takes the same ages and
 * case outcomes (see low-level-offenses.ts for the rates).
 *
 * Every application is recorded with `lawApplied` where the engine reads
 * the law. Nothing here is rolled: counts come from rates and the person's
 * or group's recorded facts.
 */
import parameters from "./data/public-safety/parameters.json" with { type: "json" };
import { ageOn } from "./counted-groups";
import { parameter } from "./parameters";
import { fundBalance, fundGroups, fundOf } from "./counted-money";
import { isNoncitizen } from "./citizenship";
import { citizenShareOf } from "./electorate-places";
import {
  householdOwnsFirearm,
  firearmOwnershipRate,
} from "./firearm-ownership";
import { transfer, transferSplit } from "./accounts";
import { justiceParameter } from "./justice-law";
import { lowLevelRates } from "./low-level-offenses";
import { END_CASH_BAIL } from "./justice-pretrial";
import { appliedOn, lawApplied, lawNoLongerApplies } from "./law-reach/applied";
import type { ModuleRow } from "./module-data";
import { daysBetweenText } from "./kernel/dates";
import {
  BUDGETS_MODULE_ID,
  lineWithoutBills,
  budgetsOf,
  governments,
  lineChangedBy,
  type GovernmentRow,
} from "./modules/budgets";
import { LAWS_MODULE_ID, lawChain, lawInForce } from "./modules/laws";
import { baseOf, sizeIn, WEB_LINKS } from "./outcome-web-model";
import { webReach } from "./outcome-web-reach";
import { OUTCOME_WEB_MODULE_ID, placeOutcome } from "./modules/outcome-web";
import { latestCrimeMonth, type CrimeMonth } from "./modules/crime";
import {
  countedCases,
  countedCustodyServing,
  decideCountedCase,
  escrowOf,
  fileCountedCases,
  type CountedCaseRow,
  type CountedFacility,
} from "./modules/justice";
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
/** Each age band's arrest ratio for the minor offenses, aligned with `BANDS`. */
const LOW_LEVEL_RATIOS: readonly number[] =
  parameters.ageProfile.lowLevel.ratios;

/**
 * The researched link a held defendant's conviction stands on (Dobbie,
 * Goldin and Yang 2018): detention raises the chance of conviction by its
 * size. The court reads the link's own row, so the size lives in one place.
 */
const DETENTION_LINK = WEB_LINKS.find(
  (link) => link.key === "pretrial-detention-to-conviction",
)!;

/** The offenses with a victim, each the crime engine's kind of victimization it follows. */
const OFFENSES = [
  { key: "assault", crime: "assault", violent: true },
  { key: "robbery", crime: "robbery", violent: true },
  { key: "burglary", crime: "burglary", violent: false },
  { key: "property", crime: "other-property", violent: false },
] as const;

/**
 * The minor offenses police start themselves: disorderly conduct,
 * drunkenness, liquor law violations, loitering, vagrancy and drug possession.
 * The web keeps their arrests per 1,000 residents a year, from the state's
 * real rates added together, moved by the police staffing link.
 */
export const LOW_LEVEL_MEASURE = "justice.low-level-arrests";
const LOW_LEVEL = "lowlevel" as const;
type OffenseKey = (typeof OFFENSES)[number]["key"] | typeof LOW_LEVEL;

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
  /** The town's lines today against their adopted base year, bounded. */
  readonly ratio: number;
  /** The measure that last changed the line (a bill, an ordinance, an adoption), when one did. */
  readonly lawId: string | null;
}

/**
 * A department's service: the town's own governments' budget lines today
 * against the lines they began the year with (a city's and a county's police
 * lines both police the town), or the state's line where neither the city
 * nor the county has one. The measure that last changed any of them is the
 * statute the service stands on.
 */
function serviceOf(
  api: CoreAPI,
  line: string,
  levels: readonly GovernmentRow["level"][],
): Service {
  const floor = safetyParameter("serviceFloor");
  const ceiling = safetyParameter("serviceCeiling");
  const local = levels
    .filter((l) => l !== "state")
    .map((l) => govAt(api, [l]))
    .filter((g): g is GovernmentRow => g !== null);
  const state = govAt(api, ["state"]);
  const govs = local.length ? local : state ? [state] : [];
  const date = api.state.date;
  const name = line.slice("budget-line:".length);
  let base = 0;
  let now = 0;
  let changed: { measureId: string; date: string } | null = null;
  for (const gov of govs) {
    const budget = budgetsOf(api, gov.id)
      .filter((b) => b.startsOn <= date)
      .sort((a, b) => b.startsOn.localeCompare(a.startsOn))[0];
    if (!budget) continue;
    // Against the line with no bill passed: a raise a bill carries into the
    // adopted lines moves the service every year it stays in the line.
    base += lineWithoutBills(api, gov, budget.fiscalYear, name);
    now += budget.spendingMinor[name] ?? 0;
    const change = lineChangedBy(api, gov.id, name);
    if (
      change &&
      (!changed ||
        change.date > changed.date ||
        (change.date === changed.date && change.measureId > changed.measureId))
    )
      changed = change;
  }
  const ratio = base > 0 ? Math.min(ceiling, Math.max(floor, now / base)) : 1;
  return { ratio, lawId: changed?.measureId ?? null };
}

// ---- the town's people, both tiers ------------------------------------------

export interface FullPerson {
  readonly id: PersonId;
  readonly householdId: string;
  readonly age: number;
  readonly band: number;
  readonly noncitizen: boolean;
  readonly gunHome: boolean;
  readonly childHome: boolean;
}

export interface GroupCensus {
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

export interface Census {
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

/** The town as the engine reads it each month: its named people and counted groups, by the facts the laws select on. */
export function takeCensus(api: CoreAPI): Census {
  const core = api.state as CoreState;
  const chain = lawChain(api);
  const placeId = chain.townPlaceId;
  const date = core.date;
  const citizenShare = citizenShareOf(
    core.placeMetadata.placeKey as string | undefined,
    chain.stateKey.slice(3),
    core.seed,
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
        else if (age >= parameter("votingAge"))
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

/**
 * The treasury that pays what a law moves, recorded on the law's key: the
 * county (else the city or state) is charged the added cost of cases a law
 * sends to juvenile court, spared the days it keeps people out of jail, and
 * so on, as the counted groups the money is for are. Paid out is negative.
 */
function treasuryApplied(
  api: CoreAPI,
  key: string,
  lawId: string,
  what: string,
  amountMinor: number,
): void {
  const gov = govAt(api, ["county", "city", "state"]);
  if (!gov || Math.abs(amountMinor) < 1) return;
  lawApplied(api, {
    key,
    lawId,
    targetId: gov.id,
    target: "government",
    engine: PUBLIC_SAFETY_MODULE_ID,
    what,
    amountMinor,
  });
}

// ---- records ----------------------------------------------------------------

/** A counted case as public safety builds it, before the justice engine files it. */
type CaseRow = Omit<
  CountedCaseRow,
  "kind" | "defendantId" | "prosecutorOfficeId" | "status" | "sentenceId"
> & {
  readonly offense: OffenseKey;
};

export interface SafetyMonth {
  readonly id: string;
  readonly month: string;
  /** The town and day the month stands for (the outcome web reads engine rows by place). */
  readonly placeId: string;
  readonly date: string;
  /** Sworn officers per 1,000 residents: the state's recorded rate times the town's police service. */
  readonly officersPer1000: number;
  readonly arrests: number;
  /** The minor-offense arrests among them, the rate they were made at and the web month row that rate stood on. */
  readonly lowLevelArrests: number;
  readonly lowLevelRatePer1000: number;
  readonly lowLevelWebId: string;
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
  /** Of those, the minor offenses (the state's rate times the web's police factor). */
  lowLevelArrests: number;
  /** The rate they were made at, arrests per 1,000 residents a year, and the web month it stood on. */
  lowLevelRatePer1000: number;
  lowLevelWebId: string;
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
    lowLevelArrests: 0,
    lowLevelRatePer1000: 0,
    lowLevelWebId: "",
    juvenileCases: 0,
    detained: 0,
    convicted: 0,
    incarcerated: 0,
    jailDays: 0,
    detainerHolds: 0,
  };
  resolveDue(api, month, tally);
  arrest(api, census, month, police, tally);
  serveTerms(api, month, corrections, tally);
  firearms(api, census);
  oversight(api, census);
  const fireIncidents = fireService(api, census, fire);
  const youth = youthHarm(api, census);
  policeApplied(api, census, police);
  retireGoneGroups(api, census);
  const open = countedCases(api, "charged").reduce((n, c) => n + c.detained, 0);
  table(api, "months").put({
    id: `safety:${month}`,
    month,
    placeId: census.placeId,
    date: core.date,
    officersPer1000: officersPer1000(census.stateKey, api.state.seed, police),
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

/** The officers the town's police lines fund per 1,000 residents: the state's recorded rate, scaled by the lines against where they began the year. */
function officersPer1000(
  stateKey: string,
  seed: string,
  police: Service,
): number {
  return (
    baseOf("police.officers-per-1000", stateKey, seed).value * police.ratio
  );
}

/**
 * The opening month's row: no line has changed yet, so the town's police
 * stand at the state's recorded rate. The outcome web reads this as the
 * level every later change is measured from.
 */
export function openingSafetyMonth(api: CoreAPI): void {
  if (!api.state.modules.has(LAWS_MODULE_ID)) return;
  const chain = lawChain(api);
  table(api, "months").put({
    id: `safety:opening`,
    month: monthOf(api.state.date),
    placeId: chain.townPlaceId,
    date: api.state.date,
    officersPer1000: baseOf(
      "police.officers-per-1000",
      chain.stateKey,
      api.state.seed,
    ).value,
    arrests: 0,
    lowLevelArrests: 0,
    lowLevelRatePer1000: baseOf(
      LOW_LEVEL_MEASURE,
      chain.stateKey,
      api.state.seed,
    ).value,
    lowLevelWebId: "",
    juvenileCases: 0,
    detained: 0,
    convicted: 0,
    incarcerated: 0,
    jailDays: 0,
    detainerHolds: 0,
    policeService: 1,
    correctionsService: 1,
    fireService: 1,
    fireIncidents: 0,
    youthFirearmDeathsExpected: 0,
    youthFirearmSuicidesExpected: 0,
    pretrialDetainedPer100k: 0,
  } satisfies SafetyMonth as unknown as ModuleRow);
}

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

/** One kind of offense this month: how many arrests are expected and how the age bands share them. */
interface Stream {
  readonly key: OffenseKey;
  /** Which minor-offense category the stream is (only the minor offenses have one). */
  readonly category?: string;
  readonly violent: boolean;
  readonly expected: number;
  /** Each age band's arrest ratio and the weight of the town's people under it. */
  readonly ratios: readonly number[];
  readonly weight: number;
  /** What the count was read from, kept on each case (only the minor offenses read the web). */
  readonly read?: { readonly webRecordId: string; readonly officers: number };
  /** The crime engine's month record an offense with a victim followed. */
  readonly crimeRecordId?: string;
}

/**
 * The minor offenses this month, one stream per category. Police start these
 * arrests, so there is no victimization to clear: the count is the state's
 * real 2024 rate (a check on the total) times the web's factor for the place,
 * which the sized police-to-low-level-arrests link moves with the officers per
 * 1,000 the police lines fund. The web holds one rate for the six categories
 * together; each category gets its own share of it, its real rate in the state
 * over the six added up, so the streams add to the web's month exactly. The
 * case flow reads the factor and the web month row it stands on here, the
 * moment it records the month's arrests.
 */
function lowLevelStreams(
  api: CoreAPI,
  census: Census,
  police: Service,
  tally: Tally,
): Stream[] {
  const reach = webReach(api, census.placeId, LOW_LEVEL_MEASURE);
  const rate =
    baseOf(LOW_LEVEL_MEASURE, census.stateKey, api.state.seed).value *
    reach.factor;
  tally.lowLevelRatePer1000 = rate;
  tally.lowLevelWebId = reach.recordId ?? "";
  const weight = LOW_LEVEL_RATIOS.reduce(
    (n, ratio, i) => n + ratio * census.bandTotals[i]!,
    0,
  );
  const rates = lowLevelRates(census.stateKey);
  const all = rates.reduce((n, r) => n + r.ratePer1000, 0);
  if (weight <= 0 || all <= 0) return [];
  const read = {
    webRecordId: reach.recordId ?? "",
    officers: officersPer1000(census.stateKey, api.state.seed, police),
  };
  return rates.map((r) => ({
    key: LOW_LEVEL,
    category: r.category.key,
    violent: false,
    expected:
      (rate * (r.ratePer1000 / all) * census.residents) /
      1000 /
      safetyParameter("monthsPerYear"),
    ratios: LOW_LEVEL_RATIOS,
    weight,
    read,
  }));
}

/** The crime engine's record of the town's month, when it has made one. */
function crimeMonthOf(
  api: CoreAPI,
  placeId: string,
  month: string,
): CrimeMonth | undefined {
  const row = latestCrimeMonth(api, placeId);
  return row?.month === month ? row : undefined;
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
  // Each stream is one kind of offense: its expected arrests this month and
  // the age profile that shares them out.
  const streams: Stream[] = [];
  // The crimes the crime engine recorded this month and the police were told
  // of; a month it has not recorded (no web month for the town) brings none.
  const crimes = crimeMonthOf(api, census.placeId, month);
  const service = Math.pow(
    police.ratio,
    safetyParameter("policeServiceElasticity"),
  );
  if (crimes)
    for (const offense of OFFENSES)
      streams.push({
        key: offense.key,
        violent: offense.violent,
        expected:
          crimes.types[offense.crime].reported * cleared(offense.key) * service,
        ratios: BANDS.map((b) => b.ratio),
        weight: weightTotal,
        crimeRecordId: crimes.id,
      });
  streams.push(...lowLevelStreams(api, census, police, tally));
  for (const {
    key,
    category,
    violent,
    expected,
    ratios,
    weight,
    read,
    crimeRecordId,
  } of streams) {
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
        const share = (expected * ratios[b]! * n) / weight;
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
          offense: key,
          category,
          violent,
          read,
          crimeRecordId,
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
  const filed = cases.map((posted) => postBail(api, pool, posted));
  fileCountedCases(api, filed);
  for (const c of filed) {
    tally.arrests += c.count;
    if (c.offense === LOW_LEVEL) tally.lowLevelArrests += c.count;
    if (c.court === "juvenile") tally.juvenileCases += c.count;
    tally.detained += c.detained;
  }
  if (immigration) detainers(api, pool, immigration, countedHolds, tally);
  // The county pays what each adult case costs at filing.
  courtCosts(api, cases);
}

/** Days a jail term runs for an offense: the minor offenses are misdemeanors, with shorter terms than a felony's. */
const jailDays = (offense: OffenseKey) =>
  safetyParameter(
    offense === LOW_LEVEL ? "jailSentenceDays.lowlevel" : "jailSentenceDays",
  );

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

/**
 * Counted defendants who post bail pay it as a full person does: where cash
 * bail is in force, each group's share that can post moves the bail from the
 * group's fund into the prosecuting county's court escrow, as much as the
 * fund holds, and it is held there until the case closes.
 */
function postBail(api: CoreAPI, census: Census, c: CaseRow): CaseRow {
  if (c.court !== "adult" || c.bailLawId || c.count <= 0) return c;
  const gov = govAt(api, ["county", "state"]);
  const core = api.state as CoreState;
  if (
    !gov ||
    !core.cashJournal.accounts.has(`cash:${gov.organizationId}:residual`)
  )
    return c;
  const bail = justiceParameter(api, "pretrialBailMinor");
  const byId = new Map(census.groups.map((g) => [g.id, g]));
  const scale = c.count / Object.values(c.groups).reduce((n, v) => n + v, 0);
  const wants = new Map<number, number>();
  for (const [gid, n] of Object.entries(c.groups)) {
    const g = byId.get(gid);
    // The named residents' unnamed share has no fund of its own.
    if (!g || g.index < 0) continue;
    const posting = n * scale * (1 - unableToPost(api, g));
    if (posting > 0) wants.set(g.index, posting * bail);
  }
  if (!wants.size) return c;
  const paid = levy(api, {
    id: `public-safety:bail:${c.id}`,
    to: escrowOf(api, gov.organizationId),
    reason: "public-safety:bail",
    source: sourceOf(
      api,
      "Bail is held by the court apart from the government's own funds until the case is heard; a counted group posts it for the share of its defendants who can.",
    ),
    groups: wants,
    people: new Map(),
  });
  if (!paid.groups.size) return c;
  return {
    ...c,
    bailHeld: Object.fromEntries(
      [...paid.groups].map(([group, minor]) => [String(group), minor]),
    ),
    bailTreasuryId: gov.organizationId,
  };
}

/** The case is closed: the court escrow hands each group's bail back to its fund. */
function returnCountedBail(api: CoreAPI, c: CountedCaseRow): void {
  const held = Object.entries(c.bailHeld ?? {}).filter(([, m]) => m > 0);
  const core = api.state as CoreState;
  const rt = residentsRuntime(core);
  if (!held.length || !c.bailTreasuryId || !rt) return;
  const total = held.reduce((n, [, m]) => n + m, 0);
  transferSplit(core, api, {
    id: `public-safety:bail-return:${c.id}`,
    lines: [
      { accountId: escrowOf(api, c.bailTreasuryId), deltaMinor: -total },
      ...held.map(([group, minor]) => ({
        accountId: fundOf(api, rt, Number(group)),
        deltaMinor: minor,
      })),
    ],
    reasonKey: "public-safety:bail-return",
    source: sourceOf(
      api,
      "The court returns posted bail when the case is heard, whatever the verdict.",
    ),
  });
}

function batchCase(
  api: CoreAPI,
  census: Census,
  input: {
    offense: OffenseKey;
    category?: string;
    violent: boolean;
    read?: Stream["read"];
    crimeRecordId?: string;
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
  const id = `case:${input.month}:${input.offense}${input.category ? `:${input.category}` : ""}:${input.court}:${input.band}`;
  let detained = 0;
  // Who money bail would hold, whatever the law: the detention the offense's
  // base conviction share stands at (see resolveDue).
  let heldOnMoney = 0;
  const byId = new Map(census.groups.map((g) => [g.id, g]));
  if (input.court === "adult") {
    const dangerous = input.violent
      ? safetyParameter("dangerDetentionShare")
      : 0;
    let avoided = 0;
    for (const [gid, n] of Object.entries(input.groups)) {
      const g = byId.get(gid)!;
      const cash = unableToPost(api, g);
      heldOnMoney += n * cash;
      detained += n * (input.bailLaw ? dangerous : cash);
      avoided += n * Math.max(0, cash - (input.bailLaw ? dangerous : cash));
    }
    if (input.bailLaw && avoided > 0) {
      const days = dueMonths(input.offense) * safetyParameter("daysPerMonth");
      const perDiem =
        safetyParameter("jailPerDiemMinor") *
        safetyParameter("marginalCostShare");
      let spared = 0;
      for (const [gid, n] of Object.entries(input.groups)) {
        const g = byId.get(gid)!;
        const cash = unableToPost(api, g);
        const amountMinor = -(
          n *
          Math.max(0, cash - dangerous) *
          days *
          perDiem
        );
        spared += amountMinor;
        lawApplied(api, {
          key: CASH_BAIL,
          lawId: input.bailLaw,
          targetId: gid,
          target: "group",
          engine: PUBLIC_SAFETY_MODULE_ID,
          what: "released-without-bail",
          count: Math.max(1, Math.round(n * cash)),
          amountMinor,
        });
      }
      // The county that would have paid those jail days is spared them.
      treasuryApplied(
        api,
        CASH_BAIL,
        input.bailLaw,
        "jail-days-avoided",
        -spared,
      );
    }
  }
  if (input.court === "juvenile" && input.juvenileLaw) {
    // Young adults whose cases the raised age sends to juvenile court.
    let added = 0;
    for (const [gid, n] of Object.entries(input.groups)) {
      if (BANDS[input.band]!.from < safetyParameter("juvenileAgeDefault"))
        break;
      const amountMinor = n * juvenileMinusAdultCost(input.offense);
      added += amountMinor;
      lawApplied(api, {
        key: JUVENILE_AGE,
        lawId: input.juvenileLaw,
        targetId: gid,
        target: "group",
        engine: PUBLIC_SAFETY_MODULE_ID,
        what: "case-in-juvenile-court",
        count: Math.max(1, Math.round(n)),
        amountMinor,
      });
    }
    // The county pays the added cost of those cases.
    treasuryApplied(
      api,
      JUVENILE_AGE,
      input.juvenileLaw,
      "juvenile-court-cost",
      -added,
    );
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
    heldOnMoney *= input.count > 0 ? count / input.count : 1;
    if (input.syg) {
      let spared = 0;
      for (const [gid, n] of Object.entries(input.groups)) {
        const amountMinor =
          -(saved * (n / input.count)) * adultCaseCost(input.offense);
        spared += amountMinor;
        lawApplied(api, {
          key: STAND_GROUND,
          lawId: input.syg,
          targetId: gid,
          target: "group",
          engine: PUBLIC_SAFETY_MODULE_ID,
          what: "force-claim-dismissed",
          count: Math.max(
            1,
            Math.round(n * safetyParameter("forceClaimShare") * retreat),
          ),
          amountMinor,
        });
      }
      // The county is spared the cost of the cases that end at charging.
      treasuryApplied(api, STAND_GROUND, input.syg, "cases-dismissed", -spared);
    }
  }
  return {
    id,
    month: input.month,
    offense: input.offense,
    ...(input.category ? { category: input.category } : {}),
    court: input.court,
    band: input.band,
    count,
    groups: input.groups,
    detained,
    heldOnMoney,
    noncitizens: input.noncitizens,
    bailLawId: input.bailLaw ?? "",
    ...(input.read
      ? {
          webRecordId: input.read.webRecordId,
          officersPer1000: input.read.officers,
        }
      : {}),
    ...(input.crimeRecordId ? { crimeRecordId: input.crimeRecordId } : {}),
    dueMonth: addMonths(input.month, dueMonths(input.offense)),
  };
}

/** What one juvenile case costs the treasuries beyond what the same adult case would. */
function juvenileMinusAdultCost(offense: OffenseKey): number {
  const adult =
    safetyParameter("courtCostPerCaseMinor") +
    safetyParameter(`convictedShare.${offense}`) *
      safetyParameter(`incarceratedShare.${offense}`) *
      jailDays(offense) *
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

/**
 * The counted cases whose month has come: the conviction, incarceration and
 * prison shares of the offense decide how many are convicted and where they
 * serve, and the justice engine records the sentence and the custody. Bail
 * goes back to the groups that posted it, whatever the verdict.
 */
function resolveDue(api: CoreAPI, month: string, tally: Tally): void {
  for (const c of countedCases(api, "charged")) {
    if (c.dueMonth > month) continue;
    const offense = c.offense as OffenseKey;
    const count = c.count;
    const terms: { facility: CountedFacility; count: number; days: number }[] =
      [];
    let convicted: number;
    let reasons: Record<string, number | string> | undefined;
    if (c.court === "adult") {
      // pretrial-detention-to-conviction: a defendant held until the case is
      // decided is convicted at the released defendant's rate times one plus
      // the link's size. The offense's base share was measured with the
      // detention money bail brings, so the case is convicted at the base
      // where it holds that many, and at fewer where the law held fewer.
      const heldShare = c.count > 0 ? c.detained / c.count : 0;
      const moneyShare =
        c.count > 0 ? (c.heldOnMoney ?? c.detained) / c.count : 0;
      const base = safetyParameter(`convictedShare.${offense}`);
      const detention = sizeIn(DETENTION_LINK, lawChain(api).stateKey);
      const released = base / (1 + detention * moneyShare);
      convicted = count * released * (1 + detention * heldShare);
      reasons = {
        link: DETENTION_LINK.key,
        baseShare: base,
        heldShare,
        heldOnMoneyShare: moneyShare,
        detentionSize: detention,
        releasedShare: released,
      };
      const incarcerated =
        convicted * safetyParameter(`incarceratedShare.${offense}`);
      const prison = incarcerated * safetyParameter(`prisonShare.${offense}`);
      terms.push(
        {
          facility: "jail",
          count: incarcerated - prison,
          days: jailDays(offense),
        },
        {
          facility: "prison",
          count: prison,
          days: safetyParameter("prisonSentenceDays"),
        },
      );
      tally.convicted += convicted;
      tally.incarcerated += incarcerated;
    } else {
      convicted = count * safetyParameter("juvenileAdjudicatedShare");
      terms.push({
        facility: "juvenile",
        count: convicted * safetyParameter("juvenilePlacedShare"),
        days: safetyParameter("juvenilePlacementDays"),
      });
    }
    decideCountedCase(api, c.id, {
      convicted,
      ...(reasons ? { reasons } : {}),
      terms,
    });
    returnCountedBail(api, c);
  }
}

const adultCaseCost = (offense: OffenseKey) =>
  safetyParameter("courtCostPerCaseMinor") +
  safetyParameter(`convictedShare.${offense}`) *
    safetyParameter(`incarceratedShare.${offense}`) *
    jailDays(offense) *
    safetyParameter("jailPerDiemMinor") *
    safetyParameter("marginalCostShare");

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
  const cases = new Map(
    [...countedCases(api, "charged"), ...countedCases(api, "decided")].map(
      (c) => [c.id, c],
    ),
  );
  const owed = { jail: 0, prison: 0, juvenile: 0 };
  let movedByLine = 0;
  // Who the corrections line houses this month, by counted group: the people
  // in pretrial custody and serving a term, with what the line's capacity
  // changed of their days' cost (nothing while the line houses everyone who is
  // held, less when it cannot).
  const housed = new Map<string, { people: number; moved: number }>();
  const house = (
    c: CountedCaseRow | undefined,
    people: number,
    moved: number,
  ) => {
    const total = c ? Object.values(c.groups).reduce((n, v) => n + v, 0) : 0;
    if (!c || total <= 0 || people <= 0) return;
    for (const [gid, n] of Object.entries(c.groups)) {
      const held = housed.get(gid) ?? { people: 0, moved: 0 };
      held.people += (people * n) / total;
      held.moved += (moved * n) / total;
      housed.set(gid, held);
    }
  };
  // Pretrial custody: detained defendants of every open adult case.
  let pretrialDays = 0;
  for (const c of countedCases(api, "charged")) {
    pretrialDays += c.detained * days;
    house(c, c.detained, 0);
  }
  owed.jail += pretrialDays * safetyParameter("jailPerDiemMinor") * share;
  // Each term's days from today to the next month's run, in advance: a term
  // is paid for the days it runs and no more.
  const today = api.state.date;
  const next = `${addMonths(month, 1)}${today.slice("YYYY-MM".length)}`;
  for (const t of countedCustodyServing(api)) {
    const billed = Math.max(
      0,
      daysBetweenText(
        t.from > today ? t.from : today,
        t.until < next ? t.until : next,
      ),
    );
    if (billed <= 0) continue;
    const perDiem =
      t.facility === "prison"
        ? safetyParameter("prisonPerDiemMinor")
        : t.facility === "juvenile"
          ? safetyParameter("juvenilePerDiemMinor")
          : safetyParameter("jailPerDiemMinor");
    owed[t.facility] += t.count * billed * served * perDiem * share;
    const cut = t.count * billed * (served - 1) * perDiem * share;
    if (t.facility !== "juvenile") movedByLine += cut;
    house(cases.get(t.caseId), t.count * served, cut);
    tally.jailDays += t.count * billed * served;
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
  // The corrections line's capacity is applied to the government that pays
  // for the days and to the counted people whose days they are.
  if (corrections.lawId) {
    lawApplied(api, {
      key: CORRECTIONS_LINE,
      lawId: corrections.lawId,
      targetId: "service:corrections",
      target: "government",
      engine: PUBLIC_SAFETY_MODULE_ID,
      what: "jail-capacity-served",
      amountMinor: movedByLine,
    });
    for (const [gid, held] of housed)
      lawApplied(api, {
        key: CORRECTIONS_LINE,
        lawId: corrections.lawId,
        targetId: gid,
        target: "group",
        engine: PUBLIC_SAFETY_MODULE_ID,
        what: "jail-capacity-served",
        count: Math.max(1, Math.round(held.people)),
        amountMinor: held.moved,
      });
  }
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
      targetId: g.id,
      target: "group",
      engine: PUBLIC_SAFETY_MODULE_ID,
      what: "detainer-hold",
      count: Math.max(1, Math.round(holds)),
      amountMinor: holds * days * perDiem,
    });
  }
  tally.detainerHolds += total;
  const paid = treasuryPays(
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
  // The county that paid the holds.
  treasuryApplied(api, IMMIGRATION, lawId, "detainer-hold-cost", -paid);
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
          targetId: g.id,
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
          targetId: g.id,
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
          targetId: g.id,
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
          targetId: `${g.id}:under-age`,
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
        targetId: g.id,
        target: "group",
        engine: PUBLIC_SAFETY_MODULE_ID,
        what: "sale-refused-under-age",
        count: Math.max(1, Math.round(g.adults18to20 * rate)),
        amountMinor: -(buyers * price),
      });
    else groups.set(g.index, buyers * price);
  }
  for (const p of census.full) {
    if (
      !p.gunHome ||
      p.age < parameter("votingAge") ||
      p.age >= safetyParameter("permitAge")
    )
      continue;
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
        targetId: g.id,
        target: "group",
        engine: PUBLIC_SAFETY_MODULE_ID,
        what: "fire-response",
        count: Math.max(1, Math.round(g.households)),
        amountMinor: paid.groups.get(g.index) ?? 0,
      });
  // A full household's head whose home burned paid the loss the department's
  // response left them with, as a counted group's households do.
  if (fire.lawId)
    for (const [personId, amount] of paid.people)
      lawApplied(api, {
        key: FIRE_LINE,
        lawId: fire.lawId,
        targetId: personId,
        target: "person",
        engine: PUBLIC_SAFETY_MODULE_ID,
        what: "fire-response",
        amountMinor: amount,
      });
  return incidents;
}

/** A measure the outcome web keeps for the place, or this world's starting level where it keeps none. */
function webRate(
  api: CoreAPI,
  placeId: string,
  stateKey: string,
  measure: string,
): number {
  const web = api.state.modules.has(OUTCOME_WEB_MODULE_ID)
    ? placeOutcome(api, placeId, measure)
    : undefined;
  return web?.value ?? baseOf(measure, stateKey, api.state.seed).value;
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
    (webRate(
      api,
      census.placeId,
      census.stateKey,
      "health.youth-firearm-deaths",
    ) *
      youth) /
    100000 /
    months;
  const suicides =
    (webRate(
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

/**
 * A law's row on a counted group ends when the group has no residents left
 * in the town (its households moved, aged into another group or changed
 * work): the engine no longer applies the law to it.
 */
function retireGoneGroups(api: CoreAPI, census: Census): void {
  const live = new Set(["named-residents", ...census.groups.map((g) => g.id)]);
  for (const key of [
    POLICE_LINE,
    FIRE_LINE,
    CORRECTIONS_LINE,
    CASH_BAIL,
    IMMIGRATION,
    JUVENILE_AGE,
    CHILD_ACCESS,
    CARRY_PERMIT,
    HANDGUN_AGE,
    STAND_GROUND,
  ])
    for (const row of appliedOn(api, key)) {
      // Only a census group's own row: other group rows (the town's youth) stand for no one group.
      if (row.target !== "group" || !row.targetId.startsWith("group:"))
        continue;
      const id = row.targetId.replace(/:under-age$/, "");
      if (!live.has(id)) lawNoLongerApplies(api, key, row.targetId);
    }
}

/** The police line's service, applied to the people it polices. */
function policeApplied(api: CoreAPI, census: Census, police: Service): void {
  if (!police.lawId) return;
  for (const g of census.groups)
    lawApplied(api, {
      key: POLICE_LINE,
      lawId: police.lawId,
      targetId: g.id,
      target: "group",
      engine: PUBLIC_SAFETY_MODULE_ID,
      what: "police-service",
      count: Math.max(1, Math.round(g.people)),
    });
}
