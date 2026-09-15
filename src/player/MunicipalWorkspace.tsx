import "./MunicipalWorkspace.css";
import { projectMunicipalGoverning } from "../presentation/municipal-governing";
import { municipalCapacitySourceUrl } from "../simulation/municipal-capacity";
import { municipalVenueForActivity } from "../presentation/municipal-venue";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import type {
  EntityId,
  FutureTransitionHandlerRegistry,
  World,
} from "../simulation/types";
import {
  attendMunicipalPublicMeeting,
  municipalManagerDecisionRuleSource,
  performMunicipalMeetingNotes,
} from "../simulation/municipal-public-work";
import { scheduledActivityState } from "../simulation/time-work";
import { measureActions } from "../simulation/legislation";
import {
  introduceProjectedOrdinance,
  nextOrdinanceDesignation,
  placeProjectedOrdinanceOnAgenda,
  previewAuthoredCouncilBallots,
  takeProjectedOrdinanceVote,
  type OwnOrdinanceBallot,
} from "../presentation/municipal-governing";
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

const ORDINANCE_PHASE_LABELS: Readonly<Record<string, string>> = {
  "awaiting-referral": "Introduced; not yet on the council agenda.",
  "on-floor": "On the council agenda for passage.",
  enacted: "Passed and recorded.",
  failed: "Not passed.",
};

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
  const [ordinanceTitle, setOrdinanceTitle] = useState("");
  const [ballots, setBallots] = useState<Record<string, OwnOrdinanceBallot>>(
    {},
  );

  useEffect(() => {
    const next = municipalSelectionOnExternalPin(openGovernmentKey);
    setSelectedKey(next.selectedKey);
    setUserOverride(next.userOverride);
  }, [openGovernmentKey]);

  const homeContext = useMemo(
    () => projectMunicipalHomeContext(world),
    [world],
  );
  const inspectionKey = resolveMunicipalInspectionKey({
    openGovernmentKey,
    selectedKey,
    userOverride,
  });
  const view = municipalWorkspaceFor(world, inspectionKey || undefined);
  const governing = view
    ? projectMunicipalGoverning(world, view.government.key)
    : null;
  const managerRule = governing
    ? municipalManagerDecisionRuleSource(governing.governmentKey)
    : null;
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
        <p
          className="municipal-search-empty"
          data-testid="municipal-search-empty"
        >
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
          <option value={homeContext.governmentKey ?? ""}>
            {homeContext.governmentName ?? "My home government"}
          </option>
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
  const canWork =
    view?.standing.roles.some((role) => role !== "resident") ?? false;
  const pinned = view
    ? (isPinnedGovernment?.(view.government.key) ?? false)
    : false;
  const standingLabel = view
    ? view.standing.roles.length
      ? view.standing.roles.map(humanLabel).join(", ")
      : "Public visitor"
    : "";
  const attendanceHistory = view
    ? world.history.events.filter(
        (event) =>
          event.type === "municipal.public-meeting-attended" &&
          event.tags.includes(`government:${view.government.key}`),
      )
    : [];

  return (
    <section className="municipal-workspace" aria-label="Municipal government">
      <header className="municipal-header">
        <h2>{"Local government"}</h2>
        {homeContext.homePlaceLabel ? (
          <p data-testid="municipal-home-context">
            {"You live in "}
            <strong>{homeContext.homePlaceLabel}</strong>
            {"."}
          </p>
        ) : null}
      </header>
      {directory}
      {!view ? (
        <p data-testid="municipal-missing-home-link">
          {
            "Your town's own government is not in this build yet, so there is nothing to attend or work on here. The governments the game does support are listed above; reading them changes nothing about where you live."
          }
        </p>
      ) : (
        <>
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
                  <div key={event.id}>
                    {renderVenue(world, activityId, venue)}
                  </div>
                ) : null;
              })}

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

          {governing ? (
            <section
              className="municipal-panel"
              data-testid="municipal-governing"
            >
              <h3>Manager election</h3>
              {governing.managerAppointment ? (
                <p data-testid="municipal-manager-result">
                  {governing.managerAppointment.summary}
                </p>
              ) : (
                <p>
                  No manager election is recorded for this government in this
                  save.
                </p>
              )}
              <p>
                {governing.appointment.ok
                  ? "Your council seat is recorded. Electing a manager also requires the council's recorded votes; this screen cannot supply other members' decisions."
                  : governing.appointment.reason}
              </p>
              {managerRule ? (
                <details>
                  <summary>Election rule and remaining actions</summary>
                  <p>
                    {managerRule.label}, with the body's quorum required.{" "}
                    {managerRule.source.sourceUrl ? (
                      <a
                        href={managerRule.source.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {managerRule.source.citation}
                      </a>
                    ) : (
                      managerRule.source.citation
                    )}
                    .
                  </p>
                  <p>
                    Recording a new council election through ordinary play still
                    needs its member-decision producer.
                  </p>
                </details>
              ) : null}
            </section>
          ) : null}

          {governing &&
          (governing.ordinanceIntroduction.ok ||
            governing.ordinances.length > 0) ? (
            <section
              className="municipal-panel"
              data-testid="municipal-ordinances"
            >
              <h3>Council ordinances</h3>
              {governing.ordinanceIntroduction.ok ? (
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    const title = ordinanceTitle.trim();
                    if (!title) return;
                    act(
                      introduceProjectedOrdinance(
                        world,
                        governing.governmentKey,
                        nextOrdinanceDesignation(
                          world,
                          governing.governmentKey,
                        ),
                        title,
                      ),
                    );
                    setOrdinanceTitle("");
                  }}
                >
                  <label>
                    Title of a new ordinance
                    <input
                      type="text"
                      value={ordinanceTitle}
                      onChange={(event) =>
                        setOrdinanceTitle(event.target.value)
                      }
                      data-testid="municipal-ordinance-title"
                    />
                  </label>
                  <button type="submit" disabled={!ordinanceTitle.trim()}>
                    Introduce ordinance
                  </button>
                </form>
              ) : (
                <p>{governing.ordinanceIntroduction.reason}</p>
              )}
              {governing.ordinances.length === 0 ? (
                <p>No ordinance is before the council in this save.</p>
              ) : (
                <ul className="municipal-ordinance-list">
                  {governing.ordinances.map((ordinance) => {
                    const ballot = ballots[ordinance.measureId] ?? "yea";
                    const preview =
                      ordinance.phase === "on-floor"
                        ? previewAuthoredCouncilBallots(
                            world,
                            governing.governmentKey,
                            ordinance.measureId,
                            ballot,
                          )
                        : null;
                    const tooEarly =
                      ordinance.earliestPassageOn !== null &&
                      world.currentDate < ordinance.earliestPassageOn;
                    return (
                      <li
                        key={ordinance.measureId}
                        data-testid="municipal-ordinance"
                      >
                        <strong>
                          {ordinance.designation}: {ordinance.shortTitle}
                        </strong>
                        <p>
                          Introduced {ordinance.introducedAt}.{" "}
                          {ORDINANCE_PHASE_LABELS[ordinance.phase] ??
                            humanLabel(ordinance.phase)}
                        </p>
                        {ordinance.phase === "awaiting-referral" &&
                        governing.ordinanceVote.ok ? (
                          <button
                            type="button"
                            onClick={() =>
                              act(
                                placeProjectedOrdinanceOnAgenda(
                                  world,
                                  governing.governmentKey,
                                  ordinance.measureId,
                                ),
                              )
                            }
                          >
                            Put on the council agenda
                          </button>
                        ) : null}
                        {ordinance.phase === "on-floor" ? (
                          <div className="municipal-ordinance-vote">
                            {ordinance.timingRule ? (
                              <p>
                                {ordinance.timingRule} Earliest valid passage:{" "}
                                {ordinance.earliestPassageOn}.
                              </p>
                            ) : null}
                            {preview ? (
                              <>
                                <fieldset>
                                  <legend>Your vote</legend>
                                  {(
                                    [
                                      ["yea", "Yea"],
                                      ["nay", "Nay"],
                                      [
                                        "present-not-voting",
                                        "Present, not voting",
                                      ],
                                    ] as const
                                  ).map(([value, label]) => (
                                    <label key={value}>
                                      <input
                                        type="radio"
                                        name={`ballot-${ordinance.measureId}`}
                                        value={value}
                                        checked={ballot === value}
                                        onChange={() =>
                                          setBallots({
                                            ...ballots,
                                            [ordinance.measureId]: value,
                                          })
                                        }
                                      />
                                      {label}
                                    </label>
                                  ))}
                                </fieldset>
                                <details>
                                  <summary>
                                    Other councilors' ballots (game-authored)
                                  </summary>
                                  <p>{preview.note}</p>
                                  <ul>
                                    {preview.colleagues.map((colleague) => {
                                      const person =
                                        world.people[colleague.personId];
                                      return (
                                        <li key={colleague.personId}>
                                          {person
                                            ? `${person.givenName} ${person.familyName}`
                                            : "A councilor"}
                                          {colleague.seatLabel
                                            ? ` (${colleague.seatLabel})`
                                            : ""}
                                          {": "}
                                          {colleague.disposition === "yea"
                                            ? "Yea"
                                            : "Nay"}
                                        </li>
                                      );
                                    })}
                                  </ul>
                                  <p>
                                    If recorded now: {preview.yea} yea,{" "}
                                    {preview.nay} nay
                                    {preview.presentNotVoting
                                      ? `, ${preview.presentNotVoting} present not voting`
                                      : ""}
                                    . {ordinance.passageRule}
                                  </p>
                                </details>
                                <button
                                  type="button"
                                  disabled={tooEarly}
                                  onClick={() =>
                                    act(
                                      takeProjectedOrdinanceVote(
                                        world,
                                        governing.governmentKey,
                                        ordinance.measureId,
                                        ballot,
                                      ),
                                    )
                                  }
                                >
                                  Record the council vote
                                </button>
                                {tooEarly ? (
                                  <p>
                                    Not before {ordinance.earliestPassageOn}:
                                    the council's code does not allow passage
                                    sooner.
                                  </p>
                                ) : null}
                              </>
                            ) : (
                              <p>Only a seated councilor votes on it.</p>
                            )}
                          </div>
                        ) : null}
                        {ordinance.enactment ? (
                          <p data-testid="municipal-ordinance-outcome">
                            Enacted {ordinance.enactment.resolvedAt}; in effect
                            from{" "}
                            {ordinance.enactment.effectiveAt ??
                              "a date the rules read do not establish"}
                            . {ordinance.effectiveRule}
                          </p>
                        ) : null}
                        {ordinance.phase === "failed" ? (
                          <p data-testid="municipal-ordinance-outcome">
                            The council did not pass it.
                          </p>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          ) : null}

          <section className="municipal-panel" data-testid="municipal-people">
            <h3>{"Known people"}</h3>
            {knownPeople.length === 0 ? (
              <p>{"Nobody who holds office here is known to you yet."}</p>
            ) : (
              <ul className="municipal-people-list">
                {knownPeople.map((person) => (
                  <li
                    key={`${person.roleLabel}:${person.name}:${person.personId ?? "unknown"}`}
                  >
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
                    {!person.represented
                      ? " — not represented in this save"
                      : null}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section
            className="municipal-panel"
            data-testid="municipal-activities"
          >
            <h3>{"Public meetings"}</h3>
            {view.meetings.length === 0 && (
              <p>{"No public meeting is on the calendar yet."}</p>
            )}
            {view.isHomeGovernment &&
              view.availableMeetingSeries.length > 0 && (
                <div className="municipal-authored-session">
                  <p>
                    {
                      "Put a public session on the calendar: a game-authored 90-minute session starting in an hour, or tomorrow if this series already met today. Closed and executive sessions are not offered."
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
                      onChange={(event) =>
                        setSelectedSeriesKey(event.target.value)
                      }
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
            <section
              className="municipal-panel"
              data-testid="municipal-pending-work"
            >
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

          <section
            className="municipal-panel"
            data-testid="municipal-attendance-history"
          >
            <h3>{"Attendance history"}</h3>
            {attendanceHistory.length === 0 ? (
              <p>
                {
                  "No public meeting attendance is recorded for this government."
                }
              </p>
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

          <details
            className="municipal-source-review"
            data-testid="municipal-source-review"
          >
            <summary>{"Source review"}</summary>
            <p>
              {
                "Publisher observations, research references, and capacity records for this government. These are not the normal gameplay screen."
              }
            </p>
            <p>
              {"Census place: "}
              {view.government.placeGeoid ?? "Unknown"}
              {
                ". A place identifier is not a government-unit or county identifier."
              }
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
                              (candidate) =>
                                candidate.key === evidence.artifactId,
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
                {":"}{" "}
                {row.amount.state === "KNOWN" ? row.amount.value : "Unknown"}{" "}
                {row.units}
                {"; fiscal year ending "}
                {row.fiscalYearEnding}
                {"."}{" "}
                {municipalCapacitySourceUrl(row.evidence.artifactId) && (
                  <a
                    href={municipalCapacitySourceUrl(row.evidence.artifactId)!}
                  >
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
                  <a
                    href={municipalCapacitySourceUrl(row.evidence.artifactId)!}
                  >
                    {"Publisher observation"}
                  </a>
                )}
              </p>
            ))}
          </details>

          <p role="status">{message}</p>
        </>
      )}
    </section>
  );
}
