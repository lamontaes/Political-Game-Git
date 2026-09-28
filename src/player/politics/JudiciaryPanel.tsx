import type { EntityId, World } from "../../simulation/types";
import { proseDate } from "../../presentation/prose-dates";
import { PersonPortrait } from "../PersonPortrait";
import type {
  JudiciaryView,
  JudicialCourtView,
} from "../../presentation/judiciary";
import type { GovernmentScope } from "../../presentation/politics-government";

function CourtRoster({
  court,
  world,
  onOpenPerson,
  nested = false,
}: {
  readonly court: JudicialCourtView;
  readonly world: World;
  readonly onOpenPerson: (personId: EntityId) => void;
  readonly nested?: boolean;
}) {
  return (
    <section
      className="pg-government-branch"
      data-testid={`judicial-court-${court.courtId}`}
    >
      {nested ? <h5>{court.name}</h5> : <h4>{court.name}</h4>}
      <ul>
        {court.holders.map((holder) => (
          <li key={holder.seatId}>
            {holder.personId ? (
              <button
                type="button"
                aria-label={`Open record for ${holder.name}`}
                onClick={() => onOpenPerson(holder.personId!)}
              >
                <PersonPortrait world={world} personId={holder.personId} />
                {holder.startedAt ? (
                  <span>At this court since {proseDate(holder.startedAt)}</span>
                ) : null}
              </button>
            ) : (
              <span>Vacant seat</span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Public roster only; opening a person uses the existing observation-limited card. */
export function JudiciaryPanel({
  view,
  world,
  scope,
  onOpenPerson,
}: {
  readonly view: JudiciaryView;
  readonly world: World;
  readonly scope: GovernmentScope;
  readonly onOpenPerson: (personId: EntityId) => void;
}) {
  if (scope === "local") return null;
  if (scope === "state" && view.stateCourts.length === 0) return null;
  if (
    scope === "federal" &&
    !view.supremeCourt &&
    view.federalCourts.length === 0
  )
    return null;
  return (
    <section
      className="pg-government-branch"
      data-testid="government-judiciary"
    >
      <h3>Courts and judges</h3>
      {scope === "state" ? (
        <div data-testid="state-court-roster">
          <h4>{view.stateName} courts</h4>
          {view.stateCourts.map((court) => (
            <CourtRoster
              key={court.courtId}
              court={court}
              world={world}
              onOpenPerson={onOpenPerson}
              nested
            />
          ))}
        </div>
      ) : null}
      {scope === "federal" ? (
        <div data-testid="federal-court-roster">
          {view.supremeCourt ? (
            <CourtRoster
              court={view.supremeCourt}
              world={world}
              onOpenPerson={onOpenPerson}
            />
          ) : null}
          {view.federalCourts.length > 0 ? (
            <details>
              <summary>
                Federal appellate and district courts (
                {view.federalCourts.length})
              </summary>
              {view.federalCourts.map((court) => (
                <CourtRoster
                  key={court.courtId}
                  court={court}
                  world={world}
                  onOpenPerson={onOpenPerson}
                />
              ))}
            </details>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
