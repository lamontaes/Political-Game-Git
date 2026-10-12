/** Full retained price/qualification/balance/primary-household math; no home or loan writer is duplicated. */
import { ageOnDate } from "../../simulation/dates";
import { money } from "../laws/money-facts";
import {
  resourcePositionAt,
  sameEndpoint,
  type CashFacts,
} from "./cash-positions";
import {
  homePriceLevel,
  homePriceLevels,
  type HousingPriceFacts,
} from "./housing-prices";
import { macroMonthHistory } from "./macro-readings";
import {
  homeValueForJurisdiction,
  type CountyValueFacts,
} from "./county-home-values";
import {
  homeBuyerKind,
  homeDownPaymentShare,
  type DownPaymentFacts,
} from "./down-payments";
import { mortgageFinancingQuote, type MortgageFacts } from "./mortgage-quotes";
import type {
  EntityId,
  IsoDate,
  HousingTenure,
  World,
} from "../../simulation/types";
import type { householdMembershipsAt } from "../../simulation/life-queries";
import type { lifePlaceByJurisdictionId } from "../../simulation/life-places";
// stopgapId: "economy.home-purchase-native-English"
export function moneyText(amount: {
  readonly minorUnits: number;
  readonly currency: string;
}): string {
  const whole = amount.minorUnits % 100 === 0;
  const digits = (Math.abs(amount.minorUnits) / 100).toLocaleString("en-US", {
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: whole ? 0 : 2,
  });
  const sign = amount.minorUnits < 0 ? "-" : "";
  return amount.currency === "USD"
    ? `${sign}$${digits}`
    : `${sign}${amount.currency} ${digits}`;
}
export interface HomePurchaseFacts {
  readonly onDate: IsoDate;
  readonly control: World["control"];
  readonly people: World["people"];
  readonly memberships: ReadonlyMap<
    EntityId,
    ReturnType<typeof householdMembershipsAt>
  >;
  readonly activeTenures: ReadonlyMap<string, readonly HousingTenure[]>;
  readonly places: ReadonlyMap<
    EntityId,
    ReturnType<typeof lifePlaceByJurisdictionId>
  >;
  readonly cash: CashFacts;
  readonly prices: HousingPriceFacts;
  readonly values: CountyValueFacts;
  readonly down: DownPaymentFacts;
  readonly mortgage: MortgageFacts;
}
export const HOME_PURCHASE_CURRENCY = "USD" as const;

export interface HomePurchaseTerms {
  readonly priceMinor: number;
  readonly downPaymentMinor: number;
  readonly monthlyPaymentMinor: number | null;
  readonly downPaymentBasis: ReturnType<typeof homeDownPaymentShare>["basis"];
  readonly downPaymentSource: string;
}

function roundTo(minor: number, step: number): number {
  return Math.max(step, Math.round(minor / step) * step);
}

export function homePurchaseTerms(
  facts: HomePurchaseFacts,
  jurisdictionId: EntityId | null,
  buyerId: EntityId | null = facts.control.kind === "person"
    ? facts.control.personId
    : null,
): HomePurchaseTerms {
  const today = facts.onDate;
  const openingPriceMinor =
    homeValueForJurisdiction(facts.values, jurisdictionId).dollars * 100;
  const housingFactor = jurisdictionId
    ? homePriceLevel(facts.prices, jurisdictionId, today)
    : (homePriceLevels(
        macroMonthHistory(
          { months: facts.prices.months, releases: [] },
          "national",
          today,
        ),
      ).at(-1)?.level ?? 1);
  const priceMinor = roundTo(openingPriceMinor * housingFactor, 100000);
  const down = homeDownPaymentShare(
    facts.down,
    homeBuyerKind(facts.down, buyerId),
  );
  const downPaymentMinor = Math.round(priceMinor * down.share);
  const financing = mortgageFinancingQuote(facts.mortgage, {
    principal: money(priceMinor - downPaymentMinor, HOME_PURCHASE_CURRENCY),
    jurisdictionId,
    rateCap: null,
  });
  return {
    priceMinor,
    downPaymentMinor,
    monthlyPaymentMinor: financing?.monthlyPaymentMinor ?? null,
    downPaymentBasis: down.basis,
    downPaymentSource: down.source,
  };
}

// stopgapId: "economy.home-purchase-majority-age"
export const HOME_BUYING_AGE = 18;

function dollars(minor: number): string {
  return moneyText({ minorUnits: minor, currency: "USD" });
}

function primaryHouseholdId(
  facts: HomePurchaseFacts,
  personId: EntityId,
): EntityId | null {
  const homes = (facts.memberships.get(personId) ?? []).filter(
    (entry) => entry.state.residenceRole === "primary",
  );
  return homes.length === 1 ? homes[0]!.household.id : null;
}

export function ownedHomeFor(
  facts: HomePurchaseFacts,
  householdId: EntityId,
  asOfDate: IsoDate = facts.onDate,
): HousingTenure | null {
  return (
    (
      facts.activeTenures.get(
        JSON.stringify([asOfDate, facts.cash.records.nextSequence]),
      ) ?? []
    ).find(
      (tenure) =>
        tenure.holder.kind === "household" &&
        tenure.holder.householdId === householdId &&
        tenure.kind.startsWith("ownership:"),
    ) ?? null
  );
}

function balance(facts: HomePurchaseFacts, personId: EntityId): number | null {
  const owner = { kind: "person" as const, personId };
  const tracked = facts.cash.records.resourcePositions.some(
    (position) =>
      sameEndpoint(position.owner, owner) &&
      position.openingBalance.currency === HOME_PURCHASE_CURRENCY,
  );
  if (!tracked) return null;
  return (
    resourcePositionAt(
      facts.cash,
      owner,
      money(0, HOME_PURCHASE_CURRENCY).currency,
    )?.liquidBalance.minorUnits ?? 0
  );
}

export function homePurchaseReason(
  facts: HomePurchaseFacts,
  personId: EntityId,
): string | null {
  if (facts.control.kind !== "person" || facts.control.personId !== personId)
    return "Only the person you are playing can buy a home.";
  const person = facts.people[personId];
  if (!person) return "This person is not in the world.";
  if (ageOnDate(person.birthDate, facts.onDate) < HOME_BUYING_AGE)
    return `You have to be ${HOME_BUYING_AGE} to buy a home.`;
  if (!facts.places.get(person.homeJurisdictionId))
    return "The game does not know which town you live in.";
  const householdId = primaryHouseholdId(facts, personId);
  if (!householdId) return "You need one home household to buy a home for.";
  if (ownedHomeFor(facts, householdId))
    return "Your household already owns its home.";
  const have = balance(facts, personId);
  if (have === null) return "The game is not tracking your money.";
  const { downPaymentMinor, monthlyPaymentMinor } = homePurchaseTerms(
    facts,
    person.homeJurisdictionId,
  );
  if (monthlyPaymentMinor === null)
    return "A mortgage quote is unavailable until the economy has a recorded rate.";
  if (have < downPaymentMinor)
    return `The down payment is ${dollars(downPaymentMinor)}. You have ${dollars(have)}.`;
  return null;
}
