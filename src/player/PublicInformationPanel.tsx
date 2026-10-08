import { useEffect, useMemo, useRef, useState } from "react";

import { proseDate } from "../presentation/prose-dates";
import type { EntityId } from "../simulation";
import type {
  PublicInformationPanelItem,
  PublicInformationPanelModel,
} from "../presentation/public-information-adapters";
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
  /** False inside a workspace frame, which already carries Back and Close. */
  readonly showClose?: boolean;
  readonly onOpenPerson: (personId: EntityId) => void;
  readonly viewerPersonId: EntityId | null;
  readonly followedOutletKeys: readonly string[];
  readonly onToggleOutletFollow: (outletKey: string) => void;
}

/** Feature-local newspaper/digest surface for UI-core registration. */
export function PublicInformationPanel({
  model,
  onClose,
  showClose = true,
  onOpenPerson,
  viewerPersonId,
  followedOutletKeys,
  onToggleOutletFollow,
}: PublicInformationPanelProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [view, setView] = useState<PublicInformationView>({ kind: "for-you" });
  const panelCloseRef = useRef<HTMLButtonElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

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
        onClose();
      }}
    >
      <header className="public-information-header">
        <div>
          <p className="public-information-kicker">Public record</p>
          <h2 id="public-information-title">{model.digest.outletName}</h2>
          <p>
            <time dateTime={model.digest.asOf}>
              {proseDate(model.digest.asOf)}
            </time>
          </p>
        </div>
        {showClose ? (
          <button
            ref={panelCloseRef}
            type="button"
            aria-label="Close public information"
            onClick={onClose}
          >
            <span aria-hidden="true">×</span>
          </button>
        ) : null}
      </header>

      {model.items.length === 0 ? (
        <p
          data-testid="public-information-empty"
          data-problem="nothing-published"
        />
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
                <h3 id="public-information-outlet-title">
                  {selectedOutlet.outletName}
                </h3>
                <span>{selectedOutlet.storyCount}</span>
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
                data-problem="no-match"
              >
                {trimmedQuery}
              </p>
            ) : (
              <p
                className="public-information-search-count"
                data-testid="public-information-search-count"
                aria-live="polite"
              >
                {hasActiveSearch
                  ? `${filteredItems.length} / ${viewItems.length}`
                  : viewItems.length}
              </p>
            )}
          </div>

          {!hasActiveSearch &&
          view.kind === "for-you" &&
          viewItems.length === 0 ? (
            <p
              className="public-information-no-match"
              data-testid="public-information-for-you-empty"
              data-problem="no-linked-stories"
            />
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
                    onOpenPerson={onOpenPerson}
                  />
                </li>
              ))}
            </ol>
          )}
        </>
      )}
    </section>
  );
}

function PublicInformationArticle({
  item,
  relevance,
  onOpenPerson,
}: {
  readonly item: PublicInformationPanelItem;
  readonly relevance: readonly string[];
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
        <h3 data-testid="news-kind">{item.kind.replace(/-/g, " ")}</h3>
      </header>
      <dl className="public-information-record">
        <dt>Event</dt>
        <dd>
          <time dateTime={item.eventTime}>{proseDate(item.eventTime)}</time>
        </dd>
        <dt>Published</dt>
        <dd>
          <time dateTime={item.publicationTime}>
            {proseDate(item.publicationTime)}
          </time>
        </dd>
        <dt>Outlet</dt>
        <dd>{item.outletName}</dd>
        {item.jurisdictionName ? (
          <>
            <dt>Place</dt>
            <dd>{item.jurisdictionName}</dd>
          </>
        ) : null}
      </dl>
      {relevance.length > 0 ? (
        <span
          hidden
          data-testid="news-relevance"
          data-reason={relevance.join(",")}
        />
      ) : null}

      {item.people.length > 0 ? (
        <div
          className="public-information-people"
          aria-label="People in this event"
        >
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
          <summary>{item.corrections.length}</summary>
          <ol>
            {item.corrections.map((correction) => (
              <li key={correction.publicationId}>
                <time dateTime={correction.publishedAt}>
                  {correction.publishedAt}
                </time>
              </li>
            ))}
          </ol>
        </details>
      ) : null}
    </article>
  );
}
