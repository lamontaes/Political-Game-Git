import { spreadOf } from "./income-tax-withholding";
import type { EntityId, IsoDate, World } from "./types";

export interface ComparableSalesInput {
  readonly organizationId: EntityId;
  /** Existing game business kind; the caller owns the product/cohort binding. */
  readonly kind: string;
}

export interface GameSalesReading {
  readonly organizationId: EntityId;
  readonly asOf: IsoDate;
  readonly annualSalesDollars: number;
  readonly basis: "saved-game-books" | "estimated-game-peers";
  readonly meanAnnualSalesDollars: number;
  readonly spreadAnnualSalesDollars: {
    readonly minimum: number;
    readonly maximum: number;
    readonly standardDeviation: number;
  };
  readonly contributors: readonly {
    readonly organizationId: EntityId;
    readonly kind: string;
    readonly openedAt: IsoDate;
    readonly lastRound: string;
    readonly annualSalesDollars: number;
  }[];
  readonly note: string;
}

/**
 * Read the game's saved sales model or average its same-kind business books.
 * This pure read does not claim a completed sale, choose a tax rate, create
 * cash, or apply a real-world calibration. The actual comparable book values
 * supply both the average and the observed spread.
 */
export function gameSalesForBusiness(
  world: World,
  input: ComparableSalesInput,
): GameSalesReading {
  const organizationIds = new Set(
    world.history.organizations.map((row) => row.id),
  );
  if (!organizationIds.has(input.organizationId))
    throw new Error(
      "The target sales estimate requires its saved game organization.",
    );
  const books = world.townFinances?.businesses ?? {};
  const target = books[input.organizationId];
  if (target && target.kind !== input.kind)
    throw new Error(
      "The requested sales cohort differs from the saved business kind.",
    );
  const contributors = Object.values(books)
    .filter(
      (row) =>
        row.kind === input.kind &&
        row.openedAt <= world.currentDate &&
        Number.isFinite(row.annualRevenue) &&
        row.annualRevenue >= 0 &&
        organizationIds.has(row.organizationId),
    )
    .sort((a, b) => a.organizationId.localeCompare(b.organizationId))
    .map((row) => ({
      organizationId: row.organizationId,
      kind: row.kind,
      openedAt: row.openedAt,
      lastRound: row.lastRound,
      annualSalesDollars: row.annualRevenue,
    }));
  if (contributors.length === 0)
    throw new Error(
      "No same-kind game sales books exist; the receiving producer must establish the comparable game cohort.",
    );
  const values = contributors.map((row) => row.annualSalesDollars);
  const { mean, standardDeviation } = spreadOf(values);
  const spread = {
    minimum: Math.min(...values),
    maximum: Math.max(...values),
    standardDeviation,
  };
  const hasTarget =
    target &&
    contributors.some((row) => row.organizationId === target.organizationId);
  return {
    organizationId: input.organizationId,
    asOf: world.currentDate,
    annualSalesDollars: hasTarget ? target.annualRevenue : mean,
    basis: hasTarget ? "saved-game-books" : "estimated-game-peers",
    meanAnnualSalesDollars: mean,
    spreadAnnualSalesDollars: spread,
    contributors,
    note: hasTarget
      ? "ESTIMATED: saved game business sales model; not an observed paid sale or tax receipt."
      : "ESTIMATED: averaged from this game's same-kind business sales books, with their current game spread. Not an observed paid sale or tax receipt.",
  };
}
