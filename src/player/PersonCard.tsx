import { useEffect, useRef, type ReactNode } from "react";

import {
  EDGE_KIND_LABELS,
  neighborsOf,
  otherPersonId,
  projectRelationshipWeb,
} from "../presentation/relationship-web";
import type { PersonDossier } from "../presentation/person-dossier";
import { labelForRef } from "../presentation/person-dossier";
import type { ShellRef } from "../presentation/shell-navigation";
import type { EntityId, World } from "../simulation";
import { pinKindLabel } from "./ShellPinRail";
import { PersonPortrait } from "./PersonPortrait";
import "./people-web.css";

/**
 * One person card for the room, a name, a pin, and the People web.
 *
 * Expanding happens in this card. Choosing somebody else replaces it. A pin is
 * a saved reference, not a claim that they are in the room. Talk and other
 * actions are the existing adapters; nothing here invents contact, travel, or
 * hiring.
 */

function FactList({
  facts,
  testId,
}: {
  readonly facts: PersonDossier["details"];
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

export function PersonCard({
  world,
  playerId,
  dossier,
  pinned,
  expanded,
  mode,
  onClose,
  onExpand,
  onTogglePin,
  onOpenPerson,
  onTalk,
  talkUnavailable,
  onOpenLink,
  expandedContent,
}: {
  readonly world: World;
  readonly playerId: EntityId;
  readonly dossier: PersonDossier;
  readonly pinned: boolean;
  readonly expanded: boolean;
  readonly mode: "overlay" | "workspace" | "inline";
  readonly onClose?: () => void;
  readonly onExpand?: () => void;
  readonly onTogglePin: () => void;
  readonly onOpenPerson: (personId: EntityId) => void;
  readonly onTalk?: () => void;
  readonly talkUnavailable: string | null;
  readonly onOpenLink: (ref: ShellRef) => void;
  readonly expandedContent?: ReactNode;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (mode === "overlay") closeRef.current?.focus();
  }, [dossier.personId, mode]);

  const web = projectRelationshipWeb(world, playerId, dossier.personId);
  const connections = neighborsOf(web, dossier.personId).flatMap((edge) => {
    const otherId = otherPersonId(edge, dossier.personId);
    if (otherId === dossier.personId) return [];
    const node = web.nodes.find((entry) => entry.personId === otherId);
    if (!node) return [];
    return [
      {
        personId: otherId,
        name: node.name,
        label: node.relationship ?? edge.label,
        kind: edge.kind,
      },
    ];
  });

  const facts = expanded ? dossier.details : dossier.details.slice(0, 3);
  const testId =
    mode === "overlay" && !expanded ? "quick-dossier" : "full-dossier";
  const role =
    dossier.relationship ??
    dossier.details.find((fact) => fact.attribution === "record")?.text ??
    null;

  return (
    <aside
      className={`pg-person-card civic-glass pg-person-card--${mode}`}
      role={mode === "overlay" ? "dialog" : "region"}
      aria-modal="false"
      aria-label={`${dossier.name}`}
      data-testid={testId}
      data-person-id={dossier.personId}
      data-expanded={expanded ? "true" : "false"}
    >
      <header className="pg-person-card-head">
        <p className="pg-kicker">{expanded ? "Person" : "Your read"}</p>
        {onClose ? (
          <button
            ref={closeRef}
            type="button"
            className="ui-icon-button"
            aria-label={`Close the card for ${dossier.name}`}
            data-testid={
              mode === "overlay" ? "quick-dossier-close" : "person-card-close"
            }
            onClick={onClose}
          >
            <span aria-hidden="true">✕</span>
          </button>
        ) : null}
      </header>

      <div className="pg-dossier-identity">
        <PersonPortrait
          world={world}
          personId={dossier.personId}
          size="small"
        />
        <div>
          <h2 data-testid="dossier-name">{dossier.name}</h2>
          {role ? (
            <p className="pg-dossier-relation" data-testid="dossier-relation">
              {role}
            </p>
          ) : (
            <p
              className="pg-dossier-relation"
              data-testid="dossier-relation-unknown"
            >
              No record establishes a relationship.
            </p>
          )}
          {web.nodes.find((node) => node.personId === dossier.personId)
            ?.alive === false ? (
            <p className="pg-right-now" data-testid="person-card-deceased">
              No longer living.
            </p>
          ) : null}
          {dossier.presentNow ? (
            <p className="pg-right-now" data-testid="person-card-present">
              In the room now.
            </p>
          ) : (
            <p className="game-note" data-testid="person-card-presence-note">
              A pin or a card is a reference, not proof they are here.
            </p>
          )}
          {dossier.rightNow ? (
            <p className="pg-right-now" data-testid="dossier-right-now">
              <span className="pg-right-now-label">Right now</span>
              {dossier.rightNow}
            </p>
          ) : null}
        </div>
      </div>

      <div className="pg-dossier-section">
        <h3>Context</h3>
        <p
          data-testid={
            expanded ? "dossier-last-interaction" : "quick-last-interaction"
          }
        >
          {dossier.lastInteraction}
        </p>
        <FactList
          facts={facts}
          testId={expanded ? "dossier-facts" : "quick-facts"}
        />
        {facts.length === 0 ? (
          <p
            className="game-note"
            data-testid={expanded ? "dossier-facts-empty" : "quick-facts-empty"}
          >
            Nothing about them is written down yet.
          </p>
        ) : null}
        {expanded && dossier.notKnown.length > 0 ? (
          <ul className="pg-not-known" data-testid="dossier-not-known">
            {dossier.notKnown.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        ) : null}
      </div>

      {expanded ? expandedContent : null}

      {connections.length > 0 ? (
        <div className="pg-dossier-section">
          <h3>Connected people</h3>
          <div
            className="pg-dossier-actions"
            data-testid="person-card-connections"
          >
            {connections.map((connection) => (
              <button
                key={connection.personId}
                type="button"
                className="ui-action ui-action--rail"
                data-testid={`person-card-connection-${connection.personId}`}
                onClick={() => onOpenPerson(connection.personId)}
              >
                {connection.name}
                <small>
                  {connection.label} · {EDGE_KIND_LABELS[connection.kind]}
                </small>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {expanded
        ? dossier.links.filter((link) => link.kind !== "person").length > 0 && (
            <div className="pg-dossier-section">
              <h3>Also connected</h3>
              <div className="pg-dossier-actions" data-testid="dossier-links">
                {dossier.links
                  .filter((link) => link.kind !== "person")
                  .map((link) => (
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
          )
        : dossier.links.length > 0 && (
            <div className="pg-dossier-section">
              <h3>Connected</h3>
              <div className="pg-dossier-actions" data-testid="quick-links">
                {dossier.links.map((link) => (
                  <button
                    key={`${link.kind}:${link.id}`}
                    type="button"
                    className="ui-action ui-action--rail"
                    data-testid={`dossier-link-${link.kind}-${link.id}`}
                    onClick={() =>
                      link.kind === "person"
                        ? onOpenPerson(link.id)
                        : onOpenLink(link)
                    }
                  >
                    {labelForRef(world, link) ?? "Unavailable"}
                    <small>{pinKindLabel(link.kind)}</small>
                  </button>
                ))}
              </div>
            </div>
          )}

      <div className="pg-dossier-actions">
        {onTalk ? (
          <button
            type="button"
            className="ui-action ui-action--primary"
            data-testid="dossier-talk"
            disabled={talkUnavailable !== null}
            onClick={onTalk}
          >
            Talk to {dossier.shortName}
          </button>
        ) : null}
        <button
          type="button"
          className="ui-action"
          aria-pressed={pinned}
          data-testid={expanded ? "dossier-pin" : "quick-dossier-pin"}
          onClick={onTogglePin}
        >
          {pinned ? "Unpin" : "Pin"}
        </button>
        {!expanded && onExpand ? (
          <button
            type="button"
            className="ui-action ui-action--primary"
            data-testid="quick-dossier-full"
            onClick={onExpand}
          >
            More details
          </button>
        ) : null}
      </div>
      {talkUnavailable ? (
        <p className="game-note" data-testid="dossier-talk-unavailable">
          {talkUnavailable}
        </p>
      ) : null}
    </aside>
  );
}
