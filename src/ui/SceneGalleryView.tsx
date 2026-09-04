import { useMemo, type CSSProperties } from "react";

import assetRequestDocument from "../../art/requests/asset-requests.json";
import intakeDispositions from "../../art/qa/p71/source_intake_dispositions.json";
import {
  openAssetRequests,
  summarizeAssetRequests,
  type AssetRequest,
  type AssetRequestDocument,
} from "../authoring/asset-request";
import {
  reportSceneConsumers,
  type SceneConsumerDisposition,
} from "../presentation/scene-consumers";
import {
  SCENE_REGISTRY,
  type RegisteredScene,
} from "../presentation/scene-registry";
import {
  bindSceneSurfaces,
  NO_SURFACE_PAYLOADS,
  summarizeSurfaceBindings,
} from "../presentation/surface-binding";
import { PRODUCTION_VISUAL_LIBRARY } from "../presentation/visual-integration";

/**
 * DEVELOPMENT ROUTE: the production background review surface.
 *
 * Reachable at `?view=scene-gallery`. It exists because deciding whether a
 * background is wired used to mean reading React or reading generated JSON,
 * and both of those are archaeology. Every room the runtime knows about is
 * below, with its own picture where it has one, what it is used for, and what
 * is stopping it where something is.
 *
 * Nothing here is a player surface, and nothing here composes a person: this
 * is the room review, and the character review is at `?view=character-proof`.
 */

const DISPOSITION_COPY: Readonly<Record<SceneConsumerDisposition, string>> = {
  "wired-to-production-art": "Wired to production art",
  "wired-to-honest-fallback": "Wired to an honest fallback",
  "registered-no-current-consumer": "Registered, nothing uses it yet",
  "blocked-by-missing-art": "Blocked: the picture does not exist",
  "blocked-by-missing-canonical-state":
    "Blocked: the fact that would justify it does not exist",
  "blocked-by-owning-lane": "Blocked: the seam is in another lane's file",
  "development-fixture-only": "Development route only",
};

function smallestTierUrl(scene: RegisteredScene): string | null {
  if (!scene.raster) return null;
  const asset = PRODUCTION_VISUAL_LIBRARY.get(scene.raster.assetId);
  if (!asset) return null;
  const widths = [...asset.tierUrls.keys()].sort((a, b) => a - b);
  const smallest = widths[0];
  return smallest === undefined ? null : (asset.tierUrls.get(smallest) ?? null);
}

function SceneCard({ scene }: { readonly scene: RegisteredScene }) {
  const url = smallestTierUrl(scene);
  const consumers = reportSceneConsumers().filter(
    (report) => report.sceneId === scene.sceneId,
  );

  return (
    <section
      className="scene-gallery-card"
      data-testid="scene-gallery-card"
      data-scene-id={scene.sceneId}
      data-presentation-status={scene.presentationStatus}
      data-has-plate={url ? "true" : "false"}
    >
      <div className="scene-gallery-plate">
        {url ? (
          <img
            src={url}
            alt=""
            draggable="false"
            data-testid="scene-gallery-plate"
            style={{ width: "100%", display: "block" } satisfies CSSProperties}
          />
        ) : (
          <p
            className="scene-gallery-no-plate"
            data-testid="scene-gallery-no-plate"
          >
            There is no picture of this room yet, and none is borrowed for it.
          </p>
        )}
      </div>

      <div className="scene-gallery-body">
        <h3>
          {scene.label}{" "}
          <small>
            {scene.presentationStatus === "production"
              ? "production"
              : "development fixture"}
          </small>
        </h3>
        <p className="scene-gallery-ids">
          <code>{scene.sceneId}</code>
          {scene.familyId ? <code>{scene.familyId}</code> : null}
        </p>

        <dl className="scene-gallery-facts">
          <dt>Plate</dt>
          <dd>
            {scene.plate.width}&times;{scene.plate.height}
          </dd>
          <dt>Tiers</dt>
          <dd>
            {scene.raster
              ? scene.raster.ladder.tiers
                  .map((tier) => `${tier.width} (${tier.derivation})`)
                  .join(", ")
              : "none"}
          </dd>
          <dt>Places a person can stand or sit</dt>
          <dd>{scene.anchors.size}</dd>
          <dt>Surfaces that can carry information</dt>
          <dd>{scene.surfaceSlots.length}</dd>
          <dt>Perspective calibration</dt>
          <dd>
            {scene.floorCalibration
              ? `near ${scene.floorCalibration.near.floor_y_percent}% to far ${scene.floorCalibration.far.floor_y_percent}%`
              : "not measured — see what is unknown, below"}
          </dd>
        </dl>

        <h4>Used for</h4>
        {consumers.length === 0 ? (
          <p className="scene-gallery-warning">
            Nothing uses this room. A registered room nothing uses is a room
            that will be forgotten.
          </p>
        ) : (
          <ul data-testid="scene-gallery-consumers">
            {consumers.map((consumer) => (
              <li
                key={consumer.consumerId}
                data-testid="scene-gallery-consumer"
              >
                <strong>{consumer.label}</strong>{" "}
                <em>{DISPOSITION_COPY[consumer.disposition]}</em>
                <span>{consumer.note}</span>
              </li>
            ))}
          </ul>
        )}

        <h4>What this room can say</h4>
        <SurfaceBindings scene={scene} />

        {(scene.spec.explicit_unknowns ?? []).length > 0 ? (
          <>
            <h4>What is not known about this room</h4>
            <ul className="scene-gallery-unknowns">
              {(scene.spec.explicit_unknowns ?? []).map((unknown, index) => (
                <li key={index}>{unknown}</li>
              ))}
            </ul>
          </>
        ) : null}
      </div>
    </section>
  );
}

const BINDING_STATE_COPY: Readonly<Record<string, string>> = {
  bound: "showing a real fact",
  empty: "an owner exists and has nothing for this room",
  unowned: "nothing owns this yet",
  decorative: "decoration only",
};

/**
 * Every declared surface, and what is actually on it.
 *
 * Bound with no payload provider on purpose: this route is not standing in a
 * world, and a review surface that invented one to make its own table look
 * full would be demonstrating the exact failure the binder prevents.
 */
function SurfaceBindings({ scene }: { readonly scene: RegisteredScene }) {
  const bindings = bindSceneSurfaces(scene, NO_SURFACE_PAYLOADS);
  const summary = summarizeSurfaceBindings(bindings);
  if (summary.total === 0) {
    return (
      <p className="scene-gallery-warning">
        This room declares no surface, so every future fact about it would have
        to be painted in.
      </p>
    );
  }
  return (
    <ul data-testid="scene-gallery-surfaces">
      {bindings.map((binding) => (
        <li
          key={binding.slotId}
          data-testid="scene-gallery-surface"
          data-slot-id={binding.slotId}
          data-binding-state={binding.state}
        >
          <strong>{binding.slotId}</strong>{" "}
          <em>{BINDING_STATE_COPY[binding.state]}</em>
          <span>
            Shows: {binding.shows}. {binding.because}
          </span>
        </li>
      ))}
    </ul>
  );
}

interface IntakeCell {
  readonly assetId: string;
  readonly sourceCell: string;
  readonly path: string;
  readonly exportSize: string;
  readonly disposition: string;
  readonly reason: string;
  readonly poseFamily?: string;
  readonly poseDescription?: string;
  readonly category?: string;
}

/**
 * The chopped source components, with the picture beside the verdict.
 *
 * A per-cell disposition is only reviewable if the reviewer can see the cell.
 * The dispositions are read from the generated intake report rather than
 * retyped, so this surface cannot drift from what the measurement actually
 * said.
 */
function SourceIntakeSection() {
  const sheets = (
    intakeDispositions as unknown as {
      readonly sheets: Record<
        string,
        { readonly master: string; readonly cells: readonly IntakeCell[] }
      >;
      readonly poseFamilyCoverage: Record<string, string>;
    }
  ).sheets;
  const coverage = (
    intakeDispositions as unknown as {
      readonly poseFamilyCoverage: Record<string, string>;
    }
  ).poseFamilyCoverage;
  const labels: Record<string, string> = {
    bodyPose: "Adult body poses",
    headDiversity: "Adult heads",
    footwear: "Footwear",
  };

  return (
    <section
      className="scene-gallery-intake"
      data-testid="scene-gallery-intake"
    >
      <h2>Chopped source components</h2>
      <p>
        Every cell cut from an owner source sheet, with what the measurement
        said about it. Nothing here is released: a cell that chopped cleanly is
        a cell that chopped cleanly, which is not the same as art anybody has
        agreed to ship.
      </p>

      {Object.entries(sheets).map(([key, sheet]) => (
        <div
          key={key}
          data-testid="scene-gallery-intake-sheet"
          data-sheet={key}
        >
          <h3>
            {labels[key] ?? key} <small>{sheet.cells.length} cells</small>
          </h3>
          <ul className="scene-gallery-intake-grid">
            {sheet.cells.map((cell) => (
              <li
                key={cell.assetId}
                data-testid="scene-gallery-intake-cell"
                data-asset-id={cell.assetId}
                data-disposition={cell.disposition}
              >
                <img src={cellUrl(cell.path)} alt="" draggable="false" />
                <p>
                  <strong>{cell.disposition}</strong>{" "}
                  <span>{cell.sourceCell}</span>
                </p>
                <p className="scene-gallery-intake-name">
                  <code>{cell.assetId}</code>
                </p>
                <p className="scene-gallery-intake-what">
                  {cell.poseFamily ?? cell.category ?? "head"}
                  {cell.poseDescription ? ` — ${cell.poseDescription}` : ""}
                </p>
                <p className="scene-gallery-intake-reason">{cell.reason}</p>
              </li>
            ))}
          </ul>
        </div>
      ))}

      <h3>Which adult poses this closes</h3>
      <ul data-testid="scene-gallery-pose-coverage">
        {Object.entries(coverage).map(([family, verdict]) => (
          <li key={family} data-pose-family={family}>
            <strong>{family}</strong> {verdict}
          </li>
        ))}
      </ul>
    </section>
  );
}

const candidateUrls = import.meta.glob<string>(
  "../../art/generated/candidates/**/*.png",
  { eager: true, import: "default", query: "?url" },
);

function cellUrl(repositoryPath: string): string {
  const key = `../../${repositoryPath}`;
  return candidateUrls[key] ?? "";
}

function RequestRow({ request }: { readonly request: AssetRequest }) {
  return (
    <li data-testid="scene-gallery-request" data-request-id={request.requestId}>
      <h4>
        {request.title}{" "}
        <small>
          {request.priority} &middot; {request.status}
        </small>
      </h4>
      <p>
        <code>{request.requestId}</code>
      </p>
      <p>{request.whyNeeded}</p>
      <p className="scene-gallery-shortfall">
        <strong>Already checked:</strong> {request.inventoryCheck.found}{" "}
        <strong>Why that is not enough:</strong>{" "}
        {request.inventoryCheck.shortfall}
      </p>
      {request.dependsOn.length > 0 ? (
        <p>Waits on {request.dependsOn.join(", ")}.</p>
      ) : null}
    </li>
  );
}

export function SceneGalleryView() {
  const scenes = useMemo(
    () =>
      [...SCENE_REGISTRY.scenes.values()].sort((a, b) =>
        a.presentationStatus === b.presentationStatus
          ? a.sceneId.localeCompare(b.sceneId)
          : a.presentationStatus === "production"
            ? -1
            : 1,
      ),
    [],
  );
  const consumers = useMemo(() => reportSceneConsumers(), []);
  const requests = (assetRequestDocument as AssetRequestDocument).requests;
  const open = openAssetRequests(requests);
  const summary = summarizeAssetRequests(requests);

  return (
    <main
      className="scene-gallery"
      data-testid="scene-gallery"
      data-scene-count={scenes.length}
      data-open-request-count={summary.open}
    >
      <header>
        <p className="character-proof-eyebrow">
          Developer proof &middot; every room the runtime knows about
        </p>
        <h1>Production background review</h1>
        <p>
          One card per registered room, with its own picture where it has one. A
          room with no picture says so and borrows nobody else&apos;s. Under
          each card is what the room is used for and what, if anything, is
          stopping it.
        </p>
      </header>

      <div className="scene-gallery-grid">
        {scenes.map((scene) => (
          <SceneCard key={scene.sceneId} scene={scene} />
        ))}
      </div>

      <section className="scene-gallery-matrix">
        <h2>Every surface that could show a room</h2>
        <p>
          Including the ones that show nothing. A surface missing from this
          table is the failure this table exists to catch.
        </p>
        <table data-testid="scene-gallery-matrix">
          <thead>
            <tr>
              <th>What the player is doing</th>
              <th>Room</th>
              <th>State</th>
              <th>What is owed</th>
            </tr>
          </thead>
          <tbody>
            {consumers.map((consumer) => (
              <tr
                key={consumer.consumerId}
                data-testid="scene-gallery-matrix-row"
                data-consumer-id={consumer.consumerId}
                data-disposition={consumer.disposition}
              >
                <td>
                  {consumer.label}
                  <br />
                  <small>{consumer.canonicalGate}</small>
                </td>
                <td>{consumer.sceneLabel ?? "—"}</td>
                <td>{DISPOSITION_COPY[consumer.disposition]}</td>
                <td>
                  {consumer.openRequestIds.length > 0 ? (
                    <code>{consumer.openRequestIds.join(", ")}</code>
                  ) : null}
                  {consumer.blockedSeam ? (
                    <span>{consumer.blockedSeam}</span>
                  ) : null}
                  {consumer.openRequestIds.length === 0 && !consumer.blockedSeam
                    ? "Nothing"
                    : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <SourceIntakeSection />

      <section className="scene-gallery-requests">
        <h2>What is actually missing</h2>
        <p>
          {summary.open} open of {summary.total} recorded &mdash;{" "}
          {summary.byPriority.P0} of them blocking, {summary.byPriority.P1}{" "}
          next, {summary.byPriority.P2} later. Each one says what was searched
          before it was asked for, because commissioning art the project already
          owns is the mistake this list exists to prevent.
        </p>
        <ul>
          {open.map((request) => (
            <RequestRow key={request.requestId} request={request} />
          ))}
        </ul>

        <h3>Closed, and why</h3>
        <ul data-testid="scene-gallery-closed-requests">
          {requests
            .filter((request) => !open.includes(request))
            .map((request) => (
              <li key={request.requestId} data-request-id={request.requestId}>
                <strong>{request.title}</strong> <em>{request.status}</em>
                <p>{request.resolutionNote}</p>
              </li>
            ))}
        </ul>
      </section>
    </main>
  );
}
