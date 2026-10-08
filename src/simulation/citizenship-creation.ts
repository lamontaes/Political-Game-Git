import { citizenshipSharesForJurisdiction } from "./county-citizenship";
import rules from "../../data/research/birth-citizenship-rules.json" with { type: "json" };
import { lifePlaceByJurisdictionId } from "./life-places";
import type {
  CitizenshipStatus,
  CitizenshipStatusRecord,
} from "./citizenship-types";
import type { IsoDate, Person } from "./types";

/** Actual birthplace and documented parental transmission govern birth status. */
export function initializePersonCitizenship(
  person: Person,
  _worldSeed: string,
  createdAt: IsoDate,
  parents: readonly {
    readonly person: Person;
    readonly transmissionEligibilityRecorded: boolean;
  }[] = [],
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
  const birthplace = person.establishedFacts.find(
    (fact) => fact.kind === "birthplace",
  );
  const place = birthplace
    ? lifePlaceByJurisdictionId(birthplace.jurisdictionId!)
    : null;
  const rows: Readonly<
    Record<
      string,
      {
        nativeStatus: string;
        source: string;
        birthrightFrom: string;
        estimatedFrom: string | null;
      }
    >
  > = rules.places;
  const rule = place?.stateJurisdictionKey
    ? rows[place.stateJurisdictionKey]
    : undefined;
  if (
    rule &&
    rule.nativeStatus !== "citizen-by-birth" &&
    rule.nativeStatus !== "noncitizen-national"
  )
    throw new Error("A birth-law row must record its actual birth status.");
  const qualifyingParent = parents.find(
    ({ person: parent, transmissionEligibilityRecorded }) =>
      transmissionEligibilityRecorded &&
      parent.citizenshipStatuses?.some(
        (status) =>
          (status.citizenSince ?? status.effectiveAt) <= person.birthDate &&
          (status.status === "citizen-by-birth" ||
            status.status === "naturalized-citizen"),
      ),
  );
  const nativeStatus = rule?.nativeStatus;
  const legalStatus: CitizenshipStatus | null = qualifyingParent
    ? "citizen-by-birth"
    : rule &&
        person.birthDate >= rule.birthrightFrom &&
        (nativeStatus === "citizen-by-birth" ||
          nativeStatus === "noncitizen-national")
      ? nativeStatus
      : null;
  // Historical or unread birth evidence receives the source's modal estimate;
  // it does not acquire undocumented parent residence or a naturalization date.
  const selected =
    legalStatus ?? [...options].sort((a, b) => b[1] - a[1])[0]![0];
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
      method: legalStatus ? "birth-law" : "estimated-from-population-share",
      basis: source.basis,
      countyGeoids: source.countyGeoids,
      sourceVintage: source.sourceVintage,
      sourceArtifactSha256s: source.sourceArtifactSha256s,
      sourceEntityIds: qualifyingParent
        ? [qualifyingParent.person.id, ...(birthplace ? [birthplace.id] : [])]
        : birthplace
          ? [birthplace.id]
          : [],
      note: legalStatus
        ? qualifyingParent
          ? rules.foreignBirthParentSource
          : rule!.source
        : "Estimated starting attribute from Census county citizenship counts. No individual legal document, immigration category, naturalization date, or historical applicability is asserted.",
    },
  };
  // Keep the actual counts in the corpus, rather than repeating them per person.
  return { ...person, citizenshipStatuses: [record] };
}
