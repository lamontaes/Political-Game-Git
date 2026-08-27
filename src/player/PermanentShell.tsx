import type { RunAFixture } from "../presentation/run-a-fixture";
import { RUN_A_CIVIC_CONCEPT_ID } from "../presentation/run-a-learning";
import type { RunAUiAction, RunAUiState } from "../presentation/run-a-state";
import type { RunDAgendaEntry } from "../presentation/run-d-lite";
import { PinRail, type PinnedPersonDefinition } from "./PinRail";

interface PermanentShellProps {
  readonly fixture: RunAFixture;
  readonly people: readonly PinnedPersonDefinition[];
  readonly formattedTime: string;
  readonly formattedDate: string;
  readonly compactDate: string;
  readonly compactNavigation?: boolean;
  readonly retreatedNavigation?: boolean;
  readonly nextCommitment: RunDAgendaEntry | null;
  readonly onOpenCalendar: () => void;
  readonly onOpenWorkPending: () => void;
  readonly state: RunAUiState;
  readonly dispatch: (action: RunAUiAction) => void;
}

export function PermanentShell({
  fixture,
  people,
  formattedTime,
  formattedDate,
  compactDate,
  compactNavigation = false,
  retreatedNavigation = false,
  nextCommitment,
  onOpenCalendar,
  onOpenWorkPending,
  state,
  dispatch,
}: PermanentShellProps) {
  const learned = state.learnedConceptIds.includes(RUN_A_CIVIC_CONCEPT_ID);
  const compactLocationLabel = fixture.locationLabel.split(" · ")[0];

  return (
    <>
      <PinRail
        people={people}
        nextCommitment={nextCommitment}
        state={state}
        dispatch={dispatch}
      />

      <nav
        className={`nav-cluster${compactNavigation ? " nav-cluster--document" : ""}${retreatedNavigation ? " nav-cluster--retreated" : ""}${state.navigation !== "closed" ? " nav-cluster--open" : ""}`}
        aria-label="Time, location, and navigation"
        data-document-compact={compactNavigation ? "true" : "false"}
        data-navigation-open={state.navigation !== "closed" ? "true" : "false"}
      >
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
                <button type="button" role="menuitem" onClick={onOpenCalendar}>
                  Calendar
                  <small>Week and commitments</small>
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={onOpenWorkPending}
                >
                  Work / Pending
                  <small>What actually needs you</small>
                </button>
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
          aria-controls={
            state.navigation !== "closed" ? "run-a-navigation" : undefined
          }
          aria-label={`${formattedTime}. ${formattedDate}. ${fixture.locationLabel}. Open navigation.`}
          onClick={() => dispatch({ type: "toggle-navigation" })}
          data-testid="navigation-cluster"
        >
          <span className="civic-seal" aria-hidden="true">
            PG
          </span>
          <span className="cluster-copy">
            <span className="cluster-time">{formattedTime}</span>
            <span className="cluster-date-compact">{compactDate}</span>
            <span className="cluster-date-full">{formattedDate}</span>
            <strong className="cluster-location-compact">
              {compactLocationLabel}
            </strong>
            <strong className="cluster-location-full">
              {fixture.locationLabel}
            </strong>
          </span>
        </button>
      </nav>
    </>
  );
}
