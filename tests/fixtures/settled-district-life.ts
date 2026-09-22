import { letAdultTimePass } from "../../src/presentation/adult-life";
import {
  createExplicitGeographyLife,
  requireLocalityInState,
} from "../../src/presentation/new-game-geography";

/**
 * A life settled long enough in one town for a district-residence rule.
 *
 * The district seat screen only has anything to say once the world has
 * recorded a membership and enough of it has elapsed, which in ordinary play
 * is about two years of the shell clock — roughly a hundred weekly clicks that
 * prove nothing this spec is about. The life, the move and the elapsed time
 * are all the simulation's own; only the waiting is skipped.
 */
export function settledDistrictLife(
  stateJurisdictionKey: string,
  town: string,
  days: number,
) {
  const place = requireLocalityInState(stateJurisdictionKey, town);
  const created = createExplicitGeographyLife({
    placeKey: place.key,
    seed: `settled-${town.toLowerCase()}`,
    startAge: 40,
    startKind: "normal",
    depth: "summarize-earlier-life",
  });
  return {
    world: letAdultTimePass(created.game.world, days),
    playerPersonId: created.game.playerPersonId,
  };
}
