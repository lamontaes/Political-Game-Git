import { fiscalRecordGraph } from "./economic-graphs";
import type { EconomicGraphModel, FiscalGraphRecord } from "./economic-graphs";
import { resourcePositionAt } from "../simulation/resource-queries";
import { money } from "../simulation/resources";
import { publicTaxAccountForJurisdiction } from "../simulation/tax-policy";
import type {
  EntityId,
  IsoDate,
  MoneyAmount,
  ResourceEndpoint,
  ResourceTransferOutcomeStatus,
  World,
} from "../simulation/types";

/**
 * The modeled public receipts account, read back from the records that moved
 * money through it. This is a projection, not a treasury: it writes nothing,
 * advances no time, and never touches the government aggregate metrics or the
 * reference observations shown elsewhere on the Budget page.
 *
 * Only transferred money counts. An assessed tax that has not been collected,
 * an appropriation, a forecast and a canceled request create no transfer
 * outcome and so never appear as money. A failed or refused transfer is listed
 * as an attempt that moved nothing. No account is a different fact from a
 * zero balance, and a balance is shown only when the recorded opening and
 * every transfer touching the account are accounted for.
 */
export type ModeledAccountEntryKind =
  "tax-receipt" | "service-payment" | "unclassified";

export interface ModeledAccountEntry {
  readonly outcomeId: EntityId;
  readonly resourceFlowId: EntityId;
  readonly sequence: number;
  readonly occurredAt: IsoDate;
  readonly periodStartsAt: IsoDate;
  readonly periodEndsAt: IsoDate;
  readonly kind: ModeledAccountEntryKind;
  readonly direction: "in" | "out";
  readonly status: ResourceTransferOutcomeStatus;
  readonly attempted: MoneyAmount;
  readonly transferred: MoneyAmount;
}

export type ModeledAccountBalance =
  | {
      readonly status: "established";
      readonly asOf: IsoDate;
      readonly balance: MoneyAmount;
    }
  | { readonly status: "withheld"; readonly reason: string };

export type ModeledAccountHistory =
  | {
      readonly status: "no-account";
      readonly jurisdictionId: EntityId;
      readonly reason: string;
    }
  | {
      readonly status: "recorded";
      readonly jurisdictionId: EntityId;
      readonly jurisdictionLabel: string;
      readonly accountOrganizationId: EntityId;
      readonly openedAt: IsoDate;
      readonly asOf: IsoDate;
      readonly openingBalance: MoneyAmount;
      readonly entries: readonly ModeledAccountEntry[];
      readonly receipts: MoneyAmount;
      readonly payments: MoneyAmount;
      readonly balance: ModeledAccountBalance;
      readonly graph: EconomicGraphModel | null;
    };

const sameEndpoint = (left: ResourceEndpoint, right: ResourceEndpoint) =>
  left.kind === right.kind &&
  (left.kind === "person"
    ? right.kind === "person" && left.personId === right.personId
    : left.kind === "household"
      ? right.kind === "household" && left.householdId === right.householdId
      : right.kind === "organization" &&
        left.organizationId === right.organizationId);

export function projectModeledAccountHistory(
  world: World,
  jurisdictionId: EntityId,
): ModeledAccountHistory {
  const jurisdictionLabel =
    world.jurisdictions[jurisdictionId]?.name ?? jurisdictionId;
  const account = publicTaxAccountForJurisdiction(world, jurisdictionId);
  const position = account
    ? world.history.resourcePositions.find(
        (row) =>
          row.owner.kind === "organization" &&
          row.owner.organizationId === account.organizationId &&
          row.openingBalance.currency === "USD" &&
          row.openedAt <= world.currentDate &&
          row.sequence < world.history.nextSequence,
      )
    : undefined;
  if (!account || !position)
    return {
      status: "no-account",
      jurisdictionId,
      reason: `No modeled public receipts account has been opened for ${jurisdictionLabel} in this life. That is no record, not a zero balance.`,
    };
  const endpoint: ResourceEndpoint = {
    kind: "organization",
    organizationId: account.organizationId,
  };
  const currency = position.openingBalance.currency;
  const entries: ModeledAccountEntry[] = [];
  for (const outcome of world.history.resourceTransferOutcomes) {
    // The same window the ledger's own balance query uses.
    if (
      outcome.sequence <= position.sequence ||
      outcome.sequence >= world.history.nextSequence ||
      outcome.occurredAt < position.openedAt ||
      outcome.occurredAt > world.currentDate ||
      outcome.attemptedAmount.currency !== currency
    )
      continue;
    const flow = world.history.resourceFlows.find(
      (row) => row.id === outcome.resourceFlowId,
    );
    if (!flow) continue;
    const inbound = sameEndpoint(flow.recipient, endpoint);
    const outbound = sameEndpoint(flow.source, endpoint);
    if (!inbound && !outbound) continue;
    const kind: ModeledAccountEntryKind =
      flow.jurisdictionId === jurisdictionId &&
      inbound &&
      !outbound &&
      flow.basisKind === "custom:tax-collection"
        ? "tax-receipt"
        : flow.jurisdictionId === jurisdictionId &&
            outbound &&
            !inbound &&
            flow.basisReference.kind === "public-funding"
          ? "service-payment"
          : "unclassified";
    entries.push({
      outcomeId: outcome.id,
      resourceFlowId: flow.id,
      sequence: outcome.sequence,
      occurredAt: outcome.occurredAt,
      periodStartsAt: outcome.periodStartsAt,
      periodEndsAt: outcome.periodEndsAt,
      kind,
      direction: inbound ? "in" : "out",
      status: outcome.status,
      attempted: outcome.attemptedAmount,
      transferred: outcome.transferredAmount,
    });
  }
  entries.sort((left, right) => left.sequence - right.sequence);
  const total = (kind: ModeledAccountEntryKind) =>
    entries
      .filter((entry) => entry.kind === kind)
      .reduce((sum, entry) => sum + entry.transferred.minorUnits, 0);
  const receipts = money(total("tax-receipt"), currency);
  const payments = money(total("service-payment"), currency);
  const ledger = resourcePositionAt(world, endpoint, currency);
  const derived =
    position.openingBalance.minorUnits +
    receipts.minorUnits -
    payments.minorUnits;
  const balance: ModeledAccountBalance = entries.some(
    (entry) => entry.kind === "unclassified",
  )
    ? {
        status: "withheld",
        reason:
          "Some transfers touching this account are not tax receipts or service payments, so this history is not complete enough to state a balance.",
      }
    : !ledger || ledger.liquidBalance.minorUnits !== derived
      ? {
          status: "withheld",
          reason:
            "The recorded ledger position and this history disagree, so no balance is stated.",
        }
      : {
          status: "established",
          asOf: world.currentDate,
          balance: money(derived, currency),
        };
  return {
    status: "recorded",
    jurisdictionId,
    jurisdictionLabel,
    accountOrganizationId: account.organizationId,
    openedAt: position.openedAt,
    asOf: world.currentDate,
    openingBalance: position.openingBalance,
    entries,
    receipts,
    payments,
    balance,
    graph: accountGraph(
      jurisdictionId,
      jurisdictionLabel,
      position.openedAt,
      world.currentDate,
      position.openingBalance,
      entries,
      balance,
    ),
  };
}

function accountGraph(
  jurisdictionId: EntityId,
  jurisdictionLabel: string,
  openedAt: IsoDate,
  asOf: IsoDate,
  opening: MoneyAmount,
  entries: readonly ModeledAccountEntry[],
  balance: ModeledAccountBalance,
): EconomicGraphModel | null {
  const moved = entries.filter(
    (entry) =>
      entry.kind !== "unclassified" && entry.transferred.minorUnits > 0,
  );
  const unit = `${opening.currency} minor units`;
  const record = (
    seriesKey: string,
    seriesLabel: string,
    period: IsoDate,
    ids: readonly EntityId[],
    value: number,
  ): FiscalGraphRecord => ({
    recordKey: `${seriesKey}:${period}:${ids.join("+")}`,
    seriesKey,
    seriesLabel,
    period,
    value,
    missingReason: null,
    unit,
    geographyKey: jurisdictionId,
    geographyLabel: jurisdictionLabel,
    recordClass: "simulated-history",
  });
  const byDate = (kind: ModeledAccountEntryKind) => {
    const dates = new Map<IsoDate, ModeledAccountEntry[]>();
    for (const entry of moved.filter((row) => row.kind === kind)) {
      dates.set(entry.occurredAt, [
        ...(dates.get(entry.occurredAt) ?? []),
        entry,
      ]);
    }
    return [...dates.entries()];
  };
  const records: FiscalGraphRecord[] = [
    ...byDate("tax-receipt").map(([date, rows]) =>
      record(
        "modeled-account.tax-receipts",
        "Collected tax receipts",
        date,
        rows.map((row) => row.outcomeId),
        rows.reduce((sum, row) => sum + row.transferred.minorUnits, 0),
      ),
    ),
    ...byDate("service-payment").map(([date, rows]) =>
      record(
        "modeled-account.service-payments",
        "Service payments",
        date,
        rows.map((row) => row.outcomeId),
        rows.reduce((sum, row) => sum + row.transferred.minorUnits, 0),
      ),
    ),
  ];
  if (balance.status === "established" && moved.length > 0) {
    let running = opening.minorUnits;
    records.push(
      record(
        "modeled-account.balance",
        "Account balance at end of day",
        openedAt,
        [],
        running,
      ),
    );
    const dates = [...new Set(moved.map((row) => row.occurredAt))].sort();
    for (const date of dates) {
      const day = moved.filter((row) => row.occurredAt === date);
      for (const row of day)
        running +=
          row.direction === "in"
            ? row.transferred.minorUnits
            : -row.transferred.minorUnits;
      records.push(
        record(
          "modeled-account.balance",
          "Account balance at end of day",
          date,
          day.map((row) => row.outcomeId),
          running,
        ),
      );
    }
  }
  const graph = fiscalRecordGraph(
    `modeled-account:${unit.toLowerCase().replaceAll(" ", "-")}`,
    `Modeled public receipts account — ${jurisdictionLabel}`,
    records,
  );
  return graph
    ? {
        ...graph,
        description:
          "Recorded cash transfers through this modeled public account; tax assessments, appropriations, and canceled requests are excluded.",
        referenceLabel: `Account history from ${openedAt} through ${asOf}`,
        boundaries: [
          "Simulated account history only; government-wide totals and published reference series remain separate.",
          "Amounts are cash actually transferred, in exact currency minor units.",
          "No balance is graphed unless the opening value and complete modeled transfer history are established.",
        ],
      }
    : null;
}
