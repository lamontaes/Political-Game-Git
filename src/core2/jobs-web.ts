/**
 * How the outcome web reaches the jobs engine's people: who is in a group
 * the web keeps a participation outcome for (mothers of young children,
 * married women, people near retirement), the log of the web's factor on
 * the pull to work for one of them, and the low-wage share of a staff.
 * The jobs engine keeps deciding from its own records; this only reads the
 * web's factor for the people the records say belong to each group, and the
 * justice record of the one researched cause that is a person's own: having
 * been held in custody while waiting for a hearing.
 */
import {
  isNoncitizen as isNoncitizenOf,
  isUnauthorized,
} from "./modules/people";
import { ageOn, MemberState, type CountedStore } from "./counted-groups";
import { citizenShareOf } from "./modules/voting";
import { lawChain } from "./modules/laws";
import { firstHeldPretrial } from "./modules/justice";
import { carriedLink } from "./modules/outcome-web";
import { completedMonthsBetween, makeIsoDate } from "./kernel/dates";
import type { HouseholdKind } from "./counted-groups";
import { parameter } from "./parameters";
import { webFactorFor, type Subject } from "./outcome-web-reach";
import { stopgap } from "./stopgaps";
import type { CoreAPI, CoreState } from "./types";

export const MOTHERS = "labor.mothers-participation";
export const MARRIED_WOMEN = "labor.married-women-participation";
export const OLDER_WORK = "labor.older-employment";
export const LOW_WAGE_JOBS = "labor.low-wage-jobs";
export const UNDOCUMENTED = "labor.undocumented-employment";
export const US_BORN = "labor.us-born-employment";

export interface LaborFacts {
  readonly age: number;
  readonly sex?: "female" | "male";
  readonly householdKind?: HouseholdKind;
  readonly incomeFifth?: number;
  readonly mother: boolean;
  readonly partnered: boolean;
  /** The person's id, for what is seeded on who they are (work authorization). */
  readonly id?: string;
}

interface Relative {
  readonly age: number;
  readonly partner?: boolean;
  readonly child?: boolean;
}

/** The groups a person's records put them in, from their relatives' ages and links. */
export function factsOf(
  age: number,
  sex: "female" | "male" | undefined,
  relatives: readonly Relative[],
  p: (key: string) => number,
  householdKind?: HouseholdKind,
  incomeFifth?: number,
): LaborFacts {
  const gap = parameter("minimumParentAgeAtBirth");
  const mother =
    sex === "female" &&
    relatives.some(
      (r) =>
        r.age < p("jobsMotherYoungChildYears") &&
        (r.child ?? age - r.age >= gap),
    );
  const partnered =
    sex === "female" &&
    age >= p("jobsAdultAge") &&
    relatives.some(
      (r) =>
        r.partner ??
        (r.age >= p("jobsAdultAge") && Math.abs(age - r.age) < gap),
    );
  return { age, sex, householdKind, incomeFifth, mother, partnered };
}

/** Full people's partner and child links, indexed once per link count. */
const LINKS = new WeakMap<
  CoreState,
  {
    size: number;
    partners: Map<string, string[]>;
    children: Map<string, string[]>;
  }
>();
function linksOf(c: CoreState) {
  let index = LINKS.get(c);
  if (!index || index.size !== c.familyLinks.size) {
    index = {
      size: c.familyLinks.size,
      partners: new Map(),
      children: new Map(),
    };
    const add = (map: Map<string, string[]>, id: string, other: string) =>
      map.set(id, [...(map.get(id) ?? []), other]);
    for (const link of c.familyLinks.values()) {
      const [a, b] = link.personIds;
      if (link.kind === "partner") {
        add(index.partners, a, b);
        add(index.partners, b, a);
      } else add(index.children, a, b);
    }
    LINKS.set(c, index);
  }
  return index;
}

/** A full person's groups, from the family links and the household they live in. */
export function fullFacts(
  api: CoreAPI,
  personId: string,
  p: (key: string) => number,
): LaborFacts | undefined {
  const c = api.state as CoreState;
  const person = c.people.get(personId);
  if (!person) return undefined;
  const age = ageOn(person.birthDate, c.date);
  const links = linksOf(c);
  const relatives: Relative[] = [];
  for (const id of links.children.get(personId) ?? []) {
    const child = c.people.get(id);
    if (child?.alive)
      relatives.push({
        age: ageOn(child.birthDate, c.date),
        child: true,
        partner: false,
      });
  }
  for (const id of links.partners.get(personId) ?? [])
    if (c.people.get(id)?.alive)
      relatives.push({ age: 99, child: false, partner: true });
  const members = c.households.get(person.householdId)?.memberIds ?? [];
  let adults = 0,
    kids = 0;
  for (const id of members) {
    const member = c.people.get(id);
    if (!member?.alive) continue;
    if (ageOn(member.birthDate, c.date) < p("jobsAdultAge")) kids++;
    else adults++;
  }
  const kind: HouseholdKind = kids
    ? "with-children"
    : adults > 1
      ? "adults"
      : "one-adult";
  const gender = person.looks?.gender;
  return {
    ...factsOf(
      age,
      gender === "female" || gender === "male" ? gender : undefined,
      relatives,
      p,
      kind,
    ),
    id: personId,
  };
}

/**
 * A counted member's groups. The counts keep family pairs without their kind
 * and no marital status, so a partner is an adult relative close in age and a
 * child a relative at least the youngest parent age younger.
 */
export function countedFacts(
  api: CoreAPI,
  store: CountedStore,
  member: number,
  p: (key: string) => number,
): LaborFacts {
  stopgap("SG-LABOR-counted-partner-proxy");
  const date = api.state.date;
  const h = store.households[store.household[member]!]!;
  const relatives: Relative[] = [];
  const kin = h.kin;
  for (let i = 0; i < kin.length; i += 2) {
    const other =
      kin[i] === member ? kin[i + 1]! : kin[i + 1] === member ? kin[i]! : -1;
    if (other < 0) continue;
    const state = store.state[other]!;
    if (state === MemberState.Dead || state === MemberState.Moved) continue;
    relatives.push({ age: ageOn(store.born[other]!, date) });
  }
  const gender = store.strings[store.genderIx[member]!];
  const group = store.groups[h.group];
  return {
    ...factsOf(
      ageOn(store.born[member]!, date),
      gender === "female" || gender === "male" ? gender : undefined,
      relatives,
      p,
      group?.kind,
      group?.incomeBand,
    ),
    id: store.ids[member]!,
  };
}

/**
 * Whether the web moves a measure at a place today: an enforcement law in
 * force, say. Only then is a person's seeded work authorization read, so a
 * town with no such law spends nothing on it. Cached per place and day.
 */
const MOVING = new WeakMap<
  CoreState,
  { date: string; byKey: Map<string, boolean> }
>();
function moves(api: CoreAPI, placeId: string, measure: string): boolean {
  const c = api.state as CoreState;
  let cache = MOVING.get(c);
  if (!cache || cache.date !== c.date)
    MOVING.set(c, (cache = { date: c.date, byKey: new Map() }));
  const key = `${placeId}|${measure}`;
  let moving = cache.byKey.get(key);
  if (moving === undefined)
    cache.byKey.set(key, (moving = webFactorFor(api, placeId, measure) !== 1));
  return moving;
}

/**
 * Whether the web moves either work-authorization outcome at a place today,
 * the same reads `moves` makes, kept per place for the day so each worker
 * after the first costs one lookup.
 */
const ENFORCING = new WeakMap<
  CoreState,
  { date: string; byPlace: Map<string, boolean> }
>();
function enforcementMoves(api: CoreAPI, placeId: string): boolean {
  const c = api.state as CoreState;
  let cache = ENFORCING.get(c);
  if (!cache || cache.date !== c.date)
    ENFORCING.set(c, (cache = { date: c.date, byPlace: new Map() }));
  let moving = cache.byPlace.get(placeId);
  if (moving === undefined)
    cache.byPlace.set(
      placeId,
      (moving =
        moves(api, placeId, UNDOCUMENTED) || moves(api, placeId, US_BORN)),
    );
  return moving;
}

/**
 * The outcome a person's work authorization puts them under: an unauthorized
 * noncitizen's employment, or a citizen's, standing for the U.S.-born the
 * research measures (the core records no birthplace). A noncitizen with
 * authorization is in neither. Seeded on who they are (citizenship.ts) at the
 * town's citizen share.
 */
export function authorizationMeasure(
  api: CoreAPI,
  personId: string,
  p: (key: string) => number,
): string {
  // stopgapId: SG-LABOR-no-legal-status
  stopgap("SG-LABOR-no-legal-status");
  const c = api.state as CoreState;
  const share = citizenShareOf(
    c.placeMetadata.placeKey,
    lawChain(api).stateKey.slice(3),
    c.seed,
  );
  if (
    isUnauthorized(c.seed, personId, share, p("unauthorizedShareOfNoncitizens"))
  )
    return UNDOCUMENTED;
  return isNoncitizenOf(c.seed, personId, share) ? "" : US_BORN;
}

const SHIFTS = new WeakMap<
  CoreState,
  { date: string; byKey: Map<string, number> }
>();

/**
 * The log of the web's factor on the pull to be at work for this person:
 * mothers of young children, married women and people from the earliest
 * retirement age to the full retirement age each have their own outcome, and
 * a person in several takes each (they are separate causes). The older
 * workers' term is weighted, fitted so a played year moves their share at
 * work by the researched size. Zero where the web moves nothing. Cached per
 * place and band for the day.
 */
function bandShift(
  api: CoreAPI,
  placeId: string,
  facts: LaborFacts,
  p: (key: string) => number,
): number {
  const measures: string[] = [];
  if (facts.mother) measures.push(MOTHERS);
  if (facts.partnered) measures.push(MARRIED_WOMEN);
  if (
    facts.age >= p("jobsEarliestRetirementAge") &&
    facts.age < p("jobsFullRetirementAge")
  )
    measures.push(OLDER_WORK);
  // Local immigration enforcement reaches a worker by their work
  // authorization, read only where the web moves either outcome.
  if (facts.id && enforcementMoves(api, placeId)) {
    const measure = authorizationMeasure(api, facts.id, p);
    if (measure) measures.push(measure);
  }
  if (!measures.length) return 0;
  if (facts.mother || facts.partnered) stopgap("SG-LABOR-participation-scale");
  const c = api.state as CoreState;
  let cache = SHIFTS.get(c);
  if (!cache || cache.date !== c.date)
    SHIFTS.set(c, (cache = { date: c.date, byKey: new Map() }));
  const key = `${placeId}|${measures.join(",")}|${facts.age}|${facts.sex}|${facts.householdKind}|${facts.incomeFifth}`;
  const known = cache.byKey.get(key);
  if (known !== undefined) return known;
  const subject: Subject = {
    age: facts.age,
    ...(facts.sex ? { sex: facts.sex } : {}),
    ...(facts.householdKind ? { householdKind: facts.householdKind } : {}),
    ...(facts.incomeFifth !== undefined
      ? { incomeFifth: facts.incomeFifth }
      : {}),
  };
  let shift = 0;
  for (const measure of measures)
    shift +=
      (measure === OLDER_WORK ? p("jobsOlderWorkWebWeight") : 1) *
      Math.log(Math.max(1e-6, webFactorFor(api, placeId, measure, subject)));
  cache.byKey.set(key, shift);
  return shift;
}

/** The link that lowers the pull to formal work of someone held while waiting for a hearing. */
export const DETENTION_LINK = "pretrial-detention-to-employment";

/**
 * The log of the researched change in a person's pull to formal work from
 * having been held in custody while waiting for their hearing (Dobbie, Goldin
 * and Yang 2018: detained defendants' formal employment runs about 20% under
 * that of those released). The cause is the person's own justice record, so
 * no place rate carries it (the row names this function in `carriedBy`): it
 * reads the pretrial decision `held`, and applies once the row's lag has run
 * from the day they were first held. Zero for anyone else, and for a counted
 * member: the justice engine keeps counted defendants as cases by group, with
 * no record of which member was held.
 */
// stopgapId: SG-LABOR-pretrial-employment
export function detentionShift(
  api: CoreAPI,
  personId: string | undefined,
): number {
  if (!personId) return 0;
  const held = firstHeldPretrial(api, personId);
  if (held === undefined) return 0;
  const link = carriedLink(DETENTION_LINK);
  const lived = completedMonthsBetween(
    makeIsoDate(held),
    makeIsoDate(api.state.date),
  );
  if (lived < link.lagMonths) return 0;
  stopgap("SG-LABOR-pretrial-employment");
  // The same choice-score term as the participation outcomes, unfitted to the researched size.
  stopgap("SG-LABOR-participation-scale");
  return Math.log(Math.max(1e-6, 1 + link.size!));
}

/**
 * The web's pull on a person's choice to be at work, by their groups, and
 * their own justice record's: the log of the factor that goes into the
 * choice score of looking for work, staying in a job or leaving it.
 */
export function participationShift(
  api: CoreAPI,
  placeId: string,
  facts: LaborFacts,
  p: (key: string) => number,
): number {
  // The band's shift is shared by the people alike in it (cached); a person's
  // own record is not.
  return bandShift(api, placeId, facts, p) + detentionShift(api, facts.id);
}

/** Whether a person's groups put them in the group a participation outcome keeps. */
export function inGroup(
  measure: string,
  facts: LaborFacts,
  p: (key: string) => number,
): boolean {
  if (measure === MOTHERS) return facts.mother;
  if (measure === MARRIED_WOMEN) return facts.partnered;
  return (
    facts.age >= p("jobsEarliestRetirementAge") &&
    facts.age < p("jobsFullRetirementAge")
  );
}

/**
 * The staff multiplier for an employer's low-wage jobs: one plus the share of
 * its staff paid under the line times the web's factor less one, so the
 * employer's own target moves with the policy exactly as far as its staff is
 * low-wage. `low` and `total` are the employer's heads under and in all.
 */
// stopgapId: SG-LABOR-low-wage-unreviewed
export function lowWageStaffFactor(
  api: CoreAPI,
  placeId: string,
  low: number,
  total: number,
): number {
  if (total <= 0 || low <= 0) return 1;
  return 1 + (low / total) * (webFactorFor(api, placeId, LOW_WAGE_JOBS) - 1);
}

/** The links this family cannot yet wire, marked where the jobs engine runs. */
export function markUnwiredLaborLinks(): void {
  stopgap("SG-LABOR-person-exposure");
  stopgap("SG-LABOR-unsized-links");
}
