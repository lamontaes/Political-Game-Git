// STOPGAP RULES3-GOV-123: inherited hashed executive-law estimates and fallback powers, preserved for equivalence only.
// Lifted unchanged from src/simulation/executive-authority-game-profile.ts; RULES-3, 2026-10-11.
import { executiveKnown, executiveUnknown } from "./executive-rule-values";
import type {
  ExecutiveAuthorityRulePack,
  ExecutiveBranchStructure,
  ExecutiveRuleValue,
  PluralExecutiveConstraint,
} from "../../simulation/executive-authority-rules";
import type { RuleSourceRef } from "../../simulation/legislature-rules";

export const GAME_PROFILE_SOURCE: RuleSourceRef = {
  authority: "game-profile",
  citation: "Our Civic Duty executive authority profile, version 1",
  sourceTitle: "Our Civic Duty executive authority game profile",
  sourceUrl: null,
  retrievedAt: null,
  verification: "game-profile",
  note: "A playable estimate generated from the spread of the six read executive packs. It is a game rule, not a claim about the jurisdiction's constitution or statutes. Read authority replaces it when available.",
};

export const PROFILE_SOURCES: readonly RuleSourceRef[] = [
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

export function stableIndex(key: string, size: number): number {
  let hash = 2166136261;
  for (const char of key) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) % size;
}

export function spreadValue<T>(
  values: readonly T[],
  key: string,
  fallback: T,
): T {
  if (values.length === 0) return fallback;
  return values[stableIndex(key, values.length)]!;
}

export function middleOfReadSpread(
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

export function profileSourceForField(field: string): RuleSourceRef {
  return {
    ...GAME_PROFILE_SOURCE,
    citation: `Executive authority game-profile estimate: ${field}`,
    note: `Estimated from the spread of the six read executive-authority packs and the cited national reference tables. This is a playable game rule, not this jurisdiction's law. Field: ${field}.`,
  };
}

export function profileRuleForField<T>(
  value: T,
  field: string,
): ExecutiveRuleValue<T> {
  return executiveKnown(value, profileSourceForField(field));
}

export function estimatedPluralExecutive(
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

export function buildEstimatedPack(
  jurisdictionKey: string,
  identity: {
    readonly officeKey: string;
    readonly title: string;
    readonly displayName: string;
  },
  packs: readonly ExecutiveAuthorityRulePack[],
): ExecutiveAuthorityRulePack {
  const valuesFromSelectedPacks = <T>(
    read: (pack: ExecutiveAuthorityRulePack) => ExecutiveRuleValue<T>,
  ): T[] =>
    packs.flatMap((pack) => {
      const rule = read(pack);
      return rule.kind === "known" ? [rule.value] : [];
    });
  const branchStructure = spreadValue(
    valuesFromSelectedPacks((pack) => pack.office.branchStructure),
    jurisdictionKey,
    "plural" as const,
  );
  const emergencyDurations = valuesFromSelectedPacks(
    (pack) => pack.emergencyDeclaration.initialDurationDays,
  );
  const initialDurationDays = middleOfReadSpread(emergencyDurations, 18);
  const terminationModels = valuesFromSelectedPacks(
    (pack) => pack.emergencyDeclaration.legislativeTermination,
  );
  const termination = spreadValue(
    terminationModels,
    jurisdictionKey,
    "legislative_termination_majority_each_house",
  );
  const removalModes = valuesFromSelectedPacks((pack) => pack.removal.mode);
  const removalMode = spreadValue(
    removalModes,
    jurisdictionKey,
    "at-pleasure" as const,
  );
  const clemencyModels = valuesFromSelectedPacks((pack) => pack.clemency.model);
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
          valuesFromSelectedPacks((item) => item.appointment.executiveAppoints),
          jurisdictionKey,
          true,
        ),
        "appointment.executiveAppoints",
      ),
      legislativeConfirmationRequired: profileRuleForField(
        spreadValue(
          valuesFromSelectedPacks(
            (item) => item.appointment.legislativeConfirmationRequired,
          ),
          jurisdictionKey,
          true,
        ),
        "appointment.legislativeConfirmationRequired",
      ),
      confirmingBody: profileRuleForField(
        spreadValue(
          valuesFromSelectedPacks((item) => item.appointment.confirmingBody),
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
          valuesFromSelectedPacks(
            (item) => item.reorganization.executiveMayReorganize,
          ),
          jurisdictionKey,
          false,
        ),
        "reorganization.executiveMayReorganize",
      ),
      legislativeDisapprovalAvailable: profileRuleForField(
        spreadValue(
          valuesFromSelectedPacks(
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
          valuesFromSelectedPacks(
            (item) => item.budgetSubmission.executiveMustSubmit,
          ),
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
