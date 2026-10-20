/**
 * Scheduling, structure only: for each stored moment, a scene now, a scene
 * waiting, or a journal line, with the situation type's roles and setting
 * bound from records (docs/design/director-on-core2.md). No screen reads
 * this yet, and no type holds a sentence.
 *
 * A moment at the interrupt line takes over the screen, and stops a skip.
 * A moment that ranks within the life's pace over the trailing year waits as
 * a scene the player can go to; while time is skipped it becomes a journal
 * line. Everything else is a journal line. A moment no type can stage writes
 * a coverage row with the reason. Nothing is drawn by chance.
 */
import { coreAPI } from "../core2/state";
import { OFFICES_MODULE_ID } from "../core2/modules/offices";
import { coreSeatOfGovernmentPlace } from "../core2/place-lookup";
import { addDays, ageOnDate, makeIsoDate } from "../core2/kernel/dates";
import { P } from "../core2/parameters";
import type { CoreState, IsoDate, PersonId } from "../core2/types";
import situationJson from "./data/situation-types.json" with { type: "json" };
import { CIVIC_FILLS, civicFill } from "./civic-roles";
import type { Moment, PersonLedger } from "./types";

const zero = P.zero;
const one = P.one;

export interface SituationRole {
  key: string;
  fill: string;
  count: string;
  present?: boolean;
  moves: readonly string[];
  wants: readonly string[];
  bearing?: string;
}

export interface CauseFactMatch {
  key: string;
  is?: "subject" | "other";
  equals?: string;
}

export interface SituationCause {
  match?: {
    label?: string;
    labelPrefix?: string;
    /** The cause's own kind, whichever channel scored it strongest ("event:speech.heard"). */
    causeKind?: string;
    counterpart?: string;
    echo?: string;
    threadTurn?: string;
    /**
     * A fact of the cause's own record read against the moment's person: an
     * election result's winner is the subject ("subject") or someone else
     * ("other"), or it holds one value (a desk action "signed"). A cause whose
     * record is gone, or lacks the fact, matches nothing. Several are all read.
     */
    causeFact?: CauseFactMatch | readonly CauseFactMatch[];
  };
  awaitingProducer?: string;
  causeEngine?: string;
  reason?: string;
  bind?: Readonly<Record<string, string>>;
  opener?: string;
  opening?: string;
}

export interface SituationType {
  key: string;
  roles: readonly SituationRole[];
  setting: readonly string[];
  timing: string;
  causes: readonly SituationCause[];
  awaiting?: readonly string[];
  /**
   * A scene that never stops the player's day: it waits its turn by the life's
   * pace however strongly it was felt (an invitation to a cause meeting; owner,
   * Oct 20: a well-known mayor was interrupted by 79 of them in a year).
   */
  waits?: boolean;
  /** The decision the scene is for, when it has one ("ballot": the vote is cast here). */
  choice?: string;
  /**
   * Types whose scene this one gives way to: when a moment binds both, only
   * the type named here is staged, so one cause never stages two scenes
   * (a lost job told at home stands in for the same loss told at work).
   */
  yieldsTo?: readonly string[];
}

export interface SituationLibrary {
  version: string;
  scheduling: {
    paces: Readonly<Record<string, number>>;
    paceBands: readonly { band: string; maxAge?: number }[];
    trailingDays: number;
    /** Days within which the same scene with the same people is staged once. */
    repeatDays: number;
    openDays: Readonly<Record<string, number>>;
    /** Moments that stage their family scene when a household member is in them. */
    householdScenes: readonly string[];
    /** Records of the whole household that stage a family scene for each member. */
    householdRecordScenes?: readonly string[];
  };
  types: readonly SituationType[];
}

export const SITUATION_LIBRARY = situationJson as unknown as SituationLibrary;

export interface SceneBinding {
  typeKey: string;
  roles: { role: string; personIds: PersonId[]; bearing?: string }[];
  /** Everyone the records place in the scene, for staging. */
  presentIds: PersonId[];
  setting: { kind: string; recordId: string };
  timing: string;
  opener?: string;
  opening?: string;
  reason?: string;
  openUntil: IsoDate;
}

export interface CoverageRow {
  momentId: string;
  personId: PersonId;
  label: string;
  impact: number;
  /** "no-type", "role-unbound" or "no-place". */
  reason: string;
  typeKey?: string;
  detail?: string;
}

export interface ScheduleEntry {
  momentId: string;
  date: IsoDate;
  /** "scene-now", "scene-waiting" or "journal-line". */
  outcome: string;
  mode: string;
  /** Impact at or over the interrupt line. */
  interrupt: boolean;
  stopsSkip: boolean;
  /** The core player stop registered for this moment, when its person is controlled. */
  stop?: { recordId: string; at: { date: IsoDate; minuteOfDay: number } };
  rank: number;
  pace: number;
  bindings: SceneBinding[];
  coverage?: CoverageRow;
}

/** About how many scenes a year this life carries now, by band of childhood agency. */
export function paceOf(
  library: SituationLibrary,
  birthDate: IsoDate,
  date: IsoDate,
): number {
  const age = ageOnDate(makeIsoDate(birthDate), makeIsoDate(date));
  const band = library.scheduling.paceBands.find(
    (row) => row.maxAge === undefined || age <= row.maxAge,
  );
  if (!band) throw new Error(`No pace band covers age ${age}.`);
  const pace = library.scheduling.paces[band.band];
  if (pace === undefined) throw new Error(`No pace for band ${band.band}.`);
  return pace;
}

/**
 * Where a moment ranks among its person's moments over the trailing year,
 * itself included: 1 for the one that matters most. Equal impacts rank the
 * earlier moment first. Reads only that year.
 */
export function paceRank(
  library: SituationLibrary,
  book: PersonLedger,
  moment: Moment,
): number {
  const since = addDays(
    makeIsoDate(moment.date),
    -library.scheduling.trailingDays,
  );
  let rank = one;
  for (let index = book.moments.length - one; index >= zero; index -= one) {
    const other = book.moments[index]!;
    if (other.date <= since) break;
    if (other.id === moment.id) continue;
    if (other.impact > moment.impact) rank += one;
    else if (other.impact === moment.impact && other.date < moment.date)
      rank += one;
  }
  return rank;
}

export function causeMatches(
  cause: SituationCause,
  book: PersonLedger,
  moment: Moment,
  core: Readonly<CoreState>,
): boolean {
  const match = cause.match;
  if (!match) return false;
  const causeFacts = match.causeFact
    ? Array.isArray(match.causeFact)
      ? (match.causeFact as readonly CauseFactMatch[])
      : [match.causeFact as CauseFactMatch]
    : [];
  for (const want of causeFacts) {
    const fact = core.durableLog.get(moment.causeId)?.facts?.[want.key];
    if (typeof fact !== "string" || !fact) return false;
    if (want.equals !== undefined && fact !== want.equals) return false;
    if (
      want.is !== undefined &&
      (fact === moment.personId) !== (want.is === "subject")
    )
      return false;
  }
  if (match.label !== undefined && moment.label !== match.label) return false;
  if (match.causeKind !== undefined && moment.causeKind !== match.causeKind)
    return false;
  if (
    match.labelPrefix !== undefined &&
    !moment.label.startsWith(match.labelPrefix)
  )
    return false;
  if (match.counterpart === "none" && moment.counterpartIds.length)
    return false;
  if (match.counterpart === "some" && !moment.counterpartIds.length)
    return false;
  if (
    match.echo !== undefined &&
    !moment.echoes.some((row) => row.reason === match.echo)
  )
    return false;
  if (match.threadTurn !== undefined) {
    const turned = moment.counterpartIds.some((id) =>
      book.threads
        .get(id)
        ?.turns.some(
          (turn) =>
            turn.momentId === moment.id && turn.turn === match.threadTurn,
        ),
    );
    if (!turned) return false;
  }
  return true;
}

function alive(core: Readonly<CoreState>, id: PersonId): boolean {
  return core.people.get(id)?.alive === true;
}

/** Who fills a role, read from records on the moment's day. */
/** Who answers for a subject at home, in order: parents, then other older kin. */
const GUARDIAN_RELATIONS: readonly (readonly string[])[] = [
  ["parent", "other-parent"],
  ["grandparent", "aunt-or-uncle"],
];

function fillRole(
  fill: string,
  core: Readonly<CoreState>,
  book: PersonLedger,
  moment: Moment,
  setting: string | undefined,
  taken: ReadonlySet<PersonId>,
): PersonId[] {
  const subject = core.people.get(moment.personId);
  // Closest first: the standing tie, then recorded closeness, then the record ID.
  const closest = (ids: PersonId[]) =>
    ids.sort((a, b) => {
      const left = book.threads.get(a);
      const right = book.threads.get(b);
      return (
        (right?.tie ?? zero) - (left?.tie ?? zero) ||
        (right?.closeness ?? zero) - (left?.closeness ?? zero) ||
        a.localeCompare(b)
      );
    });
  const household = () =>
    closest(
      [
        ...(core.households.get(subject?.householdId ?? "")?.memberIds ?? []),
      ].filter((id) => alive(core, id) && !taken.has(id)),
    );
  const coworkers = () => {
    const job = subject?.jobId ? core.jobs.get(subject.jobId) : undefined;
    if (!job) return [];
    return [...(core.finance.jobsByOrganization.get(job.organizationId) ?? [])]
      .map((id) => core.jobs.get(id)!)
      .filter((row) => row.endsAt === undefined && !taken.has(row.personId))
      .map((row) => row.personId)
      .filter((id) => alive(core, id))
      .sort();
  };
  switch (fill) {
    case "subject":
      return [moment.personId];
    case "counterpart":
      // Like the subject, the counterpart may fill two roles: a bearer telling news about themself.
      return moment.counterpartIds.slice(zero, one);
    case "household":
      return household();
    case "decider": {
      // Who decided the cause, from its record's facts (a layoff's owner): a living person, never the subject.
      const id = core.durableLog.get(moment.causeId)?.facts?.decidedBy;
      return id && id !== moment.personId && alive(core, id) ? [id] : [];
    }
    case "kin":
      return closest(
        [...book.threads.values()]
          .filter(
            (thread) =>
              thread.kin.length &&
              alive(core, thread.otherId) &&
              !taken.has(thread.otherId),
          )
          .map((thread) => thread.otherId),
      );
    case "coworkers":
      return coworkers();
    case "present":
      return setting === "home"
        ? household()
        : setting === "workplace"
          ? coworkers()
          : [];
    case "authority": {
      // At home: the subject's parent on record who lives with them, else
      // another older relative in the household (a guardian).
      const kinIn = new Map<PersonId, string>();
      for (const fact of subject?.pastFacts ?? [])
        if (fact.kind.startsWith("family:") && fact.facts?.otherPersonId)
          kinIn.set(
            fact.facts.otherPersonId as PersonId,
            fact.kind.slice("family:".length),
          );
      const members = household();
      for (const relations of GUARDIAN_RELATIONS) {
        const found = members.filter((id) =>
          relations.includes(kinIn.get(id) ?? ""),
        );
        if (found.length) return found;
      }
      return [];
    }
    default:
      // The civic roles come from the offices, voting and press records.
      if (CIVIC_FILLS.has(fill)) return civicFill(fill, core, moment, taken);
      // Classmates, absent and the clerk have no records in the new core yet.
      return [];
  }
}

/** The first of the type's settings the records can place. */
function resolveSetting(
  kind: string,
  core: Readonly<CoreState>,
  moment: Moment,
  peopleBound: number,
): { kind: string; recordId: string } | undefined {
  const subject = core.people.get(moment.personId);
  if (!subject) return undefined;
  const counterpart = moment.counterpartIds[zero]
    ? core.people.get(moment.counterpartIds[zero]!)
    : undefined;
  const job = subject.jobId ? core.jobs.get(subject.jobId) : undefined;
  switch (kind) {
    case "home":
      return { kind, recordId: subject.householdId };
    case "other-home":
      return counterpart && counterpart.householdId !== subject.householdId
        ? { kind, recordId: counterpart.householdId }
        : undefined;
    case "workplace": {
      // A job that just ended is no longer on the person; the cause's record names the employer.
      const employer =
        job?.organizationId ??
        core.durableLog.get(moment.causeId)?.facts?.organizationId;
      return employer ? { kind, recordId: employer } : undefined;
    }
    case "seat": {
      // Where an officeholder's government sits (an address is given at the
      // capitol, not in the town that watched it), named as a venue.
      const api = coreAPI(core as CoreState);
      if (!api.state.modules.has(OFFICES_MODULE_ID)) return undefined;
      const state = api.moduleState(OFFICES_MODULE_ID);
      const term = (
        state.table("terms").rows() as unknown as {
          personId: string;
          officeId: string;
          status: string;
        }[]
      ).find((row) => row.personId === subject.id && row.status === "serving");
      const office = term
        ? (state.table("offices").get(term.officeId) as unknown as
            { jurisdiction: string } | undefined)
        : undefined;
      const seat = office
        ? coreSeatOfGovernmentPlace(
            office.jurisdiction === "US" ? "US-FEDERAL" : office.jurisdiction,
          )
        : null;
      return seat
        ? { kind: "venue", recordId: seat.place.context.jurisdiction.id }
        : undefined;
    }
    case "office":
      // An officeholder's office is their post's employer on record.
      return job?.organizationId
        ? { kind, recordId: job.organizationId }
        : undefined;
    case "phone":
      return peopleBound > one ? { kind, recordId: moment.causeId } : undefined;
    case "public":
      return { kind, recordId: subject.placeId };
    case "venue":
      return moment.placeId ? { kind, recordId: moment.placeId } : undefined;
    default:
      // School and letter need records the new core does not keep yet.
      return undefined;
  }
}

function bindType(
  type: SituationType,
  cause: SituationCause,
  core: Readonly<CoreState>,
  book: PersonLedger,
  moment: Moment,
  library: SituationLibrary,
): SceneBinding | { failure: string; detail: string } {
  let failure: { failure: string; detail: string } | undefined;
  for (const settingKind of type.setting) {
    const taken = new Set<PersonId>();
    const roles: SceneBinding["roles"] = [];
    let unbound: string | undefined;
    // Subject and counterpart first, so wider fills exclude them.
    const ordered = [...type.roles].sort((a, b) => {
      const rank = (role: SituationRole) => {
        const fill = cause.bind?.[role.key] ?? role.fill;
        return fill === "subject" ? zero : fill === "counterpart" ? one : P.two;
      };
      return rank(a) - rank(b);
    });
    for (const role of ordered) {
      const fill = cause.bind?.[role.key] ?? role.fill;
      const found = fillRole(fill, core, book, moment, settingKind, taken);
      const people = role.count === "one" ? found.slice(zero, one) : found;
      if (role.count === "one" && !people.length) {
        unbound = `${role.key} (${fill})`;
        break;
      }
      for (const id of people) taken.add(id);
      roles.push({
        role: role.key,
        personIds: people,
        ...(role.bearing ? { bearing: role.bearing } : {}),
      });
    }
    if (unbound) {
      failure = { failure: "role-unbound", detail: unbound };
      continue;
    }
    const setting = resolveSetting(settingKind, core, moment, taken.size);
    if (!setting) {
      failure ??= { failure: "no-place", detail: settingKind };
      continue;
    }
    const presentRoles = new Set(
      type.roles.filter((role) => role.present !== false).map((row) => row.key),
    );
    return {
      typeKey: type.key,
      roles,
      presentIds: [
        ...new Set(
          roles
            .filter((row) => presentRoles.has(row.role))
            .flatMap((row) => row.personIds),
        ),
      ].sort(),
      setting,
      timing: type.timing,
      ...(cause.opener ? { opener: cause.opener } : {}),
      ...(cause.opening ? { opening: cause.opening } : {}),
      ...(cause.reason ? { reason: cause.reason } : {}),
      openUntil: addDays(
        makeIsoDate(moment.date),
        library.scheduling.openDays[type.timing] ?? zero,
      ),
    };
  }
  return failure ?? { failure: "no-place", detail: type.setting.join(",") };
}

/**
 * Decides one stored moment's outcome. Pure over the core and the ledger;
 * the caller stores the entry.
 */
export function scheduleMoment(
  core: Readonly<CoreState>,
  book: PersonLedger,
  moment: Moment,
  options: {
    mode: string;
    interruptImpact: number;
    /**
     * The scene kinds the player allows to interrupt (their filter record);
     * absent means every kind. A moment whose scenes are all filtered out
     * becomes a journal line and stops nothing.
     */
    allowedKinds?: ReadonlySet<string>;
  },
  library: SituationLibrary = SITUATION_LIBRARY,
): ScheduleEntry {
  const person = core.people.get(moment.personId);
  if (!person) throw new Error(`Scheduled moment has no person: ${moment.id}`);
  const pace = paceOf(library, person.birthDate, moment.date);
  const rank = paceRank(library, book, moment);
  const found: SceneBinding[] = [];
  let coverage: CoverageRow | undefined;
  for (const type of library.types)
    for (const cause of type.causes) {
      if (!causeMatches(cause, book, moment, core)) continue;
      const bound = bindType(type, cause, core, book, moment, library);
      if ("failure" in bound)
        coverage ??= {
          momentId: moment.id,
          personId: moment.personId,
          label: moment.label,
          impact: moment.impact,
          reason: bound.failure,
          typeKey: type.key,
          detail: bound.detail,
        };
      else if (!found.some((row) => row.typeKey === bound.typeKey))
        found.push(bound);
    }
  // One cause stages one scene: a type that yields to another bound for this
  // moment is dropped (what the player allows is decided after, below).
  const staged = found.filter((row) => {
    const yields =
      library.types.find((type) => type.key === row.typeKey)?.yieldsTo ?? [];
    return !found.some((other) => yields.includes(other.typeKey));
  });
  // The player's filter: only the scene kinds they allow stage or interrupt.
  const allowed = options.allowedKinds;
  // One sitting covers a day: a scene of the same kind with the same people
  // already staged today takes this cause in (five bills signed in one
  // afternoon are one press availability, not five). The same scene with the
  // same people is not staged again within the repeat window either (a
  // neighbor who shares the same cause seven days running asks once).
  const castOf = (row: SceneBinding) =>
    `${row.typeKey}|${row.roles
      .flatMap((role) => role.personIds)
      .sort()
      .join(",")}`;
  const sittingToday = new Set(
    book.schedule
      .filter(
        (entry) =>
          entry.date <= moment.date &&
          entry.date >
            addDays(makeIsoDate(moment.date), -library.scheduling.repeatDays) &&
          entry.momentId !== moment.id &&
          entry.outcome !== "journal-line",
      )
      .flatMap((entry) => entry.bindings.map(castOf)),
  );
  const bindings = (
    allowed ? staged.filter((row) => allowed.has(row.typeKey)) : staged
  ).filter((row) => !sittingToday.has(castOf(row)));
  const filteredOut = staged.length > zero && !bindings.length;
  // News from the household's own records (a parent's lost job, a death, a
  // serious illness) is a family scene at home whatever its size (owner,
  // Oct 14, 2026, night: the director picks the family scene the
  // household's records make apply).
  // A record of the whole household (an eviction) is a family scene for
  // each of them, with no one else named.
  const household = person.householdId;
  const familyNews =
    ((library.scheduling.householdScenes.includes(moment.label) &&
      moment.counterpartIds.some(
        (id) => core.people.get(id)?.householdId === household,
      )) ||
      (library.scheduling.householdRecordScenes?.includes(moment.label) ??
        false)) &&
    bindings.some((row) => row.setting.kind === "home");
  const waits =
    bindings.length > zero &&
    bindings.every(
      (row) => library.types.find((type) => type.key === row.typeKey)?.waits,
    );
  const interrupt =
    (moment.impact >= options.interruptImpact || familyNews) &&
    !filteredOut &&
    !waits;
  if (!found.length)
    coverage ??= {
      momentId: moment.id,
      personId: moment.personId,
      label: moment.label,
      impact: moment.impact,
      reason: "no-type",
    };
  const live = options.mode === "live";
  const outcome = !bindings.length
    ? "journal-line"
    : interrupt
      ? "scene-now"
      : rank <= pace && live
        ? "scene-waiting"
        : "journal-line";
  return {
    momentId: moment.id,
    date: moment.date,
    outcome,
    mode: options.mode,
    interrupt,
    stopsSkip: !live && interrupt,
    rank,
    pace,
    bindings,
    ...(found.length ? {} : { coverage }),
  };
}
