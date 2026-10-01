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
