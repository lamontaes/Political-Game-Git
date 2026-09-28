/**
 * THE WORLD REPORT — what a world with nobody played did, month by month.
 *
 *   npm run world:report -- --years 5 --seed round-1 --place 3918000 \
 *     [--out docs/reports/world-report/columbus-ohio-round-1.md] \
 *     [--keep test-results/world-report/columbus-ohio-round-1.run.json]
 *   npm run world:report -- --from <kept run.json> --out <file.md>
 *
 * The world is opened exactly as "Watch the world" opens one, in the named
 * place, and moved only by the observer clock's "A day" button
 * (`scripts/dev-lab/world-aging.ts`). Nothing is chosen for anyone and
 * nothing is added to make the report fuller.
 *
 * Then it is read back. Every line of the chronicle is built from one or more
 * records the world saved while it ran — a record is "new" when its sequence
 * number is later than the event that opened the watched world — and names
 * those records in an HTML comment at the end of the line, so any line can be
 * traced. The only thing computed during the run rather than read afterward is
 * who held each executive office at the start of each month, and that too is
 * read from the world's own records on that day.
 *
 * "What never happened" is the point of the report: checks for things a
 * living world should show over years, each with the counts that decided it.
 *
 * This is a development tool for reviewing the living world. It is never part
 * of play.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { ageOnDate, personName } from "../../src/simulation";
import type { EntityId, IsoDate, World } from "../../src/simulation";
import {
  organizationNameAt,
  publicPartyAffiliation,
} from "../../src/simulation/living-world";
import { deathCausePhrase } from "../../src/simulation/crisis/death-causes";
import { organizationParticipationStateAt } from "../../src/simulation/life-queries";
import { MISCONDUCT_FAMILY_LABELS } from "../../src/simulation/press/records";
import {
  deserializeWorld,
  serializeWorld,
} from "../../src/simulation/serialization";
import { currentPublicOfficeholders } from "../../src/presentation/opening-officeholders";
import { proseDate } from "../../src/presentation/prose-dates";
import startingLaw from "../../data/research/laws/starting-law-2026.json" with { type: "json" };
import { lawInForce } from "../../src/simulation/governing/law-in-force";
import { stateJurisdictionForKey } from "../../src/simulation/life-places";
import { STATES } from "../../src/simulation/state-reference";
import {
  jurisdictionPowersLevels,
  questionAuthority,
} from "../../src/simulation/governing/question-authority";
import {
  OUTCOME_LINKS,
  OUTCOMES_PRODUCED,
  outcomeFactor,
  outcomeLinkStatus,
} from "../../src/simulation/outcome-web";
import {
  PLACE_OUTCOME_BASES,
  PLACE_OUTCOME_MEASURES,
  placeOutcomeKey,
  placeOutcomeRecords,
  placeOutcomeValueText,
} from "../../src/simulation/outcome-web/place-outcomes";
import {
  anniversary,
  createObserverDayButton,
  formattedMarkdown,
  openWatchedWorld,
} from "../dev-lab/world-aging";

/* -------------------------------------------------------------------------- */
/* Running the world                                                           */
/* -------------------------------------------------------------------------- */

export interface WorldReportOptions {
  readonly years: number;
  readonly seed: string;
  readonly placeKey: string;
  /** Press exactly this many Days instead of `years` (for tests). */
  readonly days?: number;
}

export interface OfficeholderRow {
  readonly officeKey: string;
  readonly title: string;
  readonly personId: EntityId;
  readonly personName: string;
  readonly termId: EntityId;
  readonly startedAt: IsoDate | null;
}

export interface OfficeholderSnapshot {
  readonly date: IsoDate;
  readonly holders: readonly OfficeholderRow[];
}

export interface WorldReportRun {
  readonly options: WorldReportOptions;
  readonly placeName: string;
  readonly anchorPersonId: EntityId;
  readonly startedOn: IsoDate;
  readonly daysPressed: number;
  /** Why the Day button stopped before the last year, if it did. */
  readonly stopped: string | null;
  readonly world: World;
  /** Who held each executive office at the opening and each month's start. */
  readonly officeholders: readonly OfficeholderSnapshot[];
}

function officeholderSnapshot(world: World): OfficeholderSnapshot {
  return {
    date: world.currentDate,
    holders: currentPublicOfficeholders(world).map((holder) => ({
      officeKey: holder.officeKey,
      title: holder.title,
      personId: holder.personId,
      personName: holder.personName,
      termId: holder.termId,
      startedAt: holder.startedAt ?? null,
    })),
  };
}

export function runWorldReport(options: WorldReportOptions): WorldReportRun {
  const watched = openWatchedWorld(options.seed, options.placeKey);
  const button = createObserverDayButton(watched.world);
  const startedOn = watched.world.currentDate;
  const until = anniversary(startedOn, options.years);
  const done = () =>
    options.days === undefined
      ? button.world.currentDate >= until
      : daysPressed >= options.days;
  const officeholders = [officeholderSnapshot(button.world)];
  let daysPressed = 0;
  let stopped: string | null = null;
  while (!done()) {
    const month = button.world.currentDate.slice(0, 7);
    const pressed = button.press();
    if (pressed.status === "stopped") {
      stopped = `The Day button stopped on ${proseDate(button.world.currentDate)}: ${pressed.problem}`;
      break;
    }
    daysPressed += 1;
    if (button.world.currentDate.slice(0, 7) !== month)
      officeholders.push(officeholderSnapshot(button.world));
  }
  return {
    options,
    placeName: watched.placeName,
    anchorPersonId: watched.anchorPersonId,
    startedOn,
    daysPressed,
    stopped,
    world: button.world,
    officeholders,
  };
}

/* -------------------------------------------------------------------------- */
/* Reading the record                                                          */
/* -------------------------------------------------------------------------- */

type Section =
  | "elections"
  | "offices"
  | "laws"
  | "local"
  | "executive"
  | "parties"
  | "deaths"
  | "disasters"
  | "press"
  | "crime"
  | "people"
  | "economy"
  | "abroad"
  | "other";

const SECTION_TITLES: Readonly<Record<Section, string>> = {
  elections: "Elections",
  offices: "Offices changing hands",
  laws: "Bills and laws",
  local: "Local government",
  executive: "Executive decisions",
  parties: "Parties",
  deaths: "Deaths",
  disasters: "Disasters and emergencies",
  press: "Scandals and the press",
  crime: "Crime",
  people: "People near the place",
  economy: "Economy and population",
  abroad: "Abroad",
  other: "Everything else the record shows",
};

const SECTION_ORDER = Object.keys(SECTION_TITLES) as Section[];

export interface ChronicleLine {
  readonly date: IsoDate;
  readonly section: Section;
  readonly text: string;
  /** Items listed under the line, for a line that sums up many records. */
  readonly details?: readonly string[];
  /** Ids of the saved records the line is built from. */
  readonly sources: readonly string[];
}

export interface NeverCheck {
  readonly key: string;
  /** Said as what did not happen, e.g. "No state law changed a tax." */
  readonly never: string;
  /** Said as what did happen, when it did. */
  readonly happened: string;
  readonly didHappen: boolean;
  /** The counts that decided it. */
  readonly evidence: string;
}

interface AnyRecord {
  readonly id: string;
  readonly sequence: number;
  readonly [field: string]: unknown;
}

interface EventRecord extends AnyRecord {
  readonly type: string;
  readonly occurredAt: IsoDate;
  readonly jurisdictionId: EntityId | null;
  readonly involvedEntityIds: readonly string[];
  readonly participants: readonly {
    readonly personId: EntityId;
    readonly role: string;
    readonly detail: string | null;
  }[];
  readonly visibility: string;
  readonly tags: readonly string[];
  readonly summary: string;
}

/** The record arrays a bill's own passage, the news and people's minds write. */
const PASSAGE_AND_BOOKKEEPING = new Set([
  "legislativeMeasures",
  "legislativeActions",
  "committeeReferrals",
  "committeeActions",
  "legislativeAmendments",
  "legislativeVotes",
  "executiveDispositions",
  "legislativeEnactments",
  "legislativeCommitments",
  "legislativeNegotiations",
  "legislativeDraftLineages",
  "officeVoteInstructions",
  "officeBriefingInspections",
  "officeWorkflowPreferences",
  "events",
  "publications",
  "pressRecords",
  "futureDueItems",
  "futureDueItemStates",
  "decisionTraces",
  "memories",
  "knowledge",
  "claims",
  "propositionExposures",
  "appraisals",
  "perceptions",
  "relationshipInteractions",
  "workItems",
  "workItemStates",
  "scheduledActivities",
  "scheduledActivityStates",
]);

/** Legislative process steps the chronicle folds into "filed" and "outcome". */
const PASSAGE_STEP_EVENTS = new Set([
  "legislation.committee-hearing",
  "legislation.committee-reported",
  "legislation.committee-not-reported",
  "legislation.floor-stage-passed",
  "legislation.floor-stage-failed",
  "legislation.measure-cosponsored",
  "legislation.measure-enrolled",
  "legislation.measure-presented",
  "legislation.measure-signed",
  "legislation.measure-transmitted",
  "legislation.placed-on-calendar",
  "legislation.measure-referred",
  "legislation.measure-introduced",
  "legislation.measure-enacted",
  "legislation.sponsor-motive",
]);

/** Bookkeeping that is never a happening: the clock, setup, standing tenure. */
const QUIET_EVENT = [/^simulation\./, /^setup\./, /^game\./, /^life\.scene\./];

const OUTCOME_LABEL: Readonly<Record<string, string>> = {
  enacted: "became law",
  "failed-in-committee": "died in committee",
  "failed-on-floor": "was voted down",
  "failed-concurrence": "died when the chambers never agreed",
  "vetoed-and-sustained": "was vetoed, and the veto stood",
  "died-on-adjournment": "died when the session ended",
};

const PARTNERSHIP_STARTED: Readonly<Record<string, string>> = {
  "legal:marriage": "married",
  "legal:civil-union": "entered a civil union",
  "legal:domestic-partnership": "registered a domestic partnership",
  "romantic:cohabiting": "moved in together",
  "romantic:dating": "started dating",
};

export class WorldRecordReader {
  readonly world: World;
  readonly history: Record<string, readonly AnyRecord[]>;
  readonly openingSequence: number;
  readonly placeJurisdictionId: EntityId;
  readonly placeName: string;
  readonly stateName: string | null;
  readonly startedOn: IsoDate;
  readonly endedOn: IsoDate;
  readonly events: readonly EventRecord[];
  readonly newEvents: readonly EventRecord[];

  constructor(world: World, anchorPersonId: EntityId) {
    this.world = world;
    this.history = world.history as unknown as Record<
      string,
      readonly AnyRecord[]
    >;
    this.events = world.history.events as unknown as readonly EventRecord[];
    const opened = this.events.find(
      (event) => event.type === "game.observer-opened",
    );
    if (!opened)
      throw new Error("This world was not opened with nobody played in it.");
    // The opening's last record; everything after it happened while watched.
    this.openingSequence = opened.sequence + 1;
    this.startedOn = opened.occurredAt;
    this.endedOn = world.currentDate;
    const anchor = world.people[anchorPersonId];
    if (!anchor) throw new Error("The watched world's resident is missing.");
    this.placeJurisdictionId = anchor.homeJurisdictionId;
    this.placeName = this.jurisdictionName(anchor.homeJurisdictionId);
    this.stateName =
      world.jurisdictions[anchor.homeJurisdictionId]?.parentName ?? null;
    this.newEvents = this.events.filter((event) => this.isNew(event));
  }

  #titles: Map<string, string> | null = null;

  /** The latest role title on a work relationship. */
  roleTitle(relationshipId: string): string | null {
    if (!this.#titles) {
      this.#titles = new Map();
      for (const role of this.history.workRoles ?? [])
        this.#titles.set(
          role.workRelationshipId as string,
          role.title as string,
        );
    }
    return this.#titles.get(relationshipId) ?? null;
  }

  /** Whether text names the place's state ("West Virginia" is not Virginia). */
  mentionsState(text: string): boolean {
    if (!this.stateName) return false;
    return new RegExp(`(?<!West )\\b${this.stateName}\\b`).test(text);
  }

  isNew(record: { readonly sequence: number }): boolean {
    return record.sequence >= this.openingSequence;
  }

  added(arrayName: string): readonly AnyRecord[] {
    return (this.history[arrayName] ?? []).filter((record) =>
      this.isNew(record),
    );
  }

  jurisdictionName(id: EntityId | null | undefined): string {
    if (!id) return "";
    return this.world.jurisdictions[id]?.name ?? "";
  }

  name(personId: EntityId | null | undefined): string {
    const person = personId ? this.world.people[personId] : undefined;
    return person ? personName(person) : "someone the record does not name";
  }

  party(personId: EntityId): string | null {
    const partyId = publicPartyAffiliation(this.world, personId);
    return partyId ? organizationNameAt(this.world, partyId) : null;
  }

  nameWithParty(personId: EntityId): string {
    const party = this.party(personId);
    return party ? `${this.name(personId)} (${party})` : this.name(personId);
  }

  organization(id: EntityId | null | undefined): string {
    if (!id) return "an employer the record does not name";
    return (
      organizationNameAt(this.world, id) ??
      "an organization the record does not name"
    );
  }

  isLocal(jurisdictionId: EntityId | null | undefined): boolean {
    const kind = jurisdictionId
      ? this.world.jurisdictions[jurisdictionId]?.kind
      : undefined;
    return (
      kind !== undefined && kind !== "federal" && !kind.startsWith("state")
    );
  }

  /** People living in the place at the end, and anyone who moved away from it. */
  nearPeople(): Set<EntityId> {
    const near = new Set<EntityId>();
    for (const person of Object.values(this.world.people))
      if (person.homeJurisdictionId === this.placeJurisdictionId)
        near.add(person.id);
    for (const event of this.newEvents)
      if (
        event.type.startsWith("migration.") &&
        event.involvedEntityIds.includes(this.placeJurisdictionId)
      )
        for (const participant of event.participants)
          near.add(participant.personId);
    return near;
  }
}

function inWindow(reader: WorldRecordReader, date: IsoDate): IsoDate {
  return date < reader.startedOn ? reader.startedOn : date;
}

function names(
  reader: WorldRecordReader,
  ids: readonly EntityId[],
  limit = 8,
): string {
  const shown = ids.slice(0, limit).map((id) => reader.name(id));
  const rest = ids.length - shown.length;
  return rest > 0 ? `${shown.join(", ")} and ${rest} more` : shown.join(", ");
}

function list(items: readonly string[]): string {
  if (items.length <= 1) return items.join("");
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;
}

function count(value: number, one: string, many = `${one}s`): string {
  return `${value.toLocaleString("en-US")} ${value === 1 ? one : many}`;
}

function tagValue(event: EventRecord, prefix: string): string | null {
  const tag = event.tags.find((entry) => entry.startsWith(prefix));
  return tag ? tag.slice(prefix.length) : null;
}

/* -------------------------------------------------------------------------- */
/* The chronicle, section by section                                           */
/* -------------------------------------------------------------------------- */

/** Who held an office at the last month's start on or before a date. */
function incumbentOf(
  snapshots: readonly OfficeholderSnapshot[],
  officeKey: string,
  date: IsoDate,
): OfficeholderRow | undefined {
  return [...snapshots]
    .filter((snapshot) => snapshot.date <= date)
    .at(-1)
    ?.holders.find((holder) => holder.officeKey === officeKey);
}

function electionLines(
  reader: WorldRecordReader,
  snapshots: readonly OfficeholderSnapshot[],
): ChronicleLine[] {
  const lines: ChronicleLine[] = [];
  // Announcements. A national round of them is one line, with the ones for
  // the place's own state named.
  const intentGroups = new Map<string, EventRecord[]>();
  for (const event of reader.newEvents) {
    if (!event.type.endsWith("candidacy-intent")) continue;
    const key = `${event.type}|${event.occurredAt}`;
    intentGroups.set(key, [...(intentGroups.get(key) ?? []), event]);
  }
  for (const group of intentGroups.values()) {
    const first = group[0]!;
    const described = (event: EventRecord) => {
      const who = event.participants[0]?.personId;
      const summary = event.summary.replace(/\.$/, "");
      return who ? `${summary} (${reader.name(who)})` : summary;
    };
    if (group.length <= 3) {
      for (const event of group)
        lines.push({
          date: event.occurredAt,
          section: "elections",
          text: `${described(event)}.`,
          sources: [event.id],
        });
      continue;
    }
    const intents = new Map<string, number>();
    for (const event of group) {
      const intent = tagValue(event, "intent:") ?? "unstated";
      intents.set(intent, (intents.get(intent) ?? 0) + 1);
    }
    const home = group.filter(
      (event) =>
        reader.mentionsState(event.summary) && event.jurisdictionId !== null,
    );
    const said = [...intents]
      .map(([intent, value]) => `${value} ${intent.replace(/-/g, " ")}`)
      .join(", ");
    lines.push({
      date: first.occurredAt,
      section: "elections",
      text: `${count(group.length, "officeholder")} said whether they would run again (${first.type.replace(/^election\./, "").replace(/-candidacy-intent$/, "")}): ${said}.${home.length > 0 ? ` In ${reader.stateName}:` : ""}`,
      details: home.map((event) => `${described(event)}.`),
      sources: group.slice(0, 12).map((event) => event.id),
    });
  }
  // Contests the world ran with a named field, and their results.
  const contests = new Map(
    reader
      .added("electionContests")
      .map((contest) => [contest.id, contest] as const),
  );
  for (const contest of contests.values()) {
    const office = (contest.office as { title: string }).title;
    const candidates = contest.candidatePersonIds as readonly EntityId[];
    lines.push({
      date: contest.scheduledAt as IsoDate,
      section: "elections",
      text: `The ballot for ${office} (${reader.jurisdictionName(contest.jurisdictionId as EntityId) || "no place recorded"}) closed with ${count(candidates.length, "candidate")}${candidates.length ? `: ${list(candidates.map((id) => reader.nameWithParty(id)))}` : ""}. Election day: ${proseDate(contest.electionDate as string)}.`,
      sources: [contest.id],
    });
  }
  for (const result of reader.added("electionContestResults")) {
    const contest = (reader.history.electionContests ?? []).find(
      (row) => row.id === result.contestId,
    );
    const office = contest
      ? (contest.office as { title: string; officeKey: string })
      : null;
    const incumbent = office
      ? incumbentOf(snapshots, office.officeKey, result.resolvedAt as IsoDate)
      : undefined;
    const tallies = (
      result.tallies as readonly {
        candidatePersonId: EntityId;
        votes: number;
        voteShare: number;
      }[]
    )
      .slice()
      .sort((left, right) => right.votes - left.votes)
      .map(
        (tally) =>
          `${reader.nameWithParty(tally.candidatePersonId)}${incumbent?.personId === tally.candidatePersonId ? ", the incumbent," : ""} ${tally.votes.toLocaleString("en-US")} votes (${(tally.voteShare * 100).toFixed(1)}%)`,
      );
    lines.push({
      date: result.resolvedAt as IsoDate,
      section: "elections",
      text: `${office?.title ?? "A race"}: ${reader.name(result.winnerPersonId as EntityId)} won. ${tallies.join("; ")}.`,
      sources: [result.id, ...(contest ? [contest.id] : [])],
    });
  }
  // Everything else under election.*, as the record words it.
  for (const event of reader.newEvents) {
    if (!event.type.startsWith("election.")) continue;
    if (event.type.endsWith("candidacy-intent")) continue;
    if (event.type === "election.contest-resolved") continue;
    lines.push({
      date: event.occurredAt,
      section: "elections",
      text: event.summary,
      sources: [event.id],
    });
  }
  return lines;
}

interface CongressSeatChange {
  readonly event: EventRecord;
  readonly before: EventRecord;
  /** The member replaced had said, that election, they were running again. */
  readonly wasSeeking: boolean;
}

const DAY_MS = 86_400_000;

/** Every seat in Congress whose holder changed while the world was watched. */
function congressSeatChanges(reader: WorldRecordReader): CongressSeatChange[] {
  const intents = new Map<string, EventRecord[]>();
  for (const event of reader.events) {
    if (event.type !== "election.congress-candidacy-intent") continue;
    const seat = tagValue(event, "seat:");
    if (seat) intents.set(seat, [...(intents.get(seat) ?? []), event]);
  }
  const lastHolder = new Map<string, EventRecord>();
  const found: CongressSeatChange[] = [];
  for (const event of reader.events) {
    if (event.type !== "world.legislative-seat-tenure") continue;
    const seat = tagValue(event, "seat:");
    if (!seat) continue;
    const before = lastHolder.get(seat);
    lastHolder.set(seat, event);
    if (!reader.isNew(event) || !before) continue;
    const then = before.participants[0]?.personId;
    const now = event.participants[0]?.personId;
    if (!now || now === then) continue;
    // The intent that member stated at the election just before this term.
    const intent = (intents.get(seat) ?? [])
      .filter(
        (row) =>
          row.occurredAt <= event.occurredAt &&
          Date.parse(event.occurredAt) - Date.parse(row.occurredAt) <=
            120 * DAY_MS &&
          row.participants[0]?.personId === then,
      )
      .at(-1);
    found.push({
      event,
      before,
      wasSeeking: intent?.tags.includes("intent:seeking") ?? false,
    });
  }
  return found;
}

function officeLines(
  reader: WorldRecordReader,
  snapshots: readonly OfficeholderSnapshot[],
): ChronicleLine[] {
  const lines: ChronicleLine[] = [];
  // Executive offices: who held each at the start of each month.
  for (let index = 1; index < snapshots.length; index += 1) {
    const before = snapshots[index - 1]!;
    const after = snapshots[index]!;
    for (const holder of after.holders) {
      const previous = before.holders.find(
        (row) => row.officeKey === holder.officeKey,
      );
      if (previous?.personId === holder.personId) continue;
      lines.push({
        date: holder.startedAt ?? after.date,
        section: "offices",
        text: previous
          ? `${holder.personName} became ${holder.title}, succeeding ${previous.personName}.`
          : `${holder.personName} became ${holder.title}; nobody held it at the start of the month before.`,
        sources: [holder.termId, ...(previous ? [previous.termId] : [])],
      });
    }
    for (const previous of before.holders)
      if (!after.holders.some((row) => row.officeKey === previous.officeKey))
        lines.push({
          date: after.date,
          section: "offices",
          text: `${previous.personName} no longer held ${previous.title}, and the record names nobody after them.`,
          sources: [previous.termId],
        });
  }
  // Congress: a seat's new tenure against the tenure before it.
  const changes = new Map<IsoDate, CongressSeatChange[]>();
  for (const change of congressSeatChanges(reader))
    changes.set(change.event.occurredAt, [
      ...(changes.get(change.event.occurredAt) ?? []),
      change,
    ]);
  for (const [date, group] of changes) {
    // A few changes on one day are named; a national round names the state's.
    const named =
      group.length <= 5
        ? group
        : group.filter(({ event }) =>
            reader.mentionsState(event.participants[0]?.detail ?? ""),
          );
    lines.push({
      date,
      section: "offices",
      text: `${count(group.length, "seat")} in Congress changed hands.${named.length && named.length < group.length ? ` In ${reader.stateName}:` : ""}`,
      details: named.map(
        ({ event, before, wasSeeking }) =>
          `${reader.nameWithParty(event.participants[0]!.personId)} replaced ${reader.name(before.participants[0]?.personId)} as ${event.participants[0]!.detail ?? "a member"}${wasSeeking ? `, although ${reader.name(before.participants[0]?.personId)} had said they were seeking another term` : ""}.`,
      ),
      sources: group.slice(0, 12).map(({ event }) => event.id),
    });
  }
  // Legislative seats kept as work: the member whose term ended, and who took it.
  const relationships = (reader.history.workRelationships ?? []).filter(
    (row) => row.kind === "employment:legislative-member",
  );
  const statuses = reader.history.workStatuses ?? [];
  const titleOf = (relationshipId: string) => reader.roleTitle(relationshipId);
  for (const started of reader.added("workRelationships")) {
    if (started.kind !== "employment:legislative-member") continue;
    const title = titleOf(started.id);
    if (!title) continue;
    const predecessor = relationships
      .filter(
        (other) =>
          other.id !== started.id &&
          titleOf(other.id) === title &&
          (other.startedAt as string) < (started.startedAt as string),
      )
      .at(-1);
    const ended = predecessor
      ? statuses.find(
          (status) =>
            status.workRelationshipId === predecessor.id &&
            status.status === "ended",
        )
      : undefined;
    lines.push({
      date: started.startedAt as IsoDate,
      section: "offices",
      text: predecessor
        ? `${title}: ${reader.nameWithParty(started.personId as EntityId)} took the seat from ${reader.name(predecessor.personId as EntityId)}${ended?.reason ? ` (${String(ended.reason).replace(/\.$/, "").toLowerCase()})` : ""}.`
        : `${title}: ${reader.nameWithParty(started.personId as EntityId)} took the seat.`,
      sources: [started.id, ...(ended ? [ended.id] : [])],
    });
  }
  for (const event of reader.newEvents)
    if (
      event.type === "world.legislative-seat-vacancy" ||
      event.type === "crisis.officeholder-died" ||
      event.type === "governing.office-continuity" ||
      event.type === "world.office-tenure"
    )
      lines.push({
        date: event.occurredAt,
        section: "offices",
        text: event.summary,
        sources: [event.id],
      });
  return lines;
}

/** Every record outside a bill's own passage that names the bill. */
function lawConsequences(
  reader: WorldRecordReader,
): Map<string, { array: string; id: string }[]> {
  const measureIds = new Set<string>();
  for (const measure of reader.history.legislativeMeasures ?? [])
    measureIds.add(measure.id);
  for (const enactment of reader.history.legislativeEnactments ?? [])
    measureIds.add(enactment.id);
  const enactmentMeasure = new Map(
    (reader.history.legislativeEnactments ?? []).map((row) => [
      row.id,
      row.measureId as string,
    ]),
  );
  const found = new Map<string, { array: string; id: string }[]>();
  for (const [array, records] of Object.entries(reader.history)) {
    if (!Array.isArray(records) || PASSAGE_AND_BOOKKEEPING.has(array)) continue;
    for (const record of records) {
      const text = JSON.stringify(record);
      for (const match of text.matchAll(
        /legislative-(?:measure|enactment)_[0-9a-f]+/g,
      )) {
        if (!measureIds.has(match[0])) continue;
        const measureId = enactmentMeasure.get(match[0]) ?? match[0];
        const seen = found.get(measureId) ?? [];
        if (!seen.some((row) => row.id === record.id))
          seen.push({ array, id: record.id });
        found.set(measureId, seen);
      }
    }
  }
  return found;
}

function lawLines(
  reader: WorldRecordReader,
  consequences: Map<string, { array: string; id: string }[]>,
): ChronicleLine[] {
  const lines: ChronicleLine[] = [];
  const measures = new Map(
    (reader.history.legislativeMeasures ?? []).map(
      (measure) => [measure.id, measure] as const,
    ),
  );
  const motives = new Map<string, EventRecord>();
  for (const event of reader.events)
    if (event.type === "legislation.sponsor-motive")
      for (const id of event.involvedEntityIds)
        if (measures.has(id)) motives.set(id, event);
  for (const measure of reader.added("legislativeMeasures")) {
    const motive = motives.get(measure.id);
    const sponsor = measure.sponsorPersonId as EntityId | null;
    lines.push({
      date: measure.introducedAt as IsoDate,
      section: "laws",
      text: `${reader.jurisdictionName(measure.jurisdictionId as EntityId)}: ${measure.designation as string} — ${measure.shortTitle as string} — was filed${sponsor ? ` by ${reader.nameWithParty(sponsor)}` : ""}. ${motive ? motive.summary : (measure.summary as string)}`,
      sources: [measure.id, ...(motive ? [motive.id] : [])],
    });
  }
  for (const enactment of reader.added("legislativeEnactments")) {
    const measure = measures.get(enactment.measureId as string);
    const label = measure
      ? `${reader.jurisdictionName(measure.jurisdictionId as EntityId)}: ${measure.designation as string} — ${measure.shortTitle as string}`
      : "A bill";
    const outcome = enactment.outcome as string;
    if (outcome !== "enacted") {
      lines.push({
        date: enactment.resolvedAt as IsoDate,
        section: "laws",
        text: `${label} ${OUTCOME_LABEL[outcome] ?? outcome}.`,
        sources: [enactment.id],
      });
      continue;
    }
    const changed = consequences.get(enactment.measureId as string) ?? [];
    const byArray = new Map<string, number>();
    for (const row of changed)
      byArray.set(row.array, (byArray.get(row.array) ?? 0) + 1);
    lines.push({
      date: enactment.resolvedAt as IsoDate,
      section: "laws",
      text: `${label} became law${enactment.effectiveAt ? `, effective ${proseDate(enactment.effectiveAt as string)}` : ""}. What it changed in the world's records: ${changed.length === 0 ? "nothing outside its own passage" : list([...byArray].map(([array, value]) => `${value} ${array} record${value === 1 ? "" : "s"}`))}.`,
      sources: [enactment.id, ...changed.slice(0, 6).map((row) => row.id)],
    });
  }
  for (const event of reader.newEvents)
    if (
      (event.type.startsWith("legislation.") &&
        !PASSAGE_STEP_EVENTS.has(event.type)) ||
      event.type.startsWith("constitution.")
    )
      lines.push({
        date: event.occurredAt,
        section: "laws",
        text: event.summary,
        sources: [event.id],
      });
  return lines;
}

function eventLines(
  reader: WorldRecordReader,
  section: Section,
  test: (event: EventRecord) => boolean,
  describe: (event: EventRecord) => string = (event) => event.summary,
): ChronicleLine[] {
  return reader.newEvents.filter(test).map((event) => ({
    date: event.occurredAt,
    section,
    text: describe(event),
    sources: [event.id],
  }));
}

function partyLines(reader: WorldRecordReader): ChronicleLine[] {
  return eventLines(
    reader,
    "parties",
    (event) =>
      event.type.startsWith("party.") &&
      event.type !== "party.chapter-meeting-invited",
    (event) => {
      const dissent = event.participants.filter(
        (participant) => participant.detail === "Dissented",
      ).length;
      return event.type === "party.body-decision"
        ? `${event.summary} (${count(event.participants.length, "member")} took part; ${dissent} dissented.)`
        : event.summary;
    },
  );
}

function deathLines(reader: WorldRecordReader): ChronicleLine[] {
  return reader.added("personDeaths").map((death) => {
    const person = reader.world.people[death.personId as EntityId];
    const age = person
      ? `, ${ageOnDate(person.birthDate, death.diedAt as IsoDate)}`
      : "";
    const home = person
      ? reader.jurisdictionName(person.homeJurisdictionId)
      : "";
    const how = deathCausePhrase(death.causeKey as string);
    return {
      date: death.diedAt as IsoDate,
      section: "deaths",
      text: `${reader.name(death.personId as EntityId)}${age}${home ? `, of ${home}` : ""}, died${how ? ` ${how}` : ""}.`,
      sources: [death.id],
    };
  });
}

function disasterLines(reader: WorldRecordReader): ChronicleLine[] {
  return eventLines(
    reader,
    "disasters",
    (event) =>
      event.type.startsWith("crisis.") &&
      event.type !== "crisis.officeholder-died" &&
      event.visibility === "public",
    (event) => {
      if (event.type !== "crisis.hazard-occurred") return event.summary;
      const places = event.involvedEntityIds
        .filter((id) => reader.world.jurisdictions[id as EntityId])
        .map((id) => reader.jurisdictionName(id as EntityId));
      return places.length
        ? `${event.summary} Places named: ${list(places)}.`
        : event.summary;
    },
  );
}

function pressLines(reader: WorldRecordReader): ChronicleLine[] {
  const lines: ChronicleLine[] = [];
  for (const record of reader.added("pressRecords")) {
    if (record.kind === "matter")
      lines.push({
        date: record.openedAt as IsoDate,
        section: "press",
        text: `A misconduct matter was opened: ${MISCONDUCT_FAMILY_LABELS[record.family as keyof typeof MISCONDUCT_FAMILY_LABELS] ?? (record.family as string)}, about ${names(reader, record.subjectPersonIds as EntityId[]) || "nobody named"}.`,
        sources: [record.id],
      });
    else if (record.kind === "matter-allegation")
      lines.push({
        date: record.allegedAt as IsoDate,
        section: "press",
        text: `${record.allegerPersonId ? reader.name(record.allegerPersonId as EntityId) : "Someone unnamed"} alleged${record.publicAllegation ? " publicly" : " privately"}: ${record.statement as string}`,
        sources: [record.id],
      });
    else if (record.kind === "matter-proceeding")
      lines.push({
        date: record.openedAt as IsoDate,
        section: "press",
        text: `${record.institutionLabel as string} opened a proceeding against ${names(reader, record.respondentPersonIds as EntityId[]) || "nobody named"}.`,
        sources: [record.id],
      });
    else if (record.kind === "proceeding-step" && record.outcome)
      lines.push({
        date: record.at as IsoDate,
        section: "press",
        text: `A proceeding reached "${String(record.outcome).replace(/-/g, " ")}" at the step "${record.step as string}".`,
        sources: [record.id],
      });
  }
  lines.push(
    ...eventLines(
      reader,
      "press",
      (event) =>
        (event.type.startsWith("press.") &&
          event.type !== "press.story-published") ||
        event.type.startsWith("matter."),
    ),
  );
  // Stories: one line per headline a month, with every outlet that ran it.
  const stories = new Map<string, AnyRecord[]>();
  for (const publication of reader.added("publications")) {
    if (publication.kind !== "press-story") continue;
    const key = `${(publication.publishedAt as string).slice(0, 7)}|${publication.headline as string}`;
    stories.set(key, [...(stories.get(key) ?? []), publication]);
  }
  for (const group of stories.values()) {
    const outlets = [...new Set(group.map((row) => row.outletName as string))];
    lines.push({
      date: group[0]!.publishedAt as IsoDate,
      section: "press",
      text: `Story: "${group[0]!.headline as string}" (${list(outlets)}${group.length > outlets.length ? `, ${group.length} editions` : ""}).`,
      sources: group.slice(0, 6).map((row) => row.id),
    });
  }
  return lines;
}

function crimeLines(reader: WorldRecordReader): ChronicleLine[] {
  const lines: ChronicleLine[] = [];
  const reports = new Map<string, EventRecord[]>();
  for (const event of reader.newEvents) {
    if (!event.type.startsWith("crime.")) continue;
    if (event.type === "crime.offense-reported") {
      const month = event.occurredAt.slice(0, 7);
      reports.set(month, [...(reports.get(month) ?? []), event]);
    } else
      lines.push({
        date: event.occurredAt,
        section: "crime",
        text: event.summary,
        sources: [event.id],
      });
  }
  for (const group of reports.values()) {
    const where = new Map<string, number>();
    for (const event of group) {
      const place =
        reader.jurisdictionName(event.jurisdictionId) || "no place recorded";
      where.set(place, (where.get(place) ?? 0) + 1);
    }
    lines.push({
      date: group[0]!.occurredAt,
      section: "crime",
      text: `Police took ${count(group.length, "report")} of offenses: ${list([...where].map(([place, value]) => `${value} in ${place}`))}.`,
      sources: group.slice(0, 8).map((event) => event.id),
    });
  }
  return lines;
}

function peopleLines(reader: WorldRecordReader): ChronicleLine[] {
  const lines: ChronicleLine[] = [];
  const near = reader.nearPeople();
  const touches = (ids: readonly EntityId[]) => ids.some((id) => near.has(id));
  const partnerships = new Map(
    (reader.history.partnerships ?? []).map((row) => [row.id, row] as const),
  );
  for (const partnership of reader.added("partnerships")) {
    const people = partnership.personIds as EntityId[];
    if (!touches(people)) continue;
    const kind = partnership.kind as string;
    lines.push({
      date: partnership.startedAt as IsoDate,
      section: "people",
      text: `${names(reader, people).replace(", ", " and ")} ${PARTNERSHIP_STARTED[kind] ?? `began a partnership (${kind})`}.`,
      sources: [partnership.id],
    });
  }
  for (const state of reader.added("partnershipStates")) {
    if (state.supersedesStateId === null) continue;
    const partnership = partnerships.get(state.partnershipId as string);
    const people = (partnership?.personIds as EntityId[] | undefined) ?? [];
    if (!touches(people)) continue;
    lines.push({
      date: state.effectiveAt as IsoDate,
      section: "people",
      text: `${names(reader, people).replace(", ", " and ")}: their ${String(partnership?.kind ?? "partnership").split(":")[1]} is now ${state.status as string}.`,
      sources: [state.id],
    });
  }
  const births = new Map<EntityId, { parents: EntityId[]; ids: string[] }>();
  for (const kinship of reader.added("kinshipRelationships")) {
    const [first, second] = kinship.personIds as [EntityId, EntityId];
    if (!touches([first, second])) continue;
    const kind = kinship.kind as string;
    // Any parent-and-child kinship: the town's own, and the biological and
    // adoptive ones the family writer records. The child is the younger.
    const younger =
      (reader.world.people[first]?.birthDate ?? "") >
      (reader.world.people[second]?.birthDate ?? "")
        ? first
        : second;
    const child = /(^|:|-)parent-child$/.test(kind) ? younger : null;
    const childPerson = child ? reader.world.people[child] : undefined;
    if (
      child &&
      childPerson &&
      childPerson.birthDate === (kinship.establishedAt as string)
    ) {
      const seen = births.get(child) ?? { parents: [], ids: [] };
      seen.parents.push(child === first ? second : first);
      seen.ids.push(kinship.id);
      births.set(child, seen);
      continue;
    }
    lines.push({
      date: kinship.establishedAt as IsoDate,
      section: "people",
      text: `${reader.name(first)} and ${reader.name(second)} became family (${kind}).`,
      sources: [kinship.id],
    });
  }
  for (const [child, birth] of births)
    lines.push({
      date: reader.world.people[child]!.birthDate,
      section: "people",
      text: `${reader.name(child)} was born to ${list(birth.parents.map((id) => reader.name(id)))}.`,
      sources: birth.ids,
    });
  const relationships = new Map(
    (reader.history.workRelationships ?? []).map(
      (row) => [row.id, row] as const,
    ),
  );
  const titleOf = (relationshipId: string) =>
    reader.roleTitle(relationshipId) ?? "a job";
  for (const started of reader.added("workRelationships")) {
    if (!near.has(started.personId as EntityId)) continue;
    lines.push({
      date: started.startedAt as IsoDate,
      section: "people",
      text: `${reader.name(started.personId as EntityId)} started work: ${titleOf(started.id)}, ${reader.organization(started.organizationId as EntityId)}.`,
      sources: [started.id],
    });
  }
  for (const status of reader.added("workStatuses")) {
    if (status.status !== "ended") continue;
    const relationship = relationships.get(status.workRelationshipId as string);
    if (!relationship || !near.has(relationship.personId as EntityId)) continue;
    lines.push({
      date: status.effectiveAt as IsoDate,
      section: "people",
      text: `${reader.name(relationship.personId as EntityId)} left ${titleOf(relationship.id)}, ${reader.organization(relationship.organizationId as EntityId)}${status.reason ? `: ${String(status.reason)}` : "."}`,
      sources: [status.id],
    });
  }
  for (const role of reader.added("workRoles")) {
    if (role.supersedesRoleId === null) continue;
    const relationship = relationships.get(role.workRelationshipId as string);
    if (!relationship || !near.has(relationship.personId as EntityId)) continue;
    lines.push({
      date: role.effectiveAt as IsoDate,
      section: "people",
      text: `${reader.name(relationship.personId as EntityId)}'s job became ${role.title as string}.`,
      sources: [role.id],
    });
  }
  const enrollments = new Map(
    (reader.history.educationEnrollments ?? []).map(
      (row) => [row.id, row] as const,
    ),
  );
  for (const enrollment of reader.added("educationEnrollments")) {
    if (!near.has(enrollment.personId as EntityId)) continue;
    lines.push({
      date: enrollment.startedAt as IsoDate,
      section: "people",
      text: `${reader.name(enrollment.personId as EntityId)} enrolled at ${reader.organization(enrollment.organizationId as EntityId)} (${String(enrollment.programKind).replace(/-/g, " ")}).`,
      sources: [enrollment.id],
    });
  }
  for (const state of reader.added("educationEnrollmentStates")) {
    if (state.supersedesStateId === null) continue;
    const enrollment = enrollments.get(state.enrollmentId as string);
    if (!enrollment || !near.has(enrollment.personId as EntityId)) continue;
    lines.push({
      date: state.effectiveAt as IsoDate,
      section: "people",
      text: `${reader.name(enrollment.personId as EntityId)}'s schooling at ${reader.organization(enrollment.organizationId as EntityId)} is now ${state.status as string}${state.reason ? `: ${String(state.reason)}` : "."}`,
      sources: [state.id],
    });
  }
  lines.push(
    ...eventLines(
      reader,
      "people",
      (event) =>
        event.type.startsWith("migration.") &&
        event.type !== "migration.state-flows" &&
        event.involvedEntityIds.includes(reader.placeJurisdictionId),
    ),
  );
  return lines;
}

const HANDLED = (event: EventRecord) =>
  event.type.startsWith("election.") ||
  event.type.startsWith("legislation.") ||
  event.type.startsWith("party.") ||
  event.type.startsWith("crisis.") ||
  event.type.startsWith("press.") ||
  event.type.startsWith("matter.") ||
  event.type.startsWith("crime.") ||
  event.type.startsWith("migration.") ||
  event.type.startsWith("civic.") ||
  event.type.startsWith("economy.") ||
  event.type.startsWith("international.") ||
  event.type === "governing.matter-decided" ||
  event.type === "governing.outcome" ||
  event.type.startsWith("constitution.") ||
  event.type === "world.legislative-seat-tenure" ||
  event.type === "world.legislative-seat-vacancy" ||
  event.type === "governing.office-continuity" ||
  event.type === "world.office-tenure" ||
  event.type === "person.died" ||
  QUIET_EVENT.some((pattern) => pattern.test(event.type));

/** Anything not read above: one line per kind of event per month, counted. */
function otherLines(reader: WorldRecordReader): ChronicleLine[] {
  const groups = new Map<string, EventRecord[]>();
  for (const event of reader.newEvents) {
    if (HANDLED(event)) continue;
    const key = `${event.occurredAt.slice(0, 7)}|${event.type}`;
    groups.set(key, [...(groups.get(key) ?? []), event]);
  }
  return [...groups.values()].map((group) => ({
    date: group[0]!.occurredAt,
    section: "other" as const,
    text:
      group.length === 1
        ? `${group[0]!.summary} (\`${group[0]!.type}\`)`
        : `${count(group.length, "record")} of \`${group[0]!.type}\`, for example: ${group[0]!.summary}`,
    sources: group.slice(0, 6).map((event) => event.id),
  }));
}

export function chronicle(
  reader: WorldRecordReader,
  snapshots: readonly OfficeholderSnapshot[],
): ChronicleLine[] {
  const consequences = lawConsequences(reader);
  const lines = [
    ...electionLines(reader, snapshots),
    ...officeLines(reader, snapshots),
    ...lawLines(reader, consequences),
    ...eventLines(reader, "local", (event) => event.type.startsWith("civic.")),
    ...eventLines(
      reader,
      "executive",
      (event) =>
        (event.type === "governing.matter-decided" &&
          event.visibility === "public") ||
        event.type === "governing.outcome",
    ),
    ...partyLines(reader),
    ...deathLines(reader),
    ...disasterLines(reader),
    ...pressLines(reader),
    ...crimeLines(reader),
    ...peopleLines(reader),
    ...eventLines(
      reader,
      "economy",
      (event) =>
        event.type.startsWith("economy.") ||
        event.type === "migration.state-flows",
    ),
    ...eventLines(reader, "abroad", (event) =>
      event.type.startsWith("international."),
    ),
    ...otherLines(reader),
  ];
  return lines
    .map((line) => ({ ...line, date: inWindow(reader, line.date) }))
    .sort(
      (left, right) =>
        left.date.localeCompare(right.date) ||
        SECTION_ORDER.indexOf(left.section) -
          SECTION_ORDER.indexOf(right.section),
    );
}

/* -------------------------------------------------------------------------- */
/* What never happened                                                         */
/* -------------------------------------------------------------------------- */

function check(
  key: string,
  never: string,
  happened: string,
  didHappen: boolean,
  evidence: string,
): NeverCheck {
  return { key, never, happened, didHappen, evidence };
}

export function neverChecks(
  reader: WorldRecordReader,
  lines: readonly ChronicleLine[],
  snapshots: readonly OfficeholderSnapshot[],
): NeverCheck[] {
  const world = reader.world;
  const place = reader.placeName;
  const measures = new Map(
    (reader.history.legislativeMeasures ?? []).map(
      (row) => [row.id, row] as const,
    ),
  );
  const isStateJurisdiction = (id: EntityId) =>
    (world.jurisdictions[id]?.kind ?? "").startsWith("state");
  const enacted = reader
    .added("legislativeEnactments")
    .filter((row) => row.outcome === "enacted");
  const enactedMeasures = enacted
    .map((row) => measures.get(row.measureId as string))
    .filter((row): row is AnyRecord => row !== undefined);
  const stateEnacted = enactedMeasures.filter((row) =>
    isStateJurisdiction(row.jurisdictionId as EntityId),
  );
  const stateRevenue = stateEnacted.filter(
    (row) => row.subjectClass === "revenue",
  );
  const taxRecords = [
    "taxProposals",
    "taxPolicies",
    "taxBases",
    "statutoryTaxLiabilities",
  ].reduce((sum, array) => sum + reader.added(array).length, 0);
  const consequences = lawConsequences(reader);
  const lawsWithConsequences = enacted.filter(
    (row) => (consequences.get(row.measureId as string) ?? []).length > 0,
  );
  const contests = reader.added("electionContests");
  const largestField = Math.max(
    0,
    ...contests.map(
      (row) => (row.candidatePersonIds as readonly unknown[]).length,
    ),
  );
  const localContests = contests.filter((row) =>
    reader.isLocal(row.jurisdictionId as EntityId),
  );
  const aggregateResults = reader.newEvents.filter((event) =>
    /general-results$/.test(event.type),
  );
  const primaries = reader.newEvents.filter((event) =>
    /primary/.test(event.type),
  );
  const localGovernments = (reader.history.organizationProfiles ?? []).filter(
    (row) =>
      row.classification === "service:municipal-government" ||
      row.classification === "service:county-government",
  );
  const localGovernmentIds = new Set(
    localGovernments.map((row) => row.organizationId as string),
  );
  // A town seat is a participation in the town government (a council
  // member, a mayor); older records kept some as work relationships.
  const localSeats = [
    ...(reader.history.workRelationships ?? []),
    ...(reader.history.organizationParticipations ?? []).filter(
      (row) =>
        organizationParticipationStateAt(reader.world, row.id as EntityId)
          ?.status === "active",
    ),
  ].filter((row) => localGovernmentIds.has(row.organizationId as string));
  const localSeatChanges = [
    ...reader.added("workRelationships"),
    ...reader.added("organizationParticipations"),
  ].filter((row) => localGovernmentIds.has(row.organizationId as string));
  const localVotes = (reader.history.legislativeVotes ?? []).filter(
    (vote) =>
      reader.isNew(vote) &&
      reader.isLocal(
        measures.get(vote.measureId as string)?.jurisdictionId as EntityId,
      ),
  );
  const localBills = reader
    .added("legislativeMeasures")
    .filter((row) => reader.isLocal(row.jurisdictionId as EntityId));
  const partyUnits = reader
    .added("partyRecords")
    .filter((row) => row.kind === "party-unit" && row.origin !== "setting");
  const partyEvolutions = reader
    .added("partyRecords")
    .filter((row) => row.kind === "party-evolution");
  const partyInitiatives = reader
    .added("partyRecords")
    .filter((row) => row.kind === "party-initiative");
  const matters = reader
    .added("pressRecords")
    .filter((row) => row.kind === "matter");
  const proceedings = reader
    .added("pressRecords")
    .filter((row) => row.kind === "matter-proceeding");
  const allegationLeads = reader
    .added("pressRecords")
    .filter((row) => row.kind === "story-lead" && row.family === "allegation");
  // An incumbent loses when the snapshot holder is on the ballot and does not
  // win, or when a member of Congress said they were seeking another term and
  // someone else took the seat.
  const results = reader.added("electionContestResults");
  let incumbentsLost = 0;
  for (const result of results) {
    const contest = contests.find((row) => row.id === result.contestId);
    if (!contest) continue;
    const winner = result.winnerPersonId as string;
    const candidates = contest.candidatePersonIds as readonly string[];
    const holder = incumbentOf(
      snapshots,
      (contest.office as { officeKey: string }).officeKey,
      result.resolvedAt as IsoDate,
    )?.personId;
    if (holder && candidates.includes(holder) && holder !== winner)
      incumbentsLost += 1;
  }
  // A town's own elections record the sitting member they unseat.
  incumbentsLost += reader.newEvents.filter(
    (event) => event.type === "local.incumbent-defeated",
  ).length;
  const seatChanges = congressSeatChanges(reader);
  const congressChanges = seatChanges.length;
  const congressIncumbentsLost = seatChanges.filter(
    (change) => change.wasSeeking,
  ).length;
  const congressDays = new Set(
    seatChanges.map((change) => change.event.occurredAt),
  ).size;
  // A party body asked the same question again: did it ever answer differently?
  const answers = new Map<string, string[]>();
  for (const decision of reader
    .added("partyRecords")
    .filter((row) => row.kind === "party-body-decision")) {
    const key = `${decision.organizationId as string}|${decision.questionKey as string}`;
    answers.set(key, [
      ...(answers.get(key) ?? []),
      decision.adoptedOptionKey as string,
    ]);
  }
  const askedAgain = [...answers.values()].filter((row) => row.length > 1);
  const changedAnswers = askedAgain.reduce(
    (sum, row) =>
      sum +
      row.slice(1).filter((answer, index) => answer !== row[index]).length,
    0,
  );
  const repeatDecisions = askedAgain.reduce((sum, row) => sum + row.length, 0);
  // The largest number of votes any recorded race counted.
  let largestVote = 0;
  let largestVoteOffice = "";
  for (const result of results) {
    const total = (result.tallies as readonly { votes: number }[]).reduce(
      (sum, tally) => sum + tally.votes,
      0,
    );
    if (total > largestVote) {
      largestVote = total;
      largestVoteOffice =
        (
          contests.find((row) => row.id === result.contestId)?.office as
            { title: string } | undefined
        )?.title ?? "a race";
    }
  }
  const resignations =
    reader.newEvents.filter((event) => /resign/.test(event.type)).length +
    reader
      .added("workStatuses")
      .filter((row) => /resign/i.test(String(row.reason ?? ""))).length;
  const near = reader.nearPeople();
  const nearPartnerships = reader
    .added("partnerships")
    .filter((row) => (row.personIds as EntityId[]).some((id) => near.has(id)));
  const partnershipById = new Map(
    (reader.history.partnerships ?? []).map((row) => [row.id, row] as const),
  );
  const nearSeparations = reader.added("partnershipStates").filter((row) => {
    if (row.status !== "ended") return false;
    const partnership = partnershipById.get(row.partnershipId as string);
    return ((partnership?.personIds as EntityId[] | undefined) ?? []).some(
      (id) => near.has(id),
    );
  });
  const births = lines.filter(
    (line) => line.section === "people" && / was born to /.test(line.text),
  );
  const newJobs = reader
    .added("workRelationships")
    .filter((row) => near.has(row.personId as EntityId));
  const relationshipOwner = new Map(
    (reader.history.workRelationships ?? []).map(
      (row) => [row.id, row.personId as EntityId] as const,
    ),
  );
  const lostJobs = reader
    .added("workStatuses")
    .filter(
      (row) =>
        row.status === "ended" &&
        near.has(
          relationshipOwner.get(row.workRelationshipId as string) ??
            ("" as EntityId),
        ),
    );
  const nearWorking = new Set(
    (reader.history.workRelationships ?? [])
      .filter((row) => near.has(row.personId as EntityId))
      .map((row) => row.personId as string),
  );
  const civicNotices = lines.filter((line) => line.section === "local").length;
  // A party's new chapter is counted with parties, not here.
  const newOrganizations = reader
    .added("organizationProfiles")
    .filter(
      (row) =>
        row.supersedesProfileId === null &&
        row.locationJurisdictionId === reader.placeJurisdictionId &&
        !String(row.classification ?? "").startsWith("membership:"),
    );
  // Businesses, congregations and clubs that closed, with the jobs that
  // ended because they did.
  const closedOrganizations = reader
    .added("organizationProfiles")
    .filter(
      (row) =>
        row.closed !== undefined &&
        row.locationJurisdictionId === reader.placeJurisdictionId,
    );
  const closedJobs = lostJobs.filter((row) =>
    /^labor:(business|congregation|club)-closed$/.test(String(row.reason)),
  );
  const placeHazards = reader.newEvents.filter(
    (event) =>
      event.type === "crisis.hazard-occurred" &&
      event.involvedEntityIds.includes(reader.placeJurisdictionId),
  );
  const allHazards = reader.newEvents.filter(
    (event) => event.type === "crisis.hazard-occurred",
  );
  const amendments = reader.added("constitutionalMeasures");
  const programs = reader.added("publicProgramRecords");
  const money = [
    "resourcePositions",
    "resourceFlows",
    "resourceTransferOutcomes",
    "resourceObligations",
  ].reduce((sum, array) => sum + reader.added(array).length, 0);
  const courtEvents = reader.newEvents.filter((event) =>
    /court|trial|convict|sentenc|verdict|lawsuit/.test(event.type),
  );
  const candidatesFromPlace = contests.filter((row) =>
    (row.candidatePersonIds as EntityId[]).some(
      (id) =>
        world.people[id]?.homeJurisdictionId === reader.placeJurisdictionId,
    ),
  );
  const nearMoves = reader.newEvents.filter(
    (event) =>
      event.type.startsWith("migration.") &&
      event.type !== "migration.state-flows" &&
      event.involvedEntityIds.includes(reader.placeJurisdictionId),
  );
  const housing = ["dwellings", "dwellingOccupancies", "housingTenures"].reduce(
    (sum, array) => sum + reader.added(array).length,
    0,
  );

  return [
    check(
      "state-tax",
      "No state law changed a tax.",
      "A state law changed a tax.",
      taxRecords > 0,
      `${count(stateEnacted.length, "state bill")} became law, ${stateRevenue.length} of them on revenue; the world wrote ${count(taxRecords, "tax record")} (proposals, policies, bases or liabilities).`,
    ),
    check(
      "law-consequence",
      "No law changed anything in the world beyond its own passage.",
      "At least one law changed a record beyond its own passage.",
      lawsWithConsequences.length > 0,
      `${count(enacted.length, "bill")} became law; ${lawsWithConsequences.length} of them are named by any record outside the legislative process, the news, people's memories and the scheduler.`,
    ),
    check(
      "big-field",
      "No race had more than two candidates.",
      "A race had more than two candidates.",
      largestField > 2,
      `${count(contests.length, "race")} with a recorded field; the largest field was ${largestField}.`,
    ),
    check(
      "named-legislative-races",
      "No congressional or state legislative race recorded its candidates or votes.",
      "Some congressional or state legislative races recorded their candidates.",
      contests.some((row) =>
        /us-house|us-senate|legislat/.test(
          (row.office as { officeKey: string }).officeKey,
        ),
      ),
      `${count(aggregateResults.length, "general election")} for Congress or a legislature reported only totals. No candidate or vote count was recorded for any of their seats.`,
    ),
    check(
      "primary",
      "No primary election was held.",
      "A primary election was held.",
      primaries.length > 0,
      `${count(primaries.length, "record")} of a primary.`,
    ),
    check(
      "local-election",
      "No local election (city, county, school board) was held.",
      "A local election was held.",
      localContests.length > 0,
      `${count(localContests.length, "local race")} among ${count(contests.length, "race")}.`,
    ),
    check(
      "local-seat",
      "No city council or county seat changed hands.",
      "A city council or county seat changed hands.",
      localSeatChanges.length > 0,
      `The world records ${count(localGovernments.length, "local government")} and ${count(localSeats.length, "seat holder")} in them; ${localSeatChanges.length} changed.`,
    ),
    check(
      "local-vote",
      "No local government filed a bill or recorded a vote.",
      "A local government filed a bill or recorded a vote.",
      localVotes.length + localBills.length > 0,
      `${count(localBills.length, "local bill")} and ${count(localVotes.length, "local vote")}; ${civicNotices === 0 ? "no local government posted a civic notice either" : `local decisions appear only as ${count(civicNotices, "civic notice")} with no vote behind them`}.`,
    ),
    check(
      "party-founded",
      "No party was founded, split or merged.",
      "A party was founded, split or merged.",
      partyUnits.length + partyEvolutions.length > 0,
      `${count(partyUnits.length, "new party unit")}, ${count(partyEvolutions.length, "split or merger", "splits or mergers")}, ${count(partyInitiatives.length, "initiative")} to change a party.`,
    ),
    check(
      "scandal",
      "No misconduct matter or scandal was opened.",
      "A misconduct matter was opened.",
      matters.length > 0,
      `${count(matters.length, "matter")}, ${count(allegationLeads.length, "allegation lead")} in the newsrooms.`,
    ),
    check(
      "proceeding",
      "No ethics body or court opened a proceeding against anyone.",
      "An ethics body opened a proceeding.",
      proceedings.length + courtEvents.length > 0,
      `${count(proceedings.length, "proceeding")}; ${count(courtEvents.length, "court record")}.`,
    ),
    check(
      "incumbent-lost",
      "No incumbent lost a race.",
      "An incumbent lost a race.",
      incumbentsLost + congressIncumbentsLost > 0,
      `${incumbentsLost} in races with a recorded field; in Congress, ${congressIncumbentsLost} of ${count(congressChanges, "seat change")} went against a member who said they were seeking another term.`,
    ),
    check(
      "resignation",
      "No officeholder resigned.",
      "An officeholder resigned.",
      resignations > 0,
      `${count(resignations, "resignation record")}.`,
    ),
    check(
      "place-candidate",
      `Nobody from ${place} ran for office.`,
      `Someone from ${place} ran for office.`,
      candidatesFromPlace.length > 0,
      `${count(candidatesFromPlace.length, "race")} with a candidate who lives in ${place}.`,
    ),
    check(
      "marriage",
      `Nobody near ${place} married or began a partnership.`,
      `Somebody near ${place} married or began a partnership.`,
      nearPartnerships.length > 0,
      `${count(nearPartnerships.length, "new partnership")} among ${count(near.size, "person", "people")} near ${place}.`,
    ),
    check(
      "separation",
      `No partnership near ${place} ended.`,
      `A partnership near ${place} ended.`,
      nearSeparations.length > 0,
      `${count(nearSeparations.length, "ended partnership")}.`,
    ),
    check(
      "birth",
      `No child was born near ${place}.`,
      `A child was born near ${place}.`,
      births.length > 0,
      `${count(births.length, "birth")}.`,
    ),
    check(
      "job",
      `Nobody near ${place} started or left a job.`,
      `Somebody near ${place} started or left a job.`,
      newJobs.length + lostJobs.length > 0,
      `${count(newJobs.length, "job")} started and ${lostJobs.length} ended; ${nearWorking.size} of ${count(near.size, "person", "people")} near ${place} have any job on record.`,
    ),
    check(
      "moves",
      `Nobody moved into or out of ${place}.`,
      `People moved into or out of ${place}.`,
      nearMoves.length > 0,
      `${count(nearMoves.length, "move")}.`,
    ),
    check(
      "new-organization",
      `No business, school, church or club opened in ${place}.`,
      `A new organization opened in ${place}.`,
      newOrganizations.length > 0,
      `${count(newOrganizations.length, "new organization")} located in ${place}, not counting party units${newOrganizations.length ? ` (${list(newOrganizations.map((row) => `${row.name as string}, ${row.classification as string}`))})` : ""}.`,
    ),
    check(
      "closed-organization",
      `No business, church or club closed in ${place}.`,
      `A business, church or club closed in ${place}.`,
      closedOrganizations.length > 0,
      `${count(closedOrganizations.length, "closing")} in ${place}, and ${count(closedJobs.length, "job")} ended with them${closedOrganizations.length ? ` (${list(closedOrganizations.map((row) => `${row.name as string}, ${(row.closed as { reason: string }).reason}`))})` : ""}.`,
    ),
    check(
      "housing",
      "Nobody bought, sold or rented a home.",
      "Somebody's home changed hands or tenancy.",
      housing > 0,
      `${count(housing, "housing record")} written.`,
    ),
    check(
      "money",
      "Nobody's money was recorded moving.",
      "Money was recorded moving.",
      money > 0,
      `${count(money, "money record")} written.`,
    ),
    check(
      "place-disaster",
      `No disaster struck ${place}.`,
      `A disaster struck ${place}.`,
      placeHazards.length > 0,
      `${count(placeHazards.length, "hazard")} naming ${place}, of ${allHazards.length} anywhere.`,
    ),
    check(
      "amendment",
      "No constitutional amendment was proposed.",
      "A constitutional amendment was proposed.",
      amendments.length > 0,
      `${count(amendments.length, "amendment")}.`,
    ),
    check(
      "program",
      "No public program was started or changed.",
      "A public program was started or changed.",
      programs.length > 0,
      `${count(programs.length, "public program record")}.`,
    ),
    check(
      "party-mind",
      "No party body ever changed its answer to a question it had answered before.",
      "A party body changed its answer to a question it had answered before.",
      changedAnswers > 0,
      `${count(askedAgain.length, "question")} came back to a party body, ${count(repeatDecisions, "decision")} in all; the answer changed ${count(changedAnswers, "time")}.`,
    ),
    check(
      "vote-scale",
      "No race counted more than 100,000 votes.",
      "A race counted more than 100,000 votes.",
      largestVote > 100_000,
      results.length
        ? `The largest count was ${largestVote.toLocaleString("en-US")} votes, for ${largestVoteOffice}.`
        : "No race recorded a vote count.",
    ),
    check(
      "congress-turnover",
      "No seat in Congress changed hands.",
      "Seats in Congress changed hands.",
      congressChanges > 0,
      `${count(congressChanges, "change")} on ${count(congressDays, "day")}.`,
    ),
  ];
}

/** History arrays that the world keeps a place for and never wrote to. */
export function unwrittenArrays(reader: WorldRecordReader): string[] {
  return Object.entries(reader.history)
    .filter(
      ([, records]) =>
        Array.isArray(records) &&
        !records.some((record) => reader.isNew(record)),
    )
    .map(([array]) => array)
    .sort();
}

/* -------------------------------------------------------------------------- */
/* The document                                                                */
/* -------------------------------------------------------------------------- */

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function monthTitle(month: string): string {
  const [year, number] = month.split("-");
  return `${MONTHS[Number(number) - 1]} ${year}`;
}

function sourceComment(sources: readonly string[]): string {
  return sources.length ? ` <!-- ${sources.join(" ")} -->` : "";
}

function monthDay(date: IsoDate): string {
  return proseDate(date).replace(/, \d{4}$/, "");
}

/**
 * Every enacted law that answers a policy question, by the level that made it,
 * and whether that level's powers cover the question (`question-authority.ts`).
 * Then what Congress's laws feed in the outcome web.
 */
function powersLines(world: World): string[] {
  const measures = new Map(
    (world.history.legislativeMeasures ?? []).map((row) => [row.id, row]),
  );
  const tally = new Map<
    string,
    {
      laws: number;
      answers: number;
      beyond: number;
      unsettled: number;
      noQuestion: number;
    }
  >();
  const federal: { key: string; built: number }[] = [];
  for (const enactment of world.history.legislativeEnactments ?? []) {
    if (enactment.outcome !== "enacted") continue;
    const measure = measures.get(enactment.measureId);
    if (!measure) continue;
    const levels = jurisdictionPowersLevels(world, measure.jurisdictionId);
    const level = levels.includes("federal")
      ? "Congress"
      : levels.some((l) => l === "state" || l === "dc" || l === "territory")
        ? "state, D.C. and territory legislatures"
        : "city and county councils";
    const row = tally.get(level) ?? {
      laws: 0,
      answers: 0,
      beyond: 0,
      unsettled: 0,
      noQuestion: 0,
    };
    tally.set(level, row);
    if (!measure.propositionAnswers?.length) {
      row.noQuestion += 1;
      continue;
    }
    row.laws += 1;
    for (const answer of measure.propositionAnswers) {
      row.answers += 1;
      const may = questionAuthority(
        world,
        measure.jurisdictionId,
        answer.propositionId,
      ).may;
      if (may === "no") row.beyond += 1;
      if (may === "unknown") row.unsettled += 1;
      if (level === "Congress") {
        const key =
          world.policyCatalog.propositions[answer.propositionId]?.stableKey ??
          "";
        federal.push({
          key,
          built: OUTCOME_LINKS.filter(
            (link) =>
              link.from === `law:${key}` && outcomeLinkStatus(link) === "built",
          ).length,
        });
      }
    }
  }
  const out = ["Laws that answered a policy question, by who made them:", ""];
  for (const level of [
    "Congress",
    "state, D.C. and territory legislatures",
    "city and county councils",
  ]) {
    const row = tally.get(level) ?? {
      laws: 0,
      answers: 0,
      beyond: 0,
      unsettled: 0,
      noQuestion: 0,
    };
    out.push(
      `- ${level}: ${count(row.laws, "law")}; ${row.beyond} answered a question that is not theirs to answer${row.unsettled ? `, and ${row.unsettled} rest on a power the research has not settled` : ""}.${row.noQuestion ? ` ${count(row.noQuestion, "more law")} answered no policy question.` : ""}`,
    );
  }
  if (federal.length) {
    const feeding = federal.filter((row) => row.built > 0);
    const questions = new Set(federal.map((row) => row.key));
    out.push(
      "",
      `Congress's laws answered ${count(questions.size, "federal question")}; ${count(feeding.length, "law")} of ${federal.length} feed an outcome that acts in the world.`,
    );
  }
  return out;
}

/**
 * The law in force in every state, D.C. and territory on each question the
 * starting-law file covers, as `lawInForce` reads it at the end of the run:
 * how many places say yes, no, or have no answer (unknown), and how many of
 * those answers are still the law each place began with.
 */
function startingLawAcrossPlaces(world: World): string[] {
  const places = Object.keys(STATES).flatMap((usps) => {
    const id = stateJurisdictionForKey(`US-${usps}`)?.id;
    return id ? [id] : [];
  });
  const covered = new Set(Object.keys(startingLaw.questions));
  const lines: string[] = [];
  let yes = 0;
  let no = 0;
  let unknown = 0;
  let fromStart = 0;
  for (const propositionId of world.policyCatalog.propositionOrder) {
    const proposition = world.policyCatalog.propositions[propositionId]!;
    if (!covered.has(proposition.stableKey)) continue;
    const tally = { yes: 0, no: 0, unknown: 0, fromStart: 0 };
    for (const place of places) {
      const law = lawInForce(world, place, propositionId);
      if (!law) tally.unknown += 1;
      else {
        tally[law.answer] += 1;
        if (law.origin === "in-force-at-start") tally.fromStart += 1;
      }
    }
    yes += tally.yes;
    no += tally.no;
    unknown += tally.unknown;
    fromStart += tally.fromStart;
    lines.push(
      `  - ${proposition.name}: ${tally.yes} yes, ${tally.no} no, ${tally.unknown} unknown; ${tally.fromStart} as the place began.`,
    );
  }
  return [
    `Across all ${places.length} places (the states, D.C. and the territories), on the ${count(lines.length, "question")} with researched starting law: ${yes} yes, ${no} no, ${unknown} unknown; ${fromStart} answers are still the law the place began with.`,
    ...lines,
  ];
}

/**
 * What the law in force says in the watched town on each policy question,
 * where it came from, what each law feeds in the outcome web, and which causes
 * moved each outcome the world computes (04 SYSTEM SPECS parts 4 and 5).
 */
function lawOutcomeLines(run: WorldReportRun): string[] {
  const world = run.world;
  const town = world.people[run.anchorPersonId]?.homeJurisdictionId;
  if (!town) return [];
  const out = ["## What the laws changed beyond money", ""];
  const answered: {
    name: string;
    stableKey: string;
    answer: string;
    origin: string;
    designation: string;
    since: IsoDate;
  }[] = [];
  for (const propositionId of world.policyCatalog.propositionOrder) {
    const law = lawInForce(world, town, propositionId);
    if (!law) continue;
    const proposition = world.policyCatalog.propositions[propositionId]!;
    const measure = world.history.legislativeMeasures?.find(
      (row) => row.id === law.measureId,
    );
    answered.push({
      name: proposition.name,
      stableKey: proposition.stableKey,
      answer: law.answer,
      origin: law.origin,
      designation: measure?.designation ?? "",
      since: law.operativeAt,
    });
  }
  const atStart = answered.filter((row) => row.origin === "in-force-at-start");
  const inPlay = answered.filter((row) => row.origin === "enacted");
  out.push(
    `The law in force here answers ${count(answered.length, "policy question")}: ${atStart.length} as the law stood when the game began, and ${inPlay.length} by laws enacted during the run.`,
    "",
    ...powersLines(world),
    "",
  );
  out.push(...startingLawAcrossPlaces(world), "");
  for (const row of [...inPlay, ...atStart]) {
    const links = OUTCOME_LINKS.filter(
      (link) => link.from === `law:${row.stableKey}`,
    );
    const acting = links.filter((link) => outcomeLinkStatus(link) === "built");
    out.push(
      `- **${row.name}**: ${row.answer}${row.origin === "enacted" ? `, ${row.designation}, in force from ${proseDate(row.since)}` : ", as the game began"}. ${links.length ? `Feeds ${count(links.length, "outcome")}; ${acting.length} ${acting.length === 1 ? "acts" : "act"} in the world today.` : "Feeds no outcome yet."}`,
    );
    for (const link of links)
      out.push(`  - ${link.to} (${link.strength}): ${outcomeLinkStatus(link)}`);
  }
  out.push(
    "",
    "What moved each outcome the world computes, at the end of the run:",
    "",
  );
  for (const outcome of OUTCOMES_PRODUCED) {
    const reading = outcomeFactor(world, town, outcome, world.currentDate);
    const moved = reading.causes.filter((cause) => cause.factor !== 1);
    out.push(
      `- ${outcome}: ${reading.multiplier.toFixed(3)} times its base rate${moved.length ? `, from ${moved.map((cause) => `${cause.key} (${cause.factor.toFixed(3)})`).join(", ")}` : ", nothing moved it"}.`,
    );
  }
  const stateKey = placeOutcomeKey(town);
  const records = placeOutcomeRecords(world).filter(
    (record) => record.placeKey === stateKey,
  );
  if (records.length) {
    out.push("", `How the state's outcomes moved (${stateKey}):`, "");
    for (const measure of PLACE_OUTCOME_MEASURES) {
      const series = records.filter((record) => record.measure === measure);
      const first = series[0];
      const last = series.at(-1);
      if (!first || !last) continue;
      const moved = [
        ...new Set(series.flatMap((r) => r.causes.map((c) => c.key))),
      ];
      out.push(
        `- ${PLACE_OUTCOME_BASES[measure]!.name}: ${placeOutcomeValueText(PLACE_OUTCOME_BASES[measure]!, first.value)} in ${monthTitle(first.month.slice(0, 7))}, ${placeOutcomeValueText(PLACE_OUTCOME_BASES[measure]!, last.value)} in ${monthTitle(last.month.slice(0, 7))}${moved.length ? `; moved by ${moved.join(", ")}` : "; nothing moved it"}.`,
      );
    }
  }
  out.push("", ...lawsMovingOutcomesEverywhere(world));
  return out;
}

/**
 * Every state where a law enacted in play changed its answer on a question the
 * outcome web reads, and what that law moved there at the end of the run.
 */
function lawsMovingOutcomesEverywhere(world: World): string[] {
  const lawLinks = OUTCOME_LINKS.filter(
    (link) =>
      link.from.startsWith("law:") && outcomeLinkStatus(link) === "built",
  );
  const questions = [...new Set(lawLinks.map((link) => link.from.slice(4)))];
  const rows: string[] = [];
  const moving = new Set<string>();
  for (const questionKey of questions) {
    const proposition = Object.values(world.policyCatalog.propositions).find(
      (definition) => definition.stableKey === questionKey,
    );
    if (!proposition) continue;
    const places: string[] = [];
    for (const usps of Object.keys(STATES)) {
      const state = stateJurisdictionForKey(`US-${usps}`)?.id;
      if (!state) continue;
      const law = lawInForce(world, state, proposition.id);
      if (law?.origin !== "enacted") continue;
      const measure = world.history.legislativeMeasures?.find(
        (row) => row.id === law.measureId,
      );
      const moved = lawLinks
        .filter((link) => link.from === `law:${questionKey}`)
        .flatMap((link) => {
          const cause = outcomeFactor(
            world,
            state,
            link.to,
            world.currentDate,
          ).causes.find((row) => row.key === link.key);
          return cause && cause.factor !== 1
            ? [`${link.to} ${cause.factor.toFixed(3)}`]
            : [];
        });
      if (moved.length) moving.add(questionKey);
      places.push(
        `${usps} ${measure?.designation ?? ""} (${law.answer}): ${moved.length ? moved.join(", ") : "nothing yet (the law's lag, or the state's starting law already said so)"}`,
      );
    }
    if (places.length)
      rows.push(`- **${proposition.name}**: ${places.join("; ")}.`);
  }
  return [
    "Laws enacted in play, in every state, on questions the outcome web reads (the factor is the multiplier on the outcome at the end of the run):",
    "",
    `${count(moving.size, "question")} moved an outcome through a named law.`,
    "",
    ...rows,
  ];
}

export function worldReportMarkdown(run: WorldReportRun): string {
  const reader = new WorldRecordReader(run.world, run.anchorPersonId);
  const lines = chronicle(reader, run.officeholders);
  const checks = neverChecks(reader, lines, run.officeholders);
  const never = checks.filter((entry) => !entry.didHappen);
  const unwritten = unwrittenArrays(reader);
  const place = run.placeName;
  const out: string[] = [];
  const { options } = run;
  const contests = reader.added("electionContests").length;
  const filed = reader.added("legislativeMeasures").length;
  const enacted = reader
    .added("legislativeEnactments")
    .filter((row) => row.outcome === "enacted").length;
  const deaths = reader.added("personDeaths").length;
  out.push(
    `# ${place}, with nobody played: ${never.length} things a living world should show never happened`,
    "",
    [
      `A world with nobody played ran in ${place} from ${proseDate(reader.startedOn)} to ${proseDate(reader.endedOn)}.`,
      `In that time the record shows ${count(contests, "race")} with a named field, ${count(filed, "bill")} filed, ${count(enacted, "law")} passed and ${count(deaths, "death")}.`,
      `${never.length} of the ${checks.length} things checked below never happened, and ${unwritten.length} kinds of record the world keeps were never written at all.`,
      run.stopped ? `${run.stopped}` : "",
      "Every line of the chronicle is read from a record the world saved; nothing is invented.",
    ]
      .filter(Boolean)
      .join(" "),
    "",
    "## What never happened",
    "",
  );
  for (const row of never) out.push(`- **${row.never}** ${row.evidence}`);
  out.push(
    "",
    `The world also never wrote a single record of ${count(unwritten.length, "kind")} it keeps a place for: ${unwritten.map((array) => `\`${array}\``).join(", ")}.`,
    "",
    "Checked, and it did happen at least once:",
    "",
  );
  for (const row of checks.filter((entry) => entry.didHappen))
    out.push(`- ${row.happened} ${row.evidence}`);
  const bySection = new Map<Section, number>();
  for (const line of lines)
    bySection.set(line.section, (bySection.get(line.section) ?? 0) + 1);
  out.push("", ...lawOutcomeLines(run));
  out.push(
    "",
    "## The chronicle in numbers",
    "",
    "| Section | Lines |",
    "| --- | ---: |",
    ...SECTION_ORDER.map(
      (section) =>
        `| ${SECTION_TITLES[section]} | ${bySection.get(section) ?? 0} |`,
    ),
    "",
    "## Month by month",
    "",
  );
  const months = new Map<string, ChronicleLine[]>();
  for (const line of lines) {
    const month = line.date.slice(0, 7);
    months.set(month, [...(months.get(month) ?? []), line]);
  }
  for (const [month, monthLines] of months) {
    out.push(`### ${monthTitle(month)}`, "");
    for (const section of SECTION_ORDER) {
      const inSection = monthLines.filter((line) => line.section === section);
      if (inSection.length === 0) continue;
      out.push(`**${SECTION_TITLES[section]}**`, "");
      for (const line of inSection) {
        out.push(
          `- ${monthDay(line.date)}: ${line.text}${sourceComment(line.sources)}`,
        );
        for (const detail of line.details ?? []) out.push(`  - ${detail}`);
      }
      out.push("");
    }
  }
  out.push(
    "## How this was made",
    "",
    "```",
    `npm run world:report -- --years ${options.years} --seed ${options.seed} --place ${options.placeKey}`,
    "```",
    "",
    `- The world was opened the way the title screen's "Watch the world" opens one, in place ${options.placeKey}, and moved only by the observer clock's Day button: ${count(run.daysPressed, "press", "presses")}.`,
    "- A record counts as happening while watched when its sequence number comes after the event that opened the watched world. Dates are the record's own.",
    "- Executive offices changing hands compare who held each office at the start of each month, read from the world's records on that day. Every other line is read from the final save.",
    "- People near the place are those living in it at the end, and anyone who moved into or out of it.",
    "- Each chronicle line ends with a hidden comment naming the ids of the records it came from. Open this file as text to see them.",
    "",
  );
  return `${out.join("\n")}\n`;
}

/* -------------------------------------------------------------------------- */
/* Command line                                                                */
/* -------------------------------------------------------------------------- */

function slug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** A finished run kept whole, so the document can be written again from it. */
interface SavedRun extends Omit<WorldReportRun, "world"> {
  readonly world: string;
}

async function main() {
  const args = process.argv.slice(2);
  const opt = (name: string, fallback: string) => {
    const at = args.indexOf(`--${name}`);
    return at >= 0 ? args[at + 1]! : fallback;
  };
  const from = opt("from", "");
  let run: WorldReportRun;
  if (from) {
    // Write the document again from a kept run, without running the world.
    const saved = JSON.parse(readFileSync(from, "utf8")) as SavedRun;
    run = { ...saved, world: deserializeWorld(saved.world) };
  } else {
    const options: WorldReportOptions = {
      years: Number(opt("years", "5")),
      seed: opt("seed", "round-1"),
      placeKey: opt("place", "3918000"),
    };
    if (!Number.isInteger(options.years) || options.years < 1)
      throw new Error("Use --years N (1 or more).");
    run = runWorldReport(options);
    const keep = opt(
      "keep",
      `test-results/world-report/${slug(run.placeName)}-${options.seed}.run.json`,
    );
    mkdirSync(dirname(keep), { recursive: true });
    const saved: SavedRun = { ...run, world: serializeWorld(run.world) };
    writeFileSync(keep, JSON.stringify(saved));
    console.log(`Kept the run in ${keep}.`);
  }
  const out = opt(
    "out",
    `test-results/world-report/${slug(run.placeName)}-${run.options.seed}.md`,
  );
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, await formattedMarkdown(out, worldReportMarkdown(run)));
  console.log(
    `Wrote ${out}: ${run.placeName}, ${run.daysPressed} Days to ${run.world.currentDate}.`,
  );
}

if (import.meta.url === `file://${process.argv[1]}`) await main();
