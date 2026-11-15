import { heldSinceRecord, pastWorkOf, PAST_WORK_SPELL } from "../past-work";
import { workedToday } from "../job-lifecycle";
import { snapshotExplicitControlV1 } from "../player-control-state-v1";
/**
 * The executive's desk (M3-05; BOARD "features the old engine had":
 * executive acts), on one engine for every level: appointments with
 * confirmation, and executive orders where the office really has the power.
 * Signing or vetoing and budget priorities already run through the
 * legislature and budgets engines.
 *
 * - **Appointments.** The town's department heads come from its form of
 *   government (`data/research/executive/executive-powers-2026.json`, local
 *   forms): the appointing authority (the mayor, or the council where it
 *   appoints) chooses among the town's adults by how closely their views
 *   match, their qualification (reliability and deliberation, and experience
 *   in that department) and whether the appointer knows them; the council
 *   confirms where the form asks it to. The player, as the appointer, names
 *   their own choice. A state's cabinet is drawn as fictional appointees the
 *   governor chooses among, confirmed by the state senate where the state
 *   requires it.
 * - **Executive orders.** An executive can order what their office may set
 *   without the legislature (research `canOrder`), as a law row the next
 *   executive can revoke; it reaches people through the same law effects as a
 *   statute. Only orders an engine can carry are offered.
 */
import { policyAuthority } from "../policy-authority";
import research from "../../../data/research/executive/executive-powers-2026.json" with { type: "json" };
import relatedWork from "../../../data/research/executive/post-related-work.json" with { type: "json" };
import { PROFILE_FACT_KINDS } from "../opening-profile";
import { schoolingOn } from "./jobs";
import emergencyData from "../data/executive/emergency.json" with { type: "json" };
import federalOrderData from "../data/executive/federal-orders.json" with { type: "json" };
import {
  coreAPI,
  fillInIdentity,
  personOrFillIn,
  registerModule,
} from "../state";
import { drawnAdult } from "./counted-moves";
import { placeStateKey } from "../place-map";
import {
  corePlaceByJurisdictionId,
  coreSeatOfGovernmentPlace,
  type CorePlace,
} from "../place-lookup";
import { drawStateHome, workFromHome } from "../places";
import { placeReferencePopulation } from "../gov-rules/place-population";
import { MACRO_MODULE_ID, countryStateParts } from "./macro";
import { officialOf, temperamentOf } from "./officials";
import { admitCountedHousehold } from "./residents";
import type {
  CoreAPI,
  CoreModule,
  CoreState,
  PersonId,
  PersonState,
} from "../types";
import type { ModuleRow } from "../module-data";
import { answerIn, enactLaw, lawChain, lawInForce } from "./laws";
import { OFFICES_MODULE_ID, townSeats, type TermRow } from "./offices";
import {
  appointerWeighing,
  nominateAndConfirm,
  partySide,
  type Appointment,
  type NominationReasons,
} from "../appointments";
import { drawOfficialIdentity } from "../officials-identity";
import { personLean } from "../campaign-views";
import { campaignParameter } from "../campaign-data";
import { viewOn } from "./views";
import { leanOf, mayorVeto, memberKey, members } from "./legislature";
import type { ModuleCalendarWork } from "../module-calendar";
import { addDays, ageOnDate, makeIsoDate } from "../kernel/dates";
import {
  BUDGETS_MODULE_ID,
  amendBudget,
  governmentOfJurisdiction,
  governments,
} from "./budgets";
import { federalAidFor } from "./disasters";
import { lineForPost, postPayCapDaily } from "../budgets-treasury";
import { startPublicJob } from "../public-payroll";
import { filingRequirements } from "./elections";
import {
  describesByRule,
  ruleOfficeBody,
  ruleOfficeCounty,
} from "../filing-rule-office";
import { localClerkFor } from "./candidacy";
import { pairKey } from "../kernel/ids";

export const EXECUTIVE_MODULE_ID = "core2-executive-v1";

interface PostSpec {
  readonly key: string;
  readonly title: string;
  readonly appointedBy: string;
  readonly confirmedBy: string;
}
const RESEARCH = research as unknown as {
  local: {
    city: Record<string, PostSpec[]>;
    county: Record<string, PostSpec[]>;
  };
  places: Record<
    string,
    {
      cabinet?: { positions?: PostSpec[] };
      canOrder?: { key: string }[] | Record<string, unknown>;
      pardon?: { authority: string };
    }
  >;
};

/** The orders an engine can carry, by the research key, to the law series they set. */
const ORDERABLE: Readonly<Record<string, string>> = {
  "restore-voting-after-sentence":
    "us-policy-positions:justice-public-safety.restore-voting-after-sentence",
  // Governors recognize public-employee unions by order where precedent exists (AZ, IN, KS, KY, MO, VA;
  // data/research/executive/executive-powers-2026.json canOrder); elsewhere it is set by statute.
  "public-employee-collective-bargaining-recognition":
    "us-policy-positions:labor-workforce.public-sector-collective-bargaining",
};

/** The policy question an executive order answers, by the order's key (for a screen to name it). */
export const orderQuestionOf = (order: string): string | undefined =>
  ORDERABLE[order];

export interface AppointmentRow {
  readonly id: string;
  readonly government: string;
  readonly post: string;
  readonly title: string;
  readonly holderId: string;
  /** A fictional appointee's name, where they aren't a resident. */
  readonly identity: { givenName: string; familyName: string } | null;
  readonly appointedBy: string;
  readonly confirmation: Appointment["confirmation"];
  readonly reasons: Appointment["reasons"];
  readonly since: string;
}

export const EXECUTIVE_MODULE: CoreModule = {
  id: EXECUTIVE_MODULE_ID,
  state: {
    schemaVersion: 1,
    tables: {
      appointments: { indexes: { byGovernment: { fields: ["government"] } } },
      agencyHeads: { indexes: { byGovernment: { fields: ["government"] } } },
      orders: {},
      /** The President's latest weighing of each federal order: the view, the law now and what they did about it. */
      orderDecisions: {},
      emergencies: {},
      /** A disaster the player governor may declare an emergency for: the offer waits for their answer. */
      emergencyOffers: {},
      nominations: {},
      review: {},
    },
  },
  onCalendarWork: (api, work) => {
    if (work.kind === POST_JOB_END) return endPostJobOnCalendar(api, work);
    deskReview(api, work);
  },
  // A disaster on the record reaches the governor's desk the day it is
  // recorded (world-governor-declares-emergency-in-play).
  eventKinds: ["hazard.disaster"],
  onEvent: (api, event) => governorAnswersDisaster(api, event.id),
};

/**
 * The sitting governor declares a state of emergency for a federally declared
 * disaster in the state, where the state's law gives them the power. A FEMA
 * major-disaster number on the record means the governor already acted: the
 * federal declaration comes only on the governor's request, after the state
 * has acted under its own law (Robert T. Stafford Act, 42 U.S.C. 5170; 44 CFR
 * 206.36). So the cause decides it, never a chance. A player governor
 * decides for themselves: the engine never declares for them (stopgap
 * SG-GOV-player-emergency-offer until the office screen offers it).
 */
function governorAnswersDisaster(api: CoreAPI, hazardRecordId: string): void {
  const hazard = (api.state as CoreState).durableLog.get(hazardRecordId);
  if (!hazard?.facts?.disasterNumber) return;
  const governor = townSeats(api).find(
    (s) => s.office.kind === "governor",
  )?.holder;
  if (!governor || !emergencyPower(api)) return;
  const executiveId = memberKey(governor);
  if (
    executiveId ===
    (snapshotExplicitControlV1(api.state).personId ??
      (api.state as CoreState).playerId)
  ) {
    // A player governor decides for themselves: the disaster waits as an offer on their desk
    // (the state day's `emergency` entry), and the engine never declares for them.
    table(api, "emergencyOffers").put({
      id: `emergency-offer:${hazardRecordId}`,
      hazardRecordId,
      executiveId,
      date: api.state.date,
      answered: false,
    } as unknown as ModuleRow);
    return;
  }
  const id = `emergency:${lawChain(api).stateKey}:${hazardRecordId}`;
  if (table(api, "emergencies").get(id)) return;
  if (!governments(api).some((g) => g.level === "state")) return;
  declareEmergency(api, { executiveId, hazardRecordId });
}

const table = (api: CoreAPI, name: string) =>
  api.moduleState(EXECUTIVE_MODULE_ID).table(name);

const POST_JOB_END = "post-job-end";

/**
 * The job of a post's replaced holder ends the day the new appointee takes
 * it, unless the holder already worked today (a player's day runs before the
 * calendar's): a job ends before its day's work, so theirs ends in tomorrow's
 * calendar work, as an office job does (`reviewOfficeJobs`). The post itself
 * changes hands at once; only the replaced holder's last shift runs out.
 */
function endReplacedPostJob(
  api: CoreAPI,
  jobId: string,
  sourceId: string,
): void {
  const core = api.state as CoreState;
  if (core.jobs.get(jobId)?.endsAt !== undefined || !core.jobs.has(jobId))
    return;
  if (core.work.lastAttendanceByJob.get(jobId)?.date !== core.date) {
    api.endJob(jobId, sourceId);
    return;
  }
  const calendar = api.moduleCalendar(EXECUTIVE_MODULE_ID);
  const key = `${POST_JOB_END}:${jobId}`;
  if (calendar.get(key)) return;
  const date = addDays(makeIsoDate(core.date), 1);
  calendar.schedule({
    key,
    date,
    kind: POST_JOB_END,
    source: {
      tag: "SOURCED",
      citation: `Replaced holder worked ${core.date}: ${sourceId}`,
      asOf: core.date,
    },
    sourceRecordIds: [jobId, sourceId],
  });
}

/** Tomorrow's calendar work ends the job of a replaced holder who worked the day they were replaced. */
function endPostJobOnCalendar(
  api: CoreAPI,
  work: Readonly<ModuleCalendarWork>,
): void {
  const [jobId, sourceId] = work.sourceRecordIds;
  if (jobId && sourceId) endReplacedPostJob(api, jobId, sourceId);
}
// Age by the birthday, not the year: a resident born in February 2007 is 17
// in January 2025, and not yet one of the town's adults.
const ageOn = (p: Readonly<Pick<PersonState, "birthDate">>, date: string) =>
  ageOnDate(p.birthDate, date);

/** The town's form of government, read from who holds office there. */
export function townForm(
  api: CoreAPI,
): "strong-mayor" | "weak-mayor-council" | "council-manager" {
  const seats = townSeats(api);
  const mayor = seats.find(
    (s) => s.office.kind === "mayor" && s.office.elected && s.holder,
  );
  // A directly elected mayor with the state's veto runs the departments; one
  // without it shares them with the council (weak mayor); no elected mayor,
  // a manager does.
  if (!mayor) return "council-manager";
  return mayorVeto(api).veto ? "strong-mayor" : "weak-mayor-council";
}

/**
 * The posts the place's own executive appoints, from the research file by the government that
 * runs it (level as data): a city's by its form (mayor, council-manager), a county's where a
 * county executive sits or, failing one, a board that hires an administrator. A township board
 * runs its place as a council does. Elected posts (a sheriff, the county executive) are seats,
 * not appointments.
 */
export function townPosts(api: CoreAPI): readonly PostSpec[] {
  const seats = townSeats(api);
  const held = (kind: string) =>
    seats.some((s) => s.office.kind === kind && s.holder);
  const cityRun = held("council") || held("mayor") || held("township-board");
  const forms = RESEARCH.local;
  const posts = cityRun
    ? (forms.city[townForm(api)] ?? [])
    : held("county-executive")
      ? (forms.county["county-executive"] ?? [])
      : held("county-board")
        ? (forms.county["council-administrator"] ?? [])
        : [];
  return posts.filter((spec) => !/voters/.test(spec.appointedBy));
}

/**
 * Fill the town's department heads and the state's
 * cabinet at the opening (who holds them then; vacancies come later).
 */
export function openExecutive(core: CoreState, worldSeed: string): void {
  if (core.modules.has(EXECUTIVE_MODULE_ID)) return;
  registerModule(core, EXECUTIVE_MODULE);
  const api = coreAPI(core);
  appointTownDepartments(api);
  appointStateCabinet(api, worldSeed);
  seatElectionChief(api, worldSeed);
  seatLocalFilingOfficers(api, worldSeed);
  seatRuleFilingOfficers(api, worldSeed);
  table(api, "review").put({ id: "seed", worldSeed } as unknown as ModuleRow);
  scheduleReview(api, core.date);
}

/** The seat of the body that governs the place: its council, township board or county board. */
const BOARD_KINDS = ["council", "township-board", "county-board"];

function townAppointer(api: CoreAPI, by: string): TermRow | null {
  const seats = townSeats(api);
  // stopgapId: SG-EXECUTIVE-administrator-appoints
  // A post the county administrator fills is filled in the board's direction: the board's
  // holder stands in for the administrator as the appointer.
  const kinds = /county executive/.test(by)
    ? ["county-executive"]
    : /mayor/.test(by)
      ? ["mayor"]
      : BOARD_KINDS;
  for (const kind of kinds) {
    const held = seats.find(
      (s) => s.office.kind === kind && s.holder?.personId,
    )?.holder;
    if (held) return held;
  }
  return null;
}

function councilSides(api: CoreAPI): number[] {
  const council = townSeats(api).find((s) =>
    BOARD_KINDS.includes(s.office.kind),
  );
  return council
    ? members(api, council.office.id).map((t) => partySide(t.party))
    : [];
}

const RELATED = relatedWork as unknown as {
  posts: Readonly<Record<string, readonly string[]>>;
};
const DAYS_PER_YEAR = 365.25;
const yearsBetween = (from: string, to: string) =>
  Math.max(0, (Date.parse(to) - Date.parse(from)) / 86_400_000 / DAYS_PER_YEAR);

/**
 * What the records say a resident has done toward heading a department: years
 * of work in the post's own field, years of any work, and schooling, each with
 * the record it was read from. A job counts from when its holder began it
 * (the record of their working life before the start, where it has one), and
 * the jobs that working life ended before day one count as years of work.
 */
export function postRecord(
  api: CoreAPI,
  person: Readonly<PersonState>,
  post: string,
  date: string,
): {
  relatedYears: number;
  workYears: number;
  schooling: string | undefined;
  recordIds: readonly string[];
} {
  const core = api.state as CoreState;
  const fields = new Set(RELATED.posts[post] ?? []);
  let relatedYears = 0;
  let workYears = 0;
  const recordIds: string[] = [];
  for (const row of pastWorkOf(core, person.id))
    if (
      row.kind === PAST_WORK_SPELL &&
      row.facts.endedAt &&
      String(row.facts.endedAt) <= date
    )
      workYears += yearsBetween(
        String(row.facts.startedAt),
        String(row.facts.endedAt),
      );
  for (const id of core.work.commitmentsByPerson.get(person.id) ?? []) {
    const commitment = core.work.commitments.get(id);
    if (!commitment || commitment.startsAt > date) continue;
    const since = heldSinceRecord(core, person.id, commitment.jobId);
    const started = since ? String(since.facts.startedAt) : undefined;
    const from =
      started && started < commitment.startsAt
        ? started
        : (commitment.heldSince ?? commitment.startsAt);
    const to =
      commitment.endsAt && commitment.endsAt < date ? commitment.endsAt : date;
    const years = yearsBetween(from, to);
    if (years <= 0) continue;
    workYears += years;
    const job = core.jobs.get(commitment.jobId);
    if (
      job?.occupationClassification &&
      fields.has(job.occupationClassification)
    ) {
      relatedYears += years;
      recordIds.push(commitment.id, ...(since ? [since.id] : []));
    }
  }
  const schooling = schoolingOn(api, person.id, date);
  const schooled = schooling === "college" || schooling === "some-college";
  if (schooled) {
    const fact = person.pastFacts?.find(
      (row) => row.kind === PROFILE_FACT_KINDS.education,
    );
    recordIds.push(fact?.id ?? `${person.id}:${PROFILE_FACT_KINDS.education}`);
  }
  return { relatedYears, workYears, schooling, recordIds };
}

/** What is known of the work of someone not yet filled in: nothing. */
const NO_POST_RECORD = {
  relatedYears: 0,
  workYears: 0,
  schooling: undefined,
  recordIds: [] as string[],
};

/** Whether the records show related work or schooling past high school. */
const hasRecord = (record: ReturnType<typeof postRecord>) =>
  record.relatedYears > 0 ||
  record.schooling === "college" ||
  record.schooling === "some-college";

/**
 * How qualified a resident is for a department: their temperament, then what
 * the records say they have done, each on a saturating scale (no step at any
 * number of years): years in the post's field, years of any work, schooling.
 */
export function appointmentQualification(
  person: Readonly<Pick<PersonState, "traits">>,
  record: ReturnType<typeof postRecord>,
): number {
  const temperament =
    ((person.traits["people-mind-v1:reliability"] ?? 0) +
      (person.traits["people-mind-v1:deliberation"] ?? 0)) *
    campaignParameter("appointmentTemperamentWeight");
  const saturating = (years: number, half: string, weight: string) =>
    (campaignParameter(weight) * years) / (years + campaignParameter(half));
  const schooling =
    record.schooling === "college"
      ? campaignParameter("appointmentCollegeWeight")
      : record.schooling === "some-college"
        ? campaignParameter("appointmentSomeCollegeWeight")
        : 0;
  // 0 and 1 bound the score, as they do for every 0..1 score in this file.
  return Math.max(
    0,
    Math.min(
      1,
      campaignParameter("appointmentBaseQualification") +
        temperament +
        saturating(
          record.relatedYears,
          "appointmentRelatedWorkHalfYears",
          "appointmentRelatedWorkWeight",
        ) +
        saturating(
          record.workYears,
          "appointmentWorkHalfYears",
          "appointmentWorkWeight",
        ) +
        schooling,
    ),
  );
}

/**
 * The people a town post could go to and what the appointer weighs in each:
 * the town's adults who are not already heading a department, the appointer
 * or the player, ranked by the appointer's reasons (alignment, qualification,
 * acquaintance). Nothing is written.
 */
function townPostInput(
  api: CoreAPI,
  spec: PostSpec,
  chosenId?: string,
  drawn = false,
) {
  const appointer = townAppointer(api, spec.appointedBy);
  const date = api.state.date;
  const town = lawChain(api).townPlaceId;
  const appointerLean = appointer?.personId
    ? personLean(api.state.people, api.state.people.get(appointer.personId)!, 0)
    : 0;
  // One post each: someone already heading a department isn't asked again.
  const holding = new Set(
    appointmentsIn(api, town)
      .filter((a) => a.post !== spec.key)
      .map((a) => a.holderId),
  );
  // Offices are not held together: a sitting council member, mayor or county
  // commissioner is not appointed department head (their seat's full-time job
  // would replace the head's on the payroll the day it began).
  const seated = new Set(
    townSeats(api).flatMap((s) =>
      s.holder?.personId && s.holder.status === "serving"
        ? [s.holder.personId]
        : [],
    ),
  );
  // The player's decisions are theirs: nobody appoints the player to a post
  // they didn't choose (owner, Oct 14: the engine offers, the player decides).
  const playerId =
    snapshotExplicitControlV1(api.state).personId ??
    (api.state as CoreState).playerId;
  const adults = [...(api.state.peopleByPlace.get(town) ?? [])]
    .map((id) => api.state.people.get(id))
    .filter(
      (p): p is PersonState =>
        !!p &&
        p.alive &&
        ageOn(p, date) >= campaignParameter("appointmentAdulthoodAge") &&
        p.id !== appointer?.personId &&
        p.id !== playerId &&
        !holding.has(p.id) &&
        !seated.has(p.id) &&
        (!chosenId || p.id === chosenId) &&
        !workedToday(api.state as CoreState, p),
    );
  const relationships = (api.state as CoreState).relationships;
  // A department's search draws those who have done the work or studied for
  // it; only a town with none of them looks at every adult.
  const records = new Map(
    adults.map((p) => [p.id, postRecord(api, p, spec.key, date)]),
  );
  const shown = adults.filter((p) => hasRecord(records.get(p.id)!));
  const pool = shown.length ? shown : adults;
  // The whole town can supply a head: three residents of the wider population drawn for the post
  // (as for a cabinet), scored by the one rule; only the one named is admitted and filled in.
  const residents = drawn
    ? [0, 1, 2].flatMap((n) => {
        const record = drawnAdult(
          api,
          `town:${town}:${spec.key}:${date}:${n}`,
          CABINET_AGE,
        );
        const resident = record?.people[0];
        return record && resident ? [{ record, resident }] : [];
      })
    : [];
  return {
    drawnRecords: new Map(residents.map((r) => [r.resident.id, r.record])),
    appointer,
    appointerSide: appointerLean,
    weighing: appointerWeighing(
      api.state as CoreState,
      appointer?.personId ?? undefined,
    ),
    candidates: [
      ...pool.map((p) => ({
        id: p.id,
        lean: personLean(api.state.people, p, 0),
        qualification: appointmentQualification(p, records.get(p.id)!),
        qualificationRecords: records.get(p.id)!.recordIds,
        known:
          !!appointer?.personId &&
          relationships.has(pairKey(appointer.personId, p.id)),
        ...(appointer?.personId &&
        relationships.has(pairKey(appointer.personId, p.id))
          ? {
              knownRecordId: relationships.get(
                pairKey(appointer.personId, p.id),
              )!.id,
            }
          : {}),
      })),
      ...residents.map(({ resident }) => ({
        id: resident.id,
        lean: leanOf(api, resident.id, resident),
        qualification: appointmentQualification(resident, NO_POST_RECORD),
        known: false,
      })),
    ],
  };
}

/**
 * The people a town post could go to, best first by the appointing official's
 * own reasons, for the office panel to show before the player names one. Empty
 * where the person appoints no such post.
 */
export function headCandidates(
  api: CoreAPI,
  post: string,
): readonly NominationReasons[] {
  const spec = townPosts(api).find((s) => s.key === post);
  if (!spec) return [];
  const input = townPostInput(api, spec);
  if (!input.candidates.length) return [];
  return nominateAndConfirm({
    seatKey: `town:${spec.key}`,
    appointerSide: input.appointerSide,
    weighing: input.weighing,
    candidates: input.candidates,
    confirmingBody: null,
  }).reasons;
}

/**
 * Fill one town post: the appointer's choice among the town's adults (or the
 * player's own choice, when the player is the appointer), confirmed by the
 * council where the form asks it.
 */
function fillTownPost(
  api: CoreAPI,
  spec: PostSpec,
  chosenId?: string,
): AppointmentRow | null {
  const date = api.state.date;
  const town = lawChain(api).townPlaceId;
  const input = townPostInput(api, spec, chosenId, !chosenId);
  const appointer = input.appointer;
  if (!input.candidates.length) return null;
  const appointment = nominateAndConfirm({
    seatKey: `town:${spec.key}`,
    appointerSide: input.appointerSide,
    weighing: input.weighing,
    candidates: input.candidates,
    confirmingBody: /council/.test(spec.confirmedBy)
      ? { name: "council", sides: councilSides(api) }
      : null,
    tolerance: campaignParameter("confirmationTolerance"),
  });
  if (!appointment.nomineeId) return null;
  // A head drawn from the wider population is admitted and filled in only now that they are named.
  const drawnRecord = input.drawnRecords.get(appointment.nomineeId);
  let holderId = appointment.nomineeId;
  if (drawnRecord) {
    admitCountedHousehold(api.state as CoreState, drawnRecord);
    holderId = personOrFillIn(api.state as CoreState, holderId)?.id ?? holderId;
  }
  const row: AppointmentRow = {
    id: `appointment:town:${spec.key}`,
    government: town,
    post: spec.key,
    title: spec.title,
    holderId,
    identity: null,
    appointedBy: appointer ? memberKey(appointer) : spec.appointedBy,
    confirmation: appointment.confirmation,
    reasons: appointment.reasons.slice(0, 5),
    since: date,
  };
  table(api, "appointments").put(row as unknown as ModuleRow);
  api.emit({
    id: `appointed:${row.id}:${date}`,
    date,
    kind: "official-appointed",
    // The one who chose is on the record too, so a scene can bring them the
    // person next in line (named only when they are a full person).
    personIds: [
      row.holderId,
      ...(appointer?.personId &&
      appointer.personId !== row.holderId &&
      api.state.people.has(appointer.personId as PersonId)
        ? [appointer.personId as PersonId]
        : []),
    ],
    placeId: town,
    source: { tag: "SOURCED", citation: `Appointment ${row.id}`, asOf: date },
    publicRecord: true,
    news: true,
    facts: {
      post: spec.key,
      appointedBy: row.appointedBy,
      appointee: row.holderId,
      // The people the appointer weighed, best first (the appointment row keeps their reasons).
      ranked: appointment.reasons
        .slice(0, 5)
        .map((r) => r.candidateId)
        .join(" "),
    },
  });
  // On the town government's payroll at a department head's pay.
  const govs = api.state.modules.has(BUDGETS_MODULE_ID) ? governments(api) : [];
  const employer = (
    govs.find((g) => g.level === "city") ??
    govs.find((g) => g.level === "county")
  )?.organizationId;
  // Paid what the post's budget line can carry: a small town's heads share
  // its line, so its payroll fits its budget.
  const level =
    govs.find((g) => g.organizationId === employer)?.level ?? "city";
  const post = `town:${spec.key}`;
  const toFill = townPosts(api).filter(
    (other) =>
      lineForPost(level, `town:${other.key}`) === lineForPost(level, post) &&
      (other.key === spec.key ||
        !appointmentsIn(api, town).some((a) => a.post === other.key)),
  ).length;
  // A world with no treasury open has no payroll to hold the post on.
  if (employer)
    startPublicJob(api, {
      personId: row.holderId,
      employerId: employer,
      post,
      title: spec.title,
      hourlyMinor: campaignParameter("appointeeHourlyMinor"),
      maxDailyMinor: postPayCapDaily(api, employer, post, toFill),
      // A county that runs the place has no jobs of its own to follow: its heads follow the town's pay calendar.
      scheduleFromPlaceId: town,
      citation: `Appointment ${row.id}`,
    });
  return row;
}

function appointTownDepartments(api: CoreAPI): void {
  // An unincorporated place has no town government to staff.
  if (
    !townSeats(api).some(
      (s) =>
        [...BOARD_KINDS, "mayor", "county-executive"].includes(s.office.kind) &&
        s.holder,
    )
  )
    return;
  const playerId =
    snapshotExplicitControlV1(api.state).personId ??
    (api.state as CoreState).playerId;
  for (const spec of townPosts(api)) {
    // The player's own posts wait for their choice (`appoint`).
    if (townAppointer(api, spec.appointedBy)?.personId === playerId) continue;
    fillTownPost(api, spec);
  }
}

/**
 * The town posts the person appoints that nobody holds: the posts the town's
 * form of government gives their office that are unfilled, or whose head died
 * or moved away (the same test the executive's review uses).
 */
export function postsToFill(
  api: CoreAPI,
  personId: string,
): readonly { readonly key: string; readonly title: string }[] {
  const town = lawChain(api).townPlaceId;
  const held = new Set(
    appointmentsIn(api, town)
      .filter((row) => {
        const holder = api.state.people.get(row.holderId);
        return holder?.alive && holder.placeId === town;
      })
      .map((row) => row.post),
  );
  return townPosts(api)
    .filter(
      (spec) =>
        !held.has(spec.key) &&
        townAppointer(api, spec.appointedBy)?.personId === personId,
    )
    .map((spec) => ({ key: spec.key, title: spec.title }));
}

/**
 * The appointing official names someone to a town post: the person they
 * pick, or, when they pick no one, the candidate their own reasons rank first
 * (alignment, qualification, acquaintance), confirmed by the council where
 * the form asks it.
 */
export function appoint(
  api: CoreAPI,
  input: { readonly post: string; readonly personId?: string },
): AppointmentRow | null {
  const spec = townPosts(api).find((s) => s.key === input.post);
  if (!spec) throw new Error(`No post ${input.post} in this town's government`);
  return fillTownPost(api, spec, input.personId);
}

/**
 * A state cabinet member the governor picked, seated as a person with a job
 * on the state's payroll (the same pay rule as a town's department heads, cut
 * to the room on the state budget line the post draws on). The member the
 * post had before leaves the payroll. A world with no state treasury open has
 * no payroll to hold a post on, so the post is held unpaid there.
 */
/** A cabinet candidate: drawn from the played town's people, or from the state's elsewhere. */
type CabinetCandidate =
  | {
      readonly lives: "town";
      readonly record: NonNullable<ReturnType<typeof drawnAdult>>;
      readonly resident: Readonly<Pick<PersonState, "id" | "traits">>;
    }
  | {
      readonly lives: "elsewhere";
      readonly home: CorePlace | undefined;
      readonly identity: ReturnType<typeof drawOfficialIdentity>;
      readonly resident: Readonly<Pick<PersonState, "id" | "traits">>;
    };

/**
 * One person of the state drawn for a cabinet post, living where the state's
 * people put them: the played town is home when it is the state's seat, or at
 * its share of the state's people (the country tier's count), and the person is drawn from the town's own
 * counted people as a town head is; otherwise they live in another town of the
 * state, drawn by who lives there (`drawStateHome`), with a name and birth
 * date as the officials engine draws an official's and the opening's one
 * temperament. Seeded, so the same key gives the same person.
 */
function cabinetCandidate(
  api: CoreAPI,
  worldSeed: string,
  key: string,
): CabinetCandidate | null {
  const core = api.state as CoreState;
  const { stateKey, townPlaceId } = lawChain(api);
  const town = corePlaceByJurisdictionId(townPlaceId as never);
  const statePeople = api.state.modules.has(MACRO_MODULE_ID)
    ? (countryStateParts(api, stateKey)?.total.people ?? 0)
    : 0;
  const townPeople = town?.sourceGeoid
    ? (placeReferencePopulation(town.sourceGeoid, core.seed)?.value ?? 0)
    : 0;
  // A cabinet post works at the state's seat: when the played town is that
  // seat, the appointee lives there.
  const seat = coreSeatOfGovernmentPlace(stateKey)?.place;
  const home =
    town && seat?.key === town.key
      ? town
      : drawStateHome(
          core.seed,
          `cabinet:${key}`,
          stateKey,
          town ? { place: town, people: townPeople, statePeople } : undefined,
        );
  if (town && home?.key === town.key) {
    const record = drawnAdult(api, `cabinet:${key}`, CABINET_AGE);
    const resident = record?.people[0];
    return record && resident ? { lives: "town", record, resident } : null;
  }
  const identity = drawOfficialIdentity({
    worldSeed,
    seatKey: `cabinet:${key}`,
    stateUsps: stateKey.slice(3),
    role: "executive-officeholder-at-opening",
    referenceDate: api.state.date,
  });
  const id = `person:cabinet:${key}`;
  return {
    lives: "elsewhere",
    home,
    identity,
    resident: { id, traits: temperamentOf(core, id, identity) },
  };
}

/** The work a person who lives in `homeKey` holds, as a fill-in's `work`. */
function withWork(seed: string, homeKey: string | undefined, key: string) {
  const work = homeKey ? workFromHome(seed, homeKey, key) : undefined;
  return work ? { work } : {};
}

/**
 * A drawn cabinet candidate made a full person: one of the
 * town's own is admitted from the wider population and filled in; someone from
 * elsewhere in the state is filled in where they live, never moved into the
 * played town. The same seeded identity the office panel named, so the person
 * asked is the person seated. Returns their id.
 */
function fillInCabinetPerson(
  api: CoreAPI,
  chosen: CabinetCandidate,
  state: string,
  citation: string,
): string {
  const core = api.state as CoreState;
  if (chosen.lives === "town") {
    admitCountedHousehold(core, chosen.record);
    const named = chosen.record.people[0]!.id;
    return personOrFillIn(core, named)?.id ?? named;
  }
  const { identity } = chosen;
  const personId = chosen.resident.id;
  if (!core.people.has(personId as PersonId))
    fillInIdentity(core, {
      id: personId as PersonId,
      givenName: identity.givenName,
      familyName: identity.familyName,
      birthDate: makeIsoDate(identity.birthDate),
      placeId: (chosen.home?.context.jurisdiction.id ?? state) as never,
      gender: identity.gender,
      traits: chosen.resident.traits,
      // The work they hold where they live, from that town's counts, as
      // every person filled in far from the played town holds theirs.
      ...withWork(core.seed, chosen.home?.key, personId),
      source: {
        tag: "ESTIMATED",
        asOf: makeIsoDate(api.state.date),
        citation,
        estimatedFrom:
          "world seed: a home in the state drawn by who lives in each town, a name and birth date as an official's (officials-identity)",
      },
    });
  return personId;
}

function seatCabinetPerson(
  api: CoreAPI,
  input: {
    readonly state: string;
    readonly spec: PostSpec;
    readonly chosen: CabinetCandidate;
    readonly appointmentId: string;
    readonly posts: readonly PostSpec[];
  },
): string {
  const core = api.state as CoreState;
  const { spec, chosen } = input;
  const prior = table(api, "appointments").get(
    input.appointmentId,
  ) as unknown as AppointmentRow | undefined;
  const priorJob = prior ? core.people.get(prior.holderId)?.jobId : undefined;
  if (priorJob) endReplacedPostJob(api, priorJob, input.appointmentId);
  const personId = fillInCabinetPerson(
    api,
    chosen,
    input.state,
    `Appointment ${input.appointmentId}`,
  );
  const employer = (
    api.state.modules.has(BUDGETS_MODULE_ID) ? governments(api) : []
  ).find((g) => g.level === "state")?.organizationId;
  const post = `state:${spec.key}`;
  const maxDailyMinor = employer
    ? postPayCapDaily(
        api,
        employer,
        post,
        input.posts.filter(
          (other) =>
            lineForPost("state", `state:${other.key}`) ===
            lineForPost("state", post),
        ).length,
      )
    : undefined;
  if (employer) {
    startPublicJob(api, {
      personId,
      employerId: employer,
      post,
      title: spec.title,
      hourlyMinor: campaignParameter("appointeeHourlyMinor"),
      maxDailyMinor,
      scheduleFromPlaceId: lawChain(api).townPlaceId,
      citation: `Appointment ${input.appointmentId}`,
    });
  }
  return personId;
}

/**
 * The state's cabinet: for each post the governor fills, three residents of the wider
 * population drawn for it, each leaning by their own record; the governor chooses among them,
 * confirmed by the state senate where required, and only the one named is admitted.
 */
/** The ages a cabinet secretary is drawn from, as the governor's picks run (working adults near the top of a career). */
const CABINET_AGE: readonly [number, number] = [40, 66];

function appointStateCabinet(
  api: CoreAPI,
  worldSeed: string,
  round = "",
  onlyPosts?: ReadonlySet<string>,
): void {
  const chain = lawChain(api);
  const state = chain.stateKey;
  const posts = RESEARCH.places[state]?.cabinet?.positions ?? [];
  const governor = townSeats(api).find(
    (s) => s.office.kind === "governor" && s.holder,
  )?.holder;
  if (!governor) return;
  const side = partySide(governor.party);
  const senate = (
    api
      .moduleState(OFFICES_MODULE_ID)
      .table("offices")
      .query("byJurisdiction", [state]) as unknown as {
      id: string;
      kind: string;
    }[]
  ).find(
    (o) =>
      o.kind === "legislature-upper" || o.kind === "legislature-unicameral",
  );
  const senateSides = senate
    ? members(api, senate.id).map((t) => partySide(t.party))
    : [];
  const date = api.state.date;
  for (const spec of posts) {
    if (!/governor/.test(spec.appointedBy)) continue;
    if (onlyPosts && !onlyPosts.has(spec.key)) continue;
    // Three people of the state drawn for the post, each living where the
    // state's people put them (`cabinetCandidate`); each leans by their own
    // record, by the one rule a full person leans by (`leanOf`), and only the
    // one named is admitted or filled in.
    const pool = [0, 1, 2].flatMap((n) => {
      const candidate = cabinetCandidate(
        api,
        worldSeed,
        `${state}:${spec.key}:${round}${n}`,
      );
      return candidate ? [{ n, ...candidate }] : [];
    });
    if (!pool.length) continue;
    const appointment = nominateAndConfirm({
      seatKey: `cabinet:${state}:${spec.key}`,
      appointerSide: side,
      // The governor's own traits weigh loyalty against merit, as they do for
      // a post they fill by name (appointStatePost) and a town head's appointer.
      weighing: appointerWeighing(api.state as CoreState, memberKey(governor)),
      candidates: pool.map(({ n, resident }) => ({
        id: `official:cabinet:${state}:${spec.key}:${round}${n}`,
        lean: leanOf(api, resident.id, resident),
        qualification:
          campaignParameter("cabinetQualificationBase") +
          campaignParameter("cabinetQualificationStep") * (pool.length - 1 - n),
        known: n === 0,
      })),
      confirmingBody: /senate|legislature/.test(spec.confirmedBy)
        ? { name: "state senate", sides: senateSides }
        : null,
      tolerance: campaignParameter("confirmationTolerance"),
    });
    if (!appointment.nomineeId) continue;
    const chosen = pool.find(
      (c) => c.n === Number(appointment.nomineeId.split(":").pop()),
    )!;
    const id = `appointment:${state}:${spec.key}`;
    // The cabinet member the governor picked is a full person on the state's
    // payroll, as the election agency's head is; the one they replace leaves it.
    const holderId = seatCabinetPerson(api, {
      state,
      spec,
      chosen,
      appointmentId: id,
      posts: posts.filter((p) => /governor/.test(p.appointedBy)),
    });
    table(api, "appointments").put({
      id,
      government: state,
      post: spec.key,
      title: spec.title,
      holderId,
      identity: {
        givenName: api.state.people.get(holderId)!.givenName,
        familyName: api.state.people.get(holderId)!.familyName,
      },
      appointedBy: memberKey(governor),
      confirmation: appointment.confirmation,
      reasons: appointment.reasons,
      since: date,
    } as unknown as ModuleRow);
  }
}

/** The post that keeps the head of the state's election agency. */
export const ELECTION_CHIEF_POST = "chief-election-official";

/**
 * The state's election agency has a head: a full person on the state's
 * payroll, who sits at the counter of the filing scene for state and federal
 * races (pool item gov-state-election-office-holder). The filing data names
 * the agency but not its head, so the person is drawn from the world's seed as
 * any invented official is, and the row says so. Seated once, and again when
 * the head dies or leaves the state.
 */
function seatElectionChief(api: CoreAPI, worldSeed: string): void {
  const state = lawChain(api).stateKey;
  const agency = filingRequirements(state, "statewideExecutive").filedWith;
  seatDrawnOfficer(api, worldSeed, {
    government: state,
    post: ELECTION_CHIEF_POST,
    title: agency,
    seatKey: `election-chief:${state}`,
    personKey: `election-chief:${state}`,
    placeId: state,
    payroll: "state",
    citation: `The head of ${agency}, who takes filings for state and federal races in ${state}.`,
    estimatedFrom:
      "The filing data names the agency, not its head; the person is drawn from the world's seed like any invented official.",
  });
}

/** The post that keeps the person at a local filing counter the records name no one for, by family. */
export const LOCAL_FILING_OFFICER_POST = "local-filing-officer";

/**
 * The person at the town's or the county's filing counter where the records
 * name no clerk (gov-filing-counter-clerk-at-county-board): a county board of
 * elections whose commissioner is no one on record (North Amityville, New
 * York), or a town clerk's office with no clerk seated or appointed. Drawn from
 * the world's seed like the state's election chief, marked as an estimate, and
 * on the county's or the town's payroll; a clerk the records do name always
 * comes first (`localClerkFor`).
 */
function seatLocalFilingOfficers(api: CoreAPI, worldSeed: string): void {
  const { stateKey, townPlaceId } = lawChain(api);
  for (const family of ["municipalOffice", "countyOffice"] as const) {
    const office = filingRequirements(stateKey, family).filedWith;
    if (
      !describesByRule(office) &&
      localClerkFor(api, family, { drawn: false })
    )
      continue;
    // The data names who stands at the counter where it knows ("County board
    // of elections (counter: election commissioner)"): that is their title.
    const counter = /\(counter: ([^)]+)\)/.exec(office)?.[1]?.trim();
    // An office the data gives as a rule is the body the rule points to for
    // this town, or the office without a county where the game cannot know it.
    const body = describesByRule(office)
      ? ruleOfficeBody(office, family, lawChain(api).placeKey)
      : null;
    seatDrawnOfficer(api, worldSeed, {
      government: townPlaceId,
      post: `${LOCAL_FILING_OFFICER_POST}:${family}`,
      title: counter ?? body ?? office,
      seatKey: `filing-officer:${townPlaceId}:${family}`,
      personKey: `filing-officer:${townPlaceId}:${family}`,
      placeId: townPlaceId,
      payroll:
        family === "countyOffice" || /county/i.test(office) ? "county" : "city",
      citation: `The person at the counter of ${office}, who takes filings for the town's ${family === "countyOffice" ? "county" : "local"} races.`,
      estimatedFrom:
        "The filing data names the office, and the place's records name no clerk or staff for it; the person is drawn from the world's seed like any invented official.",
    });
  }
}

/** The post that keeps the person at a state or federal counter whose office the data gives as a rule, by family. */
export const RULE_FILING_OFFICER_POST = "rule-filing-officer";

/**
 * The person at a state or federal counter whose office the filing data gives
 * as a rule ("Board of elections of the most populous county in the district"):
 * drawn for the body the rule points to for the player's town, on that county's
 * payroll where it is the player's own county. Where the game cannot know the
 * county (a state legislative district, a county split between districts) the
 * body is the office without one, and its person is on no county's payroll.
 */
function seatRuleFilingOfficers(api: CoreAPI, worldSeed: string): void {
  const { stateKey, placeKey, countyGeoids } = lawChain(api);
  for (const family of ["usHouse", "stateLegislative"] as const) {
    const office = filingRequirements(stateKey, family).filedWith;
    if (!describesByRule(office)) continue;
    const county = ruleOfficeCounty(office, family, placeKey);
    const body = ruleOfficeBody(office, family, placeKey);
    seatDrawnOfficer(api, worldSeed, {
      government: stateKey,
      post: `${RULE_FILING_OFFICER_POST}:${county ?? "unknown"}`,
      title: body,
      seatKey: `rule-filing-officer:${stateKey}:${body}`,
      personKey: `rule-filing-officer:${stateKey}:${body}`,
      placeId: stateKey,
      payroll: county && countyGeoids.includes(county) ? "county" : null,
      citation: `The person at the counter of the ${body}, which takes filings for the races whose office the filing data gives as a rule in ${stateKey}.`,
      estimatedFrom:
        "The filing data gives the office as a rule; the rule is resolved to the body it points to where the game can know it, and the person is drawn from the world's seed like any invented official.",
    });
  }
}

/**
 * An official the records name only by office: drawn from the world's seed,
 * filled in as a full person marked as an estimate, kept as an agency head of
 * their government and put on its payroll. Seated once, and again when the
 * holder dies.
 */
function seatDrawnOfficer(
  api: CoreAPI,
  worldSeed: string,
  spec: {
    readonly government: string;
    readonly post: string;
    readonly title: string;
    readonly seatKey: string;
    readonly personKey: string;
    readonly placeId: string;
    readonly payroll: "state" | "county" | "city" | null;
    readonly citation: string;
    readonly estimatedFrom: string;
  },
): void {
  const core = api.state as CoreState;
  const state = lawChain(api).stateKey;
  const id = `appointment:${spec.government}:${spec.post}`;
  const held = table(api, "agencyHeads").get(id) as unknown as
    AppointmentRow | undefined;
  if (held && core.people.get(held.holderId)?.alive) return;
  const date = api.state.date;
  const round = held ? `${date}:` : "";
  const identity = drawOfficialIdentity({
    worldSeed,
    seatKey: `${spec.seatKey}:${round}`,
    stateUsps: state.slice(3),
    role: "executive-officeholder-at-opening",
    referenceDate: date,
  });
  const personId = `person:${spec.personKey}${round ? `:${date}` : ""}`;
  fillInIdentity(core, {
    id: personId,
    givenName: identity.givenName,
    familyName: identity.familyName,
    birthDate: identity.birthDate,
    placeId: spec.placeId,
    gender: identity.gender,
    source: {
      tag: "ESTIMATED",
      asOf: date,
      citation: spec.citation,
      estimatedFrom: spec.estimatedFrom,
    },
  });
  table(api, "agencyHeads").put({
    id,
    government: spec.government,
    post: spec.post,
    title: spec.title,
    holderId: personId,
    identity: {
      givenName: identity.givenName,
      familyName: identity.familyName,
    },
    appointedBy: spec.government,
    confirmation: null,
    reasons: [],
    since: date,
  } as unknown as ModuleRow);
  // On their government's payroll, as the town's heads are on the town's.
  const govs = api.state.modules.has(BUDGETS_MODULE_ID) ? governments(api) : [];
  const employer = spec.payroll
    ? govs.find((g) => g.level === spec.payroll)?.organizationId
    : undefined;
  const post = `${spec.payroll}:${spec.post}`;
  // A world with no treasury open has no payroll to hold the post on.
  if (employer)
    startPublicJob(api, {
      personId,
      employerId: employer,
      post,
      title: spec.title,
      hourlyMinor: campaignParameter("appointeeHourlyMinor"),
      maxDailyMinor: postPayCapDaily(api, employer, post, 1),
      scheduleFromPlaceId: lawChain(api).townPlaceId,
      citation: `Appointment ${id}`,
    });
}

/** The heads of a government's agencies that are not the governor's cabinet (the election agency's), by id. */
export function agencyHeadsIn(
  api: CoreAPI,
  government: string,
): readonly AppointmentRow[] {
  if (!api.state.modules.has(EXECUTIVE_MODULE_ID)) return [];
  return (
    table(api, "agencyHeads").query("byGovernment", [
      government,
    ]) as unknown as AppointmentRow[]
  )
    .slice()
    .sort((a, b) => a.id.localeCompare(b.id));
}

export function appointmentsIn(
  api: CoreAPI,
  government: string,
): readonly AppointmentRow[] {
  if (!api.state.modules.has(EXECUTIVE_MODULE_ID)) return [];
  // A government is named by its id, its jurisdiction or the key the post was filed under.
  const named = api.state.modules.has(BUDGETS_MODULE_ID)
    ? governmentOfJurisdiction(api, government)
    : undefined;
  const rows = new Map<string, AppointmentRow>();
  for (const key of new Set([government, named?.id, named?.jurisdictionId]))
    if (key)
      for (const row of table(api, "appointments").query("byGovernment", [
        key,
      ]) as unknown as AppointmentRow[])
        rows.set(row.id, row);
  return [...rows.values()].sort((a, b) => a.id.localeCompare(b.id));
}

/**
 * The state's people the governor is offered for an open post, beside the
 * full people the world already holds: three drawn as the opening draws a
 * cabinet (`cabinetCandidate`), keyed by the post and the vacancy (the
 * appointment it left, or none), so the list stays the same while the post
 * stands open. Nobody is created by reading the list; only the one appointed
 * is admitted or filled in (`seatCabinetPerson`).
 */
/**
 * A drawn cabinet candidate, drawn once a day: the office panel, the desk and
 * the asks each read the same post's list on one screen, and the draw reads
 * the state's counts, which move only as days pass.
 */
const drawnToday = new WeakMap<
  object,
  { date: string; byKey: Map<string, CabinetCandidate | null> }
>();
function drawnForDay(api: CoreAPI, key: string): CabinetCandidate | null {
  const date = String(api.state.date);
  let kept = drawnToday.get(api.state);
  if (!kept || kept.date !== date) {
    kept = { date, byKey: new Map() };
    drawnToday.set(api.state, kept);
  }
  if (!kept.byKey.has(key))
    kept.byKey.set(key, cabinetCandidate(api, api.state.seed, key));
  return kept.byKey.get(key)!;
}

/** How many of the state's people are drawn for an open post, as the opening draws three. */
const STATE_DRAWN = 3;

function stateDrawnCandidates(
  api: CoreAPI,
  spec: { readonly key: string },
): ReadonlyMap<
  string,
  CabinetCandidate & { readonly name: string; readonly n: number }
> {
  const state = lawChain(api).stateKey;
  const prior = appointmentsIn(api, state).find((p) => p.post === spec.key);
  const vacancy = prior ? `${prior.holderId}:${prior.since}` : "unfilled";
  const drawn = new Map<
    string,
    CabinetCandidate & { readonly name: string; readonly n: number }
  >();
  for (let n = 0; n < STATE_DRAWN; n += 1) {
    const candidate = drawnForDay(api, `${state}:${spec.key}:${vacancy}:${n}`);
    if (!candidate || api.state.people.has(candidate.resident.id as PersonId))
      continue;
    const named =
      candidate.lives === "town"
        ? candidate.record.people[0]!
        : candidate.identity;
    drawn.set(candidate.resident.id, {
      ...candidate,
      name: `${named.givenName} ${named.familyName}`,
      n,
    });
  }
  return drawn;
}

/** The names of the drawn people a state post could go to, by candidate id, for the office panel (full people are named by their record). */
export function stateCandidateNames(
  api: CoreAPI,
  post: string,
): ReadonlyMap<string, string> {
  return new Map(
    [...stateDrawnCandidates(api, { key: post })].map(([id, c]) => [
      id,
      c.name,
    ]),
  );
}

/**
 * Fills in one drawn person the office panel offers for a state post, so a
 * governor can ask them to serve and they can answer as themselves (the
 * serve-asks engine's post seat). Once filled in, the person is one of the
 * world's own and `appointStatePost` seats them by the full-person path.
 * Returns their id, or null when `personId` is not one the post offers.
 */
export function fillInStateCandidate(
  api: CoreAPI,
  post: string,
  personId: string,
): string | null {
  if (api.state.people.has(personId as PersonId)) return personId;
  const chosen = stateDrawnCandidates(api, { key: post }).get(personId);
  if (!chosen) return null;
  return fillInCabinetPerson(
    api,
    chosen,
    lawChain(api).stateKey,
    `Asked to serve as ${post}`,
  );
}

/** Whether a place is in the state (the state itself, or a place within it). */
function livesInState(placeId: string, state: string): boolean {
  if (placeId === state) return true;
  const place = corePlaceByJurisdictionId(placeId as never);
  return (place?.stateJurisdictionKey ?? place?.key) === state;
}

/** The governor's candidates for a state post and the chamber that confirms them, as the engine weighs them. */
function stateNominationInput(
  api: CoreAPI,
  input: {
    readonly executiveId: string;
    readonly post: string;
    readonly personId?: string;
  },
  spec: { readonly key: string; readonly confirmedBy: string },
) {
  const state = lawChain(api).stateKey;
  const offices = api.moduleState(OFFICES_MODULE_ID);
  // Anyone who holds an appointed post now, in this state or any other
  // government (a federal cabinet officer), this post's own holder among them:
  // naming the person who holds it already is not filling it.
  const holding = new Set(
    (table(api, "appointments").rows() as unknown as AppointmentRow[]).map(
      (p) => p.holderId,
    ),
  );
  const pool = [...api.state.people.values()]
    .filter(
      (person) =>
        (!input.personId || person.id === input.personId) &&
        person.alive &&
        person.id !== input.executiveId &&
        ageOn(person, api.state.date) >=
          campaignParameter("appointmentAdulthoodAge") &&
        !holding.has(person.id) &&
        // The state's own people: someone who lives in another state, or
        // who serves now as a state or federal official, could not take it.
        livesInState(person.placeId, state) &&
        officialOf(api, person.id)?.ended !== null &&
        !(
          offices
            .table("terms")
            .query("byPerson", [person.id]) as unknown as TermRow[]
        ).some((t) => t.status === "serving") &&
        !workedToday(api.state as CoreState, person),
    )
    .sort((a, b) => a.id.localeCompare(b.id));
  // The state's people beyond those the world holds in full, drawn as the
  // opening draws a cabinet; each leans by their own record, by the one rule.
  const drawn = [...stateDrawnCandidates(api, spec)].filter(
    ([id]) => !input.personId || id === input.personId,
  );
  if (input.personId && !pool.length && !drawn.length)
    throw new Error(
      "The nominee must be a living adult who holds no other office.",
    );
  const senate = (
    offices.table("offices").query("byJurisdiction", [state]) as unknown as {
      id: string;
      kind: string;
      title: string;
    }[]
  ).find(
    (o) =>
      o.kind === "legislature-upper" || o.kind === "legislature-unicameral",
  );
  const confirmation = /senate|legislature/.test(spec.confirmedBy);
  if (confirmation && !senate)
    throw new Error("No confirming chamber is recorded.");
  return {
    drawn: new Map(drawn),
    nomination: {
      seatKey: `cabinet:${state}:${spec.key}`,
      appointerSide: leanOf(api, input.executiveId),
      weighing: appointerWeighing(api.state as CoreState, input.executiveId),
      candidates: [
        ...pool.map((person) => {
          const record = postRecord(api, person, spec.key, api.state.date);
          return {
            id: person.id,
            lean: personLean(api.state.people, person, 0),
            qualification: appointmentQualification(person, record),
            qualificationRecords: record.recordIds,
            known: (api.state as CoreState).relationships.has(
              pairKey(input.executiveId, person.id),
            ),
          };
        }),
        // Someone of the state drawn for the post, weighed by the rule the
        // opening weighs its drawn cabinet by (the state's own pick of people
        // fit for the post), until they are filled in and their record is read.
        ...drawn.map(([id, { resident, n }]) => ({
          id,
          lean: leanOf(api, id, resident),
          qualification:
            campaignParameter("cabinetQualificationBase") +
            campaignParameter("cabinetQualificationStep") *
              (STATE_DRAWN - 1 - n),
          known: false,
        })),
      ],
      confirmingBody: confirmation
        ? {
            name: senate!.title,
            sides: members(api, senate!.id).map((t) => partySide(t.party)),
          }
        : null,
      tolerance: campaignParameter("confirmationTolerance"),
    },
  };
}

/** The state posts the sitting governor appoints that stand open. */
export function statePostsToFill(
  api: CoreAPI,
  personId: string,
): readonly { readonly key: string; readonly title: string }[] {
  const state = lawChain(api).stateKey;
  const governor = townSeats(api).find(
    (s) => s.office.kind === "governor",
  )?.holder;
  if (!governor || memberKey(governor) !== personId) return [];
  // A post stands open when no one holds it or its holder died.
  const held = new Set(
    appointmentsIn(api, state)
      .filter((row) => api.state.people.get(row.holderId)?.alive)
      .map((row) => row.post),
  );
  return (RESEARCH.places[state]?.cabinet?.positions ?? [])
    .filter((p) => /governor/.test(p.appointedBy) && !held.has(p.key))
    .map((p) => ({ key: p.key, title: p.title }));
}

/**
 * Whether a post the player appoints still goes to a confirming body: a town
 * post to the council where its form says so, a state post to the chamber
 * where the state's law says so.
 */
export function postConfirmed(
  api: CoreAPI,
  level: "town" | "state",
  post: string,
): boolean {
  if (level === "town")
    return /council/.test(
      townPosts(api).find((s) => s.key === post)?.confirmedBy ?? "",
    );
  return /senate|legislature/.test(
    RESEARCH.places[lawChain(api).stateKey]?.cabinet?.positions?.find(
      (p) => p.key === post,
    )?.confirmedBy ?? "",
  );
}

/** The people a state post could go to, best first by the governor's own reasons. */
export function stateCandidates(
  api: CoreAPI,
  executiveId: string,
  post: string,
): readonly NominationReasons[] {
  const spec = RESEARCH.places[
    lawChain(api).stateKey
  ]?.cabinet?.positions?.find(
    (p) => p.key === post && /governor/.test(p.appointedBy),
  );
  if (!spec) return [];
  const input = stateNominationInput(
    api,
    { executiveId, post },
    spec,
  ).nomination;
  if (!input.candidates.length) return [];
  return nominateAndConfirm({ ...input, confirmingBody: null }).reasons;
}

/** A governor chooses a named person for a post the place gives them power to fill. */
export function appointStatePost(
  api: CoreAPI,
  input: {
    readonly executiveId: string;
    readonly post: string;
    readonly personId?: string;
  },
): AppointmentRow | null {
  const state = lawChain(api).stateKey;
  const governor = townSeats(api).find(
    (s) => s.office.kind === "governor",
  )?.holder;
  if (!governor || memberKey(governor) !== input.executiveId)
    throw new Error("Only the sitting governor can appoint a state post.");
  const spec = RESEARCH.places[state]?.cabinet?.positions?.find(
    (p) => p.key === input.post && /governor/.test(p.appointedBy),
  );
  if (!spec) throw new Error("This post is not appointed by the governor.");
  const { drawn, nomination } = stateNominationInput(api, input, spec);
  const appointment = nominateAndConfirm(nomination);
  const nominationId = `nomination:${state}:${spec.key}:${input.personId ?? "own-choice"}:${api.state.date}`;
  table(api, "nominations").put({
    id: nominationId,
    executiveId: input.executiveId,
    personId: appointment.nomineeId,
    post: spec.key,
    date: api.state.date,
    confirmation: appointment.confirmation,
    reasons: appointment.reasons,
    appointed: false,
  } as unknown as ModuleRow);
  if (!appointment.nomineeId) return null;
  const gov = governments(api).find((g) => g.id === state);
  if (!gov) throw new Error("No state treasury is recorded.");
  // Someone drawn from the state's people is filled in where they live and
  // put on the state payroll by the opening's own seating step.
  const chosen = drawn.get(appointment.nomineeId);
  const appointmentId = `appointment:${state}:${spec.key}`;
  const seatedId = chosen
    ? seatCabinetPerson(api, {
        state,
        spec,
        chosen,
        appointmentId,
        posts: (RESEARCH.places[state]?.cabinet?.positions ?? []).filter((p) =>
          /governor/.test(p.appointedBy),
        ),
      })
    : undefined;
  const person = api.state.people.get(seatedId ?? appointment.nomineeId)!;
  const prior = appointmentsIn(api, state).find((p) => p.post === spec.key);
  const priorPerson = prior ? api.state.people.get(prior.holderId) : undefined;
  const priorJob = priorPerson?.jobId
    ? (api.state as CoreState).jobs.get(priorPerson.jobId)
    : undefined;
  const row: AppointmentRow = {
    id: appointmentId,
    government: state,
    post: spec.key,
    title: spec.title,
    holderId: person.id,
    identity: { givenName: person.givenName, familyName: person.familyName },
    appointedBy: input.executiveId,
    confirmation: appointment.confirmation,
    reasons: appointment.reasons,
    since: api.state.date,
  };
  // The seating step has already put a drawn appointee on the payroll and
  // ended the job of the one they replace.
  const jobId = seatedId
    ? person.jobId
    : startPublicJob(api, {
        personId: person.id,
        employerId: gov.organizationId,
        post: `state:${spec.key}`,
        title: spec.title,
        hourlyMinor: campaignParameter("appointeeHourlyMinor"),
        citation: `Appointment ${row.id}`,
      });
  if (!jobId) return null;
  if (!seatedId && priorJob?.organizationId === gov.organizationId)
    endReplacedPostJob(
      api,
      priorJob.id,
      `appointment-replaced:${state}:${spec.key}`,
    );
  table(api, "nominations").put({
    ...table(api, "nominations").get(nominationId)!,
    appointed: true,
    jobId,
  } as unknown as ModuleRow);
  table(api, "appointments").put(row as unknown as ModuleRow);
  api.emit({
    id: `appointed:${row.id}:${api.state.date}`,
    date: api.state.date,
    kind: "official-appointed",
    personIds: [person.id, input.executiveId],
    placeId: lawChain(api).townPlaceId,
    source: {
      tag: "SOURCED",
      citation: `Appointment ${row.id}`,
      asOf: api.state.date,
    },
    publicRecord: true,
    news: true,
    facts: {
      post: spec.key,
      appointedBy: input.executiveId,
      appointee: person.id,
    },
  });
  return row;
}

/** The orders this executive may issue that an engine can carry. */
export function orderableBy(api: CoreAPI): readonly string[] {
  const state = lawChain(api).stateKey;
  const raw = RESEARCH.places[state]?.canOrder ?? [];
  const keys = Array.isArray(raw) ? raw.map((r) => r.key) : Object.keys(raw);
  return keys
    .filter(
      (k) =>
        k in ORDERABLE && policyAuthority(api, ORDERABLE[k]!, "state").allowed,
    )
    .sort();
}

/**
 * Issue an executive order (the governor, from the state's own powers): a
 * law row in force from tomorrow that reaches people like a statute, and
 * that the next executive can revoke (`revoke: true`).
 */
export function issueOrder(
  api: CoreAPI,
  input: {
    readonly executiveId: string;
    readonly order: string;
    readonly revoke?: boolean;
  },
): { readonly lawId: string } {
  if (!orderableBy(api).includes(input.order))
    throw new Error(`This office can't order ${input.order} here.`);
  const state = lawChain(api).stateKey;
  const authority = policyAuthority(api, ORDERABLE[input.order]!, "state");
  const tomorrow = new Date(
    Date.parse(`${api.state.date}T00:00:00Z`) + 86_400_000,
  )
    .toISOString()
    .slice(0, 10);
  const measureId = `order:${state}:${input.order}:${api.state.date}`;
  // stopgapId: SG-GOV-executive-powers-research
  api.stopgap("SG-GOV-executive-powers-research");
  const row = enactLaw(api, {
    jurisdiction: state,
    level: "state",
    series: ORDERABLE[input.order]!,
    value: input.revoke ? 0 : 1,
    effectiveDate: tomorrow,
    measureId,
    citation: `Executive order ${measureId} by ${input.executiveId}`,
    terms: { executiveOrder: true, issuedBy: input.executiveId, authority },
  });
  table(api, "orders").put({
    id: measureId,
    executiveId: input.executiveId,
    order: input.order,
    revoke: input.revoke ?? false,
    lawId: row.id,
    authority,
    date: api.state.date,
  } as unknown as ModuleRow);
  return { lawId: row.id };
}

interface FederalOrder {
  readonly key: string;
  readonly series: string;
  readonly analog: string;
  readonly authority: { readonly basis: string; readonly source: string };
}
const FEDERAL_ORDERS = (
  federalOrderData as unknown as {
    orders: FederalOrder[];
  }
).orders;

/** The person who holds the president's seat today, if the seat is held. */
export function sittingPresidentId(api: CoreAPI): string | null {
  return (
    (
      api
        .moduleState(OFFICES_MODULE_ID)
        .table("terms")
        .query("bySeatStatus", ["seat:US:president", "serving"]) as unknown as {
        personId: string;
      }[]
    )[0]?.personId ?? null
  );
}

/** The federal orders a President may issue that an engine reads (the keys). */
export function federalOrderable(): readonly string[] {
  return FEDERAL_ORDERS.map((o) => o.key).sort();
}

/**
 * Issue a federal order or rule (the President, through the same engine as a
 * governor's): a federal law row in force from tomorrow, reaching the engines
 * that read the series like a statute, which the next President can reverse
 * (`revoke: true`).
 */
export function issueFederalOrder(
  api: CoreAPI,
  input: {
    readonly executiveId: string;
    readonly order: string;
    readonly revoke?: boolean;
  },
): { readonly lawId: string } {
  const spec = FEDERAL_ORDERS.find((o) => o.key === input.order);
  if (!spec) throw new Error(`The President can't order ${input.order}.`);
  // Only the person who holds the president's seat issues or revokes a federal order.
  if (input.executiveId !== sittingPresidentId(api))
    throw new Error("Only the sitting President issues a federal order.");
  const tomorrow = new Date(
    Date.parse(`${api.state.date}T00:00:00Z`) + 86_400_000,
  )
    .toISOString()
    .slice(0, 10);
  const measureId = `order:US:${input.order}:${api.state.date}`;
  // stopgapId: SG-NATION-federal-axis-proxy
  api.stopgap("SG-NATION-federal-axis-proxy");
  const row = enactLaw(api, {
    jurisdiction: "US",
    level: "federal",
    series: spec.series,
    value: input.revoke ? 0 : 1,
    effectiveDate: tomorrow,
    measureId,
    citation: `Presidential order ${measureId} by ${input.executiveId}`,
    terms: {
      executiveOrder: true,
      issuedBy: input.executiveId,
      authority: spec.authority.basis,
    },
  });
  table(api, "orders").put({
    id: measureId,
    executiveId: input.executiveId,
    order: input.order,
    revoke: input.revoke ?? false,
    lawId: row.id,
    authority: spec.authority.basis,
    date: api.state.date,
  } as unknown as ModuleRow);
  return { lawId: row.id };
}

/** One weighing of a federal order by the President, kept as the record of why they acted or did not. */
export interface OrderDecision {
  readonly id: string;
  readonly executiveId: string;
  readonly order: string;
  readonly date: string;
  /** Their lean, -1 to 1, and their view of the order's nearest recorded question, -1 to 1. */
  readonly lean: number;
  readonly view: number;
  /** The law in force on the series today (1 yes, 0 no). */
  readonly lawNow: number;
  /** What the order would score for and against keeping things as they are, from their view. */
  readonly scoreFor: number;
  readonly scoreAgainst: number;
  readonly act: "issue" | "revoke" | "keep";
  readonly analog: string;
}

/**
 * What the sitting President does about each federal order, from their own
 * view of it and the law now: they issue it where they want it and it is not
 * in force, revoke it where they oppose it and it is, and otherwise keep
 * things as they are. The weighing is kept for each order (the latest).
 */
export function presidentialOrderDecisions(
  api: CoreAPI,
  executiveId: string,
): readonly OrderDecision[] {
  const lean = leanOf(api, executiveId);
  return FEDERAL_ORDERS.map((spec) => {
    const view = viewOn(api, executiveId, spec.analog, lean);
    const lawNow = lawInForce(api, spec.series).value === 1 ? 1 : 0;
    const act: OrderDecision["act"] =
      view > 0 && lawNow !== 1
        ? "issue"
        : view < 0 && lawNow === 1
          ? "revoke"
          : "keep";
    const decision: OrderDecision = {
      id: `order-decision:${executiveId}:${spec.key}`,
      executiveId,
      order: spec.key,
      date: api.state.date,
      lean,
      view,
      lawNow,
      scoreFor: Math.max(0, view),
      scoreAgainst: Math.max(0, -view),
      act,
      analog: spec.analog,
    };
    table(api, "orderDecisions").put(decision as unknown as ModuleRow);
    return decision;
  });
}

/** The President's latest weighing of a federal order, if they have made one. */
export function orderDecisionOf(
  api: CoreAPI,
  executiveId: string,
  order: string,
): OrderDecision | null {
  return (
    (table(api, "orderDecisions").get(
      `order-decision:${executiveId}:${order}`,
    ) as unknown as OrderDecision | undefined) ?? null
  );
}

export interface EmergencyRow {
  readonly id: string;
  readonly executiveId: string;
  readonly state: string;
  /** The disaster record the declaration cites. */
  readonly hazardRecordId: string;
  /** The state's own power, as researched: its key and basis. */
  readonly basis: string;
  readonly confidence: string;
  readonly governmentId: string;
  readonly line: string;
  readonly deltaMinor: number;
  readonly date: string;
}

export interface EmergencyOfferRow {
  readonly id: string;
  readonly hazardRecordId: string;
  readonly executiveId: string;
  readonly date: string;
  readonly answered: boolean;
}

/** The disasters a governor may still declare an emergency for, as offers waiting on them. */
export function pendingEmergencyOffers(
  api: CoreAPI,
  executiveId: string,
): readonly EmergencyOfferRow[] {
  return (
    table(api, "emergencyOffers").rows() as unknown as EmergencyOfferRow[]
  )
    .filter((row) => row.executiveId === executiveId && !row.answered)
    .sort((a, b) => a.id.localeCompare(b.id));
}

/** The governor answers an offer: declare the emergency (the engine's own declaration), or let it pass. */
export function answerEmergencyOffer(
  api: CoreAPI,
  offerId: string,
  declare: boolean,
): { readonly emergencyId: string | null } {
  const offer = table(api, "emergencyOffers").get(offerId) as unknown as
    EmergencyOfferRow | undefined;
  if (!offer || offer.answered)
    throw new Error("No emergency offer is waiting.");
  table(api, "emergencyOffers").put({
    ...offer,
    answered: true,
  } as unknown as ModuleRow);
  if (!declare) return { emergencyId: null };
  return {
    emergencyId: declareEmergency(api, {
      executiveId: offer.executiveId,
      hazardRecordId: offer.hazardRecordId,
    }).id,
  };
}

/** Whether this state's governor may declare a state of emergency, and the researched basis. */
export function emergencyPower(
  api: CoreAPI,
): { readonly basis: string; readonly confidence: string } | null {
  const raw = RESEARCH.places[lawChain(api).stateKey]?.canOrder ?? [];
  const found = Array.isArray(raw)
    ? raw.find((r) => (r as { key: string }).key === "emergency-declaration")
    : undefined;
  return found
    ? {
        basis: (found as { basis?: string }).basis ?? "",
        confidence: (found as { confidence?: string }).confidence ?? "",
      }
    : null;
}

/**
 * The sitting governor declares a state of emergency for a disaster on the
 * record. The declaration cites the hazard record and the state's researched
 * power, and the state's budget takes on its share of the non-federal cost of
 * the public assistance FEMA obligated for the disaster: the budget line
 * moves by that much, as an amendment recorded with the declaration.
 */
export function declareEmergency(
  api: CoreAPI,
  input: { readonly executiveId: string; readonly hazardRecordId: string },
): EmergencyRow {
  const state = lawChain(api).stateKey;
  const governor = townSeats(api).find(
    (s) => s.office.kind === "governor",
  )?.holder;
  if (!governor || memberKey(governor) !== input.executiveId)
    throw new Error("Only the sitting governor can declare an emergency.");
  const power = emergencyPower(api);
  if (!power) throw new Error(`${state} gives its governor no such power.`);
  const hazard = (api.state as CoreState).durableLog.get(input.hazardRecordId);
  if (!hazard || hazard.kind !== "hazard.disaster")
    throw new Error("A declaration cites a disaster on the record.");
  const id = `emergency:${state}:${input.hazardRecordId}`;
  if (table(api, "emergencies").get(id))
    throw new Error("This disaster is already under a declaration.");
  const gov = governments(api).find((g) => g.level === "state");
  if (!gov) throw new Error("The state has no government on the books.");
  const aid = federalAidFor(api, Number(hazard.facts?.disasterNumber));
  const deltaMinor = Math.round(
    (aid *
      emergencyData.nonFederalShare.value *
      emergencyData.stateShareOfNonFederal.value) /
      (1 - emergencyData.nonFederalShare.value),
  );
  const line = emergencyData.budgetLine.value;
  if (deltaMinor > 0)
    amendBudget(api, {
      governmentId: gov.id,
      line,
      deltaMinor,
      measureId: id,
    });
  const row: EmergencyRow = {
    id,
    executiveId: input.executiveId,
    state,
    hazardRecordId: input.hazardRecordId,
    basis: power.basis,
    confidence: power.confidence,
    governmentId: gov.id,
    line,
    deltaMinor,
    date: api.state.date,
  };
  table(api, "emergencies").put(row as unknown as ModuleRow);
  api.emit({
    id: `emergency-declared:${id}`,
    date: api.state.date,
    kind: "emergency-declared",
    personIds: governor.personId ? [governor.personId] : [],
    placeId: lawChain(api).townPlaceId,
    source: {
      tag: "SOURCED",
      citation: `State emergency-management statute (${state}): ${power.basis}`,
      asOf: api.state.date,
    },
    publicRecord: true,
    news: true,
    facts: {
      hazardRecordId: input.hazardRecordId,
      disasterNumber: String(hazard.facts?.disasterNumber ?? ""),
      title: String(hazard.facts?.title ?? ""),
      governmentId: gov.id,
      line,
      deltaMinor: String(deltaMinor),
    },
  });
  return row;
}

function scheduleReview(api: CoreAPI, from: string): void {
  const date = addDays(
    makeIsoDate(from),
    campaignParameter("executiveReviewDays"),
  );
  api.moduleCalendar(EXECUTIVE_MODULE_ID).schedule({
    key: `desk-review:${date}`,
    date,
    kind: "desk-review",
    source: {
      tag: "ESTIMATED",
      citation: "The executive's regular review of posts and orders",
      asOf: api.state.date,
      estimatedFrom: "executiveReviewDays",
    },
    sourceRecordIds: [`desk-review:${lawChain(api).townPlaceId}`],
  });
}

/** Who holds a seat, across terms: the same person re-elected is the same holder. */
const holderOf = (term: TermRow) =>
  term.personId ??
  `${term.identity.givenName}|${term.identity.familyName}|${term.identity.birthDate}`;

/**
 * The executive's regular review: a department head who died or moved away
 * is replaced by the appointer; a newly seated governor names their own
 * cabinet; and the governor orders what their office may set alone where
 * the law in force is not what they want.
 */
function deskReview(api: CoreAPI, work: Readonly<ModuleCalendarWork>): void {
  if (work.kind !== "desk-review") return;
  scheduleReview(api, api.state.date);
  const town = lawChain(api).townPlaceId;
  const playerId =
    snapshotExplicitControlV1(api.state).personId ??
    (api.state as CoreState).playerId;
  const posts = townPosts(api);
  for (const row of appointmentsIn(api, town)) {
    const holder = api.state.people.get(row.holderId);
    if (holder?.alive && holder.placeId === town) continue;
    const spec = posts.find((p) => p.key === row.post);
    if (!spec) continue;
    // The player's own posts wait for their choice (`appoint`).
    if (townAppointer(api, spec.appointedBy)?.personId === playerId) continue;
    fillTownPost(api, spec);
  }
  const governor = townSeats(api).find(
    (s) => s.office.kind === "governor" && s.holder,
  )?.holder;
  if (!governor) return;
  const state = lawChain(api).stateKey;
  const cabinet = appointmentsIn(api, state);
  const before = cabinet[0]
    ? (api
        .moduleState(OFFICES_MODULE_ID)
        .table("terms")
        .get(cabinet[0].appointedBy.slice("official:".length)) as unknown as
        TermRow | undefined)
    : undefined;
  const worldSeed = (
    table(api, "review").get("seed") as unknown as
      { worldSeed: string } | undefined
  )?.worldSeed;
  // A newly seated governor names their own cabinet, unless the governor is
  // the player: the player's choices are the player's (OWNER-DECISIONS, Oct
  // 14: "No engine accepts a job, a home, a filing or any choice for the
  // controlled person"), so the sitting cabinet serves until the player names
  // someone in its place (`appointStatePost`), as the town's posts wait.
  if (
    worldSeed &&
    cabinet.length &&
    memberKey(governor) !== playerId &&
    memberKey(governor) !== cabinet[0]!.appointedBy &&
    (!before || holderOf(before) !== holderOf(governor))
  )
    appointStateCabinet(api, worldSeed, `${governor.id}:`);
  else if (worldSeed && memberKey(governor) !== playerId) {
    // A cabinet member who died or left the state leaves their post empty: the
    // governor fills it through the same appointment as the rest of the cabinet.
    const vacant = new Set(
      cabinet
        .filter((row) => {
          const holder = api.state.people.get(row.holderId);
          // A cabinet member lives in a town of the state, not at the state's own key.
          return !(
            holder?.alive &&
            (holder.placeId === state ||
              placeStateKey(holder.placeId) === state)
          );
        })
        .map((row) => row.post),
    );
    if (vacant.size)
      appointStateCabinet(
        api,
        worldSeed,
        `${governor.id}:${api.state.date}:`,
        vacant,
      );
  }
  // The election agency's head is replaced when they die.
  if (worldSeed) {
    seatElectionChief(api, worldSeed);
    seatLocalFilingOfficers(api, worldSeed);
    seatRuleFilingOfficers(api, worldSeed);
  }
  const executiveId = memberKey(governor);
  if (executiveId === playerId) return;
  for (const order of pendingGovernorOrders(api, executiveId))
    issueOrder(api, { executiveId, ...order });
}

/** Orders the governor wants from their views and the current law, shared by autonomous and played days. */
export function pendingGovernorOrders(
  api: CoreAPI,
  executiveId: string,
): readonly { order: string; revoke: boolean }[] {
  const governor = townSeats(api).find(
    (s) => s.office.kind === "governor",
  )?.holder;
  if (!governor || memberKey(governor) !== executiveId) return [];
  const state = lawChain(api).stateKey;
  const lean = leanOf(api, executiveId);
  const given = table(api, "orders").rows() as unknown as {
    executiveId: string;
    order: string;
    revoke: boolean;
    date: string;
  }[];
  return orderableBy(api).flatMap<{ order: string; revoke: boolean }>(
    (order) => {
      if (given.some((o) => o.order === order && o.date === api.state.date))
        return [];
      const want = Math.sign(viewOn(api, executiveId, ORDERABLE[order]!, lean));
      const now = answerIn(api, state, ORDERABLE[order]!);
      const undoable = given.some(
        (o) => o.order === order && !o.revoke && o.executiveId !== executiveId,
      );
      return want > 0 && now !== 1
        ? [{ order, revoke: false }]
        : want < 0 && now === 1 && undoable
          ? [{ order, revoke: true }]
          : [];
    },
  );
}

/** Who holds a state's pardon and commutation power, from the research (`governor-alone`, `governor-with-board-advice`, `board-alone`, ...). */
export function clemencyAuthority(stateKey: string): string | null {
  return RESEARCH.places[stateKey]?.pardon?.authority ?? null;
}

/** The authorities under which the governor decides alone, a board's advice being only advice. */
export const GOVERNOR_DECIDES_CLEMENCY: readonly string[] = [
  "governor-alone",
  "governor-with-board-advice",
];
