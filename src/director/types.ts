/**
 * The story ledger: what the director keeps for each watched person
 * (docs/design/director-on-core2.md). Structure only; no player text.
 */
import type { OpeningStory } from "./opening-story";
import type { Parameter } from "../core2/parameters";
import type { IsoDate, PersonId } from "../core2/types";
import type { ScheduleEntry } from "./scheduling";

export interface ChannelRow {
  id: string;
  /** Registered measure operation in src/director/ledger.ts. */
  measure: string;
  scaleParameter: string;
  traitWeights: readonly { traitId: string; weightParameter: string }[];
}

export interface KeptFactKindRow {
  id: string;
  /** "never", "contradicting-fact-learned" or "world-event". */
  endsOn: string;
  /** Core event kinds that record a fact of this kind. */
  producedBy: readonly string[];
  stopgapId?: string;
}

export interface DirectorData {
  version: string;
  parameters: Readonly<Record<string, Parameter>>;
  channels: readonly ChannelRow[];
  keptFactKinds: readonly KeptFactKindRow[];
  /** Event flags that make an event broad (public or news). */
  broadEventFlags: readonly string[];
  /**
   * How a job's end is recorded when the worker chose it (the source prefix of
   * the worker's `job:<id>:status` record): a quit for another job or leaving
   * work. Such an end is `job-left`, never a lost job.
   */
  chosenJobEnds?: readonly string[];
  /** Core event kinds the director subscribes to; "*" is every kind, so no list of kinds is kept in code. */
  eventKinds: readonly string[];
  /** Relationship-change notices the director reads, so a mid-day change is rated when recorded. */
  relationshipKinds: readonly string[];
  kinTies: readonly { relation: string; parameter: string }[];
  /** Recorded past facts that are personal moments, with the estimated impact parameter. */
  pastFactMoments: readonly {
    kindPrefix: string;
    parameter: string;
    counterpart?: string;
  }[];
  /**
   * Events recorded without an appraised impact, sized from their own facts:
   * the relative change from one fact to another, on a channel.
   */
  eventImpacts?: readonly {
    eventKind: string;
    channel: string;
    /** The relative change from one fact to another (a raise). */
    fromFact?: string;
    toFact?: string;
    /** Or a sourced impact for the event itself (filing for office). */
    impactParameter?: string;
    /**
     * With an impact parameter: the event's own share of it, 0 to 1, from
     * this fact (a gift's share of what others have given a campaign).
     */
    scaleFact?: string;
    /** The fact naming who the moment is about (the baby at a birth), when not the event's people. */
    counterpartFact?: string;
  }[];
  /** The reason key and citation on a core player stop for an interrupting moment. */
  interruptStop: { reasonKey: string; citation: string };
  /**
   * When each kind of setting can hold a scene, in minutes after midnight; a
   * null opening is the controlled person's own day start.
   */
  settingHours: {
    rows: Readonly<Record<string, { opens: number | null; closes: number }>>;
  };
}

export interface ChannelContribution {
  channel: string;
  raw: number;
  scale: number;
  traitWeight: number;
  traits: readonly { traitId: string; recorded: number; weight: number }[];
  contribution: number;
}

/** A link from a new moment to the earlier moment or kept fact it echoes. */
export interface CallbackLink {
  earlierId: string;
  earlierKind: "moment" | "kept-fact";
  otherId: PersonId;
  /** "same-pair-channel", "kept-fact-open", "kept-fact-due" or "re-entry". */
  reason: string;
  strength: number;
}

export interface Moment {
  id: string;
  personId: PersonId;
  date: IsoDate;
  /** Sorting label: the strongest channel and the cause kind. Decides nothing. */
  label: string;
  /**
   * A record id the core's saved-trace resolver holds: a logged event, a
   * person, household, job, relationship or work record.
   */
  causeId: string;
  /** For a recorded-past moment, the fact on the cited person record. */
  causeFactId?: string;
  causeKind: string;
  counterpartIds: readonly PersonId[];
  /** The causing event names the person among its own people (not only a witness). */
  selfNamed?: true;
  /** Stored once, when the moment happens. */
  impact: number;
  channels: readonly ChannelContribution[];
  /** Impact times one plus the counterparts' importance now; recomputed on re-entry. */
  hindsight: number;
  hindsightAt: IsoDate;
  broadEventId?: string;
  /** Scored from the recorded past at the opening, not observed in play. */
  past?: boolean;
  /** The place the causing event names, when an event caused it. */
  placeId?: string;
  echoes: CallbackLink[];
}

export interface ThreadTurn {
  date: IsoDate;
  /** "started", "grew", "soured", "renewed" or "closed". Faded is read on demand. */
  turn: string;
  causeId: string;
  momentId?: string;
  closeness: number;
}

export interface Thread {
  personId: PersonId;
  otherId: PersonId;
  /** The kin relations the other person holds to the watched person. */
  kin: string[];
  sharedHome: boolean;
  tie: number;
  /** The core's relationship level at the last change. */
  closeness: number;
  lastContact?: IsoDate;
  tone: "rising" | "souring" | "steady";
  /**
   * The change in closeness since the tie last turned, signed: each contact
   * moves a tie a little, and the tie turns when the change adds up.
   */
  tieDrift?: number;
  momentIds: string[];
  /**
   * Moments forgotten from this pair: their count, summed impact, and summed
   * impact without re-entry, so importance and later re-entries are unchanged.
   */
  forgotten?: { count: number; impact: number; history: number };
  /** The last day this thread came back after fading; it is fresh from then. */
  renewedAt?: IsoDate;
  turns: ThreadTurn[];
  closedAt?: IsoDate;
}

export interface KeptFact {
  id: string;
  kind: string;
  holderId: PersonId;
  otherId: PersonId;
  since: IsoDate;
  /** "recorded", "no-later-than-birth" or "opening". */
  sinceBasis: string;
  sourceId: string;
  concernsKey?: string;
  endedAt?: IsoDate;
  endedBy?: string;
}

export interface BackdropEntry {
  id: string;
  personId: PersonId;
  date: IsoDate;
  sourceId: string;
  kind: string;
  /** "named", "household", "place" or "past". */
  reach: string;
}

export interface BroadEventRecord {
  eventId: string;
  date: IsoDate;
  kind: string;
  placeId: string;
  reached: { personId: PersonId; reach: string }[];
}

/** Moments a person no longer holds one by one: a month's count by label. */
export interface MomentSummary {
  month: string;
  label: string;
  count: number;
  impact: number;
  counterpartIds: PersonId[];
}

export interface PersonLedger {
  personId: PersonId;
  watchedSince: IsoDate;
  moments: Moment[];
  momentsById: Map<string, Moment>;
  momentsByOther: Map<PersonId, string[]>;
  threads: Map<PersonId, Thread>;
  keptFacts: Map<string, KeptFact>;
  keptFactsByOther: Map<PersonId, Set<string>>;
  backdrop: BackdropEntry[];
  /**
   * What the person keeps only in summary (owner, Oct 11: memories keep what
   * matters and summarize the rest). Forgotten moments by month and label,
   * forgotten broad events' impact by event, and old backdrop by kind.
   */
  summaries: Map<string, MomentSummary>;
  forgottenBroad: Map<string, number>;
  backdropCounts: Map<string, number>;
  /** Changes that moved the person but stayed under the floor, by label. */
  belowFloor: Map<string, number>;
  /** One outcome per stored moment: scene now, scene waiting or journal line. */
  schedule: ScheduleEntry[];
  /** Days on which nothing scored, and days observed. */
  quietDays: number;
  observedDays: number;
}

export interface Ledger {
  people: Map<PersonId, PersonLedger>;
  broadEvents: Map<string, BroadEventRecord>;
  /** Watched people who stored a personal moment from each broad event. */
  hitBy: Map<string, Set<PersonId>>;
  /** Open lies indexed by the deceived person and the fact they deny. */
  liesByLearner: Map<string, Set<string>>;
  stopgapHits: Set<string>;
  /** The opening, the first scene: the President's address, that night's news, then home that evening. */
  opening?: OpeningStory;
  /** Each player's scene filter: the kinds of scene they allow to interrupt them. */
  sceneFilters: Map<PersonId, SceneFilter>;
  /** Each voter's election-day visit to the polls, by `<person>:<election date>`. */
  pollingVisits: Map<string, PollingVisitRecord>;
  /**
   * The day each circumstance last staged a scene for a person, by
   * `<person>|<row id>`, and `<person>|*` for any circumstance (circumstance.ts).
   */
  circumstanceLast: Map<string, IsoDate>;
}

/**
 * A voter's election-day visit (owner, Oct 14, 2026: election day is a
 * scene): the contests on their ballot, what they marked, and whether they
 * voted or left. The voting engine counts what was marked (`castBallot`).
 */
export interface PollingVisitRecord {
  readonly id: string;
  readonly personId: PersonId;
  readonly electionDate: IsoDate;
  readonly contestIds: readonly string[];
  /** Each contest marked: the candidate, or null for a race left blank. */
  readonly marked: Readonly<Record<string, string | null>>;
  readonly status: "open" | "voted" | "left";
}

/**
 * The player's interrupt setting (owner, Oct 14, 2026): which kinds of scene
 * may stop the day, by situation type. The director's scheduling reads it
 * whenever it decides a moment's outcome.
 */
export interface SceneFilter {
  readonly id: string;
  readonly personId: PersonId;
  /** The situation-type keys allowed; every other kind becomes a journal line. */
  readonly allowedKinds: readonly string[];
  /** When the player set it. */
  readonly setOn: IsoDate;
}
