/**
 * Staff (M3-06, first slice): an official hires people they know or
 * applicants, and delegates work to them; what a staffer gets done follows
 * their own record and improves with experience.
 *
 * A staffer's work on a task is their reliability (do they follow through),
 * their deliberation (do they think it through), what experience has taught
 * them (growing at a rate set by how they learn, which no screen shows), and
 * passion: how much they care about the work in front of them, from their own
 * view of its question. Every delegated result records who did it and the
 * parts of their work behind it. Delegating carries no hidden penalty: a
 * staffer does the task as well as their own record says.
 *
 * Tasks so far: a briefing on where the members stand on a bill (the staffer
 * reads the record of as many members as their work covers), and handling a
 * constituent case in the official's office.
 */
import {
  coreAPI,
  fillInIdentity,
  fillInPerson,
  registerModule,
  type RecordedIdentity,
} from "../state";
import { drawOfficialIdentity } from "../officials-identity";
import { openingTemperaments } from "../opening-personality";
import { countedResidents } from "../electorate";
import {
  corePlaceByJurisdictionId,
  coreSeatOfGovernmentPlace,
} from "../place-lookup";
import { countyPopulationSharesForPlace } from "../reference/government-units";
import type { EntityId } from "../kernel/brands";
import type { CoreAPI, CoreModule, CoreState, PersonState } from "../types";
import type { ModuleRow } from "../module-data";
import { campaignParameter, personLean } from "../campaign-views";
import { viewOn } from "./views";
import { parameter } from "../parameters";
import { decisionLean } from "../trait-decisions";
import { lawChain } from "./laws";
import type { ModuleCalendarWork } from "../module-calendar";
import { addDays, makeIsoDate } from "../kernel/dates";
import { townSeats } from "./offices";
import { BUDGETS_MODULE_ID, governments } from "./budgets";
import { inCustody } from "./justice";
import { startPublicJob } from "../public-payroll";
import { publicPayRoom, treasuryParameter } from "../budgets-treasury";
import {
  LEGISLATURE_MODULE_ID,
  budgetLineStakes,
  learnStake,
  members,
  provisionStance,
  registerLegislatureHooks,
  type BillRow,
  type MemberPosition,
} from "./legislature";

export const STAFF_MODULE_ID = "core2-staff-v1";
/** Relatives living out of town, kept as a name and family ties only. */
const HUSK_TIER = "husk";
/** People outside the town act on the calendar, as officials there do. */
const SEAT_APPLICANT_TIER = "calendar";

export interface StafferRow {
  readonly id: string;
  readonly officialId: string;
  readonly personId: string;
  readonly role: string;
  readonly hiredOn: string;
  readonly hiredFrom: "known" | "applicant";
  readonly tasksDone: number;
  /**
   * Why this person was the hire, by part: how well they'd do the work, how
   * far they live within reach of the office, their age's place in the
   * working-age pool, knowing the official, and a family tie (a reason the
   * press and views can read; family ties are allowed, owner Oct 14).
   */
  readonly reasons?: Readonly<Record<string, number>>;
  /** The records the reasons read: where they live, the family link, a counted record filled in at hire. */
  readonly reasonRecordIds?: readonly string[];
  /** The post's job on the government's payroll. */
  readonly jobId?: string;
  /** The aide this hire replaces, who died or left the post (owner, Oct 14: every role is refilled). */
  readonly replacesStafferId?: string;
}

export interface WorkRecord {
  readonly id: string;
  readonly stafferId: string;
  readonly task: string;
  readonly date: string;
  readonly quality: number;
  readonly parts: {
    readonly reliability: number;
    readonly deliberation: number;
    readonly experience: number;
    readonly passion: number;
  };
  readonly result: Readonly<Record<string, unknown>>;
}

export const STAFF_MODULE: CoreModule = {
  id: STAFF_MODULE_ID,
  state: {
    schemaVersion: 1,
    tables: {
      staff: { indexes: { byOfficial: { fields: ["officialId"] } } },
      work: { indexes: { byStaffer: { fields: ["stafferId"] } } },
    },
  },
  onCalendarWork: (api, work) => staffReview(api, work),
};

export function openStaff(core: CoreState): void {
  registerLegislatureHooks({ beforeVote: briefBeforeVote });
  if (core.modules.has(STAFF_MODULE_ID)) return;
  registerModule(core, STAFF_MODULE);
  scheduleReview(coreAPI(core), core.date);
}

const table = (api: CoreAPI, name: string) =>
  api.moduleState(STAFF_MODULE_ID).table(name);

const ageOn = (p: Readonly<PersonState>, date: string) =>
  Number(date.slice(0, 4)) -
  Number(p.birthDate.slice(0, 4)) -
  (date.slice(5) < p.birthDate.slice(5) ? 1 : 0);

export interface StaffCandidate {
  readonly personId: string;
  readonly from: "known" | "applicant";
  /** From the town's counted population, filled in from its records at hire. */
  readonly counted?: boolean;
  /** An applicant where an out-of-town office sits, recorded as a person at hire. */
  readonly seat?: RecordedIdentity;
  /** How far they live within commuting reach of the office (1 in its county). */
  readonly reach: number;
  readonly reachBasis: "town" | "county" | "state" | "other-state";
  /** Their age's place in the working-age pool (1 at its fullest). */
  readonly workingAge: number;
  /** A family link to the official, when there is one. */
  readonly familyLinkId?: string;
  readonly traits: Readonly<Record<string, number>>;
}

const ageOnDay = (birthDate: string, date: string) =>
  Number(date.slice(0, 4)) -
  Number(birthDate.slice(0, 4)) -
  (date.slice(5) < birthDate.slice(5) ? 1 : 0);

const WORKING_AGE_POINTS = [18, 22, 30, 40, 50, 60, 70, 80] as const;

/**
 * An age's place in the working-age pool, sliding: the labor force share at
 * the nearest two band middles, read along the line between them, over the
 * fullest band's share. No age is cut off.
 */
let workingAgeTable: ReadonlyMap<number, number> | null = null;
export function workingAgeWeight(age: number): number {
  workingAgeTable ??= new Map(
    WORKING_AGE_POINTS.map((point) => [
      point,
      campaignParameter(`staffWorkingAgeAt${point}`),
    ]),
  );
  const table = workingAgeTable;
  const at = (point: number) => table.get(point)!;
  const top = Math.max(...table.values());
  const first = WORKING_AGE_POINTS[0];
  const last = WORKING_AGE_POINTS[WORKING_AGE_POINTS.length - 1]!;
  if (age <= first) return at(first) / top;
  if (age >= last) return at(last) / top;
  const upper = WORKING_AGE_POINTS.findIndex((point) => point >= age);
  const high = WORKING_AGE_POINTS[upper]!;
  const low = WORKING_AGE_POINTS[upper - 1]!;
  return (at(low) + ((age - low) / (high - low)) * (at(high) - at(low))) / top;
}

/** Where an office sits: its place, the counties that place lies in, and its state. */
interface OfficeSite {
  readonly placeId: string;
  readonly countyGeoids: readonly string[];
  readonly stateKey: string;
}

/**
 * Where the official's office sits, from the records: a state (or federal)
 * office at its government's seat (the capital's place, owner, Oct 14); a
 * town or county office in the town.
 */
function officeSiteOf(api: CoreAPI, officialId: string): OfficeSite {
  const chain = lawChain(api);
  const town: OfficeSite = {
    placeId: chain.townPlaceId,
    countyGeoids: chain.countyGeoids,
    stateKey: chain.stateKey,
  };
  const office = townSeats(api).find(
    (row) => row.holder?.personId === officialId,
  )?.office;
  if (!office || (office.level !== "state" && office.level !== "federal"))
    return town;
  const seat = coreSeatOfGovernmentPlace(
    office.level === "federal" ? "US-FEDERAL" : office.jurisdiction,
  );
  if (!seat) return town;
  const geoid = seat.place.sourceGeoid ?? "";
  return {
    placeId: seat.place.context.jurisdiction.id,
    countyGeoids: countyPopulationSharesForPlace(geoid).map(
      ([county]) => county,
    ),
    stateKey: seat.place.stateJurisdictionKey ?? chain.stateKey,
  };
}

const reachCache = new Map<
  string,
  Pick<StaffCandidate, "reach" | "reachBasis">
>();

/** How far a home is within commuting reach of the office's site, from the place records. */
function reachOf(
  site: OfficeSite,
  placeId: string,
  countyGeoids: readonly string[],
): Pick<StaffCandidate, "reach" | "reachBasis"> {
  // Place records never change in play: one read per site and home.
  const key = `${site.placeId}|${placeId}|${countyGeoids.join(",")}`;
  let held = reachCache.get(key);
  if (!held) {
    held = readReach(site, placeId, countyGeoids);
    reachCache.set(key, held);
  }
  return held;
}

function readReach(
  site: OfficeSite,
  placeId: string,
  countyGeoids: readonly string[],
): Pick<StaffCandidate, "reach" | "reachBasis"> {
  if (placeId === site.placeId) return { reach: 1, reachBasis: "town" };
  if (countyGeoids.some((county) => site.countyGeoids.includes(county)))
    return { reach: 1, reachBasis: "county" };
  const place = corePlaceByJurisdictionId(placeId as EntityId);
  const state =
    place?.scope === "state" ? place.key : place?.stateJurisdictionKey;
  // A place the records can't put in the state reads as out of it.
  return state && state === site.stateKey
    ? { reach: campaignParameter("staffReachOtherCounty"), reachBasis: "state" }
    : {
        reach: campaignParameter("staffReachOtherState"),
        reachBasis: "other-state",
      };
}

/** The counties a person's home lies in, from their recorded county. */
function homeCounties(countyId: string | undefined): readonly string[] {
  const geoid = countyId
    ? corePlaceByJurisdictionId(countyId as EntityId)?.sourceGeoid
    : undefined;
  return geoid ? [geoid] : [];
}

/** The family link between two people, if the records hold one. */
function familyLinkOf(api: CoreAPI, a: string, b: string): string | undefined {
  for (const link of (api.state as CoreState).familyLinks.values())
    if (link.personIds.includes(a) && link.personIds.includes(b))
      return link.id;
  return undefined;
}

/**
 * Who an official can hire: people they know, and applicants (town adults
 * out of work, or whose current pay is under the post's, and the town's
 * counted adults with no work in the records). Each is someone the records
 * can place: where they live, sliding by commuting reach of the office, and
 * their age's place in the working-age pool. A relative living out of town
 * whose own work isn't modeled (a husk) isn't counted as out of work.
 */
export function staffCandidates(
  api: CoreAPI,
  officialId: string,
): readonly StaffCandidate[] {
  const official = api.state.people.get(officialId);
  if (!official) return [];
  const state = api.state as CoreState;
  const town = lawChain(api).townPlaceId;
  const site = officeSiteOf(api, officialId);
  const date = api.state.date;
  const minimum = campaignParameter("staffMinimumAge");
  const hired = new Set(
    (table(api, "staff").rows() as unknown as StafferRow[]).map(
      (s) => s.personId,
    ),
  );
  const postHourly = campaignParameter("staffHourlyMinor");
  const out: StaffCandidate[] = [];
  for (const person of peopleInOrder(state)) {
    if (
      !person.alive ||
      person.id === officialId ||
      hired.has(person.id) ||
      inCustody(api, person.id) ||
      ageOn(person, date) < minimum
    )
      continue;
    if (person.tier === HUSK_TIER) {
      // stopgapId: SG-WORLD-staff-husk-work
      api.stopgap("SG-WORLD-staff-husk-work");
      continue;
    }
    const placed = {
      ...reachOf(site, person.placeId, homeCounties(person.countyId)),
      workingAge: workingAgeWeight(ageOn(person, date)),
      traits: person.traits,
    };
    if (official.knownIds.has(person.id) || official.familyIds.has(person.id)) {
      const link = official.familyIds.has(person.id)
        ? familyLinkOf(api, officialId, person.id)
        : undefined;
      out.push({
        personId: person.id,
        from: "known",
        ...placed,
        ...(link ? { familyLinkId: link } : {}),
      });
      continue;
    }
    if (person.placeId !== town) continue;
    const pay = [...(state.work.commitmentsByPerson.get(person.id) ?? [])]
      .map((id) => state.work.commitments.get(id))
      .filter((c) => c && c.endsAt === undefined)
      .reduce((max, c) => Math.max(max, c!.hourlyMinor), 0);
    if (pay < postHourly)
      out.push({ personId: person.id, from: "applicant", ...placed });
  }
  // The town's counted adults with no work in their records apply too.
  for (const voter of countedPool(api, town, minimum)) {
    if (hired.has(voter.id) || inCustody(api, voter.id)) continue;
    const known =
      official.knownIds.has(voter.id) || official.familyIds.has(voter.id);
    const link = official.familyIds.has(voter.id)
      ? familyLinkOf(api, officialId, voter.id)
      : undefined;
    out.push({
      personId: voter.id,
      from: known ? "known" : "applicant",
      counted: true,
      ...reachOf(site, town, lawChain(api).countyGeoids),
      workingAge: voter.workingAge,
      traits: voter.traits,
      ...(link ? { familyLinkId: link } : {}),
    });
  }
  const applicant = seatApplicant(api, officialId, site, hired);
  if (applicant) out.push(applicant);
  return out;
}

/**
 * An office that sits outside the town draws applicants from where it sits
 * (owner, Oct 14). That place's people aren't modeled, so one applicant is
 * drawn from the world's seed and the office, the way officials outside the
 * town are: the same person every time, a record only once hired, at the
 * calendar cadence of people outside the town (registered stopgap).
 */
function seatApplicant(
  api: CoreAPI,
  officialId: string,
  site: OfficeSite,
  hired: ReadonlySet<string>,
): StaffCandidate | null {
  const town = lawChain(api).townPlaceId;
  if (site.placeId === town) return null;
  // stopgapId: SG-WORLD-staff-seat-applicant
  api.stopgap("SG-WORLD-staff-seat-applicant");
  const round = staffOf(api, officialId).length;
  const seatKey = `aide:${officialId}:${round}`;
  const id = `person:${seatKey}`;
  if (hired.has(id) || api.state.people.has(id)) return null;
  const drawn = drawOfficialIdentity({
    worldSeed: api.state.seed,
    seatKey,
    stateUsps: site.stateKey.slice("US-".length),
    role: "business-worker",
    referenceDate: api.state.date,
  });
  const traits =
    openingTemperaments(
      [
        {
          id,
          birthDate: makeIsoDate(drawn.birthDate),
          gender: drawn.gender,
          parents: [],
        },
      ],
      {
        seed: api.state.seed,
        startedAt: makeIsoDate(api.state.startedAt),
      },
    ).get(id) ?? {};
  const identity: RecordedIdentity = {
    id,
    givenName: drawn.givenName,
    familyName: drawn.familyName,
    birthDate: makeIsoDate(drawn.birthDate),
    placeId: site.placeId,
    gender: drawn.gender,
    traits,
    tier: SEAT_APPLICANT_TIER,
    source: {
      tag: "ESTIMATED",
      asOf: api.state.date,
      citation: `An applicant where the office of ${officialId} sits.`,
      estimatedFrom: "SG-WORLD-staff-seat-applicant",
    },
  };
  return {
    personId: id,
    from: "applicant",
    seat: identity,
    reach: 1,
    reachBasis: "town",
    workingAge: workingAgeWeight(
      ageOn(identity as unknown as PersonState, api.state.date),
    ),
    traits,
  };
}

const pools = new WeakMap<
  CoreState,
  {
    readonly date: string;
    readonly rows: readonly {
      readonly id: string;
      readonly workingAge: number;
      readonly traits: Readonly<Record<string, number>>;
    }[];
  }
>();

/** The town's counted adults with no work in their records, once a day. */
function countedPool(api: CoreAPI, town: string, minimum: number) {
  const state = api.state as CoreState;
  const held = pools.get(state);
  if (held?.date === state.date) return held.rows;
  const rows = countedResidents(state)
    .filter(
      (voter) =>
        voter.placeId === town &&
        voter.weeklyMinutes <= 0 &&
        ageOnDay(voter.birthDate, state.date) >= minimum,
    )
    .map((voter) => ({
      id: voter.id,
      workingAge: workingAgeWeight(ageOnDay(voter.birthDate, state.date)),
      traits: voter.traits,
    }));
  pools.set(state, { date: state.date, rows });
  return rows;
}

const ordered = new WeakMap<
  CoreState,
  {
    readonly date: string;
    readonly size: number;
    readonly rows: readonly PersonState[];
  }
>();

/** Full people in id order, sorted once a day (or when someone is filled in). */
function peopleInOrder(state: CoreState): readonly PersonState[] {
  const held = ordered.get(state);
  if (held?.date === state.date && held.size === state.people.size)
    return held.rows.map((row) => state.people.get(row.id) ?? row);
  const rows = [...state.people.values()].sort((a, b) =>
    a.id.localeCompare(b.id),
  );
  ordered.set(state, { date: state.date, size: state.people.size, rows });
  return rows;
}

/** How well a new hire would do the work, from their traits alone (no tasks done yet). */
function hireQuality(traits: Readonly<Record<string, number>>): number {
  return Math.max(
    0,
    Math.min(
      1,
      campaignParameter("staffBaseQuality") +
        ((traits["people-mind-v1:reliability"] ?? 0) +
          (traits["people-mind-v1:deliberation"] ?? 0)) *
          campaignParameter("staffTraitWeight"),
    ),
  );
}

/** Why an official would hire this candidate, by part, and the score they add to. */
export function hireReasons(candidate: StaffCandidate): {
  score: number;
  reasons: Record<string, number>;
} {
  const work = hireQuality(candidate.traits);
  const known =
    candidate.from === "known" ? campaignParameter("staffKnownWeight") : 0;
  const reasons: Record<string, number> = {
    work,
    reach: candidate.reach,
    workingAge: candidate.workingAge,
    known,
    ...(candidate.familyLinkId ? { family: 1 } : {}),
  };
  return {
    score: (work + known) * candidate.reach * candidate.workingAge,
    reasons,
  };
}

/** Hire one of the official's candidates. */
export function hireStaff(
  api: CoreAPI,
  input: {
    readonly officialId: string;
    readonly personId: string;
    readonly role: string;
  },
  /** The candidate as the review already weighed them, to skip a second scan. */
  chosen?: StaffCandidate,
): StafferRow {
  const candidate =
    chosen?.personId === input.personId
      ? chosen
      : staffCandidates(api, input.officialId).find(
          (c) => c.personId === input.personId,
        );
  if (!candidate || inCustody(api, input.personId))
    throw new Error(`${input.personId} isn't a candidate for this office`);
  // Someone from the counted population becomes a full person from their
  // records first: their household, past and the work their books show.
  if (candidate.counted) fillInPerson(api.state as CoreState, input.personId);
  if (candidate.seat) fillInIdentity(api.state as CoreState, candidate.seat);
  const person = api.state.people.get(input.personId)!;
  // On the payroll of the government the official serves, at the post's
  // pay; each payday counts against the budget line the post draws on.
  const employer = employerOf(api, input.officialId);
  const jobId = employer
    ? startPublicJob(api, {
        personId: input.personId,
        employerId: employer,
        post: `staff:${input.officialId}`,
        title: input.role,
        hourlyMinor: campaignParameter("staffHourlyMinor"),
        citation: `Hired as ${input.role} to ${input.officialId}`,
      })
    : null;
  // stopgapId: SG-GOV-staff-unpaid
  if (!jobId) api.stopgap("SG-GOV-staff-unpaid");
  // The first of the official's aides who died or left the post and has no successor yet.
  const replaced = new Set(
    staffOf(api, input.officialId).map((r) => r.replacesStafferId),
  );
  const replaces = staffOf(api, input.officialId).find(
    (r) => !serving(api, r) && !replaced.has(r.id),
  );
  const row: StafferRow = {
    id: `staffer:${input.officialId}:${input.personId}`,
    officialId: input.officialId,
    personId: input.personId,
    role: input.role,
    hiredOn: api.state.date,
    hiredFrom: candidate.from,
    tasksDone: 0,
    reasons: hireReasons(candidate).reasons,
    reasonRecordIds: [
      // Where the office sits, and where the hire lives.
      officeSiteOf(api, input.officialId).placeId,
      person.placeId,
      ...(person.countyId ? [person.countyId] : []),
      ...(candidate.familyLinkId ? [candidate.familyLinkId] : []),
      ...(candidate.counted ? [`counted:${person.householdId}`] : []),
    ],
    ...(jobId ? { jobId } : {}),
    ...(replaces ? { replacesStafferId: replaces.id } : {}),
  };
  table(api, "staff").put(row as unknown as ModuleRow);
  api.relationship(input.officialId, input.personId, "contact", 0.1);
  return row;
}

/**
 * How the room left on the line staff pay draws on leans an official toward
 * or away from hiring: room for many years of the post's pay pushes toward
 * it, an exhausted line away from it, smoothly in between (0 at exactly a
 * year's room).
 */
function budgetLean(api: CoreAPI, officialId: string): number {
  const employer = employerOf(api, officialId);
  if (!employer) return 0;
  const yearly =
    campaignParameter("staffHourlyMinor") *
    treasuryParameter("fullTimeHoursPerYear");
  const years = Math.max(
    0,
    publicPayRoom(api, employer, `staff:${officialId}`) / yearly,
  );
  return (
    treasuryParameter("staffBudgetRoomWeight") * ((2 * years) / (1 + years) - 1)
  );
}

/** The treasury of the government whose seat the official holds. */
function employerOf(api: CoreAPI, officialId: string): string | null {
  if (!api.state.modules.has(BUDGETS_MODULE_ID)) return null;
  const seat = townSeats(api).find((s) => s.holder?.personId === officialId);
  if (!seat) return null;
  const level = seat.office.level === "township" ? "city" : seat.office.level;
  return (
    governments(api).find((g) => g.level === level)?.organizationId ?? null
  );
}

export function staffOf(
  api: CoreAPI,
  officialId: string,
): readonly StafferRow[] {
  return table(api, "staff").query("byOfficial", [
    officialId,
  ]) as unknown as StafferRow[];
}

/** An aide serves while alive and still in the post's job. */
function serving(api: CoreAPI, row: StafferRow): boolean {
  const person = api.state.people.get(row.personId);
  return (
    !!person?.alive && (row.jobId === undefined || person.jobId === row.jobId)
  );
}

/** The official's aides who serve now; one who died or left is replaced. */
export function servingStaffOf(
  api: CoreAPI,
  officialId: string,
): readonly StafferRow[] {
  return staffOf(api, officialId).filter((row) => serving(api, row));
}

/** How well a staffer does a task on a question, and the parts behind it. */
export function workQuality(
  api: CoreAPI,
  staffer: StafferRow,
  question: string | null,
): { quality: number; parts: WorkRecord["parts"] } {
  const person = api.state.people.get(staffer.personId)!;
  const reliability =
    (person.traits["people-mind-v1:reliability"] ?? 0) *
    campaignParameter("staffTraitWeight");
  const deliberation =
    (person.traits["people-mind-v1:deliberation"] ?? 0) *
    campaignParameter("staffTraitWeight");
  // Experience: what they've learned from tasks done, at their own rate
  // (faster for the deliberate, slower but never stopped for the least).
  const rate =
    campaignParameter("staffLearningBase") *
    2 ** ((person.traits["people-mind-v1:deliberation"] ?? 0) / 2);
  const experience =
    campaignParameter("staffExperienceCeiling") *
    (1 - Math.exp(-rate * staffer.tasksDone));
  // Passion: how much they care about this question, from their own view.
  const passion = question
    ? campaignParameter("staffPassionWeight") *
      Math.abs(
        viewOn(
          api,
          person.id,
          question,
          personLean(api.state.people, person, townLean(api)),
        ),
      )
    : 0;
  const quality = Math.max(
    0,
    Math.min(
      1,
      campaignParameter("staffBaseQuality") +
        reliability +
        deliberation +
        experience +
        passion,
    ),
  );
  return { quality, parts: { reliability, deliberation, experience, passion } };
}

function townLean(api: CoreAPI): number {
  return (
    (
      api
        .moduleState("core2-campaigns-v1")
        .table("town")
        .get("town") as unknown as { lean: number } | undefined
    )?.lean ?? 0
  );
}

function record(
  api: CoreAPI,
  staffer: StafferRow,
  task: string,
  q: ReturnType<typeof workQuality>,
  result: Record<string, unknown>,
): WorkRecord {
  const work: WorkRecord = {
    id: `work:${staffer.id}:${staffer.tasksDone + 1}`,
    stafferId: staffer.id,
    task,
    date: api.state.date,
    quality: q.quality,
    parts: q.parts,
    result,
  };
  table(api, "work").put(work as unknown as ModuleRow);
  table(api, "staff").put({
    ...staffer,
    tasksDone: staffer.tasksDone + 1,
  } as unknown as ModuleRow);
  return work;
}

/**
 * A briefing on a bill: the staffer reads the record of as many of the body's
 * members as their work covers, and reports each one's stake.
 */
export function briefOnBill(
  api: CoreAPI,
  stafferId: string,
  billId: string,
): { work: WorkRecord; stakes: readonly MemberPosition[] } {
  const staffer = table(api, "staff").get(stafferId) as unknown as StafferRow;
  const bill = api
    .moduleState(LEGISLATURE_MODULE_ID)
    .table("bills")
    .get(billId) as unknown as BillRow;
  const question =
    bill.provisions
      .map((p) => provisionStance(api, p)?.question)
      .find((q): q is string => !!q) ?? null;
  const q = workQuality(api, staffer, question);
  const body = members(api, bill.bodyOfficeId)
    .map((t) => t.personId ?? `official:${t.id}`)
    .filter((id) => id !== staffer.officialId)
    .sort();
  const covered = body.slice(0, Math.round(q.quality * body.length));
  const stakes = covered.map((id) => learnStake(api, billId, id, "record"));
  const work = record(api, staffer, "brief", q, {
    billId,
    covered: covered.length,
    of: body.length,
  });
  return { work, stakes };
}

/**
 * Advice on budget priorities: for each proposed line change, the staffer
 * reads as many members of each voting chamber as their work covers and
 * reports who favors and who opposes it; a change opposed by more of those
 * read than favor it, in any chamber, is at risk of being dropped when the
 * budget is negotiated.
 */
export function adviseOnBudget(
  api: CoreAPI,
  stafferId: string,
  governmentId: string,
  changes: Readonly<Record<string, number>>,
): {
  work: WorkRecord;
  lines: readonly {
    line: string;
    delta: number;
    chambers: readonly {
      chamber: string;
      read: number;
      of: number;
      favor: number;
      oppose: number;
    }[];
    atRisk: boolean;
  }[];
} | null {
  const staffer = table(api, "staff").get(stafferId) as unknown as StafferRow;
  const q = workQuality(api, staffer, null);
  const lines = [];
  for (const [line, delta] of Object.entries(changes).sort(([a], [b]) =>
    a.localeCompare(b),
  )) {
    const stakes = budgetLineStakes(api, governmentId, line, delta);
    if (!stakes) return null;
    const chambers = [...new Set(stakes.map((s) => s.chamber))].map(
      (chamber) => {
        const body = stakes
          .filter((s) => s.chamber === chamber)
          .sort((a, b) => a.memberId.localeCompare(b.memberId));
        const read = body.slice(0, Math.round(q.quality * body.length));
        return {
          chamber,
          read: read.length,
          of: body.length,
          favor: read.filter((s) => s.stake > 0).length,
          oppose: read.filter((s) => s.stake < 0).length,
        };
      },
    );
    lines.push({
      line,
      delta,
      chambers,
      atRisk: chambers.some((c) => c.oppose > c.favor),
    });
  }
  const work = record(api, staffer, "budget-advice", q, {
    governmentId,
    lines: lines.length,
  });
  return { work, lines };
}

/**
 * A constituent case handled by the official's staffer: they help when their
 * work on it is good enough to follow through; the result records who did it.
 */
export function staffDecision(
  api: CoreAPI,
  officialId: string,
): { stafferId: string; help: boolean; work: WorkRecord } | null {
  const staffer = [...servingStaffOf(api, officialId)].sort(
    (a, b) => b.tasksDone - a.tasksDone || a.id.localeCompare(b.id),
  )[0];
  if (!staffer) return null;
  const q = workQuality(api, staffer, null);
  // Ability is the work's quality; whether they see it through also leans on
  // every trait they have.
  const person = api.state.people.get(staffer.personId)!;
  const help =
    q.quality +
      parameter("traitDecisionWeight") *
        decisionLean(
          api.state,
          person,
          "staff.follow-through",
          "follow-through",
          "decline",
        ) >=
    campaignParameter("staffCaseFollowThrough");
  const work = record(api, staffer, "case", q, { help });
  return { stafferId: staffer.id, help, work };
}

export function workOf(api: CoreAPI, stafferId: string): readonly WorkRecord[] {
  return table(api, "work").query("byStaffer", [
    stafferId,
  ]) as unknown as WorkRecord[];
}

function scheduleReview(api: CoreAPI, from: string): void {
  const date = addDays(makeIsoDate(from), campaignParameter("staffReviewDays"));
  api.moduleCalendar(STAFF_MODULE_ID).schedule({
    key: `staff-review:${date}`,
    date,
    kind: "staff-review",
    source: {
      tag: "ESTIMATED",
      citation: "An official's regular look at their office's work",
      asOf: api.state.date,
      estimatedFrom: "staffReviewDays",
    },
    sourceRecordIds: [`staff-review:${lawChain(api).townPlaceId}`],
  });
}

/**
 * Each official who is a person in town, holding a seat, with room in their
 * office for a staffer, decides from their own traits whether to hire; they
 * choose among people they know and applicants who'd take the post (it pays
 * more than they earn now), by how well each would do the work, people they
 * know counting for more.
 */
function staffReview(api: CoreAPI, work: Readonly<ModuleCalendarWork>): void {
  if (work.kind !== "staff-review") return;
  scheduleReview(api, api.state.date);
  const state = api.state as CoreState;
  const postHourly = campaignParameter("staffHourlyMinor");
  const officials = [
    ...new Set(
      townSeats(api)
        .map((s) => s.holder?.personId)
        .filter((id): id is string => !!id && id !== state.playerId),
    ),
  ].sort();
  for (const officialId of officials) {
    const official = api.state.people.get(officialId);
    if (!official?.alive) continue;
    if (
      servingStaffOf(api, officialId).length >=
      campaignParameter("staffPerOfficial")
    )
      continue;
    if (
      campaignParameter("staffHireBase") +
        parameter("traitDecisionWeight") *
          decisionLean(api.state, official, "staff.hire", "hire", "do-alone") +
        budgetLean(api, officialId) <=
      0
    )
      continue;
    // Anyone the post pays more than they earn now would apply, an employed
    // one leaving their job for it (`startPublicJob` ends it).
    const choice = staffCandidates(api, officialId)
      .filter((c) => {
        const pay = [...(state.work.commitmentsByPerson.get(c.personId) ?? [])]
          .map((id) => state.work.commitments.get(id))
          .filter((row) => row && row.endsAt === undefined)
          .reduce((max, row) => Math.max(max, row!.hourlyMinor), 0);
        return pay < postHourly;
      })
      .map((c) => ({ ...c, score: hireReasons(c).score }))
      .sort(
        (a, b) => b.score - a.score || a.personId.localeCompare(b.personId),
      )[0];
    if (choice)
      hireStaff(
        api,
        {
          officialId,
          personId: choice.personId,
          role: "aide",
        },
        choice,
      );
  }
}

/** Before a vote, each member with a staffer is briefed on where the others stand. */
function briefBeforeVote(api: CoreAPI, billId: string): void {
  if (!api.state.modules.has(STAFF_MODULE_ID)) return;
  const bill = api
    .moduleState(LEGISLATURE_MODULE_ID)
    .table("bills")
    .get(billId) as unknown as BillRow | undefined;
  if (!bill) return;
  for (const term of members(api, bill.bodyOfficeId)) {
    if (!term.personId) continue;
    const staffer = [...servingStaffOf(api, term.personId)].sort(
      (a, b) => b.tasksDone - a.tasksDone || a.id.localeCompare(b.id),
    )[0];
    if (staffer) briefOnBill(api, staffer.id, billId);
  }
}

export { coreAPI };
