import { useMemo, useState } from "react";
import type { EntityId, IsoDate, World } from "../simulation";
import {
  answerMeeting,
  askToBeTogether,
  breakUp,
  goMeetSomebodyNew,
  meetingNewOptions,
  offerAnotherDay,
  projectContacts,
} from "../presentation/people-contacts";
import type { ContactEntry } from "../presentation/people-contacts";
import { AfterOfficeEndorsementPanel } from "./AfterOfficeEndorsementPanel";
import "./contacts.css";

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
  query = "",
  contactEntry,
  focused = false,
}: {
  readonly world: World;
  readonly personId: EntityId;
  readonly onWorldChange: (world: World) => void;
  readonly query?: string;
  readonly contactEntry?: ContactEntry;
  /**
   * Drawn inside the contact screen for one person, which already names them
   * at its top: no section heading, no second name line, and test ids of its
   * own so the list underneath is never mistaken for it.
   */
  readonly focused?: boolean;
}) {
  const view = useMemo(
    () => projectContacts(world, personId),
    [world, personId],
  );
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
      if (next !== world) onWorldChange(next);
    } catch {
      // No authored refusal or error text is rendered on this screen.
    }
  }

  const newOptions = useMemo(
    () => (focused ? [] : meetingNewOptions(world, personId)),
    [world, personId, focused],
  );

  const shown = (contactEntry ? [contactEntry] : view.contacts).filter(
    (contact) => contact.name.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div
      className={
        focused
          ? "pg-contacts pg-contacts--focused"
          : "pg-personal-section pg-contacts"
      }
      data-testid={focused ? "contact-focus-panel" : "contacts"}
    >
      <AfterOfficeEndorsementPanel
        world={world}
        personId={personId}
        onWorldChange={onWorldChange}
      />
      {!contactEntry && view.contacts.length === 0 ? (
        <p data-testid="contacts-empty" data-problem="no-contacts" />
      ) : (
        <ul className="pg-contacts-list">
          {shown.map((contact) => (
            <ContactRow
              key={contact.personId}
              contact={contact}
              focused={focused}
              earliest={view.earliestMeetingOn}
              latest={view.latestMeetingOn}
              offerOn={dayFor(`offer:${contact.personId}`)}
              onDayChange={(which, on) =>
                setDays((current) => ({
                  ...current,
                  [`${which}:${contact.personId}`]: on,
                }))
              }
              onCouple={(kind) => {
                try {
                  const input = { personId, otherPersonId: contact.personId };
                  const done =
                    kind === "ask-to-be-a-couple"
                      ? askToBeTogether(world, input)
                      : breakUp(world, input);
                  if (done.world !== world) onWorldChange(done.world);
                } catch {
                  // No authored refusal or error text is rendered on this screen.
                }
              }}
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
      {newOptions.length > 0 ? (
        <div className="pg-contacts-new" data-testid="meet-new">
          <ul className="pg-contacts-new-list">
            {newOptions.map((option) => (
              <li key={option.key}>
                <button
                  type="button"
                  data-testid={`meet-new-${option.key}`}
                  onClick={() => {
                    try {
                      const met = goMeetSomebodyNew(world, {
                        personId,
                        setting: option.setting,
                        viaPersonId: option.viaPersonId,
                      });
                      if (met.world !== world) onWorldChange(met.world);
                    } catch {
                      // No authored refusal or error text is rendered on this screen.
                    }
                  }}
                ></button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

/**
 * Who they are to you, said once: the relationship the world records and the
 * ground the two of you share, without repeating a phrase both carry.
 */
function contactMeta(contact: ContactEntry): string | null {
  const parts: string[] = [];
  for (const part of [contact.relationshipLabel, ...contact.basis]) {
    if (!part) continue;
    if (parts.some((seen) => seen.toLowerCase() === part.toLowerCase()))
      continue;
    parts.push(part);
  }
  return parts.length > 0 ? parts.join(" · ") : null;
}

function ContactRow({
  contact,
  focused,
  earliest,
  latest,
  offerOn,
  onDayChange,
  onCouple,
  onAnswer,
  onOfferAnotherDay,
}: {
  readonly contact: ContactEntry;
  readonly focused: boolean;
  readonly earliest: IsoDate;
  readonly latest: IsoDate;
  readonly offerOn: IsoDate;
  readonly onDayChange: (which: "ask" | "offer", on: IsoDate) => void;
  readonly onCouple: (kind: "ask-to-be-a-couple" | "end-couple") => void;
  readonly onAnswer: (eventId: EntityId, answer: "accept" | "decline") => void;
  readonly onOfferAnotherDay: (eventId: EntityId, on: IsoDate) => void;
}) {
  /* The contact screen's copy of a row carries its own ids. */
  const tid = (base: string) =>
    focused ? base.replace(/^contact-/, "contact-focus-") : base;
  const couple = contact.actions.find(
    (action) =>
      action.kind === "ask-to-be-a-couple" || action.kind === "end-couple",
  );
  const theyAsked =
    contact.outstanding?.direction === "they-asked"
      ? contact.outstanding
      : null;
  const meta = contactMeta(contact);
  return (
    <li className="pg-contact" data-testid={tid(`contact-${contact.personId}`)}>
      {focused ? null : (
        <div className="pg-contact-head">
          <strong className="pg-contact-name">{contact.name}</strong>
          {meta ? <span className="pg-contact-meta">{meta}</span> : null}
        </div>
      )}
      {focused && meta ? <p className="pg-contact-meta">{meta}</p> : null}
      {/*
        When they were last in touch, when the world knows. With no date there
        is nothing to say: an unknown last contact is not "never".
      */}
      {contact.livesWithYou ? (
        <p className="pg-contact-line" data-lives-with-you="true" />
      ) : contact.lastContactSpoken ? (
        <p
          className="pg-contact-line"
          data-out-of-touch={contact.outOfTouch ? "true" : undefined}
        >
          {contact.lastContactSpoken}
        </p>
      ) : null}
      {contact.lastAnswer ? (
        <p
          className="pg-contact-line"
          data-testid={tid(`contact-last-answer-${contact.personId}`)}
          data-last-answer={contact.lastAnswer}
        />
      ) : null}
      {/* How things stand between them, when there is something to say. */}
      {contact.standing ? (
        <p
          className="pg-contact-line"
          data-testid={tid(`contact-standing-${contact.personId}`)}
          data-standing={contact.standing}
        />
      ) : null}

      {/*
        Ways of reaching them. Informational by design: the seam's commands are
        asking and answering, so no channel is drawn as a control.
      */}
      {contact.channels.length > 0 ? (
        <ul className="pg-contact-channels">
          {contact.channels.map((channel) => (
            <li
              key={channel.kind}
              data-blocked={channel.note ? "true" : "false"}
              data-testid={tid(
                `contact-channel-${contact.personId}-${channel.kind}`,
              )}
            >
              {channel.note
                ? `${channel.label} — ${channel.note}`
                : channel.label}
            </li>
          ))}
        </ul>
      ) : null}

      {theyAsked ? (
        <div className="pg-contact-ask">
          <p data-testid={tid(`contact-outstanding-${contact.personId}`)}>
            {contact.name} · {theyAsked.onSpoken} · {theyAsked.purpose}
          </p>
          <div className="pg-contact-actions">
            <button
              type="button"
              className="ui-action ui-action--primary"
              data-testid={tid(`contact-accept-${contact.personId}`)}
              onClick={() => onAnswer(theyAsked.eventId, "accept")}
            ></button>
            <button
              type="button"
              className="ui-action"
              data-testid={tid(`contact-decline-${contact.personId}`)}
              onClick={() => onAnswer(theyAsked.eventId, "decline")}
            ></button>
          </div>
          {/*
            Offering another day is an answer and a fresh request at once, so
            it carries the day the player picks here. Nothing offers for them.
            The allowed days are the input's own min and max.
          */}
          <div className="pg-contact-actions">
            <label className="pg-contact-day">
              <input
                type="date"
                min={earliest}
                max={latest}
                value={offerOn}
                data-testid={tid(`contact-offer-day-${contact.personId}`)}
                onChange={(event) =>
                  onDayChange("offer", event.target.value as IsoDate)
                }
              />
            </label>
            <button
              type="button"
              className="ui-action"
              data-testid={tid(`contact-offer-${contact.personId}`)}
              onClick={() => onOfferAnotherDay(theyAsked.eventId, offerOn)}
            ></button>
          </div>
        </div>
      ) : null}

      {/* Becoming a couple is asked in person and answered at once. */}
      {couple ? (
        couple.available ? (
          <div className="pg-contact-actions">
            <button
              type="button"
              className="ui-action"
              data-testid={tid(`contact-${couple.kind}-${contact.personId}`)}
              onClick={() =>
                onCouple(couple.kind as "ask-to-be-a-couple" | "end-couple")
              }
            ></button>
          </div>
        ) : (
          <p
            className="pg-contact-line"
            data-testid={tid(`contact-couple-unavailable-${contact.personId}`)}
          >
            {couple.unavailableReason}
          </p>
        )
      ) : null}
    </li>
  );
}
