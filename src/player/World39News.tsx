import type { EntityId, IsoDate, World } from "../simulation";
import { lawEffectsHere } from "../presentation/law-effects-here";
import {
  institutionRestatesTitle,
  projectWorld39News,
  type World39Notice,
  type World39StandingItem,
} from "../presentation/world39-news";
import { readPressPublication } from "../simulation/press/read-publication";
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
  onWorldChange,
}: {
  readonly world: World;
  readonly personId: EntityId;
  readonly onOpenPerson: (id: EntityId) => void;
  readonly onWorldChange?: (world: World) => void;
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
        <time dateTime={model.asOf}>{world39Date(model.asOf)}</time>
      </header>
      <World39Standing
        officeholders={model.officeholders}
        standing={model.standing}
        onOpenPerson={onOpenPerson}
      />
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
            </article>
          ))}
        </section>
      ) : null}
      <PublicNotices notices={model.notices} />
      <section aria-label="Recent public events">
        <h4>Lately</h4>
        {model.publicEvents.length === 0 ? (
          <p data-testid="world39-no-events" data-problem="no-public-events" />
        ) : (
          model.publicEvents.map((event) => (
            <article
              key={event.id}
              id={`world39-event-${event.id}`}
              data-event-id={event.id}
              data-known-to-you={event.known ? "true" : "false"}
            >
              <p
                className="world39-meta"
                data-known={event.known ? "true" : undefined}
              >
                <time dateTime={event.at}>{world39Date(event.at)}</time>
                {event.jurisdiction ? ` · ${event.jurisdiction}` : ""}
              </p>
              {event.organizations.length > 0 ? (
                <p data-testid="world39-event-organizations">
                  {event.organizations.join(" · ")}
                </p>
              ) : null}
              {event.people.map((person) => (
                <button
                  type="button"
                  key={person.personId}
                  data-testid="world39-event-person"
                  onClick={() => onOpenPerson(person.personId)}
                >
                  {person.name}
                </button>
              ))}
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
              {onWorldChange &&
              world.history.publications?.some(
                (publication) =>
                  publication.id === item.publicationId &&
                  publication.kind === "press-story",
              ) ? (
                <button
                  type="button"
                  data-testid="world39-read-publication"
                  onClick={() => {
                    const next = readPressPublication(
                      world,
                      personId,
                      item.publicationId,
                    );
                    if (next !== world) onWorldChange(next);
                  }}
                >
                  Read this story
                </button>
              ) : null}
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
                  <p data-known="true" />
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
        <p
          data-testid="world39-no-reporting"
          data-problem="nothing-published"
        />
      )}
    </section>
  );
}

/** The notices a place has posted, as the English engine wrote them. */
export function PublicNotices({
  notices,
}: {
  readonly notices: readonly World39Notice[];
}) {
  if (notices.length === 0) return null;
  return (
    <section data-testid="world39-notices">
      {notices.map((notice) => (
        <article key={notice.key} data-notice={notice.key}>
          <p className="world39-notice">{notice.text}</p>
        </article>
      ))}
    </section>
  );
}

/**
 * Who holds office and what governs and serves the place, as record values
 * (menu reset: no sentences): each office's title over its holder, with the
 * employer only where it says more than the title, and the date the term
 * began only where the record has one.
 */
export function World39Standing({
  officeholders,
  standing,
  onOpenPerson,
}: {
  readonly officeholders: readonly {
    readonly termId: EntityId;
    readonly title: string;
    readonly personId: EntityId;
    readonly personName: string;
    readonly institution: string | null;
    readonly startedAt: IsoDate | null;
  }[];
  readonly standing: readonly World39StandingItem[];
  readonly onOpenPerson: (id: EntityId) => void;
}) {
  if (officeholders.length === 0 && standing.length === 0) return null;
  return (
    <section data-testid="world39-standing">
      {officeholders.map((holder) => (
        <article key={holder.termId} data-standing-kind="office">
          <h5>{holder.title}</h5>
          <p>
            <button
              type="button"
              className="ui-action"
              onClick={() => onOpenPerson(holder.personId)}
            >
              {holder.personName}
            </button>
            {holder.institution &&
            !institutionRestatesTitle(holder.title, holder.institution)
              ? ` · ${holder.institution}`
              : ""}
          </p>
          {holder.startedAt ? (
            <p>
              In office since{" "}
              <time dateTime={holder.startedAt}>
                {world39Date(holder.startedAt)}
              </time>
            </p>
          ) : null}
        </article>
      ))}
      {standing.map((item) => (
        <article key={item.key} data-standing-kind={item.kind}>
          <h5>{item.name}</h5>
          {item.bodyName ? <p>{item.bodyName}</p> : null}
          {item.formTerm ? <p>{item.formTerm}</p> : null}
        </article>
      ))}
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
