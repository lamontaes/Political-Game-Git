import type { EntityId, HistoricalCutoff, IsoDate, World } from "../types";
import {
  lawTermScopesMatch,
  type LawAmountUnit,
  type LawTermScope,
  type RentalPriceRule,
} from "../law-consequence-types";
import {
  reciprocalRankedReferences,
  weightedReferenceMean,
} from "../income-tax-withholding";
import { spreadOf } from "../sample-spread";
import { SeededRng } from "../rng";
import { censusRegionOf } from "../world-setup/census-regions";
import {
  startingLawTerms,
  startingLawCategories,
  startingLawSchedules,
  startingLawTermScope,
  lawInForce,
  startingLawPlaceKey,
  type LawInForce,
} from "./law-in-force";
import { stateJurisdictionForKey } from "../life-places";
import { publicGovernmentIdentityForRecord } from "../public-government-identity";
import {
  assertLawCategories,
  assertLawSchedules,
  type LawScheduleTerm,
} from "../law-structured-terms";
import { measureAnswersAt } from "../vote-bundle";

export interface FinalEnactedLawTerm {
  readonly value: number;
  readonly unit: LawAmountUnit;
  readonly measureId: EntityId;
  readonly provisionId: EntityId | null;
  readonly sourceRecordIds: readonly EntityId[];
  readonly scope?: LawTermScope;
  readonly rentalPriceRule?: RentalPriceRule;
}

export interface FinalEnactedLawCategories {
  readonly values: readonly string[];
  readonly measureId: EntityId;
  readonly provisionId: EntityId | null;
  readonly sourceRecordIds: readonly EntityId[];
}

export interface ModeledFinalEnactedLawCategories {
  readonly kind: "modeled";
  readonly values: readonly string[];
  /** Developer/Observer evidence; never a primary law record. */
  readonly evidence: {
    readonly targetJurisdictionId: EntityId;
    readonly questionKey: string;
    readonly termKey: string;
    readonly requestedAt: IsoDate;
    readonly operativeAt: IsoDate;
    readonly cutoff: HistoricalCutoff | null;
    readonly answer: LawInForce["answer"];
    readonly level: LawInForce["level"];
    readonly censusRegion: string;
    readonly governmentIdentityKind: "jurisdiction" | "local-government";
    readonly selectedRuleCount: number;
    readonly donorRuleCount: number;
    readonly donors: readonly {
      readonly placeKey: string;
      readonly lawMeasureId: EntityId;
      readonly sourceRecordIds: readonly EntityId[];
      readonly values: readonly string[];
      readonly population: number;
      readonly populationDistance: number;
      readonly rank: number;
    }[];
  };
}

export type FinalEnactedLawCategoriesResolution =
  | { readonly kind: "source"; readonly categories: FinalEnactedLawCategories }
  | ModeledFinalEnactedLawCategories
  | { readonly kind: "unsupported"; readonly reason: string };

export interface FinalEnactedLawSchedule {
  readonly term: LawScheduleTerm;
  readonly measureId: EntityId;
  readonly provisionId: EntityId | null;
  readonly sourceRecordIds: readonly EntityId[];
}

export interface ModeledFinalEnactedLawTerm {
  readonly kind: "modeled";
  readonly value: number;
  readonly unit: LawAmountUnit;
  /** Dev/Observer-only estimate evidence. This is never a primary law term. */
  readonly estimate: {
    readonly mean: number;
    readonly spread: number;
    readonly selectedDonorValue: number;
    readonly selectionKey: string;
    readonly worldSeed: string;
    readonly method: "same-level-similar-state-law-peer";
  };
  readonly evidence: {
    readonly targetJurisdictionId: EntityId;
    readonly questionKey: string;
    readonly termKey: string;
    readonly unit: LawAmountUnit;
    readonly requestedAt: IsoDate;
    readonly operativeAt: IsoDate;
    readonly cutoff: HistoricalCutoff | null;
    readonly scope: LawTermScope;
    readonly lawLevel: LawInForce["level"];
    readonly governmentForm: string;
    readonly targetPopulation: number;
    readonly targetRegion: string;
    readonly donorLawMeasureIds: readonly EntityId[];
    readonly donorSourceRecordIds: readonly EntityId[];
    readonly donors: readonly {
      readonly stateKey: string;
      readonly lawMeasureId: EntityId;
      readonly sourceRecordIds: readonly EntityId[];
      readonly scope: LawTermScope;
      readonly value: number;
      readonly population: number;
      readonly region: string;
      readonly governmentForm: string;
      readonly rank: number;
      readonly weight: number;
    }[];
  };
}

export type FinalEnactedLawTermResolution =
  | { readonly kind: "source"; readonly term: FinalEnactedLawTerm }
  | ModeledFinalEnactedLawTerm
  | { readonly kind: "unsupported"; readonly reason: string };

interface StructuredTermQuery {
  readonly questionKey: string;
  readonly termKey: string;
  readonly onDate?: IsoDate;
  readonly cutoff?: HistoricalCutoff;
}

function structuredQueryDate(
  world: World,
  law: LawInForce,
  input: StructuredTermQuery,
): IsoDate | null {
  const onDate = input.onDate ?? input.cutoff?.asOfDate ?? world.currentDate;
  return onDate <= world.currentDate &&
    law.operativeAt <= onDate &&
    (!input.cutoff || onDate <= input.cutoff.asOfDate)
    ? onDate
    : null;
}

/** Same category reader for adopted and starting text, with explicit provenance. */
export function readFinalEnactedLawCategories(
  world: World,
  law: LawInForce,
  input: StructuredTermQuery,
): FinalEnactedLawCategories | null {
  const onDate = structuredQueryDate(world, law, input);
  if (!onDate) return null;
  if (law.origin === "in-force-at-start") {
    const categories = startingLawCategories(law, input.questionKey, onDate);
    try {
      assertLawCategories(world, categories);
    } catch {
      return null;
    }
    const matches = categories.filter(
      (category) =>
        category.questionKey === input.questionKey &&
        category.key === input.termKey,
    );
    return matches.length === 1
      ? {
          values: [...matches[0]!.values],
          measureId: law.measureId,
          provisionId: null,
          sourceRecordIds: [law.measureId],
        }
      : null;
  }
  const enactment = finalTermEnactment(
    world,
    law,
    input.questionKey,
    onDate,
    input.cutoff,
  );
  if (!enactment) return null;
  const matches = finalTermProvisions(
    world,
    law.measureId,
    enactment.sequence,
    onDate,
    input.cutoff,
  ).flatMap((provision) =>
    provision.applicationScope.segmentKey === null
      ? (provision.lawCategories ?? [])
          .filter(
            (category) =>
              category.questionKey === input.questionKey &&
              category.key === input.termKey,
          )
          .map((category) => ({ provision, category }))
      : [],
  );
  if (matches.length !== 1) return null;
  const { provision, category } = matches[0]!;
  try {
    assertLawCategories(world, [category]);
  } catch {
    return null;
  }
  return {
    values: [...category.values],
    measureId: law.measureId,
    provisionId: provision.id,
    sourceRecordIds: [law.measureId, enactment.id, provision.id],
  };
}

/**
 * Source-first categorical rule reader. Missing closed rules use the modal
 * exact value-set among same-region state peers with the
 * same answer, law level, and government-identity kind. Source rows are never
 * changed; modeled donor details are developer/Observer evidence only.
 */
export function readOrEstimateFinalEnactedLawCategories(
  world: World,
  law: LawInForce,
  input: StructuredTermQuery & { readonly jurisdictionId: EntityId },
): FinalEnactedLawCategoriesResolution {
  const onDate = input.onDate ?? input.cutoff?.asOfDate ?? world.currentDate;
  const onDateValid = structuredQueryDate(world, law, input);
  if (!onDateValid)
    return {
      kind: "unsupported",
      reason: "The law is not valid at the requested date and cutoff.",
    };

  const proposition = Object.values(world.policyCatalog.propositions).find(
    (row) => row.stableKey === input.questionKey,
  );
  if (!proposition)
    return {
      kind: "unsupported",
      reason: "The policy question is absent from the policy catalog.",
    };
  const parameter = proposition.parameters.find(
    (row) => row.key === input.termKey,
  );
  const allowedValues = parameter?.allowedValues;
  if (
    !allowedValues?.length ||
    new Set(allowedValues).size !== allowedValues.length
  )
    return {
      kind: "unsupported",
      reason: "This category key has no closed, unique catalog vocabulary.",
    };

  const targetKey = startingLawPlaceKey(input.jurisdictionId);
  if (!targetKey?.match(/^US-[A-Z]{2}$/))
    return {
      kind: "unsupported",
      reason: "Categorical mode is currently bounded to U.S. state laws.",
    };
  const governingTarget = lawInForce(
    world,
    input.jurisdictionId,
    proposition.id,
    onDate,
    "all",
    input.cutoff,
  );
  if (
    !governingTarget ||
    governingTarget.answer !== law.answer ||
    governingTarget.measureId !== law.measureId ||
    governingTarget.level !== law.level ||
    governingTarget.operativeAt !== law.operativeAt
  )
    return {
      kind: "unsupported",
      reason:
        "The supplied law is not the target law in force at this date and cutoff.",
    };

  const source = readFinalEnactedLawCategories(world, law, input);
  if (source) return { kind: "source", categories: source };
  if (law.origin !== "in-force-at-start")
    return {
      kind: "unsupported",
      reason: "Modeled categorical fallback currently requires a starting law.",
    };
  const explicit = startingLawCategories(law, input.questionKey, onDate).filter(
    (category) => category.key === input.termKey,
  );
  if (explicit.length > 0)
    return {
      kind: "unsupported",
      reason: "An explicit target category is malformed or conflicting.",
    };
  const targetSchedules = startingLawSchedules(law, input.questionKey, onDate);
  const targetAmounts = startingLawTerms(law, input.questionKey, onDate);
  if (
    targetSchedules.some((row) => row.key === input.termKey) ||
    targetAmounts.some((row) => row.key === input.termKey)
  )
    return {
      kind: "unsupported",
      reason:
        "A target schedule or numeric amount cannot be replaced by a category mode.",
    };
  const targetGovernment = (world.publicBudgets?.governments ?? []).find(
    (row) =>
      row.key === targetKey &&
      row.level === "state" &&
      row.jurisdictionId === input.jurisdictionId &&
      row.lawJurisdictionId === input.jurisdictionId &&
      row.population > 0,
  );
  if (!targetGovernment)
    return {
      kind: "unsupported",
      reason:
        "A comparable state-government identity and population are unavailable.",
    };
  const targetIdentity = publicGovernmentIdentityForRecord(targetGovernment);

  const region = censusRegionOf(targetKey.slice(3));
  const populationDistance = (population: number) =>
    Math.abs(Math.log(population / targetGovernment.population));
  const candidates = (world.publicBudgets?.governments ?? []).flatMap(
    (government) => {
      const peerKey = startingLawPlaceKey(government.lawJurisdictionId);
      if (
        government.key === targetGovernment.key ||
        government.level !== "state" ||
        government.population <= 0 ||
        !peerKey?.match(/^US-[A-Z]{2}$/) ||
        government.key !== peerKey ||
        government.jurisdictionId !== government.lawJurisdictionId ||
        publicGovernmentIdentityForRecord(government).kind !==
          targetIdentity.kind ||
        censusRegionOf(peerKey.slice(3)) !== region
      )
        return [];
      const peerJurisdiction = stateJurisdictionForKey(peerKey);
      if (!peerJurisdiction) return [];
      const peerLaw = lawInForce(
        world,
        peerJurisdiction.id,
        proposition.id,
        onDate,
        "all",
        input.cutoff,
      );
      if (
        !peerLaw ||
        peerLaw.answer !== law.answer ||
        peerLaw.level !== law.level ||
        peerLaw.operativeAt > onDate
      )
        return [];
      const category = readFinalEnactedLawCategories(world, peerLaw, input);
      if (!category || category.values.length === 0) return [];
      return [
        {
          placeKey: peerKey,
          category,
          population: government.population,
          populationDistance: populationDistance(government.population),
        },
      ];
    },
  );
  const ranked = reciprocalRankedReferences(
    candidates,
    (left, right) => left.populationDistance - right.populationDistance,
    (row) => row.placeKey,
  );
  const selectedPeers = ranked;
  if (!selectedPeers.length)
    return {
      kind: "unsupported",
      reason:
        "No same-answer, same-level, same-region state has a sourced closed category rule.",
    };

  const signature = (values: readonly string[]) =>
    [...values].sort((left, right) => left.localeCompare(right)).join("\u0000");
  const counts = new Map<
    string,
    { values: readonly string[]; count: number }
  >();
  for (const peer of selectedPeers) {
    const key = signature(peer.category.values);
    const current = counts.get(key);
    counts.set(key, {
      values: peer.category.values,
      count: (current?.count ?? 0) + 1,
    });
  }
  const modal = [...counts.values()].sort(
    (left, right) => right.count - left.count,
  );
  if (!modal.length || modal[0]!.count === modal[1]?.count)
    return {
      kind: "unsupported",
      reason:
        "The nearest comparable sourced category rules have no unique mode.",
    };
  const modalValues = [...modal[0]!.values].sort((left, right) =>
    left.localeCompare(right),
  );
  if (modalValues.some((value) => !allowedValues.includes(value)))
    return {
      kind: "unsupported",
      reason: "A donor rule falls outside the catalog category vocabulary.",
    };

  return {
    kind: "modeled",
    values: [...modalValues],
    evidence: {
      targetJurisdictionId: input.jurisdictionId,
      questionKey: input.questionKey,
      termKey: input.termKey,
      requestedAt: onDate,
      operativeAt: law.operativeAt,
      cutoff: input.cutoff ? { ...input.cutoff } : null,
      answer: law.answer,
      level: law.level,
      censusRegion: region,
      governmentIdentityKind: targetIdentity.kind,
      selectedRuleCount: modal[0]!.count,
      donorRuleCount: selectedPeers.length,
      donors: selectedPeers.map((peer) => ({
        placeKey: peer.placeKey,
        lawMeasureId: peer.category.measureId,
        sourceRecordIds: peer.category.sourceRecordIds,
        values: [...peer.category.values],
        population: peer.population,
        populationDistance: peer.populationDistance,
        rank: peer.rank,
      })),
    },
  };
}

/** Returns the recorded table to the existing domain calculator; no scalar reduction. */
export function readFinalEnactedLawSchedule(
  world: World,
  law: LawInForce,
  input: StructuredTermQuery,
): FinalEnactedLawSchedule | null {
  const onDate = structuredQueryDate(world, law, input);
  if (!onDate) return null;
  if (law.origin === "in-force-at-start") {
    const terms = startingLawSchedules(law, input.questionKey, onDate);
    try {
      assertLawSchedules(world, terms);
    } catch {
      return null;
    }
    const matches = terms.filter(
      (term) =>
        term.questionKey === input.questionKey && term.key === input.termKey,
    );
    return matches.length === 1
      ? {
          term: structuredClone(matches[0]!),
          measureId: law.measureId,
          provisionId: null,
          sourceRecordIds: [law.measureId],
        }
      : null;
  }
  const enactment = finalTermEnactment(
    world,
    law,
    input.questionKey,
    onDate,
    input.cutoff,
  );
  if (!enactment) return null;
  const matches = finalTermProvisions(
    world,
    law.measureId,
    enactment.sequence,
    onDate,
    input.cutoff,
  ).flatMap((provision) =>
    provision.applicationScope.segmentKey === null
      ? (provision.lawSchedules ?? [])
          .filter(
            (term) =>
              term.questionKey === input.questionKey &&
              term.key === input.termKey,
          )
          .map((term) => ({ provision, term }))
      : [],
  );
  if (matches.length !== 1) return null;
  const { provision, term } = matches[0]!;
  try {
    assertLawSchedules(world, [term]);
  } catch {
    return null;
  }
  return {
    term: structuredClone(term),
    measureId: law.measureId,
    provisionId: provision.id,
    sourceRecordIds: [law.measureId, enactment.id, provision.id],
  };
}

export function finalTermEnactment(
  world: World,
  law: LawInForce,
  questionKey: string,
  onDate: IsoDate = world.currentDate,
  cutoff?: HistoricalCutoff,
) {
  if (law.origin !== "enacted" || law.operativeAt > onDate) return null;
  const enactment = (world.history.legislativeEnactments ?? []).find(
    (row) =>
      row.measureId === law.measureId &&
      row.outcome === "enacted" &&
      row.resolvedAt <= onDate &&
      (!cutoff ||
        (row.sequence < cutoff.historySequenceExclusive &&
          row.resolvedAt <= cutoff.asOfDate)),
  );
  return enactment &&
    measureAnswersAt(world, law.measureId, enactment.sequence).some(
      (answer) =>
        world.policyCatalog.propositions[answer.propositionId]?.stableKey ===
          questionKey && answer.answer === law.answer,
    )
    ? enactment
    : null;
}

export function finalTermProvisions(
  world: World,
  measureId: EntityId,
  throughSequence = Infinity,
  onDate: IsoDate = world.currentDate,
  cutoff?: HistoricalCutoff,
) {
  const versions = (world.history.legislativeProvisions ?? []).filter(
    (row) =>
      row.measureId === measureId &&
      row.sequence <= throughSequence &&
      row.recordedAt <= onDate &&
      (!cutoff ||
        (row.sequence < cutoff.historySequenceExclusive &&
          row.recordedAt <= cutoff.asOfDate)),
  );
  const replaced = new Set(
    versions.flatMap((row) =>
      row.supersedesProvisionId ? [row.supersedesProvisionId] : [],
    ),
  );
  return versions.filter((row) => !replaced.has(row.id));
}

/** Reads only the adopted text at enactment, never filing parameters or defaults. */
export function readFinalEnactedLawTerm(
  world: World,
  law: LawInForce,
  input: {
    readonly questionKey: string;
    readonly termKey: string;
    readonly unit: LawAmountUnit;
    readonly onDate?: IsoDate;
    readonly cutoff?: HistoricalCutoff;
    readonly workplaceKey?: string;
    readonly scope?: LawTermScope;
  },
): FinalEnactedLawTerm | null {
  const onDate = structuredQueryDate(world, law, input);
  if (!onDate) return null;
  if (law.origin === "in-force-at-start") {
    const matches = startingLawTerms(
      law,
      input.questionKey,
      onDate,
      input.workplaceKey,
    ).filter(
      (term) =>
        term.questionKey === input.questionKey && term.key === input.termKey,
    );
    if (matches.length !== 1) return null;
    const term = matches[0]!;
    if (term.unit !== input.unit || !Number.isFinite(term.value)) return null;
    return {
      value: term.value,
      unit: term.unit,
      measureId: law.measureId,
      provisionId: null,
      sourceRecordIds: [law.measureId],
      ...(term.scope ? { scope: structuredClone(term.scope) } : {}),
      ...(term.rentalPriceRule
        ? { rentalPriceRule: term.rentalPriceRule }
        : {}),
    };
  }
  const enactment = finalTermEnactment(
    world,
    law,
    input.questionKey,
    onDate,
    input.cutoff,
  );
  if (!enactment) return null;
  const matches = finalTermProvisions(
    world,
    law.measureId,
    enactment.sequence,
    onDate,
    input.cutoff,
  ).flatMap((provision) =>
    provision.applicationScope.segmentKey === null
      ? (provision.lawTerms ?? [])
          .filter(
            (term) =>
              term.questionKey === input.questionKey &&
              term.key === input.termKey,
          )
          .map((term) => ({ provision, term }))
      : [],
  );
  // Conflicting sections are unsupported, rather than selecting whichever appeared first.
  if (matches.length !== 1) return null;
  const { provision, term } = matches[0]!;
  if (term.unit !== input.unit) return null;
  return {
    value: term.value,
    unit: term.unit,
    measureId: law.measureId,
    provisionId: provision.id,
    sourceRecordIds: [law.measureId, enactment.id, provision.id],
    ...(term.scope ? { scope: structuredClone(term.scope) } : {}),
    ...(term.rentalPriceRule ? { rentalPriceRule: term.rentalPriceRule } : {}),
  };
}

/**
 * Reads a sourced amount first. If the governing law has no amount,
 * this models one from comparable state laws already in this world. Structured,
 * scoped, conflicting, wrong-unit, or authority-unknown cases stay explicit.
 */
export function readOrEstimateFinalEnactedLawTerm(
  world: World,
  law: LawInForce,
  input: {
    readonly questionKey: string;
    readonly termKey: string;
    readonly unit: LawAmountUnit;
    readonly jurisdictionId: EntityId;
    readonly onDate?: IsoDate;
    readonly cutoff?: HistoricalCutoff;
    readonly workplaceKey?: string;
    readonly scope?: LawTermScope;
  },
): FinalEnactedLawTermResolution {
  const source = readFinalEnactedLawTerm(world, law, input);
  if (source) {
    if (
      input.scope !== undefined &&
      (!source.scope || !lawTermScopesMatch(source.scope, input.scope))
    )
      return {
        kind: "unsupported",
        reason: "The sourced amount does not match the requested legal scope.",
      };
    return Number.isFinite(source.value)
      ? { kind: "source", term: source }
      : { kind: "unsupported", reason: "The sourced amount is not finite." };
  }

  const onDate = input.onDate ?? input.cutoff?.asOfDate ?? world.currentDate;
  const current = structuredQueryDate(world, law, input);
  if (!current)
    return {
      kind: "unsupported",
      reason:
        "No matching law is established as operative at the requested date and cutoff.",
    };
  if (input.workplaceKey)
    return {
      kind: "unsupported",
      reason: "Workplace-scoped terms require an exact scope contract.",
    };

  const explicit = explicitTermShape(world, law, input, onDate);
  if (explicit !== "absent")
    return {
      kind: "unsupported",
      reason:
        explicit === "regional"
          ? "The governing rule is regional or workplace-scoped."
          : explicit === "structured"
            ? "A schedule or category exists; it cannot be replaced by a scalar estimate."
            : explicit === "present"
              ? "An explicit term exists but is conflicting, malformed, or has a different unit."
              : "The law term cannot be validated at the requested historical cutoff.",
    };

  if (!input.scope)
    return {
      kind: "unsupported",
      reason:
        "A modeled amount requires an explicit, validated target scope; this law has none.",
    };

  const targetPlaceKey = startingLawPlaceKey(input.jurisdictionId);
  if (!targetPlaceKey?.startsWith("US-"))
    return {
      kind: "unsupported",
      reason: "The numeric fallback is bounded to U.S. state governments.",
    };
  const targetGovernment = (world.publicBudgets?.governments ?? []).find(
    (government) =>
      government.lawJurisdictionId === input.jurisdictionId &&
      government.level === "state" &&
      government.key === targetPlaceKey,
  );
  if (!targetGovernment || targetGovernment.population <= 0)
    return {
      kind: "unsupported",
      reason:
        "The current game has no state-government size record for the target.",
    };

  const proposition = Object.values(
    world.policyCatalog?.propositions ?? {},
  ).find((row) => row.stableKey === input.questionKey);
  if (!proposition)
    return {
      kind: "unsupported",
      reason: "The policy catalog has no matching proposition.",
    };
  const governingTarget = lawInForce(
    world,
    input.jurisdictionId,
    proposition.id,
    onDate,
    "all",
    input.cutoff,
  );
  if (
    !governingTarget ||
    governingTarget.answer !== law.answer ||
    governingTarget.measureId !== law.measureId ||
    governingTarget.level !== law.level
  )
    return {
      kind: "unsupported",
      reason:
        "The supplied law is not the target government's law in force at this date and cutoff.",
    };

  const targetForm = governmentForm(targetGovernment);
  const targetRegion = censusRegionOf(targetPlaceKey.slice(3));
  const governments = world.publicBudgets?.governments ?? [];
  const donors: LawTermDonor[] = [];
  for (const government of governments) {
    if (
      government.key === targetGovernment.key ||
      government.level !== targetGovernment.level ||
      government.population <= 0 ||
      governmentForm(government) !== targetForm ||
      !government.stateKey.startsWith("US-")
    )
      continue;
    const donorPlaceKey = startingLawPlaceKey(government.lawJurisdictionId);
    const donorJurisdiction = donorPlaceKey === government.stateKey;
    if (!donorJurisdiction) continue;
    const donorLaw = lawInForce(
      world,
      government.lawJurisdictionId,
      proposition.id,
      onDate,
      "all",
      input.cutoff,
    );
    if (
      !donorLaw ||
      donorLaw.answer !== law.answer ||
      donorLaw.level !== law.level
    )
      continue;
    const donorTerm = readFinalEnactedLawTerm(world, donorLaw, {
      questionKey: input.questionKey,
      termKey: input.termKey,
      unit: input.unit,
      onDate,
      cutoff: input.cutoff,
    });
    if (
      !donorTerm ||
      !Number.isFinite(donorTerm.value) ||
      !donorTerm.scope ||
      !lawTermScopesMatch(donorTerm.scope, input.scope)
    )
      continue;
    donors.push({
      stateKey: government.stateKey,
      lawMeasureId: donorTerm.measureId,
      sourceRecordIds: donorTerm.sourceRecordIds,
      value: donorTerm.value,
      scope: donorTerm.scope,
      population: government.population,
      region: censusRegionOf(government.stateKey.slice(3)),
      governmentForm: targetForm,
      sameRegion: censusRegionOf(government.stateKey.slice(3)) === targetRegion,
      populationDistance: Math.abs(
        Math.log(government.population / targetGovernment.population),
      ),
    });
  }
  if (!donors.length)
    return {
      kind: "unsupported",
      reason:
        "No same-level, same-form state law has a sourced numeric term in this scope and unit.",
    };

  const references = reciprocalRankedReferences(
    donors,
    (left, right) =>
      Number(right.sameRegion) - Number(left.sameRegion) ||
      left.populationDistance - right.populationDistance,
    (donor) => donor.stateKey,
  );
  const mean = weightedReferenceMean(references, (donor) => donor.value);
  const spread = spreadOf(references.map((donor) => donor.value));
  const selectionKey =
    `starting-law-term/v1:${targetPlaceKey}:${input.questionKey}:` +
    `${input.termKey}:${input.unit}:${onDate}:${JSON.stringify(input.scope)}`;
  const totalWeight = references.reduce(
    (total, donor) => total + donor.weight,
    0,
  );
  let selection =
    new SeededRng(world.seed).fork(selectionKey).next() * totalWeight;
  let selected = references.at(-1)!;
  for (const donor of references) {
    selection -= donor.weight;
    if (selection < 0) {
      selected = donor;
      break;
    }
  }
  return {
    kind: "modeled",
    value: selected.value,
    unit: input.unit,
    estimate: {
      mean,
      spread: spread.standardDeviation,
      selectedDonorValue: selected.value,
      selectionKey,
      worldSeed: world.seed,
      method: "same-level-similar-state-law-peer",
    },
    evidence: {
      targetJurisdictionId: input.jurisdictionId,
      questionKey: input.questionKey,
      termKey: input.termKey,
      unit: input.unit,
      requestedAt: onDate,
      operativeAt: law.operativeAt,
      cutoff: input.cutoff ? { ...input.cutoff } : null,
      scope: structuredClone(input.scope),
      lawLevel: law.level,
      governmentForm: targetForm,
      targetPopulation: targetGovernment.population,
      targetRegion,
      donorLawMeasureIds: references.map((donor) => donor.lawMeasureId),
      donorSourceRecordIds: references.flatMap(
        (donor) => donor.sourceRecordIds,
      ),
      donors: references.map((donor) => ({
        stateKey: donor.stateKey,
        lawMeasureId: donor.lawMeasureId,
        sourceRecordIds: donor.sourceRecordIds,
        value: donor.value,
        scope: structuredClone(donor.scope),
        population: donor.population,
        region: donor.region,
        governmentForm: donor.governmentForm,
        rank: donor.rank,
        weight: donor.weight,
      })),
    },
  };
}

type ExplicitTermShape =
  "absent" | "present" | "structured" | "regional" | "invalid";

interface LawTermDonor {
  readonly stateKey: string;
  readonly lawMeasureId: EntityId;
  readonly sourceRecordIds: readonly EntityId[];
  readonly value: number;
  readonly scope: LawTermScope;
  readonly population: number;
  readonly region: string;
  readonly governmentForm: string;
  readonly sameRegion: boolean;
  readonly populationDistance: number;
}

function governmentForm(government: {
  readonly publicGovernmentIdentity?: { readonly kind: string };
}): string {
  return government.publicGovernmentIdentity?.kind ?? "jurisdiction";
}

function explicitTermShape(
  world: World,
  law: LawInForce,
  input: {
    readonly questionKey: string;
    readonly termKey: string;
    readonly unit: LawAmountUnit;
    readonly onDate?: IsoDate;
    readonly cutoff?: HistoricalCutoff;
  },
  onDate: IsoDate,
): ExplicitTermShape {
  if (law.origin === "in-force-at-start") {
    const scope = startingLawTermScope(law, input.questionKey, onDate);
    if (scope === "regional") return "regional";
    if (!scope) return "invalid";
    const hasNumeric = startingLawTerms(law, input.questionKey, onDate).some(
      (term) => term.key === input.termKey,
    );
    if (hasNumeric) return "present";
    const hasStructured = [
      ...startingLawSchedules(law, input.questionKey, onDate),
      ...startingLawCategories(law, input.questionKey, onDate),
    ].some((term) => term.key === input.termKey);
    return hasStructured ? "structured" : "absent";
  }

  const enactment = finalTermEnactment(
    world,
    law,
    input.questionKey,
    onDate,
    input.cutoff,
  );
  if (!enactment) return "invalid";
  const matches = finalTermProvisions(
    world,
    law.measureId,
    enactment.sequence,
    onDate,
    input.cutoff,
  ).filter((provision) =>
    [
      ...(provision.lawTerms ?? []),
      ...(provision.lawSchedules ?? []),
      ...(provision.lawCategories ?? []),
    ].some(
      (term) =>
        term.questionKey === input.questionKey && term.key === input.termKey,
    ),
  );
  if (
    matches.some((provision) => provision.applicationScope.segmentKey !== null)
  )
    return "regional";
  if (
    matches.some((provision) =>
      (provision.lawTerms ?? []).some(
        (term) =>
          term.questionKey === input.questionKey && term.key === input.termKey,
      ),
    )
  )
    return "present";
  return matches.length ? "structured" : "absent";
}
