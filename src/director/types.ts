/**
 * The story ledger: what the director keeps for each watched person
 * (docs/design/director-on-core2.md). Structure only; no player text.
 */
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
  /** Core event kinds the director subscribes to; "*" is every kind, so no list of kinds is kept in code. */
  eventKinds: readonly string[];
  kinTies: readonly { relation: string; parameter: string }[];
  /** Past-fact kind prefixes that are public background, not personal moments. */
  backdropPastFactPrefixes: readonly string[];
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
  causeId: string;
  causeKind: string;
  counterpartIds: readonly PersonId[];
  /** Stored once, when the moment happens. */
  impact: number;
  channels: readonly ChannelContribution[];
  /** Impact times one plus the counterparts' importance now; recomputed on re-entry. */
  hindsight: number;
  hindsightAt: IsoDate;
  broadEventId?: string;
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
  momentIds: string[];
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
}
