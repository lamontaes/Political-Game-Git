import type { CandidacyPack } from "../../simulation/candidacy-packs";
import type { MunicipalMinimumAgeEstimate } from "../../simulation/municipal-qualification-estimate";
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
