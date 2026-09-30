import type { EntityId, World } from "../simulation";

/** The paper's recorded headline is authoritative. No canned subject table
 * rewrites a real occurrence into a generic development.
 */
export function readerHeadline(
  _world: World,
  item: { readonly sourceEventId: EntityId; readonly headline: string },
): string {
  return item.headline;
}
