import type { PersonRenderSnapshot } from "../presentation/person-render-snapshot";
import { useSavedRenderSnapshot, useSavedWardrobe } from "./SavedAppearance";
import { resolvePersonWardrobeContext } from "../presentation/person-visual-selection";
import { PRODUCTION_CHARACTER_LIBRARY } from "../presentation/visual-integration";
import type { CharacterWardrobeContext } from "../presentation/character-components";
import type { PersonVisualLibraries } from "../presentation/person-visual";
import { resolvePersonPortrait } from "../presentation/person-visual";
import {
  artPreviewLibraries,
  artPreviewMode,
  previewArtRefusal,
} from "../presentation/art-preview";
import { gameBuildProfile } from "../presentation/build-profile";
import { ModularCharacter } from "./ModularCharacter";
import { personName } from "../simulation";
import type { EntityId, World } from "../simulation";

export interface PersonPortraitProps {
  readonly snapshot?: PersonRenderSnapshot;
  readonly world: World;
  readonly visualLibraries?: PersonVisualLibraries;
  readonly wardrobe?: CharacterWardrobeContext;
  readonly personId: EntityId;
  readonly size?: "small" | "large";
  /** Shown under the name when the world knows one. */
  readonly note?: string | null;
}

export function PersonPortrait({
  world,
  personId,
  size = "small",
  note = null,
  visualLibraries,
  wardrobe,
  snapshot,
}: PersonPortraitProps) {
  const savedWardrobe = useSavedWardrobe(personId);
  const sharedSnapshot = useSavedRenderSnapshot(personId);
  /*
   * Development art preview, for the dossier and every other ordinary consumer
   * of this component. An explicit `visualLibraries` always wins, so the
   * character proof and the candidate review surfaces are unaffected; this only
   * fills in for a caller that asked for nothing, and only in a development
   * build. See `src/presentation/art-preview.ts`.
   */
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
  // The banked bodies are adult bodies and the compositor cannot tell. A child
  // keeps their initials in the preview rather than borrowing an adult figure.
  const previewRefusal =
    preview && !visualLibraries && person
      ? previewArtRefusal(person, world.currentDate)
      : null;
  const libraries =
    visualLibraries ??
    (preview && !previewRefusal
      ? { characters: preview.characters, visuals: preview.visuals }
      : undefined);
  if (!person) return null;
  const name = personName(person);
  let refusal: string | null = previewRefusal;
  let resolvedWardrobe = wardrobe;
  if (!wardrobe && savedWardrobe) {
    try {
      resolvedWardrobe = resolvePersonWardrobeContext(person, savedWardrobe, {
        library: libraries?.characters ?? PRODUCTION_CHARACTER_LIBRARY,
        poseFamily: "standing-neutral",
      });
    } catch (error) {
      refusal = error instanceof Error ? error.message : String(error);
    }
  }
  /*
   * A shared snapshot belongs to the library that produced it.
   *
   * The saved snapshots are derived against the production libraries, and
   * handing one to a composition against the review catalog is rejected by the
   * snapshot's own binding check. The old condition dropped it under preview
   * only as a side effect of `libraries` happening to be set, which is the same
   * outcome reached by accident — and it would have silently stopped being
   * true the moment a preview caller passed no libraries. The room states the
   * rule outright; so does this, so the two surfaces agree for one reason
   * rather than two coincidences.
   */
  const usingReviewLibraries = Boolean(visualLibraries) || Boolean(preview);
  const visual = refusal
    ? { kind: "placeholder" as const, reason: refusal }
    : resolvePersonPortrait(person, {
        libraries,
        wardrobe: resolvedWardrobe,
        snapshot:
          snapshot ??
          (!usingReviewLibraries && !wardrobe ? sharedSnapshot : undefined),
      });

  return (
    <figure
      className={`person-portrait person-portrait--${size}`}
      data-testid="person-portrait"
      data-likeness={visual.kind === "placeholder" ? "none" : visual.kind}
      /*
       * Which refusal produced these initials. Every one of the five reasons
       * rendered identically, so "why is this person a monogram" could not be
       * answered from the screen at all. Empty when a likeness drew.
       */
      data-refusal={visual.kind === "placeholder" ? visual.reason : ""}
    >
      <span
        aria-hidden="true"
        className="person-portrait-mark"
        style={{ position: "relative", overflow: "hidden", flexShrink: 0 }}
      >
        {visual.kind === "authored" ? (
          <img
            src={visual.asset.url}
            alt=""
            style={{ width: "100%", height: "100%", objectFit: "contain" }}
          />
        ) : visual.kind === "modular" ? (
          <ModularCharacter
            plan={visual.plan}
            testId="person-portrait-character"
          />
        ) : (
          initials(person.givenName, person.familyName)
        )}
      </span>
      <figcaption>
        <strong>{name}</strong>
        {note ? <span>{note}</span> : null}
        {refusal ? <span role="status">{refusal}</span> : null}
      </figcaption>
    </figure>
  );
}

function initials(givenName: string, familyName: string): string {
  return `${givenName.charAt(0)}${familyName.charAt(0)}`.toUpperCase();
}
