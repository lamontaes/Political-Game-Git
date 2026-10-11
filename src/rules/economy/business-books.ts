/** Full retained IRS kind-source parsing, cost response and hiring/layoff math. */
import type { TownBusinessBooks } from "../../simulation/living-world/town-finance-types";
export interface BusinessBookSourceFacts {
  readonly rows: string;
}
const readers = new WeakMap<
  BusinessBookSourceFacts,
  ReturnType<typeof compile>
>();
function reader(facts: BusinessBookSourceFacts) {
  let read = readers.get(facts);
  if (!read) {
    read = compile(facts);
    readers.set(facts, read);
  }
  return read;
}
export function otherCostsAtSales(
  facts: BusinessBookSourceFacts,
  books: TownBusinessBooks,
) {
  return reader(facts).costs(books);
}
// stopgapId: "economy.no-average-pay-estimate"
export function townBusinessHasRoomToHire(
  facts: BusinessBookSourceFacts,
  books: TownBusinessBooks | undefined,
  staff: number,
  townAveragePay = 0,
) {
  return reader(facts).hire(books, staff, townAveragePay);
}
// stopgapId: "economy.layoff-pay-tolerance"
export function townBusinessLaysOff(
  facts: BusinessBookSourceFacts,
  books: TownBusinessBooks | undefined,
  staff: number,
) {
  return reader(facts).layoff(books, staff);
}
// stopgapId: "economy.business-book-kind-source-mean"
function compile(facts: BusinessBookSourceFacts) {
  const IRS_TOWN_BUSINESS_BOOKS = facts.rows;
  const TOWN_BUSINESS_INDUSTRIES: Readonly<Record<string, string>> = {
    farm: "Agricultural production",
    quarry: "Nonmetallic mineral mining and quarrying",
    construction: "Construction",
    manufacturing: "Manufacturing",
    wholesale: "Wholesale trade",
    retail: "Retail trade",
    trucking: "Truck transportation",
    information: "Telecommunications",
    insurance: "Insurance agencies and brokerages",
    realty: "Offices of real estate agents and brokers",
    professional: "Professional, scientific, and technical services",
    "building-services": "Other administrative and support services",
    "private-school": "Educational services",
    clinic: "Offices of physicians",
    "care-home": "Hospitals, nursing, and residential care facilities",
    recreation: "Amusement, gambling, and recreation industries",
    restaurant: "Food services and drinking places",
    inn: "Accommodation",
    repair: "Automotive repair and maintenance",
    "personal-care": "Personal and laundry services",
    "*": "All industries",
  };
  interface TownBusinessKindBooks {
    readonly margin: number;
    readonly payShare: number;
    readonly salesCostShare: number;
    readonly industry: string;
  }
  const TOWN_BUSINESS_KIND_BOOKS: Readonly<
    Record<string, TownBusinessKindBooks>
  > = Object.fromEntries(
    IRS_TOWN_BUSINESS_BOOKS.split(";").map((cell) => {
      const [kind, values] = cell.split("=") as [string, string];
      const [margin, payShare, salesCostShare] = values.split(",").map(Number);
      return [
        kind,
        {
          margin: margin!,
          payShare: payShare!,
          salesCostShare: salesCostShare!,
          industry: TOWN_BUSINESS_INDUSTRIES[kind] ?? kind,
        },
      ];
    }),
  );
  function townBusinessKindBooks(kind: string): TownBusinessKindBooks {
    return TOWN_BUSINESS_KIND_BOOKS[kind] ?? TOWN_BUSINESS_KIND_BOOKS["*"]!;
  }
  function otherCostsAtSales(books: TownBusinessBooks): number {
    const share = townBusinessKindBooks(books.kind).salesCostShare;
    const scale = books.capacity > 0 ? books.annualRevenue / books.capacity : 0;
    return books.annualOtherCosts * (1 - share + share * scale);
  }
  function townBusinessHasRoomToHire(
    books: TownBusinessBooks | undefined,
    staff: number,
    townAveragePay = 0,
  ): boolean {
    if (!books || books.lastQuarterPay === undefined || staff <= 0) return true;
    const yearlyPay = books.lastQuarterPay * 4;
    const payWithOneMore =
      yearlyPay + Math.max(yearlyPay / staff, townAveragePay);
    return payWithOneMore <= payTheBooksCover(books);
  }
  function payTheBooksCover(books: TownBusinessBooks): number {
    return books.annualRevenue * (1 - books.margin) - otherCostsAtSales(books);
  }
  function townBusinessLaysOff(
    books: TownBusinessBooks | undefined,
    staff: number,
  ): boolean {
    if (!books || books.lastQuarterPay === undefined || staff < 2) return false;
    return books.lastQuarterPay * 4 > payTheBooksCover(books) + 1;
  }
  return {
    costs: otherCostsAtSales,
    hire: townBusinessHasRoomToHire,
    layoff: townBusinessLaysOff,
  };
}
