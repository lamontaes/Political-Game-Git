import {
  authored,
  type ProgramVariant,
  type ClauseRendering,
} from "./legislation-content-contracts";

export const TRANSIT_FAMILY_KEY = "appropriations";
export const TRANSIT_FAMILY_VERSION = "v3";
export const TRANSIT_VARIANT_KEY = "transit-staged-service-v1";
export const TRANSIT_PROGRAM_KEY = "standing:rural-transit-assistance";
/** Prices and scope are authored contract terms, never empirical effectiveness. */
export const TRANSIT_CONTRACT_PRICE_MINOR_UNITS_PER_HOUR = 10_000;
export const TRANSIT_SERVICE_CHOICES = [
  {
    value: "weekday",
    label: "Additional weekday service",
    clausePhrase: "additional weekday vehicle-service hours",
  },
  {
    value: "weekend",
    label: "Additional weekend service",
    clausePhrase: "additional weekend vehicle-service hours",
  },
] as const;
const evidence = authored(
  "Fictional prospective service appropriation and contract terms. No real fund balance, officials, ridership or effectiveness coefficient is asserted.",
);
function clause(text: string, amount: number | null = null): ClauseRendering {
  return {
    text,
    beneficiary: {
      kind: "general-application",
      appliesToLabel: "the existing rural transit assistance program",
    },
    fiscalExposureLabel: amount === null ? null : "Amount appropriated",
    fiscalExposureMinorUnits: amount,
  };
}
export const TRANSIT_SERVICE_VARIANT: ProgramVariant = {
  variantKey: TRANSIT_VARIANT_KEY,
  label: "Two periods of additional service",
  instrument: "appropriation",
  synopsis:
    "Provide money for two periods of added service; expenditure still requires collected public cash.",
  // A template's short title is the kind of measure, never a proper name: the
  // same variant is filed in any chamber, by any sponsor, for any program, so
  // a fixed named Act would give every one of them the same statute. Its
  // thirty-one siblings across the other families already read this way.
  shortTitle: "Additional Service Hours",
  subjectClass: "appropriation",
  authorizesAppropriation: true,
  defaults: {
    appropriation: {
      kind: "money",
      minorUnits: 2_000_000,
      currency: "USD",
    },
    "service-window": { kind: "enumerated", value: "weekday" },
  },
  parameters: [
    {
      key: "appropriation",
      dimension: "funding-cap",
      kind: "money",
      label: "Total amount provided",
      minMinorUnits: 20_000,
      maxMinorUnits: 4_000_000_000,
      currency: "USD",
      evidence,
    },
    {
      key: "service-window",
      dimension: "oversight",
      kind: "enumerated",
      label: "Service period",
      options: TRANSIT_SERVICE_CHOICES,
      evidence,
    },
  ],
  clauses: [
    {
      provisionKey: "authority-named",
      dimension: "authority-reference",
      heading: "Program funded",
      parameterKey: null,
      render: (r) => {
        if (r.authority?.authorityKey !== TRANSIT_PROGRAM_KEY)
          throw new Error(
            "This transit variant requires the authored rural transit program.",
          );
        return clause(
          `This appropriation funds ${r.authority?.programLabel} under ${r.authority?.citationLabel}. It changes no eligibility rule of that program.`,
        );
      },
    },
    {
      provisionKey: "amount-provided",
      dimension: "funding-cap",
      heading: "Amount appropriated",
      parameterKey: "appropriation",
      render: (r) => {
        const v = r.values.appropriation;
        if (v?.kind !== "money")
          throw new Error("Missing transit appropriation amount.");
        return clause(
          `There is appropriated ${r.money("appropriation")} from collected, unrestricted state public receipts for additional service under the program named in section 1. This Act creates no cash and dedicates no tax revenue.`,
          v.minorUnits,
        );
      },
    },
    {
      provisionKey: "administrative-mandate",
      dimension: "oversight",
      heading: "Administrative implementation",
      parameterKey: "service-window",
      render: (r) =>
        clause(
          `The state government shall administer this appropriation and purchase ${r.choice("service-window").clausePhrase} at the authored contract price of $100 per vehicle-service hour. Half of the amount is available for each of two separate service periods. Each period is fourteen days; service is paid and recorded at its completion. Unpaid hours shall not be represented as delivered. No member of the legislature is granted executive authority by this Act.`,
        ),
    },
    {
      provisionKey: "transit-effective-date",
      dimension: "timing",
      heading: "Effective date and availability",
      parameterKey: null,
      render: () =>
        clause("This Act takes effect ninety days after enactment."),
    },
    {
      provisionKey: "availability",
      dimension: "timing",
      heading: "Period of availability",
      parameterKey: null,
      render: () =>
        clause(
          "The appropriation remains available for 365 days after its effective date. No payment may be made before its effective date or after its availability expires.",
        ),
    },
    {
      provisionKey: "service-report",
      dimension: "oversight",
      heading: "Delivery and cancellation reports",
      parameterKey: null,
      render: () =>
        clause(
          "The state government shall preserve the paid amount and vehicle-service hours for each period. The sponsor may request implementation or cancel an undelivered period. Cancellation shall preserve prior delivery and shall not refund an already completed service period. Published reports shall distinguish proposals from delivered service.",
        ),
    },
  ],
  declaredLimits: [
    "All program labels and contract prices are authored fiction.",
    "A passed appropriation supplies authority, not collected cash.",
    "No ridership, access, effectiveness or electoral consequence is inferred.",
  ],
  amendmentInvitation: {
    provisionKey: "service-report-detail",
    sectionNumber: 7,
    heading: "Report timing",
    beneficiaryLabel: "people reading the service record",
    placeLabel: "the governing state",
    statedGround: "Request a dated delivery statement.",
    segmentKey: "transit.reporting",
    requestedMinorUnits: 0,
    cappedMinorUnits: 0,
    render: () =>
      "The report shall include the date of each completed service period.",
    evidence,
  },
};
