/**
 * A person as the said-as reader (`../english/said-as`) reads them, from the
 * world's records: their name and pronouns, the office they hold (the
 * officials engine's office kind), what they are to the listener and to the
 * speaker (the family records), what the speaker calls them, and whether the
 * listener knows who they are. The one place a composer turns a person id
 * into something the reader can say (words composer, part 2).
 */
import { familyFactsOf } from "../core2/closeness";
import { officialOf } from "../core2/modules/officials";
import { coreAPI } from "../core2/state";
import type { CoreState } from "../core2/types";
import { kinAddress } from "../english/journal-words";
import { officeWords, type SaidPerson } from "../english/said-as";
import type { Telling } from "../english/telling";

export function saidPersonOf(
  core: Readonly<CoreState>,
  personId: string,
  telling: Pick<Telling, "speakerId" | "listenerId">,
): SaidPerson {
  const person = core.people.get(personId);
  const listener = core.people.get(telling.listenerId);
  const speaker = core.people.get(telling.speakerId);
  const official = officialOf(coreAPI(core as CoreState), personId);
  // A chamber's presiding officer is said by that role ("Speaker"), when the
  // words hold one for their body (`<office kind>:presiding`).
  const officeKind =
    official?.leadership === "presiding" &&
    officeWords(`${official.officeKind}:presiding`)
      ? `${official.officeKind}:presiding`
      : official?.officeKind;
  const toListener = familyFactsOf(listener).get(personId)?.relation;
  const toSpeaker = familyFactsOf(speaker).get(personId)?.relation;
  const gender = person?.looks?.gender;
  const called =
    personId === telling.listenerId
      ? ((toSpeaker && gender && kinAddress(toSpeaker, gender)) ??
        person?.givenName)
      : undefined;
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
  };
}
