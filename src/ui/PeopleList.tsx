import { personName } from "../simulation";
import type { EntityId, World } from "../simulation";

interface PeopleListProps {
  readonly world: World;
  readonly selectedPersonId: EntityId | null;
  readonly onSelect: (personId: EntityId) => void;
}

export function PeopleList({
  world,
  selectedPersonId,
  onSelect,
}: PeopleListProps) {
  return (
    <section className="panel people-panel" aria-labelledby="people-title">
      <div className="panel-heading">
        <div>
          <p className="section-label">People</p>
          <h2 id="people-title">Persistent residents</h2>
        </div>
        <span className="count-badge">{world.personOrder.length}</span>
      </div>
      <p className="panel-intro">
        Select a person to inspect the same entity across time.
      </p>
      <ul className="people-list" role="list">
        {world.personOrder.map((personId) => {
          const person = world.people[personId];
          if (!person) {
            return null;
          }

          const selected = personId === selectedPersonId;
          return (
            <li key={person.id}>
              <button
                className="person-row"
                type="button"
                aria-current={selected ? "true" : undefined}
                onClick={() => onSelect(person.id)}
              >
                <span className="person-row-topline">
                  <strong>{personName(person)}</strong>
                  <span
                    className={`detail-tag detail-tag-${person.detailLevel}`}
                  >
                    {person.detailLevel}
                  </span>
                </span>
                <code>{person.id}</code>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
