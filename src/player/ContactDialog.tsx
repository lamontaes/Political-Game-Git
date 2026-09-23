import "./contacts.css";
import { useEffect, useId, useMemo, useRef } from "react";
import { personName } from "../simulation";
import type { EntityId, World } from "../simulation";
import { projectContacts } from "../presentation/people-contacts";
import { ContactsPanel } from "./ContactsPanel";
import { PersonPortrait } from "./PersonPortrait";

/**
 * Getting in touch with one person, as its own screen.
 *
 * Contact on a person card used to set the People search to their name and
 * scroll the People panel down to its "Getting in touch" list. The playtest
 * wanted it to be its own thing: a screen that fades in over whatever is
 * open, is about that one person, and closes back to where you were.
 *
 * It is a native modal dialog, so it sits in the top layer above the room,
 * the workspace and the card, keeps focus inside itself, and Escape closes it.
 * What it offers is the same `ContactsPanel` row People draws for them, with
 * the same commands through the same writers; opening it changes nothing.
 */
export function ContactDialog({
  world,
  playerPersonId,
  personId,
  onWorldChange,
  onClose,
}: {
  readonly world: World;
  readonly playerPersonId: EntityId;
  readonly personId: EntityId;
  readonly onWorldChange: (world: World) => void;
  readonly onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  useEffect(() => {
    const node = dialog.current!;
    const opener =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    if (typeof node.showModal === "function" && !node.open) node.showModal();
    const first = node.querySelector<HTMLElement>(
      '[data-testid^="contact-focus-ask-"]:not([disabled]), [data-testid^="contact-focus-accept-"], [data-testid="contact-dialog-close"]',
    );
    first?.focus();
    return () => {
      if (node.open) node.close();
      // Back to the control that opened it, when it is still on screen.
      if (opener?.isConnected) opener.focus();
    };
  }, []);

  const entry = useMemo(
    () =>
      projectContacts(world, playerPersonId).contacts.find(
        (contact) => contact.personId === personId,
      ) ?? null,
    [world, playerPersonId, personId],
  );
  const person = world.people[personId];
  const name = entry?.name ?? (person ? personName(person) : "them");

  return (
    <dialog
      ref={dialog}
      className="pg-contact-dialog"
      aria-labelledby={titleId}
      data-testid="contact-dialog"
      onKeyDown={(event) => {
        // The shell and the room listen for Escape too; this screen owns it.
        if (event.key === "Escape") event.stopPropagation();
      }}
      onCancel={(event) => {
        event.preventDefault();
        onCloseRef.current();
      }}
      onClick={(event) => {
        // A press on the dimmed backdrop lands on the dialog itself.
        if (event.target === event.currentTarget) onCloseRef.current();
      }}
    >
      <div className="pg-contact-dialog-body">
        <header className="pg-contact-dialog-head">
          {person ? (
            <PersonPortrait world={world} personId={personId} size="small" />
          ) : null}
          <div className="pg-contact-dialog-who">
            <h2 id={titleId}>{name}</h2>
            <p>Get in touch</p>
          </div>
          <button
            type="button"
            className="ui-action ui-action--subtle"
            data-testid="contact-dialog-close"
            onClick={() => onCloseRef.current()}
          >
            Close
          </button>
        </header>
        {entry ? (
          <ContactsPanel
            world={world}
            personId={playerPersonId}
            contactEntry={entry}
            onWorldChange={onWorldChange}
            focused
          />
        ) : (
          <p className="pg-contact-line" data-testid="contact-dialog-none">
            You have no way of reaching {name} right now.
          </p>
        )}
      </div>
    </dialog>
  );
}
