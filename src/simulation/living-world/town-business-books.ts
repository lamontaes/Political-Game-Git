/**
 * What each kind of town business earns and spends, and whether its books
 * leave room to hire. No imports from the town's employment, so hiring can
 * read the books without a cycle.
 */
import { IRS_TOWN_BUSINESS_BOOKS } from "./town-business-books.generated";
import type { TownBusinessBooks } from "./town-finance-types";

/** The industry in the IRS's table each kind of business is read from. */
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

export interface TownBusinessKindBooks {
  /** Net income over total receipts when its books open. */
  readonly margin: number;
  /** Officers' pay and salaries over total receipts. */
  readonly payShare: number;
  /** The share of its costs other than pay that rise and fall with sales. */
  readonly salesCostShare: number;
  readonly industry: string;
}

/**
 * MEASURED, per kind of business: its margin when its books open, its pay
 * as a share of its sales, and the share of its costs other than pay that
 * rise and fall with its sales. IRS Statistics of Income, corporation
 * returns for tax year 2022, Table 5.1 (22co51ccr.xlsx), read September 29,
 * 2026, for the industry named, compiled into
 * `town-business-books.generated.ts`. The margin is net income less
 * deficit over total receipts, across every return in the industry, so it
 * already averages the ones that lost money. Pay is officers' pay and
 * salaries over total receipts. The share that follows sales is cost of
 * goods sold over the other deductions: total receipts less net income less
 * officers' pay and salaries. Where the IRS suppresses cost of goods sold,
 * the share is ESTIMATED FROM AVERAGE: the mean, 0.34, of the seven service
 * kinds whose cost is published (professional, building services, private
 * school, clinic, recreation, telephone and internet, personal care).
 *
 * Spread: in the same year 38% of retail returns and 42% of restaurant
 * returns reported a loss (Table 1, 22co01ccr.xlsx), a spread across one
 * year that includes businesses in their first years and a bad year's
 * losses. Every business of a kind opens at the kind's margin; what sets
 * them apart afterward is their town, their rivals, their own pay and their
 * cash, not a draw.
 */
export const TOWN_BUSINESS_KIND_BOOKS: Readonly<
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

/**
 * The books of a kind of business. A kind with no row of its own takes the
 * row for every active corporation (ESTIMATED FROM AVERAGE).
 */
export function townBusinessKindBooks(kind: string): TownBusinessKindBooks {
  return TOWN_BUSINESS_KIND_BOOKS[kind] ?? TOWN_BUSINESS_KIND_BOOKS["*"]!;
}

/**
 * The yearly costs other than pay of a business at its current sales: the
 * share that follows sales for its kind moves with them.
 */
export function otherCostsAtSales(books: TownBusinessBooks): number {
  const share = townBusinessKindBooks(books.kind).salesCostShare;
  const scale = books.capacity > 0 ? books.annualRevenue / books.capacity : 0;
  return books.annualOtherCosts * (1 - share + share * scale);
}

/**
 * Whether a business's books leave room for one more hire: its sales last
 * quarter, less its other costs and its kind's margin, still cover its pay
 * with one more person at its average pay. A business hires when its sales
 * need hands, not because somebody in town is looking for work. Books not
 * yet opened, or from an older save, leave room.
 */
export function townBusinessHasRoomToHire(
  books: TownBusinessBooks | undefined,
  staff: number,
  /** What a job in town pays a year on average, when known. */
  townAveragePay = 0,
): boolean {
  if (!books || books.lastQuarterPay === undefined || staff <= 0) return true;
  const yearlyPay = books.lastQuarterPay * 4;
  // The next hire may be paid more than its average worker: at least the
  // town's average job.
  const payWithOneMore =
    yearlyPay + Math.max(yearlyPay / staff, townAveragePay);
  return payWithOneMore <= payTheBooksCover(books);
}

/** The yearly pay its sales cover after its other costs and its margin. */
function payTheBooksCover(books: TownBusinessBooks): number {
  return books.annualRevenue * (1 - books.margin) - otherCostsAtSales(books);
}

/**
 * Whether a business lays somebody off this quarter: its sales last quarter
 * no longer covered its pay after its other costs, and it has somebody
 * besides whoever runs it. One person a quarter; a business of one keeps
 * going on its cash until its books close it.
 */
export function townBusinessLaysOff(
  books: TownBusinessBooks | undefined,
  staff: number,
): boolean {
  if (!books || books.lastQuarterPay === undefined || staff < 2) return false;
  return books.lastQuarterPay * 4 > payTheBooksCover(books) + 1;
}

/**
 * GAME ASSUMPTION: the town workplaces that are businesses which open and
 * close. Utilities, banks, the regional office and the hospital are
 * branches or institutions that rarely close in a town's lifetime; public
 * offices, congregations, unions and parties are not businesses.
 */
export const TOWN_BUSINESS_WORKPLACES: ReadonlySet<string> = new Set([
  "farm",
  "quarry",
  "construction",
  "manufacturing",
  "wholesale",
  "retail",
  "trucking",
  "information",
  "insurance",
  "realty",
  "professional",
  "building-services",
  "private-school",
  "clinic",
  "care-home",
  "recreation",
  "restaurant",
  "inn",
  "repair",
  "personal-care",
]);
