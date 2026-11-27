/**
 * Engines that act on the day a stance moves (interest-group membership
 * follows the view) carry a `stanceListener` field on their module; the views
 * engine calls each one after the move is stored: a heard case (a stance row),
 * or a change in the person's own life that their view reads (no stance row;
 * `tellLifeChange`). The reader asks the installed modules (`fieldsOf`), so
 * no engine fills a list as its file loads.
 */
import { fieldsOf } from "./module-fields";
import type { CoreAPI, PersonId } from "./types";

/** Tell every engine that carries a stance listener that a person's stance on a topic moved. */
export function stanceMoved(
  api: CoreAPI,
  personId: PersonId,
  topic: string,
): void {
  for (const listener of fieldsOf(api.state, "stanceListener"))
    listener(api, personId, topic);
}
