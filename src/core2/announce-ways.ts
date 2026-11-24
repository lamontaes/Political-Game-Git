/**
 * The ways a person can say they are running, and who would hear it (owner,
 * Nov 17: "Maybe you're talking to a friend and you say, well, I guess I'm a
 * candidate now... Or maybe you go to the party headquarters in your city, if
 * it has one... Or maybe you go to a rally, or maybe you just start talking to
 * people... There needs to be a bunch of different ways."; CTO on #9995: only
 * the ways that fit are offered, a party office only where a local party
 * organization is on record, a public event only when one is on the calendar;
 * rivals use the same ways). Read from the records the person already has:
 * their family and household and how close each is, their party tie and that
 * party's organization in town, and a town hall or gathering they are part of
 * today. Story's scenes are the player's doors to these ways (#9750); a rival
 * takes one through the candidacy engine's chooser (`candidacy.ts`).
 */
import type { CoreAPI, PersonId } from "./types";
import type { AnnouncedBy } from "./modules/elections";
import { closenessBetween } from "./closeness";
import { PARTIES_MODULE_ID, partyTie, partiesHere } from "./modules/parties";
import { MEETINGS_MODULE_ID, type TownHallRow } from "./modules/meetings";
import { PUBLIC_ACTION_MODULE_ID, type ActionRow } from "./modules/people";

export type AnnounceChannel = AnnouncedBy["channel"];

/** One way to say so: whether it fits today, why not when it does not, where, and who would hear it. */
export interface AnnounceWay {
  readonly channel: AnnounceChannel;
  readonly offered: boolean;
  /** Why it is not offered, by the record that is missing; null when it is. */
  readonly missing:
    | "no-one-close"
    | "no-party"
    | "no-party-office"
    | "no-one-at-the-office"
    | "no-public-moment"
    | "knows-no-one"
    | null;
  readonly venueId: string | null;
  /** Who would hear it, closest first. */
  readonly reach: readonly PersonId[];
}

function byCloseness(
  api: CoreAPI,
  personId: PersonId,
  ids: Iterable<PersonId>,
): PersonId[] {
  return [...new Set(ids)]
    .filter((id) => id !== personId && api.state.people.get(id)?.alive)
    .map((id) => ({ id, close: closenessBetween(api.state, personId, id) }))
    .sort((a, b) => b.close - a.close || a.id.localeCompare(b.id))
    .map((row) => row.id);
}

/** The ways a person has today to say they are running, each with who would hear it. */
export function announceWays(
  api: CoreAPI,
  personId: PersonId,
): readonly AnnounceWay[] {
  const person = api.state.people.get(personId);
  if (!person) return [];
  const today = api.state.date;
  // A word to someone close: their family and the people they live with.
  const household = [...api.state.people.values()]
    .filter(
      (other) =>
        other.householdId === person.householdId && other.id !== personId,
    )
    .map((other) => other.id);
  const close = byCloseness(api, personId, [...person.familyIds, ...household]);
  // The party's office: the party they are tied to, where its organization is
  // on record in their town; its leader hears it where one is named.
  const tie = api.state.modules.has(PARTIES_MODULE_ID)
    ? partyTie(api, personId)
    : null;
  const party = tie?.partyId
    ? partiesHere(api).find((row) => row.id === tie.partyId)
    : undefined;
  const office = party
    ? api.state.organizations.get(party.organizationId)
    : undefined;
  const officeHere = office !== undefined && office.placeId === person.placeId;
  // Its leader hears it, unless the runner leads it themself: then no one at
  // the office is on record to tell.
  const officeReach =
    officeHere && party?.leaderId
      ? byCloseness(api, personId, [party.leaderId])
      : [];
  // A public moment: a town hall they are in today, else a strike, protest or
  // rally in town they are part of while it goes on.
  const hall = api.state.modules.has(MEETINGS_MODULE_ID)
    ? (
        api
          .moduleState(MEETINGS_MODULE_ID)
          .table("townHalls")
          .rows() as unknown as TownHallRow[]
      ).find(
        (row) =>
          row.date === today &&
          row.hostId !== personId &&
          row.attendeeIds.includes(personId),
      )
    : undefined;
  const gathering =
    hall || !api.state.modules.has(PUBLIC_ACTION_MODULE_ID)
      ? undefined
      : (
          api
            .moduleState(PUBLIC_ACTION_MODULE_ID)
            .table("actions")
            .query("byPlace", [person.placeId]) as unknown as ActionRow[]
        ).find(
          (row) =>
            row.endedOn === null && row.participantIds.includes(personId),
        );
  const moment = hall
    ? { id: hall.id, ids: hall.attendeeIds }
    : gathering
      ? { id: gathering.id, ids: gathering.participantIds }
      : null;
  // Asking someone for their vote: anyone they know outside their family.
  const closeSet = new Set(close);
  const known = byCloseness(
    api,
    personId,
    [...person.knownIds].filter((id) => !closeSet.has(id)),
  );
  return [
    {
      channel: "word",
      offered: close.length > 0,
      missing: close.length ? null : "no-one-close",
      venueId: null,
      reach: close,
    },
    {
      channel: "party-office",
      offered: officeReach.length > 0,
      missing: officeReach.length
        ? null
        : officeHere
          ? "no-one-at-the-office"
          : party
            ? "no-party-office"
            : "no-party",
      venueId: officeReach.length ? office!.id : null,
      reach: officeReach,
    },
    {
      channel: "public",
      offered: moment !== null,
      missing: moment ? null : "no-public-moment",
      venueId: moment?.id ?? null,
      reach: moment ? byCloseness(api, personId, moment.ids) : [],
    },
    {
      channel: "asking",
      offered: known.length > 0,
      missing: known.length ? null : "knows-no-one",
      venueId: null,
      reach: known,
    },
  ];
}

/**
 * Who hears it the day a way is taken: one person for a word or an ask (the
 * closest of those it reaches, as a person tells the one they are nearest
 * first), everyone the venue holds for the party's office or a public moment.
 */
export function heardOnTheDay(way: AnnounceWay): AnnouncedBy {
  const one = way.channel === "word" || way.channel === "asking";
  return {
    channel: way.channel,
    heardBy: one ? way.reach.slice(0, 1) : [...way.reach],
    venueId: way.venueId,
  };
}
