/** Retained KEEP source/helper closure; unchanged native public-owner proof is bounded. */
import type {
  EntityId,
  OrganizationClassification,
  OccupationClassification,
} from "../../simulation/types";
import {
  localBusinessSupplyFor as supplyFromFacts,
  type BusinessSupplyFacts,
} from "./business-supply";
export function localBusinessPlansFor(
  facts: BusinessSupplyFacts,
  id: EntityId,
) {
  const read = (id: EntityId) => supplyFromFacts(facts, id);
  return compile(read)(id);
}
// stopgapId: "economy.business-plan-opening-caps"
interface LocalBusinessKind {
  readonly key: string;
  readonly name: (familyName: string) => string;
  readonly classification: OrganizationClassification;
  readonly ownerTitle: string;
  readonly workerTitle: string;
  readonly workerOccupation: OccupationClassification;
  readonly workers: number;
}
export interface LocalBusinessPlan {
  readonly kind: LocalBusinessKind;
  readonly index: number;
  readonly workers: number;
  readonly monthlyRevenueMinor: number;
  readonly expected: number | null;
  readonly sourced: boolean;
  readonly estimateBasis?: string;
}
function compile(
  localBusinessSupplyFor: (id: EntityId) => ReturnType<typeof supplyFromFacts>,
) {
  const LOCAL_BUSINESS_KINDS: readonly LocalBusinessKind[] = [
    {
      key: "grocery",
      name: (family) => `${family}'s Market`,
      classification: "enterprise:retail",
      ownerTitle: "Owner",
      workerTitle: "Cashier",
      workerOccupation: "occupation:cashier",
      workers: 3,
    },
    {
      key: "hardware",
      name: (family) => `${family} Hardware`,
      classification: "enterprise:retail",
      ownerTitle: "Owner",
      workerTitle: "Sales clerk",
      workerOccupation: "occupation:retail-sales",
      workers: 2,
    },
    {
      key: "diner",
      name: (family) => `${family}'s Diner`,
      classification: "enterprise:food-service",
      ownerTitle: "Owner",
      workerTitle: "Server",
      workerOccupation: "service:food-server",
      workers: 3,
    },
    {
      key: "auto-repair",
      name: (family) => `${family} Auto Repair`,
      classification: "enterprise:repair",
      ownerTitle: "Owner and mechanic",
      workerTitle: "Mechanic",
      workerOccupation: "trade:automotive-mechanic",
      workers: 2,
    },
    {
      key: "law-office",
      name: (family) => `${family} Law Office`,
      classification: "enterprise:legal-services",
      ownerTitle: "Attorney",
      workerTitle: "Legal assistant",
      workerOccupation: "profession:legal-assistant",
      workers: 1,
    },
    {
      key: "accounting",
      name: (family) => `${family} Accounting`,
      classification: "enterprise:professional-services",
      ownerTitle: "Accountant",
      workerTitle: "Bookkeeper",
      workerOccupation: "profession:bookkeeper",
      workers: 1,
    },
    {
      key: "construction",
      name: (family) => `${family} Construction`,
      classification: "enterprise:construction",
      ownerTitle: "Owner and contractor",
      workerTitle: "Carpenter",
      workerOccupation: "trade:carpenter",
      workers: 4,
    },
    {
      key: "salon",
      name: (family) => `${family}'s Hair Salon`,
      classification: "enterprise:personal-services",
      ownerTitle: "Owner and stylist",
      workerTitle: "Stylist",
      workerOccupation: "service:hairstylist",
      workers: 2,
    },
  ];
  const LOCAL_BUSINESS_MAX_PER_KIND = 2;
  const LOCAL_BUSINESS_MAX_STAFF = 3;
  function computePlans(
    jurisdictionId: EntityId,
  ): readonly LocalBusinessPlan[] {
    const supply = localBusinessSupplyFor(jurisdictionId);
    if (!supply) return [];
    const plans: LocalBusinessPlan[] = [];
    const build = (
      kind: LocalBusinessKind,
      row: (typeof supply)[number],
      count: number,
    ) => {
      const workers = Math.min(
        LOCAL_BUSINESS_MAX_STAFF,
        Math.max(1, Math.round(row.staffPerBusiness)),
      );
      for (let index = 0; index < count; index += 1)
        plans.push({
          kind,
          index,
          workers,
          monthlyRevenueMinor: Math.round(
            (workers * row.salesPerEmployeeDollars * 100) / 12,
          ),
          expected: row.expected,
          sourced: true,
          estimateBasis: row.estimateBasis,
        });
    };
    for (const kind of LOCAL_BUSINESS_KINDS) {
      const row = supply.find((entry) => entry.kind === kind.key);
      if (!row) continue;
      build(
        kind,
        row,
        Math.min(LOCAL_BUSINESS_MAX_PER_KIND, Math.round(row.expected)),
      );
    }
    if (plans.length === 0) {
      const likeliest = [...supply].sort((a, b) => b.expected - a.expected)[0]!;
      const kind = LOCAL_BUSINESS_KINDS.find(
        (entry) => entry.key === likeliest.kind,
      )!;
      build(kind, likeliest, 1);
    }
    return plans;
  }
  return computePlans;
}
