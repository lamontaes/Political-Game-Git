import { useMemo, useRef, useState, type CSSProperties } from "react";

import wardrobeReport from "../../art/qa/p95-wave-a-morphology/wave-a-wardrobe-report.json";
import admissionReport from "../../art/qa/p95-wave-a-morphology/wave-a-admission-report.json";
import {
  admittedCandidateBodies,
  composeCandidateReviewSubject,
  WAVE_A_ADMITTED_ASSET_IDS,
  WAVE_A_WARDROBE_RECORDS,
  CANDIDATE_REVIEW_FLOOR_Y_PERCENT,
  CANDIDATE_REVIEW_PLATE,
  WAVE_A_REVIEW_CHARACTER_LIBRARY,
  WAVE_A_REVIEW_VISUAL_LIBRARY,
  type CandidateReviewSubject,
} from "../presentation/candidate-review";
import { CHARACTER_PROOF_SCENE } from "../presentation/character-proof";
import { ModularCharacter } from "../player/ModularCharacter";
import { useSceneTransform } from "../player/useSceneTransform";

/**
 * Candidate ADMISSION review.
 *
 * The banked-candidate proof next door reviews parts that already compose into
 * a whole person. This reviews the Wave A bodies, which do not: they are real
 * measured silhouettes with no face and no wardrobe authored for them yet, and
 * the useful question about them is exactly what is missing.
 *
 * So every panel here is built to be read as evidence, not as a demo. The
 * figure is painted at the developer proof's own plate and body width, so its
 * size is the size a person is; each required slot names either the components
 * that fit it or the contract reason nothing does; and nothing on this surface
 * can be released, because the library it draws from is a throwaway lift of an
 * unreleased candidate registry.
 */

const summary = admissionReport.summary as {
  readonly measured: number;
  readonly admitted: number;
  readonly admittedFamilies: readonly string[];
  readonly admittedPoseFamilies: readonly string[];
  readonly byDisposition: Readonly<Record<string, number>>;
  readonly sourceBytesUnchanged: boolean;
  readonly rowsDisagreeingWithPriorClaim: number;
};

interface ReportRow {
  readonly assetId: string;
  readonly family: string;
  readonly outputPath: string;
  readonly disposition: string;
  readonly registeredPoseFamily: string | null;
  readonly observation: {
    readonly posture: string;
    readonly facing: string;
    readonly bakedProp: string;
    readonly extent: string;
    readonly confidence: string;
    readonly note?: string;
  };
  readonly priorClaim: { readonly apparentPoseCategory: string };
  readonly priorClaimDisagreements: readonly string[];
  readonly unresolved: readonly string[];
}

const reportRows = admissionReport.candidates as readonly ReportRow[];
const derivedIds = new Set(
  WAVE_A_WARDROBE_RECORDS.map((record) => record.asset_id),
);

function ReviewStage({
  subject,
  debugAnchors,
}: {
  readonly subject: CandidateReviewSubject;
  readonly debugAnchors: boolean;
}) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const transform = useSceneTransform(
    viewportRef,
    CANDIDATE_REVIEW_PLATE,
    CHARACTER_PROOF_SCENE.camera,
  );
  const cameraStyle = {
    width: `${CANDIDATE_REVIEW_PLATE.width}px`,
    height: `${CANDIDATE_REVIEW_PLATE.height}px`,
    transform: `translate3d(${transform.xOffset}px, ${transform.yOffset}px, 0) scale(${transform.uniformScale})`,
  } satisfies CSSProperties;

  return (
    <div
      ref={viewportRef}
      className="character-proof-stage"
      data-testid="candidate-review-stage"
      aria-label={`Candidate body ${subject.review.assetId} at gameplay scale`}
    >
      <div
        className="scene-camera"
        data-testid="candidate-review-compositor"
        data-scene-scale={transform.uniformScale}
        data-body-asset-id={subject.review.assetId}
        style={cameraStyle}
      >
        <div className="character-proof-floor" aria-hidden="true" />
        <div
          className="candidate-review-floor-line"
          data-testid="candidate-review-floor-line"
          aria-hidden="true"
          style={
            {
              top: `${CANDIDATE_REVIEW_FLOOR_Y_PERCENT}%`,
            } satisfies CSSProperties
          }
        />
        <ModularCharacter
          plan={subject.plan}
          debugAnchors={debugAnchors}
          testId="candidate-review-character"
        />
      </div>
    </div>
  );
}

function SlotTable({ subject }: { readonly subject: CandidateReviewSubject }) {
  return (
    <table data-testid="candidate-review-slots">
      <thead>
        <tr>
          <th>Slot</th>
          <th>Required</th>
          <th>Compatible components</th>
          <th>Why not</th>
        </tr>
      </thead>
      <tbody>
        {subject.review.slots.map((slot) => (
          <tr
            key={slot.slotId}
            data-slot-id={slot.slotId}
            data-compatible={slot.compatible.length}
          >
            <td>
              <code>{slot.slotId}</code>
            </td>
            <td>{slot.required ? "required" : "optional"}</td>
            <td>
              {slot.compatible.length > 0 ? (
                <code>{slot.compatible.join(", ")}</code>
              ) : (
                "—"
              )}
            </td>
            <td>
              {slot.paintedByBody
                ? "Painted by body (not a face acceptance)"
                : (slot.refusal ?? "—")}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function CandidateAdmissionReview() {
  const bodies = useMemo(() => admittedCandidateBodies(), []);
  const [selected, setSelected] = useState<string>(
    () => bodies[0]?.assetId ?? "",
  );
  const [debugAnchors, setDebugAnchors] = useState(false);
  const [repeatKey, setRepeatKey] = useState(0);
  const [variationOffset, setVariationOffset] = useState(0);
  const [wardrobeFamilies, setWardrobeFamilies] = useState<
    Partial<Record<"top" | "bottom" | "footwear", readonly string[]>>
  >({});

  const subject = useMemo(() => {
    if (!selected) return null;
    const body = bodies.find((entry) => entry.assetId === selected);
    if (!body) return null;
    return composeCandidateReviewSubject({
      library: WAVE_A_REVIEW_CHARACTER_LIBRARY,
      visualLibrary: WAVE_A_REVIEW_VISUAL_LIBRARY,
      bodyAssetId: body.assetId,
      variationOffset,
      wardrobe: {
        id: "candidate-selected-wardrobe-v1",
        families: wardrobeFamilies,
      },
      plate: CANDIDATE_REVIEW_PLATE,
    });
  }, [bodies, selected, variationOffset, wardrobeFamilies]);

  /**
   * Identity continuity, shown rather than asserted: the same body composed a
   * second time, and the same body composed at a second anchor. Both must print
   * the same recipe key as the panel above, because identity belongs to the
   * appearance and not to where the figure is standing.
   */
  const continuity = useMemo(() => {
    if (!subject) return null;
    const body = bodies.find((entry) => entry.assetId === selected)!;
    const again = composeCandidateReviewSubject({
      library: WAVE_A_REVIEW_CHARACTER_LIBRARY,
      visualLibrary: WAVE_A_REVIEW_VISUAL_LIBRARY,
      bodyAssetId: body.assetId,
      appearance: subject.appearance,
      wardrobe: {
        id: "candidate-selected-wardrobe-v1",
        families: wardrobeFamilies,
      },
      plate: CANDIDATE_REVIEW_PLATE,
    });
    const elsewhere = composeCandidateReviewSubject({
      library: WAVE_A_REVIEW_CHARACTER_LIBRARY,
      visualLibrary: WAVE_A_REVIEW_VISUAL_LIBRARY,
      bodyAssetId: body.assetId,
      appearance: subject.appearance,
      wardrobe: {
        id: "candidate-selected-wardrobe-v1",
        families: wardrobeFamilies,
      },
      plate: CANDIDATE_REVIEW_PLATE,
      xPercent: 78,
      anchorId: "review-anchor-far",
    });
    return { again, elsewhere };
    // `repeatKey` is a deliberate dependency: the Recompose button exists to
    // prove a fresh composition lands on the same identity.
  }, [bodies, selected, subject, repeatKey, wardrobeFamilies]);

  const selectedRow = reportRows.find((row) => row.assetId === selected);

  return (
    <section
      className="character-proof-section"
      data-testid="candidate-admission-review"
    >
      <h2>Wave A candidate admission</h2>
      <p className="character-proof-banner">
        CANDIDATE REFERENCE ONLY. These bodies are in no catalog generation, are
        held <code>unreleased</code>, and are unreachable from any player-facing
        selection. Measurement is not approval.
      </p>
      <p>
        {summary.measured} Wave A crops were measured; {summary.admitted} were
        admitted as candidate bodies across {summary.admittedFamilies.length}{" "}
        morphology families and pose families{" "}
        <code>{summary.admittedPoseFamilies.join(", ")}</code>. Source crop
        bytes unchanged: <strong>{String(summary.sourceBytesUnchanged)}</strong>
        . {summary.rowsDisagreeingWithPriorClaim} rows disagree with the
        sweep&rsquo;s recorded pose or prop claim.
      </p>
      <label>
        Body{" "}
        <select
          data-testid="candidate-review-body-select"
          value={selected}
          onChange={(event) => {
            setSelected(event.target.value);
            setVariationOffset(0);
            setWardrobeFamilies({});
          }}
        >
          {bodies.map((body) => (
            <option key={body.assetId} value={body.assetId}>
              {WAVE_A_ADMITTED_ASSET_IDS.has(body.assetId)
                ? "Wave A"
                : derivedIds.has(body.assetId)
                  ? "Wave A normalized candidate"
                  : "banked pg"}{" "}
              · {body.family} · {body.poseFamily} · {body.assetId}
            </option>
          ))}
        </select>
      </label>{" "}
      <label>
        <input
          type="checkbox"
          checked={debugAnchors}
          onChange={(event) => setDebugAnchors(event.target.checked)}
        />{" "}
        Show root and attachment anchors
      </label>{" "}
      <button
        type="button"
        data-testid="candidate-review-recompose"
        onClick={() => setRepeatKey((value) => value + 1)}
      >
        Recompose
      </button>
      {subject ? (
        <>
          <fieldset>
            <legend>Candidate combinations (unapproved)</legend>
            <label>
              Identity search offset{" "}
              <input
                type="number"
                min="0"
                max={Number.MAX_SAFE_INTEGER - 4096}
                step="1"
                value={variationOffset}
                onChange={(event) =>
                  setVariationOffset(
                    Math.min(
                      Number.MAX_SAFE_INTEGER - 4096,
                      Math.max(0, Math.floor(Number(event.target.value) || 0)),
                    ),
                  )
                }
              />
            </label>
            {(["top", "bottom", "footwear"] as const).map((kind) => {
              const slot = subject.review.slots.find(
                (slot) => slot.kind === kind,
              );
              const families = [
                ...new Set(
                  (slot?.compatible ?? []).map(
                    (id) =>
                      WAVE_A_REVIEW_CHARACTER_LIBRARY.components.get(id)!
                        .definition.family,
                  ),
                ),
              ].sort();
              return (
                <label key={kind}>
                  {kind}{" "}
                  <select
                    data-testid={`candidate-select-${kind}`}
                    value={wardrobeFamilies[kind]?.[0] ?? ""}
                    onChange={(event) =>
                      setWardrobeFamilies((prior) => {
                        const next = { ...prior };
                        if (event.target.value)
                          next[kind] = [event.target.value];
                        else delete next[kind];
                        return next;
                      })
                    }
                  >
                    <option value="">Identity default</option>
                    {families.map((family) => (
                      <option key={family}>{family}</option>
                    ))}
                  </select>
                </label>
              );
            })}
          </fieldset>
          <ReviewStage subject={subject} debugAnchors={debugAnchors} />
          <dl data-testid="candidate-review-identity">
            <dt>Recipe key</dt>
            <dd>
              <code data-testid="candidate-review-recipe-key">
                {subject.plan.recipeKey}
              </code>
            </dd>
            <dt>Recipe key, recomposed</dt>
            <dd>
              <code data-testid="candidate-review-recipe-key-again">
                {continuity?.again?.plan.recipeKey ?? "—"}
              </code>
            </dd>
            <dt>Recipe key, second anchor</dt>
            <dd>
              <code data-testid="candidate-review-recipe-key-elsewhere">
                {continuity?.elsewhere?.plan.recipeKey ?? "—"}
              </code>
            </dd>
            <dt>Placement</dt>
            <dd data-testid="candidate-review-placement">
              {subject.placement.basis}
              {subject.placement.note ? ` — ${subject.placement.note}` : ""}
            </dd>
            <dt>Slot-complete (not face, fit, rights or style acceptance)</dt>
            <dd data-testid="candidate-review-complete">
              {String(subject.plan.complete)}
            </dd>
            <dt>Missing</dt>
            <dd>
              <code>{subject.plan.missing.join(", ") || "—"}</code>
            </dd>
            <dt>Layers drawn</dt>
            <dd>
              <ol>
                {subject.plan.layers.map((layer) => (
                  <li key={layer.assetId} data-released={layer.released}>
                    <code>{layer.assetId}</code> · L{layer.layer} ·{" "}
                    {layer.attachmentAnchorId ?? "rig"} ·{" "}
                    {layer.released ? "released for review" : "withheld"}
                  </li>
                ))}
              </ol>
            </dd>
          </dl>

          {derivedIds.has(selected) ? (
            <section data-testid="candidate-fit-evidence">
              <h3>Candidate fit evidence</h3>
              <p>
                49 of 68 historical garment derivatives were enlarged from small
                masters; they are retained evidence and cannot be regenerated by
                the corrected pipeline. The baked head contains no facial
                features. Slot completion does not make this a finished person.
                Rights and owner style acceptance remain unresolved.
              </p>
              <p>
                {wardrobeReport.summary.within_bound}/
                {wardrobeReport.summary.measured} representative derivatives
                meet the reported 3% landmark residual screen. This is not the
                accepted ease metric: framing, reference proportions, silhouette
                bounds and attachment-row exclusions limit interpretation. A
                failed residual does not prove missing pixels.
              </p>
              <table>
                <thead>
                  <tr>
                    <th>Selected garment</th>
                    <th>Representative body</th>
                    <th>Residual</th>
                    <th>Measurement status</th>
                  </tr>
                </thead>
                <tbody>
                  {subject.plan.layers
                    .filter((layer) =>
                      ["top", "bottom", "footwear"].includes(layer.kind),
                    )
                    .map((layer) => {
                      const measured = wardrobeReport.measurements.find(
                        (entry) => entry.garment_asset_id === layer.assetId,
                      );
                      return (
                        <tr key={layer.assetId}>
                          <td>
                            <code>{layer.assetId}</code>
                          </td>
                          <td>
                            <code>
                              {measured?.body_asset_id ?? "not measured"}
                            </code>
                          </td>
                          <td>
                            {measured?.worst_coverage_fraction === null ||
                            measured === undefined
                              ? "unmeasured"
                              : `${(measured.worst_coverage_fraction * 100).toFixed(2)}%`}
                          </td>
                          <td>
                            {measured?.body_asset_id === selected
                              ? "This body; candidate evidence only"
                              : "Different crop in family; exact pairing unmeasured"}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </section>
          ) : null}
          <h3>Required slots and refusals</h3>
          <SlotTable subject={subject} />

          <h3>Resolver diagnostics</h3>
          <ul data-testid="candidate-review-diagnostics">
            {subject.plan.diagnostics.map((diagnostic, index) => (
              <li
                key={`${diagnostic.code}-${index}`}
                data-code={diagnostic.code}
              >
                <code>{diagnostic.code}</code> · {diagnostic.message}
              </li>
            ))}
          </ul>

          {selectedRow ? (
            <>
              <h3>Admission evidence</h3>
              <dl data-testid="candidate-review-evidence">
                <dt>Source crop</dt>
                <dd>
                  <code>{selectedRow.outputPath}</code>
                </dd>
                <dt>Reviewed observation</dt>
                <dd>
                  {selectedRow.observation.posture} ·{" "}
                  {selectedRow.observation.facing} · baked prop{" "}
                  {selectedRow.observation.bakedProp} ·{" "}
                  {selectedRow.observation.extent} · confidence{" "}
                  {selectedRow.observation.confidence}
                  {selectedRow.observation.note
                    ? ` — ${selectedRow.observation.note}`
                    : ""}
                </dd>
                <dt>Sweep&rsquo;s prior claim</dt>
                <dd>
                  <code>{selectedRow.priorClaim.apparentPoseCategory}</code>
                  {selectedRow.priorClaimDisagreements.length > 0
                    ? ` — ${selectedRow.priorClaimDisagreements.join(" ")}`
                    : " — agrees with the reviewed observation."}
                </dd>
                <dt>Unresolved</dt>
                <dd>
                  <ul>
                    {selectedRow.unresolved.map((entry) => (
                      <li key={entry}>{entry}</li>
                    ))}
                  </ul>
                </dd>
              </dl>
            </>
          ) : null}
        </>
      ) : (
        <p>No admitted candidate body is selected.</p>
      )}
      <h3>Every measured Wave A crop</h3>
      <table data-testid="candidate-review-dispositions">
        <thead>
          <tr>
            <th>Crop</th>
            <th>Observed</th>
            <th>Disposition</th>
            <th>Pose family</th>
          </tr>
        </thead>
        <tbody>
          {reportRows.map((row) => (
            <tr key={row.assetId} data-disposition={row.disposition}>
              <td>
                <code>{row.assetId}</code>
              </td>
              <td>
                {row.observation.posture} · {row.observation.facing} · prop{" "}
                {row.observation.bakedProp}
              </td>
              <td>{row.disposition}</td>
              <td>{row.registeredPoseFamily ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
