import type {
  ChapterMeetingAction,
  PartyChapterView,
} from "../presentation/party-chapter-surface";
import type { EntityId } from "../simulation";

const ACTION_LABELS: Readonly<Record<ChapterMeetingAction, string>> = {
  accept: "Say you'll come",
  decline: "Decline",
  attend: "Go to the meeting",
};

/**
 * One local party chapter: who organizes it, where it meets, and the player's
 * own invitations from it.
 *
 * Every button here is an explicit choice routed to an existing writer by the
 * caller. Opening this surface, or the pin that leads here, changes nothing:
 * no travel, no acceptance, no membership. Going to a meeting runs the ordinary
 * journey and meeting time on the clock.
 */
export function PartyChapterSurface({
  chapter,
  pinned,
  onTogglePin,
  onOpenPerson,
  onMeeting,
  onJoin,
  onLeave,
}: {
  readonly chapter: PartyChapterView;
  readonly pinned: boolean;
  readonly onTogglePin: () => void;
  readonly onOpenPerson: (personId: EntityId) => void;
  readonly onMeeting: (
    action: ChapterMeetingAction,
    activityId: EntityId,
  ) => void;
  readonly onJoin: () => void;
  readonly onLeave: () => void;
}) {
  return (
    <section
      className="pg-chapter"
      aria-labelledby={`chapter-${chapter.organizationId}`}
      data-testid={`chapter-${chapter.organizationId}`}
    >
      <h2 id={`chapter-${chapter.organizationId}`}>{chapter.name}</h2>
      <p>
        Meets in the {chapter.venueLabel.toLowerCase()}.
        {chapter.member ? " You are a member." : ""}
      </p>
      {chapter.organizer ? (
        <p>
          Organizer:{" "}
          <button
            type="button"
            className="pg-link-button"
            data-testid={`chapter-organizer-${chapter.organizer.personId}`}
            onClick={() => onOpenPerson(chapter.organizer!.personId)}
          >
            {chapter.organizer.name}
          </button>
        </p>
      ) : null}

      {chapter.meetings.length > 0 ? (
        <ul className="pg-chapter-meetings">
          {chapter.meetings.map((meeting) => (
            <li
              key={meeting.activityId}
              data-testid={`chapter-meeting-${meeting.activityId}`}
            >
              <strong>{meeting.title}</strong>
              <span>
                {meeting.when} · {meeting.stateLabel}
              </span>
              {meeting.actions.length > 0 ? (
                <span className="pg-chapter-actions">
                  {meeting.actions.map((action) => (
                    <button
                      key={action}
                      type="button"
                      className={
                        action === "decline"
                          ? "ui-action"
                          : "ui-action ui-action--primary"
                      }
                      data-testid={`chapter-${action}-${meeting.activityId}`}
                      onClick={() => onMeeting(action, meeting.activityId)}
                    >
                      {ACTION_LABELS[action]}
                    </button>
                  ))}
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p>No invitations from this chapter yet.</p>
      )}

      <div className="pg-chapter-actions">
        {chapter.member ? (
          <button
            type="button"
            className="ui-action"
            data-testid={`chapter-leave-${chapter.organizationId}`}
            onClick={onLeave}
          >
            Leave the chapter
          </button>
        ) : chapter.canJoin ? (
          <button
            type="button"
            className="ui-action"
            data-testid={`chapter-join-${chapter.organizationId}`}
            onClick={onJoin}
          >
            Join as a volunteer
          </button>
        ) : null}
        <button
          type="button"
          className="ui-action"
          aria-pressed={pinned}
          data-testid={`chapter-pin-${chapter.organizationId}`}
          onClick={onTogglePin}
        >
          {pinned ? "Unpin" : "Pin"}
        </button>
      </div>
    </section>
  );
}
