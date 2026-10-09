/**
 * The chapter packet: the facts the story director hands the English engine
 * for one chapter of a life (`docs/design/story-director.md`, part 6, with the
 * five additions P3 and P6 agreed on #3834; CTO 5:53 p.m. Oct 8). The English
 * engine words a chapter from this and nothing else. Every fact names the
 * records it rests on.
 *
 * P6's build step 7 produces these packets. Until it lands, one temporary
 * adapter (`story-chapter-adapter.ts`) fills them from the records the journal
 * already reads, and step 7 deletes it.
 */
import type { EntityId, IsoDate } from "../simulation";

interface Sourced {
  readonly sourceRecordIds: readonly EntityId[];
}

/** What happened, as the story can tell it. */
export type StoryMomentKind =
  "moved" | "school-finished" | "work-started" | "married" | "loss";

export interface StoryMoment extends Sourced {
  readonly key: string;
  readonly kind: StoryMomentKind;
  readonly date: IsoDate;
  /** The narrator's age on that date. */
  readonly age: number;
  /** The particulars the words need, from the records: place, employer… */
  readonly facts: Readonly<Record<string, string>>;
  /**
   * The earlier moment a record names as this one's reason. Only then may the
   * story say "that's when"; otherwise moments follow each other by date.
   */
  readonly causeKey: string | null;
  /** How the narrator's records say it felt, or null when they do not say. */
  readonly feeling: "hard" | "good" | null;
}

/** Someone who raised the narrator during the stretch. */
export interface StoryRaiser extends Sourced {
  readonly personId: EntityId;
  /** By relationship first: "mother", "father", "grandmother". */
  readonly relation: string;
  /** What they did for a living during the stretch, when recorded. */
  readonly occupation: string | null;
}

/** Someone who matters now, met during the stretch. */
export interface StoryPerson extends Sourced {
  readonly personId: EntityId;
  readonly relationThen: string;
  readonly relationNow: string;
  readonly metAt: { readonly setting: string; readonly age: number } | null;
  /** What they are now, such as an office they hold, when recorded. */
  readonly nowRole: string | null;
}

export interface StoryChapterPacket extends Sourced {
  readonly key: string;
  readonly personId: EntityId;
  /** The town the chapter happens in, by its own name. */
  readonly place: { readonly name: string; readonly jurisdictionId: EntityId };
  /** The chapter opens with the narrator's birth in that town. */
  readonly bornHere: boolean;
  /** The narrator was born there and lives there still. */
  readonly raisedHere: boolean;
  readonly from: IsoDate;
  readonly through: IsoDate;
  readonly ageFrom: number;
  readonly ageThrough: number;
  /** The stretch the narrator is living now. */
  readonly current: boolean;
  /** The narrator's age today, for looking back. */
  readonly narratorAgeNow: number;
  /** Nothing in the stretch ranked: the story may say so. */
  readonly quiet: boolean;
  readonly raisedBy: readonly StoryRaiser[];
  /**
   * Brothers and sisters on record, or null when no parent is on record. The
   * total also counts those whose gender is not recorded.
   */
  readonly siblings: {
    readonly brothers: number;
    readonly sisters: number;
    readonly total: number;
  } | null;
  readonly people: readonly StoryPerson[];
  /** In date order. */
  readonly moments: readonly StoryMoment[];
  readonly texture: {
    /** What the place is like, when place data says; null when it does not. */
    readonly smallTown: boolean | null;
    /** The narrator's temperament, in the words the person card shows. */
    readonly temperament: readonly string[];
  };
}
