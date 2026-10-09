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
import { proseDate } from "../presentation/prose-dates";
import { AfterOfficeEndorsementPanel } from "./AfterOfficeEndorsementPanel";
import "./contacts.css";

/**
 * Who this life can reach, and what is outstanding between them.
 *
 * The mount for PEOPLE's `projectContacts` seam (CRUNCH47 B1/P3). Menu reset
 * (MR-6): the screen shows record data and control names only. Everything
 * on it is the adapter's answer: the name, the relationship and the ground
 * the two of them share, the ways of getting in touch, the day they were last
 * in touch, and a request waiting on the player. Nothing here composes a
 * sentence; the adapter's own sentences (how things stand, the last answer, a
 * channel's or an action's reason) ride on data attributes until the English
 * engine says them.
 *
 * Three rules this surface keeps:
 *
 * - A channel is never a control: the seam has no per-channel command. One
 *   that cannot be used now is drawn as blocked.
 * - Offering another day is an answer AND a request of its own, so it carries
 *   its own day, chosen here by the player. This surface never composes an
 *   offer on their behalf.
 * - A command that refuses leaves the World untouched and the row as it was.
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

  // A refusal changes nothing, so the row stays as it was.
  function run(work: () => World) {
    try {
      const next = work();
      if (next !== world) onWorldChange(next);
    } catch {
      return;
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
                const input = { personId, otherPersonId: contact.personId };
                run(() =>
                  kind === "ask-to-be-a-couple"
                    ? askToBeTogether(world, input).world
                    : breakUp(world, input).world,
                );
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
                  onClick={() =>
                    run(
                      () =>
                        goMeetSomebodyNew(world, {
                          personId,
                          setting: option.setting,
                          viaPersonId: option.viaPersonId,
                        }).world,
                    )
                  }
                >
                  {option.label}
                </button>
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
        The day they were last in touch, when the world knows it: an unknown
        last contact is not "never". Someone the player lives with has no
        such day to show.
      */}
      {!contact.livesWithYou && contact.lastContactSpoken ? (
        <p
          className="pg-contact-line"
          data-out-of-touch={contact.outOfTouch ? "true" : undefined}
        >
          <span className="pg-contact-label">Last in touch</span>{" "}
          {contact.lastContactSpoken}
        </p>
      ) : null}
      {/* The adapter's sentences wait for the English engine. */}
      {contact.lastAnswer ? (
        <span
          hidden
          data-testid={tid(`contact-last-answer-${contact.personId}`)}
          data-last-answer={contact.lastAnswer}
        />
      ) : null}
      {contact.standing ? (
        <span
          hidden
          data-testid={tid(`contact-standing-${contact.personId}`)}
          data-standing={contact.standing}
        />
      ) : null}
      {contact.lookBack.length > 0 ? (
        <details
          className="pg-contact-line"
          data-testid={tid(`contact-lookback-${contact.personId}`)}
        >
          <summary>Past between you</summary>
          <ul>
            {contact.lookBack.map((entry) => (
              <li key={entry.id}>
                {proseDate(entry.at)}: {entry.text}
              </li>
            ))}
          </ul>
        </details>
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
              data-note={channel.note ?? undefined}
              data-testid={tid(
                `contact-channel-${contact.personId}-${channel.kind}`,
              )}
            >
              {channel.label}
            </li>
          ))}
        </ul>
      ) : null}

      {theyAsked ? (
        <div className="pg-contact-ask">
          <p data-testid={tid(`contact-outstanding-${contact.personId}`)}>
            {[contact.name, theyAsked.onSpoken, theyAsked.purpose].join(" · ")}
          </p>
          <div className="pg-contact-actions">
            <button
              type="button"
              className="ui-action ui-action--primary"
              data-testid={tid(`contact-accept-${contact.personId}`)}
              onClick={() => onAnswer(theyAsked.eventId, "accept")}
            >
              Accept
            </button>
            <button
              type="button"
              className="ui-action"
              data-testid={tid(`contact-decline-${contact.personId}`)}
              onClick={() => onAnswer(theyAsked.eventId, "decline")}
            >
              Decline
            </button>
          </div>
          {/*
            Offering another day is an answer and a fresh request at once, so
            it carries the day the player picks here. Nothing offers for them.
            The allowed days are the input's own min and max.
          */}
          <div className="pg-contact-actions">
            <label className="pg-contact-day">
              <span>Another day</span>
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
            >
              Offer
            </button>
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
            >
              {couple.label}
            </button>
          </div>
        ) : (
          <span
            hidden
            data-testid={tid(`contact-couple-unavailable-${contact.personId}`)}
            data-reason={couple.unavailableReason ?? undefined}
          />
        )
      ) : null}
    </li>
  );
}
