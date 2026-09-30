import { assessLawOutcomeCalibration } from "../../src/simulation/law-outcome-calibration";
import { OUTCOME_LINKS } from "../../src/simulation/outcome-web";
import { federalPrisoners } from "../../src/simulation/justice/federal-mandatory-minimums";
import { pastDueDebtDollars } from "../../src/simulation/student-debt-relief-law";
import { ageOnDate, daysBetween } from "../../src/simulation/dates";
import { activeWorkRelationshipsAt } from "../../src/simulation/life-queries";
import { NATIONAL_ELECTION_JURISDICTION } from "../../src/simulation/national-election-geography";
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
import type { World, IsoDate } from "../../src/simulation/types";

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

/** Scalar daily observations, retained only for calibration laws. */
export function lawCalibrationValues(
  world: World,
  questionKey: string,
): Readonly<Record<string, number>> {
  const result: Record<string, number> = {};
  for (const link of OUTCOME_LINKS.filter(
    (link) => link.calibration && link.from === `law:${questionKey}`,
  )) {
    const national = NATIONAL_ELECTION_JURISDICTION.id;
    if (link.to === "prison.federal-population")
      result[link.key] = federalPrisoners(world, national, world.currentDate);
    else if (link.to === "finance.past-due-debt")
      result[link.key] = pastDueDebtDollars(world, national, world.currentDate);
    else if (link.to === "labor.workforce")
      result[link.key] = [
        ...new Set(
          (world.immigrationAdmissions ?? []).flatMap((row) => row.personIds),
        ),
      ].filter(
        (id) =>
          ageOnDate(world.people[id]!.birthDate, world.currentDate) >= 16 &&
          activeWorkRelationshipsAt(world, id).length > 0,
      ).length;
  }
  return result;
}

/** Actual person/loan records are measured; calibration never writes them. */
export function lawCalibrationReadings(
  control: World,
  treated: World,
  questionKey: string,
  effectiveAt: IsoDate,
  firstEffectDates: Readonly<Record<string, IsoDate>>,
) {
  return OUTCOME_LINKS.filter(
    (link) => link.calibration && link.from === `law:${questionKey}`,
  ).map((link) => {
    let observed: number | null = null;
    let reason: string | null = null;
    const national = NATIONAL_ELECTION_JURISDICTION.id;
    if (link.to === "prison.federal-population") {
      const before = federalPrisoners(control, national, control.currentDate);
      observed =
        before > 0
          ? (federalPrisoners(treated, national, treated.currentDate) -
              before) /
            before
          : null;
      if (before === 0)
        reason = "No covered federal prisoner in the control cohort.";
    } else if (link.to === "finance.past-due-debt") {
      const before = pastDueDebtDollars(control, national, control.currentDate);
      observed =
        before > 0
          ? (pastDueDebtDollars(treated, national, treated.currentDate) -
              before) /
            before
          : null;
      if (before === 0) reason = "No past-due balance in the control cohort.";
    } else if (link.to === "labor.workforce") {
      // BLS participation is for people age 16+, rather than children in the admitted households.
      const cohort = [
        ...new Set(
          (treated.immigrationAdmissions ?? []).flatMap((row) => row.personIds),
        ),
      ].filter(
        (id) =>
          !control.people[id] &&
          ageOnDate(treated.people[id]!.birthDate, treated.currentDate) >= 16,
      );
      observed = cohort.length
        ? cohort.filter(
            (id) => activeWorkRelationshipsAt(treated, id).length > 0,
          ).length / cohort.length
        : null;
      if (!cohort.length)
        reason = "No newly admitted resident age 16 or older.";
    }
    const firstEffectDate = firstEffectDates[link.key] ?? null;
    const observedLagMonths = firstEffectDate
      ? daysBetween(effectiveAt, firstEffectDate) / (365.2425 / 12)
      : null;
    const calibration = treated.lawOutcomeCalibration?.[link.key];
    const withinBand =
      observed !== null && calibration
        ? observed >= calibration.band[0] && observed <= calibration.band[1]
        : null;
    return {
      key: link.key,
      observed,
      withinBand,
      firstEffectDate,
      observedLagMonths,
      calibration: calibration ?? null,
      assessment: assessLawOutcomeCalibration(
        treated,
        link.key,
        observed,
        observedLagMonths,
      ),
      reason:
        reason ??
        (firstEffectDate
          ? null
          : "No first outcome-change date was observed; lag acceptance is unavailable."),
    };
  });
}
