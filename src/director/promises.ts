/**
 * Which scene endings keep a promise (Words lead brief T, Nov 14 2026).
 *
 * A scene ending that keeps a promise names its kind and its tie on its
 * `scene.reply` record (`promiseReplyFacts`, from
 * `src/director/data/promise-endings.json`). The promises engine
 * (src/core2/modules/promises.ts) keeps the promise from that record,
 * settles it and moves the tie; the director only words it
 * (promise-talk.ts).
 */
import { P } from "../core2/parameters";
import { PROMISE_FACT, kindOf } from "../core2/modules/promises";
import endingsJson from "./data/promise-endings.json" with { type: "json" };

interface PromiseEndingRow {
  /** The purpose (or a variant's purpose) the scene plays. */
  purpose: string;
  ending: string;
  kind: string;
  /** The cause record kinds the tie can be read from; any cause when absent. */
  causeKinds?: readonly string[];
}

const ENDINGS = (endingsJson as { endings: readonly PromiseEndingRow[] })
  .endings;

const zero = P.zero;

/**
 * What a scene reply that reaches `endingId` writes about the promise it
 * keeps: its kind and its tie (the bill and the side, read from the cause
 * record). Empty when the ending keeps no promise a record can settle.
 */
export function promiseReplyFacts(scene: {
  purpose: string;
  variant?: { readonly purpose: string };
  cause: { kind: string; facts: Readonly<Record<string, string>> };
  /** The scene's own facts: a tie the cause does not carry is the first record a fact cites (the meeting a friend asks the player to). */
  facts?: readonly { key: string; recordIds: readonly string[] }[];
  endingId: string;
}): Record<string, string> {
  const purpose = scene.variant?.purpose ?? scene.purpose;
  // A cause's kind is the label's, `event:<record kind>` for a record.
  const causeKind = scene.cause.kind.replace(/^event:/, "");
  const row = ENDINGS.find(
    (entry) =>
      entry.ending === scene.endingId &&
      // A family's row covers its variants (`ask-vote.friend` is `ask-vote`).
      (entry.purpose === purpose || purpose.startsWith(`${entry.purpose}.`)) &&
      (!entry.causeKinds || entry.causeKinds.includes(causeKind)),
  );
  if (!row) return {};
  const kind = kindOf(row.kind);
  if (!kind.settle.length) return {};
  const out: Record<string, string> = { [PROMISE_FACT]: kind.id };
  for (const [key, causeFact] of Object.entries(kind.tie)) {
    const value =
      scene.cause.facts[causeFact] ??
      scene.facts?.find((row) => row.key === causeFact)?.recordIds[zero];
    // A tie the cause does not carry: the promise cannot be settled.
    if (!value) return {};
    out[`promise-${key}`] = value;
  }
  return out;
}
