import { useMemo, useRef, type CSSProperties } from "react";

import {
  composeProductionOffice,
  type ProductionOfficeCharacter,
} from "../presentation/production-office";
import { PRODUCTION_VISUAL_LIBRARY } from "../presentation/visual-integration";
import { useRasterTier } from "../player/useRasterTier";
import { useSceneTransform } from "../player/useSceneTransform";

/**
 * DEVELOPMENT ROUTE: the PRODUCTION office proof.
 *
 * Reachable at `?view=production-office`. It is not a player surface.
 *
 * This is the surface human visual acceptance of the office happens on. It
 * exists because the only office proof that existed drew a development fixture
 * plate and two authored legacy sitters, so every review of it was a review of
 * fixture art. The header states, in the picture, which scene and which raster
 * are on screen and by which path each person did or did not render, so a
 * screenshot of this page cannot be mistaken for a screenshot of the fixture.
 */
export function ProductionOfficeProofView() {
  const composition = useMemo(() => composeProductionOffice(), []);
  const { scene, characters } = composition;
  const viewportRef = useRef<HTMLDivElement>(null);
  const transform = useSceneTransform(viewportRef, scene.plate, scene.camera);

  const environment = scene.raster
    ? PRODUCTION_VISUAL_LIBRARY.get(scene.raster.assetId)
    : undefined;
  const paint = useRasterTier(
    scene.raster?.ladder ?? null,
    environment?.tierUrls ?? null,
    transform.renderedSceneWidth,
    transform.devicePixelRatio,
    transform.viewport,
  );

  const selected = paint.selection;
  const tier = selected?.tier ?? null;

  const stageStyle: CSSProperties = {
    width: `${scene.plate.width}px`,
    height: `${scene.plate.height}px`,
    transformOrigin: "0 0",
    transform: `translate3d(${transform.xOffset}px, ${transform.yOffset}px, 0) scale(${transform.uniformScale})`,
  };

  return (
    <main
      className="scene-proof"
      data-testid="production-office-proof"
      data-scene-id={scene.sceneId}
      data-presentation-status={scene.presentationStatus}
      data-environment-asset-id={composition.environmentAssetId ?? ""}
      data-raster-width={tier?.width ?? ""}
      data-raster-height={tier?.height ?? ""}
      data-raster-derivation={tier?.derivation ?? ""}
      data-has-production-person={String(composition.hasAnyProductionPerson)}
    >
      <p className="scene-proof-kicker">
        Developer proof ·{" "}
        {scene.presentationStatus === "production"
          ? "PRODUCTION SCENE"
          : "DEVELOPMENT FIXTURE"}
      </p>
      <h1>Production office</h1>

      <dl className="scene-proof-facts" data-testid="production-office-facts">
        <dt>Scene id</dt>
        <dd>
          <code data-testid="fact-scene-id">{scene.sceneId}</code>
        </dd>
        <dt>Presentation status</dt>
        <dd>
          <strong data-testid="fact-presentation-status">
            {scene.presentationStatus}
          </strong>
        </dd>
        <dt>Environment asset id</dt>
        <dd>
          <code data-testid="fact-environment-asset-id">
            {composition.environmentAssetId ?? "none"}
          </code>
        </dd>
        <dt>Raster tier on screen</dt>
        <dd data-testid="fact-raster-tier">
          {tier
            ? `${tier.width}x${tier.height} · ${tier.derivation}${
                tier.nativeDetailWidth === undefined
                  ? " · pixel width is the real detail"
                  : ` · real detail stops at ${tier.nativeDetailWidth}px`
              }`
            : "no raster registered"}
        </dd>
        <dt>Master of record</dt>
        <dd data-testid="fact-master">
          <code>
            art/references/masters/scene-environment/OCD_SCENE_MASTER_SHARED_WORKROOM_OFFICE_5504x3072_01.jpg
          </code>{" "}
          — 5504x3072, preserved byte-for-byte; every runtime tier is a
          downscale of it.
        </dd>
        <dt>Character rendering</dt>
        <dd data-testid="fact-character-paths">
          {composition.hasAnyProductionPerson
            ? "at least one anchor composed a production person"
            : "NO production person composed — every anchor failed closed"}
        </dd>
      </dl>

      <div className="scene-proof-viewport" ref={viewportRef}>
        <div className="scene-proof-stage" style={stageStyle}>
          {paint.paintedUrl ? (
            <img
              className="scene-environment-art"
              alt=""
              aria-hidden="true"
              draggable="false"
              data-testid="production-office-plate"
              data-asset-id={composition.environmentAssetId ?? ""}
              src={paint.paintedUrl}
            />
          ) : (
            <p className="scene-proof-missing">
              This scene registers no raster, so no picture is drawn.
            </p>
          )}

          {characters.map((character) =>
            character.path === "modular-production" && character.plan ? (
              <div
                key={character.anchorId}
                className="modular-character"
                data-testid="production-office-character"
                data-anchor-id={character.anchorId}
                data-render-path={character.path}
                style={{
                  position: "absolute",
                  left: `${character.plan.box.leftPercent}%`,
                  top: `${character.plan.box.topPercent}%`,
                  width: `${character.plan.box.widthPercent}%`,
                  height: `${character.plan.box.heightPercent}%`,
                }}
              >
                {character.plan.layers.map((layer) => (
                  <img
                    key={layer.assetId}
                    className="modular-character-layer"
                    alt=""
                    aria-hidden="true"
                    draggable="false"
                    data-asset-id={layer.assetId}
                    src={layer.url ?? undefined}
                    style={{
                      position: "absolute",
                      left: `${layer.leftPercent}%`,
                      top: `${layer.topPercent}%`,
                      width: `${layer.widthPercent}%`,
                    }}
                  />
                ))}
              </div>
            ) : (
              <ProductionAnchorPlaceholder
                key={character.anchorId}
                character={character}
                anchorXPercent={
                  scene.anchors.get(character.anchorId)?.xPercent ?? 50
                }
                anchorYPercent={
                  scene.anchors.get(character.anchorId)?.contactFloorYPercent ??
                  50
                }
              />
            ),
          )}
        </div>
      </div>

      <table
        className="scene-proof-table"
        data-testid="production-office-paths"
      >
        <caption>
          Every anchor, and the path it took. A production scene draws
          production art or it draws nothing; it never falls back to the
          development fixture bank.
        </caption>
        <thead>
          <tr>
            <th>Anchor</th>
            <th>Path</th>
            <th>Why</th>
          </tr>
        </thead>
        <tbody>
          {characters.map((character) => (
            <tr key={character.anchorId} data-anchor-id={character.anchorId}>
              <td>
                <code>{character.anchorId}</code>
              </td>
              <td data-testid="path-cell" data-render-path={character.path}>
                {character.path}
              </td>
              <td>
                {character.failedClosedBecause.length === 0
                  ? "composed from released production components"
                  : character.failedClosedBecause.join("; ")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}

/**
 * A visible, labelled gap.
 *
 * A missing person is drawn as an explicit marker rather than left blank,
 * because an empty room and a room whose people failed to resolve look
 * identical, and only one of them is a defect.
 */
function ProductionAnchorPlaceholder({
  character,
  anchorXPercent,
  anchorYPercent,
}: {
  readonly character: ProductionOfficeCharacter;
  readonly anchorXPercent: number;
  readonly anchorYPercent: number;
}) {
  return (
    <div
      className="production-anchor-placeholder"
      data-testid="production-office-placeholder"
      data-anchor-id={character.anchorId}
      data-render-path={character.path}
      style={{
        position: "absolute",
        left: `${anchorXPercent}%`,
        top: `${anchorYPercent}%`,
      }}
    >
      <span>{character.anchorId}</span>
      <small>no production art</small>
    </div>
  );
}
