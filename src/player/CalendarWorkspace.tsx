import { useEffect, useRef } from "react";

import type { EntityId } from "../simulation";
import type {
  RunDAgendaEntry,
  RunDLiteFixture,
  RunDLiteProjection,
} from "../presentation/run-d-lite";

interface CalendarWorkspaceProps {
  readonly fixture: RunDLiteFixture;
  readonly projection: RunDLiteProjection;
  readonly selectedActivityId: EntityId | null;
  readonly feedback: string | null;
  readonly onSelect: (activityId: EntityId) => void;
  readonly onCloseDetail: () => void;
  readonly onClose: () => void;
  readonly onValidReschedule: () => void;
  readonly onInvalidReschedule: () => void;
  readonly onPerformBriefing: () => void;
}

const DAY_START_MINUTE = 8 * 60;
const DAY_END_MINUTE = 17 * 60;
const DAY_SPAN_MINUTES = DAY_END_MINUTE - DAY_START_MINUTE;

function formatDay(date: string): { weekday: string; day: string } {
  const parsed = new Date(`${date}T12:00:00Z`);
  return {
    weekday: new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      timeZone: "UTC",
    }).format(parsed),
    day: new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    }).format(parsed),
  };
}

function formatMinute(minuteOfDay: number): string {
  const hour24 = Math.floor(minuteOfDay / 60);
  const minute = minuteOfDay % 60;
  const suffix = hour24 >= 12 ? "PM" : "AM";
  const hour = hour24 % 12 || 12;
  return `${hour}:${minute.toString().padStart(2, "0")} ${suffix}`;
}

function kindLabel(entry: RunDAgendaEntry): string {
  if (entry.activity.kind === "confirmed") return "Confirmed";
  if (entry.activity.kind === "tentative") return "Tentative hold";
  if (entry.activity.kind === "flexible") return "Flexible work";
  return "Travel";
}

function geometry(minute: number, duration: number) {
  return {
    top: `${((minute - DAY_START_MINUTE) / DAY_SPAN_MINUTES) * 100}%`,
    height: `${(duration / DAY_SPAN_MINUTES) * 100}%`,
  };
}

export function CalendarWorkspace({
  fixture,
  projection,
  selectedActivityId,
  feedback,
  onSelect,
  onCloseDetail,
  onClose,
  onValidReschedule,
  onInvalidReschedule,
  onPerformBriefing,
}: CalendarWorkspaceProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => closeRef.current?.focus(), []);
  const selected = projection.agenda.find(
    (entry) => entry.activity.id === selectedActivityId,
  );
  const markerDateIndex = projection.weekDates.indexOf(
    projection.currentMoment.date,
  );
  const markerGeometry = geometry(projection.currentMoment.minuteOfDay, 0);

  return (
    <section
      className="planning-workspace calendar-workspace"
      aria-labelledby="calendar-workspace-title"
      data-testid="calendar-workspace"
    >
      <header className="planning-workspace-header">
        <div>
          <p>Office week · Lexington time</p>
          <h2 id="calendar-workspace-title">Calendar</h2>
          <span>
            Current time {formatMinute(projection.currentMoment.minuteOfDay)} ·
            Lexington time
          </span>
        </div>
        <div className="planning-header-actions">
          <button ref={closeRef} type="button" onClick={onClose}>
            Return to office
          </button>
        </div>
      </header>

      <div className="calendar-week" data-testid="calendar-week">
        <div className="calendar-day-headers" aria-hidden="true">
          <span />
          {projection.weekDates.map((date) => {
            const formatted = formatDay(date);
            return (
              <span key={date}>
                <strong>{formatted.weekday}</strong>
                <small>{formatted.day}</small>
              </span>
            );
          })}
        </div>
        <div className="calendar-week-body">
          <div className="calendar-time-scale" aria-label="Time scale">
            {Array.from({ length: 10 }, (_, index) => {
              const minute = DAY_START_MINUTE + index * 60;
              return (
                <time
                  key={minute}
                  style={{ top: `${(index / 9) * 100}%` }}
                  dateTime={`${projection.currentMoment.date}T${Math.floor(
                    minute / 60,
                  )
                    .toString()
                    .padStart(2, "0")}:00`}
                >
                  {formatMinute(minute).replace(":00", "")}
                </time>
              );
            })}
          </div>
          <div className="calendar-day-columns">
            {projection.weekDates.map((date, dayIndex) => (
              <div
                key={date}
                className="calendar-day-column"
                data-testid="calendar-day-column"
                data-calendar-date={date}
              >
                {Array.from({ length: 10 }, (_, index) => (
                  <span
                    key={index}
                    className="calendar-hour-line"
                    style={{ top: `${(index / 9) * 100}%` }}
                    aria-hidden="true"
                  />
                ))}
                {projection.agenda
                  .filter((entry) => entry.state.start.date === date)
                  .map((entry) => (
                    <button
                      key={entry.activity.id}
                      type="button"
                      className={`calendar-event calendar-event--${entry.activity.kind}`}
                      style={geometry(
                        entry.state.start.minuteOfDay,
                        entry.durationMinutes,
                      )}
                      onClick={() => onSelect(entry.activity.id)}
                      data-testid={`calendar-event-${entry.activity.id}`}
                      data-activity-kind={entry.activity.kind}
                      data-start-minute={entry.state.start.minuteOfDay}
                      data-duration-minutes={entry.durationMinutes}
                      aria-label={`${entry.activity.title}, ${kindLabel(entry)}, ${formatMinute(
                        entry.state.start.minuteOfDay,
                      )} to ${formatMinute(entry.state.end.minuteOfDay)}`}
                    >
                      <span>{kindLabel(entry)}</span>
                      <strong>{entry.activity.title}</strong>
                      <small>
                        {formatMinute(entry.state.start.minuteOfDay)}–
                        {formatMinute(entry.state.end.minuteOfDay)}
                      </small>
                    </button>
                  ))}
                {dayIndex === markerDateIndex ? (
                  <div
                    className="calendar-current-marker"
                    style={{ top: markerGeometry.top }}
                    data-testid="calendar-current-marker"
                    data-current-minute={projection.currentMoment.minuteOfDay}
                    aria-label={`Current simulation time ${formatMinute(
                      projection.currentMoment.minuteOfDay,
                    )}`}
                  >
                    <span />
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </div>

      <footer className="calendar-legend" aria-label="Calendar status key">
        <span className="legend-confirmed">Confirmed</span>
        <span className="legend-tentative">Tentative</span>
        <span className="legend-flexible">Flexible</span>
        <span className="legend-travel">Travel</span>
      </footer>

      {selected ? (
        <CalendarDetail
          entry={selected}
          fixture={fixture}
          feedback={feedback}
          onClose={onCloseDetail}
          onValidReschedule={onValidReschedule}
          onInvalidReschedule={onInvalidReschedule}
          onPerformBriefing={onPerformBriefing}
        />
      ) : null}
    </section>
  );
}

function CalendarDetail({
  entry,
  fixture,
  feedback,
  onClose,
  onValidReschedule,
  onInvalidReschedule,
  onPerformBriefing,
}: {
  readonly entry: RunDAgendaEntry;
  readonly fixture: RunDLiteFixture;
  readonly feedback: string | null;
  readonly onClose: () => void;
  readonly onValidReschedule: () => void;
  readonly onInvalidReschedule: () => void;
  readonly onPerformBriefing: () => void;
}) {
  const detailRef = useRef<HTMLButtonElement>(null);
  useEffect(() => detailRef.current?.focus(), [entry.activity.id]);
  const isFlexible = entry.activity.id === fixture.dLite.flexibleActivityId;
  const flexibleBlockAlreadyMoved =
    isFlexible && entry.state.start.minuteOfDay === 11 * 60;
  const isBriefing = entry.activity.id === fixture.dLite.briefingActivityId;
  const startsIn = entry.waitBeforeStartMinutes ?? -1;
  const canPerform =
    isBriefing && entry.state.status === "scheduled" && startsIn >= 0;
  return (
    <aside
      className="calendar-detail-card civic-glass"
      aria-labelledby="calendar-detail-title"
      data-testid="calendar-event-detail"
    >
      <header>
        <div>
          <p>{kindLabel(entry)}</p>
          <h3 id="calendar-detail-title">{entry.activity.title}</h3>
        </div>
        <button ref={detailRef} type="button" onClick={onClose}>
          Close
        </button>
      </header>
      <time>
        {formatMinute(entry.state.start.minuteOfDay)}–
        {formatMinute(entry.state.end.minuteOfDay)} · {entry.durationMinutes}{" "}
        minutes
      </time>
      <strong>{entry.activity.location.label}</strong>
      <p>{entry.activity.summary}</p>
      {isFlexible && entry.state.status === "scheduled" ? (
        <div className="calendar-detail-actions">
          {!flexibleBlockAlreadyMoved ? (
            <button type="button" onClick={onValidReschedule}>
              Move to 11:00 AM–12:00 PM
            </button>
          ) : null}
          <button type="button" onClick={onInvalidReschedule}>
            Try 1:00–2:00 PM
          </button>
          <small>
            The second option reaches the off-site meeting without its required
            20-minute travel interval.
          </small>
        </div>
      ) : null}
      {canPerform ? (
        <div className="calendar-detail-actions">
          <p>
            This action waits {startsIn} minutes, then attends the full{" "}
            {entry.durationMinutes}-minute briefing:{" "}
            {entry.elapsedIfPerformedMinutes} minutes total elapse, advancing
            the clock to 10:15 AM.
          </p>
          <button type="button" onClick={onPerformBriefing}>
            Wait {startsIn} + attend {entry.durationMinutes} —{" "}
            {entry.elapsedIfPerformedMinutes} minutes total
          </button>
        </div>
      ) : null}
      {entry.state.status === "completed" ? (
        <p className="calendar-result calendar-result--success">
          Completed at {formatMinute(entry.state.end.minuteOfDay)}.
        </p>
      ) : null}
      {feedback ? (
        <p
          className="calendar-result"
          role="status"
          data-testid="calendar-feedback"
        >
          {feedback}
        </p>
      ) : null}
    </aside>
  );
}
