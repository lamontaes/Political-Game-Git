import research from "../../data/research/laws/congressional-stock-trading.json" with { type: "json" };
import { scheduleFutureDueItem } from "./future-transitions";
import { operativeDateForEnactment } from "./legislative-effective-date";
import { ageOnDate, addDays } from "./dates";
import { createOrganization } from "./life";
import { projectCongress } from "./living-world/congress";
import { personTrait } from "./people-traits";
import { resourcePositionAt } from "./resource-queries";
import {
  createResourceFlow,
  createResourceObligation,
  createResourcePosition,
  money,
  recordResourceTransferOutcome,
} from "./resources";
import {
  NATIONAL_ELECTION_JURISDICTION,
  ensureNationalElectionJurisdiction,
} from "./national-election-geography";
import { policyTermsInForce } from "./governing/policy-bill-terms";
import {
  principledLeaning,
  ensureOfficeholderPrinciples,
} from "./governing/officeholder-principles";
import { recordWorldEvent, writeWithWorldIntegrityOnce } from "./world";
import type {
  EntityId,
  IsoDate,
  World,
  FutureDueItem,
  FutureTransitionHandlerResult,
  LegislativeEnactmentRecord,
} from "./types";
import type {
  CongressionalInvestmentStore,
  CongressionalPortfolio,
} from "./congress-investment-types";

export const CONGRESS_STOCK_BAN_QUESTION =
  "us-federal-positions:government.ban-congressional-stock-trading";
export const CONGRESS_STOCK_VIOLATION_EVENT =
  "government.congress-stock-violation";
function members(world: World): readonly EntityId[] {
  const congress = projectCongress(world);
  return congress
    ? [...congress.house.seats, ...congress.senate.seats].flatMap((s) =>
        s.occupant.kind === "member" ? [s.occupant.member.personId] : [],
      )
    : [];
}
function wealth(world: World, id: EntityId): number {
  const person = world.people[id]!;
  const age = ageOnDate(person.birthDate, world.currentDate);
  const ageMedian = research.ageMedianWealthCents.find(
    (r) => age < r.under,
  )!.cents;
  const benchmark = Math.round(
    (ageMedian * research.collegeMedianWealthCents) /
      research.allFamilyMedianWealthCents,
  );
  const liquid = resourcePositionAt(
    world,
    { kind: "person", personId: id },
    money(0, "USD").currency,
  )?.liquidBalance.minorUnits;
  return Math.max(
    benchmark,
    liquid === undefined
      ? benchmark
      : Math.round((liquid * 10000) / research.liquidWealthShareBasisPoints),
  );
}
/** Opening wealth is estimated once; portfolio ownership follows each member's wealth and own risk tolerance. */
export function ensureCongressInvestments(world: World): World {
  const current = members(world);
  if (
    current.length === 0 ||
    current.every((id) => world.congressInvestments?.portfolios[id])
  )
    return world;
  return writeWithWorldIntegrityOnce(world, () => {
    let next = ensureNationalElectionJurisdiction(world);
    const ranked = current
      .map((id) => ({
        id,
        wealth: wealth(world, id),
        score:
          wealth(world, id) * (1 + personTrait(world, id, "risk").value / 4),
      }))
      .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
    const owners = new Set(
      ranked
        .slice(
          0,
          Math.round(
            (current.length * research.individualStockHolders) /
              research.observedMembers,
          ),
        )
        .map((r) => r.id),
    );
    const portfolios: Record<EntityId, CongressionalPortfolio> = {
      ...world.congressInvestments?.portfolios,
    };
    for (const row of ranked) {
      if (portfolios[row.id]) continue;
      portfolios[row.id] = {
        personId: row.id,
        openedOn: world.currentDate,
        estimatedWealthCents: row.wealth,
        individualStockCents: owners.has(row.id)
          ? Math.round(
              (row.wealth * research.stockWealthShareBasisPoints) / 10000,
            )
          : 0,
        diversifiedFundCents: 0,
        basis:
          "ESTIMATED FROM AVERAGE: SCF age-band family wealth scaled by the college-family median; the individual's recorded cash is preserved. Individual-share allocation is the SCF ratio of conditional medians; ownership ranks wealth and own risk tolerance against the filed-disclosure cohort (data/research/laws/congressional-stock-trading.json).",
      };
      if (
        !resourcePositionAt(
          next,
          { kind: "person", personId: row.id },
          money(0, "USD").currency,
        )
      )
        next = createResourcePosition(next, {
          stableKey: `congress-investments:${row.id}:cash`,
          owner: { kind: "person", personId: row.id },
          openedAt: next.currentDate,
          openingBalance: money(
            Math.round(
              (row.wealth * research.liquidWealthShareBasisPoints) / 10000,
            ),
            "USD",
          ),
          provenance: {
            kind: "authored",
            note: "ESTIMATED FROM AVERAGE: liquid share from SCF transaction-account and family-wealth medians; no existing balance replaced.",
          },
        });
    }
    if (world.congressInvestments)
      return {
        ...next,
        congressInvestments: { ...world.congressInvestments, portfolios },
      };
    const orgs: EntityId[] = [];
    for (const [key, name, balance] of [
      [
        "clearing",
        "Investment clearing market",
        Object.values(portfolios).reduce(
          (sum, p) => sum + p.individualStockCents,
          0,
        ),
      ],
      ["manager", "Diversified fund manager", 0],
      ["penalties", "Federal stock-trading penalty account", 0],
    ] as const) {
      next = createOrganization(next, {
        stableKey: `congress-investments:${key}`,
        formedAt: next.currentDate,
        detailLevel: "lightweight",
        initialProfile: {
          name,
          classification:
            key === "penalties"
              ? "custom:federal-penalty-account"
              : "enterprise:investment-services",
          locationJurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
        },
        provenance: {
          kind: "authored",
          note: "Modeled aggregate investment-market institution; no claim about a real firm.",
        },
      });
      const id = next.history.organizations.at(-1)!.id;
      orgs.push(id);
      next = createResourcePosition(next, {
        stableKey: `congress-investments:${key}:cash`,
        owner: { kind: "organization", organizationId: id },
        openedAt: next.currentDate,
        openingBalance: money(balance, "USD"),
        provenance: {
          kind: "authored",
          note:
            key === "clearing"
              ? "Finite opening clearing cash equals the modeled individual stocks it can acquire; estimated opening market liquidity."
              : "New account opens with no deposits.",
        },
      });
    }
    const store: CongressionalInvestmentStore = {
      version: "congress-investments-v1",
      portfolios,
      charges: [],
      clearingOrganizationId: orgs[0]!,
      managerOrganizationId: orgs[1]!,
      penaltyOrganizationId: orgs[2]!,
      clearingStockCents: 0,
    };
    return { ...next, congressInvestments: store };
  });
}

/** An actual cash transfer. Selling assets to pay it reduces the saved portfolio by the same amount. */
function charge(
  world: World,
  personId: EntityId,
  measureId: EntityId,
  on: IsoDate,
  kind: "fund-fee" | "violation-fine",
  assessed: number,
  reason: string,
): World {
  const store = world.congressInvestments!;
  const key = `congress-investments:${measureId}:${personId}:${on.slice(0, 7)}:${kind}`;
  if (store.charges.some((r) => r.key === key)) return world;
  let next = world;
  let portfolio = store.portfolios[personId]!;
  const available = Math.max(
    0,
    resourcePositionAt(
      next,
      { kind: "person", personId },
      money(0, "USD").currency,
    )!.liquidBalance.minorUnits,
  );
  const buyerCash = Math.max(
    0,
    resourcePositionAt(
      next,
      { kind: "organization", organizationId: store.clearingOrganizationId },
      money(0, "USD").currency,
    )!.liquidBalance.minorUnits,
  );
  const sold = Math.min(
    Math.max(0, assessed - available),
    portfolio.individualStockCents + portfolio.diversifiedFundCents,
    buyerCash,
  );
  const provenance = {
    kind: "generated" as const,
    generatorKey: `${key}:${reason}`,
  };
  if (sold > 0) {
    next = createResourceFlow(next, {
      stableKey: `${key}:sale`,
      source: {
        kind: "organization",
        organizationId: store.clearingOrganizationId,
      },
      recipient: { kind: "person", personId },
      startsAt: on,
      amount: money(sold, "USD"),
      cadenceKind: "custom:one-time",
      basisKind: "custom:investment-sale",
      basisReference: { kind: "general" },
      restrictionKind: null,
      jurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
      provenance,
    });
    const flow = next.history.resourceFlows.at(-1)!;
    next = recordResourceTransferOutcome(next, {
      stableKey: `${key}:sale:paid`,
      resourceFlowId: flow.id,
      periodStartsAt: on,
      periodEndsAt: on,
      occurredAt: on,
      status: "completed",
      attemptedAmount: money(sold, "USD"),
      transferredAmount: money(sold, "USD"),
      reasonKind: null,
      note: reason,
      provenance,
    });
    const fromStocks = Math.min(sold, portfolio.individualStockCents);
    portfolio = {
      ...portfolio,
      individualStockCents: portfolio.individualStockCents - fromStocks,
      diversifiedFundCents:
        portfolio.diversifiedFundCents - (sold - fromStocks),
    };
  }
  const paid = Math.min(assessed, available + sold);
  const recipient =
    kind === "fund-fee"
      ? store.managerOrganizationId
      : store.penaltyOrganizationId;
  next = createResourceFlow(next, {
    stableKey: `${key}:charge`,
    source: { kind: "person", personId },
    recipient: { kind: "organization", organizationId: recipient },
    startsAt: on,
    amount: money(assessed, "USD"),
    cadenceKind: "custom:one-time",
    basisKind:
      kind === "fund-fee"
        ? "custom:fund-management-fee"
        : "custom:congress-stock-fine",
    basisReference: { kind: "general" },
    restrictionKind: null,
    jurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
    provenance,
  });
  const flow = next.history.resourceFlows.at(-1)!;
  if (kind === "violation-fine")
    next = createResourceObligation(next, {
      stableKey: `${key}:obligation`,
      resourceFlowId: flow.id,
      establishedAt: on,
      basisKind: "debt:congress-stock-penalty",
      principal: money(assessed, "USD"),
      careResponsibilityId: null,
      housingTenureId: null,
      provenance,
    });
  next = recordResourceTransferOutcome(next, {
    stableKey: `${key}:paid`,
    resourceFlowId: flow.id,
    periodStartsAt: on,
    periodEndsAt: on,
    occurredAt: on,
    status: paid === assessed ? "completed" : paid > 0 ? "partial" : "missed",
    attemptedAmount: money(assessed, "USD"),
    transferredAmount: money(paid, "USD"),
    reasonKind:
      paid === assessed ? null : "capacity:insufficient-cash-and-assets",
    note: reason,
    provenance,
  });
  const outcome = next.history.resourceTransferOutcomes.at(-1)!;
  next = {
    ...next,
    congressInvestments: {
      ...store,
      portfolios: { ...store.portfolios, [personId]: portfolio },
      clearingStockCents: store.clearingStockCents + sold,
      charges: [
        ...store.charges,
        {
          key,
          personId,
          measureId,
          on,
          kind,
          assessedCents: assessed,
          outcomeId: outcome.id,
          reason,
        },
      ],
    },
  };
  if (kind === "violation-fine")
    next = recordWorldEvent(next, {
      stableKey: `${key}:public-violation`,
      type: CONGRESS_STOCK_VIOLATION_EVENT,
      occurredAt: on,
      recordedAt: next.currentDate,
      jurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
      involvedEntityIds: [personId, measureId, flow.id],
      participants: [],
      personFactConstraints: [],
      visibility: "public",
      tags: [
        "congress-investments-v1",
        `member:${personId}`,
        `law:${measureId}`,
        `fine-cents:${assessed}`,
        `paid-cents:${paid}`,
        `payment-outcome:${outcome.id}`,
      ],
      summary: `A member retained individual stocks after the law's deadline. The assessed fine was $${(assessed / 100).toFixed(2)}; $${(paid / 100).toFixed(2)} was paid.`,
      context: {
        location: null,
        socialContext: null,
        pressure: null,
        choice:
          "Retain individual stock holdings after the compliance deadline.",
        motivation: null,
        immediateReaction:
          "The violation and its assessed and paid amounts are public records.",
      },
    });
  return next;
}

/** Monthly enforcement uses the member's own views and traits. No compliance outcome is drawn. */
export function applyCongressStockBan(
  world: World,
  on: IsoDate = world.currentDate,
): World {
  const reading = policyTermsInForce(
    world,
    NATIONAL_ELECTION_JURISDICTION.id,
    CONGRESS_STOCK_BAN_QUESTION,
    on,
  );
  const deadline = reading?.terms?.values.deadlineDays;
  const fine = reading?.terms?.values.fineCents;
  const active =
    deadline !== undefined &&
    fine !== undefined &&
    on >= addDays(reading!.law.operativeAt, deadline);
  if (
    !active &&
    !Object.values(world.congressInvestments?.portfolios ?? {}).some(
      (p) => p.conversionMeasureId && p.diversifiedFundCents > 0,
    )
  )
    return world;
  return writeWithWorldIntegrityOnce(world, () => {
    let next = ensureCongressInvestments(world);
    const current = members(next);
    const memberSet = new Set(current);
    const managed = [
      ...new Set([
        ...current,
        ...Object.values(next.congressInvestments!.portfolios)
          .filter((p) => p.conversionMeasureId && p.diversifiedFundCents > 0)
          .map((p) => p.personId),
      ]),
    ];
    next = ensureOfficeholderPrinciples(next, current);
    const proposition = Object.values(next.policyCatalog.propositions).find(
      (p) => p.stableKey === CONGRESS_STOCK_BAN_QUESTION,
    )!;
    for (const id of managed) {
      const portfolio = next.congressInvestments!.portfolios[id]!;
      const views = principledLeaning(next, id, proposition.id);
      const reliability = personTrait(next, id, "reliability").value;
      const deliberation = personTrait(next, id, "deliberation").value;
      const risk = personTrait(next, id, "risk").value;
      const leaning = views.score + reliability - deliberation - risk;
      const reason = `DECIDED: principle score ${views.score} (records ${views.recordIds.join(", ") || "none"}), reliability ${reliability}, impulsiveness ${deliberation}, risk tolerance ${risk}; compliance leaning ${leaning}. Diversified funds cost ${research.diversifiedFundFeeBasisPoints}/10000 annually, less than the bill's ${fine} cent fine.`;
      if (active && memberSet.has(id) && portfolio.individualStockCents > 0) {
        if (leaning < 0) {
          next = charge(
            next,
            id,
            reading!.law.measureId,
            on,
            "violation-fine",
            fine!,
            reason,
          );
          continue;
        }
        next = {
          ...next,
          congressInvestments: {
            ...next.congressInvestments!,
            portfolios: {
              ...next.congressInvestments!.portfolios,
              [id]: {
                ...portfolio,
                conversionMeasureId: reading!.law.measureId,
                diversifiedFundCents:
                  portfolio.diversifiedFundCents +
                  portfolio.individualStockCents,
                individualStockCents: 0,
              },
            },
          },
        };
      }
      const held =
        next.congressInvestments!.portfolios[id]!.diversifiedFundCents;
      const fee = Math.round(
        (held * research.diversifiedFundFeeBasisPoints) / 10000 / 12,
      );
      if (fee > 0)
        next = charge(
          next,
          id,
          next.congressInvestments!.portfolios[id]!.conversionMeasureId!,
          on,
          "fund-fee",
          fee,
          reason,
        );
    }
    return next;
  });
}

export function stockBanFineReceipts(world: World, month: IsoDate): number {
  const charges =
    world.congressInvestments?.charges.filter(
      (r) =>
        r.kind === "violation-fine" && r.on.slice(0, 7) === month.slice(0, 7),
    ) ?? [];
  const outcomes = new Map(
    world.history.resourceTransferOutcomes.map((r) => [r.id, r]),
  );
  return Math.round(
    charges.reduce(
      (sum, r) =>
        sum + (outcomes.get(r.outcomeId)?.transferredAmount.minorUnits ?? 0),
      0,
    ) / 100,
  );
}

export const CONGRESS_STOCK_DEADLINE_KEY = "government:congress-stock-deadline";
export function scheduleCongressStockDeadline(
  world: World,
  enactment: LegislativeEnactmentRecord,
): World {
  const measure = world.history.legislativeMeasures?.find(
    (r) => r.id === enactment.measureId,
  );
  const terms = measure?.policyTerms?.find(
    (r) => r.questionKey === CONGRESS_STOCK_BAN_QUESTION,
  );
  const operative = operativeDateForEnactment(enactment);
  if (!terms || !operative) return world;
  const days = terms.values.deadlineDays;
  if (days === undefined || !Number.isSafeInteger(days) || days < 0)
    throw Error(
      "A congressional stock deadline requires nonnegative whole days.",
    );
  const stableKey = `congress-stock-deadline:${enactment.measureId}`;
  if (world.history.futureDueItems.some((r) => r.stableKey === stableKey))
    return world;
  const dueAt = addDays(operative.date, days);
  if (dueAt <= world.currentDate)
    return applyCongressStockBan(ensureCongressInvestments(world));
  return scheduleFutureDueItem(ensureCongressInvestments(world), {
    stableKey,
    dueAt,
    transitionKey: CONGRESS_STOCK_DEADLINE_KEY,
    entityIds: [enactment.measureId],
    jurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
    provenance: { kind: "initialization", reference: stableKey },
  });
}
export function congressStockDeadlineHandler(
  world: World,
  item: FutureDueItem,
): FutureTransitionHandlerResult {
  if (item.transitionKey !== CONGRESS_STOCK_DEADLINE_KEY)
    throw Error("The stock deadline handler received another transition.");
  return {
    world: applyCongressStockBan(world),
    status: "resolved",
    reasonKey: null,
    context: "The filed congressional stock deadline was enforced.",
    outcomeEventId: null,
  };
}
