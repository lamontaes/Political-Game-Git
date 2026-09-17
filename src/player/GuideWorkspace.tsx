import { useEffect, useMemo, useRef, useState } from "react";

import {
  GUIDE_TERMS,
  relatedGuideTerms,
  searchGuideTerms,
} from "../presentation/guide-terms";

import "./guide.css";

/**
 * The Guide: every term the game says, in one place you can search.
 *
 * It is a reading surface and nothing else. Opening an entry, searching it, or
 * marking a term learned changes no record in the world, commits no command
 * the entry describes, and costs no time. The catalog it reads is the same one
 * the inline help beside a word reads, so the two can never drift.
 *
 * An entry explains a term. Where a practice differs between the jurisdictions
 * this game supports, the entry says which record decides instead of stating a
 * rule that would be false somewhere — that note is part of the entry, not a
 * caveat this screen adds.
 */

export interface GuideWorkspaceProps {
  readonly learnedKeys: readonly string[];
  readonly onSetLearned: (semanticKey: string, learned: boolean) => void;
  /** A term to open on, from inline help elsewhere. Null opens the list. */
  readonly openKey?: string | null;
}

export function GuideWorkspace({
  learnedKeys,
  onSetLearned,
  openKey = null,
}: GuideWorkspaceProps) {
  const [query, setQuery] = useState("");
  const [selectedKey, setSelectedKey] = useState<string | null>(openKey);
  const detailRef = useRef<HTMLElement>(null);
  const cameFromLink = useRef(false);

  const results = useMemo(() => searchGuideTerms(query), [query]);
  const selected = useMemo(
    () =>
      GUIDE_TERMS.find((entry) => entry.semanticKey === selectedKey) ?? null,
    [selectedKey],
  );

  /*
   * Following a related term moves the reader to the entry they asked for.
   * Choosing one from the result list does not: the keyboard stays in the list
   * so the next arrow keeps browsing.
   */
  useEffect(() => {
    if (!selected || !cameFromLink.current) return;
    cameFromLink.current = false;
    detailRef.current?.focus();
  }, [selected]);

  function openEntry(semanticKey: string, fromLink: boolean): void {
    cameFromLink.current = fromLink;
    setSelectedKey(semanticKey);
  }

  return (
    <div className="pg-guide" data-testid="guide-workspace">
      <p className="game-note">
        What the words on the other screens mean. Reading an entry does nothing
        in the world.
      </p>

      <label className="pg-field">
        <span>Find a term</span>
        <input
          type="search"
          value={query}
          data-testid="guide-search"
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>

      <div className="pg-guide-body">
        <section className="pg-guide-results" aria-label="Terms">
          {results.length === 0 ? (
            <p className="game-note" data-testid="guide-no-results">
              No term in the Guide matches that.
            </p>
          ) : (
            <ul data-testid="guide-results">
              {results.map(({ entry, matched }) => {
                const learned = learnedKeys.includes(entry.semanticKey);
                return (
                  <li key={entry.semanticKey}>
                    <button
                      type="button"
                      className="pg-guide-result"
                      aria-pressed={selectedKey === entry.semanticKey}
                      data-testid={`guide-result-${entry.semanticKey}`}
                      onClick={(event) => {
                        if (event.shiftKey) {
                          onSetLearned(entry.semanticKey, !learned);
                          return;
                        }
                        openEntry(entry.semanticKey, false);
                      }}
                    >
                      <span className="pg-guide-result-term">{entry.term}</span>
                      <span className="pg-guide-result-line">
                        {entry.shortDefinition}
                      </span>
                      {learned ? (
                        <span className="pg-guide-result-learned">Learned</span>
                      ) : null}
                      {matched === "definition" ? (
                        <span className="sr-only">
                          {" "}
                          Matched in its explanation.
                        </span>
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {selected ? (
          <section
            ref={detailRef}
            className="pg-guide-entry"
            tabIndex={-1}
            aria-labelledby="guide-entry-term"
            data-testid="guide-entry"
            data-guide-entry={selected.semanticKey}
          >
            <h3 id="guide-entry-term">{selected.term}</h3>
            <p className="pg-guide-entry-short" data-testid="guide-entry-short">
              {selected.shortDefinition}
            </p>
            <p data-testid="guide-entry-explanation">{selected.explanation}</p>
            {selected.contextNote ? (
              <p className="game-note" data-testid="guide-entry-context">
                {selected.contextNote}
              </p>
            ) : null}
            <button
              type="button"
              className="ui-action ui-action--rail"
              aria-pressed={learnedKeys.includes(selected.semanticKey)}
              data-testid="guide-entry-learned"
              onClick={() =>
                onSetLearned(
                  selected.semanticKey,
                  !learnedKeys.includes(selected.semanticKey),
                )
              }
            >
              {learnedKeys.includes(selected.semanticKey)
                ? "Marked learned"
                : "Mark learned"}
            </button>
            <p className="game-note">
              Marking a term learned quiets the help beside it while you play.
              It changes nothing about your character or the world.
            </p>
            {relatedGuideTerms(selected).length > 0 ? (
              <>
                <h4>Related terms</h4>
                <ul className="pg-guide-related" data-testid="guide-related">
                  {relatedGuideTerms(selected).map((related) => (
                    <li key={related.semanticKey}>
                      <button
                        type="button"
                        className="ui-action ui-action--subtle"
                        data-testid={`guide-related-${related.semanticKey}`}
                        onClick={() => openEntry(related.semanticKey, true)}
                      >
                        {related.term}
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
          </section>
        ) : (
          <p className="game-note" data-testid="guide-entry-empty">
            Choose a term to read what it means.
          </p>
        )}
      </div>
    </div>
  );
}
