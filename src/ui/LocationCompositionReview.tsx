import { useMemo, useState } from "react";
import "../player/player.css";
import "../player/scene-conversation.css";
import { SceneBackdrop } from "../player/SceneBackdrop";
import { createNewGameWorld } from "../presentation/new-game";
import { planLifeScenePeople } from "../presentation/life-scene-people";
import { artPreviewLibraries } from "../presentation/art-preview";
import { locationReviewVisuals } from "../presentation/location-art-review";
import {
  CAMPAIGN_STOREFRONT_SCENE_ID,
  PARK_COMMUNITY_PAVILION_SCENE_ID,
  PRESS_BRIEFING_ROOM_SCENE_ID,
  requireScene,
  SCENE_REGISTRY,
} from "../presentation/scene-registry";
import { personName } from "../simulation";

const rooms = [
  {
    id: CAMPAIGN_STOREFRONT_SCENE_ID,
    label: "Storefront",
    route:
      "Actual route: Personal → Work → campaign → file → spend an afternoon on the phones → return to the scene. Development candidate mode only; no release acceptance recorded.",
  },
  {
    id: PARK_COMMUNITY_PAVILION_SCENE_ID,
    label: "Pavilion",
    route:
      "No normal-play exterior venue/activity association exists. This is prepared candidate scene engineering, not a park visit.",
  },
  {
    id: PRESS_BRIEFING_ROOM_SCENE_ID,
    label: "Press room",
    route:
      "No canonical press briefing activity/location producer exists. This is prepared candidate scene engineering, not a recorded briefing.",
  },
];

/** Development-only compositions using the exact shared in-game backdrop and
 * person compositor. Synthetic staging creates no attendance, clock or saves.
 * The dialogue sample is explicitly layout evidence, never a canonical claim.
 */
export function LocationCompositionReview() {
  const [sceneId, setSceneId] = useState<string>(rooms[0]!.id);
  const [selected, setSelected] = useState<string | null>(null);
  const [dialogue, setDialogue] = useState(false);
  const world = useMemo(
    () =>
      createNewGameWorld({
        placeKey: "kentucky",
        startAge: 34,
        depth: "summarize-earlier-life",
        startingLife: "ordinary-life",
        household: "shares-a-home",
        seed: "g-location-composition-v1",
        givenName: null,
        familyName: null,
        questionnaire: "skipped",
        priors: [],
      }),
    [],
  );
  const review = artPreviewLibraries("candidate-review")!;
  const people = useMemo(
    () =>
      planLifeScenePeople(
        world.world,
        Object.values(world.world.people)
          .filter(
            (p) =>
              p.id !== world.playerPersonId &&
              p.birthDate &&
              p.birthDate < "2000-01-01",
          )
          .slice(0, 2)
          .map((p) => ({
            personId: p.id,
            name: personName(p),
            relationship: null,
            introduction: "Synthetic staging for scene review",
          })),
        sceneId,
        undefined,
        { wardrobeByPersonId: {}, artPreview: review },
      ),
    [world, sceneId, review],
  );
  const scene = requireScene(SCENE_REGISTRY, sceneId);
  const room = rooms.find((room) => room.id === sceneId)!;
  const person = people.find((p) => p.personId === selected);
  return (
    <main
      className="life-shell"
      data-testid="location-review"
      data-scene-id={sceneId}
    >
      <p className="art-preview-banner" role="status">
        Development location review — unreleased candidate art; synthetic
        staging; no attendance or saves
      </p>
      <nav
        aria-label="Candidate locations"
        style={{ position: "fixed", top: 48, left: 20, zIndex: 100 }}
      >
        {rooms.map((room) => (
          <button
            key={room.id}
            type="button"
            aria-pressed={sceneId === room.id}
            onClick={() => {
              setSceneId(room.id);
              setSelected(null);
              setDialogue(false);
            }}
          >
            {room.label}
          </button>
        ))}
      </nav>
      <SceneBackdrop
        sceneId={sceneId}
        visualLibrary={locationReviewVisuals(import.meta.env.DEV)}
        people={people}
        selectedPersonId={selected}
        onSelectPerson={(id) => {
          setSelected(id);
          setDialogue(true);
        }}
      >
        <section
          className="game-section civic-glass"
          style={{ maxWidth: 420, padding: 16, fontSize: 14 }}
          data-testid="location-review-details"
        >
          <h1
            style={{ fontSize: "1.4rem", lineHeight: 1.2, margin: "0 0 8px" }}
          >
            {scene.label}
          </h1>
          <p>{room.route}</p>
          <details>
            <summary>Source and geometry</summary>
            <p>
              {scene.sceneId} · {scene.raster?.assetId} · deterministic
              downscales · rights unknown · native detail unverified
            </p>
            <p>
              Contact lines, footprints and occlusion silhouettes are visual
              estimates. Floor-plane and human visual acceptance pending. People
              use the existing candidate provider; whole-person coherence
              remains B-owned.
            </p>
          </details>
        </section>
      </SceneBackdrop>
      {person && dialogue ? (
        <div
          className="pg-talk"
          data-testid="location-dialogue-sample"
          style={{
            position: "fixed",
            bottom: 20,
            left: "50%",
            transform: "translateX(-50%)",
            width: "min(480px, calc(100vw - 32px))",
            zIndex: 110,
          }}
        >
          <strong>{person.name} · Layout sample</strong>
          <p>
            This is a composition review. No event or attendance has been
            recorded.
          </p>
          <button type="button" onClick={() => setDialogue(false)}>
            Back to room
          </button>
        </div>
      ) : null}
    </main>
  );
}
