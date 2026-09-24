import {
  authored,
  type ClauseRendering,
  type ProgramVariant,
} from "./legislation-content-contracts";

export const FEDERAL_PASSENGER_RAIL_PROPOSITION_KEY =
  "us-federal-positions:transport-water.expand-passenger-rail";

const evidence = authored(
  "A fictional federal passenger-rail game-profile appropriation. No real statute, balance, award, payment, completed line, train service or resident benefit is asserted.",
);

function clause(
  text: string,
  amountMinorUnits: number | null = null,
): ClauseRendering {
  return {
    text,
    beneficiary: {
      kind: "general-application",
      appliesToLabel: "the passenger-rail game-profile program",
    },
    fiscalExposureLabel:
      amountMinorUnits === null ? null : "Amount appropriated",
    fiscalExposureMinorUnits: amountMinorUnits,
  };
}

/**
 * A federal game-profile appropriation. It creates recorded authority only;
 * the federal public account, later executive decisions, and delivery records
 * determine what can actually be paid or completed.
 */
export const FEDERAL_PASSENGER_RAIL_VARIANT: ProgramVariant = {
  variantKey: "federal-passenger-rail-v1",
  propositionKeys: [FEDERAL_PASSENGER_RAIL_PROPOSITION_KEY],
  npcEligibility: [
    {
      propositionKey: FEDERAL_PASSENGER_RAIL_PROPOSITION_KEY,
      answer: "yes",
      governmentLevel: "federal",
      authorityKind: "game-profile",
      authorityKey: "game-profile:federal-passenger-rail/v1",
      operativeEffectKind: "public-program-appropriation",
      effectProvisionKey: "amount-provided",
      effectParameterKey: "appropriation",
    },
  ],
  label: "Passenger-rail game-profile appropriation",
  instrument: "appropriation",
  synopsis:
    "Authorize a bounded amount for passenger-rail work in the federal game profile; no route or completed service is promised.",
  shortTitle: "Passenger Rail Appropriation",
  subjectClass: "appropriation",
  authorizesAppropriation: true,
  declaredLimits: [
    "This is a fictional federal game-profile authority, not a real statute or federal account balance.",
    "The amount is bounded by this component's playable input range, not by a claimed real-world legal ceiling.",
    "An enacted appropriation does not itself award money, select a route, pay a contractor, complete a rail line, or establish resident benefit.",
  ],
  defaults: {
    appropriation: {
      kind: "money",
      minorUnits: 25_000_000_000,
      currency: "USD",
    },
    "availability-term": { kind: "duration-years", years: 4 },
    "reporting-duty": {
      kind: "enumerated",
      value: "quarterly-statement",
    },
  },
  parameters: [
    {
      key: "appropriation",
      dimension: "funding-cap",
      kind: "money",
      label: "Amount appropriated",
      minMinorUnits: 100_000_000,
      maxMinorUnits: 1_000_000_000_000,
      currency: "USD",
      evidence,
    },
    {
      key: "availability-term",
      dimension: "timing",
      kind: "duration-years",
      label: "Available for",
      minYears: 1,
      maxYears: 8,
      evidence,
    },
    {
      key: "reporting-duty",
      dimension: "oversight",
      kind: "enumerated",
      label: "Reporting interval",
      options: [
        {
          value: "annual-statement",
          label: "Annual statement",
          clausePhrase: "an annual statement",
        },
        {
          value: "quarterly-statement",
          label: "Quarterly statement",
          clausePhrase: "a quarterly statement",
        },
      ],
      evidence,
    },
  ],
  clauses: [
    {
      provisionKey: "authority-named",
      dimension: "authority-reference",
      heading: "Game-profile program funded",
      parameterKey: null,
      render: (resolved) => {
        const authority = resolved.authority;
        if (!authority)
          throw new Error(
            "The federal rail game-profile authority is missing.",
          );
        return clause(
          `Under the federal game-profile authority, this appropriation is for ${authority.programLabel}. It cites no real statute and establishes no route or service entitlement.`,
        );
      },
    },
    {
      provisionKey: "amount-provided",
      dimension: "funding-cap",
      heading: "Amount appropriated",
      parameterKey: "appropriation",
      render: (resolved) => {
        const value = resolved.values.appropriation;
        if (value?.kind !== "money")
          throw new Error("The federal rail appropriation amount is missing.");
        const amountClause = clause(
          `There is appropriated ${resolved.money("appropriation")} from modeled federal public receipts for the passenger-rail game-profile program. This section creates no cash, award, payment, completed line or resident benefit.`,
          value.minorUnits,
        );
        return value.minorUnits > 0
          ? {
              ...amountClause,
              operativeEffect: {
                kind: "public-program-appropriation",
              },
            }
          : amountClause;
      },
    },
    {
      provisionKey: "availability-term",
      dimension: "timing",
      heading: "Period of availability",
      parameterKey: "availability-term",
      render: (resolved) => {
        const duration = resolved.values["availability-term"];
        if (duration?.kind !== "duration-years" || duration.years === null)
          throw new Error("The federal rail availability term is missing.");
        return clause(
          `The amount provided remains available for ${duration.years} years after its effective date; unused authority expires without representing an unmade award or unpaid service.`,
        );
      },
    },
    {
      provisionKey: "reporting-duty",
      dimension: "oversight",
      heading: "Public accounting",
      parameterKey: "reporting-duty",
      render: (resolved) =>
        clause(
          `The federal government shall publish ${resolved.choice("reporting-duty").clausePhrase} of amounts obligated, paid, and remaining unobligated under this game-profile appropriation. The report shall distinguish authority from completed work.`,
        ),
    },
  ],
  amendmentInvitation: {
    provisionKey: "reporting-duty",
    sectionNumber: 4,
    heading: "Report on planned work",
    beneficiaryLabel: "people reviewing the rail appropriation",
    placeLabel: "the federal government",
    statedGround:
      "A dated plan would let people see what the enacted authority has and has not selected.",
    segmentKey: "passenger-rail.game-profile-plan",
    requestedMinorUnits: 0,
    cappedMinorUnits: 0,
    render: () =>
      "The public report shall separately list proposals, selected routes, awards, payments, and completed work when any such records exist.",
    evidence,
  },
};
