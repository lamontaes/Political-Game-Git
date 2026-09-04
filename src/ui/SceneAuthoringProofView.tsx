import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";

import {
  buildCaptureExport,
  createAuthoringCapture,
  platePointFromPointer,
  serializeCaptureExport,
  unsettledCaptureCount,
  CAPTURE_KINDS,
  type AuthoringCapture,
  type CaptureKind,
  type PlatePoint,
} from "../authoring/authoring-capture";
import type { AuthoringCertainty } from "../authoring/scene-scaffold";
import {
  selectRasterTier,
  withinFidelityEnvelope,
} from "../presentation/raster-tiers";
import {
  SCENE_REGISTRY,
  type RegisteredScene,
} from "../presentation/scene-registry";
import { PRODUCTION_VISUAL_LIBRARY } from "../presentation/visual-integration";
import { useRasterTier } from "../player/useRasterTier";
import { useSceneTransform } from "../player/useSceneTransform";
import { SceneDebugOverlay } from "./SceneDebugOverlay";

/**
 * DEVELOPMENT ROUTE: the scene authoring overlay.
 *
 * Reachable at `?view=scene-authoring`. It is not a player surface, it never
 * appears on the production route, and it does not touch PlayerGame.
 *
 * The problem it solves is that authoring a scene currently means guessing a
 * percentage, editing a file, reloading, and looking at whether the person's
 * feet landed. This turns that loop into: hover to read the coordinate, click
 * to capture it, say how sure you are, and copy the block.
 *
 * The certainty control is the part that matters. Every captured number is an
 * estimate read off a picture, and the export says so on its face, so a
 * coordinate cannot quietly acquire the authority of a measurement on its way
 * into a spec.
 */

const CERTAINTIES: readonly AuthoringCertainty[] = [
  "ESTIMATED",
  "VERIFIED",
  "UNVERIFIED",
  "UNKNOWN",
];

function AuthoringStage({
  scene,
  captures,
  onCapture,
  showOverlay,
}: {
  readonly scene: RegisteredScene;
  readonly captures: readonly AuthoringCapture[];
  readonly onCapture: (point: PlatePoint) => void;
  readonly showOverlay: boolean;
}) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const cameraRef = useRef<HTMLDivElement>(null);
  const transform = useSceneTransform(viewportRef, scene.plate, scene.camera);
  const [hover, setHover] = useState<PlatePoint | null>(null);

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

  const pointFrom = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>): PlatePoint | null => {
      const element = cameraRef.current;
      if (!element) return null;
      const bounds = element.getBoundingClientRect();
      return platePointFromPointer(event.clientX, event.clientY, {
        left: bounds.left,
        top: bounds.top,
        width: bounds.width,
        height: bounds.height,
        plateWidth: scene.plate.width,
        plateHeight: scene.plate.height,
      });
    },
    [scene.plate.height, scene.plate.width],
  );

  const cameraStyle = {
    width: `${scene.plate.width}px`,
    height: `${scene.plate.height}px`,
    transform: `translate3d(${transform.xOffset}px, ${transform.yOffset}px, 0) scale(${transform.uniformScale})`,
  } satisfies CSSProperties;

  const sceneCaptures = captures.filter(
    (capture) => capture.sceneId === scene.sceneId,
  );

  return (
    <div className="scene-authoring-stage-wrap">
      <div
        ref={viewportRef}
        className="scene-proof-stage scene-authoring-stage"
        data-testid="scene-authoring-stage"
        data-scene-id={scene.sceneId}
        onPointerMove={(event) => setHover(pointFrom(event))}
        onPointerLeave={() => setHover(null)}
        onClick={(event) => {
          const point = pointFrom(
            event as unknown as ReactPointerEvent<HTMLDivElement>,
          );
          if (point) onCapture(point);
        }}
      >
        <div
          ref={cameraRef}
          className="scene-camera"
          data-testid="scene-authoring-camera"
          data-scene-scale={transform.uniformScale}
          data-painted-tier={tier.paintedWidth ?? ""}
          style={cameraStyle}
        >
          {tier.paintedUrl ? (
            <img
              className="scene-environment-art"
              src={tier.paintedUrl}
              alt=""
              aria-hidden="true"
              draggable="false"
              data-testid="scene-authoring-plate"
            />
          ) : (
            <div className="scene-proof-no-plate">
              <p>
                There is no picture of this room yet. The geometry overlay below
                still works: contacts are metadata, not paint.
              </p>
            </div>
          )}

          {showOverlay ? (
            <SceneDebugOverlay
              scene={scene}
              characters={[]}
              tierSelection={tier.selection}
              testId="scene-authoring-overlay"
            />
          ) : null}

          {sceneCaptures.map((capture) => (
            <span
              key={capture.captureId}
              className={`scene-authoring-capture scene-authoring-capture--${capture.certainty.toLowerCase()}`}
              data-testid="scene-authoring-capture-marker"
              data-capture-id={capture.captureId}
              data-certainty={capture.certainty}
              style={
                {
                  left: `${capture.point.xPercent}%`,
                  top: `${capture.point.yPercent}%`,
                } satisfies CSSProperties
              }
            >
              <small>
                {capture.kind}
                {capture.subjectId ? ` · ${capture.subjectId}` : ""}
              </small>
            </span>
          ))}
        </div>
      </div>

      <dl
        className="scene-authoring-readout"
        data-testid="scene-authoring-readout"
      >
        <div>
          <dt>Pointer</dt>
          <dd data-testid="scene-authoring-pointer">
            {hover
              ? `${hover.x} × ${hover.y} px · ${hover.xPercent.toFixed(2)}% × ${hover.yPercent.toFixed(2)}%${hover.withinPlate ? "" : " (outside the plate)"}`
              : "— hover the plate —"}
          </dd>
        </div>
        <div>
          <dt>Plate</dt>
          <dd>
            {scene.plate.width} × {scene.plate.height} · painted at{" "}
            {Math.round(transform.renderedSceneWidth)} css px · DPR{" "}
            {transform.devicePixelRatio}
          </dd>
        </div>
        <div>
          <dt>Raster tier</dt>
          <dd data-testid="scene-authoring-tier">
            <TierReadout scene={scene} transform={transform} />
          </dd>
        </div>
      </dl>
    </div>
  );
}

function TierReadout({
  scene,
  transform,
}: {
  readonly scene: RegisteredScene;
  readonly transform: {
    renderedSceneWidth: number;
    devicePixelRatio: number;
    viewport: { width: number; height: number };
  };
}) {
  if (!scene.raster) {
    return (
      <span data-tier-state="no-raster">No raster ladder registered.</span>
    );
  }
  const selection = selectRasterTier(scene.raster.ladder, {
    paintedPlateCssWidth: Math.max(1, transform.renderedSceneWidth),
    devicePixelRatio: transform.devicePixelRatio,
    viewport: transform.viewport,
  });
  const insideEnvelope = withinFidelityEnvelope(selection.requiredDeviceWidth);
  return (
    <span
      data-tier-state={selection.sufficient ? "sufficient" : "short"}
      data-tier-width={selection.tier.width}
      data-within-envelope={insideEnvelope ? "true" : "false"}
    >
      {`${selection.tier.width}px (${selection.tier.derivation}) · needs ${Math.ceil(selection.requiredDeviceWidth)} device px · coverage ${selection.effectiveSourceCoverage.toFixed(2)}×`}
      {selection.warnings.length > 0 ? (
        <ul data-testid="scene-authoring-fidelity-warnings">
          {selection.warnings.map((warning) => (
            <li key={warning.code} data-code={warning.code}>
              {warning.message}
            </li>
          ))}
        </ul>
      ) : null}
      {!insideEnvelope ? (
        <em>
          {" "}
          Above the supported fidelity envelope; browser upscale from the top
          tier is documented behaviour here, not a defect.
        </em>
      ) : null}
    </span>
  );
}

export function SceneAuthoringProofView() {
  const scenes = useMemo(() => [...SCENE_REGISTRY.scenes.values()], []);
  const [sceneId, setSceneId] = useState(scenes[0]?.sceneId ?? "");
  const [kind, setKind] = useState<CaptureKind>("floor-line");
  const [subjectId, setSubjectId] = useState("");
  const [certainty, setCertainty] = useState<AuthoringCertainty>("ESTIMATED");
  const [showOverlay, setShowOverlay] = useState(true);
  const [captures, setCaptures] = useState<readonly AuthoringCapture[]>([]);

  const scene = scenes.find((entry) => entry.sceneId === sceneId) ?? scenes[0];

  const capture = useCallback(
    (point: PlatePoint) => {
      if (!scene) return;
      setCaptures((current) => [
        ...current,
        createAuthoringCapture({
          sceneId: scene.sceneId,
          kind,
          ...(subjectId.trim() ? { subjectId: subjectId.trim() } : {}),
          point,
          certainty,
          sequence: current.length + 1,
        }),
      ]);
    },
    [certainty, kind, scene, subjectId],
  );

  const exported = useMemo(
    () =>
      scene
        ? serializeCaptureExport(buildCaptureExport(scene.sceneId, captures))
        : "",
    [captures, scene],
  );

  if (!scene) {
    return (
      <main className="scene-proof" data-testid="scene-authoring">
        <p>The scene registry is empty.</p>
      </main>
    );
  }

  const unsettled = unsettledCaptureCount(captures);

  return (
    <main
      className="scene-proof scene-authoring"
      data-testid="scene-authoring"
      data-scene-id={scene.sceneId}
      data-capture-count={captures.length}
    >
      <header className="scene-proof-header">
        <div>
          <p className="character-proof-eyebrow">
            Developer authoring surface · DEV / NON-PRODUCTION
          </p>
          <h1>Scene authoring overlay</h1>
          <p>
            Hover the plate to read a coordinate, click to capture it, and copy
            the block into a scene spec. Every captured value carries the
            certainty you chose: a coordinate read off a picture is an estimate,
            and it stays labelled as one all the way into the spec.
          </p>
        </div>
        <label>
          <input
            type="checkbox"
            checked={showOverlay}
            data-testid="scene-authoring-overlay-toggle"
            onChange={(event) => setShowOverlay(event.target.checked)}
          />
          Show contact, footprint and slot geometry
        </label>
      </header>

      <div className="scene-authoring-controls">
        <label>
          Scene
          <select
            value={scene.sceneId}
            data-testid="scene-authoring-scene-select"
            onChange={(event) => setSceneId(event.target.value)}
          >
            {scenes.map((entry) => (
              <option key={entry.sceneId} value={entry.sceneId}>
                {entry.label} ({entry.presentationStatus})
              </option>
            ))}
          </select>
        </label>
        <label>
          Capturing
          <select
            value={kind}
            data-testid="scene-authoring-kind-select"
            onChange={(event) => setKind(event.target.value as CaptureKind)}
          >
            {CAPTURE_KINDS.map((entry) => (
              <option key={entry} value={entry}>
                {entry}
              </option>
            ))}
          </select>
        </label>
        <label>
          For
          <input
            type="text"
            value={subjectId}
            placeholder="anchor, slot or occluder id"
            data-testid="scene-authoring-subject-input"
            onChange={(event) => setSubjectId(event.target.value)}
          />
        </label>
        <label>
          Certainty
          <select
            value={certainty}
            data-testid="scene-authoring-certainty-select"
            onChange={(event) =>
              setCertainty(event.target.value as AuthoringCertainty)
            }
          >
            {CERTAINTIES.map((entry) => (
              <option key={entry} value={entry}>
                {entry}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          data-testid="scene-authoring-clear"
          onClick={() => setCaptures([])}
        >
          Clear captures
        </button>
      </div>

      <AuthoringStage
        scene={scene}
        captures={captures}
        onCapture={capture}
        showOverlay={showOverlay}
      />

      <section className="scene-authoring-export">
        <h2>
          Captured values{" "}
          <small data-testid="scene-authoring-unsettled">
            {captures.length} captured · {unsettled} still unsettled
          </small>
        </h2>
        <ol data-testid="scene-authoring-capture-list">
          {captures.map((entry) => (
            <li
              key={entry.captureId}
              data-testid="scene-authoring-capture-row"
              data-certainty={entry.certainty}
              data-kind={entry.kind}
            >
              <code>
                {entry.kind}
                {entry.subjectId ? ` · ${entry.subjectId}` : ""} —{" "}
                {entry.point.xPercent.toFixed(2)}% ×{" "}
                {entry.point.yPercent.toFixed(2)}%
              </code>{" "}
              <strong>{entry.certainty}</strong>
            </li>
          ))}
        </ol>
        <textarea
          readOnly
          rows={12}
          value={exported}
          data-testid="scene-authoring-export"
          aria-label="Captured authoring metadata, ready to copy"
        />
      </section>

      <footer className="scene-proof-footer">
        <p>
          This surface reads the scene registry and writes nothing. It does not
          touch PlayerGame, saves, or any canonical simulation state; captured
          values leave only through the block above, by hand.
        </p>
      </footer>
    </main>
  );
}
