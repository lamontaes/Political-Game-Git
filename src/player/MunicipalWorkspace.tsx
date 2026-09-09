import "./MunicipalWorkspace.css";
import { municipalCapacitySourceUrl } from "../simulation/municipal-capacity";
import { municipalGovernments } from "../simulation/municipal-government";
import { municipalVenueForActivity } from "../presentation/municipal-venue";
import type { ReactNode } from "react";
import { useState } from "react";
import type { FutureTransitionHandlerRegistry } from "../simulation/types";
import type { World } from "../simulation/types";
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
}) {
  const [message, setMessage] = useState("");
  const [selectedKey, setSelectedKey] = useState("");
  const inspectionKey = openGovernmentKey ?? selectedKey;
  const [selectedSeriesKey, setSelectedSeriesKey] = useState("");
  const view = municipalWorkspaceFor(world, inspectionKey || undefined);
  const directory = (
    <label>
      {"Inspect a government"}
      <select
        value={inspectionKey}
        onChange={(event) => {
          setSelectedKey(event.target.value);
          setMessage("");
        }}
      >
        <option value="">{"My home government"}</option>
        {municipalGovernments().map((government) => (
          <option key={government.key} value={government.key}>
            {government.displayName}
            {" ("}
            {government.state}
            {")"}
          </option>
        ))}
      </select>
    </label>
  );
  if (!view)
    return (
      <section
        className="municipal-workspace"
        aria-label="Municipal government"
      >
        <h2>{"Municipal government"}</h2>
        {directory}
        <p>
          {"No verified government link is available for this home's place."}
        </p>
      </section>
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
  const canWork = view.standing.roles.some((role) => role !== "resident");
  const pinned = isPinnedGovernment?.(view.government.key) ?? false;
  return (
    <section className="municipal-workspace" aria-label="Municipal government">
      {/*
        Where you are, and a shortcut back to it.

        The owner asked for exactly this — "I want a shortcut to Lexington,
        boom, click it" — and found there was nothing to click. A pin here is a
        real reference to this GOVERNMENT: reopening it selects this government
        again and does nothing else. It does not travel, does not move house,
        and grants no role. Standing is still read from the world below.
      */}
      <p className="municipal-current" data-testid="municipal-current">
        <strong data-testid="municipal-current-name">
          {view.government.displayName}
        </strong>
        <span>
          {" · "}
          {view.standing.roles.length
            ? view.standing.roles.map(humanLabel).join(", ")
            : "No recorded standing here"}
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
      <h2>{view.government.displayName}</h2>
      <p>
        {view.isHomeGovernment
          ? "Linked to your saved home place."
          : "Library inspection. This does not change your residence or grant a role."}
      </p>
      <p>
        {view.standing.roles.map(humanLabel).join(", ") || "Public visitor"}
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
                          <a href={source.url} target="_blank" rel="noreferrer">
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
      <h3>{"Public meetings"}</h3>
      {view.meetings.length === 0 && (
        <p>{"No session is recorded on this world's calendar."}</p>
      )}
      {view.isHomeGovernment && view.availableMeetingSeries.length > 0 && (
        <>
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
        </>
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
      <h3>{"Attendance history"}</h3>
      {world.history.events
        .filter(
          (event) =>
            event.type === "municipal.public-meeting-attended" &&
            event.tags.includes(`government:${view.government.key}`),
        )
        .map((event) => (
          <p key={event.id}>
            {event.occurredAt}
            {": "}
            {event.summary}
          </p>
        ))}
      <h3>{"Historical finance and employment"}</h3>
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
      <p role="status">{message}</p>
    </section>
  );
}
