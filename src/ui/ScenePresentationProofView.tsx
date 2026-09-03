import { useMemo, useRef, useState, type CSSProperties } from "react";

import {
  composeSceneProof,
  createSceneProofWorld,
  SCENE_PROOF_SEED,
  type SceneProofContext,
} from "../presentation/scene-proof";
import {
  PRODUCTION_CHARACTER_LIBRARY,
  PRODUCTION_VISUAL_LIBRARY,
} from "../presentation/visual-integration";
import { useRasterTier } from "../player/useRasterTier";
import { useSceneTransform } from "../player/useSceneTransform";
import { SceneDebugOverlay } from "./SceneDebugOverlay";

/**
 * DEVELOPMENT ROUTE: the scene and person presentation proof.
 *
 * Reachable at `?view=scene-proof`. It is not a player surface and never
 * appears on the production route.
 */

function SceneStage({
  context,
  debug,
}: {
  readonly context: SceneProofContext;
  readonly debug: boolean;
}) {
  const { scene, characters } = context;
  const viewportRef = useRef<HTMLDivElement>(null);
  const transform = useSceneTransform(viewportRef, scene.plate, scene.camera);

  const environment = scene.raster
    ? PRODUCTION_VISUAL_LIBRARY.get(scene.raster.assetId)
    : undefined;
  const tier = useRasterTier(
    scene.raster?.ladder ?? null,
    environment?.tierUrls ?? null,
    transform.renderedSceneWidth,
    transform.devicePixelRatio,
    transform.viewport,
  );

  const cameraStyle = {
    width: `${scene.plate.width}px`,
    height: `${scene.plate.height}px`,
    transform: `translate3d(${transform.xOffset}px, ${transform.yOffset}px, 0) scale(${transform.uniformScale})`,
  } satisfies CSSProperties;

  return (
    <div
      ref={viewportRef}
      className="scene-proof-stage"
      data-testid="scene-proof-stage"
      data-scene-id={scene.sceneId}
      aria-label={`${scene.label}, a development fixture scene`}
    >
      <div
        className="scene-camera"
        data-testid="scene-proof-camera"
        data-scene-id={scene.sceneId}
        data-scene-scale={transform.uniformScale}
        data-device-pixel-ratio={transform.devicePixelRatio}
        data-painted-tier={tier.paintedWidth ?? ""}
        data-tier-swap-pending={tier.swapPending ? "true" : "false"}
        style={cameraStyle}
      >
        {tier.paintedUrl ? (
          <img
            className="scene-environment-art"
            src={tier.paintedUrl}
            alt=""
            aria-hidden="true"
            draggable="false"
            data-testid="scene-proof-plate"
          />
        ) : (
          <div
            className="scene-proof-no-plate"
            data-testid="scene-proof-no-plate"
          >
            <p>There is no picture of this room yet.</p>
          </div>
        )}

        {characters.map((character) => (
          <div
            key={`${character.personId}:${character.anchorId}`}
            className="modular-character"
            data-testid="scene-proof-character"
            data-person-id={character.personId}
            data-anchor-id={character.anchorId}
            data-complete={character.complete ? "true" : "false"}
            data-layer-count={character.layers.length}
            style={
              { zIndex: character.placement.zOrder } satisfies CSSProperties
            }
          >
            {character.layers.map((layer) =>
              layer.url ? (
                <img
                  key={layer.assetId}
                  className={`modular-character-layer modular-character-layer--${layer.kind}`}
                  src={layer.url}
                  alt=""
                  aria-hidden="true"
                  draggable="false"
                  data-testid="scene-proof-character-layer"
                  data-kind={layer.kind}
                  style={
                    {
                      left: `${layer.leftPercent}%`,
                      top: `${layer.topPercent}%`,
                      width: `${layer.widthPercent}%`,
                      height: `${layer.heightPercent}%`,
                      zIndex: layer.layer,
                    } satisfies CSSProperties
                  }
                />
              ) : null,
            )}
          </div>
        ))}

        {debug ? (
          <SceneDebugOverlay
            scene={scene}
            characters={characters}
            tierSelection={tier.selection}
          />
        ) : null}
      </div>
    </div>
  );
}

export function ScenePresentationProofView() {
  const [debug, setDebug] = useState(true);
  const world = useMemo(
    () => createSceneProofWorld(PRODUCTION_CHARACTER_LIBRARY),
    [],
  );
  const composition = useMemo(
    () =>
      composeSceneProof(
        world,
        PRODUCTION_CHARACTER_LIBRARY,
        PRODUCTION_VISUAL_LIBRARY,
      ),
    [world],
  );

  const warningCount = composition.contexts.reduce(
    (total, context) =>
      total +
      context.characters.reduce(
        (subtotal, character) => subtotal + character.diagnostics.length,
        0,
      ),
    0,
  );

  return (
    <main
      className="scene-proof"
      data-testid="scene-proof"
      data-world-seed={world.seed}
      data-catalog-generation={PRODUCTION_CHARACTER_LIBRARY.catalogGeneration}
      data-warning-count={warningCount}
    >
      <header className="scene-proof-header">
        <div>
          <p className="character-proof-eyebrow">
            Developer proof · DEV / NON-PRODUCTION fixture scenes and art
          </p>
          <h1>Scene and person presentation proof</h1>
          <p>
            The same generated people placed in two rooms by contact metadata
            alone. Nothing below is tuned per character: scale comes from each
            room&apos;s floor calibration, position comes from the body&apos;s
            own foot and pelvis contacts, and paint order comes from the floor
            line rather than the order they were listed in.
          </p>
        </div>
        <label>
          <input
            type="checkbox"
            checked={debug}
            data-testid="scene-proof-debug-toggle"
            onChange={(event) => setDebug(event.target.checked)}
          />
          Show contact, footprint and tier overlay
        </label>
      </header>

      {composition.contexts.map((context) => (
        <section
          key={context.scene.sceneId}
          className="scene-proof-context"
          data-testid="scene-proof-context"
          data-scene-id={context.scene.sceneId}
        >
          <div className="scene-proof-context-copy">
            <h2>{context.scene.label}</h2>
            <p>{context.purpose}</p>
          </div>
          <SceneStage context={context} debug={debug} />
          <ul className="scene-proof-cards">
            {context.characters.map((character) => (
              <li
                key={`${character.personId}:${character.anchorId}`}
                data-testid="scene-proof-card"
                data-person-id={character.personId}
                data-anchor-id={character.anchorId}
                data-complete={character.complete ? "true" : "false"}
              >
                <h3>
                  {character.displayName}{" "}
                  <small>
                    {character.anchorId} · {character.recipe.context.poseFamily}
                  </small>
                </h3>
                <p>
                  <code>
                    {character.recipe.identity.bodyFamily} /{" "}
                    {character.recipe.identity.headFamily} /{" "}
                    {character.recipe.identity.complexion ??
                      "no declared complexion"}
                  </code>
                </p>
                <p className="scene-proof-derived">
                  {`scale ${character.placement.scale.toFixed(3)} · floor ${character.placement.contactFloorYPercent}% · ${character.layers.length} layers`}
                </p>
                {character.fallbackDescription ? (
                  <p
                    className="scene-proof-fallback"
                    data-testid="scene-proof-fallback-copy"
                  >
                    {character.fallbackDescription}
                  </p>
                ) : (
                  <p className="scene-proof-complete">
                    Drawn in full, with every contact met.
                  </p>
                )}
                {character.diagnostics.length > 0 ? (
                  <ul data-testid="scene-proof-card-warnings">
                    {character.diagnostics.map((diagnostic, index) => (
                      <li
                        key={`${diagnostic.code}-${index}`}
                        data-warning={diagnostic.warning}
                        data-code={diagnostic.code}
                      >
                        <strong>{diagnostic.warning}</strong>{" "}
                        {diagnostic.message}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ))}

      <footer className="scene-proof-footer">
        <p>
          World seed <code>{SCENE_PROOF_SEED}</code>. These people are
          development proof fixtures drawn from the shared component library;
          they are not biography and their art is not production art.
        </p>
      </footer>
    </main>
  );
}
