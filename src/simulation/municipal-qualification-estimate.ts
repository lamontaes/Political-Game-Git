import governingBodySeatQualification from "../../data/research/local-government/governing-body-seat-qualification.json" with { type: "json" };
import type { CandidacyPack } from "./candidacy-packs";
import type { RuleSourceRef } from "./legislature-rules";

export interface MunicipalMinimumAgeEstimate {
  readonly version:
    "municipal-similar-office-age/v1" | "governing-body-qualified-elector/v1";
  readonly basis:
    "estimated-from-same-state-offices" | "qualified-elector-of-the-place";
  readonly jurisdictionKey: string;
  readonly officeKey: string;
  readonly minimumAge: number;
  readonly municipalLegalApplicability: "UNCONFIRMED";
  readonly donors: readonly {
    readonly packId: string;
    readonly officeKey: string;
    readonly minimumAge: number;
    readonly source: RuleSourceRef;
  }[];
  readonly unestimatedFields: readonly ["residency", "termYears", "filing"];
  /** What a qualified-elector estimate rests on; absent for same-state donors. */
  readonly estimatedFrom?: string;
}

/**
 * A seat on a town's or county's governing body, where the place's own rule is
 * unread: the qualified-elector age most state municipal and county codes ask
 * of a council, commission or board member, from
 * `data/research/local-government/governing-body-seat-qualification.json`.
 * One row for all 56 places; a place's read rule replaces it in its pack.
 */
export function governingBodySeatAgeEstimate(
  jurisdictionKey: string,
  officeKey: string,
): MunicipalMinimumAgeEstimate {
  return {
    version: "governing-body-qualified-elector/v1",
    basis: "qualified-elector-of-the-place",
    jurisdictionKey,
    officeKey,
    minimumAge: governingBodySeatQualification.minimumAge,
    municipalLegalApplicability: "UNCONFIRMED",
    donors: [],
    unestimatedFields: ["residency", "termYears", "filing"],
    estimatedFrom: governingBodySeatQualification.estimatedFrom,
  };
}

/** Calibration from this state's other elected offices, never municipal law.
 * Prefer representative chambers; use remaining known state offices only
 * when those have no numeric age. A donor may itself be a disclosed profile.
 */
export function municipalMinimumAgeEstimate(
  jurisdictionKey: string,
  officeKey: string,
  similarOffices: CandidacyPack | null,
): MunicipalMinimumAgeEstimate | null {
  if (!similarOffices || similarOffices.jurisdictionKey !== jurisdictionKey)
    return null;
  const known = similarOffices.offices.flatMap((office) => {
    const age = office.qualification.minimumAge;
    return age.kind === "known" && Number.isInteger(age.value) && age.value > 0
      ? [
          {
            packId: similarOffices.packId,
            officeKey: office.officeKey,
            minimumAge: age.value,
            source: age.source,
          },
        ]
      : [];
  });
  const representative = known.filter((donor) =>
    ["house", "assembly", "legislature"].includes(
      donor.officeKey.split(":").at(-1) ?? "",
    ),
  );
  const donors = representative.length ? representative : known;
  if (!donors.length) return null;
  const counts = new Map<number, number>();
  for (const donor of donors)
    counts.set(donor.minimumAge, (counts.get(donor.minimumAge) ?? 0) + 1);
  const minimumAge = [...counts.keys()].sort(
    (a, b) => counts.get(b)! - counts.get(a)! || a - b,
  )[0]!;
  return {
    version: "municipal-similar-office-age/v1",
    basis: "estimated-from-same-state-offices",
    jurisdictionKey,
    officeKey,
    minimumAge,
    municipalLegalApplicability: "UNCONFIRMED",
    donors,
    unestimatedFields: ["residency", "termYears", "filing"],
  };
}

export function municipalMinimumAgeSentence(
  estimate: MunicipalMinimumAgeEstimate,
): string {
  return `Minimum age: ${estimate.minimumAge} (estimated)`;
}

export function municipalMinimumAgeSource(
  estimate: MunicipalMinimumAgeEstimate,
): RuleSourceRef {
  return {
    authority: "game-profile",
    verification: "game-profile",
    citation: estimate.version,
    sourceTitle:
      estimate.basis === "qualified-elector-of-the-place"
        ? "Qualified elector of the place"
        : "Same-state elected-office age estimate",
    sourceUrl: null,
    retrievedAt: null,
    note: municipalMinimumAgeSentence(estimate),
  };
}
