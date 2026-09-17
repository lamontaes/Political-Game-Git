import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { PinToggle } from "./controls/PinToggle";

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
import { projectPersonContact } from "../presentation/person-contact";
import "./people-web.css";

/**
 * The one person card.
 *
 * The owner's sketch: portrait, name, what they do and what they are to you,
 * a pin in the corner, what you actually know of them (or an honest "you
 * don't know much about John"), the people they are connected to, and the
 * real actions along the bottom. One card, on the right at desktop sizes.
 * Opening somebody else replaces it. Expanding happens in place.
 *
 * Nothing here invents contact, travel or presence: the four actions come
 * from `projectPersonContact`, which reads records and says why when it
 * cannot. A pin is a saved reference, not a claim that they are here.
 */

/**
 * Where the clicked person stands on screen, in viewport pixels. A card opened
 * from a list, the web or a link has none and keeps the side placement.
 */
export interface PersonCardAnchor {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

const CARD_MARGIN = 12;
const CARD_GAP = 14;

/**
 * Beside the person, on the right when it fits and on the left when it does
 * not, then clamped inside the window with room kept at the bottom for the
 * dialogue choices and the lower-corner controls (UI DECISION FOLLOW-THROUGH).
 */
export function placeAnchoredCard(
  anchor: PersonCardAnchor,
  card: { readonly width: number; readonly height: number },
  viewport: { readonly width: number; readonly height: number },
): {
  readonly left: number;
  readonly top: number;
  readonly side: "right" | "left";
} {
  let side: "right" | "left" = "right";
  let left = anchor.left + anchor.width + CARD_GAP;
  if (left + card.width > viewport.width - CARD_MARGIN) {
    side = "left";
    left = anchor.left - CARD_GAP - card.width;
  }
  left = Math.max(
    CARD_MARGIN,
    Math.min(left, viewport.width - CARD_MARGIN - card.width),
  );
  const bottomReserve = Math.min(160, Math.round(viewport.height * 0.22));
  const maxTop = Math.max(
    CARD_MARGIN,
    viewport.height - bottomReserve - card.height,
  );
  const top = Math.max(CARD_MARGIN, Math.min(anchor.top, maxTop));
  return { left, top, side };
}

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
  presentPersonIds,
  onClose,
  onExpand,
  onTogglePin,
  onOpenPerson,
  onTalk,
  onMeet,
  onTravel,
  onFullRecord,
  talkUnavailable,
  onOpenLink,
  anchor = null,
}: {
  readonly world: World;
  readonly playerId: EntityId;
  readonly dossier: PersonDossier;
  readonly pinned: boolean;
  readonly expanded: boolean;
  readonly mode: "overlay" | "workspace";
  /** The clicked scene person, when the card was opened from the room. */
  readonly anchor?: PersonCardAnchor | null;
  /** Who the room says is here. Presence is the room's answer, not a pin's. */
  readonly presentPersonIds?: readonly EntityId[];
  readonly onClose?: () => void;
  readonly onExpand?: () => void;
  readonly onTogglePin: () => void;
  readonly onOpenPerson: (personId: EntityId) => void;
  readonly onTalk?: () => void;
  readonly onMeet?: () => void;
  readonly onTravel?: () => void;
  /** The full record page, with appearance controls for your own character. */
  readonly onFullRecord?: () => void;
  readonly talkUnavailable: string | null;
  readonly onOpenLink: (ref: ShellRef) => void;
}) {
  const cardRef = useRef<HTMLElement>(null);
  /*
   * A card that just opened takes the keyboard: its first control is where a
   * player who pressed Enter on somebody expects to be. Focus lands on the
   * card itself rather than on Close, so the first Tab reaches an action and
   * Escape still closes it.
   */
  useEffect(() => {
    if (mode === "overlay") cardRef.current?.focus();
  }, [dossier.personId, mode]);

  const [placement, setPlacement] = useState<ReturnType<
    typeof placeAnchoredCard
  > | null>(null);
  useLayoutEffect(() => {
    if (mode !== "overlay" || !anchor) {
      setPlacement(null);
      return;
    }
    const place = () => {
      const card = cardRef.current;
      if (!card) return;
      const rect = card.getBoundingClientRect();
      setPlacement(
        placeAnchoredCard(
          anchor,
          { width: rect.width, height: rect.height },
          { width: window.innerWidth, height: window.innerHeight },
        ),
      );
    };
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [anchor, mode, dossier.personId, expanded]);

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
        label: otherId === playerId ? "you" : (node.relationship ?? edge.label),
        kind: edge.kind,
      },
    ];
  });

  const contact = projectPersonContact(world, playerId, dossier.personId, {
    ...(presentPersonIds ? { presentPersonIds } : {}),
  });
  const presentNow = presentPersonIds
    ? presentPersonIds.includes(dossier.personId)
    : dossier.presentNow;
  const facts = expanded ? dossier.details : dossier.details.slice(0, 3);
  const testId =
    mode === "overlay" && !expanded ? "quick-dossier" : "full-dossier";
  const role =
    dossier.details.find((fact) => fact.attribution === "record")?.text ?? null;
  const isYou = dossier.personId === playerId;
  const alive =
    web.nodes.find((node) => node.personId === dossier.personId)?.alive !==
    false;
  const unavailableReasons = [
    !isYou && onTalk && !contact.talk.available ? contact.talk.reason : null,
    !isYou && !contact.travel.available && !presentNow
      ? contact.travel.reason
      : null,
    !isYou && !presentNow ? contact.meet.reason : null,
    !isYou ? contact.contact.reason : null,
  ].filter((reason): reason is string => reason !== null);

  return (
    <aside
      className={`pg-person-card pg-person-card--${mode}`}
      role={mode === "overlay" ? "dialog" : "region"}
      aria-modal="false"
      aria-label={`${dossier.name}`}
      data-testid={testId}
      data-person-id={dossier.personId}
      data-expanded={expanded ? "true" : "false"}
      data-placement={placement ? `anchored-${placement.side}` : "side"}
      style={
        placement
          ? {
              left: placement.left,
              top: placement.top,
              right: "auto",
              bottom: "auto",
            }
          : undefined
      }
      tabIndex={-1}
      ref={cardRef}
    >
      <header className="pg-person-card-head">
        <div className="pg-person-card-identity">
          <PersonPortrait
            world={world}
            personId={dossier.personId}
            size="large"
          />
          <div className="pg-person-card-titles">
            <h2 data-testid="dossier-name">{dossier.name}</h2>
            {role ? (
              <p className="pg-person-card-role" data-testid="dossier-role">
                {role}
              </p>
            ) : null}
            {dossier.relationship ? (
              <p
                className="pg-person-card-relation"
                data-testid="dossier-relation"
              >
                {dossier.relationship}
              </p>
            ) : isYou ? (
              <p
                className="pg-person-card-relation"
                data-testid="dossier-relation"
              >
                You
              </p>
            ) : null}
            {!alive ? (
              <p className="pg-right-now" data-testid="person-card-deceased">
                No longer living.
              </p>
            ) : isYou ? null : presentNow ? (
              <p className="pg-right-now" data-testid="person-card-present">
                Here in the room with you.
              </p>
            ) : (
              <p
                className="pg-person-card-note"
                data-testid="person-card-presence-note"
              >
                Not here. A card or a pin is a reference, not presence.
              </p>
            )}
          </div>
        </div>
        <div className="pg-person-card-corner">
          <PinToggle
            pinned={pinned}
            name={dossier.name}
            testid={expanded ? "dossier-pin" : "quick-dossier-pin"}
            onToggle={onTogglePin}
          />
          {onClose ? (
            <button
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
        </div>
      </header>

      <div className="pg-person-card-body">
        <section className="pg-dossier-section" aria-label="What you know">
          <p
            className="pg-person-card-read"
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
              className="pg-person-card-note"
              data-testid={
                expanded ? "dossier-facts-empty" : "quick-facts-empty"
              }
            >
              You don&rsquo;t know much about {dossier.shortName} yet.
            </p>
          ) : null}
          {!expanded && onExpand && (dossier.details.length > 3 || true) ? (
            <button
              type="button"
              className="ui-action ui-action--subtle pg-person-card-more"
              data-testid="quick-dossier-full"
              onClick={onExpand}
            >
              More details
            </button>
          ) : null}
        </section>

        {connections.length > 0 ? (
          <section className="pg-dossier-section" aria-label="Connected people">
            <h3>Connected people</h3>
            <div
              className="pg-person-card-connections"
              data-testid="person-card-connections"
            >
              {connections.map((connection) => (
                <button
                  key={connection.personId}
                  type="button"
                  className="pg-person-card-connection"
                  data-testid={`person-card-connection-${connection.personId}`}
                  onClick={() => onOpenPerson(connection.personId)}
                >
                  <PersonPortrait
                    world={world}
                    personId={connection.personId}
                    size="small"
                  />
                  <span className="pg-person-card-connection-text">
                    <strong>{connection.name}</strong>
                    <small>
                      {connection.label}
                      {/* "On the record together…" already names its kind. */}
                      {connection.kind === "acquaintance"
                        ? ""
                        : ` · ${EDGE_KIND_LABELS[connection.kind]}`}
                    </small>
                  </span>
                </button>
              ))}
            </div>
          </section>
        ) : null}

        {dossier.links.filter((link) => link.kind !== "person").length > 0 ? (
          <section className="pg-dossier-section" aria-label="Also connected">
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
          </section>
        ) : null}
      </div>

      <footer
        className="pg-person-card-actions"
        data-testid="person-contact-actions"
      >
        {!isYou && onTalk ? (
          <button
            type="button"
            className="ui-action ui-action--primary"
            data-testid="dossier-talk"
            disabled={talkUnavailable !== null}
            aria-describedby={`person-talk-reason-${dossier.personId}`}
            onClick={onTalk}
          >
            Talk
          </button>
        ) : null}
        {!isYou ? (
          <button
            type="button"
            className="ui-action"
            data-testid="person-travel"
            disabled={!contact.travel.available || !onTravel}
            aria-describedby={`person-travel-reason-${dossier.personId}`}
            onClick={onTravel}
          >
            Travel to
          </button>
        ) : null}
        {!isYou ? (
          <button
            type="button"
            className="ui-action"
            data-testid="person-meet"
            disabled={!contact.meet.available || !onMeet}
            aria-describedby={`person-meet-reason-${dossier.personId}`}
            onClick={onMeet}
          >
            Meet
          </button>
        ) : null}
        {!isYou ? (
          <button
            type="button"
            className="ui-action"
            data-testid="person-contact"
            disabled={!contact.contact.available}
            aria-describedby={`person-contact-reason-${dossier.personId}`}
          >
            Contact
          </button>
        ) : null}
        {onFullRecord ? (
          <button
            type="button"
            className="ui-action ui-action--subtle"
            data-testid="person-full-record"
            onClick={onFullRecord}
          >
            {isYou ? "Your record and appearance" : "Full record"}
          </button>
        ) : null}
      </footer>
      <p className="sr-only" id={`person-talk-reason-${dossier.personId}`}>
        {talkUnavailable ??
          "Starts the established conversation with this person."}
      </p>
      <p className="sr-only" id={`person-contact-reason-${dossier.personId}`}>
        {contact.contact.reason}
      </p>
      <p className="sr-only" id={`person-meet-reason-${dossier.personId}`}>
        {contact.meet.reason}
      </p>
      <p className="sr-only" id={`person-travel-reason-${dossier.personId}`}>
        {contact.travel.reason}
      </p>
      {contact.travel.available && !isYou ? (
        <p className="pg-person-card-note" data-testid="person-contact-reason">
          {contact.travel.reason}
        </p>
      ) : null}
      {unavailableReasons.length > 0 ? (
        <details className="pg-person-card-why">
          <summary>Why some actions are unavailable</summary>
          <ul data-testid="person-contact-unavailable">
            {unavailableReasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        </details>
      ) : null}
      {talkUnavailable ? (
        <p className="sr-only" data-testid="dossier-talk-unavailable">
          {talkUnavailable}
        </p>
      ) : null}
    </aside>
  );
}
