import { useEffect, useMemo, useRef, useState } from "react";

import type { EntityId } from "../simulation";
import type {
  PublicInformationPanelItem,
  PublicInformationPanelModel,
} from "../presentation/public-information-adapters";
import type { CivicGlossaryEntry } from "../presentation/civic-glossary";
import { filterPublishedNewsItems } from "./public-information-search";
import {
  itemsForPublicInformationView,
  relevanceReasons,
  type PublicInformationView,
} from "./public-information-views";
import "./public-information-panel.css";

export interface PublicInformationPanelProps {
  readonly model: PublicInformationPanelModel;
  readonly onClose: () => void;
  readonly onOpenPerson: (personId: EntityId) => void;
  readonly viewerPersonId: EntityId | null;
  readonly followedOutletKeys: readonly string[];
  readonly onToggleOutletFollow: (outletKey: string) => void;
}

/** Feature-local newspaper/digest surface for UI-core registration. */
export function PublicInformationPanel({
  model,
  onClose,
  onOpenPerson,
  viewerPersonId,
  followedOutletKeys,
  onToggleOutletFollow,
}: PublicInformationPanelProps) {
  const [activeConcept, setActiveConcept] = useState<CivicGlossaryEntry | null>(
    null,
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [view, setView] = useState<PublicInformationView>({ kind: "for-you" });
  const panelCloseRef = useRef<HTMLButtonElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const conceptCloseRef = useRef<HTMLButtonElement>(null);
  const conceptTriggerRef = useRef<HTMLButtonElement | null>(null);
  const returnConceptFocusRef = useRef(false);

  const trimmedQuery = searchQuery.trim();
  const viewItems = useMemo(
    () =>
      itemsForPublicInformationView(
        model.items,
        view,
        viewerPersonId,
        followedOutletKeys,
      ),
    [model.items, view, viewerPersonId, followedOutletKeys],
  );
  const filteredItems = useMemo(
    () => filterPublishedNewsItems(viewItems, searchQuery),
    [viewItems, searchQuery],
  );
  const hasActiveSearch = trimmedQuery.length > 0;
  const selectedOutlet =
    view.kind === "outlet"
      ? (model.outlets.find((outlet) => outlet.outletKey === view.outletKey) ??
        null)
      : null;

  useEffect(() => {
    if (view.kind !== "outlet") return;
    if (model.outlets.some((outlet) => outlet.outletKey === view.outletKey)) {
      return;
    }
    setView({ kind: "all" });
  }, [model.outlets, view]);

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
          <nav className="public-information-views" aria-label="News views">
            <button
              type="button"
              aria-pressed={view.kind === "for-you"}
              data-testid="news-view-for-you"
              onClick={() => setView({ kind: "for-you" })}
            >
              For You
            </button>
            <button
              type="button"
              aria-pressed={view.kind === "all"}
              data-testid="news-view-all"
              onClick={() => setView({ kind: "all" })}
            >
              All
            </button>
            {model.outlets.map((outlet) => (
              <button
                key={outlet.outletKey}
                type="button"
                aria-pressed={
                  view.kind === "outlet" && view.outletKey === outlet.outletKey
                }
                data-testid={`news-view-outlet-${outlet.outletKey}`}
                onClick={() =>
                  setView({ kind: "outlet", outletKey: outlet.outletKey })
                }
              >
                {outlet.outletName}
              </button>
            ))}
          </nav>

          {selectedOutlet ? (
            <section
              className="public-information-masthead"
              aria-labelledby="public-information-outlet-title"
              data-testid="public-information-outlet-view"
            >
              <div>
                <p>Outlet</p>
                <h3 id="public-information-outlet-title">
                  {selectedOutlet.outletName}
                </h3>
                <span>
                  {selectedOutlet.storyCount} published{" "}
                  {selectedOutlet.storyCount === 1 ? "story" : "stories"}
                </span>
              </div>
              <button
                type="button"
                aria-pressed={followedOutletKeys.includes(
                  selectedOutlet.outletKey,
                )}
                data-testid="news-outlet-follow"
                onClick={() => onToggleOutletFollow(selectedOutlet.outletKey)}
              >
                {followedOutletKeys.includes(selectedOutlet.outletKey)
                  ? "Unfollow"
                  : "Follow"}
              </button>
            </section>
          ) : null}

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
            {hasActiveSearch && filteredItems.length === 0 ? (
              <p
                className="public-information-no-match"
                data-testid="public-information-no-match"
                aria-live="polite"
              >
                No stories match &ldquo;{trimmedQuery}&rdquo;.
              </p>
            ) : (
              <p
                className="public-information-search-count"
                data-testid="public-information-search-count"
                aria-live="polite"
              >
                {hasActiveSearch
                  ? `Showing ${filteredItems.length} of ${viewItems.length} published stories.`
                  : `${viewItems.length} published ${
                      viewItems.length === 1 ? "story" : "stories"
                    }.`}
              </p>
            )}
          </div>

          {!hasActiveSearch &&
          view.kind === "for-you" &&
          viewItems.length === 0 ? (
            <p
              className="public-information-no-match"
              data-testid="public-information-for-you-empty"
            >
              No published stories are linked directly to you yet. Following an
              outlet adds its published stories here; All always keeps the full
              public record available.
            </p>
          ) : hasActiveSearch && filteredItems.length === 0 ? null : (
            <ol className="public-information-editions">
              {filteredItems.map((item) => (
                <li key={item.publicationId}>
                  <PublicInformationArticle
                    item={item}
                    relevance={
                      view.kind === "for-you"
                        ? relevanceReasons(
                            item,
                            viewerPersonId,
                            followedOutletKeys,
                          )
                        : []
                    }
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
  relevance,
  onOpenConcept,
  onOpenPerson,
}: {
  readonly item: PublicInformationPanelItem;
  readonly relevance: readonly string[];
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

      {relevance.length > 0 ? (
        <p
          className="public-information-relevance"
          data-testid="news-relevance"
        >
          {relevance.join(" ")}
        </p>
      ) : null}

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
