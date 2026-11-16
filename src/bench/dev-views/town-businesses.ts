/**
 * Dev mode's Businesses view (owner, Nov 16: "the dev mode stuff should be
 * built immediately, so that way it can be traced, easily within the game"):
 * the town's businesses by kind, each kind's reason for its opening count and
 * every business with its id. Registered from its own file (dev-views.ts);
 * its page part is ui/town-businesses.mjs, under the Metrics board. Reads
 * only.
 */
import type { DevView } from "../dev-views";
import { townBusinesses } from "../dev-town-businesses";

/** The words its page part shows: control names only. */
export const TOWN_BUSINESSES_LABELS = {
  title: "Businesses",
  trace: "Trace",
  scale: "Real residents for each one in the game",
  kind: "Kind",
  open: "Open",
  closed: "Closed",
  openedSince: "Opened since",
  workers: "Workers",
  why: "Why this many",
  business: "Business",
  closedOn: "Closed on",
  record: "Record",
  notAtOpening: "None at the opening; opened in play.",
  publicEmployer: "One public employer for the town.",
  reason:
    "{workers} workers here at the opening. Businesses of this kind in the {where} average {size} workers ({employment} workers in {establishments} businesses, Census 2023 County Business Patterns), so {count}.",
  heldToRecords: "Each one on the books stands for several real ones.",
  basis: {
    county: "county",
    state: "state",
    national: "nation",
  },
  kinds: {
    farm: "Farms",
    quarry: "Quarries and mines",
    utility: "Utilities",
    construction: "Builders",
    manufacturing: "Factories",
    wholesale: "Wholesalers",
    retail: "Stores",
    trucking: "Trucking",
    information: "Phone, internet and media",
    bank: "Banks",
    insurance: "Insurance agencies",
    realty: "Real estate offices",
    professional: "Professional offices",
    "regional-office": "Company offices",
    "building-services": "Cleaning and building services",
    "private-school": "Private schools",
    hospital: "Hospitals",
    clinic: "Clinics and doctors' offices",
    "care-home": "Nursing homes",
    recreation: "Recreation",
    restaurant: "Restaurants",
    inn: "Hotels and inns",
    repair: "Repair shops",
    "personal-care": "Salons and personal care",
    congregation: "Congregations",
    organizing: "Community groups",
    union: "Unions",
    "party-office": "Party offices",
    "campaign-staff": "Campaign offices",
    "public-school": "Public schools",
    "city-hall": "City hall",
    "county-clerk": "County offices",
    police: "Police",
    fire: "Fire department",
    "public-works": "Public works",
    "public-health": "Public health",
    "state-office": "State offices",
    "post-office": "Post office",
  },
} as const;

const view: DevView = {
  name: "town-businesses",
  routes: {
    "GET town-businesses": ({ mode }) =>
      townBusinesses(mode.core, mode.placeId),
  },
  client: "town-businesses.mjs",
  labels: TOWN_BUSINESSES_LABELS,
};

export default view;
