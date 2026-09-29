import { seatsForCourt } from "../../src/simulation/judiciary/courts";
import { jailTermOn } from "../../src/simulation/justice/jail-terms";
import {
  BUDGET_PROGRAMS,
  BUDGET_SOURCES,
} from "../../src/simulation/public-budgets/store";
import {
  FEDERAL_OUTLAYS,
  FEDERAL_RECEIPTS,
} from "../../src/simulation/public-budgets/federal-treasury";
import {
  workStatusAt,
  organizationParticipationStateAt,
} from "../../src/simulation/life-queries";
import {
  resourceFlowTermsAt,
  resourcePositionAt,
} from "../../src/simulation/resource-queries";
import { money } from "../../src/simulation/resources";
import type { World } from "../../src/simulation/types";

export interface MeasuredMovement {
  readonly account: string;
  readonly unit: "dollars" | "people" | "seats" | "cases";
  readonly amount: number;
}
/** Count financial and resident records, excluding prose, dates, votes, rates and indexes. */
export function worldMovement(
  control: World,
  treated: World,
): readonly MeasuredMovement[] {
  const snapshot = (world: World) => {
    const result = new Map<
      string,
      { unit: "dollars" | "people" | "seats" | "cases"; value: number }
    >();
    for (const government of world.publicBudgets?.governments ?? []) {
      const key = `budget:${government.level}:${government.key}`;
      result.set(`${key}:balance`, {
        unit: "dollars",
        value: government.balance,
      });
      result.set(`${key}:reserve`, {
        unit: "dollars",
        value: government.reserve,
      });
      for (const [index, source] of BUDGET_SOURCES.entries())
        result.set(`${key}:revenue:${source}`, {
          unit: "dollars",
          value: government.months.reduce(
            (sum, month) => sum + month.revenue[index]!,
            0,
          ),
        });
      for (const [index, amount] of government.months
        .reduce<number[]>(
          (sum, m) => m.spending.map((n, i) => n + (sum[i] ?? 0)),
          [],
        )
        .entries())
        result.set(`${key}:program:${BUDGET_PROGRAMS[index]}`, {
          unit: "dollars",
          value: amount,
        });
    }
    const federal = world.publicBudgets?.federal;
    for (const [index, line] of FEDERAL_OUTLAYS.entries())
      result.set(`federal:outlay:${line}`, {
        unit: "dollars",
        value: (federal?.months ?? []).reduce(
          (n, m) => n + m.outlays[index]!,
          0,
        ),
      });
    for (const [index, line] of FEDERAL_RECEIPTS.entries())
      result.set(`federal:receipt:${line}`, {
        unit: "dollars",
        value: (federal?.months ?? []).reduce(
          (n, m) => n + m.receipts[index]!,
          0,
        ),
      });
    result.set("justice:people-serving-jail-terms", {
      unit: "people",
      value: world.personOrder.filter((id) => jailTermOn(world, id) !== null)
        .length,
    });
    for (const position of world.history.resourcePositions) {
      const balance = resourcePositionAt(
        world,
        position.owner,
        money(0, "USD").currency,
      )?.liquidBalance.minorUnits;
      if (balance !== undefined)
        result.set(`cash:${JSON.stringify(position.owner)}`, {
          unit: "dollars",
          value: balance / 100,
        });
    }
    for (const [id, business] of Object.entries(
      world.townFinances?.businesses ?? {},
    ))
      result.set(`business:${id}:cash`, {
        unit: "dollars",
        value: business.cash,
      });
    for (const flow of world.history.resourceFlows) {
      if (flow.basisKind !== "housing:rent") continue;
      const terms = resourceFlowTermsAt(world, flow.id);
      if (terms?.status === "active")
        result.set(`rent:${flow.stableKey}:monthly`, {
          unit: "dollars",
          value: terms.amount.minorUnits / 100,
        });
    }
    for (const work of world.history.workRelationships) {
      if (workStatusAt(world, work.id)?.status !== "active") continue;
      const publicOffice =
        /legislative-member|executive-office|elected|council|judge/.test(
          work.kind,
        );
      const key = `${publicOffice ? "seat" : "employment"}:${work.kind}:${work.personId}`;
      result.set(key, { unit: publicOffice ? "seats" : "people", value: 1 });
    }
    const electedRoles = new Set([
      "leader:municipal-member",
      "leader:municipal-presiding-member",
      "leader:municipal-mayor",
      "leader:county-board-member",
      "leader:township-board-member",
    ]);
    for (const participation of world.history.organizationParticipations) {
      if (participation.startedAt > world.currentDate) continue;
      const state = organizationParticipationStateAt(world, participation.id);
      if (
        state?.status !== "active" ||
        !state.roleKind ||
        !electedRoles.has(state.roleKind)
      )
        continue;
      result.set(
        `seat:${participation.organizationId}:${state.roleKind}:${participation.personId}`,
        { unit: "seats", value: 1 },
      );
    }
    for (const court of Object.values(world.judiciary?.courts ?? {}))
      result.set(`seats:court:${court.courtId}`, {
        unit: "seats",
        value: seatsForCourt(world, court.courtId).length,
      });
    const flowById = new Map(
      world.history.resourceFlows.map((flow) => [flow.id, flow]),
    );
    for (const outcome of world.history.resourceTransferOutcomes) {
      const flow = flowById.get(outcome.resourceFlowId);
      if (!flow || flow.basisKind !== "housing:rent") continue;
      const key = `rent-paid:${flow.stableKey}`;
      result.set(key, {
        unit: "dollars",
        value:
          (result.get(key)?.value ?? 0) +
          outcome.transferredAmount.minorUnits / 100,
      });
    }
    const caseEvents = world.history.events.filter((e) =>
      /^justice\.(charged|case-ended|sentenced)$/.test(e.type),
    );
    for (const event of caseEvents) {
      const key = `cases:${event.type}`;
      result.set(key, {
        unit: "cases",
        value: (result.get(key)?.value ?? 0) + 1,
      });
    }
    const admitted = (world.immigrationAdmissions ?? []).reduce(
      (n, r) => n + r.personIds.length,
      0,
    );
    result.set("immigration:admitted-residents", {
      unit: "people",
      value: admitted,
    });
    for (const relief of world.history.debtReliefs ?? []) {
      const key = `debt-relief:${relief.resourceObligationId}`;
      const previous = result.get(key)?.value ?? 0;
      result.set(key, {
        unit: "dollars",
        value: previous + relief.amount.minorUnits / 100,
      });
    }
    for (const portfolio of Object.values(
      world.congressInvestments?.portfolios ?? {},
    )) {
      result.set(`investment:${portfolio.personId}:individual`, {
        unit: "dollars",
        value: portfolio.individualStockCents / 100,
      });
      result.set(`investment:${portfolio.personId}:diversified`, {
        unit: "dollars",
        value: portfolio.diversifiedFundCents / 100,
      });
    }
    return result;
  };
  const before = snapshot(control),
    after = snapshot(treated);
  return [...new Set([...before.keys(), ...after.keys()])].flatMap(
    (account) => {
      const old = before.get(account),
        next = after.get(account);
      const amount = (next?.value ?? 0) - (old?.value ?? 0);
      return Math.abs(amount) > 0.005
        ? [{ account, unit: (next ?? old)!.unit, amount }]
        : [];
    },
  );
}
