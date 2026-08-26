import type { RunAFixture } from "../presentation/run-a-fixture";
import { RUN_A_CIVIC_CONCEPT_ID } from "../presentation/run-a-learning";
import type { QuickDossierProjection } from "../presentation/run-a-projection";
import type { RunAUiAction, RunAUiState } from "../presentation/run-a-state";
import { PinRail } from "./PinRail";

interface PermanentShellProps {
  readonly fixture: RunAFixture;
  readonly dossier: QuickDossierProjection;
  readonly formattedDate: string;
  readonly state: RunAUiState;
  readonly dispatch: (action: RunAUiAction) => void;
}

export function PermanentShell({
  fixture,
  dossier,
  formattedDate,
  state,
  dispatch,
}: PermanentShellProps) {
  const learned = state.learnedConceptIds.includes(RUN_A_CIVIC_CONCEPT_ID);

  return (
    <>
      <PinRail person={dossier} state={state} dispatch={dispatch} />

      <nav className="nav-cluster" aria-label="Time, location, and navigation">
        {state.navigation !== "closed" ? (
          <div
            id="run-a-navigation"
            className="nav-flyout civic-glass"
            data-testid="navigation-flyout"
          >
            {state.navigation === "primary" ? (
              <div
                className="nav-menu"
                role="menu"
                aria-label="Main navigation"
              >
                <p className="nav-heading">Office</p>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => dispatch({ type: "open-submenu" })}
                >
                  Places
                  <span aria-hidden="true">••</span>
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => dispatch({ type: "open-civic-learning" })}
                >
                  Civic reference
                  {learned ? (
                    <span className="learned-tag">Learned</span>
                  ) : null}
                </button>
                <a href="/?view=developer" role="menuitem">
                  Developer view
                  <span className="dev-tag">Dev</span>
                </a>
              </div>
            ) : (
              <div
                className="nav-submenu"
                role="menu"
                aria-label="Places"
                data-testid="nav-submenu"
              >
                <button
                  type="button"
                  role="menuitem"
                  className="nav-back"
                  onClick={() => dispatch({ type: "toggle-navigation" })}
                >
                  Close places
                </button>
                <p className="nav-heading">Places</p>
                <button type="button" role="menuitem" className="place-current">
                  <strong>Legislative Office</strong>
                  <small>Current location</small>
                </button>
                <button type="button" role="menuitem" disabled>
                  <strong>District field office</strong>
                  <small>Not available in Run A</small>
                </button>
              </div>
            )}
          </div>
        ) : null}

        <button
          type="button"
          className="nav-cluster-button civic-glass"
          aria-expanded={state.navigation !== "closed"}
          aria-controls="run-a-navigation"
          onClick={() => dispatch({ type: "toggle-navigation" })}
          data-testid="navigation-cluster"
        >
          <span className="civic-seal" aria-hidden="true">
            PG
          </span>
          <span className="cluster-copy">
            <span className="cluster-time">{fixture.presentationTime}</span>
            <span>{formattedDate}</span>
            <strong>{fixture.locationLabel}</strong>
          </span>
        </button>
      </nav>
    </>
  );
}
