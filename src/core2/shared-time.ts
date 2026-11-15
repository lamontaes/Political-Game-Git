/**
 * Time spent in the same place grows the tie between two people who know each
 * other. This is the one mechanism for it (pool item
 * people-shared-time-grows-ties): a reader of some record of being in one
 * place (today, coworkers' work schedules in `work-closeness.ts`; next,
 * neighbors, classmates and group members) says how many minutes two people
 * shared, how much of that time is contact rather than just being near, and
 * how many people the place lets one know. The minutes become hours together
 * through the one relationship writer, so closeness and fading stay where they
 * already are. A reader adds its own contact share (an ESTIMATED row) and its
 * own record; it never writes ties or hours itself.
 */
import type { CoreAPI, PersonId } from "./types";

export interface SharedTime {
  readonly a: PersonId;
  readonly b: PersonId;
  /** Minutes both were in the place together, from the reader's own record. */
  readonly minutes: number;
  /** Share of those minutes spent in contact, from the reader's parameter row. */
  readonly contactShare: number;
  /** People the place lets one know (at least one); the contact is split among them. */
  readonly room: number;
  readonly kind: "family" | "coworker" | "contact" | "group";
  readonly cause: string;
  /** The place's record (employer, school, group). */
  readonly sourceId: string;
}

/** Credit one pair's shared minutes as hours together. */
export function creditSharedTime(api: CoreAPI, time: SharedTime): void {
  if (time.minutes <= 0) return;
  api.relationship(
    time.a,
    time.b,
    time.kind,
    (time.minutes / api.parameter("minutesPerHour")) *
      (time.contactShare / Math.max(api.parameter("one"), time.room)),
    undefined,
    { cause: time.cause, sourceId: time.sourceId },
  );
}
