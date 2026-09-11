import { useEffect, useMemo, useRef, useState } from "react";

import type { EntityId } from "../simulation";
import type {
  PublicInformationPanelItem,
  PublicInformationPanelModel,
} from "../presentation/public-information-adapters";
import type { CivicGlossaryEntry } from "../presentation/civic-glossary";
import { filterPublishedNewsItems } from "./public-information-search";

export interface PublicInformationPanelProps {
  readonly model: PublicInformationPanelModel;
  readonly onClose: () => void;
  readonly onOpenPerson: (personId: EntityId) => void;
}

/** Feature-local newspaper/digest surface for UI-core registration. */
export function PublicInformationPanel({
  model,
  onClose,
  onOpenPerson,
}: PublicInformationPanelProps) {
  const [activeConcept, setActiveConcept] = useState<CivicGlossaryEntry | null>(
    null,
  );
  const [searchQuery, setSearchQuery] = useState("");
  const panelCloseRef = useRef<HTMLButtonElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const conceptCloseRef = useRef<HTMLButtonElement>(null);
  const conceptTriggerRef = useRef<HTMLButtonElement | null>(null);
  const returnConceptFocusRef = useRef(false);

  const trimmedQuery = searchQuery.trim();
  const filteredItems = useMemo(
    () => filterPublishedNewsItems(model.items, searchQuery),
    [model.items, searchQuery],
  );
  const hasActiveSearch = trimmedQuery.length > 0;

  useEffect(() => {
    panelCloseRef.current?.focus();
  }, []);

  useEffect(() => {
    if (activeConcept) {
      conceptCloseRef.current?.focus();
    } else if (returnConceptFocusRef.current) {
      returnConceptFocusRef.current = false;
      conceptTriggerRef.current?.focus();
    }
  }, [activeConcept]);

  function closeConcept(): void {
    returnConceptFocusRef.current = true;
    setActiveConcept(null);
  }

  function clearSearch(): void {
    setSearchQuery("");
    searchInputRef.current?.focus();
  }

  return (
    <section
      className="public-information-panel civic-glass"
      role="dialog"
      aria-modal="false"
      aria-labelledby="public-information-title"
      data-testid="public-information-panel"
      onKeyDown={(event) => {
        if (event.key !== "Escape") return;
        event.preventDefault();
        event.stopPropagation();
        if (activeConcept) closeConcept();
        else onClose();
      }}
    >
      <header className="public-information-header">
        <div>
          <p className="public-information-kicker">Public record</p>
          <h2 id="public-information-title">{model.digest.outletName}</h2>
          <p>Published through {model.digest.asOf}</p>
        </div>
        <button
          ref={panelCloseRef}
          type="button"
          aria-label="Close public information"
          onClick={onClose}
        >
          <span aria-hidden="true">×</span>
        </button>
      </header>

      {model.items.length === 0 ? (
        <p data-testid="public-information-empty">
          No public-information items have been published in this save.
        </p>
      ) : (
        <>
          <div className="public-information-search">
            <label htmlFor="public-information-search-input">
              Search published news
            </label>
            <div className="public-information-search-controls">
              <input
                ref={searchInputRef}
                id="public-information-search-input"
                type="search"
                value={searchQuery}
                autoComplete="off"
                spellCheck={false}
                data-testid="public-information-search-input"
                onChange={(event) => setSearchQuery(event.currentTarget.value)}
              />
              <button
                type="button"
                className="public-information-search-clear"
                aria-label="Clear search"
                disabled={searchQuery.length === 0}
                data-testid="public-information-search-clear"
                onClick={clearSearch}
              >
                Clear search
              </button>
            </div>
            <p
              className="public-information-search-count"
              data-testid="public-information-search-count"
              aria-live="polite"
            >
              {hasActiveSearch
                ? filteredItems.length === 0
                  ? `No stories match "${trimmedQuery}".`
                  : `Showing ${filteredItems.length} of ${model.items.length} published stories.`
                : `${model.items.length} published ${
                    model.items.length === 1 ? "story" : "stories"
                  }.`}
            </p>
          </div>

          {hasActiveSearch && filteredItems.length === 0 ? (
            <p data-testid="public-information-no-match">
              No stories match your search.
            </p>
          ) : (
            <ol className="public-information-editions">
              {filteredItems.map((item) => (
                <li key={item.publicationId}>
                  <PublicInformationArticle
                    item={item}
                    onOpenConcept={(entry, trigger) => {
                      conceptTriggerRef.current = trigger;
                      setActiveConcept(entry);
                    }}
                    onOpenPerson={onOpenPerson}
                  />
                </li>
              ))}
            </ol>
          )}
        </>
      )}

      {activeConcept ? (
        <aside
          className="public-information-help"
          role="dialog"
          aria-modal="false"
          aria-labelledby="public-information-help-title"
          data-testid="public-information-help"
        >
          <header>
            <h3 id="public-information-help-title">{activeConcept.label}</h3>
            <button
              ref={conceptCloseRef}
              type="button"
              aria-label={`Close ${activeConcept.label} explanation`}
              onClick={closeConcept}
            >
              <span aria-hidden="true">×</span>
            </button>
          </header>
          <p>{activeConcept.fullDefinition}</p>
          <small>{activeConcept.sourceLabel}</small>
          <p className="public-information-help-note">
            Reading this explanation does not move time or change the saved
            world.
          </p>
        </aside>
      ) : null}
    </section>
  );
}

function PublicInformationArticle({
  item,
  onOpenConcept,
  onOpenPerson,
}: {
  readonly item: PublicInformationPanelItem;
  readonly onOpenConcept: (
    entry: CivicGlossaryEntry,
    trigger: HTMLButtonElement,
  ) => void;
  readonly onOpenPerson: (personId: EntityId) => void;
}) {
  return (
    <article
      className="public-information-article"
      data-publication-id={item.publicationId}
      data-source-event-id={item.sourceEventId}
      data-publication-kind={item.kind}
    >
      <header>
        <p>
          Event {item.eventTime} · Published {item.publicationTime}
          {item.jurisdictionName ? ` · ${item.jurisdictionName}` : ""}
        </p>
        <h3>{item.headline}</h3>
      </header>
      <p>{item.body}</p>

      {item.civicReferences.length > 0 ? (
        <div
          className="public-information-references"
          aria-label="Civic explanations"
        >
          {item.civicReferences.map((entry) => (
            <button
              key={entry.conceptId}
              type="button"
              aria-haspopup="dialog"
              aria-label={`Explain ${entry.label}`}
              onClick={(event) => onOpenConcept(entry, event.currentTarget)}
            >
              {entry.label}
              <span aria-hidden="true"> · i</span>
            </button>
          ))}
        </div>
      ) : null}

      {item.people.length > 0 ? (
        <div
          className="public-information-people"
          aria-label="People in this event"
        >
          <span>People:</span>
          {item.people.map((reference) => (
            <button
              key={reference.personId}
              type="button"
              data-person-id={reference.personId}
              onClick={() => onOpenPerson(reference.personId)}
            >
              {reference.label}
            </button>
          ))}
        </div>
      ) : null}

      {item.corrections.length > 0 ? (
        <details className="public-information-corrections">
          <summary>
            {item.corrections.length} correction
            {item.corrections.length === 1 ? "" : "s"}
          </summary>
          <ol>
            {item.corrections.map((correction) => (
              <li key={correction.publicationId}>
                <p>
                  <strong>{correction.publishedAt}</strong> — {correction.note}
                </p>
                <p>{correction.body}</p>
              </li>
            ))}
          </ol>
        </details>
      ) : null}
    </article>
  );
}
