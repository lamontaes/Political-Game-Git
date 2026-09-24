import { lifePlaceByJurisdictionId } from "./life-places";
import { localGoverningBodyIdentityForOfficeKey } from "./nationwide-world/local-governing-body-candidacy-packs";
import type { EntityId, World } from "./types";

/** Seat identities already established for a municipal council. */
export interface MunicipalSeatChoice {
  readonly key: string;
  readonly label: string;
  readonly eligible: boolean;
  readonly reason: string | null;
}

const DC_COUNCIL_OFFICE = "local-government-124214-governing-body";

/** D.C. Code § 1-204.01(b)(1): chair, four at-large members, eight wards. */
export function dcCouncilSeatLabels(): readonly {
  readonly label: string;
  readonly presiding: boolean;
}[] {
  return [
    { label: "Chairman (at large)", presiding: true },
    ...[1, 2, 3, 4].map((n) => ({
      label: `At-large member, seat ${n}`,
      presiding: false,
    })),
    ...[1, 2, 3, 4, 5, 6, 7, 8].map((n) => ({
      label: `Ward ${n}`,
      presiding: false,
    })),
  ];
}

function compiledChoices(officeKey: string) {
  if (officeKey !== DC_COUNCIL_OFFICE) return [];
  // The chair is a distinct office. This council-member filing names one of
  // the other twelve identities already used by the saved Council opening.
  return dcCouncilSeatLabels()
    .slice(1)
    .map((seat, index) => ({
      key: `dc-council:seat:${index + 2}`,
      label: seat.label,
      ward: seat.label.startsWith("Ward "),
    }));
}

export function municipalSeatMustBeNamed(officeKey: string): boolean {
  return compiledChoices(officeKey).length > 0;
}

/** Choice is seat intent; a ward choice never proves residence in that ward. */
export function municipalSeatChoices(
  world: World,
  personId: EntityId,
  officeKey: string,
): readonly MunicipalSeatChoice[] {
  const seats = compiledChoices(officeKey);
  if (seats.length === 0) return [];
  const identity = localGoverningBodyIdentityForOfficeKey(officeKey);
  const person = world.people[personId];
  const home = person
    ? lifePlaceByJurisdictionId(person.homeJurisdictionId)
    : null;
  const resident =
    identity !== null &&
    home?.sourceGeoid !== null &&
    home?.sourceGeoid === identity.unit.placeGeoid;
  return seats.map((seat) => ({
    key: seat.key,
    label: seat.label,
    eligible: resident && !seat.ward,
    reason: !resident
      ? "This council seat requires a recorded home in the District."
      : seat.ward
        ? "The saved home does not identify a ward, so ward eligibility is unproved."
        : null,
  }));
}

export function municipalSeatChoiceByKey(
  officeKey: string,
  seatKey: string,
): { readonly key: string; readonly label: string } | null {
  const seat = compiledChoices(officeKey).find(
    (entry) => entry.key === seatKey,
  );
  return seat ? { key: seat.key, label: seat.label } : null;
}
