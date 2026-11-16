/**
 * Dev mode's Industries view: every industry in the town and its businesses, from the one tally
 * (src/bench/dev-industries.ts), and one business month by month. Read-only routes; the page
 * part is src/bench/ui/dev-industries.mjs, on the Calendar sheet.
 */
import type { DevView } from "../dev-views";
import { coreAPI } from "../../core2/state";
import { industryBusiness, industryTally } from "../dev-industries";

const view: DevView = {
  name: "industries",
  client: "dev-industries.mjs",
  routes: {
    "GET industries": ({ mode }) =>
      industryTally(coreAPI(mode.core), mode.placeId),
    "GET industry-business": ({ mode, q }) => {
      const found = industryBusiness(coreAPI(mode.core), q("id"));
      if (!found) throw new Error(`No business ${q("id")}.`);
      return found;
    },
  },
  labels: {
    title: "Industries",
    trace: "Trace",
    industry: "Industry",
    open: "Open",
    closedCount: "Closed",
    staff: "Staff",
    sales: "Sales",
    payroll: "Payroll",
    outside: "Outside buyers a year",
    costs: "Costs",
    allCosts: "All costs",
    duties: "Law duties",
    profit: "Profit",
    cash: "Cash",
    closed: "Closed on",
    business: "Business",
    month: "Month",
    hired: "Hired",
    letGo: "Let go",
    left: "Left",
    records: "Records",
    monthRecord: "month",
    jobRecord: "job",
    kinds: {
      farm: "Farms",
      quarry: "Mines and quarries",
      construction: "Builders",
      manufacturing: "Factories",
      wholesale: "Wholesale",
      retail: "Stores",
      trucking: "Trucking",
      information: "Phone, cable and internet",
      insurance: "Insurance agencies",
      realty: "Real estate",
      professional: "Lawyers, accountants and engineers",
      "building-services": "Cleaning and grounds",
      "private-school": "Private schools",
      clinic: "Clinics",
      "care-home": "Nursing homes",
      recreation: "Recreation",
      restaurant: "Restaurants and bars",
      inn: "Hotels and inns",
      repair: "Repair shops",
      "personal-care": "Salons and barbers",
      utility: "Power and gas",
      "*": "Other businesses",
    },
  },
};

export default view;
