import { proseDate } from "../presentation/prose-dates";
import type { EntityId } from "../simulation/types";

/** One heard view: who holds it, who it is about, which way, and when. */
export interface HeardViewRow {
  readonly knowledgeId: EntityId;
  readonly holderId: EntityId;
  readonly holderName: string;
  readonly officialId?: EntityId;
  readonly officialName?: string;
  readonly position: string;
  readonly learnedAt: string;
}

/**
 * Only the listener's saved statements; no private belief or aggregate.
 * `shows` picks which person a row names and opens: the holder of the view
 * (views about somebody) or the official it is about (views somebody holds).
 */
export function HeardOfficialViewsList({
  views,
  onSelectPerson,
  shows = "holder",
  testid = "people-heard-views",
}: {
  readonly views: readonly HeardViewRow[];
  readonly onSelectPerson: (personId: EntityId) => void;
  readonly shows?: "holder" | "official";
  readonly testid?: string;
}) {
  if (!views.length) return null;
  return (
    <ul className="pg-people-list" data-testid={testid}>
      {views.map((view) => {
        const personId =
          shows === "official"
            ? (view.officialId ?? view.holderId)
            : view.holderId;
        const name =
          shows === "official"
            ? (view.officialName ?? view.holderName)
            : view.holderName;
        return (
          <li key={view.knowledgeId}>
            <button
              type="button"
              className="pg-person-row"
              onClick={() => onSelectPerson(personId)}
            >
              <strong>{name}</strong>
              <small>{view.position}</small>
              <time dateTime={view.learnedAt}>{proseDate(view.learnedAt)}</time>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
