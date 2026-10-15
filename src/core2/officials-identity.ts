/**
 * Who a state or federal officeholder is, before anyone fills them in.
 *
 * Two-level population: a named official outside the player's town is a
 * stable identity (name, gender, birth date, home state) drawn from the world
 * seed and the seat, so the same person comes back every time. They become a
 * full person when CORE's fill-in reads this identity. Who exists is seeded
 * generation; nothing here decides what anyone does.
 *
 * No real names: a full name matching a real current officeholder is redrawn,
 * name only.
 */
import { SeededRng } from "./kernel/rng";
import { generatePersonIdentity } from "./gov-rules/person-identity";
import { drawCohortGivenName } from "./gov-rules/given-name-cohorts";
import {
  getNameCorpus,
  givenNamePoolForCorpus,
  nameCorpusVersionForPlace,
  PLACE_NAMES_V1_VERSION,
} from "./gov-rules/names-data";
import {
  inventedPersonBirthDate,
  type InventedPersonRole,
} from "./gov-rules/invented-person-age";
import { isRealOfficeholderName } from "./officials-names";
import { makeIsoDate } from "./kernel/dates";

export interface OfficialIdentity {
  readonly givenName: string;
  readonly familyName: string;
  readonly gender: "female" | "male" | "nonbinary";
  readonly birthDate: string;
  /** How many draws the real-name check refused before this one. */
  readonly realNameRedraws: number;
}

export function drawOfficialIdentity(input: {
  readonly worldSeed: string;
  readonly seatKey: string;
  readonly stateUsps: string;
  readonly role: InventedPersonRole;
  readonly referenceDate: string;
  readonly legalMinimumAge?: number;
  /** Family names this person mustn't share (an unrelated running mate's or pair's). */
  readonly avoidFamilyNames?: readonly string[];
}): OfficialIdentity {
  const rng = new SeededRng(input.worldSeed).fork(`official:${input.seatKey}`);
  const identity = generatePersonIdentity(rng.fork("gender"));
  const gender =
    identity.gender === "female" || identity.gender === "male"
      ? identity.gender
      : "nonbinary";
  const birthDate = inventedPersonBirthDate(rng.fork("birth"), {
    role: input.role,
    referenceDate: makeIsoDate(input.referenceDate),
    ...(input.legalMinimumAge === undefined
      ? {}
      : { legalMinimumAge: input.legalMinimumAge }),
  });
  const corpus = getNameCorpus(
    nameCorpusVersionForPlace(input.stateUsps, PLACE_NAMES_V1_VERSION),
  );
  for (let attempt = 0; ; attempt += 1) {
    const names = rng.fork(`name:${attempt}`);
    const givenName =
      (gender !== "nonbinary"
        ? drawCohortGivenName(names, gender, Number(birthDate.slice(0, 4)))
        : null) ?? names.pick(givenNamePoolForCorpus(corpus, gender));
    const familyName = names.pick(corpus.familyNames);
    if (
      !isRealOfficeholderName(givenName, familyName) &&
      !(input.avoidFamilyNames ?? []).includes(familyName)
    )
      return {
        givenName,
        familyName,
        gender,
        birthDate,
        realNameRedraws: attempt,
      };
  }
}
