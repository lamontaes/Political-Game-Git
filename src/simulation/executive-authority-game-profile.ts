import {
  executiveKnown,
  executiveUnknown,
  type ExecutiveAuthorityRulePack,
  type ExecutiveBranchStructure,
  type ExecutiveRuleValue,
  type PluralExecutiveConstraint,
} from "./executive-authority-rules";
import { EXECUTIVE_AUTHORITY_RULE_PACKS } from "./executive-authority-rule-packs";
import type { RuleSourceRef } from "./legislature-rules";
import { STATES } from "./state-reference";
import {
  DISTRICT_OF_COLUMBIA_JURISDICTION_KEY,
  DISTRICT_OF_COLUMBIA_OFFICE_DISPLAY_NAME,
  DISTRICT_OF_COLUMBIA_OFFICE_KEY,
  DISTRICT_OF_COLUMBIA_OFFICE_TITLE,
} from "./nationwide-world/district-of-columbia-identity";
import {
  municipalGovernmentByKey,
  type MunicipalGovernment,
  type MunicipalReading,
} from "./municipal-government";

export const EXECUTIVE_GAME_PROFILE_VERSION =
  "ocd-executive-authority-game-profile/v1";

export type ExecutiveAuthorityProfileBasis = "read" | "estimated";

export interface ExecutiveAuthorityGameProfile {
  readonly jurisdictionKey: string;
  readonly version: typeof EXECUTIVE_GAME_PROFILE_VERSION;
  readonly basis: ExecutiveAuthorityProfileBasis;
  readonly estimated: boolean;
  readonly estimatedFields: readonly string[];
  readonly pack: ExecutiveAuthorityRulePack;
  readonly rulemakingPublicCommentRequired: boolean;
  readonly rulemakingPublicCommentRequiredEstimated: boolean;
  readonly sources: readonly RuleSourceRef[];
}

export interface MunicipalExecutivePowerProfile {
  readonly governmentKey: string;
  readonly form: string | null;
  readonly model: "strong-mayor" | "weak-mayor" | "shared-executive";
  readonly basis: "read" | "estimated";
  readonly estimated: boolean;
  readonly powerBasis: {
    readonly appointsDepartmentHeads: "read" | "estimated";
    readonly directsDepartmentHeads: "read" | "estimated";
    readonly proposesBudget: "read" | "estimated";
    readonly vetoesCouncilMeasures: "read" | "estimated";
    readonly model: "estimated";
  };
  readonly powerSources: {
    readonly appointsDepartmentHeads: RuleSourceRef | null;
    readonly directsDepartmentHeads: RuleSourceRef | null;
    readonly proposesBudget: RuleSourceRef | null;
    readonly vetoesCouncilMeasures: RuleSourceRef | null;
  };
  readonly powers: {
    readonly appointsDepartmentHeads: boolean;
    readonly directsDepartmentHeads: boolean;
    readonly proposesBudget: boolean;
    readonly vetoesCouncilMeasures: boolean;
  };
  readonly source: RuleSourceRef;
}

const GAME_PROFILE_SOURCE: RuleSourceRef = {
  authority: "game-profile",
  citation: "Our Civic Duty executive authority profile, version 1",
  sourceTitle: "Our Civic Duty executive authority game profile",
  sourceUrl: null,
  retrievedAt: null,
  verification: "game-profile",
  note: "A playable estimate generated from the spread of the six read executive packs. It is a game rule, not a claim about the jurisdiction's constitution or statutes. Read authority replaces it when available.",
};

const PROFILE_SOURCES: readonly RuleSourceRef[] = [
  GAME_PROFILE_SOURCE,
  {
    authority: "research-reference",
    citation:
      "The Council of State Governments, The Book of the States 2023, Table 4.5",
    sourceTitle:
      "Gubernatorial Executive Orders: Authorization, Provisions, Procedures",
    sourceUrl: "https://bookofthestates.org/tables/2023-4-5/",
    retrievedAt: "2026-10-06",
    verification: "partial",
    note: "A survey of governors' offices across states and territories. It is a reference for the profile's authority-basis and administrative-procedure estimates, not primary legal text.",
  },
  {
    authority: "research-reference",
    citation:
      "The Council of State Governments, The Book of the States 2022, Table 9.35",
    sourceTitle:
      "Governor's Authority to Issue Emergency Declaration, National Special Security Events (NSSE), Mandatory Evacuations",
    sourceUrl: "https://bookofthestates.org/tables/2022-9-35/",
    retrievedAt: "2026-10-06",
    verification: "partial",
    note: "The National Emergency Management Association survey reports declaration authority for state and District executives, but does not give initial duration, extension, or legislative-termination periods. Those values remain game-profile estimates from the read-pack spread.",
  },
];

const EXECUTIVE_PROFILE_JURISDICTIONS = Object.entries(STATES).map(
  ([usps, state]) => ({
    jurisdictionKey: `US-${usps}`,
    usps,
    name: state.name,
    jurisdictionKind: state.jurisdictionKind,
  }),
);

const PROFILE_FIELDS = [
  "office.branchStructure",
  "presentment.legislativeRulePackId",
  "appointment.executiveAppoints",
  "appointment.legislativeConfirmationRequired",
  "appointment.confirmingBody",
  "removal.mode",
  "specialSession.executiveMayConvene",
  "specialSession.agendaLimitedToCall",
  "executiveDirective.hasDirectiveAuthority",
  "executiveDirective.authorityBasis",
  "reorganization.executiveMayReorganize",
  "reorganization.legislativeDisapprovalAvailable",
  "reorganization.sunset",
  "emergencyDeclaration.executiveMayDeclare",
  "emergencyDeclaration.initialDurationDays",
  "emergencyDeclaration.extension",
  "emergencyDeclaration.legislativeTermination",
  "clemency.model",
  "clemency.scope",
  "budgetSubmission.executiveMustSubmit",
  "budgetSubmission.submissionDeadline",
  "administrative.faithfulExecutionDuty",
  "administrative.supervisoryAuthority",
  "guard.commandsMilitia",
  "guard.scope",
  "rulemaking.publicCommentRequired",
] as const;

const GENERATED_PROFILES = new Map<string, ExecutiveAuthorityGameProfile>();

function stableIndex(key: string, size: number): number {
  let hash = 2166136261;
  for (const char of key) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) % size;
}

function spreadValue<T>(values: readonly T[], key: string, fallback: T): T {
  if (values.length === 0) return fallback;
  return values[stableIndex(key, values.length)]!;
}

function knownValues<T>(
  read: (pack: ExecutiveAuthorityRulePack) => ExecutiveRuleValue<T>,
): T[] {
  return EXECUTIVE_AUTHORITY_RULE_PACKS.flatMap((pack) => {
    const rule = read(pack);
    return rule.kind === "known" ? [rule.value] : [];
  });
}

function middleOfReadSpread(
  values: readonly number[],
  fallback: number,
): number {
  if (values.length === 0) return fallback;
  const sorted = [...values].sort((left, right) => left - right);
  const middle = (sorted.length - 1) / 2;
  if (Number.isInteger(middle)) return sorted[middle]!;
  return Math.round(
    (sorted[Math.floor(middle)]! + sorted[Math.ceil(middle)]!) / 2,
  );
}

function profileSourceForField(field: string): RuleSourceRef {
  return {
    ...GAME_PROFILE_SOURCE,
    citation: `Executive authority game-profile estimate: ${field}`,
    note: `Estimated from the spread of the six read executive-authority packs and the cited national reference tables. This is a playable game rule, not this jurisdiction's law. Field: ${field}.`,
  };
}

function profileRuleForField<T>(
  value: T,
  field: string,
): ExecutiveRuleValue<T> {
  return executiveKnown(value, profileSourceForField(field));
}

function estimatedPluralExecutive(
  branchStructure: ExecutiveBranchStructure,
): readonly PluralExecutiveConstraint[] {
  if (branchStructure !== "plural") return [];
  const labels = [
    "Attorney General",
    "Secretary of State",
    "Auditor",
    "Treasurer",
  ];
  return labels.map((officeLabel) => ({
    officeLabel,
    independentlyElected: profileRuleForField(
      true,
      `pluralExecutive.${officeLabel}.independentlyElected`,
    ),
    source: profileSourceForField(`pluralExecutive.${officeLabel}`),
  }));
}

function officeIdentity(jurisdictionKey: string): {
  officeKey: string;
  title: string;
  displayName: string;
} {
  if (jurisdictionKey === DISTRICT_OF_COLUMBIA_JURISDICTION_KEY) {
    return {
      officeKey: DISTRICT_OF_COLUMBIA_OFFICE_KEY,
      title: DISTRICT_OF_COLUMBIA_OFFICE_TITLE,
      displayName: DISTRICT_OF_COLUMBIA_OFFICE_DISPLAY_NAME,
    };
  }
  const usps = jurisdictionKey.slice("US-".length);
  const state = STATES[usps];
  if (!state) {
    throw new Error(
      `No executive game profile jurisdiction '${jurisdictionKey}'.`,
    );
  }
  return {
    officeKey: `us-${usps.toLowerCase()}-governor`,
    title: "Governor",
    displayName: `Governor of ${state.name}`,
  };
}

function buildEstimatedPack(
  jurisdictionKey: string,
): ExecutiveAuthorityRulePack {
  const identity = officeIdentity(jurisdictionKey);
  const branchStructure = spreadValue(
    knownValues((pack) => pack.office.branchStructure),
    jurisdictionKey,
    "plural" as const,
  );
  const emergencyDurations = knownValues(
    (pack) => pack.emergencyDeclaration.initialDurationDays,
  );
  const initialDurationDays = middleOfReadSpread(emergencyDurations, 18);
  const terminationModels = knownValues(
    (pack) => pack.emergencyDeclaration.legislativeTermination,
  );
  const termination = spreadValue(
    terminationModels,
    jurisdictionKey,
    "legislative_termination_majority_each_house",
  );
  const removalModes = knownValues((pack) => pack.removal.mode);
  const removalMode = spreadValue(
    removalModes,
    jurisdictionKey,
    "at-pleasure" as const,
  );
  const clemencyModels = knownValues((pack) => pack.clemency.model);
  const clemencyModel = spreadValue(
    clemencyModels,
    jurisdictionKey,
    "executive-sole" as const,
  );

  const pack: ExecutiveAuthorityRulePack = {
    packId: `${jurisdictionKey.toLowerCase()}-executive-game-profile-v1`,
    jurisdictionKey,
    displayName: identity.displayName,
    office: {
      officeKey: identity.officeKey,
      title: identity.title,
      branchStructure: profileRuleForField(
        branchStructure,
        "office.branchStructure",
      ),
      source: profileSourceForField("office identity"),
    },
    presentment: {
      legislativeRulePackId: executiveUnknown(
        "No generated legislative authority pack can be used here as a source-backed presentment reference; bill-presentment rules remain owned by the legislative profile.",
      ),
    },
    appointment: {
      executiveAppoints: profileRuleForField(
        spreadValue(
          knownValues((item) => item.appointment.executiveAppoints),
          jurisdictionKey,
          true,
        ),
        "appointment.executiveAppoints",
      ),
      legislativeConfirmationRequired: profileRuleForField(
        spreadValue(
          knownValues(
            (item) => item.appointment.legislativeConfirmationRequired,
          ),
          jurisdictionKey,
          true,
        ),
        "appointment.legislativeConfirmationRequired",
      ),
      confirmingBody: profileRuleForField(
        spreadValue(
          knownValues((item) => item.appointment.confirmingBody),
          jurisdictionKey,
          "the Legislature",
        ),
        "appointment.confirmingBody",
      ),
      source: profileSourceForField("appointment"),
    },
    removal: {
      mode: profileRuleForField(removalMode, "removal.mode"),
      source: profileSourceForField("removal"),
    },
    specialSession: {
      executiveMayConvene: profileRuleForField(
        true,
        "specialSession.executiveMayConvene",
      ),
      agendaLimitedToCall: profileRuleForField(
        false,
        "specialSession.agendaLimitedToCall",
      ),
      source: profileSourceForField("specialSession"),
    },
    executiveDirective: {
      hasDirectiveAuthority: profileRuleForField(
        true,
        "executiveDirective.hasDirectiveAuthority",
      ),
      authorityBasis: profileRuleForField(
        "constitutional, statutory, or implied authority as summarized by the 2023 governors' survey",
        "executiveDirective.authorityBasis",
      ),
      source: profileSourceForField("executiveDirective"),
    },
    reorganization: {
      executiveMayReorganize: profileRuleForField(
        spreadValue(
          knownValues((item) => item.reorganization.executiveMayReorganize),
          jurisdictionKey,
          false,
        ),
        "reorganization.executiveMayReorganize",
      ),
      legislativeDisapprovalAvailable: profileRuleForField(
        spreadValue(
          knownValues(
            (item) => item.reorganization.legislativeDisapprovalAvailable,
          ),
          jurisdictionKey,
          false,
        ),
        "reorganization.legislativeDisapprovalAvailable",
      ),
      sunset: profileRuleForField(
        "No automatic sunset is modeled in this profile; any read rule takes precedence.",
        "reorganization.sunset",
      ),
      source: profileSourceForField("reorganization"),
    },
    emergencyDeclaration: {
      executiveMayDeclare: profileRuleForField(
        true,
        "emergencyDeclaration.executiveMayDeclare",
      ),
      initialDurationDays: profileRuleForField(
        initialDurationDays,
        "emergencyDeclaration.initialDurationDays",
      ),
      extension: profileRuleForField(
        "The executive may record one renewal while the recorded emergency continues.",
        "emergencyDeclaration.extension",
      ),
      legislativeTermination: profileRuleForField(
        termination,
        "emergencyDeclaration.legislativeTermination",
      ),
      source: profileSourceForField("emergencyDeclaration"),
    },
    clemency: {
      model: profileRuleForField(clemencyModel, "clemency.model"),
      scope: profileRuleForField(
        "Clemency applies only to offenses under this government's law and follows its recorded procedure.",
        "clemency.scope",
      ),
      source: profileSourceForField("clemency"),
    },
    budgetSubmission: {
      executiveMustSubmit: profileRuleForField(
        spreadValue(
          knownValues((item) => item.budgetSubmission.executiveMustSubmit),
          jurisdictionKey,
          true,
        ),
        "budgetSubmission.executiveMustSubmit",
      ),
      submissionDeadline: profileRuleForField(
        "on the legislature's established budget calendar",
        "budgetSubmission.submissionDeadline",
      ),
      source: profileSourceForField("budgetSubmission"),
    },
    administrative: {
      faithfulExecutionDuty: profileRuleForField(
        true,
        "administrative.faithfulExecutionDuty",
      ),
      supervisoryAuthority: profileRuleForField(
        "Manage the executive branch within powers granted by law.",
        "administrative.supervisoryAuthority",
      ),
      source: profileSourceForField("administrative"),
    },
    pluralExecutive: estimatedPluralExecutive(branchStructure),
    guard: {
      commandsMilitia: profileRuleForField(true, "guard.commandsMilitia"),
      scope: profileRuleForField(
        "Command is limited by federal law and to the state militia when it is not in federal service.",
        "guard.scope",
      ),
      source: profileSourceForField("guard"),
    },
    sources: PROFILE_SOURCES,
    unresolvedGaps: [
      "The jurisdiction's executive-authority instruments have not been read; every generated value is an estimated game rule and must not be presented as law.",
    ],
  };
  return pack;
}

function buildEstimatedProfile(
  jurisdictionKey: string,
): ExecutiveAuthorityGameProfile {
  const pack = buildEstimatedPack(jurisdictionKey);
  return {
    jurisdictionKey,
    version: EXECUTIVE_GAME_PROFILE_VERSION,
    basis: "estimated",
    estimated: true,
    estimatedFields: PROFILE_FIELDS,
    pack,
    rulemakingPublicCommentRequired: true,
    rulemakingPublicCommentRequiredEstimated: true,
    sources: PROFILE_SOURCES,
  };
}

export function executiveAuthorityGameProfileForJurisdiction(
  jurisdictionKey: string,
): ExecutiveAuthorityGameProfile {
  const readPack = EXECUTIVE_AUTHORITY_RULE_PACKS.find(
    (candidate) => candidate.jurisdictionKey === jurisdictionKey,
  );
  if (readPack) {
    return {
      jurisdictionKey,
      version: EXECUTIVE_GAME_PROFILE_VERSION,
      basis: "read",
      estimated: false,
      estimatedFields: [],
      pack: readPack,
      rulemakingPublicCommentRequired: true,
      rulemakingPublicCommentRequiredEstimated: true,
      sources: readPack.sources,
    };
  }
  const cached = GENERATED_PROFILES.get(jurisdictionKey);
  if (cached) return cached;
  if (
    !EXECUTIVE_PROFILE_JURISDICTIONS.some(
      (entry) => entry.jurisdictionKey === jurisdictionKey,
    )
  ) {
    throw new Error(
      `No executive game profile jurisdiction '${jurisdictionKey}'.`,
    );
  }
  const profile = buildEstimatedProfile(jurisdictionKey);
  GENERATED_PROFILES.set(jurisdictionKey, profile);
  return profile;
}

export function executiveProfileForOfficeKey(
  officeKey: string,
): ExecutiveAuthorityGameProfile | null {
  const readPack = EXECUTIVE_AUTHORITY_RULE_PACKS.find(
    (candidate) => candidate.office.officeKey === officeKey,
  );
  if (readPack) {
    return executiveAuthorityGameProfileForJurisdiction(
      readPack.jurisdictionKey,
    );
  }
  for (const { jurisdictionKey } of EXECUTIVE_PROFILE_JURISDICTIONS) {
    const profile =
      executiveAuthorityGameProfileForJurisdiction(jurisdictionKey);
    if (profile.pack.office.officeKey === officeKey) return profile;
  }
  return null;
}

function knownMayorPower(
  reading: MunicipalReading | null,
  power: string,
): boolean | null {
  const row = reading?.powers.find(
    (candidate) =>
      candidate.power === power &&
      candidate.heldByRole === "MAYOR" &&
      candidate.heldState === "KNOWN" &&
      candidate.held !== null,
  );
  return row?.held ?? null;
}

function municipalReadPowerSource(
  reading: MunicipalReading | null,
  governmentKey: string,
  form: string | null,
  power: string,
): RuleSourceRef | null {
  const reference = reading?.sources[0];
  if (!reading || !reference) return null;
  return {
    authority: "research-reference",
    citation: `${reference.title}: ${power}`,
    sourceTitle: `${reference.issuingAuthority}: ${reference.title}`,
    sourceUrl: reference.url,
    retrievedAt: reference.retrievedDate,
    verification: "partial",
    note: `The municipal registry records this mayor power for ${governmentKey}. Evidence class: ${reading.evidence}; form: ${form ?? "unstated"}. The registry transcription is not itself a legal opinion.`,
  };
}

export function municipalExecutivePowerProfile(
  government: MunicipalGovernment,
): MunicipalExecutivePowerProfile | null {
  const reading =
    government.readings.find(
      (candidate) => candidate.evidence === "enacted-text",
    ) ??
    government.readings.find(
      (candidate) => candidate.evidence === "research-transcription",
    ) ??
    null;
  const form = reading?.form ?? null;
  const hasSeparateMayor =
    reading?.mayor?.structuralPosition === "SEPARATE_CHIEF_EXECUTIVE";
  const managerLed =
    form === "COUNCIL_MANAGER" ||
    form === "COMMISSION_MANAGER" ||
    reading?.mayor?.structuralPosition === "PRESIDING_MEMBER_OF_BODY";
  const mayorLed =
    form === "MAYOR_COUNCIL" ||
    form === "URBAN_COUNTY_CONSOLIDATED" ||
    form === "METRO_CONSOLIDATED" ||
    form === "CITY_COUNTY_CONSOLIDATED";
  if (!form && !reading?.mayor && !reading?.manager) return null;

  const appointsRead = knownMayorPower(reading, "APPOINTMENT");
  const directsRead = reading?.departmentHeadAuthority
    ? hasSeparateMayor
    : null;
  const budgetRead = knownMayorPower(reading, "BUDGET_PROPOSAL");
  const vetoRead = knownMayorPower(reading, "VETO");
  const powers = {
    appointsDepartmentHeads: appointsRead ?? mayorLed,
    directsDepartmentHeads: directsRead ?? mayorLed,
    proposesBudget: budgetRead ?? mayorLed,
    vetoesCouncilMeasures: vetoRead ?? mayorLed,
  };
  const estimated = true;
  return {
    governmentKey: government.key,
    form,
    model: managerLed
      ? "weak-mayor"
      : mayorLed
        ? "strong-mayor"
        : hasSeparateMayor
          ? "shared-executive"
          : "weak-mayor",
    basis: estimated ? "estimated" : "read",
    estimated,
    powerBasis: {
      appointsDepartmentHeads: appointsRead === null ? "estimated" : "read",
      directsDepartmentHeads: directsRead === null ? "estimated" : "read",
      proposesBudget: budgetRead === null ? "estimated" : "read",
      vetoesCouncilMeasures: vetoRead === null ? "estimated" : "read",
      model: "estimated",
    },
    powerSources: {
      appointsDepartmentHeads:
        appointsRead === null
          ? null
          : municipalReadPowerSource(
              reading,
              government.key,
              form,
              "APPOINTMENT",
            ),
      directsDepartmentHeads:
        directsRead === null
          ? null
          : municipalReadPowerSource(
              reading,
              government.key,
              form,
              "departmentHeadAuthority",
            ),
      proposesBudget:
        budgetRead === null
          ? null
          : municipalReadPowerSource(
              reading,
              government.key,
              form,
              "BUDGET_PROPOSAL",
            ),
      vetoesCouncilMeasures:
        vetoRead === null
          ? null
          : municipalReadPowerSource(reading, government.key, form, "VETO"),
    },
    powers,
    source: {
      ...GAME_PROFILE_SOURCE,
      citation: "Municipal executive model estimate",
      note: `The broad strong/weak mayor model is estimated from the recorded form of government (${form ?? "form not stated"}); individual powers marked read retain their municipal registry source.`,
    },
  };
}

export function municipalExecutivePowerProfileByKey(
  governmentKey: string,
): MunicipalExecutivePowerProfile | null {
  const government = municipalGovernmentByKey(governmentKey);
  return government ? municipalExecutivePowerProfile(government) : null;
}

export function executiveProfileCoverage(): readonly ExecutiveAuthorityGameProfile[] {
  return EXECUTIVE_PROFILE_JURISDICTIONS.map(({ jurisdictionKey }) =>
    executiveAuthorityGameProfileForJurisdiction(jurisdictionKey),
  );
}
