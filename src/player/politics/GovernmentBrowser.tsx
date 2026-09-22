import { useMemo } from "react";

import type { EntityId, World } from "../../simulation";
import {
  GOVERNMENT_SCOPES,
  governmentScopeLabel,
  projectGovernmentBrowser,
  type ChamberStanding,
  type ChamberStandings,
  type GovernmentEntry,
  type GovernmentPlace,
  type GovernmentScope,
  type GovernmentSeatRow,
  type RepresentationRow,
} from "../../presentation/politics-government";
import "./politics-hub.css";
import { GuideTerm } from "../GuideTerm";

/**
 * Public government for a place, by scope and branch (OCD-UI-004).
 *
 * Opens on where the character is now. Choosing home (when it differs) is an
 * explicit selection that stays visible until changed, and Issues and budget
 * follows the same selection. Looking is free: it grants no authority and moves
 * no clock. A holder's name opens the one person card; a bill on record opens
 * the measure card with its committee, vote and presentment history.
 */
export function GovernmentBrowser({
  world,
  personId,
  place,
  scope,
  onSelectionChange,
  onOpenPerson,
  onOpenMeasure,
}: {
  readonly world: World;
  readonly personId: EntityId;
  readonly place: GovernmentPlace;
  readonly scope: GovernmentScope;
  readonly onSelectionChange: (patch: {
    readonly politicsPlace?: GovernmentPlace;
    readonly governmentScope?: GovernmentScope;
  }) => void;
  readonly onOpenPerson: (personId: EntityId) => void;
  readonly onOpenMeasure: (measureId: EntityId) => void;
}) {
  const base = useMemo(
    () => projectGovernmentBrowser(world, personId, { scope: "local" }),
    [world, personId],
  );
  const homeDiffers =
    base.home.jurisdictionId !== null &&
    base.home.jurisdictionId !== base.here.jurisdictionId;
  const chosen = place === "home" && homeDiffers ? "home" : "here";
  const view = useMemo(
    () =>
      projectGovernmentBrowser(world, personId, {
        scope,
        jurisdictionId:
          chosen === "home"
            ? base.home.jurisdictionId
            : base.here.jurisdictionId,
      }),
    [world, personId, scope, chosen, base],
  );

  return (
    <section
      className="pg-government"
      aria-labelledby="pg-government-title"
      data-testid="government-browser"
    >
      <header className="pg-government-head">
        <h2 id="pg-government-title" className="sr-only">
          Government
        </h2>
        <p className="pg-government-place" data-testid="government-place">
          <span className="pg-government-place-label">
            {chosen === "here" ? "Here" : "Home"}
          </span>{" "}
          <strong>{view.browsing.label}</strong>
          {chosen === "home" ? (
            <span className="pg-government-place-note">
              {" "}
              · your home, not where you are now
            </span>
          ) : null}
        </p>
        {homeDiffers ? (
          <div className="pg-government-places" role="group" aria-label="Place">
            <button
              type="button"
              aria-pressed={chosen === "here"}
              data-testid="government-place-here"
              onClick={() => onSelectionChange({ politicsPlace: "here" })}
            >
              Here: {base.here.label}
            </button>
            <button
              type="button"
              aria-pressed={chosen === "home"}
              data-testid="government-place-home"
              onClick={() => onSelectionChange({ politicsPlace: "home" })}
            >
              Home: {base.home.label}
            </button>
          </div>
        ) : null}
      </header>

      {view.representedBy ? (
        <RepresentedBy
          rows={view.representedBy}
          homeLabel={base.home.label}
          onOpenPerson={onOpenPerson}
        />
      ) : null}

      <div
        className="pg-government-scopes"
        role="group"
        aria-label="Level of government"
      >
        {GOVERNMENT_SCOPES.map((item) => (
          <button
            key={item}
            type="button"
            aria-pressed={item === scope}
            data-testid={`government-scope-${item}`}
            onClick={() => onSelectionChange({ governmentScope: item })}
          >
            {governmentScopeLabel(item)}
          </button>
        ))}
      </div>

      {view.governs ? (
        <p className="pg-government-governs" data-testid="government-governs">
          {view.scopeLabel} government · {view.governs}
        </p>
      ) : null}

      {view.localGovernments.length > 0 ? (
        <section
          className="pg-government-branch"
          data-testid="government-local-identities"
        >
          <h3>Local government</h3>
          <ul>
            {view.localGovernments.map((entry) => (
              <li key={entry.key}>
                <EntryBody
                  entry={entry}
                  state={view.browsingState}
                  onOpenPerson={onOpenPerson}
                  onOpenMeasure={onOpenMeasure}
                />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {view.branches.length > 0 ? (
        <div className="pg-government-branches">
          {view.branches.map((branch) => (
            <section
              key={branch.branch}
              className="pg-government-branch"
              aria-labelledby={`pg-government-${branch.branch}`}
              data-testid={`government-branch-${branch.branch}`}
            >
              <h3 id={`pg-government-${branch.branch}`}>{branch.label}</h3>
              {branch.absent ? (
                <p className="pg-government-absent">{branch.absent}</p>
              ) : (
                <ul>
                  {branch.entries.map((entry) => (
                    <li key={entry.key}>
                      <EntryBody
                        entry={entry}
                        state={view.browsingState}
                        onOpenPerson={onOpenPerson}
                        onOpenMeasure={onOpenMeasure}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
      ) : null}

      {view.alsoGoverning.length > 0 ? (
        <section
          className="pg-government-branch"
          aria-labelledby="pg-government-also"
          data-testid="government-also-governing"
        >
          <h3 id="pg-government-also">Also governing this place</h3>
          <ul>
            {view.alsoGoverning.map((entry) => (
              <li key={entry.key}>
                <span className="pg-government-entry-title">{entry.title}</span>
                {entry.detail ? (
                  <span className="pg-government-entry-detail">
                    {entry.detail}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </section>
  );
}

/**
 * How a chamber divides, and who sits against their own party.
 *
 * Two breakdowns and then the interesting part. The party bar and the caucus
 * bar usually say the same thing, and a player who has read one has read the
 * other; the members whose caucus is not their party are what a caucus
 * breakdown is actually for, so they are named here rather than left as the
 * difference between two totals nobody subtracts. Each name opens that person.
 *
 * A chamber whose save records no caucus keeps its party bar and says so.
 */
function Standings({
  standings,
  safeKey,
  onOpenPerson,
}: {
  readonly standings: ChamberStandings;
  readonly safeKey: string;
  readonly onOpenPerson: (personId: EntityId) => void;
}) {
  return (
    <>
      <span className="pg-government-subhead">By party</span>
      <Breakdown
        rows={standings.parties}
        testid={`government-parties-${safeKey}`}
      />
      <span className="pg-government-subhead">By caucus</span>
      {standings.caucusNote ? (
        <span className="pg-government-seat-status">
          {standings.caucusNote}
        </span>
      ) : (
        <Breakdown
          rows={standings.caucuses}
          testid={`government-caucuses-${safeKey}`}
        />
      )}
      {standings.crossings.length > 0 ? (
        <>
          <span className="pg-government-subhead">
            Caucusing with another party ({standings.crossings.length})
          </span>
          <ul
            className="pg-government-crossings"
            data-testid={`government-crossings-${safeKey}`}
          >
            {standings.crossings.map((crossing) => (
              <li key={crossing.key}>
                <button
                  type="button"
                  className="pg-government-holder"
                  data-testid={`government-crossing-${crossing.personId}`}
                  onClick={() => onOpenPerson(crossing.personId)}
                >
                  {crossing.name}
                </button>
                <span className="pg-government-seat">{crossing.seatLabel}</span>
                <span className="pg-government-crossing-move">
                  {crossing.partyLabel
                    ? `${crossing.partyLabel}, sits with the ${crossing.caucusLabel}`
                    : `No party, sits with the ${crossing.caucusLabel}`}
                </span>
              </li>
            ))}
          </ul>
        </>
      ) : null}
      {standings.crossingNote ? (
        <span className="pg-government-seat-status">
          {standings.crossingNote}
        </span>
      ) : null}
    </>
  );
}

function Breakdown({
  rows,
  testid,
}: {
  readonly rows: readonly ChamberStanding[];
  readonly testid: string;
}) {
  return (
    <dl className="pg-government-counts" data-testid={testid}>
      {rows.map((row) => (
        <div key={row.key}>
          <dt>{row.label}</dt>
          <dd>{row.members}</dd>
        </div>
      ))}
    </dl>
  );
}

function SeatHolder({
  status,
  name,
  personId,
  onOpenPerson,
}: {
  readonly status: GovernmentSeatRow["status"];
  readonly name: string | null;
  readonly personId: EntityId | null;
  readonly onOpenPerson: (personId: EntityId) => void;
}) {
  if (status === "member" && name && personId)
    return (
      <button
        type="button"
        className="pg-government-holder"
        data-testid={`government-holder-${personId}`}
        onClick={() => onOpenPerson(personId)}
      >
        {name}
      </button>
    );
  return (
    <span className="pg-government-seat-status">
      {status === "vacancy" ? "Vacant" : "No current record"}
    </span>
  );
}

function Roster({
  rows,
  onOpenPerson,
  testid,
}: {
  readonly rows: readonly GovernmentSeatRow[];
  readonly onOpenPerson: (personId: EntityId) => void;
  readonly testid: string;
}) {
  return (
    <ul className="pg-government-roster" data-testid={testid}>
      {rows.map((row) => (
        <li key={row.key} data-seat-status={row.status}>
          <span className="pg-government-seat">
            {/*
             * A seat title that IS a term gets its explanation; every other
             * title renders exactly as it did. Matching is the whole label
             * against the catalog, never a scan of the words inside it.
             *
             * Every seat title recorded today reads "<State>, district 3" or
             * "<State>, Class II seat", so nothing here matches yet and the
             * roster renders exactly as it always has. This stays because the
             * match is on the whole label: a body that later records a seat
             * titled with a term the Guide holds gains its explanation without
             * this surface being touched again.
             */}
            <GuideTerm label={row.seatLabel}>{row.seatLabel}</GuideTerm>
          </span>
          <SeatHolder
            status={row.status}
            name={row.holderName}
            personId={row.holderPersonId}
            onOpenPerson={onOpenPerson}
          />
          {row.note ? (
            <span className="pg-government-entry-detail">{row.note}</span>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

function EntryBody({
  entry,
  state,
  onOpenPerson,
  onOpenMeasure,
}: {
  readonly entry: GovernmentEntry;
  readonly state: { readonly usps: string; readonly name: string } | null;
  readonly onOpenPerson: (personId: EntityId) => void;
  readonly onOpenMeasure: (measureId: EntityId) => void;
}) {
  const roster = entry.roster ?? [];
  const delegation = state
    ? roster.filter((row) => row.stateUsps === state.usps)
    : [];
  const safeKey = entry.key.replace(/[^a-z0-9-]+/gi, "-");
  return (
    <>
      <span className="pg-government-entry-title">{entry.title}</span>
      {entry.holderName && entry.holderPersonId ? (
        <SeatHolder
          status="member"
          name={entry.holderName}
          personId={entry.holderPersonId}
          onOpenPerson={onOpenPerson}
        />
      ) : null}
      {entry.detail ? (
        <span className="pg-government-entry-detail">{entry.detail}</span>
      ) : null}
      {entry.counts ? (
        <dl
          className="pg-government-counts"
          data-testid={`government-counts-${safeKey}`}
        >
          <div>
            <dt>Seats</dt>
            <dd>{entry.counts.seats}</dd>
          </div>
          <div>
            <dt>Current members</dt>
            <dd>{entry.counts.members}</dd>
          </div>
          <div>
            <dt>Vacant</dt>
            <dd>{entry.counts.vacancies}</dd>
          </div>
          <div>
            <dt>No current record</dt>
            <dd>{entry.counts.noCurrentRecord}</dd>
          </div>
        </dl>
      ) : null}
      {entry.standings ? (
        <Standings
          standings={entry.standings}
          safeKey={safeKey}
          onOpenPerson={onOpenPerson}
        />
      ) : null}
      {state && delegation.length > 0 ? (
        <>
          <span className="pg-government-subhead">From {state.name}</span>
          <Roster
            rows={delegation}
            onOpenPerson={onOpenPerson}
            testid={`government-delegation-${safeKey}`}
          />
        </>
      ) : null}
      {roster.length > 0 ? (
        <details className="pg-government-roster-all">
          <summary>Every seat ({roster.length})</summary>
          <Roster
            rows={roster}
            onOpenPerson={onOpenPerson}
            testid={`government-roster-${safeKey}`}
          />
        </details>
      ) : null}
      {entry.rosterNote ? (
        <span className="pg-government-entry-detail">{entry.rosterNote}</span>
      ) : null}
      {entry.records && entry.records.length > 0 ? (
        <ul className="pg-government-records-list" aria-label="Bills on record">
          {entry.records.map((record) => (
            <li key={record.key}>
              <button
                type="button"
                className="pg-government-record"
                data-testid={`government-record-${record.measureId}`}
                onClick={() => onOpenMeasure(record.measureId)}
              >
                {record.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </>
  );
}

function RepresentedBy({
  rows,
  homeLabel,
  onOpenPerson,
}: {
  readonly rows: readonly RepresentationRow[];
  readonly homeLabel: string;
  readonly onOpenPerson: (personId: EntityId) => void;
}) {
  return (
    <section
      className="pg-government-represented"
      aria-labelledby="pg-government-represented"
      data-testid="government-represented-by"
    >
      <h3 id="pg-government-represented">Represented by · your districts</h3>
      <p className="pg-government-entry-detail">
        Where your home, {homeLabel}, is represented. This follows where you
        live, not where you are now or the place you are browsing.
      </p>
      <ul>
        {rows.map((row) => (
          <li key={row.key} data-testid={`government-represented-${row.key}`}>
            <span className="pg-government-entry-title">{row.office}</span>
            <span className="pg-government-seat">
              {row.district ?? "District not recorded"}
            </span>
            {row.holders.map((holder) => (
              <SeatHolder
                key={holder.key}
                status={holder.status}
                name={holder.name}
                personId={holder.personId}
                onOpenPerson={onOpenPerson}
              />
            ))}
            {row.note ? (
              <span className="pg-government-entry-detail">{row.note}</span>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
