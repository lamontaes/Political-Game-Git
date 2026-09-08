import { useEffect, useRef } from "react";

import type {
  DossierFact,
  PersonDossier,
} from "../presentation/person-dossier";
import { labelForRef } from "../presentation/person-dossier";
import { pinKindLabel } from "./ShellPinRail";
import type { ShellRef } from "../presentation/shell-navigation";
import type { World } from "../simulation";
import { PersonPortrait } from "./PersonPortrait";

/**
 * What the player knows about somebody, laid out so the kinds of claim stay
 * distinct.
 *
 * Ordinary knowledge carries no badge — a line about your own mother does not
 * need to be labelled "You know" — while the public record says it is the
 * record and somebody's account of them stays attributed to them. Nothing is
 * promoted to a stronger kind of claim to make the section look complete, and a
 * category the world has nothing for says so in a sentence instead of being
 * quietly dropped.
 */
function FactList({
  facts,
  testId,
}: {
  readonly facts: readonly DossierFact[];
  readonly testId: string;
}) {
  if (facts.length === 0) return null;
  return (
    <ul className="pg-facts" data-testid={testId}>
      {facts.map((fact) => (
        <li
          key={fact.key}
          className="pg-fact"
          data-attribution={fact.attribution}
        >
          {fact.attribution === "known" ? null : (
            <span className="pg-fact-attribution">
              {fact.attribution === "record" ? "On the record" : "Reported"}
            </span>
          )}
          <span>{fact.text}</span>
        </li>
      ))}
    </ul>
  );
}

function Identity({
  world,
  dossier,
}: {
  readonly world: World;
  readonly dossier: PersonDossier;
}) {
  return (
    <div className="pg-dossier-identity">
      <PersonPortrait world={world} personId={dossier.personId} size="small" />
      <div>
        <h2 data-testid="dossier-name">{dossier.name}</h2>
        {dossier.relationship ? (
          <p className="pg-dossier-relation" data-testid="dossier-relation">
            {dossier.relationship}
          </p>
        ) : null}
        {/*
          What they are doing this minute is a different kind of claim from who
          they are, so it sits beside the identity rather than joining the
          lasting details — and it is simply absent when nothing establishes it.
        */}
        {dossier.rightNow ? (
          <p className="pg-right-now" data-testid="dossier-right-now">
            <span className="pg-right-now-label">Right now</span>
            {dossier.rightNow}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function Links({
  world,
  dossier,
  onOpenLink,
  testId,
}: {
  readonly world: World;
  readonly dossier: PersonDossier;
  readonly onOpenLink: (ref: ShellRef) => void;
  readonly testId: string;
}) {
  if (dossier.links.length === 0) return null;
  return (
    <div className="pg-dossier-section">
      <h3>Connected</h3>
      <div className="pg-dossier-actions" data-testid={testId}>
        {dossier.links.map((link) => (
          <button
            key={`${link.kind}:${link.id}`}
            type="button"
            className="ui-action ui-action--rail"
            data-testid={`dossier-link-${link.kind}-${link.id}`}
            onClick={() => onOpenLink(link)}
          >
            {labelForRef(world, link) ?? "Unavailable"}
            <small>{pinKindLabel(link.kind)}</small>
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * The quick dossier: narrow, contextual, and never a takeover.
 *
 * It opens beside the person it describes rather than over them, closes on its
 * own X and on Escape, and offers exactly two onward moves — the full record
 * and the pin. It is not a modal: the room behind it stays live, because
 * glancing at somebody should not stop the game.
 */
export function QuickDossier({
  world,
  dossier,
  pinned,
  onClose,
  onOpenFull,
  onTogglePin,
  onOpenLink,
}: {
  readonly world: World;
  readonly dossier: PersonDossier;
  readonly pinned: boolean;
  readonly onClose: () => void;
  readonly onOpenFull: () => void;
  readonly onTogglePin: () => void;
  readonly onOpenLink: (ref: ShellRef) => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    closeRef.current?.focus();
  }, [dossier.personId]);

  return (
    <aside
      className="pg-quick-dossier civic-glass"
      role="dialog"
      aria-modal="false"
      aria-label={`Your read on ${dossier.name}`}
      data-testid="quick-dossier"
      data-person-id={dossier.personId}
    >
      <header className="pg-quick-dossier-head">
        <p className="pg-kicker">Your read</p>
        <button
          ref={closeRef}
          type="button"
          className="ui-icon-button"
          aria-label={`Close the quick dossier for ${dossier.name}`}
          data-testid="quick-dossier-close"
          onClick={onClose}
        >
          <span aria-hidden="true">✕</span>
        </button>
      </header>

      <Identity world={world} dossier={dossier} />

      <div className="pg-dossier-section">
        <h3>Details</h3>
        <FactList facts={dossier.details.slice(0, 3)} testId="quick-facts" />
        {dossier.details.length === 0 ? (
          <p className="game-note" data-testid="quick-facts-empty">
            Nothing about them is written down yet.
          </p>
        ) : null}
      </div>

      <div className="pg-dossier-section">
        <h3>Last interaction</h3>
        <p data-testid="quick-last-interaction">{dossier.lastInteraction}</p>
      </div>

      <Links
        world={world}
        dossier={dossier}
        onOpenLink={onOpenLink}
        testId="quick-links"
      />

      <div className="pg-dossier-actions">
        <button
          type="button"
          className="ui-action ui-action--primary"
          data-testid="quick-dossier-full"
          onClick={onOpenFull}
        >
          Full record
        </button>
        <button
          type="button"
          className="ui-action"
          aria-pressed={pinned}
          data-testid="quick-dossier-pin"
          onClick={onTogglePin}
        >
          {pinned ? "Unpin" : "Pin"}
        </button>
      </div>
    </aside>
  );
}

/**
 * The full record, in the centre workspace.
 *
 * Everything the quick dossier showed, and the rest of it: the whole Details
 * grouping, what the world does not know, and every connected entity. Same
 * attribution rules, same refusal to invent.
 */
export function FullDossier({
  world,
  dossier,
  pinned,
  onTogglePin,
  onTalk,
  talkUnavailable,
  onOpenLink,
}: {
  readonly world: World;
  readonly dossier: PersonDossier;
  readonly pinned: boolean;
  readonly onTogglePin: () => void;
  readonly onTalk: () => void;
  readonly talkUnavailable: string | null;
  readonly onOpenLink: (ref: ShellRef) => void;
}) {
  return (
    <div
      className="pg-full-dossier"
      data-testid="full-dossier"
      data-person-id={dossier.personId}
    >
      <Identity world={world} dossier={dossier} />

      <div className="pg-dossier-actions">
        <button
          type="button"
          className="ui-action ui-action--primary"
          data-testid="dossier-talk"
          disabled={talkUnavailable !== null}
          onClick={onTalk}
        >
          Talk to {dossier.shortName}
        </button>
        <button
          type="button"
          className="ui-action"
          aria-pressed={pinned}
          data-testid="dossier-pin"
          onClick={onTogglePin}
        >
          {pinned ? "Unpin" : "Pin"}
        </button>
      </div>
      {/*
        A route the world cannot offer says which route and why, rather than
        showing a control that pretends. This is the honest half of the fix to
        the disabled Talk button: it is enabled whenever the conversation system
        has a room for this person, and explains itself when it has not.
      */}
      {talkUnavailable ? (
        <p className="game-note" data-testid="dossier-talk-unavailable">
          {talkUnavailable}
        </p>
      ) : null}

      <div className="pg-dossier-section">
        <h3>Details</h3>
        <FactList facts={dossier.details} testId="dossier-facts" />
        {dossier.details.length === 0 ? (
          <p className="game-note" data-testid="dossier-facts-empty">
            Nothing about them is written down yet.
          </p>
        ) : null}
        {dossier.notKnown.length > 0 ? (
          <ul className="pg-not-known" data-testid="dossier-not-known">
            {dossier.notKnown.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        ) : null}
      </div>

      <div className="pg-dossier-section">
        <h3>Last interaction</h3>
        <p data-testid="dossier-last-interaction">{dossier.lastInteraction}</p>
      </div>

      <Links
        world={world}
        dossier={dossier}
        onOpenLink={onOpenLink}
        testId="dossier-links"
      />
    </div>
  );
}
