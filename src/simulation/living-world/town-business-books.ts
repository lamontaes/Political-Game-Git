/**
 * What each kind of town business earns and spends, and whether its books
 * leave room to hire. No imports from the town's employment, so hiring can
 * read the books without a cycle.
 */
import type { TownBusinessBooks } from "./town-finance-types";

/**
 * MEASURED, per kind of business: its margin when its books open, and the
 * share of its costs other than pay that rise and fall with its sales. IRS
 * Statistics of Income, corporation returns for tax year 2022, Table 5.1
 * (22co51ccr.xlsx), read September 29, 2026, for the industry named. The
 * margin is net income less deficit over total receipts, across every
 * return in the industry, so it already averages the ones that lost money.
 * The share that follows sales is cost of goods sold over the other
 * deductions: total receipts less net income less officers' pay and
 * salaries. Where the IRS suppresses cost of goods sold, the share is
 * ESTIMATED FROM AVERAGE: the mean, 0.34, of the seven service kinds whose
 * cost is published (professional, building services, private school,
 * clinic, recreation, telephone and internet, personal care).
 *
 * Spread: in the same year 38% of retail returns and 42% of restaurant
 * returns reported a loss (Table 1, 22co01ccr.xlsx), a spread across one
 * year that includes businesses in their first years and a bad year's
 * losses. Every business of a kind opens at the kind's margin; what sets
 * them apart afterward is their town, their rivals, their own pay and their
 * cash, not a draw.
 */
export const TOWN_BUSINESS_KIND_BOOKS: Readonly<
  Record<
    string,
    {
      readonly margin: number;
      readonly salesCostShare: number;
      readonly industry: string;
    }
  >
> = {
  farm: {
    margin: 0.0491,
    salesCostShare: 0.462,
    industry: "Agricultural production",
  },
  quarry: {
    margin: 0.0847,
    salesCostShare: 0.731,
    industry: "Nonmetallic mineral mining and quarrying",
  },
  construction: {
    margin: 0.0538,
    salesCostShare: 0.829,
    industry: "Construction",
  },
  manufacturing: {
    margin: 0.1433,
    salesCostShare: 0.841,
    industry: "Manufacturing",
  },
  wholesale: {
    margin: 0.0513,
    salesCostShare: 0.895,
    industry: "Wholesale trade",
  },
  retail: { margin: 0.0455, salesCostShare: 0.826, industry: "Retail trade" },
  trucking: {
    margin: 0.0509,
    salesCostShare: 0.474,
    industry: "Truck transportation",
  },
  information: {
    margin: 0.0819,
    salesCostShare: 0.271,
    industry: "Telecommunications",
  },
  insurance: {
    margin: 0.1208,
    salesCostShare: 0.34,
    industry: "Insurance agencies and brokerages",
  },
  realty: {
    margin: 0.1534,
    salesCostShare: 0.34,
    industry: "Offices of real estate agents and brokers",
  },
  professional: {
    margin: 0.0724,
    salesCostShare: 0.5,
    industry: "Professional, scientific, and technical services",
  },
  "building-services": {
    margin: 0.0778,
    salesCostShare: 0.502,
    industry: "Other administrative and support services",
  },
  "private-school": {
    margin: 0.0593,
    salesCostShare: 0.245,
    industry: "Educational services",
  },
  clinic: {
    margin: 0.0467,
    salesCostShare: 0.21,
    industry: "Offices of physicians",
  },
  "care-home": {
    margin: 0.041,
    salesCostShare: 0.081,
    industry: "Hospitals, nursing, and residential care facilities",
  },
  recreation: {
    margin: 0.0671,
    salesCostShare: 0.295,
    industry: "Amusement, gambling, and recreation industries",
  },
  restaurant: {
    margin: 0.0571,
    salesCostShare: 0.547,
    industry: "Food services and drinking places",
  },
  inn: { margin: 0.1358, salesCostShare: 0.141, industry: "Accommodation" },
  repair: {
    margin: 0.0427,
    salesCostShare: 0.632,
    industry: "Automotive repair and maintenance",
  },
  "personal-care": {
    margin: 0.0766,
    salesCostShare: 0.352,
    industry: "Personal and laundry services",
  },
};

/**
 * ESTIMATED FROM AVERAGE, for a kind with no row above: the mean across all
 * active corporations (Table 1, 22co01ccr.xlsx: net income less deficit
 * over total receipts), and the service kinds' 0.34.
 */
const ALL_KINDS_BOOKS = {
  margin: 0.1057,
  salesCostShare: 0.34,
  industry: "All industries",
} as const;

export function townBusinessKindBooks(kind: string) {
  return TOWN_BUSINESS_KIND_BOOKS[kind] ?? ALL_KINDS_BOOKS;
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
