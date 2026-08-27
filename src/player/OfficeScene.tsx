import { useEffect, useRef } from "react";

import type { RunAFixture } from "../presentation/run-a-fixture";
import { RUN_A_CIVIC_CONCEPT_ID } from "../presentation/run-a-learning";
import type { QuickDossierProjection } from "../presentation/run-a-projection";
import type { RunAUiAction, RunAUiState } from "../presentation/run-a-state";
import { QuickDossier } from "./QuickDossier";

interface PersonActionMenuProps {
  readonly name: string;
  readonly dispatch: (action: RunAUiAction) => void;
}

function PersonActionMenu({ name, dispatch }: PersonActionMenuProps) {
  const inspectRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    inspectRef.current?.focus();
  }, []);

  return (
    <div
      className="person-action-menu civic-glass"
      role="menu"
      aria-label={`Actions for ${name}`}
      data-testid="person-action-menu"
    >
      <p>{name}</p>
      <button
        ref={inspectRef}
        type="button"
        role="menuitem"
        onClick={() => dispatch({ type: "inspect-person" })}
      >
        <span>Inspect</span>
        <small>Review your notes and impressions</small>
      </button>
      <button
        type="button"
        role="menuitem"
        onClick={() => {
          dispatch({ type: "set-pin-size", pinId: "person", size: "normal" });
          dispatch({ type: "dismiss-overlay" });
        }}
      >
        <span>Pin person</span>
        <small>Keep nearby context</small>
      </button>
    </div>
  );
}

interface CivicLearningProps {
  readonly learned: boolean;
  readonly dispatch: (action: RunAUiAction) => void;
}

function CivicLearning({ learned, dispatch }: CivicLearningProps) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  return (
    <aside
      className="civic-learning civic-glass"
      role="dialog"
      aria-modal="false"
      aria-labelledby="civic-learning-title"
      data-testid="civic-learning-popover"
    >
      <header>
        <div>
          <p>Civic reference</p>
          <h2 id="civic-learning-title">Committee referral</h2>
        </div>
        <button
          ref={closeRef}
          type="button"
          className="icon-button"
          aria-label="Close civic reference"
          onClick={() => dispatch({ type: "dismiss-overlay" })}
        >
          <span aria-hidden="true">×</span>
        </button>
      </header>
      <p>
        A committee referral sends a proposal to the group responsible for its
        subject so members can study it before any later action.
      </p>
      <p className="civic-learning-note">
        Opening this reference does not mark it learned or move time.
      </p>
      {learned ? (
        <p className="learned-confirmation" role="status">
          Marked learned. This reference remains available from navigation.
        </p>
      ) : (
        <button
          type="button"
          className="mark-learned"
          onClick={() =>
            dispatch({
              type: "mark-concept-learned",
              conceptId: RUN_A_CIVIC_CONCEPT_ID,
            })
          }
        >
          Mark as learned
        </button>
      )}
    </aside>
  );
}

interface OfficeSceneProps {
  readonly fixture: RunAFixture;
  readonly dossier: QuickDossierProjection;
  readonly state: RunAUiState;
  readonly dispatch: (action: RunAUiAction) => void;
}

export function OfficeScene({
  fixture,
  dossier,
  state,
  dispatch,
}: OfficeSceneProps) {
  const learned = state.learnedConceptIds.includes(RUN_A_CIVIC_CONCEPT_ID);

  return (
    <section
      className="office-scene"
      aria-label={`A quiet legislative office in ${fixture.locationDisplayName}`}
      data-testid="political-office-scene"
    >
      <div className="scene-wall-shadow" aria-hidden="true" />
      <div className="office-window office-window-left" aria-hidden="true">
        <span className="window-sky" />
        <span className="window-building window-building-one" />
        <span className="window-building window-building-two" />
        <span className="window-frame window-frame-vertical" />
        <span className="window-frame window-frame-horizontal" />
      </div>
      <div className="office-window office-window-right" aria-hidden="true">
        <span className="window-sky" />
        <span className="window-building window-building-one" />
        <span className="window-building window-building-two" />
        <span className="window-frame window-frame-vertical" />
        <span className="window-frame window-frame-horizontal" />
      </div>
      <div className="office-curtain office-curtain-left" aria-hidden="true" />
      <div className="office-curtain office-curtain-right" aria-hidden="true" />
      <div
        className="office-curtain office-curtain-right-window-left"
        aria-hidden="true"
      />
      <div
        className="office-curtain office-curtain-right-window-right"
        aria-hidden="true"
      />
      <div className="wall-frame wall-frame-one" aria-hidden="true">
        <span />
      </div>
      <div className="wall-frame wall-frame-two" aria-hidden="true">
        <span />
      </div>
      <div className="bookcase" aria-hidden="true">
        <span className="book-row row-one" />
        <span className="book-row row-two" />
        <span className="book-row row-three" />
      </div>
      <div className="office-plant" aria-hidden="true">
        <span className="plant-pot" />
        <span className="leaf leaf-one" />
        <span className="leaf leaf-two" />
        <span className="leaf leaf-three" />
      </div>
      <div className="office-rug" aria-hidden="true" />
      <div className="guest-chair guest-chair-left" aria-hidden="true" />
      <div className="guest-chair guest-chair-right" aria-hidden="true" />
      <div className="desk-chair" aria-hidden="true" />

      <button
        type="button"
        className="scene-person"
        aria-label={`${dossier.name}, ${dossier.title}`}
        aria-haspopup="menu"
        aria-expanded={state.overlay === "person-actions"}
        data-testid="scene-person"
        onClick={() =>
          dispatch({
            type: "select-person",
            personId: fixture.scenePerson.personId,
          })
        }
      >
        <span className="person-shadow" aria-hidden="true" />
        <span className="person-torso" aria-hidden="true">
          <span className="shirt-collar" />
          <span className="jacket-lapel lapel-left" />
          <span className="jacket-lapel lapel-right" />
        </span>
        <span className="person-neck" aria-hidden="true" />
        <span className="person-head" aria-hidden="true">
          <span className="person-hair" />
          <span className="person-ear" />
          <span className="person-brow brow-left" />
          <span className="person-brow brow-right" />
          <span className="person-eye eye-left" />
          <span className="person-eye eye-right" />
          <span className="person-nose" />
          <span className="person-mouth" />
        </span>
        <span className="person-arm person-arm-left" aria-hidden="true" />
        <span className="person-arm person-arm-right" aria-hidden="true" />
        <span className="person-nameplate">
          <strong>{dossier.name}</strong>
          <small>{dossier.title}</small>
        </span>
      </button>

      <div className="office-desk" aria-hidden="true">
        <span className="desk-top" />
        <span className="desk-front" />
        <span className="desk-panel" />
        <span className="desk-drawer desk-drawer-one" />
        <span className="desk-drawer desk-drawer-two" />
        <span className="desk-lamp" />
        <span className="desk-folder" />
      </div>

      <article className="briefing-memo" aria-label="Briefing memorandum">
        <p className="memo-label">Office memorandum</p>
        <h2>Afternoon briefing</h2>
        <p>Constituent services · three points for review</p>
      </article>

      {!learned ? (
        <button
          type="button"
          className="civic-marker"
          aria-label="Explain committee referral. Shift click to mark learned."
          data-testid="civic-learning-marker"
          onClick={(event) =>
            dispatch(
              event.shiftKey
                ? {
                    type: "mark-concept-learned",
                    conceptId: RUN_A_CIVIC_CONCEPT_ID,
                  }
                : { type: "open-civic-learning" },
            )
          }
        >
          i
        </button>
      ) : null}

      {state.overlay === "person-actions" ? (
        <PersonActionMenu name={dossier.name} dispatch={dispatch} />
      ) : null}
      {state.overlay === "dossier" ? (
        <QuickDossier
          dossier={dossier}
          onClose={() => dispatch({ type: "dismiss-overlay" })}
        />
      ) : null}
      {state.overlay === "civic" ? (
        <CivicLearning learned={learned} dispatch={dispatch} />
      ) : null}

      <div className="scene-vignette" aria-hidden="true" />
    </section>
  );
}
