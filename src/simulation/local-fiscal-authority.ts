/**
 * Admission for an approved, disclosed local fiscal game profile. The Census
 * unit fixes identity and footprint; no real tax power, rate, public cash or
 * program is inferred from it. Exact saved source restrictions still win.
 */
import { canonicalJson } from "./canonical-json";
import { draftLineageComponents } from "./legislation-draft-lineage";
import {
  LOCAL_TAX_INSTRUMENT_BY_FAMILY,
  localTaxAuthority,
  localTaxGovernment,
  localTaxPowerEvidenceFor,
} from "./local-tax-authority";
import { taxLevyText } from "./tax-policy";
import { currentMeasureProvisions } from "./legislative-politics";
import {
  type LocalFiscalEffectKind,
  type LocalFiscalGameAuthority,
} from "./local-ordinance-game-profile";
import { organizationProfileAt } from "./life-queries";
import {
  localFiscalAuthorityScopeForRulePackId,
  municipalGovernmentByKey,
  municipalRulePackFor,
} from "./municipal-government";
import {
  municipalActionAuthority,
  municipalGovernmentJurisdictionId,
  municipalOrganizationFor,
  municipalSeats,
} from "./municipal-public-work";
import type {
  EntityId,
  LegislativeProvisionRecord,
  PolicyPropositionDefinition,
  World,
} from "./types";

export interface LocalFiscalAuthorityGranted {
  readonly ok: true;
  readonly authority: LocalFiscalGameAuthority;
  readonly governmentKey: string;
  readonly jurisdictionId: EntityId;
  readonly propositionId: EntityId;
  readonly propositionKey: string;
  readonly effectKind: LocalFiscalEffectKind;
}

export interface LocalFiscalAuthorityRefused {
  readonly ok: false;
  readonly reason: string;
}

export type LocalFiscalAuthorityResult =
  LocalFiscalAuthorityGranted | LocalFiscalAuthorityRefused;

interface PropositionContract {
  readonly propositionKey: string;
  readonly issueKey: string;
  readonly effectKind: LocalFiscalEffectKind;
  readonly tag: string;
  /** The council level the question is for, when the question names one. */
  readonly level?: "county" | "municipality";
  /** A tax question is filed with its typed tax proposal; no drafter writes it. */
  readonly filing?: "typed-proposal";
}

/** The issue each local tax-terms question is filed under. */
const LOCAL_TAX_ISSUE_BY_FAMILY: Readonly<Record<string, string>> = {
  property: "us-state-and-local:fiscal.property-tax",
  sales: "us-state-and-local:fiscal.sales-tax",
  payroll: "us-state-and-local:fiscal.income-tax",
  corporate: "us-state-and-local:fiscal.income-tax",
};

/** One contract per local tax question. Whether the state lets this level levy
 * the tax is answered by the shared lookup at each admission, not here. */
const LOCAL_TAX_CONTRACTS: readonly PropositionContract[] = (
  [
    ["city", "municipality"],
    ["county", "county"],
  ] as const
).flatMap(([questionLevel, level]) =>
  Object.keys(LOCAL_TAX_INSTRUMENT_BY_FAMILY).map((family) => ({
    propositionKey: `us-tax-terms:${questionLevel}.${family}-tax-terms`,
    issueKey: LOCAL_TAX_ISSUE_BY_FAMILY[family]!,
    effectKind: "tax-policy" as const,
    tag: "local-fiscal-effect:tax-policy",
    level,
    filing: "typed-proposal" as const,
  })),
);

/** Exact approved content mapping, never inferred from a broad issue's level. */
const PROPOSITION_CONTRACTS: readonly PropositionContract[] = [
  {
    propositionKey:
      "us-policy-positions:transportation-infrastructure.fix-it-first",
    issueKey:
      "us-state-and-local:transportation-infrastructure.capital-construction-and-maintenance",
    effectKind: "public-program-appropriation",
    tag: "local-fiscal-effect:public-program-appropriation",
  },
  ...LOCAL_TAX_CONTRACTS,
];

function refused(reason: string): LocalFiscalAuthorityRefused {
  return { ok: false, reason };
}

function savedProposition(
  world: World,
  propositionKey: string,
): PolicyPropositionDefinition | null {
  return (
    Object.values(world.policyCatalog.propositions).find(
      (entry) => entry.stableKey === propositionKey,
    ) ?? null
  );
}

function propositionEffect(
  world: World,
  proposition: PolicyPropositionDefinition,
): LocalFiscalEffectKind | null {
  const contract = PROPOSITION_CONTRACTS.find(
    (entry) => entry.propositionKey === proposition.stableKey,
  );
  if (!contract) return null;
  const issue = world.policyCatalog.issues[proposition.issueId];
  if (issue?.stableKey !== contract.issueKey) return null;
  const effectTags = proposition.tags.filter((tag) =>
    tag.startsWith("local-fiscal-effect:"),
  );
  if (effectTags.length !== 1 || effectTags[0] !== contract.tag) return null;
  return contract.effectKind;
}

function sourcedRestriction(
  government: NonNullable<ReturnType<typeof municipalGovernmentByKey>>,
  effectKind: LocalFiscalEffectKind,
): string | null {
  const names =
    effectKind === "tax-policy"
      ? new Set(["TAX_LEVY", "TAXATION"])
      : new Set(["APPROPRIATION", "APPROPRIATIONS"]);
  for (const reading of government.readings) {
    if (reading.evidence === "game-profile") continue;
    for (const power of reading.powers) {
      if (!names.has(power.power)) continue;
      if (power.held === false)
        return `${reading.displayName}'s sourced ${power.power} power is recorded as withheld.`;
      if (
        power.held === true &&
        (power.conditions.length > 0 ||
          power.exceptions.length > 0 ||
          power.threshold !== null)
      )
        return `${reading.displayName}'s sourced ${power.power} conditions need a typed fiscal adapter before this game authority can be used.`;
    }
    if (
      effectKind === "public-program-appropriation" &&
      reading.budget.balancedBudgetConstraint !== null
    )
      return `${reading.displayName}'s sourced balanced-budget condition needs a typed fiscal adapter before an appropriation can proceed.`;
  }
  return null;
}

/** Resolve the exact saved game authority before a local fiscal draft is filed. */
export function localFiscalAuthorityFor(
  world: World,
  governmentKey: string,
  propositionKey: string,
  route: "draft" | "typed-proposal" = "draft",
): LocalFiscalAuthorityResult {
  const government = municipalGovernmentByKey(governmentKey);
  if (!government)
    return refused("No local government is compiled under this key.");
  // Ordinary authority by default: a council playing under its own recorded
  // charter, or the D.C. Council, holds it as a game-profile council does,
  // unless its record withholds the power.
  const rules = municipalRulePackFor(government);
  if (!rules.ok)
    return refused("This government has no playable council procedure.");
  const scope = localFiscalAuthorityScopeForRulePackId(rules.pack.packId);
  if (!scope)
    return refused(
      "The rule pack has no matched city or county fiscal game authority.",
    );
  const organization = municipalOrganizationFor(world, governmentKey);
  const locationId = organization
    ? organizationProfileAt(world, organization.id)?.locationJurisdictionId
    : null;
  if (
    !organization ||
    locationId !== scope.jurisdictionId ||
    !world.jurisdictions[scope.jurisdictionId] ||
    municipalGovernmentJurisdictionId(world, governmentKey) !==
      scope.jurisdictionId
  )
    return refused(
      "This government is not installed in its canonical jurisdiction.",
    );
  const proposition = savedProposition(world, propositionKey);
  if (!proposition)
    return refused("This world has no saved proposition under that exact key.");
  const effectKind = propositionEffect(world, proposition);
  if (!effectKind)
    return refused(
      "This proposition has no approved exact local fiscal effect mapping.",
    );
  const contract = PROPOSITION_CONTRACTS.find(
    (entry) => entry.propositionKey === propositionKey,
  );
  if (contract?.filing === "typed-proposal" && route !== "typed-proposal")
    return refused(
      "A local tax measure is filed with its typed tax proposal, not drafted from the question.",
    );
  if (contract?.level && contract.level !== scope.authority.level)
    return refused("This tax question is for the other level of government.");
  const taxFamily = /^us-tax-terms:(?:city|county)\.([a-z]+)-tax-terms$/.exec(
    propositionKey,
  )?.[1];
  if (effectKind === "tax-policy" && taxFamily) {
    const place = localTaxGovernment(governmentKey);
    const instrument = LOCAL_TAX_INSTRUMENT_BY_FAMILY[taxFamily];
    const answer =
      place && instrument ? localTaxAuthority({ ...place, instrument }) : null;
    if (!answer?.permits)
      return refused(
        `The state does not let this level of local government levy this tax (${answer?.status ?? "unknown"}).`,
      );
  }
  const issue = world.policyCatalog.issues[proposition.issueId];
  if (!issue?.levels?.includes(scope.authority.level))
    return refused(
      "The proposition's saved issue is not routed to this government level.",
    );
  if (!scope.authority.permittedEffects.includes(effectKind))
    return refused(
      "The local game profile does not include this fiscal effect.",
    );
  const restriction = sourcedRestriction(government, effectKind);
  if (restriction) return refused(restriction);
  if (world.control.kind !== "person")
    return refused(
      "Person control is required to introduce a local fiscal measure.",
    );
  const introduction = municipalActionAuthority(world, {
    governmentKey,
    personId: world.control.personId,
    residentPlaceGeoid: null,
    action: "introduce-ordinance",
  });
  if (!introduction.ok) return refused(introduction.reason);
  return {
    ok: true,
    authority: scope.authority,
    governmentKey,
    jurisdictionId: scope.jurisdictionId,
    propositionId: proposition.id,
    propositionKey,
    effectKind,
  };
}

/** Recheck the filed text at each agenda and vote action after amendments. */
export function admitLocalFiscalMeasure(
  world: World,
  governmentKey: string,
  measureId: EntityId,
): LocalFiscalAuthorityResult {
  const measure = (world.history.legislativeMeasures ?? []).find(
    (entry) => entry.id === measureId,
  );
  if (!measure) return refused("No saved local fiscal measure has this ID.");
  if ((measure.propositionIds ?? []).length !== 1)
    return refused("A local fiscal measure must name one exact proposition.");
  const proposition =
    world.policyCatalog.propositions[measure.propositionIds![0]!];
  if (!proposition)
    return refused("The measure's saved proposition is missing.");
  const actor = world.control;
  const withSponsorControl: World | null =
    actor.kind === "person" && actor.personId === measure.sponsorPersonId
      ? world
      : measure.sponsorPersonId
        ? {
            ...world,
            control: {
              kind: "person" as const,
              personId: measure.sponsorPersonId,
            },
          }
        : null;
  if (!withSponsorControl)
    return refused("A local fiscal measure requires a seated member sponsor.");
  const authority = localFiscalAuthorityFor(
    withSponsorControl,
    governmentKey,
    proposition.stableKey,
    "typed-proposal",
  );
  if (!authority.ok) return authority;
  if (
    measure.jurisdictionId !== authority.jurisdictionId ||
    measure.rulePackId !== authority.authority.rulePackId ||
    measure.originChamberKey !== "council" ||
    measure.origin !== "member-introduction" ||
    measure.subjectClass !==
      (authority.effectKind === "tax-policy" ? "revenue" : "appropriation")
  )
    return refused(
      "The saved measure does not match this council's fiscal authority.",
    );
  const answers = measure.propositionAnswers ?? [];
  if (
    answers.length !== 1 ||
    answers[0]?.propositionId !== authority.propositionId ||
    answers[0]?.answer !== "yes"
  )
    return refused("The measure must answer its exact fiscal proposition yes.");
  if (
    !municipalSeats(world, governmentKey).some(
      (seat) =>
        seat.personId === measure.sponsorPersonId &&
        (seat.role === "member" || seat.role === "presiding-member"),
    )
  )
    return refused("The local fiscal sponsor is not seated on this council.");
  const taxRefusal =
    authority.effectKind === "tax-policy"
      ? savedTaxProposalRefusal(
          world,
          governmentKey,
          measure.id,
          proposition.stableKey,
        )
      : undefined;
  if (taxRefusal) return refused(taxRefusal);
  const lineages = draftLineageComponents(world, measure.id);
  if (
    authority.effectKind !== "tax-policy" &&
    (lineages.length !== 1 ||
      lineages[0]?.authorityKey !== authority.authority.authorityKey ||
      lineages[0]?.authorityMeasureId !== undefined ||
      lineages[0]?.componentKey !== undefined ||
      lineages[0]?.familyKey !== "appropriations" ||
      lineages[0]?.familyVersion !== "v3" ||
      lineages[0]?.variantKey !== "local-fix-it-first-v1")
  )
    return refused(
      "The saved fiscal draft lineage does not name this local government and full family version.",
    );
  const provisions = currentMeasureProvisions(world, measure.id);
  const fiscalClauses = provisions.filter(
    (entry) =>
      entry.provisionKey === "amount-provided" ||
      entry.provisionKey === "tax-levy",
  );
  const tagged = provisions.filter(
    (entry) =>
      (
        entry as LegislativeProvisionRecord & {
          readonly operativeEffect?: { readonly kind: LocalFiscalEffectKind };
        }
      ).operativeEffect !== undefined,
  );
  const clause = tagged[0] as
    | (LegislativeProvisionRecord & {
        readonly operativeEffect?: { readonly kind: LocalFiscalEffectKind };
      })
    | undefined;
  if (
    fiscalClauses.length !== 1 ||
    tagged.length !== 1 ||
    !clause ||
    clause.operativeEffect?.kind !== authority.effectKind ||
    clause.applicationScope.jurisdictionId !== authority.jurisdictionId ||
    clause.provisionKey !==
      (authority.effectKind === "tax-policy" ? "tax-levy" : "amount-provided")
  )
    return refused(
      "The current fiscal clause is missing, revised without its effect tag, or outside this jurisdiction.",
    );
  if (
    authority.effectKind === "public-program-appropriation" &&
    (typeof clause.fiscalExposureMinorUnits !== "number" ||
      !Number.isSafeInteger(clause.fiscalExposureMinorUnits) ||
      clause.fiscalExposureMinorUnits <= 0 ||
      clause.fiscalExposureLabel === null ||
      !lineages[0]?.parameters.some(
        (parameter) =>
          parameter.kind === "money" &&
          parameter.currency === "USD" &&
          parameter.minorUnits === clause.fiscalExposureMinorUnits,
      ) ||
      !provisions.some(
        (entry) =>
          entry.provisionKey === "authority-named" &&
          entry.sectionNumber < clause.sectionNumber,
      ))
  )
    return refused(
      "An appropriation needs a preceding authority clause and a positive recorded amount.",
    );
  return authority;
}

/** A local tax law is admitted from its saved typed proposal: the same
 * government, the tax this question names, the lookup's own authority evidence
 * and the exact levy text. No draft lineage stands in for those facts. */
function savedTaxProposalRefusal(
  world: World,
  governmentKey: string,
  measureId: EntityId,
  propositionKey: string,
): string | undefined {
  const proposal = (world.history.taxProposals ?? []).find(
    (row) => row.measureId === measureId,
  );
  if (!proposal)
    return "A local tax measure needs its saved typed tax proposal.";
  const identity = proposal.publicGovernmentIdentity;
  const place = localTaxGovernment(governmentKey);
  const family = /^us-tax-terms:(?:city|county)\.([a-z]+)-tax-terms$/.exec(
    propositionKey,
  )?.[1];
  const instrument = family
    ? LOCAL_TAX_INSTRUMENT_BY_FAMILY[family]
    : undefined;
  if (
    identity?.kind !== "local-government" ||
    identity.governmentKey !== governmentKey ||
    !place ||
    !instrument ||
    proposal.terms.instrument !== instrument ||
    !proposal.power ||
    canonicalJson(proposal.power) !==
      canonicalJson(
        localTaxPowerEvidenceFor({
          asOf: proposal.power.asOf,
          ...place,
          governmentKey,
          instrument,
        }),
      )
  )
    return "The saved tax proposal does not match this local government's tax question.";
  const levy = currentMeasureProvisions(world, measureId).find(
    (row) => row.provisionKey === "tax-levy",
  );
  return levy?.text === taxLevyText(proposal.terms)
    ? undefined
    : "The filed levy text no longer matches the saved tax proposal.";
}
