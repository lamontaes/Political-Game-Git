import { useEffect, useRef, useState } from "react";

import type { EntityId } from "../simulation";
import type { HouseholdPaper } from "../presentation/household-papers";

/**
 * The papers on the table: the first thing in a room a player can act on.
 *
 * What is waiting on a character has been readable for a while and has been
 * in the wrong place: on Today, inside the Calendar, behind the corner
 * cluster. Two navigations from the room they are standing in, and nothing in
 * the room said a decision was waiting. This puts it where the residence's
 * own scene spec already declares a surface for it.
 *
 * The interaction is the one the room research set out, and the order matters:
 * **hover or focus reveals, activation inspects, and only an explicit
 * commitment on the surface that owns the matter performs.** So the object
 * says how much is waiting when you reach it, opens the list when you press
 * it, and spends nothing either way — every route out of the list is the same
 * route the day already offers, handed back to the caller rather than
 * performed here.
 *
 * It holds no state about the world. The papers come from
 * `projectHouseholdPapers`, which returns exactly what the day returns; the
 * only state here is whether the list is open.
 *
 * It is not the only way to reach any of this. The Calendar's Today shows the
 * same list, which is what keeps a small target on a table from being the
 * sole route to answering an offer of work.
 */

interface RoomPapersProps {
  readonly papers: readonly HouseholdPaper[];
  readonly onOpenCommitment: (activityId: EntityId) => void;
  readonly onOpenPerson: (personId: EntityId) => void;
  readonly onGoTo: (
    surface: "work" | "calendar" | "places",
    section?: "campaign",
  ) => void;
}

export function RoomPapers({
  papers,
  onOpenCommitment,
  onOpenPerson,
  onGoTo,
}: RoomPapersProps) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) listRef.current?.focus();
  }, [open]);

  /*
   * Nothing is waiting, so there is nothing here. The plate's own painted
   * newspaper is what a player sees, which is the same rule the surface layer
   * keeps: an object with nothing to say draws no element at all rather than
   * an empty one.
   */
  if (papers.length === 0) return null;

  const close = (returnFocus: boolean) => {
    setOpen(false);
    if (returnFocus) buttonRef.current?.focus();
  };

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className="room-papers"
        data-testid="room-papers"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((was) => !was)}
      >
        {/*
          The reveal. It says how much rather than what: reading the contents
          off a table across a room is the thing pressing it is for, and a
          label that already listed them would make the press pointless.
        */}
        <span className="room-papers-hint">
          {papers.length === 1
            ? "Something is waiting for you"
            : `${papers.length} things are waiting for you`}
        </span>
      </button>

      {open ? (
        <div
          ref={listRef}
          tabIndex={-1}
          role="dialog"
          aria-label="What is waiting for you"
          className="room-papers-open"
          data-testid="room-papers-open"
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.stopPropagation();
              close(true);
            }
          }}
        >
          <ul>
            {papers.map((paper) => {
              const destination = paper.destination;
              const route =
                destination.kind === "commitment"
                  ? () => onOpenCommitment(destination.activityId)
                  : destination.kind === "person"
                    ? () => onOpenPerson(destination.personId)
                    : destination.kind === "surface"
                      ? () => onGoTo(destination.surface, destination.section)
                      : null;
              return (
                <li key={paper.key}>
                  {route ? (
                    <button
                      type="button"
                      className="ui-action ui-action--subtle"
                      data-testid={`room-papers-open-${paper.key}`}
                      onClick={() => {
                        close(false);
                        route();
                      }}
                    >
                      {paper.sentence}
                    </button>
                  ) : (
                    /*
                      Answered with the time this character has, or carrying no
                      route the record supports. Neither is a place to send
                      somebody, so it stays what it is.
                    */
                    paper.sentence
                  )}
                </li>
              );
            })}
          </ul>
          <button
            type="button"
            className="ui-action ui-action--subtle"
            data-testid="room-papers-close"
            onClick={() => close(true)}
          >
            Put them down
          </button>
        </div>
      ) : null}
    </>
  );
}
