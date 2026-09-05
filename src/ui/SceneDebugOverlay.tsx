import type { CSSProperties } from "react";

import type { SceneCharacterPresentation } from "../presentation/scene-composition";
import type { RasterTierSelection } from "../presentation/raster-tiers";
import type { SceneDiagnostic } from "../presentation/scene-placement";
import type { RegisteredScene } from "../presentation/scene-registry";

/**
 * DEVELOPMENT-ONLY visual debug overlay.
 *
 * Everything it draws comes from METADATA — scene contacts, body contacts,
 * derived scale, occluder regions, surface slots, the selected raster tier —
 * and nothing from baked art. Its acceptance standard is that a floating,
 * sinking or clipping person is diagnosable from ONE screenshot as a specific
 * contract mismatch, without reading source.
 *
 * The text here is deliberately technical. It is a developer surface, and the
 * player-facing degradation copy lives in `scene-composition.ts` instead.
 */

interface SceneDebugOverlayProps {
  readonly scene: RegisteredScene;
  readonly characters: readonly SceneCharacterPresentation[];
  readonly tierSelection: RasterTierSelection | null;
  readonly testId?: string;
}

function percent(value: number): string {
  return `${value}%`;
}

function HorizontalRule({
  yPercent,
  label,
  variant,
  testId,
}: {
  yPercent: number;
  label: string;
  variant: string;
  testId: string;
}) {
  return (
    <div
      className={`scene-debug-rule scene-debug-rule--${variant}`}
      data-testid={testId}
      data-y-percent={yPercent}
      style={{ top: percent(yPercent) } satisfies CSSProperties}
    >
      <small>{label}</small>
    </div>
  );
}

function Marker({
  xPercent,
  yPercent,
  label,
  variant,
  testId,
}: {
  xPercent: number;
  yPercent: number;
  label: string;
  variant: string;
  testId: string;
}) {
  return (
    <span
      className={`scene-debug-marker scene-debug-marker--${variant}`}
      data-testid={testId}
      data-marker-label={label}
      data-x-percent={xPercent}
      data-y-percent={yPercent}
      title={`${label} — ${xPercent.toFixed(2)}%, ${yPercent.toFixed(2)}%`}
      style={
        {
          left: percent(xPercent),
          top: percent(yPercent),
        } satisfies CSSProperties
      }
    >
      <small>{label}</small>
    </span>
  );
}

function DiagnosticList({
  diagnostics,
  testId,
}: {
  diagnostics: readonly SceneDiagnostic[];
  testId: string;
}) {
  if (diagnostics.length === 0) {
    return (
      <p className="scene-debug-clean" data-testid={`${testId}-clean`}>
        No contract warnings.
      </p>
    );
  }
  return (
    <ul className="scene-debug-warnings" data-testid={testId}>
      {diagnostics.map((diagnostic, index) => (
        <li
          key={`${diagnostic.code}-${index}`}
          data-testid={`${testId}-item`}
          data-warning={diagnostic.warning}
          data-code={diagnostic.code}
        >
          <strong>{diagnostic.warning}</strong> <code>{diagnostic.code}</code>
          <span>{diagnostic.message}</span>
        </li>
      ))}
    </ul>
  );
}

export function SceneDebugOverlay({
  scene,
  characters,
  tierSelection,
  testId = "scene-debug-overlay",
}: SceneDebugOverlayProps) {
  const calibration = scene.floorCalibration;
  const allDiagnostics = characters.flatMap(
    (character) => character.diagnostics,
  );

  return (
    <>
      <div
        className="scene-debug-layer"
        data-testid={testId}
        data-scene-id={scene.sceneId}
        data-warning-count={allDiagnostics.length}
        aria-hidden="true"
      >
        {/* Scene-owned geometry: the floor ramp and every declared plane. */}
        {calibration ? (
          <>
            <HorizontalRule
              yPercent={calibration.near.floor_y_percent}
              label={`near floor · scale ${calibration.near.scale}`}
              variant="calibration"
              testId={`${testId}-near-floor`}
            />
            <HorizontalRule
              yPercent={calibration.far.floor_y_percent}
              label={`far floor · scale ${calibration.far.scale}`}
              variant="calibration"
              testId={`${testId}-far-floor`}
            />
          </>
        ) : null}

        {[...scene.anchors.values()].map((anchor) => (
          <div key={anchor.id}>
            <HorizontalRule
              yPercent={anchor.contactFloorYPercent}
              label={`${anchor.id} floor ${anchor.contactFloorYPercent}%`}
              variant="floor"
              testId={`${testId}-anchor-floor`}
            />
            {anchor.seatContact ? (
              <HorizontalRule
                yPercent={anchor.seatContact.seat_plane_y_percent}
                label={`${anchor.id} seat plane ${anchor.seatContact.seat_plane_y_percent}%`}
                variant="seat"
                testId={`${testId}-seat-plane`}
              />
            ) : null}
            {anchor.footprintPercent !== null ? (
              <div
                className="scene-debug-footprint"
                data-testid={`${testId}-footprint`}
                data-anchor-id={anchor.id}
                style={
                  {
                    left: percent(
                      anchor.xPercent - anchor.footprintPercent / 2,
                    ),
                    top: percent(anchor.contactFloorYPercent - 1),
                    width: percent(anchor.footprintPercent),
                  } satisfies CSSProperties
                }
              >
                <small>{`footprint ${anchor.footprintPercent}%`}</small>
              </div>
            ) : null}
          </div>
        ))}

        {scene.occluders.map((occluder) =>
          occluder.regionPercent ? (
            <div
              key={occluder.id}
              className="scene-debug-occluder"
              data-testid={`${testId}-occluder`}
              data-occluder-id={occluder.id}
              data-z-order={occluder.zOrder}
              style={
                {
                  left: percent(occluder.regionPercent.x_percent),
                  top: percent(occluder.regionPercent.y_percent),
                  width: percent(occluder.regionPercent.width_percent),
                  height: percent(occluder.regionPercent.height_percent),
                } satisfies CSSProperties
              }
            >
              <small>{`${occluder.id} · z${occluder.zOrder}`}</small>
            </div>
          ) : null,
        )}

        {scene.surfaceSlots.map((slot) => (
          <div
            key={slot.slot_id}
            className="scene-debug-slot"
            data-testid={`${testId}-surface-slot`}
            data-slot-id={slot.slot_id}
            data-slot-kind={slot.kind}
            data-z-order={slot.z_order}
            style={
              {
                left: percent(slot.rect_percent.x_percent),
                top: percent(slot.rect_percent.y_percent),
                width: percent(slot.rect_percent.width_percent),
                height: percent(slot.rect_percent.height_percent),
              } satisfies CSSProperties
            }
          >
            <small>{`${slot.slot_id} · ${slot.kind}`}</small>
          </div>
        ))}

        {/* Person-owned geometry: root, contacts, box, derived scale, facing. */}
        {characters.map((character) => {
          const { placement, box } = character;
          return (
            <div
              key={`${character.personId}:${character.anchorId}`}
              className="scene-debug-person"
              data-testid={`${testId}-person`}
              data-person-id={character.personId}
              data-anchor-id={character.anchorId}
              data-complete={character.complete ? "true" : "false"}
              data-derived-scale={placement.scale}
              data-contact-floor={placement.contactFloorYPercent}
              data-z-order={placement.zOrder}
              data-warning-count={character.diagnostics.length}
            >
              <div
                className="scene-debug-box"
                data-testid={`${testId}-person-box`}
                style={
                  {
                    left: percent(box.leftPercent),
                    top: percent(box.topPercent),
                    width: percent(box.widthPercent),
                    height: percent(box.heightPercent),
                  } satisfies CSSProperties
                }
              >
                <small>
                  {`${character.displayName} · scale ${placement.scale.toFixed(3)} · floor ${placement.contactFloorYPercent}% · z${placement.zOrder}`}
                </small>
              </div>
              <div
                className="scene-debug-hitbox"
                data-testid={`${testId}-person-hitbox`}
                style={
                  {
                    left: percent(placement.hitbox.leftPercent),
                    top: percent(placement.hitbox.topPercent),
                    width: percent(placement.hitbox.widthPercent),
                    height: percent(placement.hitbox.heightPercent),
                  } satisfies CSSProperties
                }
              />
              <Marker
                xPercent={placement.rootMarker.xPercent}
                yPercent={placement.rootMarker.yPercent}
                label="pelvis"
                variant="root"
                testId={`${testId}-root-marker`}
              />
              {placement.seatedPelvisMarker ? (
                <Marker
                  xPercent={placement.seatedPelvisMarker.xPercent}
                  yPercent={placement.seatedPelvisMarker.yPercent}
                  label="seated pelvis"
                  variant="seated-pelvis"
                  testId={`${testId}-seated-pelvis-marker`}
                />
              ) : null}
              {placement.floorContactMarkers.map((marker) => (
                <Marker
                  key={marker.id}
                  xPercent={marker.xPercent}
                  yPercent={marker.yPercent}
                  label={marker.id}
                  variant="foot"
                  testId={`${testId}-foot-marker`}
                />
              ))}
              <span
                className="scene-debug-facing"
                data-testid={`${testId}-facing`}
                data-facing={character.recipe.context.headOrientation ?? ""}
                style={
                  {
                    left: percent(placement.rootMarker.xPercent),
                    top: percent(box.topPercent - 2),
                  } satisfies CSSProperties
                }
              >
                <small>
                  {`facing ${character.recipe.context.headOrientation ?? "unknown"} ↓`}
                </small>
              </span>
            </div>
          );
        })}
      </div>

      <aside
        className="scene-debug-panel"
        data-testid={`${testId}-panel`}
        data-scene-id={scene.sceneId}
      >
        <h3>{scene.label}</h3>
        <dl>
          <dt>Presentation status</dt>
          <dd data-testid={`${testId}-status`}>{scene.presentationStatus}</dd>
          <dt>Selected raster tier</dt>
          <dd data-testid={`${testId}-tier`}>
            {tierSelection
              ? `${tierSelection.tier.width}px (${tierSelection.tier.derivation})`
              : "no plate registered for this room"}
          </dd>
          <dt>Required device pixels</dt>
          <dd data-testid={`${testId}-required-device-width`}>
            {tierSelection ? Math.ceil(tierSelection.requiredDeviceWidth) : "—"}
          </dd>
          <dt>Source coverage</dt>
          <dd data-testid={`${testId}-coverage`}>
            {tierSelection
              ? `${tierSelection.effectiveSourceCoverage.toFixed(3)}x${
                  tierSelection.sufficient ? "" : " — under-resolved"
                }`
              : "—"}
          </dd>
        </dl>

        {tierSelection && tierSelection.warnings.length > 0 ? (
          <ul
            className="scene-debug-warnings"
            data-testid={`${testId}-tier-warnings`}
          >
            {tierSelection.warnings.map((warning) => (
              <li key={warning.code} data-code={warning.code}>
                <strong>W7</strong> <code>{warning.code}</code>
                <span>{warning.message}</span>
              </li>
            ))}
          </ul>
        ) : null}

        {characters.map((character) => (
          <section
            key={`${character.personId}:${character.anchorId}`}
            className="scene-debug-person-report"
            data-testid={`${testId}-person-report`}
            data-person-id={character.personId}
            data-anchor-id={character.anchorId}
            data-complete={character.complete ? "true" : "false"}
          >
            <h4>
              {character.displayName}{" "}
              <small>
                {character.anchorId} · {character.recipe.context.poseFamily}
              </small>
            </h4>
            <p className="scene-debug-identity">
              <code>
                {character.recipe.identity.bodyFamily} /{" "}
                {character.recipe.identity.headFamily} /{" "}
                {character.recipe.identity.complexion ??
                  "no declared complexion"}
              </code>
            </p>
            {character.fallbackDescription ? (
              <p
                className="scene-debug-player-copy"
                data-testid={`${testId}-player-copy`}
              >
                {character.fallbackDescription}
              </p>
            ) : null}
            <DiagnosticList
              diagnostics={character.diagnostics}
              testId={`${testId}-person-warnings`}
            />
          </section>
        ))}
      </aside>
    </>
  );
}
