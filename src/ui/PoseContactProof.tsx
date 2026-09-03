import { useMemo, useState, type CSSProperties } from "react";

import {
  composePoseProof,
  type PoseProofCell,
  type PoseProofPerson,
} from "../presentation/pose-proof";
import type { World } from "../simulation/types";
import {
  POSE_CONTROL_PLATE_URLS,
  PRODUCTION_CHARACTER_LIBRARY,
  PRODUCTION_POSE_ART,
  PRODUCTION_POSE_REGISTRY,
  PRODUCTION_VISUAL_LIBRARY,
} from "../presentation/visual-integration";

/**
 * DEVELOPMENT SECTION of the scene and person presentation proof.
 *
 * The pose and contact lane: one identity across every registered pose family,
 * each cell showing the deterministic control plate beside the composed body,
 * with root, contacts and attachment anchors drawn as DOM overlays from
 * metadata — never baked into any raster.
 *
 * A pose with no art is not skipped and is not filled with somebody else's
 * picture. Its cell stays empty and names the exact compatibility gap.
 */

function MarkerLayer({
  markers,
  variant,
}: {
  readonly markers: readonly { id: string; xPercent: number; yPercent: number }[];
  readonly variant: "body" | "plate-contact" | "plate-landmark";
}) {
  return (
    <>
      {markers.map((marker) => (
        <span
          key={`${variant}:${marker.id}`}
          className={`pose-proof-marker pose-proof-marker--${variant}`}
          data-testid="pose-proof-marker"
          data-variant={variant}
          data-marker-id={marker.id}
          title={`${marker.id} · ${marker.xPercent.toFixed(1)}%, ${marker.yPercent.toFixed(1)}%`}
          style={
            {
              left: `${marker.xPercent}%`,
              top: `${marker.yPercent}%`,
            } satisfies CSSProperties
          }
        />
      ))}
    </>
  );
}

function PoseCell({
  cell,
  overlay,
}: {
  readonly cell: PoseProofCell;
  readonly overlay: boolean;
}) {
  const family = cell.poseFamily;
  const plateUrl = POSE_CONTROL_PLATE_URLS[family.control_plate.path] ?? null;

  return (
    <li
      className="pose-proof-cell"
      data-testid="pose-proof-cell"
      data-pose-family={family.pose_family_id}
      data-priority={family.priority}
      data-posture={family.posture_class}
      data-production-status={family.production_status}
      data-drawn={cell.drawn ? "true" : "false"}
      data-contacts-agree={
        cell.contactsAgree === null
          ? cell.bodyIsLegacyContactless
            ? "legacy-contactless"
            : "unknown"
          : String(cell.contactsAgree)
      }
      data-body-asset-id={cell.bodyAssetId ?? ""}
      data-gap-count={cell.gaps.length}
    >
      <h4>
        {family.label}{" "}
        <small>
          {family.priority} · {family.posture_class} · {family.facing}
        </small>
      </h4>

      <div className="pose-proof-pair">
        <figure
          className="pose-proof-plate"
          data-testid="pose-proof-plate"
          style={
            { aspectRatio: String(cell.plateAspectRatio) } satisfies CSSProperties
          }
        >
          {plateUrl ? (
            <img src={plateUrl} alt="" aria-hidden="true" draggable="false" />
          ) : (
            <p>No control plate is registered for this pose.</p>
          )}
          {overlay ? (
            <>
              <MarkerLayer
                markers={cell.plateLandmarkMarkers}
                variant="plate-landmark"
              />
              <MarkerLayer
                markers={cell.plateContactMarkers}
                variant="plate-contact"
              />
            </>
          ) : null}
          <figcaption>Control plate · {family.nominal_canvas.width}×{family.nominal_canvas.height}</figcaption>
        </figure>

        <figure
          className="pose-proof-body"
          data-testid="pose-proof-body"
          style={
            {
              aspectRatio: String(cell.bodyBoxAspectRatio),
            } satisfies CSSProperties
          }
        >
          {cell.layers.length > 0 ? (
            cell.layers.map((layer) =>
              layer.url ? (
                <img
                  key={layer.assetId}
                  className="pose-proof-body-layer"
                  src={layer.url}
                  alt=""
                  aria-hidden="true"
                  draggable="false"
                  data-testid="pose-proof-body-layer"
                  data-asset-id={layer.assetId}
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
            )
          ) : (
            <p
              className="pose-proof-empty"
              data-testid="pose-proof-empty-cell"
            >
              There is no picture of anyone in this pose yet.
            </p>
          )}
          {overlay ? (
            <MarkerLayer markers={cell.bodyMarkers} variant="body" />
          ) : null}
          <figcaption>Composed body · {family.production_status}</figcaption>
        </figure>
      </div>

      {cell.layers.length > 0 ? (
        <p className="pose-proof-assets">
          <code data-testid="pose-proof-asset-ids">
            {cell.layers.map((layer) => layer.assetId).join(" · ")}
          </code>
        </p>
      ) : null}

      <dl className="pose-proof-status">
        <div>
          <dt>Contacts vs pose family</dt>
          <dd data-testid="pose-proof-contact-verdict">
            {cell.contactsAgree === null
              ? cell.bodyIsLegacyContactless
                ? `not comparable — ${cell.bodyAssetId} belongs to a body family recorded as legacy-contactless, so it places by its pelvis root and its contact is unverified`
                : "no body contacts to compare"
              : cell.contactsAgree
                ? `within ${family.contact_tolerance} tolerance`
                : `OUTSIDE ${family.contact_tolerance} tolerance`}
          </dd>
        </div>
        <div>
          <dt>Contact verification</dt>
          <dd>
            {family.contact_verification.status}
            {family.contact_verification.reason
              ? ` — ${family.contact_verification.reason}`
              : ""}
          </dd>
        </div>
        <div>
          <dt>Master minimum</dt>
          <dd>
            {family.master_minimum.width}×{family.master_minimum.height} source,
            never reached by enlargement
          </dd>
        </div>
        {cell.missingSlotIds.length > 0 ? (
          <div>
            <dt>Required slots not filled</dt>
            <dd data-testid="pose-proof-missing-slots">
              {cell.missingSlotIds.join(", ")}
            </dd>
          </div>
        ) : null}
        {cell.unreleasedAssetIds.length > 0 ? (
          <div>
            <dt>Resolved but not runtime approved</dt>
            <dd>{cell.unreleasedAssetIds.join(", ")}</dd>
          </div>
        ) : null}
      </dl>

      {cell.gaps.length > 0 ? (
        <ul className="pose-proof-gaps" data-testid="pose-proof-gaps">
          {cell.gaps.map((gap, index) => (
            <li key={`${gap.code}-${index}`} data-code={gap.code}>
              <strong>{gap.code}</strong> {gap.message}
            </li>
          ))}
        </ul>
      ) : null}
    </li>
  );
}

function PersonRow({
  person,
  overlay,
}: {
  readonly person: PoseProofPerson;
  readonly overlay: boolean;
}) {
  return (
    <section
      className="pose-proof-person"
      data-testid="pose-proof-person"
      data-person-id={person.personId}
      data-body-family={person.bodyFamily}
      data-identity-key={person.identityKey}
    >
      <div className="scene-proof-context-copy">
        <h3>{person.displayName}</h3>
        <p>
          <code>
            {person.bodyFamily} / {person.headFamily} /{" "}
            {person.complexion ?? "no declared complexion"}
          </code>
        </p>
        <p>
          One identity recipe across every pose below. The identity key on this
          row is what must not change when the pose does.
        </p>
      </div>
      <ul className="pose-proof-cells">
        {person.cells.map((cell) => (
          <PoseCell
            key={cell.poseFamily.pose_family_id}
            cell={cell}
            overlay={overlay}
          />
        ))}
      </ul>
    </section>
  );
}

export function PoseContactProof({ world }: { readonly world: World }) {
  const [overlay, setOverlay] = useState(true);
  const composition = useMemo(
    () =>
      composePoseProof(
        world,
        PRODUCTION_CHARACTER_LIBRARY,
        PRODUCTION_VISUAL_LIBRARY,
        PRODUCTION_POSE_REGISTRY,
        PRODUCTION_POSE_ART,
      ),
    [world],
  );

  return (
    <section
      className="pose-proof"
      data-testid="pose-proof"
      data-identity-stable={composition.identityStable ? "true" : "false"}
      data-person-count={composition.people.length}
      data-p0-gap-count={composition.coverage.p0Gaps.length}
      data-body-family-count={
        new Set(composition.people.map((person) => person.bodyFamily)).size
      }
    >
      <header className="scene-proof-header">
        <div>
          <p className="character-proof-eyebrow">
            Developer proof · pose families, contacts and control plates
          </p>
          <h2>Pose and contact proof</h2>
          <p>
            Each row is one person; each cell is one registered pose family. The
            left half of a cell is the deterministic control plate generated
            from that family&apos;s landmarks; the right half is the body the
            modular recipe actually composes. Markers are DOM overlays read from
            metadata and are never drawn into any raster. A pose with no art
            stays empty and names the compatibility gap rather than borrowing
            another pose&apos;s picture.
          </p>
        </div>
        <label>
          <input
            type="checkbox"
            checked={overlay}
            data-testid="pose-proof-overlay-toggle"
            onChange={(event) => setOverlay(event.target.checked)}
          />
          Show landmark, contact and anchor overlay
        </label>
      </header>

      <table className="pose-proof-coverage" data-testid="pose-proof-coverage">
        <caption>
          Pose coverage, computed from the registry and the released library —
          not asserted.
        </caption>
        <thead>
          <tr>
            <th scope="col">Pose family</th>
            <th scope="col">Priority</th>
            <th scope="col">Status</th>
            <th scope="col">Body families with art</th>
            <th scope="col">Still missing</th>
          </tr>
        </thead>
        <tbody>
          {composition.coverage.rows.map((row) => (
            <tr
              key={row.poseFamilyId}
              data-testid="pose-proof-coverage-row"
              data-pose-family={row.poseFamilyId}
              data-covered={row.covered ? "true" : "false"}
              data-priority={row.priority}
            >
              <th scope="row">{row.poseFamilyId}</th>
              <td>{row.priority}</td>
              <td>{row.productionStatus}</td>
              <td>{row.coveredBodyFamilies.join(", ") || "—"}</td>
              <td>{row.missingBodyFamilies.join(", ") || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {composition.people.map((person) => (
        <PersonRow key={person.personId} person={person} overlay={overlay} />
      ))}
    </section>
  );
}
