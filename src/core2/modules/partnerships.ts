/**
 * Partnerships in play (owner, Nov 1, 2026: "EVERY. LIFE. IS. SIMULATED."):
 * people living elsewhere partner, marry and part. Once a month, on the 1st,
 * a single adult's pull to partner builds by the opening's own partnership
 * chain (src/core2/opening-partnership.ts: the place's ACS first-marriage pace
 * for the never married and NCFMR's remarriage pace for the previously
 * married, for single people of their age and sex), and a couple's pull to
 * part builds by NSFG's intact-marriage curve for how long they have been
 * together; each is moved by the person's traits' lean in its decision. A
 * pull that reaches one whole makes the change: never a roll.
 *
 * Every change goes through the core's one partnership writer
 * (`setPartnersV1`), which records the link, each person's dated fact and
 * the `family.partnered` or `family.separated` event, here with the union's
 * kind and their relatives in the played town as witnesses. Someone living
 * elsewhere knows nobody else full, so the partner they meet is generated:
 * who exists, seeded by the pair, aged by the CPS spouse age gap, of the other
 * sex (SG-LIVES-partner-same-sex), and moves into their home there. A couple
 * that parts splits: the one who did not keep the home starts one of their
 * own at the same place. Nothing moves money and nobody is filled in.
 *
 * The town's full people go through the same monthly review (owner, Nov 8,
 * 2026): a single adult's pull builds by the same chain; when it reaches one
 * they partner with a single adult they know (closeness, the CPS age gap),
 * else a partner from the wider population, and the couple climbs stages with
 * their own dates: dating in separate homes, moving in together (the one with
 * less cash moves into the other's household, so the lease, the share of the
 * everyday spending and the payers follow through `changeHouseholdV1`), a
 * proposal (`family.engaged`), the wedding (`family.married`), and, by the
 * same NSFG curve as anyone, parting (`family.separated`, the one with less
 * cash starting a household of their own). Traits move how soon each step
 * comes, never whether the rate holds. The counted population's partnerships
 * are their own unit (SG-LIVES-partner-counted).
 */
import { addDays, ageOnDate, makeIsoDate } from "../kernel/dates";
import { createStableId } from "../kernel/ids";
import { SeededRng } from "../kernel/rng";
import { decisionLean, decisionTraitWeight } from "../trait-decisions";
import { closenessBetween } from "../closeness";
import {
  partnerAgeFor,
  partnerAgeLikelihood,
  partneringPerYear,
  partnershipGeo,
  separatingPerYear,
  type Sex,
} from "../opening-partnership";
import { openingTemperaments } from "../opening-personality";
import { drawCanonicalNamedIdentity } from "../person-names";
import { DEFAULT_CORPUS_VERSION } from "../gov-rules/names-data";
import {
  defaultPronounsForGender,
  type GenderIdentityKey,
} from "../gov-rules/person-identity";
import { birthCohortGivenName } from "../gov-rules/given-name-cohorts";
import { livesElsewhere } from "./moves";
import { takeCoarsePerson } from "./counted-moves";
import { reviewMentorship } from "./mentorship";
import { rescueOnset } from "./rescue";
import { quarrelOverMoney } from "./quarrel";
import {
  BIRTHDAY_KIND,
  birthdayGathering,
  reviewKinContact,
  scheduleBirthdays,
} from "./kin-contact";
import { declareSnapshotCovered } from "../snapshot";
import { OWED_TALK_KIND, noteReply, owedTalkComesDue } from "./owed-talks";

// The partnership chain, for the past family's run of earlier partnerships
// before the start (src/core2/past-partners.ts): one chain, read through
// this entry.
export {
  maritalShares,
  partnerAgeFor,
  partneringPerYear,
  partnershipGeo,
  separatingPerYear,
  type Sex,
} from "../opening-partnership";
export { drawCanonicalNamedIdentity } from "../person-names";
export { ssa2023AnnualProbability } from "../health-mortality-table";
import type {
  CoreAPI,
  CoreEventInput,
  CoreModule,
  CoreState,
  IsoDate,
  PersonId,
  PersonState,
  Source,
} from "../types";

export const PARTNERSHIPS_MODULE_ID = "partnerships";
export const PARTNER_DECISION = "people.partner";
export const PART_DECISION = "people.part";
/** The union's kind on `family.partnered`, as the paper and the talk read it. */
export const UNION_FACT = "union";
const REVIEW_KIND = "partnerships-review";
const STATE_ROW = "partnerships:state";
const SAME_SEX_STOPGAP = "SG-LIVES-partner-same-sex";
const COHABITING_STOPGAP = "SG-LIVES-partner-cohabiting";
const STAGES_STOPGAP = "SG-LIVES-partner-stage-lengths";
const COUNTED_STOPGAP = "SG-LIVES-partner-counted";

interface PullRow {
  id: PersonId;
  /** Built up so far toward partnering (single) or parting (in a couple). */
  value: number;
  /** What the pull is toward, so a change of state starts it over. */
  toward: "partner" | "part";
}

function store(api: CoreAPI) {
  return api.moduleState(PARTNERSHIPS_MODULE_ID);
}

function sexOf(person: Readonly<PersonState>): Sex | undefined {
  const gender = person.looks?.gender;
  return gender === "female" || gender === "male" ? gender : undefined;
}

/** The partner link this person is in, if any. */
function partnerLinkOf(core: CoreState, id: PersonId) {
  for (const link of core.familyLinks.values())
    if (link.kind === "partner" && link.personIds.includes(id)) return link;
  return undefined;
}

/** When a couple came together: their link's date, else their first child together, else the younger's coming of age. */
function unionStart(
  core: CoreState,
  link: { id: string; personIds: readonly [PersonId, PersonId] },
  api: CoreAPI,
): IsoDate {
  const dated = /:(\d{4}-\d{2}-\d{2})$/.exec(link.id)?.[1];
  if (dated) return makeIsoDate(dated);
  const [a, b] = link.personIds;
  const children = [...core.familyLinks.values()]
    .filter(
      (row) =>
        row.kind === "parent-child" &&
        (row.personIds[0] === a || row.personIds[0] === b),
    )
    .map((row) => row.personIds[1]);
  const shared = children.filter(
    (id) => children.indexOf(id) !== children.lastIndexOf(id),
  );
  const births = shared
    .map((id) => core.people.get(id)?.birthDate)
    .filter((row): row is IsoDate => !!row)
    .sort();
  if (births[0]) return births[0];
  const younger = [core.people.get(a)!, core.people.get(b)!]
    .map((row) => row.birthDate)
    .sort()
    .at(-1)!;
  return addDays(
    makeIsoDate(younger),
    Math.round(api.parameter("votingAge") * api.parameter("daysPerMeanYear")),
  );
}

/** Their relatives in the played town, who hear of it. */
function witnessesOf(core: CoreState, ids: readonly PersonId[]): PersonId[] {
  const out = new Set<PersonId>();
  for (const id of ids)
    for (const other of core.people.get(id)?.familyIds ?? []) {
      const row = core.people.get(other);
      if (row?.alive && row.tier !== "husk" && !ids.includes(other))
        out.add(other);
    }
  return [...out].sort();
}

function source(api: CoreAPI, citation: string): Source {
  return {
    tag: "ESTIMATED",
    asOf: api.state.date,
    citation,
    estimatedFrom:
      "The partnership chain's yearly paces (ACS first marriages, NCFMR remarriage, NSFG intact marriages) for the person's age, sex and place, moved by their traits' lean.",
  };
}

/** The person met: who exists, seeded by the pair, at their age gap, into their home. */
function meetPartner(
  api: CoreAPI,
  person: Readonly<PersonState>,
  sex: Sex,
): PersonState | undefined {
  const core = api.state as CoreState;
  api.stopgap(SAME_SEX_STOPGAP);
  const partnerSex: Sex = sex === "female" ? "male" : "female";
  const key = `partner:${person.id}:${core.date}`;
  const age = ageOnDate(makeIsoDate(person.birthDate), makeIsoDate(core.date));
  const partnerAge = partnerAgeFor(
    core.seed,
    key,
    age,
    sex,
    partnerSex,
    api.parameter("votingAge"),
  );
  if (partnerAge === undefined) return undefined;
  // They are one of the people the state's counts already hold, so the state
  // gives up one in their band and the total is unchanged.
  if (livesElsewhere(core, person))
    takeCoarsePerson(api, person.placeId, partnerAge);
  const id = createStableId("person", `${core.seed}:${key}`) as PersonId;
  const year = Number(core.date.slice(0, 4)) - partnerAge;
  const birthDate = makeIsoDate(`${year}${core.date.slice(4, 10)}` as IsoDate);
  const gender = partnerSex as GenderIdentityKey;
  const named = drawCanonicalNamedIdentity(
    new SeededRng(core.seed).fork(key).fork("name"),
    { gender, pronouns: defaultPronounsForGender(gender) },
    { corpusVersion: DEFAULT_CORPUS_VERSION },
  );
  const givenName = birthCohortGivenName(core.seed, key, {
    givenName: named.givenName,
    familyName: named.familyName,
    birthDate,
    gender,
  });
  const traits =
    openingTemperaments([{ id, birthDate, gender: partnerSex, parents: [] }], {
      seed: core.seed,
      startedAt: makeIsoDate(core.date),
    }).get(id) ?? {};
  const met = source(
    api,
    `${givenName} ${named.familyName} met ${person.givenName} ${person.familyName}.`,
  );
  return api.addPersonV1({
    id,
    givenName,
    familyName: named.familyName,
    birthDate,
    placeId: person.placeId,
    ...(person.countyId ? { countyId: person.countyId } : {}),
    householdId: person.householdId,
    tier: person.tier,
    traits,
    sharedTraitSource: met,
    liquidMinor: api.parameter("zero"),
    livingCostDailyMinor: api.parameter("zero"),
    source: met,
    familyIds: [],
    knownIds: [],
    looks: { gender: partnerSex, pronouns: defaultPronounsForGender(gender) },
  });
}

/** A couple parts: the link ends, and the one who did not keep the home starts their own at the same place. */
function part(
  api: CoreAPI,
  person: Readonly<PersonState>,
  partner: Readonly<PersonState>,
): void {
  const core = api.state as CoreState;
  const ids: [PersonId, PersonId] = [person.id, partner.id];
  api.setPartnersV1({
    personIds: ids,
    together: false,
    source: source(api, `${person.givenName} and ${partner.givenName} parted.`),
    witnessIds: witnessesOf(core, ids),
  });
  // The younger of the two leaves the home (the elder kept it longer).
  const younger = person.birthDate > partner.birthDate ? person : partner;
  // The player keeps their home; the other leaves.
  const leaver =
    younger.id === core.playerId
      ? younger === person
        ? partner
        : person
      : younger;
  const home = core.households.get(leaver.householdId);
  if (!home || home.memberIds.length < 2) return;
  api.relocatePeopleV1({
    personIds: [leaver.id],
    placeId: leaver.placeId,
    ...(leaver.countyId ? { countyId: leaver.countyId } : {}),
    householdId: `${leaver.householdId}:parted:${leaver.id}:${core.date}`,
    source: source(api, `${leaver.givenName} moved out.`),
  });
}

function partnerFactorOf(api: CoreAPI, person: Readonly<PersonState>): number {
  const core = api.state as CoreState;
  return Math.exp(
    decisionTraitWeight(core, PARTNER_DECISION) *
      decisionLean(core, person, PARTNER_DECISION, "partner", "stay-single"),
  );
}

function partFactorOf(
  api: CoreAPI,
  person: Readonly<PersonState>,
  partner: Readonly<PersonState>,
): number {
  const core = api.state as CoreState;
  return Math.exp(
    (decisionTraitWeight(core, PART_DECISION) *
      (decisionLean(core, person, PART_DECISION, "part", "stay-together") +
        decisionLean(core, partner, PART_DECISION, "part", "stay-together"))) /
      api.parameter("two"),
  );
}

/** One month: every adult living elsewhere builds their pull, and a pull that reaches one whole makes the change. */
function review(api: CoreAPI): void {
  const core = api.state as CoreState;
  const p = (key: string) => api.parameter(key);
  api.stopgap(COUNTED_STOPGAP);
  const adultAge = p("votingAge");
  const people = [...core.people.values()]
    .filter(
      (row) =>
        livesElsewhere(core, row) &&
        ageOnDate(makeIsoDate(row.birthDate), makeIsoDate(core.date)) >=
          adultAge,
    )
    .sort((a, b) => a.id.localeCompare(b.id));
  const links = new Map<PersonId, ReturnType<typeof partnerLinkOf>>();
  for (const link of core.familyLinks.values())
    if (link.kind === "partner")
      for (const id of link.personIds) links.set(id, link);
  const geo = partnershipGeo(core.placeMetadata?.placeKey);
  const month = p("one") / p("monthsPerYear");
  // Traits decide who partners or parts sooner, not how many: each trait
  // factor is weighed against the typical among the people reviewed toward
  // the same change this month (as the moves engine weighs ties against its
  // typical), so the chain's paces hold over everyone. Without it the lean
  // toward partnering, which averages below zero, ran every draw 9 to 19%
  // under the chain (CTO, Nov 1).
  const partnerFactor = (person: Readonly<PersonState>) =>
    partnerFactorOf(api, person);
  const partFactor = (
    person: Readonly<PersonState>,
    partner: Readonly<PersonState>,
  ) => partFactorOf(api, person, partner);
  const typical = {
    partner: [p("zero"), p("zero")],
    part: [p("zero"), p("zero")],
  };
  for (const person of people) {
    const link = links.get(person.id);
    if (!link) {
      typical.partner[0]! += partnerFactor(person);
      typical.partner[1]! += p("one");
      continue;
    }
    const partner = core.people.get(
      link.personIds.find((id) => id !== person.id)!,
    );
    if (
      partner &&
      livesElsewhere(core, partner) &&
      person.id.localeCompare(partner.id) < 0
    ) {
      typical.part[0]! += partFactor(person, partner);
      typical.part[1]! += p("one");
    }
  }
  const meanOf = ([sum, count]: number[]) =>
    count! > p("zero") ? sum! / count! : p("one");
  const typicalPartner = meanOf(typical.partner);
  const typicalPart = meanOf(typical.part);
  const done = new Set<PersonId>();
  for (const person of people) {
    if (done.has(person.id) || !person.alive) continue;
    const sex = sexOf(person);
    if (!sex) continue;
    const link = links.get(person.id);
    const partner = link
      ? core.people.get(link.personIds.find((id) => id !== person.id)!)
      : undefined;
    const toward: PullRow["toward"] = link ? "part" : "partner";
    // A couple decides together, on the first of the two by id.
    if (
      partner &&
      partner.id.localeCompare(person.id) < 0 &&
      livesElsewhere(core, partner)
    )
      continue;
    const held = store(api).table("pulls").get(person.id) as unknown as
      PullRow | undefined;
    const row: PullRow =
      held && held.toward === toward
        ? { ...held }
        : {
            id: person.id,
            toward,
            // Where they stand on day one, or when their state changed: the
            // opening's place along the pull, seeded by the person.
            value: held
              ? p("zero")
              : new SeededRng(core.seed)
                  .fork(`partnerships:${person.id}`)
                  .next(),
          };
    const age = ageOnDate(
      makeIsoDate(person.birthDate),
      makeIsoDate(core.date),
    );
    if (toward === "partner") {
      row.value +=
        partneringPerYear(geo, sex, age) *
        month *
        (partnerFactor(person) / typicalPartner);
      if (row.value >= p("one")) {
        const met = meetPartner(api, person, sex);
        if (met) {
          api.stopgap(COHABITING_STOPGAP);
          api.setPartnersV1({
            personIds: [person.id, met.id],
            together: true,
            source: source(
              api,
              `${person.givenName} and ${met.givenName} married.`,
            ),
            witnessIds: witnessesOf(core, [person.id, met.id]),
            facts: { [UNION_FACT]: "married" },
          });
          // A new couple starts at the beginning of its pull to part.
          for (const id of [person.id, met.id])
            store(api)
              .table("pulls")
              .put({ id, toward: "part", value: p("zero") } as never);
          done.add(person.id);
          done.add(met.id);
          continue;
        }
      }
    } else if (partner && livesElsewhere(core, partner)) {
      const years = Math.max(
        p("zero"),
        Math.floor(
          ageOnDate(unionStart(core, link!, api), makeIsoDate(core.date)),
        ),
      );
      row.value +=
        separatingPerYear(years) *
        month *
        (partFactor(person, partner) / typicalPart);
      if (row.value >= p("one")) {
        part(api, person, partner);
        // Each starts at the beginning of their pull to partner again.
        for (const id of [person.id, partner.id])
          store(api)
            .table("pulls")
            .put({ id, toward: "partner", value: p("zero") } as never);
        done.add(person.id);
        done.add(partner.id);
        continue;
      }
    }
    store(api)
      .table("pulls")
      .put(row as never);
  }
  reviewTown(api);
  reviewKinContact(api);
  scheduleBirthdays(api);
  reviewMentorship(api);
}

/** Where a couple in town stands on the way to a wedding. */
type Stage =
  | "dating"
  | "move-in-asked"
  | "living-together"
  | "proposed"
  | "engaged"
  | "married";

interface CoupleRow {
  /** The partner link's id. */
  id: string;
  stage: Stage;
  /** The date this stage began. */
  since: IsoDate;
  /** Built up so far toward the next stage. */
  progress: number;
}

export const FAMILY_ENGAGED = "family.engaged";
export const FAMILY_MARRIED = "family.married";
export const FAMILY_MOVED_IN = "family.moved-in";
/** A partner asked the player to live together; the player's answer in the scene decides. */
export const FAMILY_MOVE_IN_ASKED = "family.move-in-asked";

const NEXT_STAGE: Record<
  Exclude<Stage, "married" | "proposed" | "move-in-asked">,
  [Stage, string]
> = {
  dating: ["living-together", "partnerDatingMonths"],
  "living-together": ["engaged", "partnerLivingTogetherMonths"],
  engaged: ["married", "partnerEngagedMonths"],
};

function isTownPerson(core: CoreState, row: Readonly<PersonState>): boolean {
  return row.alive && row.tier !== "husk";
}

function ownsHome(api: CoreAPI, householdId: string): boolean {
  const core = api.state as CoreState;
  if (!core.modules.has("housing")) return false;
  const row = api
    .moduleState("housing")
    .table("dwellings")
    .get(`dwelling:${householdId}`) as { tenure?: string } | undefined;
  return row?.tenure === "own";
}

/**
 * Whether these people can leave their household now: it keeps an adult, and
 * an owned home is not left empty. `chosen` says the mover chose it (the
 * player's yes when asked to move in).
 */
export function canLeave(
  api: CoreAPI,
  mover: Readonly<PersonState>,
  adultAge: number,
  chosen = false,
): boolean {
  const core = api.state as CoreState;
  // The player's household changes only by their choice, never by the
  // engine's move-in or split (owner's playtest, Nov 8).
  if (mover.id === core.playerId && !chosen) return false;
  // The household writer's own rule (`changeHouseholdV1`): whoever is left on
  // its books, the dead included, must hold a living adult, or nobody is left
  // and an owned home is not given up. A household whose only other members
  // are dead children cannot be left (Ripley, Tennessee, year 4).
  const left = (core.households.get(mover.householdId)?.memberIds ?? [])
    .filter((id) => id !== mover.id)
    .map((id) => core.people.get(id));
  if (!left.length) return !ownsHome(api, mover.householdId);
  return left.some(
    (row) =>
      row?.alive &&
      ageOnDate(makeIsoDate(row.birthDate), makeIsoDate(core.date)) >= adultAge,
  );
}

/** The couple's row, made from their records the first time (an opening couple under one roof is married). */
function coupleOf(
  api: CoreAPI,
  link: { id: string; personIds: readonly [PersonId, PersonId] },
): CoupleRow {
  const core = api.state as CoreState;
  const held = store(api).table("couples").get(link.id) as unknown as
    CoupleRow | undefined;
  if (held) return { ...held };
  const [a, b] = link.personIds.map((id) => core.people.get(id)!);
  return {
    id: link.id,
    stage: a!.householdId === b!.householdId ? "married" : "dating",
    since: unionStart(core, link, api),
    progress: api.parameter("zero"),
  };
}

/** The single adult in town this person knows best who fits them in age, else nobody. */
function knownSingle(
  api: CoreAPI,
  person: Readonly<PersonState>,
  sex: Sex,
  singles: ReadonlySet<PersonId>,
): PersonState | undefined {
  const core = api.state as CoreState;
  const today = makeIsoDate(core.date);
  const age = ageOnDate(makeIsoDate(person.birthDate), today);
  let best: { row: PersonState; score: number } | undefined;
  for (const id of [...person.knownIds].sort()) {
    if (!singles.has(id) || person.familyIds.has(id)) continue;
    const other = core.people.get(id);
    if (
      !other ||
      other.placeId !== person.placeId ||
      other.householdId === person.householdId ||
      sexOf(other) === undefined ||
      sexOf(other) === sex
    )
      continue;
    const fit = partnerAgeLikelihood(
      age,
      sex,
      ageOnDate(makeIsoDate(other.birthDate), today),
      sexOf(other),
    );
    const score = fit * closenessBetween(core, person.id, id);
    if (score > (best?.score ?? api.parameter("zero")))
      best = { row: other, score };
  }
  return best?.row;
}

/**
 * Who of a couple would move in with the other, and with whom: the one with
 * less cash goes, unless they cannot leave; `chosenBy` is the one whose yes
 * lets their own household change. Undefined when neither can leave.
 */
export function movingOrder(
  api: CoreAPI,
  a: Readonly<PersonState>,
  b: Readonly<PersonState>,
  chosenBy?: PersonId,
): [PersonState, PersonState] | undefined {
  const adultAge = api.parameter("votingAge");
  const [mover, host]: [PersonState, PersonState] =
    a.liquidMinor < b.liquidMinor ||
    (a.liquidMinor === b.liquidMinor && a.id > b.id)
      ? [a, b]
      : [b, a];
  return canLeave(api, mover, adultAge, mover.id === chosenBy)
    ? [mover, host]
    : canLeave(api, host, adultAge, host.id === chosenBy)
      ? [host, mover]
      : undefined;
}

/**
 * One of the couple moves into the other's household: the one with less cash
 * goes, the lease and the spending share follow. `chosenBy` is the one who
 * said yes in a scene, whose household may then change.
 */
function moveIn(
  api: CoreAPI,
  a: Readonly<PersonState>,
  b: Readonly<PersonState>,
  chosenBy?: PersonId,
): boolean {
  const core = api.state as CoreState;
  if (a.householdId === b.householdId) return true;
  const order = movingOrder(api, a, b, chosenBy);
  if (!order) return false;
  api.changeHouseholdV1({
    personIds: [order[0].id],
    householdId: order[1].householdId,
    source: source(
      api,
      `${order[0].givenName} moved in with ${order[1].givenName}.`,
    ),
  });
  const ids: PersonId[] = [order[0].id, order[1].id];
  api.emit({
    id: `${FAMILY_MOVED_IN}:${ids.slice().sort().join(":")}:${core.date}`,
    date: core.date,
    kind: FAMILY_MOVED_IN,
    personIds: ids,
    placeId: order[1].placeId,
    publicRecord: false,
    source: source(
      api,
      `${order[0].givenName} moved in with ${order[1].givenName}.`,
    ),
    witnessIds: witnessesOf(core, ids),
  });
  return true;
}

/** A couple in town parts: the link ends and, under one roof, the one with less cash starts a household of their own. */
function partInTown(
  api: CoreAPI,
  a: Readonly<PersonState>,
  b: Readonly<PersonState>,
  stage: Stage,
): void {
  const core = api.state as CoreState;
  const ids: [PersonId, PersonId] = [a.id, b.id];
  api.setPartnersV1({
    personIds: ids,
    together: false,
    source: source(api, `${a.givenName} and ${b.givenName} parted.`),
    witnessIds: witnessesOf(core, ids),
    facts: {
      [UNION_FACT]: stage,
      ended: stage === "married" ? "divorce" : "breakup",
    },
  });
  if (a.householdId !== b.householdId) return;
  const adultAge = api.parameter("votingAge");
  const leaver =
    a.liquidMinor < b.liquidMinor ||
    (a.liquidMinor === b.liquidMinor && a.birthDate > b.birthDate)
      ? a
      : b;
  const keeper = leaver === a ? b : a;
  const goes = canLeave(api, leaver, adultAge) ? leaver : keeper;
  if (!canLeave(api, goes, adultAge)) return;
  api.changeHouseholdV1({
    personIds: [goes.id],
    householdId: `${goes.householdId}:parted:${goes.id}:${core.date}`,
    source: source(api, `${goes.givenName} moved out.`),
  });
}

/** One month among the town's full people: singles meet, couples climb their stages or part. */
function reviewTown(api: CoreAPI): void {
  const core = api.state as CoreState;
  const p = (key: string) => api.parameter(key);
  const today = makeIsoDate(core.date);
  const adultAge = p("votingAge");
  const geo = partnershipGeo(core.placeMetadata?.placeKey);
  const month = p("one") / p("monthsPerYear");
  const people = [...core.people.values()]
    .filter(
      (row) =>
        isTownPerson(core, row) &&
        ageOnDate(makeIsoDate(row.birthDate), today) >= adultAge,
    )
    .sort((a, b) => a.id.localeCompare(b.id));
  // One pass over the links, and each person's factor weighed once a month.
  const linkOf = new Map<PersonId, ReturnType<typeof partnerLinkOf>>();
  for (const link of core.familyLinks.values())
    if (link.kind === "partner")
      for (const id of link.personIds) linkOf.set(id, link);
  const partnerFactors = new Map<PersonId, number>();
  const partnerFactorOfCached = (person: Readonly<PersonState>) => {
    let held = partnerFactors.get(person.id);
    if (held === undefined) {
      held = partnerFactorOf(api, person);
      partnerFactors.set(person.id, held);
    }
    return held;
  };
  const singles = new Set<PersonId>();
  const couples: {
    link: { id: string; personIds: readonly [PersonId, PersonId] };
    a: PersonState;
    b: PersonState;
  }[] = [];
  const seen = new Set<string>();
  const sum = { partner: [p("zero"), p("zero")], part: [p("zero"), p("zero")] };
  for (const person of people) {
    const link = linkOf.get(person.id);
    if (!link) {
      if (sexOf(person)) {
        singles.add(person.id);
        sum.partner[0]! += partnerFactorOfCached(person);
        sum.partner[1]! += p("one");
      }
      continue;
    }
    if (seen.has(link.id)) continue;
    seen.add(link.id);
    const a = core.people.get(link.personIds[0])!;
    const b = core.people.get(link.personIds[1])!;
    if (!isTownPerson(core, a) || !isTownPerson(core, b)) continue;
    couples.push({ link, a, b });
    sum.part[0]! += partFactorOf(api, a, b);
    sum.part[1]! += p("one");
  }
  const typicalPartner =
    sum.partner[1]! > p("zero") ? sum.partner[0]! / sum.partner[1]! : p("one");
  const typicalPart =
    sum.part[1]! > p("zero") ? sum.part[0]! / sum.part[1]! : p("one");
  const pulls = store(api).table("pulls");
  const rowFor = (id: PersonId, toward: PullRow["toward"]): PullRow => {
    const held = pulls.get(id) as unknown as PullRow | undefined;
    return held && held.toward === toward
      ? { ...held }
      : {
          id,
          toward,
          value: held
            ? p("zero")
            : new SeededRng(core.seed).fork(`partnerships:${id}`).next(),
        };
  };
  const reset = (id: PersonId, toward: PullRow["toward"]) =>
    pulls.put({ id, toward, value: p("zero") } as never);
  const done = new Set<PersonId>();
  for (const person of people) {
    if (!singles.has(person.id) || done.has(person.id)) continue;
    const sex = sexOf(person)!;
    const row = rowFor(person.id, "partner");
    row.value +=
      partneringPerYear(
        geo,
        sex,
        ageOnDate(makeIsoDate(person.birthDate), today),
      ) *
      month *
      (partnerFactorOfCached(person) / typicalPartner);
    if (row.value >= p("one")) {
      const known = knownSingle(api, person, sex, singles);
      if (known && !done.has(known.id)) {
        api.setPartnersV1({
          personIds: [person.id, known.id],
          together: true,
          source: source(
            api,
            `${person.givenName} and ${known.givenName} started dating.`,
          ),
          witnessIds: witnessesOf(core, [person.id, known.id]),
          facts: { [UNION_FACT]: "dating" },
        });
        const link = linkOf.get(person.id) ?? partnerLinkOf(core, person.id)!;
        store(api)
          .table("couples")
          .put({
            id: link.id,
            stage: "dating",
            since: core.date,
            progress: p("zero"),
          } as never);
        for (const id of [person.id, known.id]) {
          reset(id, "part");
          done.add(id);
        }
        continue;
      }
      if (!known) {
        // Nobody they know fits: the partner comes from the wider
        // population, already sharing the home by the time the record sees
        // them (SG-LIVES-partner-stage-lengths).
        const met = meetPartner(api, person, sex);
        if (met) {
          api.stopgap(COHABITING_STOPGAP);
          api.setPartnersV1({
            personIds: [person.id, met.id],
            together: true,
            source: source(
              api,
              `${person.givenName} and ${met.givenName} moved in together.`,
            ),
            witnessIds: witnessesOf(core, [person.id, met.id]),
            facts: { [UNION_FACT]: "living-together" },
          });
          const link = linkOf.get(person.id) ?? partnerLinkOf(core, person.id)!;
          store(api)
            .table("couples")
            .put({
              id: link.id,
              stage: "living-together",
              since: core.date,
              progress: p("zero"),
            } as never);
          for (const id of [person.id, met.id]) reset(id, "part");
          done.add(person.id);
          continue;
        }
      }
      row.value = p("one");
    }
    pulls.put(row as never);
  }
  api.stopgap(STAGES_STOPGAP);
  for (const { link, a, b } of couples) {
    if (!a.alive || !b.alive || !linkOf.has(a.id)) continue;
    const couple = coupleOf(api, link);
    const lower = a.id.localeCompare(b.id) < 0 ? a : b;
    const row = rowFor(lower.id, "part");
    const years = Math.max(
      p("zero"),
      Math.floor(ageOnDate(unionStart(core, link, api), today)),
    );
    row.value +=
      separatingPerYear(years) *
      month *
      (partFactorOf(api, a, b) / typicalPart);
    if (row.value >= p("one")) {
      partInTown(api, a, b, couple.stage);
      store(api).table("couples").remove(link.id);
      for (const id of [a.id, b.id]) reset(id, "partner");
      continue;
    }
    pulls.put(row as never);
    if (couple.stage === "married") {
      store(api)
        .table("couples")
        .put(couple as never);
      continue;
    }
    if (couple.stage === "move-in-asked") {
      // The player was asked to live together and has not answered: the
      // question lapses as an unanswered proposal does, back to dating.
      if (
        ageOnDate(makeIsoDate(couple.since), today) * p("monthsPerYear") >=
        p("partnerProposalLapseMonths")
      ) {
        couple.stage = "dating";
        couple.since = core.date;
        couple.progress = p("zero");
      }
      store(api)
        .table("couples")
        .put(couple as never);
      continue;
    }
    if (couple.stage === "proposed") {
      // The player was asked and has not answered: a question left a couple
      // of months lapses back to living together, unanswered.
      if (
        ageOnDate(makeIsoDate(couple.since), today) * p("monthsPerYear") >=
        p("partnerProposalLapseMonths")
      ) {
        couple.stage = "living-together";
        couple.since = core.date;
        couple.progress = p("zero");
      }
      store(api)
        .table("couples")
        .put(couple as never);
      continue;
    }
    const [next, months] = NEXT_STAGE[couple.stage];
    couple.progress +=
      (p("one") / p(months)) *
      (Math.sqrt(partnerFactorOfCached(a) * partnerFactorOfCached(b)) /
        typicalPartner);
    const withPlayer = a.id === core.playerId || b.id === core.playerId;
    if (
      couple.progress >= p("one") &&
      next === "living-together" &&
      withPlayer
    ) {
      // Living together changes the player's home, so the partner asks and
      // the player's answer in the scene decides (coordinator's ruling under
      // the owner's overnight say, Nov 14 2026, family life question 2).
      const asker = a.id === core.playerId ? b : a;
      couple.stage = "move-in-asked";
      couple.since = core.date;
      couple.progress = p("zero");
      api.emit({
        id: `${FAMILY_MOVE_IN_ASKED}:${link.id}:${core.date}`,
        date: core.date,
        kind: FAMILY_MOVE_IN_ASKED,
        personIds: [asker.id, core.playerId!],
        placeId: asker.placeId,
        publicRecord: false,
        source: source(api, `${asker.givenName} asked to live together.`),
        facts: { linkId: link.id },
      });
      store(api)
        .table("couples")
        .put(couple as never);
      continue;
    }
    if (couple.progress >= p("one")) {
      const ok = next === "living-together" ? moveIn(api, a, b) : true;
      if (ok) {
        // A proposal to the player waits on their answer (the proposal scene's
        // reply); everyone else's is settled by the engine.
        const asked =
          next === "engaged" &&
          (a.id === core.playerId || b.id === core.playerId);
        couple.stage = asked ? "proposed" : next;
        couple.since = core.date;
        couple.progress = p("zero");
        const ids = [a.id, b.id];
        if (next === "engaged" || next === "married")
          api.emit({
            id: `${next === "engaged" ? FAMILY_ENGAGED : FAMILY_MARRIED}:${link.id}`,
            date: core.date,
            kind: next === "engaged" ? FAMILY_ENGAGED : FAMILY_MARRIED,
            personIds: ids,
            placeId: a.placeId,
            publicRecord: false,
            source: source(
              api,
              next === "engaged"
                ? `${a.givenName} and ${b.givenName} got engaged.`
                : `${a.givenName} and ${b.givenName} married.`,
            ),
            witnessIds: witnessesOf(core, ids),
            facts: { [UNION_FACT]: asked ? "proposed" : next, linkId: link.id },
          });
      } else couple.progress = p("one");
    }
    store(api)
      .table("couples")
      .put(couple as never);
  }
}

/**
 * The player's answer to a proposal (the proposal scene's reply, ending the
 * talk): yes makes them engaged; turned down, the couple goes back to living
 * together and starts over; asking for time puts the question half a stage
 * off; a reply that did not end the talk waits for its ending.
 */
function answerProposal(api: CoreAPI, event: CoreEventInput): void {
  const facts = event.facts ?? {};
  if (facts.typeKey !== "proposal" || !facts.ending) return;
  const prefix = `${FAMILY_ENGAGED}:`;
  const causeId = facts.causeId ?? "";
  if (!causeId.startsWith(prefix)) return;
  const linkId = causeId.slice(prefix.length);
  const held = store(api).table("couples").get(linkId) as unknown as
    CoupleRow | undefined;
  if (held?.stage !== "proposed") return;
  const core = api.state as CoreState;
  const zero = api.parameter("zero");
  const answered: CoupleRow =
    facts.ending === "said-yes"
      ? { ...held, stage: "engaged", since: core.date, progress: zero }
      : {
          ...held,
          stage: "living-together",
          since: core.date,
          progress:
            facts.ending === "turned-down" ? zero : api.parameter("half"),
        };
  store(api)
    .table("couples")
    .put(answered as never);
}

/**
 * The player's answer when a partner asks to live together (the move-in
 * scene's reply, ending the talk): yes moves one of them in with the other,
 * the one with less cash going, as the engine moves everyone else; turned
 * down, the couple goes on dating and starts over; asking for time puts the
 * question half a stage off; a reply that did not end the talk waits.
 */
function answerMoveIn(api: CoreAPI, event: CoreEventInput): void {
  const facts = event.facts ?? {};
  if (facts.typeKey !== "move-in" || !facts.ending) return;
  const causeId = String(facts.causeId ?? "");
  const prefix = `${FAMILY_MOVE_IN_ASKED}:`;
  if (!causeId.startsWith(prefix)) return;
  // The id is the prefix, the partner link's id, then the day it was asked.
  const linkId = causeId.slice(prefix.length).replace(/:[^:]+$/, "");
  const held = store(api).table("couples").get(linkId) as unknown as
    CoupleRow | undefined;
  if (held?.stage !== "move-in-asked") return;
  const core = api.state as CoreState;
  const zero = api.parameter("zero");
  const link = core.familyLinks.get(linkId);
  const [a, b] = (link?.personIds ?? []).map((id) => core.people.get(id));
  const moved =
    facts.ending === "said-yes" &&
    !!a?.alive &&
    !!b?.alive &&
    moveIn(api, a, b, core.playerId);
  const answered: CoupleRow = moved
    ? { ...held, stage: "living-together", since: core.date, progress: zero }
    : {
        ...held,
        stage: "dating",
        since: core.date,
        progress: facts.ending === "not-yet" ? api.parameter("half") : zero,
      };
  store(api)
    .table("couples")
    .put(answered as never);
}

function nextFirst(date: string): string {
  const [year, month] = date.split("-").map(Number) as [number, number];
  return month === 12
    ? `${year + 1}-01-01`
    : `${year}-${String(month + 1).padStart(2, "0")}-01`;
}

function schedule(api: CoreAPI): void {
  const date = nextFirst(api.state.date);
  api.moduleCalendar(PARTNERSHIPS_MODULE_ID).schedule({
    key: `review:${date}`,
    date,
    kind: REVIEW_KIND,
    source: source(
      api,
      "The month's review of partnerships among people living elsewhere.",
    ),
    sourceRecordIds: [STATE_ROW],
  });
}

export const partnershipsModule: CoreModule = {
  id: PARTNERSHIPS_MODULE_ID,
  state: {
    schemaVersion: 1,
    tables: {
      state: {},
      pulls: {},
      couples: {},
      contacts: {},
      jobsSeen: {},
      owed: {},
    },
  },
  // A death ends the person's pull, so the table holds only the living.
  eventKinds: [
    "life.death",
    "scene.reply",
    "health.serious-illness",
    "credit.payment-missed",
  ],
  onEvent(api, event) {
    if (event.kind === "credit.payment-missed") {
      quarrelOverMoney(api, event);
      return;
    }
    if (event.kind === "health.serious-illness") {
      rescueOnset(api, event);
      return;
    }
    if (event.kind === "scene.reply") {
      noteReply(api, event);
      answerProposal(api, event);
      answerMoveIn(api, event);
      return;
    }
    for (const id of event.personIds) store(api).table("pulls").remove(id);
  },
  onDay(api) {
    if (store(api).table("state").get(STATE_ROW)) return;
    store(api).table("state").put({ id: STATE_ROW, openedAt: api.state.date });
    schedule(api);
  },
  onCalendarWork(api, work) {
    if (work.kind === BIRTHDAY_KIND) {
      birthdayGathering(api, work.key);
      return;
    }
    if (work.kind === OWED_TALK_KIND) {
      owedTalkComesDue(api, work.sourceRecordIds[1] ?? work.key);
      return;
    }
    if (work.kind !== REVIEW_KIND) return;
    review(api);
    schedule(api);
  },
};
declareSnapshotCovered(PARTNERSHIPS_MODULE_ID);
