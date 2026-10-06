import { municipalGovernmentByKey } from "./municipal-government";
import { MUNICIPAL_ELECTION_RULE_PACKS } from "./municipal-election-rule-packs";
import type {
  MunicipalInitiativeForm,
  MunicipalRule,
  PetitionThreshold,
  ProtestReferendumAvailability,
} from "./municipal-election-rules";
import { municipalRecallRule } from "./recall";
import type { World } from "./types";

export type MunicipalCitizenPetitionKind =
  "recall" | "local-initiative" | "protest-referendum";

export interface ResolvedCitizenPetitionRule {
  readonly kind: MunicipalCitizenPetitionKind;
  readonly available: boolean;
  readonly reason: string | null;
  readonly form: MunicipalInitiativeForm | null;
  readonly formBasis: "compiled" | "estimated" | "unresolved";
  readonly availabilityBasis: "compiled" | "estimated" | "unresolved";
  readonly threshold: PetitionThreshold | null;
  readonly thresholdBasis: "compiled" | "estimated" | "unresolved";
  readonly circulationDays: number | null;
  readonly circulationBasis: "compiled" | "estimated" | "unresolved";
  readonly sourceCitations: readonly string[];
  readonly basisNote: string;
  readonly distribution: {
    readonly kind: "jurisdiction-wide";
    readonly basis: "estimated";
    readonly note: string;
  };
  readonly review: {
    readonly kind: "clerk-checks-voter-eligibility";
    readonly basis: "b01-signer-record-and-voter-eligibility";
  };
}

function median(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  const value =
    sorted.length % 2 === 0
      ? ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2
      : (sorted[middle] ?? 0);
  return Math.round(value * 100) / 100;
}

function medianThreshold(
  stateUsps: string,
  family: string,
  kind: "local-initiative" | "protest-referendum",
): PetitionThreshold | null {
  const pack = MUNICIPAL_ELECTION_RULE_PACKS[stateUsps];
  const similar = Object.values(MUNICIPAL_ELECTION_RULE_PACKS).filter(
    (candidate) => candidate.optionFamily === family,
  );
  const candidates =
    similar.length > 0 ? similar : Object.values(MUNICIPAL_ELECTION_RULE_PACKS);
  let rules = candidates.map((candidate) =>
    kind === "local-initiative"
      ? candidate.directDemocracy.initiativePetitionThreshold
      : candidate.directDemocracy.protestReferendumThreshold,
  );
  let known = rules.flatMap((rule) =>
    rule.kind === "known" ? [rule.value] : [],
  );
  if (known.length === 0 && similar.length > 0) {
    rules = Object.values(MUNICIPAL_ELECTION_RULE_PACKS).map((candidate) =>
      kind === "local-initiative"
        ? candidate.directDemocracy.initiativePetitionThreshold
        : candidate.directDemocracy.protestReferendumThreshold,
    );
    known = rules.flatMap((rule) =>
      rule.kind === "known" ? [rule.value] : [],
    );
  }
  if (known.length === 0) return null;
  const baseCounts = new Map<PetitionThreshold["base"], number>();
  for (const threshold of known)
    baseCounts.set(threshold.base, (baseCounts.get(threshold.base) ?? 0) + 1);
  const base = [...baseCounts.entries()].sort(
    (left, right) => right[1] - left[1] || left[0].localeCompare(right[0]),
  )[0]?.[0];
  if (!base) return null;
  const percent = median(
    known
      .filter((threshold) => threshold.base === base)
      .map((row) => row.percent),
  );
  return percent === null ? null : { percent, base };
}

function medianWindowDays(stateUsps: string, family: string): number | null {
  const similar = Object.values(MUNICIPAL_ELECTION_RULE_PACKS).filter(
    (candidate) => candidate.optionFamily === family,
  );
  const candidates =
    similar.length > 0 ? similar : Object.values(MUNICIPAL_ELECTION_RULE_PACKS);
  let windows = candidates.flatMap((candidate) => {
    const rule = candidate.directDemocracy.protestReferendumWindowDays;
    return rule.kind === "known" && rule.value > 0 ? [rule.value] : [];
  });
  if (windows.length === 0 && similar.length > 0)
    windows = Object.values(MUNICIPAL_ELECTION_RULE_PACKS).flatMap(
      (candidate) => {
        const rule = candidate.directDemocracy.protestReferendumWindowDays;
        return rule.kind === "known" && rule.value > 0 ? [rule.value] : [];
      },
    );
  void stateUsps;
  return median(windows);
}

function modalKnownValue<T extends string>(
  family: string,
  read: (
    pack: (typeof MUNICIPAL_ELECTION_RULE_PACKS)[string],
  ) => MunicipalRule<T>,
): T | null {
  const similar = Object.values(MUNICIPAL_ELECTION_RULE_PACKS).filter(
    (candidate) => candidate.optionFamily === family,
  );
  const candidates =
    similar.length > 0 ? similar : Object.values(MUNICIPAL_ELECTION_RULE_PACKS);
  const counts = new Map<T, number>();
  for (const candidate of candidates) {
    const rule = read(candidate);
    if (rule.kind === "known")
      counts.set(rule.value, (counts.get(rule.value) ?? 0) + 1);
  }
  let mode =
    [...counts.entries()].sort(
      (left, right) => right[1] - left[1] || left[0].localeCompare(right[0]),
    )[0]?.[0] ?? null;
  if (mode === null && similar.length > 0) {
    for (const candidate of Object.values(MUNICIPAL_ELECTION_RULE_PACKS)) {
      const rule = read(candidate);
      if (rule.kind === "known")
        counts.set(rule.value, (counts.get(rule.value) ?? 0) + 1);
    }
    mode =
      [...counts.entries()].sort(
        (left, right) => right[1] - left[1] || left[0].localeCompare(right[0]),
      )[0]?.[0] ?? null;
  }
  return mode;
}

function readingReason<T>(rule: MunicipalRule<T>): string | null {
  switch (rule.kind) {
    case "known":
      return null;
    case "unknown":
    case "not-applicable":
      return rule.note;
    case "locally-selectable":
      return rule.statutoryDefault === null
        ? `State law leaves this choice to the local charter (${rule.options.join(", ")}) and names no default.`
        : `State law leaves this choice to the local charter; its unstated default is ${rule.statutoryDefault}.`;
  }
}

function citationOf<T>(rule: MunicipalRule<T>): string | null {
  return rule.kind === "known" || rule.kind === "locally-selectable"
    ? rule.source.citation
    : null;
}

/** Read compiled municipal readings and make every fallback visible as an estimate. */
export function municipalCitizenPetitionRule(
  world: World,
  governmentKey: string,
  kind: MunicipalCitizenPetitionKind,
): ResolvedCitizenPetitionRule {
  const government = municipalGovernmentByKey(governmentKey);
  const defaultFields = {
    kind,
    sourceCitations: [] as string[],
    basisNote:
      "Estimated values use the median or modal compiled reading for this municipal option family; where that peer set has no resolved value, the full municipal pack set supplies the fallback.",
    distribution: {
      kind: "jurisdiction-wide" as const,
      basis: "estimated" as const,
      note: "No municipal distribution rule is compiled; use the jurisdiction-wide electorate while marked estimated.",
    },
    review: {
      kind: "clerk-checks-voter-eligibility" as const,
      basis: "b01-signer-record-and-voter-eligibility" as const,
    },
  };
  if (!government)
    return {
      ...defaultFields,
      available: false,
      reason: "This town's government is not known.",
      form: null,
      formBasis: "unresolved",
      availabilityBasis: "unresolved",
      threshold: null,
      thresholdBasis: "unresolved",
      circulationDays: null,
      circulationBasis: "unresolved",
    };

  if (kind === "recall") {
    const recall = municipalRecallRule(governmentKey, world);
    return {
      ...defaultFields,
      available: recall.available,
      reason: recall.available ? null : recall.reason,
      form: null,
      formBasis: "unresolved",
      availabilityBasis: "compiled",
      threshold: recall.available ? recall.threshold : null,
      thresholdBasis: recall.available
        ? recall.threshold
          ? "compiled"
          : "unresolved"
        : "unresolved",
      circulationDays: recall.available ? recall.circulationDays : null,
      circulationBasis: recall.available ? "compiled" : "unresolved",
      sourceCitations: [],
    };
  }

  const pack = MUNICIPAL_ELECTION_RULE_PACKS[government.state.toUpperCase()];
  if (!pack)
    return {
      ...defaultFields,
      available: false,
      reason: `No compiled municipal petition rule exists for ${government.state}.`,
      form: null,
      formBasis: "unresolved",
      availabilityBasis: "unresolved",
      threshold: null,
      thresholdBasis: "unresolved",
      circulationDays: null,
      circulationBasis: "unresolved",
    };

  if (kind === "local-initiative") {
    const formRule = pack.directDemocracy.initiativeForm;
    const form =
      formRule.kind === "known"
        ? formRule.value
        : modalKnownValue(
            pack.optionFamily,
            (candidate) => candidate.directDemocracy.initiativeForm,
          );
    const formBasis =
      formRule.kind === "known"
        ? "compiled"
        : form
          ? "estimated"
          : "unresolved";
    if (form === "prohibited")
      return {
        ...defaultFields,
        available: false,
        reason: "State general law authorizes no citizen ordinance initiative.",
        form,
        formBasis,
        availabilityBasis: formBasis,
        threshold: null,
        thresholdBasis: "compiled",
        circulationDays: null,
        circulationBasis: "unresolved",
        sourceCitations: [citationOf(formRule)].filter(
          (row): row is string => row !== null,
        ),
      };
    if (!form)
      return {
        ...defaultFields,
        available: false,
        reason: readingReason(formRule),
        form: null,
        formBasis: "unresolved",
        availabilityBasis: "unresolved",
        threshold: null,
        thresholdBasis: "unresolved",
        circulationDays: null,
        circulationBasis: "unresolved",
        sourceCitations: [citationOf(formRule)].filter(
          (row): row is string => row !== null,
        ),
      };
    const thresholdRule = pack.directDemocracy.initiativePetitionThreshold;
    const threshold =
      thresholdRule.kind === "known"
        ? thresholdRule.value
        : medianThreshold(pack.usps, pack.optionFamily, kind);
    return {
      ...defaultFields,
      available: true,
      reason: null,
      form,
      formBasis,
      availabilityBasis: formBasis,
      threshold,
      thresholdBasis: thresholdRule.kind === "known" ? "compiled" : "estimated",
      circulationDays: medianWindowDays(pack.usps, pack.optionFamily),
      circulationBasis: "estimated",
      sourceCitations: [citationOf(formRule), citationOf(thresholdRule)].filter(
        (row): row is string => row !== null,
      ),
    };
  }

  const availability: MunicipalRule<ProtestReferendumAvailability> =
    pack.directDemocracy.protestReferendum;
  const resolvedAvailability =
    availability.kind === "known"
      ? availability.value
      : modalKnownValue(
          pack.optionFamily,
          (candidate) => candidate.directDemocracy.protestReferendum,
        );
  const availabilityBasis =
    availability.kind === "known"
      ? "compiled"
      : resolvedAvailability
        ? "estimated"
        : "unresolved";
  if (resolvedAvailability === "prohibited")
    return {
      ...defaultFields,
      available: false,
      reason:
        availability.kind === "known"
          ? "State general law provides no protest referendum against municipal ordinances."
          : "Similar municipal rule packs estimate no protest referendum is available; the local charter reading is unresolved.",
      form: null,
      formBasis: "unresolved",
      availabilityBasis,
      threshold: null,
      thresholdBasis: "compiled",
      circulationDays: null,
      circulationBasis: "compiled",
      sourceCitations: [citationOf(availability)].filter(
        (row): row is string => row !== null,
      ),
    };
  if (!resolvedAvailability)
    return {
      ...defaultFields,
      available: false,
      reason: readingReason(availability),
      form: null,
      formBasis: "unresolved",
      availabilityBasis: "unresolved",
      threshold: null,
      thresholdBasis: "unresolved",
      circulationDays: null,
      circulationBasis: "unresolved",
      sourceCitations: [citationOf(availability)].filter(
        (row): row is string => row !== null,
      ),
    };
  const thresholdRule = pack.directDemocracy.protestReferendumThreshold;
  const windowRule = pack.directDemocracy.protestReferendumWindowDays;
  const threshold =
    thresholdRule.kind === "known"
      ? thresholdRule.value
      : medianThreshold(pack.usps, pack.optionFamily, kind);
  const circulationDays =
    windowRule.kind === "known"
      ? windowRule.value
      : medianWindowDays(pack.usps, pack.optionFamily);
  return {
    ...defaultFields,
    available: true,
    reason: null,
    form: null,
    formBasis: "unresolved",
    availabilityBasis,
    threshold,
    thresholdBasis: thresholdRule.kind === "known" ? "compiled" : "estimated",
    circulationDays,
    circulationBasis: windowRule.kind === "known" ? "compiled" : "estimated",
    sourceCitations: [
      citationOf(availability),
      citationOf(thresholdRule),
      citationOf(windowRule),
    ].filter((row): row is string => row !== null),
  };
}
