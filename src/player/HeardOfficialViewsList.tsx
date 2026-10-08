import type { PeopleDirectory } from "../presentation/people-directory";
import { proseDate } from "../presentation/prose-dates";
import type { EntityId } from "../simulation/types";

/** Only the listener's saved statements; no private belief or aggregate. */
export function HeardOfficialViewsList({
  views,
  onSelectPerson,
}: {
  readonly views: PeopleDirectory["heardViews"];
  readonly onSelectPerson: (personId: EntityId) => void;
}) {
  if (!views.length) return null;
  return (
    <ul className="pg-people-list" data-testid="people-heard-views">
      {views.map((view) => (
        <li key={view.knowledgeId}>
          <button
            type="button"
            className="pg-person-row"
            onClick={() => onSelectPerson(view.holderId)}
          >
            <strong>{view.holderName}</strong>
            <small>{view.statement ?? view.position}</small>
            <time dateTime={view.learnedAt}>{proseDate(view.learnedAt)}</time>
          </button>
        </li>
      ))}
    </ul>
  );
}
