import type { ClaimStance } from "./claim-stances";
import { peopleRequestContradictionRoute } from "./people-request-route";
import { pressMatterContradictionRoute } from "./press/claim-route";
import type { SceneFamily } from "./scene-bindings";
import type { EntityId, HistoricalEvent, IsoDate, World } from "./types";

/**
 * Evidence routes other lanes contribute to the contradiction check
 * (PEOPLE P4 extension point).
 *
 * A route answers two questions for one proposition-key prefix: when could the
 * world first hold evidence against a stance, and has a given recipient of the
 * stance actually come to know such evidence? It never decides intent and
 * never writes; the check writes the discovery through the same path every
 * route shares, so a lie to a reporter and a lie to a housemate end the same
 * way. A route that finds nothing leaves the claim believed.
 *
 * Owners append their route to `CONTRADICTION_ROUTES`; the prefix must be
 * unique and must not be one of PEOPLE's own (`attends`, `promised`,
 * `accepted`, `said`, `knew`).
 */

export interface ContradictionEvidence {
  /** The canonical event the recipient learned that contradicts the claim. */
  readonly evidenceEventId: EntityId;
  /** Said inside the discovery sentence: "did not match <label>". */
  readonly label: string;
}

export interface ContradictionRoute {
  readonly prefix: string;
  /**
   * How the discovery reads when this route finds evidence. A reporter calling
   * back and a friend raising it at home are the same machinery and must not
   * be the same scene, so a route says which family and place its discovery
   * belongs to. Left out, it reads as the reporter call PEOPLE shipped first.
   */
  readonly discovery?: {
    readonly family: SceneFamily;
    readonly place: string;
  };
  /** The first date evidence could exist, or null when it never can. */
  checkDate(world: World, stance: ClaimStance, id: EntityId): IsoDate | null;
  /** Evidence this recipient actually holds by now, if any. Pure. */
  evidenceFor(
    world: World,
    stanceEvent: HistoricalEvent,
    stance: ClaimStance,
    id: EntityId,
    recipientPersonId: EntityId,
  ): ContradictionEvidence | null;
}

export const CONTRADICTION_ROUTES: readonly ContradictionRoute[] = [
  // CRUNCH46 PRESS: a denial to a reporter meets a published finding or the ledger.
  pressMatterContradictionRoute,
  // CRUNCH47 PEOPLE: an answer about a request meets the asker's own memory.
  peopleRequestContradictionRoute,
];
