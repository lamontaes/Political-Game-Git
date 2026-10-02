import {
  organizationProfileAt,
  workRoleAt,
  workStatusAt,
} from "./life-queries";
import { lifePathDefinition } from "./life-paths2-catalog";
import {
  resourceFlowTermsAt,
  resourcePositionAt,
  resourcePositionsOf,
} from "./resource-queries";
import { createResourcePosition, makeCurrencyCode, money } from "./resources";
import { daysBetween, isoDateFromParts, yearOf } from "./dates";
import {
  TOWN_WORKPLACES,
  townWorkplaceFor,
} from "./living-world/town-employment";
import { townBusinessKindBooks } from "./living-world/town-business-books";
import { writeWithWorldIntegrityOnce } from "./world";
import cashBuffers from "../../data/research/money/opening-employer-cash-buffers.json" with { type: "json" };
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

/** Calendar unit conversions, matching the saved work-compensation cadences. */
const annualPeriods: Readonly<Record<string, number>> = {
  weekly: 52,
  biweekly: 26,
  semimonthly: 24,
  monthly: 12,
  annual: 1,
};

/**
 * At Begin only, bootstrap from sourced cash-buffer days and this employer's
 * own recorded payroll and the existing IRS industry cost model. Later new
 * employers use saved peers. Existing positions, including known zero, win.
 * No load path calls this; no historical payments or revenue are invented.
 */
export function ensureEmployerCashPositions(
  world: World,
  phase: "opening" | "later",
): World {
  const USD = makeCurrencyCode("USD");
  const payroll = new Map<
    EntityId,
    { annualMinor: number; flowIds: EntityId[]; termsIds: EntityId[] }
  >();
  const works = new Map(
    world.history.workRelationships.map((work) => [work.id, work]),
  );
  for (const flow of world.history.resourceFlows) {
    if (
      flow.basisKind !== "compensation:work" ||
      flow.basisReference.kind !== "work" ||
      flow.source.kind !== "organization" ||
      flow.startsAt > world.currentDate
    )
      continue;
    const work = works.get(flow.basisReference.workRelationshipId);
    if (
      !work ||
      work.compensation !== "paid" ||
      workStatusAt(world, work.id)?.status !== "active"
    )
      continue;
    const terms = resourceFlowTermsAt(world, flow.id);
    if (
      !terms ||
      terms.status !== "active" ||
      terms.amount.currency !== USD ||
      terms.amount.minorUnits <= 0
    )
      continue;
    const cadence =
      /^schedule:(?:town-)?(weekly|biweekly|semimonthly|monthly|annual)(?:-\d+)?$/.exec(
        terms.cadenceKind,
      );
    let periods = cadence ? annualPeriods[cadence[1]!]! : null;
    if (terms.cadenceKind === "work:completed-shift") {
      const pathId = /^employment:life-paths2-(.+)$/.exec(work.kind)?.[1];
      const role = workRoleAt(world, work.id);
      const path = pathId ? lifePathDefinition(pathId) : null;
      if (role && path?.kind === "work" && path.sessionMinutes > 0) {
        const hours = role.timeDemand.expectedWeekly;
        const weeklyHours = (hours.minimumHours + hours.maximumHours) / 2;
        if (Number.isFinite(weeklyHours) && weeklyHours > 0)
          periods = (weeklyHours / (path.sessionMinutes / 60)) * 52;
      }
    }
    if (periods === null)
      throw new Error(
        `No recorded calendar conversion for employer payroll cadence ${terms.cadenceKind}.`,
      );
    const row = payroll.get(flow.source.organizationId) ?? {
      annualMinor: 0,
      flowIds: [],
      termsIds: [],
    };
    row.annualMinor += terms.amount.minorUnits * periods;
    row.flowIds.push(flow.id);
    row.termsIds.push(terms.id);
    payroll.set(flow.source.organizationId, row);
  }
  const year = yearOf(world.currentDate);
  const daysInYear = daysBetween(
    isoDateFromParts(year, 1, 1),
    isoDateFromParts(year + 1, 1, 1),
  );
  return writeWithWorldIntegrityOnce(world, () => {
    let next = world;
    for (const [organizationId, pay] of payroll) {
      const owner = { kind: "organization" as const, organizationId };
      if (
        resourcePositionsOf(world, owner).some(
          (position) => position.openingBalance.currency === USD,
        )
      )
        continue;
      const organization = world.history.organizations.find(
        (row) => row.id === organizationId,
      );
      const profile = organizationProfileAt(world, organizationId);
      if (!organization || !profile || profile.closed) continue;
      let amount: MoneyAmount;
      let note: string;
      if (phase === "later") {
        const peer = readOpeningEmployerCashEstimate(
          world,
          organizationId,
          USD,
        );
        if (peer.status === "blocked") continue;
        amount = peer.amount;
        note = peer.note;
      } else {
        const kind =
          townWorkplaceFor(organization.stableKey, profile.classification)
            ?.key ??
          TOWN_WORKPLACES.find(
            (place) => place.classification === profile.classification,
          )?.key ??
          "*";
        const costs = townBusinessKindBooks(kind);
        const annualRevenueMinor = pay.annualMinor / costs.payShare;
        const annualOtherCostsMinor = Math.max(
          0,
          annualRevenueMinor * (1 - costs.margin) - pay.annualMinor,
        );
        const industries: Readonly<Record<string, string>> =
          cashBuffers.industryByClassification;
        const medians: Readonly<Record<string, number>> =
          cashBuffers.medianDaysByIndustry;
        const industry =
          industries[profile.classification] ?? "all-small-businesses";
        const bufferDays = medians[industry]!;
        const minor = Math.round(
          ((pay.annualMinor + annualOtherCostsMinor) / daysInYear) * bufferDays,
        );
        if (!Number.isSafeInteger(minor) || minor <= 0)
          throw new Error(
            `Invalid sourced employer opening cash for ${organizationId}.`,
          );
        amount = money(minor, USD);
        note = `ESTIMATED OPENING STOCK: own recorded monthly payroll ${pay.annualMinor / 12} USD minor units plus estimated monthly other costs ${annualOtherCostsMinor / 12}, multiplied by 12/${daysInYear} calendar days and ${bufferDays} median cash-buffer days (${industry}). ${cashBuffers.source}, ${cashBuffers.citation}; ${cashBuffers.url}. ${cashBuffers.definition} Other costs reuse IRS 2022 Table 5.1 ${costs.industry}: payShare=${costs.payShare}, margin=${costs.margin}. ${industry === "all-small-businesses" ? cashBuffers.fallbackMethod : "Saved classification matches named source industry."} Saved payroll flows ${pay.flowIds.join(", ")}; terms ${pay.termsIds.join(", ")}; profile ${profile.id}. No wage payment, revenue or tax receipt recorded.`;
      }
      next = createResourcePosition(next, {
        stableKey: `employer-cash:${organizationId}:USD`,
        owner,
        openedAt: world.currentDate,
        openingBalance: amount,
        provenance: { kind: "authored", note },
      });
    }
    return next;
  });
}
