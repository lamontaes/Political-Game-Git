import { makeIsoDate } from "../simulation/dates";
import { governmentUnit } from "../simulation/government-units";
import type {
  CountySeatBinding,
  CountySeatIdentity,
} from "./county-seat-types";

/** No roster label or proposed map has been admitted as a seat source. */
export const COUNTY_SEAT_CATALOG: readonly CountySeatIdentity[] = [];

export function countySeatCatalog(): readonly CountySeatIdentity[] {
  return COUNTY_SEAT_CATALOG;
}

export type CountySeatResolution =
  | {
      readonly kind: "accepted";
      readonly identity: CountySeatIdentity;
      readonly binding: CountySeatBinding;
    }
  | { readonly kind: "refused"; readonly reason: string };

/** Resolve only the named, dated, adopted source record for this government. */
export function resolveCountySeatBinding(
  catalog: readonly CountySeatIdentity[],
  candidate: CountySeatBinding,
  onDate: string,
  expected?: {
    readonly officeKey?: string;
    readonly governmentUnitId?: string;
  },
): CountySeatResolution {
  const refuse = (reason: string): CountySeatResolution => ({
    kind: "refused",
    reason,
  });
  if (
    candidate.vintage !== "county-seat-source-v1" ||
    candidate.compilerVersion !== "county-seat-binding-v1" ||
    candidate.chamber !== "county-governing-body"
  ) {
    return refuse(
      "This county seat binding does not name the admitted county source format.",
    );
  }
  const matches = catalog.filter(
    (seat) =>
      seat.recordId === candidate.recordId &&
      seat.source.version === candidate.sourceVersion,
  );
  if (matches.length !== 1) {
    return refuse(
      "No single admitted source record identifies this county seat.",
    );
  }
  const identity = matches[0]!;
  const unit = governmentUnit(identity.governmentUnitId);
  if (
    !unit ||
    !unit.functionalActive ||
    unit.unitType !== "county" ||
    unit.countyGeoid !== identity.countyGeoid ||
    unit.stateUsps !== identity.stateUsps ||
    identity.officeKey !== `local-government-${unit.publisherId}-governing-body`
  ) {
    return refuse(
      "This seat is not bound to its actual active county government and office.",
    );
  }
  if (
    !identity.recordId ||
    !identity.seatKey ||
    !identity.source.version ||
    !identity.source.documentId ||
    !identity.source.url.startsWith("https://") ||
    identity.source.status !== "adopted"
  ) {
    return refuse(
      "This county seat lacks an adopted, versioned source record.",
    );
  }
  let date: string;
  try {
    date = makeIsoDate(onDate);
    makeIsoDate(identity.source.readOn);
    makeIsoDate(identity.source.effectiveFrom);
    if (identity.source.effectiveUntil !== null)
      makeIsoDate(identity.source.effectiveUntil);
  } catch {
    return refuse("This county seat source has no usable effective date.");
  }
  if (
    date < identity.source.effectiveFrom ||
    (identity.source.effectiveUntil !== null &&
      date >= identity.source.effectiveUntil)
  ) {
    return refuse(
      "This county seat source is not effective on the assessment date.",
    );
  }
  if (
    !identity.electorate ||
    !identity.domicile ||
    (identity.electorate.kind === "countywide"
      ? identity.electorate.countyGeoid !== identity.countyGeoid
      : !identity.electorate.districtRecordId) ||
    (identity.domicile.kind === "county"
      ? identity.domicile.countyGeoid !== identity.countyGeoid
      : !identity.domicile.districtRecordId)
  ) {
    return refuse(
      "The county seat's electorate and legal domicile territory have not been established.",
    );
  }
  if (
    candidate.geoid !== identity.countyGeoid ||
    candidate.stateUsps !== identity.stateUsps ||
    candidate.governmentUnitId !== identity.governmentUnitId ||
    candidate.officeKey !== identity.officeKey ||
    candidate.seatKey !== identity.seatKey ||
    (expected?.officeKey !== undefined &&
      expected.officeKey !== identity.officeKey) ||
    (expected?.governmentUnitId !== undefined &&
      expected.governmentUnitId !== identity.governmentUnitId)
  ) {
    return refuse(
      "The county binding does not match the sourced seat, government, office and territory.",
    );
  }
  return { kind: "accepted", identity, binding: candidate };
}
