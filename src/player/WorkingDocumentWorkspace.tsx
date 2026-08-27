import { useEffect, useRef } from "react";

import { personName, type World } from "../simulation";
import type {
  RunCDocumentProjection,
  RunCFixture,
  RunCWorkingDocumentVariant,
  RunCWorkingProvision,
} from "../presentation/run-c-working-document";
import {
  RUN_C_NARROW_VARIANT_KEY,
  RUN_C_WIDE_VARIANT_KEY,
} from "../presentation/run-c-working-document";
import type {
  RunCDocumentUiAction,
  RunCDocumentUiState,
} from "../presentation/run-c-document-state";

interface WorkingDocumentWorkspaceProps {
  readonly world: World;
  readonly fixture: RunCFixture;
  readonly projection: RunCDocumentProjection;
  readonly state: RunCDocumentUiState;
  readonly dispatch: (action: RunCDocumentUiAction) => void;
  readonly onReviewAnalysis: () => void;
  readonly onDiscussProvision: () => void;
  readonly onCommitRevision: () => void;
}

export function WorkingDocumentWorkspace({
  world,
  fixture,
  projection,
  state,
  dispatch,
  onReviewAnalysis,
  onDiscussProvision,
  onCommitRevision,
}: WorkingDocumentWorkspaceProps) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (state.mode === "open") closeRef.current?.focus();
  }, [state.mode]);

  if (state.mode !== "open") return null;

  const document = fixture.document;
  const staffAuthor = world.people[document.preparedByPersonId];
  const annotation = document.annotations[0];
  const analysisKnown = projection.staffAnalyses.length > 0;

  return (
    <section
      className="working-document-workspace"
      aria-labelledby="working-document-title"
      data-testid="working-document-workspace"
      data-document-id={document.id}
      data-active-variant={projection.activeVariantKey}
      data-revision-committed={projection.revisionCommitted ? "true" : "false"}
    >
      <div className="working-document-room-context" aria-hidden="true">
        <span>Desk edge</span>
        <span>Office remains in view</span>
      </div>

      <header className="working-document-toolbar">
        <div>
          <p>{document.statusLabel}</p>
          <h2 id="working-document-title">{document.title}</h2>
          <span>{document.jurisdictionLabel}</span>
        </div>
        <div className="working-document-toolbar-actions">
          <button
            type="button"
            aria-pressed={!state.annotationsVisible}
            onClick={() => dispatch({ type: "toggle-annotations" })}
          >
            {state.annotationsVisible ? "Clean copy" : "Show annotations"}
          </button>
          <button
            ref={closeRef}
            type="button"
            onClick={() => dispatch({ type: "close" })}
          >
            Return to office
          </button>
        </div>
      </header>

      <div className="working-document-stage">
        <article
          className="legislative-paper"
          aria-label={`${document.title}, ${projection.paperStatusLabel}`}
          data-testid="legislative-paper"
        >
          <header className="legislative-paper-header">
            <p>OFFICE WORKING DRAFT</p>
            <strong>NOT INTRODUCED · NOT ENACTED</strong>
            <h3>Transit Access Pilot</h3>
            <span data-testid="active-working-draft-role">
              {projection.paperStatusLabel}
            </span>
          </header>

          <div className="legislative-provisions">
            {projection.activeVariant.provisions.map((provision) => (
              <ProvisionText
                key={provision.id}
                provision={provision}
                quantitativeProvisionId={document.quantitativeProvisionId}
                selectedSelectionId={state.selectedSelectionId}
                onSelect={(selectionId) =>
                  dispatch({ type: "select-phrase", selectionId })
                }
              />
            ))}
          </div>

          <footer>
            <span>Staff working copy</span>
            <span>Proposal language only</span>
          </footer>
        </article>

        {state.annotationsVisible && annotation ? (
          <aside
            className="working-annotation"
            aria-label={`Working annotation by ${
              staffAuthor ? personName(staffAuthor) : "staff"
            }`}
            data-testid="working-annotation"
            data-annotation-id={annotation.id}
          >
            <p>{annotation.label}</p>
            <span>{projection.annotationSummary}</span>
            <small>{annotation.teaser}</small>
            <button type="button" onClick={onReviewAnalysis}>
              {analysisKnown ? "View analysis" : "Read staff note"}
            </button>
          </aside>
        ) : null}

        {state.actionMenuOpen &&
        state.selectedSelectionId === document.amountSelectionId ? (
          <ProvisionActionMenu
            current={projection.activeVariant}
            analysisKnown={analysisKnown}
            revisionCommitted={projection.revisionCommitted}
            onReviewAnalysis={onReviewAnalysis}
            onCompare={() => dispatch({ type: "open-compare" })}
            onDiscuss={onDiscussProvision}
            onCommit={onCommitRevision}
          />
        ) : null}

        {state.panel === "analysis" ? (
          <AnalysisPanel
            projection={projection}
            onClose={() => dispatch({ type: "close-panel" })}
          />
        ) : null}

        {state.panel === "compare" ? (
          <ComparePanel
            projection={projection}
            onClose={() => dispatch({ type: "close-panel" })}
            onCommit={onCommitRevision}
          />
        ) : null}
      </div>
    </section>
  );
}

function ProvisionText({
  provision,
  quantitativeProvisionId,
  selectedSelectionId,
  onSelect,
}: {
  readonly provision: RunCWorkingProvision;
  readonly quantitativeProvisionId: string;
  readonly selectedSelectionId: string | null;
  readonly onSelect: (
    selectionId: RunCWorkingProvision["segments"][number]["selectionId"] &
      string,
  ) => void;
}) {
  return (
    <section
      className="legislative-provision"
      data-testid={
        provision.id === quantitativeProvisionId
          ? "quantitative-provision"
          : undefined
      }
      data-provision-id={provision.id}
      data-policy-alternative-id={provision.policyAlternativeId ?? undefined}
      data-policy-operation-id={provision.policyOperationId ?? undefined}
    >
      <h4>
        Section {provision.sectionNumber}. {provision.heading}.
      </h4>
      <p>
        {provision.segments.map((segment, index) =>
          segment.kind === "selection" && segment.selectionId ? (
            <button
              key={segment.selectionId}
              type="button"
              className="legal-phrase-selection"
              aria-label={`Select provision phrase ${segment.text}`}
              aria-pressed={selectedSelectionId === segment.selectionId}
              data-testid="working-document-amount"
              data-selection-id={segment.selectionId}
              onClick={() => onSelect(segment.selectionId!)}
            >
              {segment.text}
            </button>
          ) : (
            <span key={`${provision.id}:segment:${index}`}>{segment.text}</span>
          ),
        )}
      </p>
    </section>
  );
}

function ProvisionActionMenu({
  current,
  analysisKnown,
  revisionCommitted,
  onReviewAnalysis,
  onCompare,
  onDiscuss,
  onCommit,
}: {
  readonly current: RunCWorkingDocumentVariant;
  readonly analysisKnown: boolean;
  readonly revisionCommitted: boolean;
  readonly onReviewAnalysis: () => void;
  readonly onCompare: () => void;
  readonly onDiscuss: () => void;
  readonly onCommit: () => void;
}) {
  const firstRef = useRef<HTMLButtonElement>(null);
  useEffect(() => firstRef.current?.focus(), []);
  const canUsePrepared =
    !revisionCommitted && current.key === RUN_C_WIDE_VARIANT_KEY;

  return (
    <div
      className="provision-action-menu civic-glass"
      role="menu"
      aria-label={`Actions for the current ${current.amountDisplay} provision`}
      data-testid="provision-action-menu"
    >
      <p>Section 3 · selected phrase</p>
      <button
        ref={firstRef}
        type="button"
        role="menuitem"
        onClick={onReviewAnalysis}
      >
        <span>{analysisKnown ? "View analysis" : "Read staff note"}</span>
      </button>
      {canUsePrepared ? (
        <>
          <button type="button" role="menuitem" onClick={onCompare}>
            <span>Compare prepared revision</span>
            <small>$8,000,000 → $4,000,000</small>
          </button>
          <button type="button" role="menuitem" onClick={onDiscuss}>
            <span>Ask Collins about this</span>
          </button>
          <button type="button" role="menuitem" onClick={onCommit}>
            <span>Use the prepared $4,000,000 version</span>
            <small>Change the office working draft only</small>
          </button>
        </>
      ) : (
        <p className="provision-menu-status">
          This is the current office working version.
        </p>
      )}
    </div>
  );
}

function AnalysisPanel({
  projection,
  onClose,
}: {
  readonly projection: RunCDocumentProjection;
  readonly onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => closeRef.current?.focus(), []);
  return (
    <aside
      className="working-document-panel analysis-panel"
      aria-labelledby="staff-analysis-title"
      data-testid="staff-analysis-panel"
    >
      <header>
        <div>
          <p>Staff interpretation · distinct from legal text</p>
          <h3 id="staff-analysis-title">Collins’s working analysis</h3>
        </div>
        <button ref={closeRef} type="button" onClick={onClose}>
          Back to document
        </button>
      </header>
      {projection.staffAnalyses.length > 0 ? (
        <div className="analysis-comparison">
          {projection.staffAnalyses.map((analysis) => (
            <article key={analysis.variantKey}>
              <span data-testid={`analysis-role-${analysis.variantKey}`}>
                {analysis.variantKey === RUN_C_WIDE_VARIANT_KEY
                  ? "$8,000,000"
                  : "$4,000,000"}
                {` · ${analysis.documentRoleLabel}`}
              </span>
              <strong>{analysis.modeledChange}</strong>
              <p>{analysis.scopeLabel}</p>
              <small>{analysis.authorLabel}</small>
              <small>{analysis.provenanceLabel}</small>
              <em>{analysis.qualification}</em>
            </article>
          ))}
        </div>
      ) : (
        <p>No staff projection is currently known to Cameron.</p>
      )}
    </aside>
  );
}

function ComparePanel({
  projection,
  onClose,
  onCommit,
}: {
  readonly projection: RunCDocumentProjection;
  readonly onClose: () => void;
  readonly onCommit: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => closeRef.current?.focus(), []);
  const isForwardComparison =
    projection.activeVariant.key === RUN_C_WIDE_VARIANT_KEY;
  const wideRole = projection.variantRoles[RUN_C_WIDE_VARIANT_KEY];
  const narrowRole = projection.variantRoles[RUN_C_NARROW_VARIANT_KEY];
  return (
    <aside
      className="working-document-panel compare-panel"
      aria-labelledby="prepared-revision-title"
      data-testid="prepared-revision-panel"
    >
      <header>
        <div>
          <p>
            {isForwardComparison
              ? "Prepared revision · preview only"
              : "Working revision · current status"}
          </p>
          <h3 id="prepared-revision-title">Section 3 markup</h3>
        </div>
        <button ref={closeRef} type="button" onClick={onClose}>
          Close compare
        </button>
      </header>
      <p className="compare-status" role="status">
        Opening this comparison has not changed the office working draft.
      </p>
      <blockquote>
        For the pilot period, participant fares, route-access assistance, and
        necessary administration may be supported in an aggregate amount not to
        exceed <del>$8,000,000</del> <ins>$4,000,000</ins>.
      </blockquote>
      <div className="compare-semantics">
        <article>
          <span>{wideRole.label}</span>
          <strong>$8,000,000 proposed outlay increase</strong>
        </article>
        <article>
          <span>{narrowRole.label}</span>
          <strong>$4,000,000 proposed outlay increase</strong>
        </article>
      </div>
      {isForwardComparison ? (
        <button
          type="button"
          className="commit-working-revision"
          onClick={onCommit}
        >
          Use $4,000,000 version as office working draft
        </button>
      ) : (
        <p>The narrower version is already the current office working draft.</p>
      )}
    </aside>
  );
}
