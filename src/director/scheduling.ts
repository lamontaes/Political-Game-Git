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
import { familyFactsOf } from "../core2/modules/people";
import { coreAPI } from "../core2/state";
import { OFFICES_MODULE_ID } from "../core2/modules/offices";
import { coreSeatOfGovernmentPlace } from "../core2/place-lookup";
import { addDays, ageOnDate, makeIsoDate } from "../core2/kernel/dates";
import { P } from "../core2/parameters";
import type { CoreState, IsoDate, PersonId } from "../core2/types";
import situationJson from "./data/situation-types.json" with { type: "json" };
import { CIVIC_FILLS, civicFill } from "./civic-roles";
import { stakeholders } from "./family-stake";
import { attendedSchool } from "../core2/past";
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

export interface SituationCause {
  match?: {
    label?: string;
    labelPrefix?: string;
    /** The cause's own kind, whichever channel scored it strongest ("event:speech.heard"). */
    causeKind?: string;
    counterpart?: string;
    echo?: string;
    threadTurn?: string;
    /** With threadTurn: the thread took this turn earlier (a tie that grew back after it soured). */
    afterTurn?: string;
    /** The cause's record names the moment's person among its own people. */
    selfNamed?: boolean;
    /**
     * Facts of the cause's own record, every one of which must hold: a fact
     * ("winnerId") names the moment's person ("is": "subject") or someone
     * else ("other"), is one of the listed values ("equals"), or is a list
     * of people ("outIds") that includes the moment's person ("includes":
     * "subject"). A cause whose record is gone, or lacks the fact, matches
     * nothing.
     */
    causeFacts?: readonly {
      key: string;
      /** The record must not carry the fact. */
      absent?: true;
      is?: "subject" | "other";
      equals?: readonly string[];
      includes?: "subject";
    }[];
    /** What a heard speech was given at: "campaign", "remark" at a meeting, a "hearing" (see speechOccasion). */
    occasion?: string;
    /** How a candidate gave a heard speech, one of these: "town-hall", "speech", "debate" (see speechAct). */
    act?: readonly string[];
    /**
     * The cause's own record names the moment's person (a public comment's
     * speakers): someone who only heard of it from a tie matches nothing, so
     * a hearing is never staged around a speaker who did not speak.
     */
    causeNames?: "subject";
  };
  awaitingProducer?: string;
  causeEngine?: string;
  /** The record kind (or kinds, comma-joined) the cause reads, for the scene web. */
  causeRecord?: string;
  reason?: string;
  bind?: Readonly<Record<string, string>>;
  opener?: string;
  opening?: string;
  /** The role whose recorded speech the scene plays, said in its words. */
  said?: string;
  /**
   * The key the exchange's pieces are tagged with when this cause fires the
   * type, in place of the type's own tag key: one purpose, a different
   * reason for each cause (a colleague, a reporter and a lobbyist each speak
   * for their own).
   */
  sceneKey?: string;
  /**
   * Where this cause stages the type, when it is not the type's own order of
   * settings: a vote trade is asked for in the chamber its record names.
   */
  setting?: readonly string[];
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
   * pace however strongly it was felt (an invitation to a cause meeting).
   */
  waits?: boolean;
  /**
   * A scene that is an event in itself (a swearing-in, owner Oct 29): it
   * stops the day however strongly the moment was felt, for the one whose
   * record it is.
   */
  stopsDay?: boolean;
  /**
   * A scene about one record's own decision (a member's vote on one bill):
   * each cause stages its own, never taken into another sitting or held back
   * by the repeat window.
   */
  eachCause?: boolean;
  /**
   * What the repeat window tells scenes apart by besides the cast: "bill"
   * for a scene about one bill (a vote asked for), so the same two people
   * about another bill on a later day is a new scene.
   */
  repeatsBy?: string;
  /** The decision the scene is for, when it has one ("ballot": the vote is cast here). */
  choice?: string;
  /**
   * Types whose scene this one gives way to: when a moment binds both, only
   * the type named here is staged, so one cause never stages two scenes
   * (a lost job told at home stands in for the same loss told at work).
   */
  yieldsTo?: readonly string[];
  /**
   * What kind of occasion the scene is, which decides whether an office
   * holder in it sits, stands or takes a podium (the people pack's postures,
   * agreed with People, Oct 29): "ceremony" for a swearing-in.
   */
  occasion?: string;
}

export interface SituationLibrary {
  version: string;
  scheduling: {
    paces: Readonly<Record<string, number>>;
    paceBands: readonly { band: string; maxAge?: number }[];
    trailingDays: number;
    /** Days within which the same scene with the same people is staged once. */
    repeatDays: number;
    /** The most scenes of one type in a season's window of days. */
    seasonCap: { value: number; days: number };
    openDays: Readonly<Record<string, number>>;
    /** Moments that stage their family scene when a household member is in them. */
    householdScenes: readonly string[];
    /** Records of the whole household that stage a family scene for each member. */
    householdRecordScenes?: readonly string[];
    /** Records of the subject's own life that name them, met the same day: a filing, the count of their race, a story against them. */
    ownRecordScenes?: readonly string[];
    /** Where an own-record scene is met that day (home by default). */
    ownRecordSettings?: readonly string[];
    /**
     * Label prefixes of moments met where the player is that day (scenes
     * from circumstance): staged on the day whatever their impact, their
     * spacing kept by their producer (circumstance.ts).
     */
    metWhereYouAre?: readonly string[];
  };
  types: readonly SituationType[];
}

export const SITUATION_LIBRARY = situationJson as unknown as SituationLibrary;

export interface SceneBinding {
  typeKey: string;
  roles: { role: string; personIds: PersonId[]; bearing?: string }[];
  /** Everyone the records place in the scene, for staging. */
  presentIds: PersonId[];
  /**
   * Why each person present is there, decided once here: the fill of the
   * role that cast them (subject, household, coworkers, counterpart, kin,
   * the civic roles). Every view stages these people for these reasons and
   * no others (the plan of Oct 28, section 3: "One cast, decided once").
   */
  presentReasons: Record<PersonId, string>;
  setting: { kind: string; recordId: string };
  timing: string;
  opener?: string;
  opening?: string;
  reason?: string;
  /** The role whose recorded speech the scene plays (the address heard at home). */
  said?: string;
  openUntil: IsoDate;
  /** Later moments of the same day this sitting took in, each with its cause record. */
  joined?: { momentId: string; causeId: string }[];
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
  /**
   * The bound scenes with a purpose the player has answered, by type: a
   * record that stages several plays each in turn, the next once one ends.
   */
  answered?: string[];
  /** The reply records the player's answers wrote, for the journal to tell. */
  replies?: string[];
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

/**
 * What a heard speech was given at: a campaign stop, a remark at a meeting, a
 * hearing, a party meeting, a press attack or a state address. A council
 * remark is not a campaign event.
 */
export function speechOccasion(
  core: Readonly<CoreState>,
  causeId: string,
): string | undefined {
  const said = core.durableLog.get(causeId)?.facts?.occasion;
  if (typeof said === "string" && said) return said;
  // stopgapId: SG-DIRECTOR-speech-occasion (the speech engine's record has no
  // occasion yet, so the producer's id says it: "speech:remark:...", or
  // "speech:<speaker>:<date>:<act>:..." for a candidate's own speech).
  const [head, first, , act] = causeId.split(":");
  if (head !== "speech" || !first) return undefined;
  if (!core.people.has(first as never)) return first;
  return act === "attack" ? "press" : "campaign";
}

/**
 * How a candidate gave a heard speech: the campaign act its record id names
 * ("speech:<speaker>:<date>:<act>:<venue>"), so a town hall heard in the room
 * is told apart from a debate heard on the broadcast.
 */
export function speechAct(causeId: string): string | undefined {
  // stopgapId: SG-DIRECTOR-speech-occasion (read from the id, as the occasion is).
  const [head, , , act] = causeId.split(":");
  return head === "speech" ? act : undefined;
}

export function causeMatches(
  cause: SituationCause,
  book: PersonLedger,
  moment: Moment,
  core: Readonly<CoreState>,
): boolean {
  const match = cause.match;
  if (!match) return false;
  for (const want of match.causeFacts ?? []) {
    const fact = core.durableLog.get(moment.causeId)?.facts?.[want.key];
    // A fact the record must not carry (an interview the player did not sit
    // for has no `sat`): a record the log did not keep carries none.
    if (want.absent) {
      if (fact) return false;
      continue;
    }
    if (typeof fact !== "string" || !fact) return false;
    if (want.is && (fact === moment.personId) !== (want.is === "subject"))
      return false;
    if (want.equals && !want.equals.includes(fact)) return false;
    if (
      want.includes === "subject" &&
      !(JSON.parse(fact) as unknown[]).includes(moment.personId)
    )
      return false;
  }
  if (
    match.occasion !== undefined &&
    speechOccasion(core, moment.causeId) !== match.occasion
  )
    return false;
  if (match.act && !match.act.includes(speechAct(moment.causeId) ?? ""))
    return false;
  if (
    match.causeNames === "subject" &&
    !core.durableLog.get(moment.causeId)?.personIds.includes(moment.personId)
  )
    return false;
  if (match.selfNamed && !moment.selfNamed) return false;
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
    if (match.afterTurn !== undefined) {
      const earlier = moment.counterpartIds.some((id) =>
        book.threads
          .get(id)
          ?.turns.some(
            (turn) =>
              turn.momentId !== moment.id && turn.turn === match.afterTurn,
          ),
      );
      if (!earlier) return false;
    }
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
  const otherHousehold = () => {
    const other = core.people.get(moment.counterpartIds[zero] ?? "");
    return [...(core.households.get(other?.householdId ?? "")?.memberIds ?? [])]
      .filter((id) => alive(core, id) && !taken.has(id))
      .sort();
  };
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
    case "bereaved": {
      // Those who lost the same person: the living family the deceased's
      // record names (a parent's widow, their children, their siblings), the
      // subject's own household first, then the closest, never the subject.
      // A funeral at a venue has no one "present" by setting.
      const gone = core.people.get(moment.counterpartIds[zero] ?? "");
      if (!gone) return [];
      const home = new Set(household());
      const kin = closest(
        [...gone.familyIds].filter(
          (id) => id !== moment.personId && alive(core, id) && !taken.has(id),
        ),
      );
      return [
        ...kin.filter((id) => home.has(id)),
        ...kin.filter((id) => !home.has(id)),
      ];
    }
    case "household-stake":
      // The household members the filing puts something of theirs at risk
      // for, strongest first; none, and the scene is not staged.
      return stakeholders(core, moment.personId, moment.causeId, household());
    case "decider": {
      // Who decided the cause, from its record's facts (a layoff's owner): a living person, never the subject.
      const id = core.durableLog.get(moment.causeId)?.facts?.decidedBy;
      return id && id !== moment.personId && alive(core, id) ? [id] : [];
    }
    case "cause-named": {
      // The first person the cause record names, living or not (whom a
      // death is about), never the subject.
      const id = core.durableLog.get(moment.causeId)?.personIds[zero];
      return id && id !== moment.personId && core.people.has(id) ? [id] : [];
    }
    case "winner": {
      // Who a count's record says won (its winnerId), never the subject.
      const id = core.durableLog.get(moment.causeId)?.facts?.winnerId;
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
    case "former-coworkers": {
      // The people still working where the cause's job was (a last day).
      const left = core.jobs.get(moment.causeId);
      if (!left) return [];
      return [
        ...(core.finance.jobsByOrganization.get(left.organizationId) ?? []),
      ]
        .map((id) => core.jobs.get(id)!)
        .filter(
          (row) =>
            row.endsAt === undefined &&
            row.personId !== moment.personId &&
            !taken.has(row.personId),
        )
        .map((row) => row.personId)
        .filter((id) => alive(core, id))
        .sort();
    }
    case "present":
      return setting === "home"
        ? household()
        : setting === "workplace"
          ? coworkers()
          : setting === "other-home"
            ? // At someone else's home (a door knocked): who else lives there.
              otherHousehold()
            : [];
    case "authority": {
      // At home: the subject's parent on record who lives with them, else
      // another older relative in the household (a guardian).
      const kinIn = familyFactsOf(subject);
      const members = household();
      for (const relations of GUARDIAN_RELATIONS) {
        const found = members.filter((id) =>
          relations.includes(kinIn.get(id)?.relation ?? ""),
        );
        if (found.length) return found;
      }
      return [];
    }
    default:
      // The civic roles come from the offices, voting and press records.
      if (CIVIC_FILLS.has(fill))
        return civicFill(fill, core, moment, taken, closest);
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
      // A moment caused by a job (a first or last day) is at that job's employer.
      const employer =
        core.jobs.get(moment.causeId)?.organizationId ??
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
    case "office": {
      // The office the cause record names (the executive's, for a bill on
      // the desk); otherwise an officeholder's office is their post's
      // employer on record.
      const office = core.durableLog.get(moment.causeId)?.facts?.officeId;
      if (typeof office === "string" && office)
        return { kind, recordId: office };
      return job?.organizationId
        ? { kind, recordId: job.organizationId }
        : undefined;
    }
    case "phone":
      return peopleBound > one ? { kind, recordId: moment.causeId } : undefined;
    case "public":
      return { kind, recordId: subject.placeId };
    case "venue":
      return moment.placeId ? { kind, recordId: moment.placeId } : undefined;
    case "chamber": {
      // The body the cause record names (the chamber a vote trade was made in).
      const chamber = core.durableLog.get(moment.causeId)?.facts?.chamber;
      return typeof chamber === "string" && chamber
        ? { kind, recordId: chamber }
        : undefined;
    }
    case "school": {
      // The school the subject attended, from the school engine's record.
      const school = attendedSchool(core, subject.id)?.schoolId;
      return school ? { kind, recordId: school } : undefined;
    }
    default:
      // A letter needs records the new core does not keep yet.
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
  const settings = cause.setting ?? type.setting;
  for (const settingKind of settings) {
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
    const presentReasons: Record<PersonId, string> = {};
    for (const role of type.roles)
      if (presentRoles.has(role.key))
        for (const id of roles.find((row) => row.role === role.key)
          ?.personIds ?? [])
          presentReasons[id] ??= cause.bind?.[role.key] ?? role.fill;
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
      presentReasons,
      setting,
      timing: type.timing,
      ...(cause.opener ? { opener: cause.opener } : {}),
      ...(cause.opening ? { opening: cause.opening } : {}),
      ...(cause.reason ? { reason: cause.reason } : {}),
      ...(cause.said ? { said: cause.said } : {}),
      openUntil: addDays(
        makeIsoDate(moment.date),
        library.scheduling.openDays[type.timing] ?? zero,
      ),
    };
  }
  return failure ?? { failure: "no-place", detail: settings.join(",") };
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
  // A type whose scene is about one bill (a vote asked for) repeats by the
  // bill: on an earlier day in the window the same people about another bill
  // is a new scene; the same day still folds into one sitting.
  const byBill = (row: SceneBinding) =>
    library.types.find((type) => type.key === row.typeKey)?.repeatsBy ===
    "bill";
  const billOf = (momentId: string) =>
    core.durableLog.get(book.momentsById.get(momentId)?.causeId ?? "")?.facts
      ?.billId ?? "";
  const windowKey = (row: SceneBinding, momentId: string) =>
    byBill(row) ? `${castOf(row)}|${billOf(momentId)}` : castOf(row);
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
      .flatMap((entry) =>
        entry.bindings.map((row) =>
          entry.date === moment.date
            ? castOf(row)
            : windowKey(row, entry.momentId),
        ),
      ),
  );
  const wanted = allowed
    ? staged.filter((row) => allowed.has(row.typeKey))
    : staged;
  const eachCause = (row: SceneBinding) =>
    library.types.find((type) => type.key === row.typeKey)?.eachCause ?? false;
  // One type cannot take a season: past its cap of scenes in the season's
  // window, its causes go to the journal (the plan of Oct 28, section 3: the
  // floor vote fired 121 times in one played year).
  const seasonStart = addDays(
    makeIsoDate(moment.date),
    -library.scheduling.seasonCap.days,
  );
  const inSeason = new Map<string, number>();
  for (const entry of book.schedule)
    if (
      entry.date > seasonStart &&
      entry.date <= moment.date &&
      entry.momentId !== moment.id &&
      entry.outcome !== "journal-line"
    )
      for (const typeKey of new Set(entry.bindings.map((row) => row.typeKey)))
        inSeason.set(typeKey, (inSeason.get(typeKey) ?? zero) + one);
  const bindings = wanted.filter(
    (row) =>
      (inSeason.get(row.typeKey) ?? zero) <
        library.scheduling.seasonCap.value &&
      (eachCause(row) ||
        (!sittingToday.has(castOf(row)) &&
          !sittingToday.has(windowKey(row, moment.id)))),
  );
  // The day's own sitting takes this cause in, so its scene cites both
  // records. A sitting on an earlier day within the repeat window does not:
  // that scene has been played.
  const sittings = new Map(
    book.schedule
      .filter(
        (entry) =>
          entry.date === moment.date &&
          entry.momentId !== moment.id &&
          entry.outcome !== "journal-line",
      )
      .flatMap((entry) =>
        entry.bindings.map((row) => [castOf(row), row] as const),
      ),
  );
  for (const row of wanted) {
    if (eachCause(row)) continue;
    const sitting = sittings.get(castOf(row));
    if (!sitting) continue;
    sitting.joined ??= [];
    if (!sitting.joined.some((entry) => entry.momentId === moment.id))
      sitting.joined.push({ momentId: moment.id, causeId: moment.causeId });
  }
  // News from the household's own records (a parent's lost job, a death, a
  // serious illness) is a family scene at home whatever its size (owner,
  // Oct 14, 2026, night: the director picks the family scene the
  // household's records make apply).
  // A record of the whole household (an eviction) is a family scene for
  // each of them, with no one else named.
  // A record of one's own life that names them (a filing, the count of their
  // own race, a story against them) is met where its scene is set that day:
  // at home, or for an officeholder at the office or by phone.
  const household = person.householdId;
  const met = new Set(library.scheduling.ownRecordSettings ?? ["home"]);
  const familyNews =
    (((library.scheduling.householdScenes.includes(moment.label) &&
      moment.counterpartIds.some(
        (id) => core.people.get(id)?.householdId === household,
      )) ||
      (library.scheduling.householdRecordScenes?.includes(moment.label) ??
        false)) &&
      bindings.some((row) => row.setting.kind === "home")) ||
    ((library.scheduling.ownRecordScenes?.includes(moment.label) ?? false) &&
      moment.selfNamed === true &&
      bindings.some((row) => met.has(row.setting.kind)));
  // A tie that turned with someone the person spent time with (a friendship
  // grown over many meetings, a falling-out) is met then, with them: its
  // cause is the relationship record, contacted on the day its change was
  // measured or the day before, as a day's ties are read once it closes.
  const contacted = moment.label.startsWith("tie:")
    ? core.relationships.get(moment.causeId)?.lastContactDate
    : undefined;
  const tieMet =
    !!contacted &&
    contacted >= addDays(makeIsoDate(moment.date), -one) &&
    contacted <= moment.date;
  const waits =
    bindings.length > zero &&
    bindings.every(
      (row) => library.types.find((type) => type.key === row.typeKey)?.waits,
    );
  // Only a staged scene stops the day: a moment no situation stages has
  // nothing to show or answer, so it is the journal's line, never a stop.
  const metHere = (library.scheduling.metWhereYouAre ?? []).some((prefix) =>
    moment.label.startsWith(prefix),
  );
  const stopsDay =
    moment.selfNamed === true &&
    bindings.some(
      (row) => library.types.find((type) => type.key === row.typeKey)?.stopsDay,
    );
  const interrupt =
    bindings.length > zero &&
    (moment.impact >= options.interruptImpact ||
      familyNews ||
      metHere ||
      tieMet ||
      stopsDay) &&
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
