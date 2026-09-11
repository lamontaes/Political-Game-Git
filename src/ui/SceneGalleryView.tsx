import { useMemo, useState, type CSSProperties } from "react";

import assetRequestDocument from "../../art/requests/asset-requests.json";
import intakeDispositions from "../../art/qa/p71/source_intake_dispositions.json";
import candidateReview from "../../art/qa/p95-recent-drive-sweep/candidate-component-review.json";
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
  dynamicSurfacePayloads,
  summarizeSurfaceBindings,
} from "../presentation/surface-binding";
import { reviewSurfaceProjectionDetail } from "../presentation/surface-review";
import { PRODUCTION_VISUAL_LIBRARY } from "../presentation/visual-integration";
import {
  DRIVE_SWEEP_TOTAL,
  ENVIRONMENT_SOURCES,
  environmentSourceBulkCounts,
  INTAKE_CARRIED_COUNT,
  type EnvironmentSourceDisposition,
  type EnvironmentSourceRecord,
} from "../environment/environment-sources";
import {
  SCENE_VENUES,
  scenesNoVenueReaches,
  VENUE_DELIBERATELY_UNREACHED,
} from "../presentation/scene-venues";
import {
  exerciseSceneVenues,
  type VenueExercise,
} from "./scene-venue-exercise";

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
  const [reviewUrl, setReviewUrl] = useState<string | null>(null);
  const releasedUrl = smallestTierUrl(scene);
  const url = releasedUrl ?? reviewUrl;
  /**
   * A SCENE WITH A LADDER AND NO URL IS NOT A SCENE WITH NO PICTURE.
   *
   * The card used to say "there is no picture of this room yet" whenever the
   * released runtime library had nothing for it, which was true while the only
   * such scene was the committee fixture — a room that genuinely has no plate.
   * The courtroom broke that assumption: it has an approved master, a derived
   * ladder and authored geometry, and is UNRELEASED on purpose. Saying it has
   * no picture would be the review page lying about the one asset this lane
   * carried furthest.
   */
  const hasLadderButNoRelease = url === null && scene.raster !== null;
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
      {scene.sceneId === "courtroom-empty-production" && !releasedUrl ? (
        <div>
          <p>
            Unreleased courtroom preview. Geometry estimates and missing masks
            remain visible below.
          </p>
          {!reviewUrl ? (
            <button
              type="button"
              onClick={() => {
                void import("../../art/families/courtroom/env_courtroom_empty_v1.png?url").then(
                  (module) => setReviewUrl(module.default),
                );
              }}
            >
              Preview unreleased courtroom
            </button>
          ) : null}
        </div>
      ) : null}
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
            data-reason={
              hasLadderButNoRelease ? "carried-not-released" : "no-plate-exists"
            }
          >
            {hasLadderButNoRelease
              ? "The picture EXISTS and is deliberately not released. Its master is approved, its tier ladder is derived and its geometry is authored; it is held back because nothing canonical would justify showing it. See the source table below for what would release it."
              : "There is no picture of this room yet, and none is borrowed for it."}
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
  withheld: "an owner has it and this surface cannot honestly have come by it",
  decorative: "decoration only",
};

/**
 * Every declared surface, and what is actually on it.
 *
 * Bound against ONE fixed review world, named in the copy above the table, and
 * never against an invented payload. That distinction is the whole value of
 * this route: a reviewer has to be able to tell "the seal has no owner" from
 * "the seal is on the wall", and a table filled with plausible strings to look
 * complete would demonstrate the exact failure the binder exists to prevent.
 */
function SurfaceBindings({ scene }: { readonly scene: RegisteredScene }) {
  const review = useMemo(() => reviewSurfaceProjectionDetail(), []);
  const bindings = bindSceneSurfaces(
    scene,
    dynamicSurfacePayloads(review.projection),
  );
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
    <>
      <p
        className="scene-gallery-note"
        data-testid="scene-gallery-surface-world"
      >
        Bound against one fixed review world: {review.description}
      </p>
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
              Fed by: {binding.access ?? "nothing declared"}. Shows:{" "}
              {binding.shows}. {binding.because}
            </span>
          </li>
        ))}
      </ul>
    </>
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

/** Existing coarse crops are inspectable without claiming item separation or release. */
function PropCandidateSection() {
  const [shown, setShown] = useState(false);
  const props = candidateReview.components.filter(
    (entry) => entry.family === "supplies",
  );
  return (
    <section className="scene-gallery-intake" data-testid="scene-gallery-props">
      <h2>Existing prop candidates</h2>
      <p>
        These {props.length} preserved coarse crops include individual objects
        and groups. They are not released props. Object separation, clean alpha,
        scene attachment and art approval remain explicit review gates.
      </p>
      <button
        type="button"
        onClick={() => setShown(!shown)}
        aria-expanded={shown}
      >
        {shown ? "Hide prop candidates" : "Preview prop candidates"}
      </button>
      {shown ? (
        <ul className="scene-gallery-intake-grid">
          {props.map((entry) => (
            <li
              key={entry.choppedOutputPath}
              data-testid="scene-gallery-prop-candidate"
            >
              <img
                src={cellUrl(entry.choppedOutputPath)}
                alt={`Unreleased prop crop ${entry.originalCell}`}
                loading="lazy"
              />
              <strong>
                {entry.originalCell}:{" "}
                {entry.apparentPoseCategory
                  .replace(/^wave_a_supplies_/, "")
                  .replace(/_v1$/, "")
                  .replaceAll("_", " ")}
              </strong>
              <p>
                {entry.choppedDimensions.width} ×{" "}
                {entry.choppedDimensions.height}; candidate only.
              </p>
              <p>{entry.productionEligibilityReason}</p>
              <details>
                <summary>Preserved lineage</summary>
                <p>
                  Source SHA-256: <code>{entry.sourceSha256}</code>
                </p>
                <p>
                  Crop SHA-256: <code>{entry.outputSha256}</code>
                </p>
              </details>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

/**
 * CANDIDATE PIXELS, FOR LOOKING AT ONLY.
 *
 * These are source images the owner already has and has NOT accepted. Showing
 * them in a development review is not releasing them: none is in the runtime
 * visual library, none is registered as a scene, and none can be selected by
 * any consumer. The alternative — describing a picture in words on a review
 * page whose whole purpose is looking at pictures — is how a candidate sits
 * unadjudicated for another packet.
 */
const environmentCandidateUrls = import.meta.glob<string>(
  "../../art/references/candidates/recent-drive-sweep/source-images/*.JPG",
  { eager: false, import: "default", query: "?url" },
);

/**
 * NOT EAGER, deliberately.
 *
 * These six candidates are roughly 19MB of JPEG. An eager glob puts every one
 * of them in the entry bundle, so a player who never opens a developer route
 * downloads nineteen megabytes of art nobody has approved — which is the
 * "blanket runtime loading of source masters" this lane was told not to do.
 * Lazy means Vite emits them as separate assets and fetches one only when a
 * reviewer asks to see it.
 */
function useCandidatePreview(repositoryPath: string | null): {
  readonly url: string | null;
  readonly loadable: boolean;
  readonly load: () => void;
} {
  const key = repositoryPath === null ? null : `../../${repositoryPath}`;
  const loader = key === null ? undefined : environmentCandidateUrls[key];
  const [url, setUrl] = useState<string | null>(null);
  return {
    url,
    loadable: loader !== undefined && url === null,
    load: () => {
      if (!loader) return;
      void loader().then(setUrl);
    },
  };
}

const SOURCE_DISPOSITION_COPY: Readonly<
  Record<EnvironmentSourceDisposition, string>
> = {
  "in-ordinary-play": "In ordinary play",
  "released-no-canonical-activity": "Released; nothing reaches it yet",
  "carried-not-released": "Carried through, held at the gate",
  "blocked-below-master-minimum": "Blocked: the master is too small",
  "candidate-preview-only": "Candidate — preview only, NOT released",
  "reference-only": "Reference only",
  "duplicate-of-accounted-source": "Duplicate of something accounted for",
  "source-sheet-not-separable":
    "Coarse crops preserved; item separation incomplete",
  "bank-empty": "A declared bank with nothing in it",
};

function SourceRow({ source }: { readonly source: EnvironmentSourceRecord }) {
  const preview = useCandidatePreview(source.path);
  const url = preview.url;
  const isCandidate = source.disposition === "candidate-preview-only";
  return (
    <tr
      data-testid="scene-gallery-source-row"
      data-source-id={source.sourceId}
      data-disposition={source.disposition}
    >
      <td>
        {url ? (
          <figure className="scene-gallery-source-preview">
            <img
              src={url}
              alt=""
              draggable="false"
              data-testid="scene-gallery-source-preview"
              style={
                { width: "100%", display: "block" } satisfies CSSProperties
              }
            />
            {isCandidate ? (
              <figcaption data-testid="scene-gallery-preview-label">
                PREVIEW ONLY — not released, not registered, not selectable.
              </figcaption>
            ) : null}
          </figure>
        ) : preview.loadable ? (
          <button
            type="button"
            className="ui-action"
            data-testid="scene-gallery-load-preview"
            onClick={preview.load}
          >
            Look at the candidate
          </button>
        ) : null}
        <strong>{source.label}</strong>
        <br />
        <code>{source.sourceId}</code>
      </td>
      <td>{SOURCE_DISPOSITION_COPY[source.disposition]}</td>
      <td>{source.sceneId ? <code>{source.sceneId}</code> : "—"}</td>
      <td>
        {source.remainingStep ?? "Nothing. This one is finished."}
        {source.owedBy ? (
          <>
            <br />
            <small>Owed by: {source.owedBy}</small>
          </>
        ) : null}
        {source.openRequestIds.length > 0 ? (
          <>
            <br />
            <code>{source.openRequestIds.join(", ")}</code>
          </>
        ) : null}
      </td>
      <td>{source.note}</td>
    </tr>
  );
}

/**
 * SOURCE TO SCENE, IN ONE TABLE.
 *
 * The question this answers is the one the activation asked for: of everything
 * this project already owns, what is in the game, and what exactly is stopping
 * the rest. Every row names a next step and somebody who owes it, or says
 * plainly that nothing is owed.
 */
function EnvironmentSourceSection() {
  const bulk = useMemo(() => environmentSourceBulkCounts(), []);
  const bulkTotal = bulk.reduce((total, row) => total + row.count, 0);
  return (
    <section
      className="scene-gallery-sources"
      data-testid="scene-gallery-sources"
      data-source-count={ENVIRONMENT_SOURCES.length}
    >
      <h2>Every environment, title, background and prop source</h2>
      <p>
        {ENVIRONMENT_SOURCES.length} sources adjudicated individually, out of{" "}
        {DRIVE_SWEEP_TOTAL} images the drive sweep byte-verified. The previous
        intake carried {INTAKE_CARRIED_COUNT} candidates; park and press room
        were never the cap, and the four the sweep left behind are below.
      </p>
      <p>
        Candidate pictures are shown so a reviewer can look at what already
        exists. <strong>Looking is not approving.</strong> Nothing on this page
        releases art, moves a rights status off unknown, or rules on a style
        family.
      </p>
      <table data-testid="scene-gallery-source-table">
        <thead>
          <tr>
            <th>Source</th>
            <th>Where it got to</th>
            <th>Scene</th>
            <th>What is left, and who owes it</th>
            <th>Why</th>
          </tr>
        </thead>
        <tbody>
          {ENVIRONMENT_SOURCES.map((source) => (
            <SourceRow key={source.sourceId} source={source} />
          ))}
        </tbody>
      </table>

      <h3>The rest of the sweep, counted</h3>
      <p>
        {bulkTotal} further environment-side images, none of which is a room.
        They are counted rather than listed so the eight that can still move are
        not buried under them.
      </p>
      <ul data-testid="scene-gallery-source-bulk">
        {bulk.map((row) => (
          <li
            key={`${row.classification}-${row.family}`}
            data-classification={row.classification}
          >
            <strong>{row.count}</strong> {row.classification} &mdash;{" "}
            {row.family}. {row.note}
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * WHERE A LIFE CAN ACTUALLY BE, AND THE PROOF THAT IT GETS THERE.
 *
 * The venue table maps canonical location keys to rooms. This section shows the
 * table AND runs it: each exercise builds a real world through the ordinary
 * new-game and ordinary-life paths, performs a real canonical
 * activity, and reports what `resolveLifeScene` answered. The negative controls
 * run in the same pass, because a room that appears is only half the claim —
 * the other half is that it does not appear when it should not.
 */
function VenueSection() {
  const [exercises, setExercises] = useState<readonly VenueExercise[] | null>(
    null,
  );
  const unreached = useMemo(() => scenesNoVenueReaches(), []);

  return (
    <section
      className="scene-gallery-venues"
      data-testid="scene-gallery-venues"
      data-venue-count={SCENE_VENUES.length}
    >
      <h2>Which room a canonical activity happens in</h2>
      <p>
        The declared location bindings and their supported scenes. An unmapped
        key gets no room &mdash; not the nearest one. A journey gets no room
        either: changing a backdrop is not travel.
      </p>
      <table data-testid="scene-gallery-venue-table">
        <thead>
          <tr>
            <th>Canonical location</th>
            <th>Room</th>
            <th>Why</th>
          </tr>
        </thead>
        <tbody>
          {SCENE_VENUES.map((venue) => (
            <tr
              key={venue.locationKey}
              data-testid="scene-gallery-venue-row"
              data-location-key={venue.locationKey}
              data-has-room={venue.sceneId ? "true" : "false"}
            >
              <td>
                <code>{venue.locationKey}</code>
                {venue.isJourney ? <strong> (a journey)</strong> : null}
              </td>
              <td>
                {venue.sceneId ? <code>{venue.sceneId}</code> : "No room"}
              </td>
              <td>{venue.reason}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3>Registered rooms no canonical location reaches</h3>
      <ul data-testid="scene-gallery-unreached">
        {unreached.map((sceneId) => (
          <li key={sceneId} data-scene-id={sceneId}>
            <code>{sceneId}</code> &mdash;{" "}
            {VENUE_DELIBERATELY_UNREACHED.get(sceneId) ??
              "Not yet accounted for, which is itself the finding."}
          </li>
        ))}
      </ul>

      <h3>Exercise it</h3>
      <p>
        This builds real worlds through the ordinary new-game path and asks
        where each life is. It writes nothing and advances no clock.
      </p>
      <button
        type="button"
        className="ui-action ui-action--primary"
        data-testid="scene-gallery-exercise"
        onClick={() => setExercises(exerciseSceneVenues())}
      >
        Run the venue exercises
      </button>
      {exercises ? (
        <ul data-testid="scene-gallery-exercise-results">
          {exercises.map((exercise) => (
            <li
              key={exercise.id}
              data-exercise-id={exercise.id}
              data-passed={exercise.passed ? "true" : "false"}
            >
              <strong>{exercise.passed ? "AS EXPECTED" : "UNEXPECTED"}</strong>{" "}
              {exercise.what}
              <br />
              <small>
                Expected {exercise.expected ?? "no room"}; got{" "}
                {exercise.actual ?? "no room"}. {exercise.reason}
              </small>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

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

export function SceneGalleryView({
  selectedSceneId,
}: { readonly selectedSceneId?: string } = {}) {
  const scenes = useMemo(
    () =>
      [...SCENE_REGISTRY.scenes.values()]
        .filter(
          (scene) => !selectedSceneId || scene.sceneId === selectedSceneId,
        )
        .sort((a, b) =>
          a.presentationStatus === b.presentationStatus
            ? a.sceneId.localeCompare(b.sceneId)
            : a.presentationStatus === "production"
              ? -1
              : 1,
        ),
    [selectedSceneId],
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
          Developer proof &middot; every room, and every source behind them
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

      <EnvironmentSourceSection />

      <VenueSection />

      <SourceIntakeSection />
      <PropCandidateSection />

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
