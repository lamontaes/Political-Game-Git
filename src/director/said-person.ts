/**
 * A person as the said-as reader (`../english/said-as`) reads them, from the
 * world's records: their name and pronouns, the office they hold (the
 * officials engine's office kind), what they are to the listener and to the
 * speaker (the family records), what the speaker calls them, and whether the
 * listener knows who they are. The one place a composer turns a person id
 * into something the reader can say (words composer, part 2).
 */
import { familyFactsOf } from "../core2/closeness";
import type { CoreState, PersonId } from "../core2/types";
import { kinAddress } from "../english/journal-words";
import type { SaidPerson } from "../english/said-as";
import type { Telling } from "../english/telling";
import { officeKindSaid } from "./said-office";
import { whatTheyAre } from "./who-they-are";

export function saidPersonOf(
  core: Readonly<CoreState>,
  personId: string,
  telling: Pick<Telling, "speakerId" | "listenerId">,
): SaidPerson {
  const person = core.people.get(personId);
  const listener = core.people.get(telling.listenerId);
  const speaker = core.people.get(telling.speakerId);
  const officeKind = officeKindSaid(core, personId);
  const toListener = familyFactsOf(listener).get(personId)?.relation;
  const toSpeaker = familyFactsOf(speaker).get(personId)?.relation;
  const gender = person?.looks?.gender;
  const called =
    personId === telling.listenerId
      ? ((toSpeaker && gender && kinAddress(toSpeaker, gender)) ??
        person?.givenName)
      : undefined;
  // What they are to the listener, when the listener has not met them (rule 136).
  const what =
    personId !== telling.listenerId
      ? whatTheyAre(core, telling.listenerId as PersonId, personId as PersonId)
      : null;
  return {
    id: personId,
    givenName: person?.givenName ?? "",
    familyName: person?.familyName ?? "",
    ...(person?.looks?.pronouns ? { pronouns: person.looks.pronouns } : {}),
    ...(gender ? { gender } : {}),
    ...(officeKind ? { officeKind } : {}),
    ...(toListener ? { toListener } : {}),
    ...(toSpeaker ? { toSpeaker } : {}),
    ...(called ? { calledBySpeaker: called } : {}),
    knownToListener:
      !!listener?.knownIds.has(personId) || !!toListener || !!officeKind,
    ...(what ? { what } : {}),
  };
}
