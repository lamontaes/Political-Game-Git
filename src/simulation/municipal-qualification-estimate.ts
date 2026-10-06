import type { CandidacyPack } from "./candidacy-packs";
import type { RuleSourceRef } from "./legislature-rules";
import { stateName } from "./office-qualification-rules";

export interface MunicipalMinimumAgeEstimate {
  readonly version: "municipal-similar-office-age/v1";
  readonly basis: "estimated-from-same-state-offices";
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
  return `You must be at least ${estimate.minimumAge} to run for this office. This age is estimated from similar elected offices in ${stateName(estimate.jurisdictionKey.replace(/^US-/, ""))}; this municipality's own age rule is unconfirmed.`;
}

export function municipalMinimumAgeSource(
  estimate: MunicipalMinimumAgeEstimate,
): RuleSourceRef {
  return {
    authority: "game-profile",
    verification: "game-profile",
    citation: estimate.version,
    sourceTitle: "Same-state elected-office age estimate",
    sourceUrl: null,
    retrievedAt: null,
    note: municipalMinimumAgeSentence(estimate),
  };
}
