import { citizenshipSharesForJurisdiction } from "./county-citizenship";
import { SeededRng } from "./rng";
import type {
  CitizenshipStatus,
  CitizenshipStatusRecord,
} from "./citizenship-types";
import type { IsoDate, Person } from "./types";

/** CTO6011713499: a generated starting attribute, never a gameplay decision.
 * It uses only seed, canonical person identity, and actual place shares.
 */
export function initializePersonCitizenship(
  person: Person,
  worldSeed: string,
  createdAt: IsoDate,
): Person {
  if (person.citizenshipStatuses?.length) return person;
  const source = citizenshipSharesForJurisdiction(person.homeJurisdictionId);
  const options: readonly [CitizenshipStatus, number][] = [
    ["citizen-by-birth", source.counts.citizenByBirth],
    ["naturalized-citizen", source.counts.naturalizedCitizen],
    ["noncitizen", source.counts.noncitizen],
  ];
  const total = options.reduce((sum, [, count]) => sum + count, 0);
  if (!Number.isSafeInteger(total) || total <= 0)
    throw new Error(
      "Citizenship starting estimates require published population counts.",
    );
  let position = new SeededRng(worldSeed)
    .fork(`citizenship-at-creation-v1:${person.id}`)
    .integer(0, total);
  let selected: CitizenshipStatus | null = null;
  for (const [status, count] of options) {
    position -= count;
    if (position < 0) {
      selected = status;
      break;
    }
  }
  if (!selected)
    throw new Error("No citizenship starting population category.");
  const record: CitizenshipStatusRecord = {
    stableKey: "citizenship:creation:v1",
    status: selected,
    effectiveAt: createdAt,
    recordedAt: createdAt,
    sequence: null,
    citizenSince: selected === "citizen-by-birth" ? person.birthDate : null,
    sourceEventId: null,
    visibility: "private",
    provenance: {
      method: "estimated-from-population-share",
      basis: source.basis,
      countyGeoids: source.countyGeoids,
      sourceVintage: source.sourceVintage,
      sourceArtifactSha256s: source.sourceArtifactSha256s,
      sourceEntityIds: [],
      note: "Estimated starting attribute from Census county citizenship counts. No individual legal document, immigration category, naturalization date, or historical applicability is asserted.",
    },
  };
  // Keep the actual counts in the corpus, rather than repeating them per person.
  return { ...person, citizenshipStatuses: [record] };
}
