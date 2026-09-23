import { addDays, personName } from "../simulation";
import type { EntityId, IsoDate, World } from "../simulation";
import {
  CONTACT_ACCEPTED_EVENT,
  CONTACT_DECLINED_EVENT,
  CONTACT_MAXIMUM_NOTICE_DAYS,
  CONTACT_MINIMUM_NOTICE_DAYS,
  answerContact,
  contactBases,
  contactProposals,
  counterWithNewDay,
  proposeContact,
} from "../simulation/people-contact";
import type {
  ContactChannel,
  ContactProposal,
} from "../simulation/people-contact";
import { describePersonContext } from "../simulation/person-context";
import {
  describeRelationshipStanding,
  readRelationshipStanding,
} from "../simulation/relationship-standing";
import {
  introducedPeople,
  introductionCandidates,
  introductionSettingPhrase,
  meetSomebodyNew,
} from "../simulation/social-introductions";
import type { IntroductionSetting } from "../simulation/social-introductions";
import { proseDate } from "./prose-dates";

/**
 * Who the played person can reach, and what is outstanding between them
 * (CRUNCH47 B1, P3, the adapter A asked for).
 *
 * One projection per played person. Each entry says how the two of them
 * actually overlap, which ways of getting in touch exist, and — where one
 * cannot be used right now — why, in a sentence. A channel is never a promise
 * that the other person will say yes.
 *
 * Pure. The commands below are the only writers, and none of them spends time.
 */

export interface ContactAction {
  readonly kind: "ask-to-meet" | "answer-proposal";
  readonly label: string;
  readonly available: boolean;
  readonly unavailableReason: string | null;
}

export interface OutstandingProposal {
  readonly eventId: EntityId;
  readonly direction: "you-asked" | "they-asked";
  readonly on: IsoDate;
  readonly onSpoken: string;
  readonly purpose: string;
}

export interface ContactEntry {
  readonly personId: EntityId;
  readonly name: string;
  /** How the interface names the relationship, as the world records it. */
  readonly relationshipLabel: string | null;
  readonly basis: readonly string[];
  readonly lastContactOn: IsoDate | null;
  readonly lastContactSpoken: string | null;
  readonly outOfTouch: boolean;
  /**
   * Whether they live with the played person now. Living together is being in
   * touch, so the screen says so rather than quoting the last date something
   * happened to be recorded between them.
   */
  readonly livesWithYou: boolean;
  /**
   * How the played person stands with them, in the same sentence the person
   * card uses: a falling out, a debt or a friendship gone quiet. Null when
   * there is nothing past the ordinary to say.
   */
  readonly standing: string | null;
  /**
   * What became of the last time one of them asked the other, while it still
   * matters: the day has not come yet, or the answer is under a week old.
   * Without it an answered request simply vanished and the Ask button came
   * back, which read as though the request had been lost.
   */
  readonly lastAnswer: string | null;
  readonly channels: readonly ContactChannel[];
  readonly actions: readonly ContactAction[];
  readonly outstanding: OutstandingProposal | null;
}

export interface ContactsView {
  readonly personId: EntityId;
  readonly earliestMeetingOn: IsoDate;
  readonly latestMeetingOn: IsoDate;
  /** The same two dates said the way a person says them. */
  readonly earliestMeetingSpoken: string;
  readonly latestMeetingSpoken: string;
  readonly contacts: readonly ContactEntry[];
}

export function projectContacts(
  world: World,
  personId: EntityId,
): ContactsView {
  const proposals = contactProposals(world, personId).filter(
    (proposal) => !proposal.answered,
  );
  const contacts = contactBases(world, personId).map((basis): ContactEntry => {
    const outstanding = outstandingWith(proposals, personId, basis.personId);
    const standing = readRelationshipStanding(world, personId, basis.personId);
    const livesWithYou = standing.absence.sharesHome;
    const waiting =
      outstanding?.direction === "you-asked"
        ? `You asked, and ${basis.name} has not answered yet.`
        : null;
    return {
      personId: basis.personId,
      name: basis.name,
      relationshipLabel:
        describePersonContext(world, personId, basis.personId)?.relationship ??
        null,
      basis: basis.basis,
      lastContactOn: basis.lastContactOn,
      lastContactSpoken: basis.lastContactOn
        ? proseDate(basis.lastContactOn)
        : null,
      outOfTouch: !livesWithYou && basis.gap === "long-gap",
      livesWithYou,
      lastAnswer: lastAnswerBetween(world, personId, basis.personId),
      standing: describeRelationshipStanding(
        standing,
        world.people[basis.personId]?.givenName ?? basis.name,
      ),
      channels: basis.channels,
      actions: [
        {
          kind: "ask-to-meet",
          label: `Ask ${basis.name} to meet`,
          available: !outstanding,
          unavailableReason:
            waiting ??
            (outstanding
              ? `${basis.name} has asked you first; answer that.`
              : null),
        },
        ...(outstanding && outstanding.direction === "they-asked"
          ? [
              {
                kind: "answer-proposal" as const,
                label: `Answer ${basis.name} about ${outstanding.onSpoken}`,
                available: true,
                unavailableReason: null,
              },
            ]
          : []),
      ],
      outstanding,
    };
  });
  return {
    personId,
    earliestMeetingOn: addDays(world.currentDate, CONTACT_MINIMUM_NOTICE_DAYS),
    latestMeetingOn: addDays(world.currentDate, CONTACT_MAXIMUM_NOTICE_DAYS),
    // The same two dates said the way a person says them, so a screen never
    // has to print an ISO string at somebody.
    earliestMeetingSpoken: proseDate(
      addDays(world.currentDate, CONTACT_MINIMUM_NOTICE_DAYS),
    ),
    latestMeetingSpoken: proseDate(
      addDays(world.currentDate, CONTACT_MAXIMUM_NOTICE_DAYS),
    ),
    contacts,
  };
}

function outstandingWith(
  proposals: readonly ContactProposal[],
  personId: EntityId,
  otherId: EntityId,
): OutstandingProposal | null {
  const found = proposals.find(
    (proposal) =>
      proposal.fromPersonId === otherId || proposal.toPersonId === otherId,
  );
  if (!found) return null;
  return {
    eventId: found.eventId,
    direction: found.fromPersonId === personId ? "you-asked" : "they-asked",
    on: found.on,
    onSpoken: proseDate(found.on),
    purpose: found.purpose,
  };
}

/** Ask somebody to meet on a day. Asking costs no time; the meeting will. */
export function askToMeet(
  world: World,
  input: {
    readonly personId: EntityId;
    readonly otherPersonId: EntityId;
    readonly on: IsoDate;
    readonly purpose?: string;
  },
): World {
  if (
    world.control.kind !== "person" ||
    world.control.personId !== input.personId
  ) {
    throw new Error("Only the character being played can ask to meet.");
  }
  const other = world.people[input.otherPersonId];
  if (!other) throw new Error("There is nobody there to ask.");
  return proposeContact(world, {
    stableKey: `contact:${input.personId}:${input.otherPersonId}:${input.on}`,
    fromPersonId: input.personId,
    toPersonId: input.otherPersonId,
    on: input.on,
    purpose: input.purpose?.trim() ? input.purpose : `See ${personName(other)}`,
  }).world;
}

/** Answer a proposal somebody made to the played person. */
export function answerMeeting(
  world: World,
  input: {
    readonly proposalEventId: EntityId;
    readonly answer: "accept" | "decline";
  },
): World {
  return answerContact(world, {
    proposalEventId: input.proposalEventId,
    answer: input.answer,
  }).world;
}

/** Offer a different day, which is an answer and a request of its own. */
export function offerAnotherDay(
  world: World,
  input: { readonly proposalEventId: EntityId; readonly on: IsoDate },
): World {
  return counterWithNewDay(world, {
    proposalEventId: input.proposalEventId,
    on: input.on,
  });
}

/** How long an answer stays on the row once its day has passed. Display only. */
const ANSWER_SHOWN_FOR_DAYS = 7;

function lastAnswerBetween(
  world: World,
  personId: EntityId,
  otherId: EntityId,
): string | null {
  const proposal = contactProposals(world, personId)
    .filter(
      (entry) =>
        entry.answered &&
        (entry.fromPersonId === otherId || entry.toPersonId === otherId),
    )
    .at(-1);
  if (!proposal) return null;
  const answer = world.history.events
    .filter(
      (event) =>
        (event.type === CONTACT_ACCEPTED_EVENT ||
          event.type === CONTACT_DECLINED_EVENT) &&
        event.tags.includes(`contact.proposal:${proposal.eventId}`),
    )
    .at(-1);
  if (!answer) return null;
  const stillMatters =
    proposal.on >= world.currentDate ||
    addDays(answer.occurredAt, ANSWER_SHOWN_FOR_DAYS) >= world.currentDate;
  if (!stillMatters) return null;
  const other = world.people[otherId];
  if (!other) return null;
  const name = other.givenName;
  const day = proseDate(proposal.on);
  const theyAnswered = proposal.fromPersonId === personId;
  if (answer.tags.includes("contact.lapsed")) {
    return theyAnswered
      ? `You asked to meet on ${day}, and ${name} never answered.`
      : `${name} asked to meet on ${day}, and the day passed without an answer.`;
  }
  if (answer.type === CONTACT_ACCEPTED_EVENT) {
    return theyAnswered
      ? `${name} said yes to meeting on ${day}.`
      : `You said yes to meeting ${name} on ${day}.`;
  }
  return theyAnswered
    ? `${name} could not meet on ${day}.`
    : `You told ${name} you could not meet on ${day}.`;
}

/** One way the played person can go and meet somebody new today. */
export interface MeetingNewOption {
  readonly key: string;
  readonly setting: IntroductionSetting;
  readonly viaPersonId: EntityId | null;
  readonly label: string;
}

const MEETING_NEW_LABELS: Record<
  Exclude<IntroductionSetting, "group" | "friend-of-friend">,
  string
> = {
  work: "Get to know somebody at work",
  study: "Get to know somebody on your program",
};

/**
 * Where the played person could go and meet somebody new: one choice per
 * setting the world gives them, and one per friend with people to introduce.
 * Only settings with somebody real in them are offered. Pure.
 */
export function meetingNewOptions(
  world: World,
  personId: EntityId,
): readonly MeetingNewOption[] {
  const options: MeetingNewOption[] = [];
  const seen = new Set<string>();
  for (const candidate of introductionCandidates(world, personId)) {
    const via =
      candidate.setting === "friend-of-friend" ? candidate.viaPersonId : null;
    const key = `${candidate.setting}:${via ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const label =
      candidate.setting === "group"
        ? `Meet somebody ${introductionSettingPhrase(world, candidate)}`
        : candidate.setting === "friend-of-friend"
          ? `Ask ${world.people[via!]!.givenName} to introduce you to somebody`
          : MEETING_NEW_LABELS[candidate.setting];
    options.push({ key, setting: candidate.setting, viaPersonId: via, label });
  }
  return options;
}

/**
 * Go and meet somebody new. Who it is belongs to the world: one of the real
 * people in that setting. Returns the new World and the sentence saying who.
 */
export function goMeetSomebodyNew(
  world: World,
  input: {
    readonly personId: EntityId;
    readonly setting: IntroductionSetting;
    readonly viaPersonId: EntityId | null;
  },
): { readonly world: World; readonly said: string } {
  if (
    world.control.kind !== "person" ||
    world.control.personId !== input.personId
  ) {
    throw new Error("Only the character being played can go and meet people.");
  }
  const before = new Set(introducedPeople(world, input.personId));
  const next = meetSomebodyNew(
    world,
    input.personId,
    input.setting,
    input.viaPersonId,
  );
  const met = introducedPeople(next, input.personId).find(
    (id) => !before.has(id),
  );
  const said = met
    ? `You met ${personName(next.people[met]!)}.`
    : "You met nobody new.";
  return { world: next, said };
}
