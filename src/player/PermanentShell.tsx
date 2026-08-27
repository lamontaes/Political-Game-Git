import type { RunAFixture } from "../presentation/run-a-fixture";
import { RUN_A_CIVIC_CONCEPT_ID } from "../presentation/run-a-learning";
import type { RunAUiAction, RunAUiState } from "../presentation/run-a-state";
import type { RunDAgendaEntry } from "../presentation/run-d-lite";
import type { EntityId } from "../simulation";
import { PinRail, type PinnedPersonDefinition } from "./PinRail";

interface PermanentShellProps {
  readonly fixture: RunAFixture;
  readonly people: readonly PinnedPersonDefinition[];
  readonly formattedTime: string;
  readonly formattedDate: string;
  readonly expandedDate: string;
  readonly compactDate: string;
  readonly compactNavigation?: boolean;
  readonly retreatedNavigation?: boolean;
  readonly nextCommitment: RunDAgendaEntry | null;
  readonly onOpenCalendar: () => void;
  readonly onOpenCalendarCommitment: (activityId: EntityId) => void;
  readonly onOpenWorkPending: () => void;
  readonly state: RunAUiState;
  readonly dispatch: (action: RunAUiAction) => void;
}

export function PermanentShell({
  fixture,
  people,
  formattedTime,
  formattedDate,
  expandedDate,
  compactDate,
  compactNavigation = false,
  retreatedNavigation = false,
  nextCommitment,
  onOpenCalendar,
  onOpenCalendarCommitment,
  onOpenWorkPending,
  state,
  dispatch,
}: PermanentShellProps) {
  const learned = state.learnedConceptIds.includes(RUN_A_CIVIC_CONCEPT_ID);
  const compactLocationLabel = fixture.locationLabel.split(" · ")[0];
  const nextCommitmentTime = nextCommitment
    ? formatMinute(nextCommitment.state.start.minuteOfDay)
    : null;

  return (
    <>
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
            <span className="cluster-date-full">{expandedDate}</span>
            <strong className="cluster-location-compact">
              {compactLocationLabel}
            </strong>
            <strong className="cluster-location-full">
              {compactLocationLabel}
            </strong>
          </span>
        </button>
      </nav>

      {!retreatedNavigation ? (
        <button
          type="button"
          className={`next-commitment-status civic-glass${state.navigation !== "closed" ? " next-commitment-status--shell-open" : ""}`}
          aria-label={
            nextCommitment
              ? `Next commitment: ${nextCommitment.activity.title}, ${nextCommitmentTime}, ${nextCommitment.activity.location.label}. Open in Calendar.`
              : "No scheduled commitment ahead. Open Calendar."
          }
          data-testid="current-commitment"
          data-activity-id={nextCommitment?.activity.id}
          onClick={() =>
            nextCommitment
              ? onOpenCalendarCommitment(nextCommitment.activity.id)
              : onOpenCalendar()
          }
        >
          <span className="next-commitment-compact">
            {nextCommitmentTime
              ? `Next · ${nextCommitmentTime}`
              : "No next commitment"}
          </span>
          <span className="next-commitment-detail">
            <span>Next commitment</span>
            <strong>
              {nextCommitment?.activity.title ??
                "No scheduled commitment ahead"}
            </strong>
            {nextCommitment ? (
              <small>
                {nextCommitmentTime} · {nextCommitment.activity.location.label}
              </small>
            ) : null}
          </span>
        </button>
      ) : null}

      {!retreatedNavigation ? (
        <PinRail people={people} state={state} dispatch={dispatch} />
      ) : null}
    </>
  );
}

function formatMinute(minuteOfDay: number): string {
  const hour24 = Math.floor(minuteOfDay / 60);
  const minute = minuteOfDay % 60;
  const suffix = hour24 >= 12 ? "PM" : "AM";
  return `${hour24 % 12 || 12}:${minute.toString().padStart(2, "0")} ${suffix}`;
}
