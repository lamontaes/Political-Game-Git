import type { World } from "../simulation/types";
import { personName } from "../simulation";
import { buildCharacterRenderPlan } from "../presentation/character-render-plan";
import {
  PRODUCTION_CHARACTER_LIBRARY,
  PRODUCTION_VISUAL_LIBRARY,
} from "../presentation/visual-integration";
import type { PersonVisualLibraries } from "../presentation/person-visual";
import { resolvePersonWardrobeContext } from "../presentation/person-visual-selection";
import { appearanceAgeState } from "../presentation/appearance-lifecycle";
import { useSavedRenderSnapshot, useSavedWardrobe } from "./SavedAppearance";
import { ModularCharacter } from "./ModularCharacter";
import {
  artPreviewLibraries,
  artPreviewMode,
  previewArtRefusal,
} from "../presentation/art-preview";
import { gameBuildProfile } from "../presentation/build-profile";

/** Full-body record leaf. Reads the same saved appearance and wardrobe as the
 * room/headshot. The owning UI sizes this 1:2 stage; no identity reroll occurs. */
export function SavedPersonFigure({
  world,
  personId,
  libraries: explicitLibraries,
  className,
}: {
  readonly world: World;
  readonly personId: string;
  readonly libraries?: PersonVisualLibraries;
  readonly className?: string;
}) {
  const snapshot = useSavedRenderSnapshot(personId);
  const preference = useSavedWardrobe(personId);
  const preview = artPreviewLibraries(
    artPreviewMode(
      typeof window === "undefined" ? "" : window.location.search,
      {
        development: import.meta.env.DEV,
        profile: gameBuildProfile(),
      },
    ),
  );
  const person = world.people[personId];
  if (!person) return null;
  const previewRefusal =
    preview && !explicitLibraries
      ? previewArtRefusal(person, world.currentDate)
      : null;
  const libraries =
    explicitLibraries ??
    (preview && !previewRefusal
      ? { characters: preview.characters, visuals: preview.visuals }
      : undefined);
  // Saved snapshots are bound to production, never to a candidate catalogue.
  const usingReviewLibraries = Boolean(explicitLibraries) || Boolean(preview);
  const name = personName(person);
  let reason: string | undefined;
  let content;
  try {
    if (previewRefusal) throw new Error(previewRefusal);
    if (!person.appearance) throw new Error("Saved appearance is unavailable.");
    if (!appearanceAgeState(person, world.currentDate).supported)
      throw new Error("Full-body artwork is not available for this age.");
    const characters = libraries?.characters ?? PRODUCTION_CHARACTER_LIBRARY;
    const wardrobe = preference
      ? resolvePersonWardrobeContext(person, preference, {
          library: characters,
          poseFamily: "standing-neutral",
        })
      : undefined;
    const plan = buildCharacterRenderPlan({
      personId,
      appearance: person.appearance,
      library: characters,
      visualLibrary: libraries?.visuals ?? PRODUCTION_VISUAL_LIBRARY,
      wardrobe,
      snapshot: !usingReviewLibraries && !preference ? snapshot : undefined,
      plate: { width: 600, height: 1200 },
      anchor: {
        id: "saved-person-record",
        xPercent: 50,
        yPercent: 50,
        scale: 1,
        poseFamily: "standing-neutral",
        depth: 1,
        bodyWidthPercent: 90,
      },
    });
    if (
      !plan.complete ||
      plan.layers.some((l) => characters.components.get(l.assetId)?.fixture)
    )
      throw new Error("Compatible full-body artwork is unavailable.");
    const dx = 5 - plan.box.leftPercent,
      dy = 5 - plan.box.topPercent;
    const framed = {
      ...plan,
      box: { ...plan.box, leftPercent: 5, topPercent: 5 },
      layers: plan.layers.map((l) => ({
        ...l,
        leftPercent: l.leftPercent + dx,
        topPercent: l.topPercent + dy,
      })),
      root: plan.root
        ? {
            ...plan.root,
            xPercent: plan.root.xPercent + dx,
            yPercent: plan.root.yPercent + dy,
          }
        : null,
      attachmentAnchors: plan.attachmentAnchors.map((a) => ({
        ...a,
        xPercent: a.xPercent + dx,
        yPercent: a.yPercent + dy,
      })),
    };
    content = (
      <ModularCharacter plan={framed} testId="saved-person-full-body" />
    );
  } catch (error) {
    reason = error instanceof Error ? error.message : String(error);
  }
  return (
    <figure
      className={className}
      aria-label={`${name} — saved full-body appearance`}
      data-person-id={personId}
      data-figure-status={reason ? "unavailable" : "ready"}
      data-diagnostic={reason}
      style={{
        position: "relative",
        aspectRatio: "1 / 2",
        margin: 0,
        isolation: "isolate",
      }}
    >
      {content ?? <p>Full-body artwork unavailable.</p>}
    </figure>
  );
}
