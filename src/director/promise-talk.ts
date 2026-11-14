/**
 * A settled promise said at the next talk (Words lead brief T and rulings 1,
 * Nov 14 2026): the one who was promised brings it up once to the one who
 * promised, kept or broken, in their own bearing. What is said is the
 * conversation bank's `promise-kept` or `promise-broken` lines for the
 * promise's kind (requiresFacts `promise-<kind>`), with the bill by its name
 * where the promise was a vote. Order (fixed by the conversation engine):
 * the speaker's own hard news leads, then brought-up news, then this.
 *
 * The conversation engine asks `promiseSubject` for the subject between the
 * two and calls `markPromiseSaid` once it is said; nothing here writes a
 * line or a record of its own.
 */
import { billNameOf, billTitleSaid } from "../english/bill-names";
import type { Fact } from "../english/conversation-words";
import { LEGISLATURE_MODULE_ID, billOf } from "../core2/modules/legislature";
import { coreAPI } from "../core2/state";
import type { CoreState, PersonId } from "../core2/types";
import type { Director } from "./ledger";
import { markPromiseSaid, promisesBetween } from "./promises";

/** A settled promise one person may say to another: the conversation subject's shape. */
export interface PromiseSubject {
  /** The kept fact's id: the listener's topic memory keeps it from coming back. */
  id: string;
  kind: "promise-kept" | "promise-broken";
  facts: Record<string, Fact>;
  /** The scene reply that made it and the record that settled it. */
  aboutId: string;
}

/**
 * The newest settled promise the listener made to the speaker that the
 * speaker has not said yet; null when there is none. A lapsed promise (its
 * bill never came to a roll) is not said.
 */
export function promiseSubject(
  core: Readonly<CoreState>,
  director: Director,
  speakerId: PersonId,
  listenerId: PersonId,
): PromiseSubject | null {
  const row = promisesBetween(director.ledger, speakerId, listenerId).find(
    (entry) =>
      entry.holderId === listenerId &&
      entry.otherId === speakerId &&
      (entry.outcome === "kept" || entry.outcome === "broken") &&
      !entry.saidAt,
  );
  if (!row) return null;
  const cites = [row.id, row.sourceId, ...(row.endedBy ? [row.endedBy] : [])];
  const fact = (text: string): Fact => ({ text, sourceRecordIds: cites });
  const facts: Record<string, Fact> = { [`promise-${row.kind}`]: fact("yes") };
  if (row.billId && core.modules.has(LEGISLATURE_MODULE_ID)) {
    const name = billNameOf(billOf(coreAPI(core as CoreState), row.billId));
    if (name)
      facts.bill = {
        text: billTitleSaid(name.title),
        sourceRecordIds: [row.billId],
      };
  }
  return {
    id: row.id,
    kind: row.outcome === "kept" ? "promise-kept" : "promise-broken",
    facts,
    aboutId: row.sourceId,
  };
}

/** Once said: the promise is not brought up again by anyone. */
export function promiseSaid(
  core: Readonly<CoreState>,
  director: Director,
  subject: PromiseSubject,
): void {
  markPromiseSaid(director.ledger, subject.id, core.date);
}
