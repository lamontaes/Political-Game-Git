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
 * Partnering in the played town (moving in together, households, rent) and
 * the counted population's partnerships are their own units
 * (SG-LIVES-partner-town, SG-LIVES-partner-counted).
 */
import { addDays, ageOnDate, makeIsoDate } from "../kernel/dates";
import { createStableId } from "../kernel/ids";
import { SeededRng } from "../kernel/rng";
import { decisionLean, decisionTraitWeight } from "../trait-decisions";
import {
  partnerAgeFor,
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
import { declareSnapshotCovered } from "../snapshot";
import type {
  CoreAPI,
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
const TOWN_STOPGAP = "SG-LIVES-partner-town";
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
  const leaver = person.birthDate > partner.birthDate ? person : partner;
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

/** One month: every adult living elsewhere builds their pull, and a pull that reaches one whole makes the change. */
function review(api: CoreAPI): void {
  const core = api.state as CoreState;
  const p = (key: string) => api.parameter(key);
  api.stopgap(TOWN_STOPGAP);
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
  const geo = partnershipGeo(core.placeMetadata?.placeKey);
  const month = p("one") / p("monthsPerYear");
  const done = new Set<PersonId>();
  for (const person of people) {
    if (done.has(person.id) || !person.alive) continue;
    const sex = sexOf(person);
    if (!sex) continue;
    const link = partnerLinkOf(core, person.id);
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
      const lean = decisionLean(
        core,
        person,
        PARTNER_DECISION,
        "partner",
        "stay-single",
      );
      row.value +=
        partneringPerYear(geo, sex, age) *
        month *
        Math.exp(decisionTraitWeight(core, PARTNER_DECISION) * lean);
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
      const lean =
        (decisionLean(core, person, PART_DECISION, "part", "stay-together") +
          decisionLean(core, partner, PART_DECISION, "part", "stay-together")) /
        p("two");
      row.value +=
        separatingPerYear(years) *
        month *
        Math.exp(decisionTraitWeight(core, PART_DECISION) * lean);
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
  state: { schemaVersion: 1, tables: { state: {}, pulls: {} } },
  onDay(api) {
    if (store(api).table("state").get(STATE_ROW)) return;
    store(api).table("state").put({ id: STATE_ROW, openedAt: api.state.date });
    schedule(api);
  },
  onCalendarWork(api, work) {
    if (work.kind !== REVIEW_KIND) return;
    review(api);
    schedule(api);
  },
};
declareSnapshotCovered(PARTNERSHIPS_MODULE_ID);
