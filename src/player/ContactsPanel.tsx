import { useMemo, useState } from "react";
import type { EntityId, IsoDate, World } from "../simulation";
import {
  answerMeeting,
  askToMeet,
  offerAnotherDay,
  projectContacts,
} from "../presentation/people-contacts";
import type { ContactEntry } from "../presentation/people-contacts";
import { proseDate } from "../presentation/prose-dates";

/**
 * Who this life can reach, and what is outstanding between them.
 *
 * The mount for PEOPLE's `projectContacts` seam (CRUNCH47 B1/P3). Everything
 * on screen is the adapter's answer: the basis the two of them overlap on, the
 * ways of getting in touch that exist, when they were last in contact, and
 * whose turn it is to answer. Nothing here composes a name, a date, a
 * relationship or a number of its own.
 *
 * Three rules this surface keeps:
 *
 * - A channel that cannot be used now is its stated reason, never a control
 *   that looks pressable. A channel that CAN be used is still not a control:
 *   the seam has no per-channel command, so a button on "Call them" would be a
 *   promise the game cannot keep. Asking to meet is the command that exists,
 *   and that is the button.
 * - Offering another day is an answer AND a request of its own, so it carries
 *   its own day, chosen here by the player. This surface never composes an
 *   offer on their behalf.
 * - A command may refuse with a plain sentence. It is caught and shown as a
 *   note; the World is untouched when it does.
 */
export function ContactsPanel({
  world,
  personId,
  onWorldChange,
}: {
  readonly world: World;
  readonly personId: EntityId;
  readonly onWorldChange: (world: World) => void;
}) {
  const view = useMemo(
    () => projectContacts(world, personId),
    [world, personId],
  );
  const [note, setNote] = useState<string | null>(null);
  /*
   * The day a request carries. It starts at the earliest day the seam permits
   * and the field says so, so the default is disclosed rather than invented;
   * the player can move it to any day inside the window.
   */
  const [days, setDays] = useState<Readonly<Record<string, IsoDate>>>({});
  const dayFor = (key: string): IsoDate => days[key] ?? view.earliestMeetingOn;

  function run(work: () => World) {
    try {
      const next = work();
      setNote(null);
      if (next !== world) onWorldChange(next);
    } catch (error) {
      // The seam refuses in one player-readable sentence. That is the answer.
      setNote(error instanceof Error ? error.message : String(error));
    }
  }

  return (
    <section
      className="pg-personal-section"
      data-testid="contacts"
      aria-labelledby="contacts-title"
    >
      <h3 id="contacts-title">Getting in touch</h3>
      <p className="game-note">
        A way of reaching somebody is not a promise that they will say yes.
        Asking costs no time; the meeting itself will.
      </p>
      {/*
       * The window said the way a person says it. The seam also carries the
       * two ISO dates; those stay out of the player's sight, and the refusal
       * sentence from the simulation states the rule rather than a date.
       */}
      <p className="game-note" data-testid="contacts-meeting-window">
        A meeting can be arranged between {view.earliestMeetingSpoken} and{" "}
        {view.latestMeetingSpoken}.
      </p>
      {view.contacts.length === 0 ? (
        <p data-testid="contacts-empty">
          There is nobody you have a recorded way of reaching yet.
        </p>
      ) : (
        <ul className="pg-contacts-list">
          {view.contacts.map((contact) => (
            <ContactRow
              key={contact.personId}
              contact={contact}
              earliest={view.earliestMeetingOn}
              latest={view.latestMeetingOn}
              askOn={dayFor(`ask:${contact.personId}`)}
              offerOn={dayFor(`offer:${contact.personId}`)}
              onDayChange={(which, on) =>
                setDays((current) => ({
                  ...current,
                  [`${which}:${contact.personId}`]: on,
                }))
              }
              onAsk={(on) =>
                run(() =>
                  askToMeet(world, {
                    personId,
                    otherPersonId: contact.personId,
                    on,
                  }),
                )
              }
              onAnswer={(eventId, answer) =>
                run(() =>
                  answerMeeting(world, {
                    proposalEventId: eventId,
                    answer,
                  }),
                )
              }
              onOfferAnotherDay={(eventId, on) =>
                run(() =>
                  offerAnotherDay(world, { proposalEventId: eventId, on }),
                )
              }
            />
          ))}
        </ul>
      )}
      {note ? (
        <p role="status" data-testid="contacts-note">
          {note}
        </p>
      ) : null}
    </section>
  );
}

function ContactRow({
  contact,
  earliest,
  latest,
  askOn,
  offerOn,
  onDayChange,
  onAsk,
  onAnswer,
  onOfferAnotherDay,
}: {
  readonly contact: ContactEntry;
  readonly earliest: IsoDate;
  readonly latest: IsoDate;
  readonly askOn: IsoDate;
  readonly offerOn: IsoDate;
  readonly onDayChange: (which: "ask" | "offer", on: IsoDate) => void;
  readonly onAsk: (on: IsoDate) => void;
  readonly onAnswer: (eventId: EntityId, answer: "accept" | "decline") => void;
  readonly onOfferAnotherDay: (eventId: EntityId, on: IsoDate) => void;
}) {
  const ask = contact.actions.find((action) => action.kind === "ask-to-meet");
  const theyAsked =
    contact.outstanding?.direction === "they-asked"
      ? contact.outstanding
      : null;
  return (
    <li data-testid={`contact-${contact.personId}`}>
      <strong>{contact.name}</strong>
      {contact.relationshipLabel ? (
        <span className="pg-contact-line">{contact.relationshipLabel}</span>
      ) : null}
      <span className="pg-contact-line">{contact.basis.join(" · ")}</span>
      {contact.lastContactSpoken ? (
        <span className="pg-contact-line">
          Last in touch {contact.lastContactSpoken}
          {contact.outOfTouch ? ". It has been a long while." : "."}
        </span>
      ) : (
        <span className="pg-contact-line">
          Nothing recorded between you yet.
        </span>
      )}

      {/*
        Ways of reaching them. Informational by design: the seam's commands are
        asking and answering, so no channel is drawn as a control.
      */}
      <ul className="pg-contact-channels">
        {contact.channels.map((channel) => (
          <li
            key={channel.kind}
            data-testid={`contact-channel-${contact.personId}-${channel.kind}`}
          >
            {channel.note
              ? `${channel.label} — ${channel.note}`
              : channel.label}
          </li>
        ))}
      </ul>

      {theyAsked ? (
        <div className="game-choices">
          <p data-testid={`contact-outstanding-${contact.personId}`}>
            {contact.name} asked about {theyAsked.onSpoken}: {theyAsked.purpose}
          </p>
          <button
            type="button"
            className="ui-action ui-action--primary"
            data-testid={`contact-accept-${contact.personId}`}
            onClick={() => onAnswer(theyAsked.eventId, "accept")}
          >
            Say yes to {theyAsked.onSpoken}
          </button>
          <button
            type="button"
            className="ui-action"
            data-testid={`contact-decline-${contact.personId}`}
            onClick={() => onAnswer(theyAsked.eventId, "decline")}
          >
            Say you cannot
          </button>
          {/*
            Offering another day is an answer and a fresh request at once, so
            it carries the day the player picks here. Nothing offers for them.
          */}
          <label className="pg-field">
            <span>
              Offer another day instead, between {proseDate(earliest)} and{" "}
              {proseDate(latest)}
            </span>
            <input
              type="date"
              min={earliest}
              max={latest}
              value={offerOn}
              data-testid={`contact-offer-day-${contact.personId}`}
              onChange={(event) =>
                onDayChange("offer", event.target.value as IsoDate)
              }
            />
          </label>
          <button
            type="button"
            className="ui-action"
            data-testid={`contact-offer-${contact.personId}`}
            onClick={() => onOfferAnotherDay(theyAsked.eventId, offerOn)}
          >
            Offer that day
          </button>
        </div>
      ) : null}

      {ask?.available ? (
        <div className="game-choices">
          <label className="pg-field">
            {/*
              The field's value has to be ISO for a date input; what a player
              READS is the spoken form, because no raw ISO date belongs on a
              player-facing surface.
            */}
            <span>
              A day between {proseDate(earliest)} and {proseDate(latest)}
            </span>
            <input
              type="date"
              min={earliest}
              max={latest}
              value={askOn}
              data-testid={`contact-ask-day-${contact.personId}`}
              onChange={(event) =>
                onDayChange("ask", event.target.value as IsoDate)
              }
            />
          </label>
          <button
            type="button"
            className="ui-action ui-action--primary"
            data-testid={`contact-ask-${contact.personId}`}
            onClick={() => onAsk(askOn)}
          >
            {ask.label}
          </button>
        </div>
      ) : ask ? (
        <p data-testid={`contact-ask-unavailable-${contact.personId}`}>
          {ask.unavailableReason}
        </p>
      ) : null}
    </li>
  );
}
