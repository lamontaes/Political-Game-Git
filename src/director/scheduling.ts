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
import { addDays, ageOnDate, makeIsoDate } from "../simulation/dates";
import { P } from "../core2/parameters";
import type { CoreState, IsoDate, PersonId } from "../core2/types";
import situationJson from "./data/situation-types.json" with { type: "json" };
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
    counterpart?: string;
    echo?: string;
    threadTurn?: string;
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
}

export interface SituationLibrary {
  version: string;
  scheduling: {
    paces: Readonly<Record<string, number>>;
    paceBands: readonly { band: string; maxAge?: number }[];
    trailingDays: number;
    openDays: Readonly<Record<string, number>>;
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
  stopsSkip: boolean;
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

function causeMatches(
  cause: SituationCause,
  book: PersonLedger,
  moment: Moment,
): boolean {
  const match = cause.match;
  if (!match) return false;
  if (match.label !== undefined && moment.label !== match.label) return false;
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
function fillRole(
  fill: string,
  core: Readonly<CoreState>,
  book: PersonLedger,
  moment: Moment,
  setting: string | undefined,
  taken: ReadonlySet<PersonId>,
): PersonId[] {
  const subject = core.people.get(moment.personId);
  const household = () =>
    [...(core.households.get(subject?.householdId ?? "")?.memberIds ?? [])]
      .filter((id) => alive(core, id) && !taken.has(id))
      .sort();
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
    case "kin":
      return [...book.threads.values()]
        .filter(
          (thread) =>
            thread.kin.length &&
            alive(core, thread.otherId) &&
            !taken.has(thread.otherId),
        )
        .map((thread) => thread.otherId)
        .sort();
    case "coworkers":
      return coworkers();
    case "present":
      return setting === "home"
        ? household()
        : setting === "workplace"
          ? coworkers()
          : [];
    default:
      // Classmates, authority and absent have no records in the new core yet.
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
    case "workplace":
      return job ? { kind, recordId: job.organizationId } : undefined;
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
  options: { mode: string; interruptImpact: number },
  library: SituationLibrary = SITUATION_LIBRARY,
): ScheduleEntry {
  const person = core.people.get(moment.personId);
  if (!person) throw new Error(`Scheduled moment has no person: ${moment.id}`);
  const pace = paceOf(library, person.birthDate, moment.date);
  const rank = paceRank(library, book, moment);
  const interrupt = moment.impact >= options.interruptImpact;
  const bindings: SceneBinding[] = [];
  let coverage: CoverageRow | undefined;
  for (const type of library.types)
    for (const cause of type.causes) {
      if (!causeMatches(cause, book, moment)) continue;
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
      else if (!bindings.some((row) => row.typeKey === bound.typeKey))
        bindings.push(bound);
    }
  if (!bindings.length)
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
    stopsSkip: !live && interrupt,
    rank,
    pace,
    bindings,
    ...(bindings.length ? {} : { coverage }),
  };
}
