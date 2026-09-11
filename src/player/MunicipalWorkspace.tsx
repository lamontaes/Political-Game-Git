import "./MunicipalWorkspace.css";
import { municipalCapacitySourceUrl } from "../simulation/municipal-capacity";
import { municipalVenueForActivity } from "../presentation/municipal-venue";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import type { EntityId, FutureTransitionHandlerRegistry, World } from "../simulation/types";
import {
  attendMunicipalPublicMeeting,
  performMunicipalMeetingNotes,
} from "../simulation/municipal-public-work";
import { scheduledActivityState } from "../simulation/time-work";
import { measureActions } from "../simulation/legislation";
import {
  createAuthoredMunicipalPublicSession,
  municipalWorkspaceFor,
  prepareMunicipalMeetingNotes,
} from "../presentation/municipal-workspace";
import {
  filterMunicipalGovernmentEntries,
  groupMunicipalGovernmentEntries,
  municipalSelectionOnExternalPin,
  municipalSelectionOnUserPick,
  projectMunicipalGovernmentEntries,
  projectMunicipalHomeContext,
  projectMunicipalKnownPeople,
  resolveMunicipalInspectionKey,
  stateDisplayName,
} from "./municipal-directory";

function humanLabel(value: string): string {
  const words = value.toLowerCase().replace(/[_-]/g, " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** Feature-local v1 surface. UI-core owns its navigation and save callback. */
export function MunicipalWorkspace({
  world,
  onWorldChange,
  transitionHandlers,
  renderVenue,
  openGovernmentKey,
  isPinnedGovernment,
  onTogglePinGovernment,
  onOpenPerson,
}: {
  readonly world: World;
  readonly renderVenue?: (
    world: World,
    activityId: string,
    venue: NonNullable<ReturnType<typeof municipalVenueForActivity>>,
  ) => ReactNode;
  readonly transitionHandlers?: FutureTransitionHandlerRegistry;
  readonly onWorldChange: (world: World) => void;
  /**
   * A government the shell was asked to open, from a pin or a link.
   *
   * Selecting one here inspects it. It does not move the player, change where
   * they live, or give them any standing in it — `view.standing` still comes
   * from the world, so a visitor stays a visitor.
   */
  readonly openGovernmentKey?: string;
  readonly isPinnedGovernment?: (key: string) => boolean;
  readonly onTogglePinGovernment?: (key: string) => void;
  readonly onOpenPerson?: (personId: EntityId) => void;
}) {
  const [message, setMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedKey, setSelectedKey] = useState("");
  const [userOverride, setUserOverride] = useState(false);
  const [selectedSeriesKey, setSelectedSeriesKey] = useState("");

  useEffect(() => {
    const next = municipalSelectionOnExternalPin(openGovernmentKey);
    setSelectedKey(next.selectedKey);
    setUserOverride(next.userOverride);
  }, [openGovernmentKey]);

  const homeContext = useMemo(() => projectMunicipalHomeContext(world), [world]);
  const inspectionKey = resolveMunicipalInspectionKey({
    openGovernmentKey,
    selectedKey,
    userOverride,
  });
  const view = municipalWorkspaceFor(world, inspectionKey || undefined);
  const governmentEntries = useMemo(
    () =>
      filterMunicipalGovernmentEntries(
        projectMunicipalGovernmentEntries(
          homeContext.governmentKey,
          homeContext.stateCode,
        ),
        searchQuery,
      ),
    [homeContext.governmentKey, homeContext.stateCode, searchQuery],
  );
  const governmentGroups = useMemo(
    () => groupMunicipalGovernmentEntries(governmentEntries),
    [governmentEntries],
  );
  const knownPeople = useMemo(
    () =>
      view
        ? projectMunicipalKnownPeople(world, view.government, view.reading)
        : [],
    [view, world],
  );
  const trimmedSearch = searchQuery.trim();
  const hasActiveSearch = trimmedSearch.length > 0;
  const selectValue = inspectionKey || homeContext.governmentKey || "";

  const directory = (
    <div className="municipal-directory">
      <label className="municipal-search-label">
        {"Search other supported governments"}
        <input
          type="search"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Name or state"
          data-testid="municipal-search"
          aria-controls="municipal-government-select"
        />
      </label>
      {hasActiveSearch && governmentEntries.length === 0 ? (
        <p className="municipal-search-empty" data-testid="municipal-search-empty">
          {"No supported government matches that search."}
        </p>
      ) : null}
      <label>
        {"Inspect a government"}
        <select
          id="municipal-government-select"
          data-testid="municipal-government-select"
          value={selectValue}
          onChange={(event) => {
            const next = municipalSelectionOnUserPick(event.target.value);
            setSelectedKey(next.selectedKey);
            setUserOverride(next.userOverride);
            setMessage("");
          }}
        >
          {homeContext.governmentKey ? (
            <option value={homeContext.governmentKey}>
              {homeContext.governmentName ?? "My home government"}
            </option>
          ) : (
            <option value="">{"My home government"}</option>
          )}
          {governmentGroups.map((group) => (
            <optgroup key={group.group} label={group.label}>
              {group.entries
                .filter((entry) => entry.key !== homeContext.governmentKey)
                .map((entry) => (
                  <option key={entry.key} value={entry.key}>
                    {entry.displayName}
                    {" ("}
                    {entry.state}
                    {")"}
                  </option>
                ))}
            </optgroup>
          ))}
        </select>
      </label>
    </div>
  );

  if (!view) {
    return (
      <section
        className="municipal-workspace"
        aria-label="Municipal government"
      >
        <header className="municipal-header">
          <h2>{"Local government"}</h2>
          {homeContext.placeLabel ? (
            <p data-testid="municipal-home-context">
              {"You live in "}
              <strong>{homeContext.placeLabel}</strong>
              {homeContext.stateName ? `, ${homeContext.stateName}` : null}
              {"."}
            </p>
          ) : null}
        </header>
        {directory}
        <p data-testid="municipal-missing-home-link">
          {"No verified government link is available for this home's place."}
        </p>
      </section>
    );
  }

  const act = (result: {
    readonly ok: boolean;
    readonly world: World;
    readonly reason?: string;
  }) => {
    if (result.ok) {
      onWorldChange(result.world);
      setMessage("Recorded in your calendar and history.");
    } else setMessage(result.reason ?? "No change recorded.");
  };
  const canWork = view.standing.roles.some((role) => role !== "resident");
  const pinned = isPinnedGovernment?.(view.government.key) ?? false;
  const standingLabel = view.standing.roles.length
    ? view.standing.roles.map(humanLabel).join(", ")
    : "Public visitor";
  const attendanceHistory = world.history.events.filter(
    (event) =>
      event.type === "municipal.public-meeting-attended" &&
      event.tags.includes(`government:${view.government.key}`),
  );

  return (
    <section className="municipal-workspace" aria-label="Municipal government">
      <header className="municipal-header">
        <h2>{"Local government"}</h2>
        {homeContext.placeLabel ? (
          <p data-testid="municipal-home-context">
            {"You live in "}
            <strong>{homeContext.placeLabel}</strong>
            {homeContext.stateName ? `, ${homeContext.stateName}` : null}
            {"."}
          </p>
        ) : null}
      </header>

      <p className="municipal-current" data-testid="municipal-current">
        <strong data-testid="municipal-current-name">
          {view.government.displayName}
        </strong>
        <span>
          {" · "}
          {stateDisplayName(view.government.state)}
        </span>
        {onTogglePinGovernment ? (
          <button
            type="button"
            className="ui-action"
            data-testid="municipal-pin"
            aria-pressed={pinned}
            aria-label={
              pinned
                ? `Unpin ${view.government.displayName}`
                : `Pin ${view.government.displayName}`
            }
            onClick={() => onTogglePinGovernment(view.government.key)}
          >
            {pinned ? "★ Pinned" : "☆ Pin this government"}
          </button>
        ) : null}
      </p>

      {renderVenue &&
        world.history.events
          .filter(
            (event) =>
              event.type === "municipal.public-meeting-attended" &&
              event.tags.includes(`government:${view.government.key}`),
          )
          .slice(-1)
          .map((event) => {
            const activityId = event.involvedEntityIds.find((id) =>
              world.history.scheduledActivities.some(
                (activity) => activity.id === id,
              ),
            );
            const venue =
              activityId && municipalVenueForActivity(world, activityId);
            return activityId && venue ? (
              <div key={event.id}>{renderVenue(world, activityId, venue)}</div>
            ) : null;
          })}

      {directory}

      <section className="municipal-panel" data-testid="municipal-standing">
        <h3>{"Your standing here"}</h3>
        <p>
          {view.isHomeGovernment
            ? "Linked to your saved home place."
            : "Library inspection. This does not change your residence or grant a role."}
        </p>
        <p>{standingLabel}</p>
        {view.standing.seatContext ? (
          <p>
            {"Seat: "}
            {view.standing.seatContext}
          </p>
        ) : null}
      </section>

      <section className="municipal-panel" data-testid="municipal-people">
        <h3>{"Known people"}</h3>
        {knownPeople.length === 0 ? (
          <p>{"No current officeholders are recorded in this save."}</p>
        ) : (
          <ul className="municipal-people-list">
            {knownPeople.map((person) => (
              <li key={`${person.roleLabel}:${person.name}:${person.personId ?? "unknown"}`}>
                {person.personId && onOpenPerson ? (
                  <button
                    type="button"
                    className="municipal-person-link"
                    onClick={() => onOpenPerson(person.personId!)}
                  >
                    {person.name}
                  </button>
                ) : (
                  <strong>{person.name}</strong>
                )}
                {" — "}
                {person.roleLabel}
                {person.seatLabel ? ` (${person.seatLabel})` : null}
                {!person.represented ? " — not represented in this save" : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="municipal-panel" data-testid="municipal-activities">
        <h3>{"Public meetings"}</h3>
        {view.meetings.length === 0 && (
          <p>{"No session is recorded on this world's calendar."}</p>
        )}
        {view.isHomeGovernment && view.availableMeetingSeries.length > 0 && (
          <div className="municipal-authored-session">
            <p>
              {
                "Add an explicitly game-authored public session lasting 90 minutes, starting in one hour (tomorrow if this series already met today). This is not a real published notice or agenda. Closed and executive sessions are excluded."
              }
            </p>
            <label>
              {"Public session type"}
              <select
                value={
                  view.availableMeetingSeries.some(
                    (series) => series.seriesKey === selectedSeriesKey,
                  )
                    ? selectedSeriesKey
                    : view.availableMeetingSeries[0]!.seriesKey
                }
                onChange={(event) => setSelectedSeriesKey(event.target.value)}
              >
                {view.availableMeetingSeries.map((series) => (
                  <option key={series.seriesKey} value={series.seriesKey}>
                    {series.bodyName ?? view.government.displayName}
                    {" ·"} {humanLabel(series.kind)}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={() => {
                const selected = view.availableMeetingSeries.some(
                  (series) => series.seriesKey === selectedSeriesKey,
                )
                  ? selectedSeriesKey
                  : view.availableMeetingSeries[0]!.seriesKey;
                const next = createAuthoredMunicipalPublicSession(
                  world,
                  selected,
                );
                if (next !== world) {
                  onWorldChange(next);
                  setMessage("Public session added to your calendar.");
                } else
                  setMessage(
                    "A session of this type is already on your calendar.",
                  );
              }}
            >
              {"Add public session to this world"}
            </button>
          </div>
        )}
        {view.meetings.map((meeting) => {
          const state = scheduledActivityState(world, meeting.id);
          const notes = view.meetingNotes.find(
            ({ item }) =>
              item.stableKey ===
              `municipal-work:${view.government.key}:meeting-notes:${meeting.id}:${view.standing.personId}`,
          );
          return (
            <article key={meeting.id} aria-label={meeting.title}>
              <h4>{meeting.title}</h4>
              <p>{meeting.summary}</p>
              <p>
                {state!.start.date}
                {" ·"}{" "}
                {String(Math.floor(state!.start.minuteOfDay / 60)).padStart(
                  2,
                  "0",
                )}
                {":"}
                {String(state!.start.minuteOfDay % 60).padStart(2, "0")}
              </p>
              <p>
                {
                  "Agenda: no published agenda has been attached to this session. Recorded measures appear below."
                }
              </p>
              <button
                type="button"
                onClick={() =>
                  act(
                    attendMunicipalPublicMeeting(
                      world,
                      view.government.key,
                      meeting.id,
                      transitionHandlers,
                    ),
                  )
                }
              >
                {"Attend public meeting"}
              </button>
              <button
                type="button"
                disabled={!canWork}
                onClick={() =>
                  act(
                    prepareMunicipalMeetingNotes(
                      world,
                      view.government.key,
                      meeting.id,
                    ),
                  )
                }
              >
                {"Prepare meeting notes"}
              </button>
              {notes && (
                <div>
                  <p>
                    {"Meeting notes: "}
                    {humanLabel(notes.state.status)}
                    {". Completed effort: "}
                    {notes.state.completedEffortMinutes}
                    {" minutes."}
                  </p>
                  {notes.state.status === "active" && (
                    <button
                      type="button"
                      disabled={!canWork}
                      onClick={() =>
                        act(
                          performMunicipalMeetingNotes(
                            world,
                            view.government.key,
                            meeting.id,
                            transitionHandlers,
                          ),
                        )
                      }
                    >
                      {"Work on meeting notes ·"}{" "}
                      {(notes.item.effort?.requiredMinutes ?? 0) -
                        notes.state.completedEffortMinutes}{" "}
                      {"minutes"}
                    </button>
                  )}
                </div>
              )}
            </article>
          );
        })}
        {!canWork && (
          <p>
            {
              "Public attendance grants no office powers. Meeting preparation requires a current role in this government."
            }
          </p>
        )}
      </section>

      {view.meetingNotes.length > 0 && (
        <section className="municipal-panel" data-testid="municipal-pending-work">
          <h3>{"Pending work"}</h3>
          <ul>
            {view.meetingNotes.map(({ item, state }) => (
              <li key={item.id}>
                <strong>{item.title}</strong>
                {" — "}
                {humanLabel(state.status)}
                {state.status === "active"
                  ? ` (${state.completedEffortMinutes}/${item.effort?.requiredMinutes ?? 0} minutes)`
                  : null}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="municipal-panel" data-testid="municipal-measures">
        <h3>{"Measures and history"}</h3>
        {view.measures.length === 0 ? (
          <p>{"No municipal measure has been recorded."}</p>
        ) : (
          <ul>
            {view.measures.map((measure) => (
              <li key={measure.id}>
                <strong>
                  {measure.designation}
                  {": "}
                  {measure.shortTitle}
                </strong>
                <p>{measure.summary}</p>
                <ol>
                  {measureActions(world, measure.id).map((action) => (
                    <li key={action.id}>{action.kind}</li>
                  ))}
                </ol>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="municipal-panel" data-testid="municipal-attendance-history">
        <h3>{"Attendance history"}</h3>
        {attendanceHistory.length === 0 ? (
          <p>{"No public meeting attendance is recorded for this government."}</p>
        ) : (
          attendanceHistory.map((event) => (
            <p key={event.id}>
              {event.occurredAt}
              {": "}
              {event.summary}
            </p>
          ))
        )}
      </section>

      <details className="municipal-source-review" data-testid="municipal-source-review">
        <summary>{"Source review"}</summary>
        <p>
          {
            "Publisher observations, research references, and capacity records for this government. These are not the normal gameplay screen."
          }
        </p>
        <p>
          {"Census place: "}
          {view.government.placeGeoid ?? "Unknown"}
          {". A place identifier is not a government-unit or county identifier."}
        </p>
        {view.government.identity ? (
          <details>
            <summary>{"Government identity and geography"}</summary>
            <p>
              {view.government.identity.publisherUnitName}
              {" ·"} {view.government.identity.governmentUnit.unitType}
            </p>
            <p>
              {"Publisher PID: "}
              {view.government.identity.publisherId}
              {". Legacy government ID:"}{" "}
              {view.government.identity.censusGovernmentUnitId ?? "Unknown"}
              {"."}
            </p>
            <p>
              {"County-equivalent representation:"}{" "}
              {view.government.identity.countyEquivalentGeoid ??
                "Not established"}
              {". County area:"}{" "}
              {view.government.identity.governmentUnit.countyAreaName ??
                "Unknown"}{" "}
              {"(not a governing parent)."}
            </p>
            <p>{view.government.identity.basis}</p>
            <p>
              {"Inventory observation:"}{" "}
              {view.government.identity.governmentUnit.evidence.asOf}
              {"."}{" "}
              <a
                href="https://www.census.gov/data/datasets/2025/econ/gus/public-use-files.html"
                target="_blank"
                rel="noreferrer"
              >
                {"Census Government Units Survey"}
              </a>
            </p>
          </details>
        ) : (
          <p>{"No verified Census government-unit link is available."}</p>
        )}
        {view.government.readings.map((reading) => (
          <details
            key={`${reading.key}:${reading.evidence}`}
            open={reading === view.reading}
          >
            <summary>
              {reading.evidence === "enacted-text"
                ? "Retrieved law"
                : reading.evidence === "reference-observation"
                  ? "Dated meeting reference — not operative law"
                  : "Research report — not operative law"}{" "}
              {"· "}
              {reading.asOf}
            </summary>
            <dl>
              <dt>{"Form"}</dt>
              <dd>{reading.form ? humanLabel(reading.form) : "Unknown"}</dd>
              <dt>{"Body"}</dt>
              <dd>{reading.bodyName ?? "Unknown"}</dd>
              <dt>{"Members"}</dt>
              <dd>{reading.bodySize ?? "Unknown"}</dd>
              <dt>{"Seat pattern"}</dt>
              <dd>{reading.composition?.note ?? "Unknown"}</dd>
              <dt>{"Mayor"}</dt>
              <dd>
                {reading.mayor
                  ? humanLabel(reading.mayor.structuralPosition)
                  : "Unknown"}
              </dd>
              <dt>{"Professional manager"}</dt>
              <dd>{reading.manager?.statedRole ?? "Unknown"}</dd>
              <dt>{"Consolidation"}</dt>
              <dd>
                {reading.consolidationType
                  ? humanLabel(reading.consolidationType)
                  : "Unknown"}
              </dd>
            </dl>
            <details>
              <summary>{"All recorded facts and evidence"}</summary>
              <dl>
                {reading.facts.map((fact) => (
                  <div key={fact.path}>
                    <dt>{fact.path}</dt>
                    <dd>
                      {fact.state}
                      {":"}{" "}
                      {fact.value === undefined
                        ? (fact.reason ?? "No value established")
                        : typeof fact.value === "string"
                          ? fact.value
                          : JSON.stringify(fact.value)}{" "}
                      {fact.asOf && ` — observed ${fact.asOf}`}
                      {fact.evidence?.map((evidence, index) => {
                        const source = reading.sources.find(
                          (candidate) => candidate.key === evidence.artifactId,
                        );
                        return source ? (
                          <span key={index}>
                            {" "}
                            {"·"}{" "}
                            <a
                              href={source.url}
                              target="_blank"
                              rel="noreferrer"
                            >
                              {evidence.locator.citation ?? source.title}
                            </a>
                          </span>
                        ) : null;
                      })}
                    </dd>
                  </div>
                ))}
              </dl>
            </details>
            <ul>
              {reading.sources.map((source) => (
                <li key={source.key}>
                  <a href={source.url} target="_blank" rel="noreferrer">
                    {source.title}
                  </a>
                </li>
              ))}
            </ul>
          </details>
        ))}
        <details>
          <summary>{"Cited public records and meeting material"}</summary>
          <p>
            {
              "These are references in this government's source readings. They are not attached agendas or notices for an authored session in this world."
            }
          </p>
          <ul>
            {view.publicReferences.map((url) => (
              <li key={url}>
                <a href={url} target="_blank" rel="noreferrer">
                  {url}
                </a>
              </li>
            ))}
          </ul>
        </details>
        <h4>{"Historical finance and employment"}</h4>
        <p>
          {
            "These observations do not establish current cash, staffing, or legal powers."
          }
        </p>
        {view.capacity.finance.length === 0 && (
          <p>
            {
              "No finance observation is available for this exact government ID in the accepted corpus. Missing data is not zero."
            }
          </p>
        )}
        {view.capacity.finance.map((row) => (
          <p key={row.recordId}>
            {row.itemDescription}
            {":"} {row.amount.state === "KNOWN" ? row.amount.value : "Unknown"}{" "}
            {row.units}
            {"; fiscal year ending "}
            {row.fiscalYearEnding}
            {"."}{" "}
            {municipalCapacitySourceUrl(row.evidence.artifactId) && (
              <a href={municipalCapacitySourceUrl(row.evidence.artifactId)!}>
                {"Publisher observation"}
              </a>
            )}
          </p>
        ))}
        {view.capacity.employment.length === 0 && (
          <p>
            {
              "No employment observation is available for this exact government ID in the accepted corpus."
            }
          </p>
        )}
        {view.capacity.employment.map((row) => (
          <p key={row.recordId}>
            {row.functionLabel}
            {":"}{" "}
            {row.fullTimeEmployees.state === "KNOWN"
              ? row.fullTimeEmployees.value
              : "Unknown"}{" "}
            {"full-time employees,"}{" "}
            {row.partTimeEmployees.state === "KNOWN"
              ? row.partTimeEmployees.value
              : "Unknown"}{" "}
            {"part-time employees; observed "}
            {row.referenceDate}
            {". Full-time equivalent: unknown."}{" "}
            {municipalCapacitySourceUrl(row.evidence.artifactId) && (
              <a href={municipalCapacitySourceUrl(row.evidence.artifactId)!}>
                {"Publisher observation"}
              </a>
            )}
          </p>
        ))}
      </details>

      <p role="status">{message}</p>
    </section>
  );
}
