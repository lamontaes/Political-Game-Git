/**
 * Engines that act on the day a stance moves (interest-group membership
 * follows the view) carry the listener as their module's `stanceListener`; the
 * views engine tells each installed one, in install order, after the move is
 * stored: a heard case (a stance row), or a change in the person's own life
 * that their view reads (no stance row; `tellLifeChange`). This file imports no
 * engine, so the views engine never meets an engine half loaded (the campaign
 * engine and the views engine import each other).
 */
import { carriersOf } from "./module-fields";
import type { CoreAPI, CoreModule, PersonId } from "./types";

export type StanceListener = NonNullable<CoreModule["stanceListener"]>;

/** Tell every installed engine that a person's stance on a topic moved. */
export function stanceMoved(
  api: CoreAPI,
  personId: PersonId,
  topic: string,
): void {
  for (const module of carriersOf(api.state, "stanceListener"))
    module.stanceListener!(api, personId, topic);
}
