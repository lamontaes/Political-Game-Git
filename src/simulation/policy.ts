import { createStableId } from "./ids";
import type {
  EntityId,
  KnowledgeSubjectDefinition,
  KnowledgeSubjectScope,
  PolicyCatalog,
  PolicyDomainDefinition,
  PolicyIssueDefinition,
  PolicyPropositionDefinition,
  PoliticalPrincipleDefinition,
  PropositionParameter,
} from "./types";

export interface PolicyCatalogInput {
  readonly catalogVersion: string;
  readonly domains: readonly PolicyDomainDefinition[];
  readonly issues: readonly PolicyIssueDefinition[];
  readonly propositions: readonly PolicyPropositionDefinition[];
  readonly subjects: readonly KnowledgeSubjectDefinition[];
  readonly principles: readonly PoliticalPrincipleDefinition[];
}

const SUBJECT_SCOPES = ["domain", "issue", "proposition", "technical"] as const;

export function createPolicyDomainDefinition(
  stableKey: string,
  name: string,
  description: string,
): PolicyDomainDefinition {
  return {
    id: createStableId("policy-domain", `definition:${stableKey}`),
    stableKey,
    name,
    description,
  };
}

export function createPolicyIssueDefinition(
  stableKey: string,
  domainId: EntityId,
  name: string,
  description: string,
): PolicyIssueDefinition {
  return {
    id: createStableId("policy-issue", `definition:${stableKey}`),
    stableKey,
    domainId,
    name,
    description,
  };
}

export function createPolicyPropositionDefinition(
  stableKey: string,
  issueId: EntityId,
  name: string,
  question: string,
  parameters: readonly PropositionParameter[] = [],
  tags: readonly string[] = [],
): PolicyPropositionDefinition {
  return {
    id: createStableId("proposition", `definition:${stableKey}`),
    stableKey,
    issueId,
    name,
    question,
    parameters: parameters.map((parameter) => ({ ...parameter })),
    tags: canonical(tags),
  };
}

export function createKnowledgeSubjectDefinition(
  stableKey: string,
  name: string,
  description: string,
  scope: KnowledgeSubjectScope,
  referenceId: EntityId | null,
  tags: readonly string[] = [],
): KnowledgeSubjectDefinition {
  return {
    id: createStableId("subject", `definition:${stableKey}`),
    stableKey,
    name,
    description,
    scope,
    referenceId,
    tags: canonical(tags),
  };
}

export function createPoliticalPrincipleDefinition(
  stableKey: string,
  name: string,
  description: string,
): PoliticalPrincipleDefinition {
  return {
    id: createStableId("principle-definition", `definition:${stableKey}`),
    stableKey,
    name,
    description,
  };
}

export function createPolicyCatalog(input: PolicyCatalogInput): PolicyCatalog {
  const catalog: PolicyCatalog = {
    catalogVersion: input.catalogVersion,
    domains: byId(input.domains),
    domainOrder: input.domains.map((definition) => definition.id),
    issues: byId(input.issues),
    issueOrder: input.issues.map((definition) => definition.id),
    propositions: byId(input.propositions),
    propositionOrder: input.propositions.map((definition) => definition.id),
    subjects: byId(input.subjects),
    subjectOrder: input.subjects.map((definition) => definition.id),
    principles: byId(input.principles),
    principleOrder: input.principles.map((definition) => definition.id),
  };
  assertPolicyCatalogIntegrity(catalog);
  return clonePolicyCatalog(catalog);
}

export function assertPolicyCatalogIntegrity(catalog: PolicyCatalog): void {
  assertNonEmpty(catalog.catalogVersion, "Policy catalog version");
  const ids = new Set<EntityId>();
  const domains = ordered(
    catalog.domains,
    catalog.domainOrder,
    "policy domain",
  );
  for (const domain of domains) {
    assertDefinition(domain, "policy-domain", ids);
    assertNonEmpty(domain.description, "Policy domain description");
  }
  const issues = ordered(catalog.issues, catalog.issueOrder, "policy issue");
  for (const issue of issues) {
    assertDefinition(issue, "policy-issue", ids);
    assertNonEmpty(issue.description, "Policy issue description");
    if (!catalog.domains[issue.domainId]) {
      throw new Error(`Policy issue references a missing domain: ${issue.id}`);
    }
  }
  const propositions = ordered(
    catalog.propositions,
    catalog.propositionOrder,
    "policy proposition",
  );
  for (const proposition of propositions) {
    assertDefinition(proposition, "proposition", ids);
    assertNonEmpty(proposition.question, "Policy proposition question");
    if (!catalog.issues[proposition.issueId]) {
      throw new Error(
        `Policy proposition references a missing issue: ${proposition.id}`,
      );
    }
    const parameterKeys = new Set<string>();
    for (const parameter of proposition.parameters) {
      assertNonEmpty(parameter.key, "Proposition parameter key");
      assertNonEmpty(parameter.value, "Proposition parameter value");
      if (parameterKeys.has(parameter.key)) {
        throw new Error(
          `Policy proposition contains a duplicate parameter: ${proposition.id}`,
        );
      }
      parameterKeys.add(parameter.key);
    }
    assertUniqueStrings(proposition.tags, "Policy proposition tag");
  }
  const subjects = ordered(
    catalog.subjects,
    catalog.subjectOrder,
    "knowledge subject",
  );
  for (const subject of subjects) {
    assertDefinition(subject, "subject", ids);
    assertNonEmpty(subject.description, "Knowledge subject description");
    assertUniqueStrings(subject.tags, "Knowledge subject tag");
    if (!SUBJECT_SCOPES.includes(subject.scope)) {
      throw new Error(`Knowledge subject has an invalid scope: ${subject.id}`);
    }
    const referenceExists =
      subject.scope === "domain"
        ? !!subject.referenceId && !!catalog.domains[subject.referenceId]
        : subject.scope === "issue"
          ? !!subject.referenceId && !!catalog.issues[subject.referenceId]
          : subject.scope === "proposition"
            ? !!subject.referenceId &&
              !!catalog.propositions[subject.referenceId]
            : subject.referenceId === null;
    if (!referenceExists) {
      throw new Error(
        `Knowledge subject has an invalid scope reference: ${subject.id}`,
      );
    }
  }
  const principles = ordered(
    catalog.principles,
    catalog.principleOrder,
    "political principle",
  );
  for (const principle of principles) {
    assertDefinition(principle, "principle-definition", ids);
    assertNonEmpty(principle.description, "Political principle description");
  }
}

export function clonePolicyCatalog(catalog: PolicyCatalog): PolicyCatalog {
  return {
    catalogVersion: catalog.catalogVersion,
    domains: cloneRecords(catalog.domains),
    domainOrder: [...catalog.domainOrder],
    issues: cloneRecords(catalog.issues),
    issueOrder: [...catalog.issueOrder],
    propositions: Object.fromEntries(
      Object.entries(catalog.propositions).map(([id, proposition]) => [
        id,
        {
          ...proposition,
          parameters: proposition.parameters.map((parameter) => ({
            ...parameter,
          })),
          tags: [...proposition.tags],
        },
      ]),
    ),
    propositionOrder: [...catalog.propositionOrder],
    subjects: Object.fromEntries(
      Object.entries(catalog.subjects).map(([id, subject]) => [
        id,
        { ...subject, tags: [...subject.tags] },
      ]),
    ),
    subjectOrder: [...catalog.subjectOrder],
    principles: cloneRecords(catalog.principles),
    principleOrder: [...catalog.principleOrder],
  };
}

const domains = {
  labor: createPolicyDomainDefinition(
    "labor",
    "Labor",
    "Workplace power, worker organization, and employment standards.",
  ),
  reproductiveHealth: createPolicyDomainDefinition(
    "reproductive-health",
    "Reproductive health",
    "Policy concerning pregnancy, abortion, and reproductive care.",
  ),
  environment: createPolicyDomainDefinition(
    "environment",
    "Environment",
    "Environmental protection, pollution, and conservation.",
  ),
  firearms: createPolicyDomainDefinition(
    "firearms",
    "Firearms",
    "Civilian firearm ownership, carrying, and safety policy.",
  ),
  foreignPolicy: createPolicyDomainDefinition(
    "foreign-policy",
    "Foreign policy",
    "National security, diplomacy, and defense readiness.",
  ),
  healthcare: createPolicyDomainDefinition(
    "healthcare",
    "Healthcare",
    "Health coverage, access, payment, and delivery.",
  ),
  energy: createPolicyDomainDefinition(
    "energy",
    "Energy",
    "Energy production, reliability, technology, and transition.",
  ),
  economy: createPolicyDomainDefinition(
    "economy",
    "Economy",
    "Markets, monetary policy, inequality, and public finance.",
  ),
} as const;

const issues = {
  collectiveBargaining: createPolicyIssueDefinition(
    "labor.collective-bargaining",
    domains.labor.id,
    "Collective bargaining",
    "Rules governing worker organization and bargaining rights.",
  ),
  abortionRestrictions: createPolicyIssueDefinition(
    "reproductive-health.abortion-restrictions",
    domains.reproductiveHealth.id,
    "Abortion restrictions",
    "Legal limits and exceptions affecting abortion access.",
  ),
  cleanElectricity: createPolicyIssueDefinition(
    "environment.clean-electricity",
    domains.environment.id,
    "Clean electricity",
    "Policy for electricity-sector emissions and generation sources.",
  ),
  publicCarry: createPolicyIssueDefinition(
    "firearms.public-carry",
    domains.firearms.id,
    "Public carry",
    "Rules for carrying firearms in public.",
  ),
  defenseReadiness: createPolicyIssueDefinition(
    "foreign-policy.defense-readiness",
    domains.foreignPolicy.id,
    "Defense readiness",
    "Force readiness, capacity, and strategic posture.",
  ),
  coverage: createPolicyIssueDefinition(
    "healthcare.coverage",
    domains.healthcare.id,
    "Health coverage",
    "Design and availability of health coverage.",
  ),
  prescriptionDrugs: createPolicyIssueDefinition(
    "healthcare.prescription-drugs",
    domains.healthcare.id,
    "Prescription drugs",
    "Pricing and purchasing rules for prescription medicines.",
  ),
  nuclearPower: createPolicyIssueDefinition(
    "energy.nuclear-power",
    domains.energy.id,
    "Nuclear power",
    "Policy governing nuclear generation and investment.",
  ),
  monetaryPolicy: createPolicyIssueDefinition(
    "economy.monetary-policy",
    domains.economy.id,
    "Monetary policy",
    "Central-bank tools, inflation, employment, and financial conditions.",
  ),
} as const;

const propositions = {
  collectiveBargaining: createPolicyPropositionDefinition(
    "labor.protect-collective-bargaining",
    issues.collectiveBargaining.id,
    "Protect collective bargaining",
    "Should the law strengthen protections for collective bargaining?",
  ),
  abortionRestriction: createPolicyPropositionDefinition(
    "reproductive-health.restrict-abortion-six-weeks",
    issues.abortionRestrictions.id,
    "Six-week abortion restriction",
    "Should abortion generally be prohibited after six weeks, subject to listed exceptions?",
    [{ key: "general-limit", value: "six-weeks" }],
  ),
  cleanElectricity: createPolicyPropositionDefinition(
    "environment.clean-electricity-standard",
    issues.cleanElectricity.id,
    "Clean-electricity standard",
    "Should electricity providers meet an increasing clean-generation standard?",
  ),
  concealedCarry: createPolicyPropositionDefinition(
    "firearms.permit-concealed-carry",
    issues.publicCarry.id,
    "Permit concealed carry",
    "Should qualified adults be permitted to carry concealed firearms?",
  ),
  defenseReadiness: createPolicyPropositionDefinition(
    "foreign-policy.increase-defense-readiness",
    issues.defenseReadiness.id,
    "Increase defense readiness",
    "Should defense readiness investment increase over the next four years?",
    [{ key: "time-horizon", value: "four-years" }],
  ),
  universalCoverage: createPolicyPropositionDefinition(
    "healthcare.universal-public-plan",
    issues.coverage.id,
    "Universal public health plan",
    "Should every resident be eligible for a universal publicly administered health plan?",
  ),
  drugNegotiation: createPolicyPropositionDefinition(
    "healthcare.medicare-drug-negotiation",
    issues.prescriptionDrugs.id,
    "Medicare drug-price negotiation",
    "Should Medicare negotiate prices for a defined set of prescription drugs?",
    [{ key: "scope", value: "defined-set" }],
  ),
  drugPriceCaps: createPolicyPropositionDefinition(
    "healthcare.prescription-out-of-pocket-cap",
    issues.prescriptionDrugs.id,
    "Prescription out-of-pocket cap",
    "Should annual out-of-pocket prescription costs be capped at a fixed amount?",
    [{ key: "annual-cap", value: "fixed-statutory-amount" }],
  ),
  nuclearInvestment: createPolicyPropositionDefinition(
    "energy.new-nuclear-investment",
    issues.nuclearPower.id,
    "New nuclear investment",
    "Should public financing support construction of new nuclear generation?",
  ),
  monetaryFramework: createPolicyPropositionDefinition(
    "economy.dual-mandate-framework",
    issues.monetaryPolicy.id,
    "Dual-mandate monetary framework",
    "Should monetary policy continue to balance price stability and employment goals?",
  ),
} as const;

const subjects = {
  labor: createKnowledgeSubjectDefinition(
    "policy.labor",
    "Labor policy",
    "Substantive familiarity with labor and collective-bargaining policy.",
    "domain",
    domains.labor.id,
  ),
  healthcare: createKnowledgeSubjectDefinition(
    "policy.healthcare",
    "Healthcare policy",
    "Substantive familiarity with healthcare coverage and delivery.",
    "domain",
    domains.healthcare.id,
    ["background.occupation.community-health"],
  ),
  nuclearPower: createKnowledgeSubjectDefinition(
    "policy.nuclear-power",
    "Nuclear power policy",
    "Technical and policy knowledge concerning nuclear generation.",
    "issue",
    issues.nuclearPower.id,
  ),
  monetaryPolicy: createKnowledgeSubjectDefinition(
    "policy.monetary-policy",
    "Monetary policy",
    "Technical knowledge of monetary-policy institutions and tradeoffs.",
    "issue",
    issues.monetaryPolicy.id,
  ),
  localFinance: createKnowledgeSubjectDefinition(
    "technical.local-finance",
    "Local finance",
    "Practical and technical work with local or small-business finance.",
    "technical",
    null,
    ["background.occupation.local-finance"],
  ),
  publicHealth: createKnowledgeSubjectDefinition(
    "technical.public-health",
    "Public health practice",
    "Practical work with public-health programs and community outreach.",
    "technical",
    null,
    ["background.occupation.community-health"],
  ),
  construction: createKnowledgeSubjectDefinition(
    "technical.construction-logistics",
    "Construction and logistics",
    "Practical construction, scheduling, and workplace logistics.",
    "technical",
    null,
    ["background.occupation.construction"],
  ),
  hospitality: createKnowledgeSubjectDefinition(
    "technical.hospitality-management",
    "Hospitality management",
    "Practical hospitality operations and staff management.",
    "technical",
    null,
    ["background.occupation.hospitality"],
  ),
  insurance: createKnowledgeSubjectDefinition(
    "technical.insurance-case-review",
    "Insurance and case review",
    "Practical insurance claims and case-review experience.",
    "technical",
    null,
    ["background.occupation.insurance"],
  ),
  publicPrograms: createKnowledgeSubjectDefinition(
    "technical.public-programs",
    "Public programs and research",
    "Practical public-program delivery and applied research.",
    "technical",
    null,
    ["background.occupation.public-programs"],
  ),
  skilledTrades: createKnowledgeSubjectDefinition(
    "technical.skilled-trades",
    "Skilled trades",
    "Education and practice in skilled trades.",
    "technical",
    null,
    ["background.education.skilled-trades"],
  ),
  generalStudies: createKnowledgeSubjectDefinition(
    "technical.general-studies",
    "General studies",
    "Broad postsecondary study without a narrow technical specialization.",
    "technical",
    null,
    ["background.education.general-studies"],
  ),
  publicAdministration: createKnowledgeSubjectDefinition(
    "technical.public-administration",
    "Public administration",
    "Study of public organizations, administration, and governance.",
    "technical",
    null,
    ["background.education.public-administration"],
  ),
} as const;

const principles = {
  marketRestraint: createPoliticalPrincipleDefinition(
    "markets.government-restraint",
    "Government restraint in markets",
    "Government should generally avoid unnecessary intervention in markets.",
  ),
  reduceInequality: createPoliticalPrincipleDefinition(
    "equality.reduce-severe-inequality",
    "Reduce severe inequality",
    "Government has an obligation to reduce severe inequality.",
  ),
  individualLiberty: createPoliticalPrincipleDefinition(
    "liberty.strong-protection",
    "Protect individual liberty",
    "Individual liberty should receive strong protection.",
  ),
  institutionalStability: createPoliticalPrincipleDefinition(
    "institutions.stability",
    "Institutional stability",
    "Institutional stability deserves especially serious consideration.",
  ),
} as const;

export const SYNTHETIC_POLICY_IDS = {
  domains: mapIds(domains),
  issues: mapIds(issues),
  propositions: mapIds(propositions),
  subjects: mapIds(subjects),
  principles: mapIds(principles),
} as const;

export function createSyntheticPolicyCatalog(): PolicyCatalog {
  return createPolicyCatalog({
    catalogVersion: "synthetic-stage-3-v2",
    domains: Object.values(domains),
    issues: Object.values(issues),
    propositions: Object.values(propositions),
    subjects: Object.values(subjects),
    principles: Object.values(principles),
  });
}

function byId<T extends { readonly id: EntityId }>(
  records: readonly T[],
): Readonly<Record<string, T>> {
  const result: Record<string, T> = {};
  for (const record of records) {
    if (result[record.id]) {
      throw new Error(`Duplicate catalog ID: ${record.id}`);
    }
    result[record.id] = record;
  }
  return result;
}

function ordered<T extends { readonly id: EntityId }>(
  records: Readonly<Record<string, T>>,
  order: readonly EntityId[],
  label: string,
): readonly T[] {
  if (new Set(order).size !== order.length) {
    throw new Error(`Duplicate ${label} order ID.`);
  }
  if (
    JSON.stringify(Object.keys(records).sort()) !==
    JSON.stringify([...order].sort())
  ) {
    throw new Error(`${label} order and record keys disagree.`);
  }
  return order.map((id) => {
    const record = records[id];
    if (!record || record.id !== id) {
      throw new Error(`Missing or miskeyed ${label}: ${id}`);
    }
    return record;
  });
}

function assertDefinition(
  definition: {
    readonly id: EntityId;
    readonly stableKey: string;
    readonly name: string;
  },
  kind:
    | "policy-domain"
    | "policy-issue"
    | "proposition"
    | "subject"
    | "principle-definition",
  ids: Set<EntityId>,
): void {
  assertNonEmpty(definition.stableKey, `${kind} stable key`);
  assertNonEmpty(definition.name, `${kind} name`);
  if (
    definition.id !== createStableId(kind, `definition:${definition.stableKey}`)
  ) {
    throw new Error(
      `${kind} ID does not match its stable key: ${definition.id}`,
    );
  }
  if (ids.has(definition.id)) {
    throw new Error(`Duplicate catalog definition ID: ${definition.id}`);
  }
  ids.add(definition.id);
}

function assertUniqueStrings(values: readonly string[], label: string): void {
  const seen = new Set<string>();
  for (const value of values) {
    assertNonEmpty(value, label);
    if (seen.has(value)) {
      throw new Error(`Duplicate ${label}: ${value}`);
    }
    seen.add(value);
  }
}

function assertNonEmpty(
  value: unknown,
  label: string,
): asserts value is string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${label} must be a non-empty string.`);
  }
}

function canonical(values: readonly string[]): readonly string[] {
  return [...new Set(values)].sort();
}

function cloneRecords<T extends { readonly id: EntityId }>(
  records: Readonly<Record<string, T>>,
): Readonly<Record<string, T>> {
  return Object.fromEntries(
    Object.entries(records).map(([id, record]) => [id, { ...record }]),
  );
}

function mapIds<T extends Record<string, { readonly id: EntityId }>>(
  definitions: T,
): { readonly [K in keyof T]: EntityId } {
  return Object.fromEntries(
    Object.entries(definitions).map(([key, definition]) => [
      key,
      definition.id,
    ]),
  ) as { readonly [K in keyof T]: EntityId };
}
