import { useMemo, useState } from "react";
import {
  PEOPLE_VISUAL4_CHARACTER_LIBRARY as characters,
  PEOPLE_VISUAL4_VISUAL_LIBRARY as visuals,
  PEOPLE_VISUAL4_POSE_ART,
} from "../presentation/people-visual4-review";
import { createCharacterProofWorld } from "../presentation/character-proof";
import {
  composeCandidateReviewSubject,
  CANDIDATE_REVIEW_PLATE,
} from "../presentation/candidate-review";
import {
  listPersonVisualSelections,
  setPersonVisualSelection,
  resolvePersonWardrobeContext,
  type PersonWardrobePreference,
} from "../presentation/person-visual-selection";
import { serializeWorld, deserializeWorld } from "../simulation/serialization";
import { personName } from "../simulation";
import type { World, EntityId } from "../simulation";
import { PersonAppearanceControls } from "../player/PersonAppearanceControls";
import { PersonPortrait } from "../player/PersonPortrait";
import { SceneBackdrop } from "../player/SceneBackdrop";
import { ReviewStage } from "./CandidateAdmissionReview";
import { SCENE_REGISTRY } from "../presentation/scene-registry";
import { composeSceneCharacter } from "../presentation/scene-composition";
import { PRODUCTION_POSE_REGISTRY } from "../presentation/visual-integration";
import type { PlacedScenePerson } from "../presentation/life-scene-people";

const libraries = { characters, visuals };
const context = { library: characters, poseFamily: "standing-neutral" };
const KEY = "political-game:people-visual4:review-snapshot:v1";
function initialWorld() {
  return createCharacterProofWorld(
    characters,
    "people-visual4-canonical-review-v1",
    1,
  );
}

/** Developer-only candidate proof using canonical people, shared consumer and save APIs. */
export function PeopleVisual4Review() {
  const [world, setWorld] = useState<World>(initialWorld);
  const [personId, setPersonId] = useState(() => world.personOrder[0]!);
  const [preferences, setPreferences] = useState<
    Record<string, PersonWardrobePreference>
  >({});
  const [status, setStatus] = useState(
    "Unapproved candidate review. Save is isolated from ordinary games.",
  );
  const [anchors, setAnchors] = useState(false);
  const person = world.people[personId]!;
  const baldOptions = useMemo(
    () =>
      listPersonVisualSelections({
        ...context,
        appearance: person.appearance!,
        selectionFilter: { hairFamily: null },
      }),
    [person.appearance],
  );
  const current = person.appearance?.selection;
  const preferred =
    baldOptions.find(
      (o) =>
        o.bodyAssetId.includes("average_man_standing_neutral_front_a") &&
        o.headAssetId.includes("light_oval_young_v1") &&
        o.selection.hairFamily === null,
    ) ?? baldOptions[0];
  const selection = current ?? preferred?.selection;
  const hairOptions = useMemo(
    () =>
      selection
        ? listPersonVisualSelections({
            ...context,
            appearance: person.appearance!,
            selectionFilter: {
              bodyFamily: selection.bodyFamily,
              headFamily: selection.headFamily,
            },
          })
        : [],
    [person.appearance, selection?.bodyFamily, selection?.headFamily],
  );
  const options = [...baldOptions, ...hairOptions];
  const selectedWorld = useMemo(
    () =>
      current || !selection
        ? world
        : setPersonVisualSelection(world, personId, selection, context),
    [current, selection, world, personId],
  );
  const selectedPerson = selectedWorld.people[personId]!;
  const bodyOption = options.find(
    (o) =>
      o.selection.bodyFamily === selection?.bodyFamily &&
      o.selection.headFamily === selection.headFamily &&
      o.selection.hairFamily === selection.hairFamily,
  );
  const preference = preferences[personId];
  let wardrobe;
  let wardrobeError = "";
  try {
    wardrobe = preference
      ? resolvePersonWardrobeContext(selectedPerson, preference, context)
      : undefined;
  } catch (e) {
    wardrobeError = e instanceof Error ? e.message : String(e);
  }
  const subject =
    bodyOption && !wardrobeError
      ? composeCandidateReviewSubject({
          personId,
          appearance: selectedPerson.appearance,
          wardrobe,
          library: characters,
          visualLibrary: visuals,
          bodyAssetId: bodyOption.bodyAssetId,
          plate: CANDIDATE_REVIEW_PLATE,
        })
      : null;
  const scenePair = [...SCENE_REGISTRY.scenes.values()].flatMap((scene) =>
    [...scene.anchors.values()]
      .filter(
        (anchor) =>
          anchor.kind === "floor-standing" &&
          scene.floorCalibration &&
          scene.standardBodyWidthPercent !== null,
      )
      .map((anchor) => ({ scene, anchor })),
  )[0];
  let scenePerson: PlacedScenePerson[] = [];
  let sceneStatus = "No registered calibrated standing anchor.";
  if (scenePair && selectedPerson.appearance && !wardrobeError) {
    try {
      const { scene, anchor } = scenePair;
      const composition = composeSceneCharacter({
        personId,
        displayName: personName(selectedPerson),
        appearance: selectedPerson.appearance,
        wardrobe,
        scene,
        anchor,
        library: characters,
        visualLibrary: visuals,
        poseRegistry: PRODUCTION_POSE_REGISTRY,
        poseArt: PEOPLE_VISUAL4_POSE_ART,
      });
      sceneStatus = composition.complete
        ? "Complete candidate through the registered scene compositor."
        : composition.diagnostics.map((d) => d.message).join(" ");
      scenePerson = [
        {
          personId,
          name: personName(selectedPerson),
          relationship: null,
          anchorId: anchor.id,
          seated: false,
          ...composition.box,
          layers: composition.complete
            ? composition.layers
                .filter((l) => l.url)
                .map((l) => ({ ...l, url: l.url! }))
            : [],
          hasArt: composition.complete,
          presence:
            composition.fallbackDescription ?? personName(selectedPerson),
        },
      ];
    } catch (e) {
      sceneStatus = e instanceof Error ? e.message : String(e);
    }
  }
  return (
    <main className="character-proof" data-testid="people-visual4-review">
      <h1>Selected people · corrected candidate review</h1>
      <p>
        Unapproved source candidates. Production catalogs and ordinary saves are
        unchanged. Controls use the shared identity, wardrobe, portrait, scene
        and World serialization APIs.
      </p>
      <label>
        Person{" "}
        <select
          aria-label="Person"
          value={personId}
          onChange={(e) => setPersonId(e.target.value as EntityId)}
        >
          {world.personOrder.map((id) => (
            <option key={id} value={id}>
              {personName(world.people[id]!)}
            </option>
          ))}
        </select>
      </label>
      <PersonAppearanceControls
        world={selectedWorld}
        personId={personId}
        {...context}
        preference={preference}
        onWorldChange={setWorld}
        onPreferenceChange={(next) => {
          setWorld(selectedWorld);
          setPreferences((prior) => ({ ...prior, [personId]: next }));
        }}
      />
      {wardrobeError ? (
        <p role="alert">Saved wardrobe refused: {wardrobeError}</p>
      ) : null}
      <button
        onClick={() => {
          setWorld(selectedWorld);
          localStorage.setItem(
            KEY,
            JSON.stringify({
              world: serializeWorld(selectedWorld),
              personId,
              preferences,
            }),
          );
          setStatus("Saved canonical identity and wardrobe preferences.");
        }}
      >
        Save review
      </button>{" "}
      <button
        onClick={() => {
          const raw = localStorage.getItem(KEY);
          if (!raw) {
            setStatus("No review save.");
            return;
          }
          try {
            const value = JSON.parse(raw);
            const restored = deserializeWorld(value.world);
            for (const p of Object.values(
              value.preferences,
            ) as PersonWardrobePreference[])
              resolvePersonWardrobeContext(
                restored.people[p.personId]!,
                p,
                context,
              );
            setWorld(restored);
            setPersonId(value.personId);
            setPreferences(value.preferences);
            setStatus("Reloaded the saved people and wardrobe.");
          } catch (e) {
            setStatus(
              `Saved selection refused: ${e instanceof Error ? e.message : String(e)}`,
            );
          }
        }}
      >
        Reload review
      </button>{" "}
      <label>
        <input
          type="checkbox"
          checked={anchors}
          onChange={(e) => setAnchors(e.target.checked)}
        />
        Attachment overlay
      </label>
      <p role="status">{status}</p>
      {subject ? (
        <>
          <ReviewStage subject={subject} debugAnchors={anchors} />
          <p data-testid="visual4-completeness">
            {subject.plan.complete
              ? "Complete candidate combination"
              : "Incomplete combination"}{" "}
            · {subject.plan.recipeKey}
          </p>
          <p>{subject.plan.diagnostics.map((d) => d.message).join(" ")}</p>
        </>
      ) : null}
      <section>
        <h2>Shared person portrait consumer</h2>
        {!wardrobeError ? (
          <PersonPortrait
            world={selectedWorld}
            personId={personId}
            size="large"
            visualLibraries={libraries}
            wardrobe={wardrobe}
          />
        ) : (
          <p>Portrait withheld until the saved wardrobe is repaired.</p>
        )}
      </section>
      <section className="people-visual4-scene-preview">
        <h2>Registered scene consumer</h2>
        <p data-testid="visual4-scene-status">{sceneStatus}</p>
        <SceneBackdrop
          sceneId={scenePair?.scene.sceneId ?? null}
          people={scenePerson}
        >
          <div style={{ minHeight: 480 }} />
        </SceneBackdrop>
      </section>
    </main>
  );
}
