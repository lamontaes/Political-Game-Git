import { openLegislativeWork } from "./legislation-world";
import { createNewGameWorld } from "./new-game";
import { resolvePlayerCapabilities } from "./player-capabilities";
import {
  projectDynamicSurfaces,
  type DynamicSurfaceProjection,
} from "./surface-projection";

/**
 * ONE fixed world, so a reviewer can read a room's surfaces against something.
 *
 * The scene gallery used to bind every surface against no payloads at all,
 * which answered "does this slot exist" and could not answer the question that
 * actually matters — does the room say the right thing when the world knows
 * something. Answering it needs a world, and the only honest way to supply one
 * on a review route is to build a REAL one from the same entry points a player
 * uses, name the seed, and let whatever falls out fall out.
 *
 * So: a fixed seed, a Kentucky staffer, and the bill their job puts in front of
 * them, filed and no further. The result is deliberately mixed — a designation
 * and a title that bind, a tally that is empty because no vote has been taken,
 * a seal and a headline that nothing owns — because a review surface where
 * everything is green teaches a reviewer nothing.
 *
 * Development only. Nothing here is reachable from a player route.
 */
export const REVIEW_WORLD_SEED = "scene-gallery-review";
export const REVIEW_WORLD_PLACE = "kentucky";

export interface SurfaceReview {
  readonly projection: DynamicSurfaceProjection;
  /** What the reviewer is looking at, in one line. */
  readonly description: string;
}

let cached: SurfaceReview | null = null;

export function reviewSurfaceProjectionDetail(): SurfaceReview {
  if (cached) return cached;

  const game = createNewGameWorld({
    placeKey: REVIEW_WORLD_PLACE,
    startAge: 30,
    depth: "summarize-earlier-life",
    startingLife: "legislative-office",
    household: "shares-a-home",
    givenName: null,
    familyName: null,
    seed: REVIEW_WORLD_SEED,
  });
  const capabilities = resolvePlayerCapabilities(game.world);
  const jurisdictionId = capabilities.legislativeJurisdictionId;
  const scenarioKey = capabilities.legislativeScenarioKey;

  if (jurisdictionId === null || scenarioKey === null) {
    // The review world has no legislature. That is a fact about the world and
    // not something to paper over: the surfaces bind against what is left.
    cached = {
      projection: projectDynamicSurfaces(game.world, { jurisdictionId }),
      description: `Seed '${REVIEW_WORLD_SEED}' in ${REVIEW_WORLD_PLACE}, with no legislative work available.`,
    };
    return cached;
  }

  const opened = openLegislativeWork(game.world, {
    scenarioKey,
    playerPersonId: game.playerPersonId,
    jurisdictionId,
  });

  cached = {
    projection: projectDynamicSurfaces(opened.world, {
      jurisdictionId,
      measureId: opened.assignment.measureId,
    }),
    description: `Seed '${REVIEW_WORLD_SEED}' in ${REVIEW_WORLD_PLACE}, with ${opened.assignment.label} filed and no vote taken.`,
  };
  return cached;
}

export function reviewSurfaceProjection(): DynamicSurfaceProjection {
  return reviewSurfaceProjectionDetail().projection;
}
