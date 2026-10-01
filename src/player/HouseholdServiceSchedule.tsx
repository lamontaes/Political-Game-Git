import { householdChildServiceSchedule } from "../simulation/public-service-schedule";
import { personName } from "../simulation/people";
import type { EntityId, World } from "../simulation/types";
import { proseDate } from "../presentation/prose-dates";
import { formatMinute } from "../presentation/player-calendar";

/** Reads the existing parent's household schedule; opening it writes nothing. */
export function HouseholdServiceSchedule({
  world,
  parentId,
}: {
  readonly world: World;
  readonly parentId: EntityId;
}) {
  const sessions = householdChildServiceSchedule(world, parentId);
  if (sessions.length === 0) return null;
  return (
    <section
      className="pg-personal-section"
      aria-label="Children's service schedule"
    >
      <h3>Children's service schedule</h3>
      <ul>
        {sessions.map((session) => {
          const child = world.people[session.childPersonId];
          if (!child) return null;
          return (
            <li
              key={session.activityId}
              data-service-activity={session.activityId}
            >
              <p>
                {personName(child)} · {session.title}
              </p>
              <p>
                {proseDate(session.start.date)} ·{" "}
                {formatMinute(session.start.minuteOfDay)}
                {" to "}
                {session.end.date !== session.start.date
                  ? `${proseDate(session.end.date)} · `
                  : ""}
                {formatMinute(session.end.minuteOfDay)}
              </p>
              <p>
                {session.activityStatus === "completed"
                  ? "Session completed."
                  : session.activityStatus === "cancelled"
                    ? "Session canceled."
                    : "Session scheduled."}
                {session.attendanceStatus === "scheduled"
                  ? ` Attendance check is due ${proseDate(session.attendanceDueAt)}.`
                  : session.attendanceStatus === "resolved"
                    ? " Attendance check finished."
                    : " Attendance check is not scheduled."}
              </p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
