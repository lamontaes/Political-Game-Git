import type { World } from "../simulation";
import {
  resolveStoryScene,
  type StorySceneOption,
  type StorySceneRequest,
} from "./story-scene-resolver";

/** An ephemeral render offer. Persist the canonical writer's records instead. */
export interface StoryScenePlayerOffer {
  readonly request: StorySceneRequest;
  readonly option: StorySceneOption;
}

export function storyScenePlayerOffers(
  world: World,
  request: StorySceneRequest,
): readonly StoryScenePlayerOffer[] {
  const scene = resolveStoryScene(world, request);
  if (scene.status !== "resolved") return [];
  return scene.options.map((option) => ({
    request: structuredClone(request),
    option: structuredClone(option),
  }));
}

function requestKey(request: StorySceneRequest): string {
  const place = request.place;
  const placeKey =
    place.kind === "activity"
      ? [place.kind, place.activityId]
      : place.kind === "opened-scene"
        ? [place.kind, place.eventId]
        : place.kind === "household"
          ? [place.kind, place.householdId]
          : [
              place.kind,
              place.organizationId,
              place.jurisdictionId,
              place.workPlaceCategory,
            ];
  return JSON.stringify([
    request.viewerPersonId,
    placeKey,
    request.moment.date,
    request.moment.minuteOfDay,
    request.moment.timeZone,
    request.moment.utcOffsetMinutes,
    request.addressee ?? null,
    request.audibility ?? null,
  ]);
}

export type StoryScenePlayerValidation =
  | { readonly status: "ready"; readonly option: StorySceneOption }
  | { readonly status: "stale-option" | "unavailable" };

/** Call inside the existing action runner with its current world and request.
 * The returned option is freshly resolved; this function dispatches no writer.
 * Any snapshot or option change requires a new render offer, even when an
 * unrelated record changed. Conservative rejection keeps old speech and
 * listener lists from crossing a turn, place, viewer, or hearing change. */
export function revalidateStoryScenePlayerOffer(
  world: World,
  request: StorySceneRequest,
  offered: StoryScenePlayerOffer,
): StoryScenePlayerValidation {
  if (requestKey(request) !== requestKey(offered.request))
    return { status: "stale-option" };
  const scene = resolveStoryScene(world, request);
  if (scene.status !== "resolved") return { status: "unavailable" };
  // Compare the complete resolver record, including exact words, intent,
  // evidence, hearing, listeners, and snapshot. Offers originate above and
  // keep the resolver's field order; altered records fail closed.
  const offeredKey = JSON.stringify(offered.option);
  const option = scene.options.find(
    (candidate) => JSON.stringify(candidate) === offeredKey,
  );
  return option ? { status: "ready", option } : { status: "stale-option" };
}
