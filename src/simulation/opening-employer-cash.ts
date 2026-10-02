import { organizationProfileAt, workStatusAt } from "./life-queries";
import { resourcePositionAt } from "./resource-queries";
import { money } from "./resources";
import type { CurrencyCode, EntityId, MoneyAmount, World } from "./types";

export type OpeningEmployerCashEstimate =
  | {
      readonly status: "blocked";
      readonly reason:
        "missing-employer-profile" | "empty-comparable-cash-cohort";
    }
  | {
      readonly status: "estimated";
      readonly amount: MoneyAmount;
      readonly donors: readonly {
        readonly organizationId: EntityId;
        readonly profileId: EntityId;
        readonly positionId: EntityId;
        readonly outcomeIds: readonly EntityId[];
        readonly spendableMinorUnits: number;
      }[];
      readonly note: string;
    };

/** Read saved comparable employers only. No opening stock or payment is written. */
export function readOpeningEmployerCashEstimate(
  world: World,
  organizationId: EntityId,
  currency: CurrencyCode,
): OpeningEmployerCashEstimate {
  const target = organizationProfileAt(world, organizationId);
  if (!target || target.closed)
    return { status: "blocked", reason: "missing-employer-profile" };
  const employers = new Set(
    world.history.workRelationships
      .filter(
        (work) =>
          work.compensation === "paid" &&
          work.startedAt <= world.currentDate &&
          workStatusAt(world, work.id)?.status === "active",
      )
      .map((work) => work.organizationId),
  );
  const donors = world.history.organizations.flatMap((organization) => {
    if (
      organization.id === organizationId ||
      organization.formedAt > world.currentDate ||
      !employers.has(organization.id)
    )
      return [];
    const profile = organizationProfileAt(world, organization.id);
    if (
      !profile ||
      profile.closed ||
      profile.classification !== target.classification
    )
      return [];
    const cash = resourcePositionAt(
      world,
      { kind: "organization", organizationId: organization.id },
      currency,
    );
    if (!cash) return [];
    return [
      {
        organizationId: organization.id,
        profileId: profile.id,
        positionId: cash.positionId,
        outcomeIds: cash.outcomeIds,
        spendableMinorUnits: Math.max(0, cash.liquidBalance.minorUnits),
      },
    ];
  });
  if (!donors.length)
    return { status: "blocked", reason: "empty-comparable-cash-cohort" };
  const mean = Math.round(
    donors.reduce(
      (sum, donor) => sum + donor.spendableMinorUnits / donors.length,
      0,
    ),
  );
  return {
    status: "estimated",
    amount: money(mean, currency),
    donors,
    note: `ESTIMATED FROM AVERAGE: ${donors.length} active paid employers with saved classification ${target.classification}; current recorded spendable ${currency} cash, each employer counted once. Negative balances supply zero spendable cash. Source positions: ${donors.map((donor) => donor.positionId).join(", ")}. No cash written or payment recorded.`,
  };
}
