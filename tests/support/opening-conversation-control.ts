import delta from "../fixtures/opening-conversation-delta.json";
import journeyDelta from "../fixtures/next24-journey-conversation-delta.json";
import type { ordinaryConversationReplayRecords } from "./ordinary-conversation-replay";

/** Undo only the inspected, source-accounted OPENING delta before comparing
 * the immutable accepted-main split controls. Every candidate value must match;
 * new IDs, references, prose or missing paths cannot disappear into normalization.
 */
export function acceptedMainComparableReplay(
  input: ReturnType<typeof ordinaryConversationReplayRecords>,
) {
  const result = structuredClone(input);
  // Reverse the fully inspected journey identity delta first. No prose,
  // unknown leaf, or missing reference can be normalized away.
  for (const change of [...journeyDelta.changes, ...delta.changes]) {
    let parent: unknown = result;
    for (const key of change.path.slice(0, -1)) {
      if (parent === null || typeof parent !== "object" || !(key in parent))
        throw new Error(
          `Missing inspected OPENING path ${change.path.join(".")}`,
        );
      parent = (parent as Record<string | number, unknown>)[key];
    }
    const key = change.path.at(-1)!;
    if (parent === null || typeof parent !== "object")
      throw new Error("Missing OPENING parent");
    const record = parent as Record<string | number, unknown>;
    if (record[key] !== change.after)
      throw new Error(`Unexpected OPENING leaf ${change.path.join(".")}`);
    record[key] = change.before;
  }
  return result;
}
