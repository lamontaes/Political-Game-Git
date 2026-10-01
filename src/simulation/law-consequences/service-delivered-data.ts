import type { LawConsequenceRow } from "../law-consequence-types";

export const SERVICE_SELECTOR = "service.completed-activity-participants";
export const SERVICE_ACTION = "record-delivered-service";
export const SERVICE_HOURS = "service.completed-activity-hours";
export const FUNDED_SERVICE = "service.funded-by-governing-law";
export const SERVICE_RECIPIENT_KIND = "activity:public-service";

/** Catalog data for completed, funded service; fare pricing is a separate consequence. */
export const SERVICE_DELIVERED_LAW_ROWS: Readonly<
  Record<string, readonly LawConsequenceRow[]>
> = Object.fromEntries(
  [
    "us-policy-positions:transportation-infrastructure.additional-rural-transit-service-hours",
    "us-policy-positions:transportation-infrastructure.fare-free-transit",
    "us-federal-positions:foreign-affairs.increase-foreign-aid",
    "us-federal-positions:transport-water.expand-passenger-rail",
    "us-policy-positions:agriculture-natural-resources.expand-public-land-access",
    "us-policy-positions:civil-family-community.dedicated-parks-funding",
    "us-policy-positions:civil-family-community.fund-public-libraries",
    "us-policy-positions:education.equalize-school-funding",
    "us-policy-positions:education.public-funds-for-private-schooling",
    "us-policy-positions:education.universal-preschool",
    "us-policy-positions:health-human-services.fund-behavioral-health-crisis-response",
    "us-policy-positions:health-human-services.harm-reduction-services",
    "us-policy-positions:health-human-services.housing-first-homelessness",
    "us-policy-positions:housing-land-use.right-to-counsel-in-eviction",
    "us-policy-positions:transportation-infrastructure.public-broadband",
    "us-policy-positions:transportation-infrastructure.shift-highway-funds-to-transit",
  ].map((questionKey) => [
    questionKey,
    [
      {
        id: `${questionKey}:recorded-funded-service`,
        kind: "service-delivered",
        when: "service",
        who: { selector: SERVICE_SELECTOR, predicates: [] },
        what: SERVICE_ACTION,
        amount: { op: "record", key: SERVICE_HOURS, unit: "hours" },
        conditions: [{ capability: FUNDED_SERVICE, parameters: {} }],
        lag: { days: 0, sourceIds: [] },
        onRepeal: "preserve-completed",
        evidence: {
          sourceIds: [
            "src/simulation/time-work.ts:completeActivity",
            "src/simulation/public-program-integrity.ts",
            "src/simulation/resources.ts:recordResourceTransferOutcome",
          ],
          population:
            "Existing recorded service recipients who completed an activity tied to the law's funded commitment.",
          scope:
            "Actual completed recipient-hours only; not vehicle-hours, added ridership, free-fare pricing or population access.",
          why: "The saved activity interval establishes time delivered to its recorded recipient. The commitment, appropriation and positive operating transfer establish the governing law's funding lineage. Neither payment nor legislation establishes attendance.",
          uncertainty:
            "No delivery is inferred without these records. An authored service record is not observational research or proof of a live caller.",
        },
      } satisfies LawConsequenceRow,
    ],
  ]),
);

/**
 * How a person asks for each service whose request producer exists, and what
 * the saved activity is called. A service law with no form here has no
 * request producer yet: a request for it is unsupported, never improvised.
 * Who may ask and what counts as delivered are the same rule for every row;
 * the form names the activity, which of the person's own records bear on
 * wanting it (`need`), and when the visit runs.
 */
export interface ServiceRequestForm {
  /** What the person asked for, after "Asked {operator} for". */
  readonly asked: string;
  /** Title of the saved activity, with {operator} for the provider's name. */
  readonly activityTitle: string;
  /** The membership's context, with {operator} and {place}. */
  readonly membership: string;
  readonly activityKind: "travel" | "confirmed";
  /**
   * Which saved records the resident producer reads to decide whether a
   * person asks. `travel`: work or classes to get to inside the served place,
   * against work outside the place the service runs. `outdoors`: children at home and the person's own
   * time-for-yourself or time-with-people goal, against hours held by work or
   * a job search. `reading`: classes, a learning goal and children at home,
   * against hours held by work. `on-call` services (a crisis team) are asked
   * for only from the record of the crisis itself, so the resident producer
   * never asks for them.
   */
  readonly need: "travel" | "outdoors" | "reading" | "on-call";
  /**
   * Authored game profile, not research: the local start time and length of
   * the visit a resident asks for on the day the service is paid.
   */
  readonly visit: {
    readonly startMinuteOfDay: number;
    readonly minutes: number;
  };
}

const TRANSIT_TRIP: ServiceRequestForm = {
  asked: "a trip",
  activityTitle: "Ride with {operator}",
  membership: "Registered as a rider with {operator}; home is in {place}.",
  activityKind: "travel",
  need: "travel",
  visit: { startMinuteOfDay: 7 * 60 + 30, minutes: 45 },
};

export const SERVICE_REQUEST_FORMS: Readonly<
  Record<string, ServiceRequestForm>
> = {
  "us-policy-positions:transportation-infrastructure.additional-rural-transit-service-hours":
    TRANSIT_TRIP,
  "us-policy-positions:transportation-infrastructure.fare-free-transit":
    TRANSIT_TRIP,
  // Highway money moved to transit buys what a rider uses: a trip.
  "us-policy-positions:transportation-infrastructure.shift-highway-funds-to-transit":
    TRANSIT_TRIP,
  "us-policy-positions:civil-family-community.dedicated-parks-funding": {
    asked: "a park program visit",
    activityTitle: "Park program with {operator}",
    membership:
      "Signed up for park programs with {operator}; home is in {place}.",
    activityKind: "confirmed",
    need: "outdoors",
    visit: { startMinuteOfDay: 17 * 60 + 30, minutes: 90 },
  },
  "us-policy-positions:agriculture-natural-resources.expand-public-land-access":
    {
      asked: "a day on the opened public land",
      activityTitle: "Day on public land with {operator}",
      membership:
        "Holds a public land access pass from {operator}; home is in {place}.",
      activityKind: "confirmed",
      need: "outdoors",
      visit: { startMinuteOfDay: 9 * 60, minutes: 180 },
    },
  "us-policy-positions:civil-family-community.fund-public-libraries": {
    asked: "a library visit",
    activityTitle: "Library visit at {operator}",
    membership: "Holds a library card from {operator}; home is in {place}.",
    activityKind: "confirmed",
    need: "reading",
    visit: { startMinuteOfDay: 16 * 60, minutes: 60 },
  },
  "us-policy-positions:health-human-services.fund-behavioral-health-crisis-response":
    {
      asked: "a crisis response",
      activityTitle: "Crisis response visit from {operator}",
      membership: "Case opened with {operator}; home is in {place}.",
      activityKind: "confirmed",
      need: "on-call",
      visit: { startMinuteOfDay: 0, minutes: 90 },
    },
};
