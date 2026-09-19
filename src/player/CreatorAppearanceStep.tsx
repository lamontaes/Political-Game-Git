import { useMemo, useState } from "react";
import type { World } from "../simulation";
import type { NewGameSetup } from "../presentation/new-game";
import {
  creatorAppearanceDraft,
  type CreatorAppearanceChoice,
} from "../presentation/creator-appearance-preview";
import {
  artPreviewLibraries,
  previewArtRefusal,
  type ArtPreviewMode,
} from "../presentation/art-preview";
import { PRODUCTION_CHARACTER_LIBRARY } from "../presentation/visual-integration";
import { PersonAppearanceControls } from "./PersonAppearanceControls";
import { wearableChoicesIn } from "./SavedAppearance";
import { PersonPortrait } from "./PersonPortrait";
import { WardrobeFigure } from "./WardrobeFigure";
import "./creator-appearance.css";

/** Reuses the personal wardrobe transaction on an isolated prospective record. */
export function CreatorAppearanceStep({
  setup,
  mode,
  onBegin,
}: {
  readonly setup: NewGameSetup;
  readonly mode: ArtPreviewMode;
  readonly onBegin: (choice: CreatorAppearanceChoice | null) => void;
}) {
  const libraries = artPreviewLibraries(mode);
  const library = useMemo(
    () =>
      wearableChoicesIn(libraries?.characters ?? PRODUCTION_CHARACTER_LIBRARY),
    [libraries?.characters],
  );
  const initial = useMemo(
    () => creatorAppearanceDraft(setup, library),
    [setup, library],
  );
  const [edited, setEdited] = useState<{
    source: World;
    world: World;
    previous: World[];
  } | null>(null);
  const draft = edited?.source === initial ? edited.world : initial;
  const person = draft?.people[draft.personOrder[0]!];
  const refusal =
    person && libraries ? previewArtRefusal(person, draft!.currentDate) : null;
  const ready = Boolean(
    person?.appearance && !refusal && library.components.size,
  );
  return (
    <section
      className="creator-stage-panel kit41-creator"
      data-testid="creator-stage-appearance"
    >
      {person && draft ? (
        <div className="kit41-creator-layout">
          <div className="kit41-creator-preview">
            <PersonPortrait world={draft} personId={person.id} size="large" />
            {libraries && ready ? (
              <WardrobeFigure
                person={person}
                libraries={libraries}
                pending
                fillPreview
              />
            ) : null}
          </div>
          <div>
            <h2>How you look</h2>
            <p className="creator-preview-note">
              Choose your appearance before beginning. These changes affect only
              your preview.
            </p>
            {ready ? (
              <PersonAppearanceControls
                unsavedCreator
                world={draft}
                personId={person.id}
                library={library}
                poseFamily="standing-neutral"
                onWorldChange={(world) =>
                  setEdited((current) => ({
                    source: initial!,
                    world,
                    previous: [
                      ...(current?.source === initial ? current.previous : []),
                      draft,
                    ].slice(-20),
                  }))
                }
                onPreferenceChange={() => {}}
                renderPreview={
                  libraries
                    ? (appearance) => (
                        <WardrobeFigure
                          pending
                          person={{ ...person, appearance }}
                          libraries={libraries}
                        />
                      )
                    : undefined
                }
                renderHairThumbnail={
                  libraries
                    ? (appearance) => (
                        <PersonPortrait
                          world={draft}
                          personId={person.id}
                          visualLibraries={libraries}
                          previewAppearance={appearance}
                        />
                      )
                    : undefined
                }
              />
            ) : (
              <p
                role="status"
                data-testid={
                  libraries?.unavailableReason
                    ? "creator-invalid-pack"
                    : "creator-artwork-status"
                }
              >
                {libraries?.unavailableReason ??
                  (refusal
                    ? "This age has no supported portrait artwork yet. Your character can still begin."
                    : "No compatible artwork is available in this catalog.")}
              </p>
            )}
          </div>
        </div>
      ) : (
        <p>Choose a hometown to preview your character.</p>
      )}
      <div className="game-setup-actions">
        <button
          type="button"
          data-testid="creator-reset-appearance"
          onClick={() =>
            setEdited((current) => ({
              source: initial!,
              world: initial!,
              previous: [
                ...(current?.source === initial ? current.previous : []),
                draft!,
              ].slice(-20),
            }))
          }
          disabled={draft === initial}
        >
          Reset appearance
        </button>
        <button
          type="button"
          data-testid="creator-undo-appearance"
          disabled={edited?.source !== initial || !edited?.previous.length}
          onClick={() =>
            setEdited((current) => {
              if (
                !current ||
                current.source !== initial ||
                !current.previous.length
              )
                return current;
              return {
                source: current.source,
                world: current.previous.at(-1)!,
                previous: current.previous.slice(0, -1),
              };
            })
          }
        >
          Undo
        </button>
        <button
          type="button"
          data-testid="begin"
          disabled={!person || Boolean(libraries?.unavailableReason)}
          onClick={() =>
            onBegin(
              ready && person?.appearance
                ? { personId: person.id, appearance: person.appearance }
                : null,
            )
          }
        >
          Begin
        </button>
      </div>
    </section>
  );
}
