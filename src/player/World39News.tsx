import type { EntityId, World } from "../simulation";
import { lawEffectsHere } from "../presentation/law-effects-here";
import { projectWorld39News } from "../presentation/world39-news";
import "./world39-readers.css";

const LEVEL_LABEL = {
  federal: "National law",
  state: "State law",
  territory: "Territorial law",
  local: "Local law",
} as const;

/** Mount before the existing PressWorkspace and publication search/follow reader. */
export function World39News({
  world,
  personId,
  onOpenPerson,
}: {
  readonly world: World;
  readonly personId: EntityId;
  readonly onOpenPerson: (id: EntityId) => void;
}) {
  const model = projectWorld39News(world, personId);
  const homeJurisdictionId = world.people[personId]?.homeJurisdictionId ?? null;
  const lawEffects = homeJurisdictionId
    ? lawEffectsHere(world, homeJurisdictionId).slice(0, 6)
    : [];
  return (
    <section
      className="world39-reader"
      aria-label="World overview"
      data-testid="world39-news"
    >
      <header>
        <h3>{model.placeName ? `Around ${model.placeName}` : "Around here"}</h3>
        <p>
          As of <time dateTime={model.asOf}>{world39Date(model.asOf)}</time>
        </p>
      </header>
      {model.standing.length > 0 ? (
        <section
          aria-label="Public institutions"
          data-testid="world39-standing"
        >
          {model.standing.map((item) => (
            <article
              key={item.key}
              data-standing-kind={item.kind}
              data-record-id={item.recordId}
            >
              <h5>{item.headline}</h5>
              <p>{item.sentence}</p>
            </article>
          ))}
        </section>
      ) : null}
      {model.laws.length > 0 ? (
        <section aria-label="Laws that reach you" data-testid="world39-laws">
          <h4>Laws that reach you</h4>
          {model.laws.map((law) => (
            <article
              key={law.measureId}
              data-measure-id={law.measureId}
              data-level={law.level}
              data-acts-in-world={law.actsInWorld ? "true" : "false"}
            >
              <h5>{law.title}</h5>
              <p className="world39-meta">
                {law.designation} · {LEVEL_LABEL[law.level]} · Enacted{" "}
                <time dateTime={law.enactedOn}>
                  {world39Date(law.enactedOn)}
                </time>
              </p>
              {law.sentences.map((sentence) => (
                <p key={sentence}>{sentence}</p>
              ))}
            </article>
          ))}
        </section>
      ) : null}
      {lawEffects.length > 0 ? (
        <section
          aria-label="What the laws changed"
          data-testid="world39-law-effects"
        >
          <h4>What the laws changed</h4>
          {lawEffects.map((effect) => (
            <article
              key={effect.key}
              data-measure={effect.measure}
              data-direction={effect.direction}
            >
              <h5>{effect.headline}</h5>
              <p>{effect.sentence}</p>
            </article>
          ))}
        </section>
      ) : null}
      <section aria-label="Recent public events">
        <h4>Lately</h4>
        {model.publicEvents.length === 0 ? (
          <p data-testid="world39-no-events">
            Nothing has happened in public here lately.
          </p>
        ) : (
          model.publicEvents.map((event) => (
            <article
              key={event.id}
              id={`world39-event-${event.id}`}
              data-event-id={event.id}
              data-known-to-you={event.known ? "true" : "false"}
            >
              <p className="world39-meta">
                <time dateTime={event.at}>{world39Date(event.at)}</time>
                {event.jurisdiction ? ` · ${event.jurisdiction}` : ""}
                {event.known ? " · You already know about this." : ""}
              </p>
              <p>{event.summary}</p>
            </article>
          ))
        )}
      </section>
      {model.publications.items.length > 0 ? (
        <section aria-label="Latest reporting">
          <h4>Latest reporting</h4>
          {model.publications.items.slice(0, 4).map((item) => (
            <article
              key={item.publicationId}
              data-publication-id={item.publicationId}
              data-source-event-id={item.sourceEventId}
            >
              <h5>{item.readerHeadline}</h5>
              <p className="world39-meta">
                {item.outletName} · Published{" "}
                <time dateTime={item.publicationTime}>
                  {world39Date(item.publicationTime)}
                </time>
              </p>
              {item.body !== item.readerHeadline ? <p>{item.body}</p> : null}
              <details id={`world39-publication-${item.publicationId}`}>
                <summary>Publication details</summary>
                <p>
                  Event date:{" "}
                  <time dateTime={item.eventTime}>
                    {world39Date(item.eventTime)}
                  </time>
                  {item.jurisdictionName ? ` · ${item.jurisdictionName}` : ""}
                </p>
                {model.learnedEventIds.has(item.sourceEventId) ? (
                  <p>You already know about this event.</p>
                ) : null}
                {item.people.map((person) => (
                  <button
                    type="button"
                    key={person.personId}
                    onClick={() => onOpenPerson(person.personId)}
                  >
                    {person.label}
                  </button>
                ))}
                {item.corrections.map((correction) => (
                  <p key={correction.publicationId}>
                    Correction, {world39Date(correction.publishedAt)}:{" "}
                    {correction.note}
                  </p>
                ))}
              </details>
            </article>
          ))}
        </section>
      ) : (
        <p data-testid="world39-no-reporting">
          No stories have been published here yet.
        </p>
      )}
    </section>
  );
}

/** UTC date-only formatting never moves the saved date across a time zone. */
export function world39Date(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T12:00:00Z`));
}
