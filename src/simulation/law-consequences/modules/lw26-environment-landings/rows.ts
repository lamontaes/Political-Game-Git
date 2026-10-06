/** Approved LW-26 month-by-month place measures that reach named people. */
export const LW26_ENVIRONMENT_LANDING_ROWS = [
  {
    lawKey:
      "us-policy-positions:environment-energy.clean-air-plan-for-polluted-counties",
    measure: "env.particulates",
    kind: "EXPOSURE",
    outcomeLink: "emission-rules-to-particulates",
  },
  {
    lawKey: "us-policy-positions:environment-energy.bottle-deposit",
    measure: "env.litter",
    kind: "EXPOSURE",
    outcomeLink: "container-deposit-to-litter",
  },
  {
    lawKey:
      "us-policy-positions:environment-energy.restrict-building-in-flood-zones",
    measure: "disaster.flood-damage",
    kind: "EXPOSURE",
    outcomeLink: "flood-zone-limits-to-damage",
  },
] as const;

export type LandingExposureRow = (typeof LW26_ENVIRONMENT_LANDING_ROWS)[number];

/**
 * Rank named people by their accumulated recorded exposure. Ties are stable
 * by person id, so a replay does not change the order or introduce a roll.
 */
export function rankByRecordedExposure<
  T extends {
    readonly personId: string;
    readonly exposure: number;
  },
>(rows: readonly T[]): readonly T[] {
  return [...rows].sort(
    (left, right) =>
      right.exposure - left.exposure ||
      left.personId.localeCompare(right.personId),
  );
}

/** The top share receives an event, with equal-ranked ties resolved by id. */
export function rankRecordedExposureEvent<
  T extends {
    readonly personId: string;
    readonly exposure: number;
  },
>(rows: readonly T[], share: number): readonly T[] {
  if (!Number.isFinite(share) || share < 0 || share > 1)
    throw new Error("An exposure event share must be between zero and one.");
  return rankByRecordedExposure(rows).slice(0, Math.ceil(rows.length * share));
}

/** Sum actual saved exposure rows for people, linked to their exact cause. */
export function accumulatedExposureByPerson(
  exposures: readonly LawExposureRecord[],
  causes: readonly PlaceOutcomeRecord[],
  measure: string,
): readonly { readonly personId: EntityId; readonly exposure: number }[] {
  const causeMeasureById = new Map(
    causes
      .filter((cause) => cause.id)
      .map((cause) => [cause.id!, cause.measure]),
  );
  const totals = new Map<EntityId, number>();
  for (const exposure of exposures) {
    if (
      exposure.outcome?.kind !== "EXPOSURE" ||
      causeMeasureById.get(exposure.sourceRecordId) !== measure
    )
      continue;
    totals.set(
      exposure.personId,
      (totals.get(exposure.personId) ?? 0) + exposure.outcome.value,
    );
  }
  return [...totals].map(([personId, exposure]) => ({ personId, exposure }));
}

/** Named asthma-event ranking using only a person's accumulated particulates. */
export function rankAsthmaRecipientsByRecordedExposure(
  exposures: readonly LawExposureRecord[],
  causes: readonly PlaceOutcomeRecord[],
  eligibleChildren: ReadonlySet<EntityId>,
  share: number,
): readonly { readonly personId: EntityId; readonly exposure: number }[] {
  return rankRecordedExposureEvent(
    accumulatedExposureByPerson(exposures, causes, "env.particulates").filter(
      (row) => eligibleChildren.has(row.personId),
    ),
    share,
  );
}
import type { EntityId, LawExposureRecord } from "../../../types";
import type { PlaceOutcomeRecord } from "../../../outcome-web/place-outcome-store";
