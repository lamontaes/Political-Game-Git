import { lifePlaceByJurisdictionId } from "./life-places";
import {
  DEFAULT_CORPUS_VERSION,
  nameCorpusVersionForPlace,
  PLACE_NAMES_V1_VERSION,
} from "./names-data";
import { stateUsps } from "./school-names";
import type { EntityId, World } from "./types";

/** The creation-record tag a life begun under the place-name version carries. */
export const PLACE_NAMES_TAG = `names:${PLACE_NAMES_V1_VERSION}`;

/**
 * The name corpus for somebody the world meets after it was created: a
 * neighbor, a classmate, a local officeholder. A life begun under the
 * place-name version says so on its creation record, and the people it meets
 * then take the names of the place they live in. A save written before the
 * version has no such tag and keeps the national corpus, so it replays as it
 * was written.
 */
export function nameCorpusVersionForWorld(
  world: World,
  jurisdictionId: EntityId,
): string {
  const created = world.history.events.find(
    (event) => event.type === "world.created",
  );
  if (!created?.tags.includes(PLACE_NAMES_TAG)) return DEFAULT_CORPUS_VERSION;
  return nameCorpusVersionForPlace(
    stateUsps(
      lifePlaceByJurisdictionId(jurisdictionId)?.stateJurisdictionKey ?? null,
    ),
    PLACE_NAMES_V1_VERSION,
  );
}
