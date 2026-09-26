import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { PinToggle } from "./controls/PinToggle";

import {
  neighborsOf,
  otherPersonId,
  projectRelationshipWeb,
} from "../presentation/relationship-web";
import type { PersonDossier } from "../presentation/person-dossier";
import type { ShellRef } from "../presentation/shell-navigation";
import type { EntityId, World } from "../simulation";
import { PersonPortrait } from "./PersonPortrait";
import { SavedPersonFigure } from "./SavedPersonFigure";
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

export function PersonCard({
  world,
  playerId,
  dossier,
  pinned,
  expanded,
  mode,
  firstIntroduction = false,
  presentPersonIds,
  onClose,
  onExpand,
  onTogglePin,
  onOpenPerson,
  onTalk,
  onContact,
  onMeet,
  onTravel,
  onFullRecord,
  talkUnavailable,
  anchor = null,
}: {
  readonly world: World;
  readonly playerId: EntityId;
  readonly dossier: PersonDossier;
  readonly pinned: boolean;
  readonly expanded: boolean;
  readonly mode: "overlay" | "workspace";
  readonly firstIntroduction?: boolean;
  /** The clicked scene person, when the card was opened from the room. */
  readonly anchor?: PersonCardAnchor | null;
  /** Who the room says is here. Presence is the room's answer, not a pin's. */
  readonly presentPersonIds?: readonly EntityId[];
  readonly onClose?: () => void;
  readonly onExpand?: () => void;
  readonly onTogglePin: () => void;
  readonly onOpenPerson: (personId: EntityId) => void;
  readonly onTalk?: () => void;
  readonly onContact?: () => void;
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
    const person = world.people[otherId];
    return person
      ? [
          {
            personId: otherId,
            name: person.givenName + " " + person.familyName,
          },
        ]
      : [];
  });

  const contact = projectPersonContact(world, playerId, dossier.personId, {
    ...(presentPersonIds ? { presentPersonIds } : {}),
  });
  const testId =
    mode === "overlay" && !expanded ? "quick-dossier" : "full-dossier";
  const publicRole = dossier.details.find((fact) =>
    fact.key.startsWith("public-role-"),
  )?.text;
  const isYou = dossier.personId === playerId;
  const alive =
    web.nodes.find((node) => node.personId === dossier.personId)?.alive !==
    false;
  /*
   * Somebody who has died is not reached in any way, so the card offers
   * nothing, not even disabled buttons with reasons under them (Ketchikan
   * playtest on main 22b4f13e, 2026-09-23).
   */
  const reachable = !isYou && alive;

  return (
    <aside
      className={`pg-person-card pg-person-card--${mode}`}
      role={mode === "overlay" ? "dialog" : "region"}
      aria-modal="false"
      aria-label={`${dossier.name}`}
      data-testid={testId}
      data-person-id={dossier.personId}
      data-expanded={expanded ? "true" : "false"}
      data-first-introduction={firstIntroduction ? "true" : "false"}
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
            {publicRole ? (
              <p className="pg-person-card-role" data-testid="dossier-role">
                {publicRole}
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
        {expanded ? (
          <SavedPersonFigure
            world={world}
            personId={dossier.personId}
            className="pg-record-figure"
          />
        ) : null}
        {!expanded && onExpand ? (
          <button
            type="button"
            className="ui-action ui-action--subtle pg-person-card-more"
            data-testid="quick-dossier-full"
            onClick={onExpand}
          >
            Open record
          </button>
        ) : null}
        {expanded && connections.length > 0 ? (
          <section className="pg-dossier-section" aria-label="People">
            <h3>People</h3>
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
                  <strong>{connection.name}</strong>
                  {connection.personId === playerId ? <small>you</small> : null}
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
        {reachable && onTalk && talkUnavailable === null ? (
          <button
            type="button"
            className="ui-action ui-action--primary"
            data-testid="dossier-talk"
            onClick={onTalk}
          >
            Talk
          </button>
        ) : null}
        {reachable && contact.travel.available && onTravel ? (
          <button
            type="button"
            className="ui-action"
            data-testid="person-travel"
            onClick={onTravel}
          >
            Travel to
          </button>
        ) : null}
        {reachable && contact.meet.available && onMeet ? (
          <button
            type="button"
            className="ui-action"
            data-testid="person-meet"
            onClick={onMeet}
          >
            Meet
          </button>
        ) : null}
        {reachable && contact.contact.available && onContact ? (
          <button
            type="button"
            className="ui-action"
            data-testid="person-contact"
            onClick={onContact}
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
    </aside>
  );
}
