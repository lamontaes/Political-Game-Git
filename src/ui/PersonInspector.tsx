import {
  factsForPerson,
  memoriesForPerson,
  personName,
  relationshipHistory,
  resolveEntityLabel,
  selectPersonHistory,
} from "../simulation";
import type { HistoricalEvent, Person, World } from "../simulation";
import { MindProfile } from "./MindProfile";
import { PoliticalProfile } from "./PoliticalProfile";

interface PersonInspectorProps {
  readonly world: World;
  readonly person: Person | undefined;
  readonly onMaterialize: () => void;
}

function newestFirst(
  events: readonly HistoricalEvent[],
): readonly HistoricalEvent[] {
  return [...events].sort(
    (left, right) =>
      right.occurredAt.localeCompare(left.occurredAt) ||
      right.sequence - left.sequence,
  );
}

export function PersonInspector({
  world,
  person,
  onMaterialize,
}: PersonInspectorProps) {
  if (!person) {
    return (
      <section className="panel inspector-panel" aria-labelledby="person-title">
        <p className="section-label">Person inspector</p>
        <h2 id="person-title">No person selected</h2>
        <p className="empty-copy">Select a person to inspect their record.</p>
      </section>
    );
  }

  const personHistory = newestFirst(selectPersonHistory(world, person.id));
  const biographyFacts = factsForPerson(person);
  const memories = memoriesForPerson(world, person.id);
  const relationships = relationshipHistory(world, person.id);
  const timeline = [
    ...biographyFacts.map((fact) => ({
      id: fact.id,
      occurredAt: fact.occurredAt,
      label: `Biography · ${fact.kind}`,
      summary: fact.summary,
    })),
    ...personHistory.map((event) => ({
      id: event.id,
      occurredAt: event.occurredAt,
      label: `Event · ${event.type}`,
      summary: event.summary,
    })),
  ].sort(
    (left, right) =>
      right.occurredAt.localeCompare(left.occurredAt) ||
      right.id.localeCompare(left.id),
  );
  const jurisdiction = world.jurisdictions[person.homeJurisdictionId];

  return (
    <section className="panel inspector-panel" aria-labelledby="person-title">
      <div className="panel-heading inspector-heading">
        <div>
          <p className="section-label">Person inspector</p>
          <h2 id="person-title">{personName(person)}</h2>
        </div>
        <span className={`detail-tag detail-tag-${person.detailLevel}`}>
          {person.detailLevel}
        </span>
      </div>

      <dl className="identity-grid">
        <div>
          <dt>Stable person ID</dt>
          <dd>
            <code>{person.id}</code>
          </dd>
        </div>
        <div>
          <dt>Birth date</dt>
          <dd>
            <time dateTime={person.birthDate}>{person.birthDate}</time>
          </dd>
        </div>
        <div>
          <dt>Home jurisdiction</dt>
          <dd>{jurisdiction?.name ?? person.homeJurisdictionId}</dd>
        </div>
      </dl>

      <section
        className="inspector-section"
        aria-labelledby="established-facts-title"
      >
        <div className="subheading-row">
          <h3 id="established-facts-title">Established facts</h3>
          <span>{person.establishedFacts.length}</span>
        </div>
        <ul className="fact-list" role="list">
          {person.establishedFacts.map((fact) => (
            <li key={fact.id}>
              <time dateTime={fact.occurredAt}>{fact.occurredAt}</time>
              <p>
                <strong>{fact.kind}</strong> · {fact.summary}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <MindProfile world={world} person={person} />

      <PoliticalProfile world={world} person={person} />

      <section
        className="inspector-section"
        aria-labelledby="generated-details-title"
      >
        <div className="subheading-row">
          <h3 id="generated-details-title">Generated details</h3>
          <span>{person.details ? "stored" : "not generated"}</span>
        </div>
        {person.details ? (
          <div className="generated-details">
            {person.details.generatedFacts.length === 0 ? (
              <p className="empty-copy">No background facts were generated.</p>
            ) : (
              <ul className="fact-list compact-facts" role="list">
                {person.details.generatedFacts.map((fact) => (
                  <li key={fact.id}>
                    <time dateTime={fact.occurredAt}>{fact.occurredAt}</time>
                    <p>{fact.summary}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <div className="materialize-callout">
            <p>
              This person currently holds only lightweight facts. Expansion is
              keyed to the world seed and person ID, so opening order cannot
              reroll biography.
            </p>
            <button type="button" onClick={onMaterialize}>
              Materialize deterministic detail
            </button>
          </div>
        )}
      </section>

      <section
        className="inspector-section"
        aria-labelledby="person-timeline-title"
      >
        <div className="subheading-row">
          <h3 id="person-timeline-title">Person timeline</h3>
          <span>{timeline.length}</span>
        </div>
        {timeline.length === 0 ? (
          <p className="empty-copy">No biography or event records.</p>
        ) : (
          <ol className="mini-history" role="list">
            {timeline.map((item) => (
              <li key={item.id}>
                <time dateTime={item.occurredAt}>{item.occurredAt}</time>
                <p>{item.summary}</p>
                <span>{item.label}</span>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="inspector-section" aria-labelledby="memory-title">
        <div className="subheading-row">
          <h3 id="memory-title">Memories</h3>
          <span>{memories.length}</span>
        </div>
        {memories.length === 0 ? (
          <p className="empty-copy">No subjective memories recorded.</p>
        ) : (
          <ol className="mini-history" role="list">
            {memories.map((memory) => (
              <li key={memory.id}>
                <time dateTime={memory.formedAt}>{memory.formedAt}</time>
                <p>{memory.rememberedSummary}</p>
                <span>
                  {memory.strength} · {memory.interpretation}
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section
        className="inspector-section"
        aria-labelledby="relationship-history-title"
      >
        <div className="subheading-row">
          <h3 id="relationship-history-title">Relationship history</h3>
          <span>{relationships.length}</span>
        </div>
        {relationships.length === 0 ? (
          <p className="empty-copy">No relationship interactions recorded.</p>
        ) : (
          <ol className="mini-history" role="list">
            {relationships.map((interaction) => (
              <li key={interaction.id}>
                <time dateTime={interaction.occurredAt}>
                  {interaction.occurredAt}
                </time>
                <p>{interaction.summary}</p>
                <span>
                  {interaction.kind} · {interaction.change} ·{" "}
                  {interaction.personIds
                    .map((id) => resolveEntityLabel(world, id))
                    .join(" / ")}
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </section>
  );
}
