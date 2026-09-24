import {
  authored,
  type ClauseRendering,
  type ProgramVariant,
} from "./legislation-content-contracts";

export const LOCAL_FIX_IT_FIRST_PROPOSITION_KEY =
  "us-policy-positions:transportation-infrastructure.fix-it-first";

const evidence = authored(
  "Fictional local maintenance appropriation terms for play. The amount, availability period, program and reporting duty are game-profile choices; they are not a real government's budget, charter or delivered repair.",
);

function clause(
  text: string,
  fiscalExposureMinorUnits: number | null = null,
): ClauseRendering {
  return {
    text,
    beneficiary: {
      kind: "general-application",
      appliesToLabel: "the local public-works maintenance program",
    },
    fiscalExposureLabel:
      fiscalExposureMinorUnits === null ? null : "Amount provided",
    fiscalExposureMinorUnits,
  };
}

/**
 * A local, game-profile appropriation whose recorded purpose is maintenance
 * before expansion. It writes authority and a finite amount; no work, payment,
 * employment or repair outcome is implied.
 */
export const LOCAL_FIX_IT_FIRST_VARIANT: ProgramVariant = {
  variantKey: "local-fix-it-first-v1",
  propositionKeys: [LOCAL_FIX_IT_FIRST_PROPOSITION_KEY],
  npcEligibility: (["municipality", "county"] as const).map(
    (governmentLevel) => ({
      propositionKey: LOCAL_FIX_IT_FIRST_PROPOSITION_KEY,
      answer: "yes",
      governmentLevel,
      authorityKind: "game-profile",
      authorityKey: null,
      operativeEffectKind: "public-program-appropriation",
      effectProvisionKey: "amount-provided",
      effectParameterKey: "appropriation",
    }),
  ),
  label: "Local maintenance before expansion",
  instrument: "appropriation",
  synopsis:
    "Set aside a bounded amount for maintaining existing public roads before new construction in this local game profile.",
  shortTitle: "Local Maintenance Appropriation",
  subjectClass: "appropriation",
  authorizesAppropriation: true,
  declaredLimits: [
    "This is a game-profile spending authority, not a statement of real local law or treasury capacity.",
    "The recorded amount is authority only; it does not create cash, select a project, hire a worker or complete a repair.",
    "The priority applies only to this appropriation and does not change other local or state law.",
  ],
  defaults: {
    appropriation: {
      kind: "money",
      minorUnits: 25_000_000,
      currency: "USD",
    },
    "availability-term": { kind: "duration-years", years: 2 },
    "reporting-duty": {
      kind: "enumerated",
      value: "annual-statement",
    },
  },
  parameters: [
    {
      key: "appropriation",
      dimension: "funding-cap",
      kind: "money",
      label: "Amount provided",
      minMinorUnits: 100_000,
      maxMinorUnits: 100_000_000_000,
      currency: "USD",
      evidence,
    },
    {
      key: "availability-term",
      dimension: "timing",
      kind: "duration-years",
      label: "Available for",
      minYears: 1,
      maxYears: 4,
      evidence,
    },
    {
      key: "reporting-duty",
      dimension: "oversight",
      kind: "enumerated",
      label: "Report interval",
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
      heading: "Local program funded",
      parameterKey: null,
      render: (resolved) => {
        const authority = resolved.authority;
        if (!authority)
          throw new Error("The local maintenance authority is missing.");
        return clause(
          `Under the local public-works game profile, this appropriation is for ${authority.programLabel}. It establishes no separate service or project entitlement.`,
        );
      },
    },
    {
      provisionKey: "amount-provided",
      dimension: "funding-cap",
      heading: "Amount provided",
      parameterKey: "appropriation",
      render: (resolved) => {
        const amount = resolved.money("appropriation");
        const value = resolved.values.appropriation;
        if (value?.kind !== "money")
          throw new Error("The local maintenance amount is missing.");
        const amountClause = clause(
          `The local government may make up to ${amount} available from modeled local public receipts for its public-works maintenance program. This section creates no cash or tax revenue and does not record an obligation or outlay.`,
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
      provisionKey: "maintenance-priority",
      dimension: "oversight",
      heading: "Existing roads before new construction",
      parameterKey: null,
      render: () =>
        clause(
          "Amounts made available by this Act may be committed to maintaining existing local public roads before they are committed to new road construction. No project is selected or represented as completed by this section.",
        ),
    },
    {
      provisionKey: "availability-term",
      dimension: "timing",
      heading: "Period of availability",
      parameterKey: "availability-term",
      render: (resolved) => {
        const duration = resolved.values["availability-term"];
        if (duration?.kind !== "duration-years" || duration.years === null)
          throw new Error(
            "The local maintenance availability term is missing.",
          );
        return clause(
          `The amount provided by this Act remains available for ${duration.years} years after its effective date; an unused balance creates no continuing cash claim.`,
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
          `The local government shall publish ${resolved.choice("reporting-duty").clausePhrase} of amounts obligated, expended and remaining unobligated under this game-profile appropriation.`,
        ),
    },
  ],
  amendmentInvitation: {
    provisionKey: "maintenance-priority",
    sectionNumber: 3,
    heading: "Maintenance schedule",
    beneficiaryLabel: "people using existing local public roads",
    placeLabel: "the local government's jurisdiction",
    statedGround:
      "A published maintenance schedule would make this appropriation's stated priority easier to inspect.",
    segmentKey: "local-public-works.maintenance-schedule",
    requestedMinorUnits: 0,
    cappedMinorUnits: 0,
    render: () =>
      "The local government shall publish a dated list of maintenance work selected under this appropriation.",
    evidence,
  },
};
