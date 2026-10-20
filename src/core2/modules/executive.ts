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
import { coreAPI, fillInIdentity, registerModule } from "../state";
import type { CoreAPI, CoreModule, CoreState, PersonState } from "../types";
import type { ModuleRow } from "../module-data";
import { enactLaw, lawChain } from "./laws";
import { OFFICES_MODULE_ID, townSeats, type TermRow } from "./offices";
import {
  appointerWeighing,
  nominateAndConfirm,
  partySide,
  type Appointment,
  type NominationReasons,
} from "../appointments";
import { drawOfficialIdentity } from "../officials-identity";
import { campaignParameter, personLean } from "../campaign-views";
import { viewOn } from "./views";
import {
  executiveDecision,
  leanOf,
  mayorVeto,
  memberKey,
  members,
  registerLegislatureHooks,
  type BillRow,
  type DeskAction,
} from "./legislature";
import { answerIn } from "./world-legislating";
import type { ModuleCalendarWork } from "../module-calendar";
import { addDays, makeIsoDate } from "../kernel/dates";
import { BUDGETS_MODULE_ID, governments } from "./budgets";
import { lineForPost, postPayCapDaily } from "../budgets-treasury";
import { startPublicJob } from "../public-payroll";
import { filingRequirements } from "./elections";

export const EXECUTIVE_MODULE_ID = "core2-executive-v1";

interface PostSpec {
  readonly key: string;
  readonly title: string;
  readonly appointedBy: string;
  readonly confirmedBy: string;
}
const RESEARCH = research as unknown as {
  local: { city: Record<string, PostSpec[]> };
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
};

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
      nominations: {},
      desk: { indexes: { byExecutive: { fields: ["executiveId"] } } },
      review: {},
    },
  },
  onCalendarWork: (api, work) => deskReview(api, work),
};

const table = (api: CoreAPI, name: string) =>
  api.moduleState(EXECUTIVE_MODULE_ID).table(name);
const ageOn = (p: Readonly<Pick<PersonState, "birthDate">>, date: string) =>
  Number(date.slice(0, 4)) - Number(p.birthDate.slice(0, 4));

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
 * Register the desk and fill the town's department heads and the state's
 * cabinet at the opening (who holds them then; vacancies come later).
 */
export function openExecutive(core: CoreState, worldSeed: string): void {
  registerLegislatureHooks({ onDesk: recordDesk });
  if (core.modules.has(EXECUTIVE_MODULE_ID)) return;
  registerModule(core, EXECUTIVE_MODULE);
  const api = coreAPI(core);
  appointTownDepartments(api);
  appointStateCabinet(api, worldSeed);
  seatElectionChief(api, worldSeed);
  table(api, "review").put({ id: "seed", worldSeed } as unknown as ModuleRow);
  scheduleReview(api, core.date);
}

function townAppointer(api: CoreAPI, by: string): TermRow | null {
  const seats = townSeats(api);
  const office = /mayor/.test(by) ? "mayor" : "council";
  return (
    seats.find((s) => s.office.kind === office && s.holder?.personId)?.holder ??
    null
  );
}

function councilSides(api: CoreAPI): number[] {
  const council = townSeats(api).find((s) => s.office.kind === "council");
  return council
    ? members(api, council.office.id).map((t) => partySide(t.party))
    : [];
}

/** How qualified a resident is for a department: temperament, and work there. */
function qualification(
  api: CoreAPI,
  person: Readonly<PersonState>,
  post: string,
  date: string,
): number {
  const temperament =
    ((person.traits["people-mind-v1:reliability"] ?? 0) +
      (person.traits["people-mind-v1:deliberation"] ?? 0)) *
    campaignParameter("appointmentTemperamentWeight");
  const core = api.state as CoreState;
  const worksThere = [...(core.work.commitmentsByPerson.get(person.id) ?? [])]
    .map((id) => core.work.commitments.get(id))
    .some((c) => {
      const org = c ? core.organizations.get(c.organizationId) : undefined;
      return !!org && org.name.toLowerCase().includes(post.split("-")[0]!);
    });
  // 0 and 1 bound the score, as they do for every 0..1 score in this file.
  return Math.max(
    0,
    Math.min(
      1,
      campaignParameter("appointmentBaseQualification") +
        temperament +
        experienceFromAge(person, date) +
        (worksThere ? campaignParameter("appointmentExperienceWeight") : 0),
    ),
  );
}

/**
 * What adult years add to a qualification: zero at the age of majority, then
 * a saturating curve (no step at any age), so a young adult can be appointed
 * but seldom beats an equally suited older resident.
 */
export function experienceFromAge(
  person: Readonly<Pick<PersonState, "birthDate">>,
  date: string,
): number {
  const years = Math.max(
    0,
    ageOn(person, date) - campaignParameter("appointmentAdulthoodAge"),
  );
  return (
    (campaignParameter("appointmentExperienceAgeWeight") * years) /
    (years + campaignParameter("appointmentExperienceHalfYears"))
  );
}

/**
 * The people a town post could go to and what the appointer weighs in each:
 * the town's adults who are not already heading a department, the appointer
 * or the player, ranked by the appointer's reasons (alignment, qualification,
 * acquaintance). Nothing is written.
 */
/** A job ends before its day's work, so someone who has worked today leaves theirs for a post tomorrow, not today. */
function workedToday(core: CoreState, person: PersonState): boolean {
  return (
    !!person.jobId &&
    core.work.lastAttendanceByJob.get(person.jobId)?.date === core.date
  );
}

function townPostInput(api: CoreAPI, spec: PostSpec, chosenId?: string) {
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
  const pool = [...(api.state.peopleByPlace.get(town) ?? [])]
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
  return {
    appointer,
    appointerSide: appointerLean,
    weighing: appointerWeighing(
      api.state as CoreState,
      appointer?.personId ?? undefined,
    ),
    candidates: pool.map((p) => ({
      id: p.id,
      lean: personLean(api.state.people, p, 0),
      qualification: qualification(api, p, spec.key, date),
      known:
        !!appointer?.personId &&
        relationships.has([appointer.personId, p.id].sort().join(":")),
    })),
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
  const spec = (RESEARCH.local.city[townForm(api)] ?? []).find(
    (s) => s.key === post,
  );
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
  const input = townPostInput(api, spec, chosenId);
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
  const row: AppointmentRow = {
    id: `appointment:town:${spec.key}`,
    government: town,
    post: spec.key,
    title: spec.title,
    holderId: appointment.nomineeId,
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
    personIds: [row.holderId],
    placeId: town,
    source: { tag: "SOURCED", citation: `Appointment ${row.id}`, asOf: date },
    publicRecord: true,
    news: true,
    facts: { post: spec.key, appointedBy: row.appointedBy },
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
  const toFill = (RESEARCH.local.city[townForm(api)] ?? []).filter(
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
      citation: `Appointment ${row.id}`,
    });
  return row;
}

function appointTownDepartments(api: CoreAPI): void {
  // An unincorporated place has no town government to staff.
  if (
    !townSeats(api).some(
      (s) =>
        (s.office.kind === "council" || s.office.kind === "mayor") && s.holder,
    )
  )
    return;
  const playerId =
    snapshotExplicitControlV1(api.state).personId ??
    (api.state as CoreState).playerId;
  for (const spec of RESEARCH.local.city[townForm(api)] ?? []) {
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
  return (RESEARCH.local.city[townForm(api)] ?? [])
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
  const spec = (RESEARCH.local.city[townForm(api)] ?? []).find(
    (s) => s.key === input.post,
  );
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
function seatCabinetPerson(
  api: CoreAPI,
  input: {
    readonly state: string;
    readonly spec: PostSpec;
    readonly identity: ReturnType<typeof drawOfficialIdentity>;
    readonly round: string;
    readonly appointmentId: string;
    readonly posts: readonly PostSpec[];
  },
): string {
  const core = api.state as CoreState;
  const { state, spec, identity } = input;
  const prior = table(api, "appointments").get(
    input.appointmentId,
  ) as unknown as AppointmentRow | undefined;
  const priorJob = prior ? core.people.get(prior.holderId)?.jobId : undefined;
  if (priorJob && core.jobs.get(priorJob)?.endsAt === undefined)
    api.endJob(priorJob, input.appointmentId);
  const personId =
    `person:cabinet:${state}:${spec.key}${input.round ? `:${input.round}` : ""}`.replace(
      /:$/,
      "",
    );
  fillInIdentity(core, {
    id: personId,
    givenName: identity.givenName,
    familyName: identity.familyName,
    birthDate: identity.birthDate,
    placeId: state,
    gender: identity.gender,
    source: {
      tag: "ESTIMATED",
      asOf: api.state.date,
      citation: `${spec.title} of ${state}, picked by the governor.`,
      estimatedFrom:
        "The research file names the post, not the person; the person is drawn from the world's seed like any invented official.",
    },
  });
  const employer = (
    api.state.modules.has(BUDGETS_MODULE_ID) ? governments(api) : []
  ).find((g) => g.level === "state")?.organizationId;
  if (employer) {
    const post = `state:${spec.key}`;
    const toFill = input.posts.filter(
      (other) =>
        lineForPost("state", `state:${other.key}`) ===
        lineForPost("state", post),
    ).length;
    startPublicJob(api, {
      personId,
      employerId: employer,
      post,
      title: spec.title,
      hourlyMinor: campaignParameter("appointeeHourlyMinor"),
      maxDailyMinor: postPayCapDaily(api, employer, post, toFill),
      scheduleFromPlaceId: lawChain(api).townPlaceId,
      citation: `Appointment ${input.appointmentId}`,
    });
  }
  return personId;
}

/**
 * The state's cabinet: for each post the governor fills, three fictional
 * people who exist for it (drawn from the world's seed), the governor
 * choosing among them, confirmed by the state senate where required.
 */
function appointStateCabinet(
  api: CoreAPI,
  worldSeed: string,
  round = "",
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
    const pool = [0, 1, 2].map((n) => {
      const identity = drawOfficialIdentity({
        worldSeed,
        seatKey: `cabinet:${state}:${spec.key}:${round}${n}`,
        stateUsps: state.slice(3),
        role: "executive-officeholder-at-opening",
        referenceDate: date,
      });
      return { n, identity };
    });
    const appointment = nominateAndConfirm({
      seatKey: `cabinet:${state}:${spec.key}`,
      appointerSide: side,
      candidates: pool.map(({ n }) => ({
        id: `official:cabinet:${state}:${spec.key}:${round}${n}`,
        // Candidates for a governor's cabinet come from the governor's side;
        // how far each sits from it is who they are.
        lean:
          side *
          campaignParameter("identityLeanScale") *
          (1 - n * campaignParameter("cabinetLeanSpread")),
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
    const chosen = pool[Number(appointment.nomineeId.split(":").pop())]!;
    const id = `appointment:${state}:${spec.key}`;
    // The cabinet member the governor picked is a full person on the state's
    // payroll, as the election agency's head is; the one they replace leaves it.
    const holderId = seatCabinetPerson(api, {
      state,
      spec,
      identity: chosen.identity,
      round,
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
        givenName: chosen.identity.givenName,
        familyName: chosen.identity.familyName,
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
  const core = api.state as CoreState;
  const state = lawChain(api).stateKey;
  const id = `appointment:${state}:${ELECTION_CHIEF_POST}`;
  const held = table(api, "agencyHeads").get(id) as unknown as
    AppointmentRow | undefined;
  if (held && core.people.get(held.holderId)?.alive) return;
  const agency = filingRequirements(state, "statewideExecutive").filedWith;
  const date = api.state.date;
  const round = held ? `${date}:` : "";
  const identity = drawOfficialIdentity({
    worldSeed,
    seatKey: `election-chief:${state}:${round}`,
    stateUsps: state.slice(3),
    role: "executive-officeholder-at-opening",
    referenceDate: date,
  });
  const personId = `person:election-chief:${state}${round ? `:${date}` : ""}`;
  fillInIdentity(core, {
    id: personId,
    givenName: identity.givenName,
    familyName: identity.familyName,
    birthDate: identity.birthDate,
    placeId: state,
    gender: identity.gender,
    source: {
      tag: "ESTIMATED",
      asOf: date,
      citation: `The head of ${agency}, who takes filings for state and federal races in ${state}.`,
      estimatedFrom:
        "The filing data names the agency, not its head; the person is drawn from the world's seed like any invented official.",
    },
  });
  table(api, "agencyHeads").put({
    id,
    government: state,
    post: ELECTION_CHIEF_POST,
    title: agency,
    holderId: personId,
    identity: {
      givenName: identity.givenName,
      familyName: identity.familyName,
    },
    appointedBy: state,
    confirmation: null,
    reasons: [],
    since: date,
  } as unknown as ModuleRow);
  // On the state government's payroll, as the town's heads are on the town's.
  const govs = api.state.modules.has(BUDGETS_MODULE_ID) ? governments(api) : [];
  const employer = govs.find((g) => g.level === "state")?.organizationId;
  const post = `state:${ELECTION_CHIEF_POST}`;
  // A world with no treasury open has no payroll to hold the post on.
  if (employer)
    startPublicJob(api, {
      personId,
      employerId: employer,
      post,
      title: agency,
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
  return (
    table(api, "appointments").query("byGovernment", [
      government,
    ]) as unknown as AppointmentRow[]
  )
    .slice()
    .sort((a, b) => a.id.localeCompare(b.id));
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
  const offices = api.moduleState(OFFICES_MODULE_ID);
  const holding = new Set(
    appointmentsIn(api, state)
      .filter((p) => p.post !== input.post)
      .map((p) => p.holderId),
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
        !(
          offices
            .table("terms")
            .query("byPerson", [person.id]) as unknown as TermRow[]
        ).some((t) => t.status === "serving") &&
        !workedToday(api.state as CoreState, person),
    )
    .sort((a, b) => a.id.localeCompare(b.id));
  if (input.personId && !pool.length)
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
  const appointment = nominateAndConfirm({
    seatKey: `cabinet:${state}:${spec.key}`,
    appointerSide: leanOf(api, input.executiveId),
    weighing: appointerWeighing(api.state as CoreState, input.executiveId),
    candidates: pool.map((person) => ({
      id: person.id,
      lean: personLean(api.state.people, person, 0),
      qualification: qualification(api, person, spec.key, api.state.date),
      known: (api.state as CoreState).relationships.has(
        [input.executiveId, person.id].sort().join(":"),
      ),
    })),
    confirmingBody: confirmation
      ? {
          name: senate!.title,
          sides: members(api, senate!.id).map((t) => partySide(t.party)),
        }
      : null,
    tolerance: campaignParameter("confirmationTolerance"),
  });
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
  const person = api.state.people.get(appointment.nomineeId)!;
  const gov = governments(api).find((g) => g.id === state);
  if (!gov) throw new Error("No state treasury is recorded.");
  const prior = appointmentsIn(api, state).find((p) => p.post === spec.key);
  const priorPerson = prior ? api.state.people.get(prior.holderId) : undefined;
  const priorJob = priorPerson?.jobId
    ? (api.state as CoreState).jobs.get(priorPerson.jobId)
    : undefined;
  const row: AppointmentRow = {
    id: `appointment:${state}:${spec.key}`,
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
  const jobId = startPublicJob(api, {
    personId: person.id,
    employerId: gov.organizationId,
    post: `state:${spec.key}`,
    title: spec.title,
    hourlyMinor: campaignParameter("appointeeHourlyMinor"),
    citation: `Appointment ${row.id}`,
  });
  if (!jobId) return null;
  if (priorJob?.organizationId === gov.organizationId && !priorJob.endsAt)
    api.endJob(priorJob.id, `appointment-replaced:${state}:${spec.key}`);
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
    facts: { post: spec.key, appointedBy: input.executiveId },
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

export interface DeskRow {
  readonly id: string;
  readonly billId: string;
  readonly number: string;
  readonly executiveId: string;
  readonly date: string;
  readonly status: DeskAction["status"];
  /** The executive's own position on the bill, and their temperament's lean toward signing. */
  readonly position: number;
  readonly temperament: number;
  /** For a bill still waiting: the last day to act before inaction decides it. */
  readonly signBy?: string;
}

/** A passed bill on an executive's desk: what they did with it, and why. */
function recordDesk(api: CoreAPI, action: DeskAction): void {
  if (!api.state.modules.has(EXECUTIVE_MODULE_ID)) return;
  table(api, "desk").put({
    id: `desk:${action.bill.id}`,
    billId: action.bill.id,
    number: action.bill.number,
    executiveId: action.executiveId,
    date: api.state.date,
    status: action.status,
    position: action.position,
    temperament: action.temperament,
    ...(action.signBy ? { signBy: action.signBy } : {}),
  } satisfies DeskRow as unknown as ModuleRow);
}

/**
 * The player, as mayor, county executive, governor or president, signs or
 * vetoes a bill waiting on their desk. The decision goes on the record and
 * the bill becomes law (or goes back for an override vote) from it.
 */
export function decideOnDesk(
  api: CoreAPI,
  billId: string,
  sign: boolean,
): BillRow {
  const row = table(api, "desk").get(`desk:${billId}`) as unknown as
    DeskRow | undefined;
  const playerId =
    snapshotExplicitControlV1(api.state).personId ??
    (api.state as CoreState).playerId;
  if (!row || row.status !== "awaiting" || row.executiveId !== playerId)
    throw new Error(`No bill ${billId} is waiting on your desk.`);
  return executiveDecision(api, billId, sign);
}

export function deskOf(api: CoreAPI, executiveId: string): readonly DeskRow[] {
  if (!api.state.modules.has(EXECUTIVE_MODULE_ID)) return [];
  return table(api, "desk").query("byExecutive", [
    executiveId,
  ]) as unknown as DeskRow[];
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
  const posts = RESEARCH.local.city[townForm(api)] ?? [];
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
  if (
    worldSeed &&
    cabinet.length &&
    memberKey(governor) !== cabinet[0]!.appointedBy &&
    (!before || holderOf(before) !== holderOf(governor))
  )
    appointStateCabinet(api, worldSeed, `${governor.id}:`);
  // The election agency's head is replaced when they die.
  if (worldSeed) seatElectionChief(api, worldSeed);
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
