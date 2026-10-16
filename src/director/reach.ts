/**
 * Which situation types fired in a played year, and for each that did not,
 * why (owner, Oct 15: nothing fires without a recorded cause, and a quiet
 * day fires nothing). A type that fired names the moments and their cause
 * records. A type that did not says whether its producer is not built yet,
 * whether no record in the year matched it, or whether a matching moment
 * stayed a journal line under the person's pace.
 */
import {
  causeMatches,
  type SituationCause,
  type SituationLibrary,
} from "./scheduling";
import { P } from "../core2/parameters";
import type { CoreState } from "../core2/types";
import type { PersonLedger } from "./types";

export interface ReachRow {
  typeKey: string;
  fired: { momentId: string; causeId: string; date: string }[];
  /** Empty when the type fired. */
  reason: string;
}

const describeMatch = (cause: SituationCause): string => {
  const match = cause.match;
  if (!match) return "a cause with no match rule";
  return (
    match.label ??
    (match.labelPrefix !== undefined ? `${match.labelPrefix}*` : undefined) ??
    (match.echo !== undefined ? `echo ${match.echo}` : "a thread turn")
  );
};

/** The reach of every situation type over the books given, in the library's order. */
export function reachReport(
  library: SituationLibrary,
  books: readonly PersonLedger[],
  core: Readonly<CoreState>,
): ReachRow[] {
  const fired = new Map<string, ReachRow["fired"]>();
  for (const book of books)
    for (const entry of book.schedule) {
      if (entry.outcome === "journal-line") continue;
      const typeKey = entry.bindings[P.zero]?.typeKey;
      const moment = book.momentsById.get(entry.momentId);
      if (!typeKey || !moment) continue;
      fired.set(typeKey, [
        ...(fired.get(typeKey) ?? []),
        { momentId: moment.id, causeId: moment.causeId, date: moment.date },
      ]);
    }
  return library.types.map((type) => {
    const rows = fired.get(type.key);
    if (rows?.length) return { typeKey: type.key, fired: rows, reason: "" };
    if (!type.causes.length)
      return {
        typeKey: type.key,
        fired: [],
        reason: "no cause is written for this type yet",
      };
    const waiting = type.causes.filter((cause) => cause.awaitingProducer);
    const live = type.causes.filter((cause) => !cause.awaitingProducer);
    const matched = live.flatMap((cause) =>
      books.flatMap((book) =>
        book.moments.filter((moment) =>
          causeMatches(cause, book, moment, core),
        ),
      ),
    );
    const parts: string[] = [];
    if (matched.length)
      parts.push(
        `${matched.length} matching moment${matched.length === P.one ? "" : "s"} stayed journal lines under the person's pace or found no one to fill a role`,
      );
    else if (live.length)
      parts.push(
        `no record in the year matched: ${live.map(describeMatch).join(", ")}`,
      );
    if (waiting.length)
      parts.push(
        `waiting on a producer that is not built: ${[
          ...new Set(waiting.map((cause) => cause.awaitingProducer)),
        ].join(", ")}`,
      );
    return { typeKey: type.key, fired: [], reason: parts.join("; ") };
  });
}
