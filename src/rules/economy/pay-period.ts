/** Retained private size bands and full native BLS period weights. Legacy producer position is an explicit upstream receipt; no RNG is created. */
import type {
  EntityId,
  OrganizationClassification,
} from "../../simulation/types";
import type { organizationProfileAt as nativeProfile } from "../../simulation/life-queries";
import type { TOWN_PAY_PERIOD_SHARES as nativeShares } from "../../simulation/living-world/town-pay.generated";
export interface PayPeriodFacts {
  readonly shares: typeof nativeShares;
  readonly profiles: ReadonlyMap<EntityId, ReturnType<typeof nativeProfile>>;
  readonly nativePositions: ReadonlyMap<EntityId, number>;
}
// stopgapId: "economy.pay-period-native-producer"
function nativePeriodPosition(facts: PayPeriodFacts, id: EntityId) {
  if (!facts.nativePositions.has(id))
    throw Error("Missing legacy pay-period producer receipt: " + id);
  return facts.nativePositions.get(id)!;
}
function organizationProfileAt(facts: PayPeriodFacts, id: EntityId) {
  if (!facts.profiles.has(id))
    throw Error("Missing pay employer profile receipt: " + id);
  return facts.profiles.get(id) ?? null;
}
export function townPayPeriod(
  facts: PayPeriodFacts,
  id: EntityId,
  classification: OrganizationClassification | string,
  staff: number,
) {
  return compile(facts)(id, classification, staff);
}
function compile(facts: PayPeriodFacts) {
  const TOWN_PAY_PERIOD_SHARES = facts.shares;

  type TownPayPeriod = "weekly" | "biweekly" | "semimonthly" | "monthly";
  const PERIOD_OF_BLS: Readonly<Record<string, TownPayPeriod>> = {
    Weekly: "weekly",
    Biweekly: "biweekly",
    Semimonthly: "semimonthly",
    Monthly: "monthly",
  };
  const GOVERNMENT_CLASSIFICATIONS = new Set<string>([
    "sector:federal-government-office",
    "sector:state-government-office",
    "sector:local-government-office",
    "service:fire",
    "service:police",
    "service:public-health",
    "service:school",
  ]);
  // stopgapId: "economy.pay-period-industry-size-independence"
  const INDUSTRY_OF: Readonly<Record<string, string>> = {
    "enterprise:agriculture": "Mining and logging",
    "enterprise:mining": "Mining and logging",
    "enterprise:construction": "Construction",
    "enterprise:manufacturing": "Manufacturing",
    "enterprise:retail": "Trade, transportation, and utilities",
    "enterprise:wholesale": "Trade, transportation, and utilities",
    "enterprise:transportation": "Trade, transportation, and utilities",
    "enterprise:utility": "Trade, transportation, and utilities",
    "enterprise:telecommunications": "Information",
    "enterprise:banking": "Financial activities",
    "enterprise:insurance": "Financial activities",
    "enterprise:real-estate": "Financial activities",
    "enterprise:professional-services": "Professional and business services",
    "enterprise:corporate-office": "Professional and business services",
    "enterprise:building-services": "Professional and business services",
    "enterprise:political-consulting": "Professional and business services",
    "service:clinic": "Education and health services",
    "service:hospital": "Education and health services",
    "service:nursing-home": "Education and health services",
    "service:private-school": "Education and health services",
    "enterprise:food-service": "Leisure and hospitality",
    "enterprise:lodging": "Leisure and hospitality",
    "enterprise:recreation": "Leisure and hospitality",
    "enterprise:repair": "Other services",
    "enterprise:personal-services": "Other services",
    "community:congregation": "Other services",
    "community:organizing-nonprofit": "Other services",
    "membership:labor-union": "Other services",
    "membership:party-chapter": "Other services",
  };
  function sizeGroup(staff: number): string {
    if (staff < 10) return "1–9";
    if (staff < 20) return "10–19";
    if (staff < 50) return "20–49";
    if (staff < 100) return "50–99";
    if (staff < 250) return "100–249";
    if (staff < 500) return "250–499";
    if (staff < 1000) return "500–999";
    return "1,000+";
  }
  function selectPeriod(
    facts: PayPeriodFacts,
    organizationId: EntityId,
    classification: OrganizationClassification | string,
    staff: number,
  ): TownPayPeriod {
    if (
      GOVERNMENT_CLASSIFICATIONS.has(classification) ||
      organizationProfileAt(facts, organizationId)?.publicGovernmentIdentity
    )
      return "biweekly";
    const overall =
      TOWN_PAY_PERIOD_SHARES["overall|all private establishments"]!;
    const industry = INDUSTRY_OF[classification];
    const byIndustry = industry
      ? TOWN_PAY_PERIOD_SHARES[`industry|${industry}`]
      : undefined;
    const bySize =
      TOWN_PAY_PERIOD_SHARES[`establishment-size|${sizeGroup(staff)}`];
    const weights = Object.keys(PERIOD_OF_BLS).map((name) => {
      const base = overall[name] ?? 0;
      const weight =
        base <= 0
          ? 0
          : ((byIndustry?.[name] ?? base) * (bySize?.[name] ?? base)) / base;
      return [name, weight] as const;
    });
    const total = weights.reduce((sum, [, weight]) => sum + weight, 0);
    let roll = nativePeriodPosition(facts, organizationId) * total;
    for (const [name, weight] of weights) {
      roll -= weight;
      if (roll < 0) return PERIOD_OF_BLS[name]!;
    }
    return "biweekly";
  }
  return (
    id: EntityId,
    classification: OrganizationClassification | string,
    staff: number,
  ) => selectPeriod(facts, id, classification, staff);
}
