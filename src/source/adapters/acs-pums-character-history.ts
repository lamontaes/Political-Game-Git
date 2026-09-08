/**
 * One-way ACS PUMS household-donor bridge into canonical character history.
 *
 * The source layer selects one intact, weighted household. This adapter then
 * initializes fictional people through existing history writers. PUMS never
 * supplies names, birth dates, gender identity, pronouns, an exact place, a
 * school, an employer, personality, ideology, beliefs, or player-facing prose.
 */

import { sha256Hex, toCanonicalJson } from "../core/index";
import type {
  AcsPumsDonorCorpus,
  PumsDonorFact,
  PumsDonorPerson,
  PumsHouseholdDonor,
  PumsHouseholdRelationship,
} from "../domains/acs-pums/index";
import {
  ageOnDate,
  applyCharacterHistoryPlan,
  characterHistoryContextPersonId,
  createStableId,
  makeIsoDate,
  normalizeSeed,
  SeededRng,
} from "../../simulation/index";
import type {
  CharacterHistoryApplication,
  CharacterHistoryContextPersonInput,
  CharacterHistoryTransition,
  DwellingClassification,
  EntityId,
  HousingTenureKind,
  IsoDate,
  LifeRecordProvenance,
  World,
} from "../../simulation/index";

const BRIDGE_VERSION = "acs-pums-character-history-v1";
const UINT64_RANGE = 1n << 64n;
declare const ACS_PUMS_HOUSEHOLD_SELECTION: unique symbol;

export interface AcsPumsDonorConstraints {
  readonly pumaCodes?: readonly string[];
  readonly householdSizeMin?: number;
  readonly householdSizeMax?: number;
  readonly subjectAgeMin?: number;
  readonly subjectAgeMax?: number;
  readonly subjectRelationship?: PumsHouseholdRelationship;
}

export interface AcsPumsDonorSelectionContext {
  readonly worldSeed: string;
  readonly surveyYear: 2024;
  readonly stateUsps: string;
  readonly stateFips: string;
  readonly constraints: AcsPumsDonorConstraints;
}

export interface AcsPumsHouseholdSelection {
  readonly [ACS_PUMS_HOUSEHOLD_SELECTION]: true;
  readonly selectionKey: string;
  readonly corpusId: string;
  readonly compilerVersion: string;
  readonly parserVersion: string;
  readonly corpusCanonicalSha256: string;
  readonly inputClass: "production" | "fixture";
  readonly household: PumsHouseholdDonor;
  readonly subject: PumsDonorPerson;
  readonly householdWeight: number;
  readonly subjectWeight: number | null;
}

export type AcsPumsPersonBinding =
  | { readonly personNumber: number; readonly personId: EntityId }
  | {
      readonly personNumber: number;
      readonly contextPerson: CharacterHistoryContextPersonInput;
    };

export interface AcsPumsResidencePlacement {
  /** Supplied by the world generator. PUMS PUMA is not an exact jurisdiction. */
  readonly jurisdictionId: EntityId;
  readonly label: string;
  readonly provenance: LifeRecordProvenance;
}

export interface AcsPumsCharacterHistoryBridgeInput {
  readonly world: World;
  readonly selection: AcsPumsHouseholdSelection;
  readonly subjectPersonId: EntityId;
  readonly effectiveAt: IsoDate;
  readonly householdStableKey: string;
  readonly householdLabel: string;
  readonly bindings: readonly AcsPumsPersonBinding[];
  readonly residence?: AcsPumsResidencePlacement;
}

export type AcsPumsBridgeDisposition =
  "mapped" | "retained-unmapped" | "identity-evidence-only" | "unavailable";

export interface AcsPumsBridgeAuditEntry {
  readonly personNumber: number | null;
  readonly variable: string;
  readonly disposition: AcsPumsBridgeDisposition;
  readonly reason: string;
  readonly allocation: string | null;
}

export interface AcsPumsCharacterHistoryBridgeResult extends CharacterHistoryApplication {
  readonly selectionKey: string;
  readonly sourceReference: string;
  readonly audit: readonly AcsPumsBridgeAuditEntry[];
}

function knownNumber(fact: PumsDonorFact<number>): number | null {
  return fact.state === "KNOWN" && Number.isSafeInteger(fact.value)
    ? fact.value
    : null;
}

function knownWeight(value: PumsHouseholdDonor["householdWeight"]): number {
  if (
    value.state !== "KNOWN" ||
    typeof value.value !== "number" ||
    !Number.isSafeInteger(value.value) ||
    value.value <= 0
  ) {
    throw new Error(
      "A selectable PUMS household requires a positive integer WGTP.",
    );
  }
  return value.value;
}

function optionalPersonWeight(person: PumsDonorPerson): number | null {
  const weight = person.personWeight;
  return weight.state === "KNOWN" &&
    typeof weight.value === "number" &&
    Number.isSafeInteger(weight.value) &&
    weight.value > 0
    ? weight.value
    : null;
}

function normalizedConstraints(
  constraints: AcsPumsDonorConstraints,
): AcsPumsDonorConstraints {
  for (const [label, value] of [
    ["householdSizeMin", constraints.householdSizeMin],
    ["householdSizeMax", constraints.householdSizeMax],
    ["subjectAgeMin", constraints.subjectAgeMin],
    ["subjectAgeMax", constraints.subjectAgeMax],
  ] as const) {
    if (value !== undefined && (!Number.isSafeInteger(value) || value < 0)) {
      throw new Error(`${label} must be a nonnegative integer when supplied.`);
    }
  }
  if (
    constraints.householdSizeMin !== undefined &&
    constraints.householdSizeMax !== undefined &&
    constraints.householdSizeMin > constraints.householdSizeMax
  ) {
    throw new Error("householdSizeMin cannot exceed householdSizeMax.");
  }
  if (
    constraints.subjectAgeMin !== undefined &&
    constraints.subjectAgeMax !== undefined &&
    constraints.subjectAgeMin > constraints.subjectAgeMax
  ) {
    throw new Error("subjectAgeMin cannot exceed subjectAgeMax.");
  }
  const pumaCodes = constraints.pumaCodes
    ? [...new Set(constraints.pumaCodes.map((value) => value.trim()))].sort()
    : undefined;
  if (pumaCodes?.some((value) => !/^\d{5}$/.test(value))) {
    throw new Error("PUMA constraints must be five-digit publisher codes.");
  }
  return { ...constraints, pumaCodes };
}

function randomUint64(rng: SeededRng): bigint {
  return (BigInt(rng.nextUint32()) << 32n) | BigInt(rng.nextUint32());
}

function exactWeightedIndex(
  rng: SeededRng,
  weights: readonly number[],
): number {
  const total = weights.reduce((sum, weight) => sum + BigInt(weight), 0n);
  if (total <= 0n || total > UINT64_RANGE) {
    throw new Error(
      "PUMS donor weight total must fit in an unsigned 64-bit draw.",
    );
  }
  const acceptanceLimit = UINT64_RANGE - (UINT64_RANGE % total);
  let draw = randomUint64(rng);
  while (draw >= acceptanceLimit) draw = randomUint64(rng);
  let target = draw % total;
  for (let index = 0; index < weights.length; index += 1) {
    const weight = BigInt(weights[index] as number);
    if (target < weight) return index;
    target -= weight;
  }
  throw new Error("Weighted donor draw failed to resolve an index.");
}

function eligibleSubject(
  person: PumsDonorPerson,
  constraints: AcsPumsDonorConstraints,
): boolean {
  const age = knownNumber(person.age);
  if (
    constraints.subjectAgeMin !== undefined &&
    (age === null || age < constraints.subjectAgeMin)
  ) {
    return false;
  }
  if (
    constraints.subjectAgeMax !== undefined &&
    (age === null || age > constraints.subjectAgeMax)
  ) {
    return false;
  }
  if (constraints.subjectRelationship !== undefined) {
    return (
      person.relationship.state === "KNOWN" &&
      person.relationship.value.canonical === constraints.subjectRelationship
    );
  }
  return true;
}

/** Select one whole household by exact integer WGTP, then a keyed eligible subject. */
export function selectAcsPumsHouseholdDonor(
  compiled: AcsPumsDonorCorpus,
  context: AcsPumsDonorSelectionContext,
): AcsPumsHouseholdSelection {
  const constraints = normalizedConstraints(context.constraints);
  const stateUsps = context.stateUsps.trim().toUpperCase();
  const stateFips = context.stateFips.trim();
  const candidates = compiled.records
    .filter(
      (household) =>
        household.shard.surveyYear === context.surveyYear &&
        household.shard.stateUsps === stateUsps &&
        household.shard.stateFips === stateFips &&
        household.unitType.state === "KNOWN" &&
        household.unitType.value.canonical === "housing-unit" &&
        (!constraints.pumaCodes ||
          constraints.pumaCodes.includes(household.puma)),
    )
    .map((household) => {
      const size = knownNumber(household.householdSize);
      const subjects = household.persons.filter((person) =>
        eligibleSubject(person, constraints),
      );
      const inSizeRange =
        size !== null &&
        (constraints.householdSizeMin === undefined ||
          size >= constraints.householdSizeMin) &&
        (constraints.householdSizeMax === undefined ||
          size <= constraints.householdSizeMax);
      return { household, subjects, inSizeRange };
    })
    .filter(
      (candidate) => candidate.inSizeRange && candidate.subjects.length > 0,
    )
    .sort((left, right) =>
      left.household.serialNumber.localeCompare(right.household.serialNumber),
    );
  if (candidates.length === 0) {
    throw new Error(
      `No coherent PUMS household donor matches ${context.surveyYear} ${stateUsps}/${stateFips} and the declared constraints.`,
    );
  }
  const selectionKey = toCanonicalJson(
    {
      bridgeVersion: BRIDGE_VERSION,
      corpusId: compiled.corpus.corpusId,
      compiler: compiled.corpus.compiler,
      parser: compiled.corpus.parser,
      corpusCanonicalSha256: compiled.corpus.canonicalSha256,
      worldSeed: normalizeSeed(context.worldSeed),
      surveyYear: context.surveyYear,
      stateUsps,
      stateFips,
      constraints,
    },
    0,
  ).trim();
  const rng = new SeededRng(selectionKey);
  const selected = candidates[
    exactWeightedIndex(
      rng.fork("household"),
      candidates.map((candidate) =>
        knownWeight(candidate.household.householdWeight),
      ),
    )
  ] as (typeof candidates)[number];
  const subject = rng
    .fork(`subject:${selected.household.serialNumber}`)
    .pick(selected.subjects);
  return {
    selectionKey,
    corpusId: compiled.corpus.corpusId,
    compilerVersion: compiled.corpus.compiler.version,
    parserVersion: compiled.corpus.parser.version,
    corpusCanonicalSha256: compiled.corpus.canonicalSha256,
    inputClass: compiled.corpus.inputClass,
    household: selected.household,
    subject,
    householdWeight: knownWeight(selected.household.householdWeight),
    subjectWeight: optionalPersonWeight(subject),
  } as AcsPumsHouseholdSelection;
}

function mappedRelationship(relationship: PumsHouseholdRelationship): {
  readonly kind: "partnership" | "kinship";
  readonly taxonomy: string;
} | null {
  switch (relationship) {
    case "spouse":
      return { kind: "partnership", taxonomy: "legal:spouse" };
    case "unmarried-partner":
      return { kind: "partnership", taxonomy: "romantic:partner" };
    case "biological-child":
      return { kind: "kinship", taxonomy: "lineal:biological-parent-child" };
    case "adopted-child":
      return { kind: "kinship", taxonomy: "lineal:adoptive-parent-child" };
    case "stepchild":
      return { kind: "kinship", taxonomy: "lineal:step-parent-child" };
    case "parent":
      return { kind: "kinship", taxonomy: "lineal:parent-child" };
    case "grandchild":
      return { kind: "kinship", taxonomy: "lineal:grandparent-grandchild" };
    case "sibling":
      return { kind: "kinship", taxonomy: "collateral:sibling" };
    case "parent-in-law":
    case "child-in-law":
      return { kind: "kinship", taxonomy: "extended:in-law" };
    case "other-relative":
      return { kind: "kinship", taxonomy: "extended:other-relative" };
    case "foster-child":
      return { kind: "kinship", taxonomy: "extended:foster" };
    default:
      return null;
  }
}

function dwellingClassification(
  household: PumsHouseholdDonor,
): DwellingClassification | null {
  if (household.buildingType.state !== "KNOWN") return null;
  switch (household.buildingType.value.canonical) {
    case "mobile-home-or-trailer":
      return "residential:mobile-home";
    case "single-family-detached":
    case "single-family-attached":
      return "residential:single-family";
    case "two-apartments":
    case "three-to-four-apartments":
    case "five-to-nine-apartments":
    case "ten-to-nineteen-apartments":
    case "twenty-to-forty-nine-apartments":
    case "fifty-or-more-apartments":
      return "residential:multi-unit";
    case "boat-rv-van-or-other":
      return "residential:other-mobile";
    default:
      return null;
  }
}

function tenureKind(household: PumsHouseholdDonor): HousingTenureKind | null {
  if (household.tenure.state !== "KNOWN") return null;
  switch (household.tenure.value.canonical) {
    case "owned-with-mortgage-or-loan":
      return "ownership:mortgaged";
    case "owned-free-and-clear":
      return "ownership:free-and-clear";
    case "rented":
      return "lease:rental";
    case "occupied-without-rent":
      return "hosted:no-rent";
    default:
      return null;
  }
}

function dispositionFor(
  personNumber: number | null,
  fact: PumsDonorFact<unknown>,
  mapped: boolean,
  reason: string,
): AcsPumsBridgeAuditEntry {
  return {
    personNumber,
    variable: fact.variable,
    disposition:
      fact.state === "KNOWN"
        ? mapped
          ? "mapped"
          : "retained-unmapped"
        : "unavailable",
    reason,
    allocation: fact.state === "KNOWN" ? fact.allocation : null,
  };
}

/**
 * Initialize a fictional household through CharacterHistoryPlan.
 *
 * The generated provenance names the donor corpus but does not call the
 * fictional people Census records. Identity and exact placement remain
 * caller-owned inputs, and every projected-but-unmappable fact stays visible
 * in the returned audit.
 */
export function applyAcsPumsCharacterHistoryBridge(
  input: AcsPumsCharacterHistoryBridgeInput,
): AcsPumsCharacterHistoryBridgeResult {
  const { world, selection } = input;
  const effectiveAt = makeIsoDate(input.effectiveAt);
  if (effectiveAt > world.currentDate) {
    throw new Error("PUMS donor initialization cannot be future-dated.");
  }
  if (!input.householdStableKey.trim() || !input.householdLabel.trim()) {
    throw new Error(
      "PUMS donor initialization requires household identity inputs.",
    );
  }
  if (input.residence && !world.jurisdictions[input.residence.jurisdictionId]) {
    throw new Error(
      "PUMS donor residence placement requires an existing jurisdiction.",
    );
  }

  const household = selection.household;
  if (
    !household.persons.some(
      (person) =>
        person.personNumber === selection.subject.personNumber &&
        person.serialNumber === selection.subject.serialNumber,
    )
  ) {
    throw new Error(
      "The selected donor subject is not a member of the selected household.",
    );
  }
  if (household.persons.length !== input.bindings.length) {
    throw new Error(
      "Every person in the selected PUMS household must be bound exactly once.",
    );
  }
  const bindingByNumber = new Map<number, AcsPumsPersonBinding>();
  const boundPersonIds = new Set<EntityId>();
  for (const binding of input.bindings) {
    if (bindingByNumber.has(binding.personNumber)) {
      throw new Error(`Duplicate PUMS person binding ${binding.personNumber}.`);
    }
    bindingByNumber.set(binding.personNumber, binding);
  }

  const transitions: CharacterHistoryTransition[] = [];
  const personIdByNumber = new Map<number, EntityId>();
  for (const donorPerson of household.persons) {
    const binding = bindingByNumber.get(donorPerson.personNumber);
    if (!binding) {
      throw new Error(
        `Missing PUMS person binding ${donorPerson.personNumber}.`,
      );
    }
    let personId: EntityId;
    let birthDate: IsoDate;
    if ("personId" in binding) {
      const person = world.people[binding.personId];
      if (!person)
        throw new Error(`Missing bound world person ${binding.personId}.`);
      personId = person.id;
      birthDate = person.birthDate;
    } else {
      personId = characterHistoryContextPersonId(
        world,
        binding.contextPerson.stableKey,
      );
      birthDate = makeIsoDate(binding.contextPerson.birthDate);
      transitions.push({
        kind: "context-person",
        input: binding.contextPerson,
      });
    }
    if (boundPersonIds.has(personId)) {
      throw new Error(
        `World person ${personId} is bound to more than one donor person.`,
      );
    }
    boundPersonIds.add(personId);
    personIdByNumber.set(donorPerson.personNumber, personId);
    const sourceAge = knownNumber(donorPerson.age);
    if (sourceAge !== null && ageOnDate(birthDate, effectiveAt) !== sourceAge) {
      throw new Error(
        `Bound person ${personId} age does not match donor AGEP ${sourceAge} at ${effectiveAt}.`,
      );
    }
  }
  if (
    personIdByNumber.get(selection.subject.personNumber) !==
    input.subjectPersonId
  ) {
    throw new Error(
      "The selected donor subject must bind to the declared world subject.",
    );
  }

  const donorDigest = sha256Hex(
    Buffer.from(
      toCanonicalJson(
        {
          corpusCanonicalSha256: selection.corpusCanonicalSha256,
          serialNumber: household.serialNumber,
          puma: household.puma,
        },
        0,
      ),
    ),
  );
  const generatorKey = [
    BRIDGE_VERSION,
    selection.inputClass,
    selection.corpusCanonicalSha256,
    donorDigest,
  ].join(":");
  const generatedProvenance: LifeRecordProvenance = {
    kind: "generated",
    generatorKey,
  };
  const householdId = createStableId(
    "household",
    `${world.id}:${input.householdStableKey}`,
  );
  transitions.push({
    kind: "household",
    input: {
      stableKey: input.householdStableKey,
      formedAt: effectiveAt,
      label: input.householdLabel,
      provenance: generatedProvenance,
    },
  });
  if (input.residence) {
    transitions.push({
      kind: "household-location",
      input: {
        stableKey: `${input.householdStableKey}:location:initial`,
        householdStableKey: input.householdStableKey,
        effectiveAt,
        jurisdictionId: input.residence.jurisdictionId,
        label: input.residence.label,
        kind: "residence:primary",
        provenance: input.residence.provenance,
      },
    });
  }
  for (const donorPerson of household.persons) {
    transitions.push({
      kind: "household-membership",
      input: {
        stableKey: `${input.householdStableKey}:member:${donorPerson.personNumber}`,
        personId: personIdByNumber.get(donorPerson.personNumber) as EntityId,
        householdId,
        startedAt: effectiveAt,
        residenceRole: "primary",
        kind: "resident:household",
        provenance: generatedProvenance,
      },
    });
  }

  const references = household.persons.filter(
    (person) =>
      person.relationship.state === "KNOWN" &&
      person.relationship.value.canonical === "reference-person",
  );
  if (references.length !== 1) {
    throw new Error(
      "A coherent PUMS housing donor requires exactly one reference person.",
    );
  }
  const reference = references[0] as PumsDonorPerson;
  const referencePersonId = personIdByNumber.get(
    reference.personNumber,
  ) as EntityId;
  const audit: AcsPumsBridgeAuditEntry[] = [
    dispositionFor(
      null,
      household.unitType,
      true,
      "Validated as a housing-unit donor.",
    ),
    dispositionFor(
      null,
      household.householdSize,
      true,
      "Validated against intact SERIALNO linkage.",
    ),
  ];
  for (const person of household.persons) {
    const personId = personIdByNumber.get(person.personNumber) as EntityId;
    const relationship =
      person.relationship.state === "KNOWN"
        ? person.relationship.value.canonical
        : null;
    const mapping = relationship ? mappedRelationship(relationship) : null;
    if (mapping) {
      transitions.push(
        mapping.kind === "partnership"
          ? {
              kind: "partnership",
              input: {
                stableKey: `${input.householdStableKey}:relationship:${person.personNumber}`,
                personIds: [referencePersonId, personId],
                startedAt: effectiveAt,
                kind: mapping.taxonomy as
                  `legal:${string}` | `romantic:${string}`,
                provenance: generatedProvenance,
              },
            }
          : {
              kind: "kinship",
              input: {
                stableKey: `${input.householdStableKey}:relationship:${person.personNumber}`,
                personIds: [referencePersonId, personId],
                establishedAt: effectiveAt,
                kind: mapping.taxonomy as
                  | `lineal:${string}`
                  | `collateral:${string}`
                  | `extended:${string}`,
                provenance: generatedProvenance,
              },
            },
      );
    }
    audit.push(
      dispositionFor(
        person.personNumber,
        person.age,
        true,
        "Checked against caller-supplied fictional birth date; no date was inferred.",
      ),
      dispositionFor(
        person.personNumber,
        person.relationship,
        relationship === "reference-person" || mapping !== null,
        mapping || relationship === "reference-person"
          ? "Mapped through canonical household/relationship primitives."
          : "Retained because this relationship establishes co-residence but not a canonical kinship or partnership.",
      ),
      {
        personNumber: person.personNumber,
        variable: person.sourceSexEvidence.variable,
        disposition:
          person.sourceSexEvidence.state === "KNOWN"
            ? "identity-evidence-only"
            : "unavailable",
        reason:
          "Source sex evidence never overwrites or infers canonical identity.",
        allocation:
          person.sourceSexEvidence.state === "KNOWN"
            ? person.sourceSexEvidence.allocation
            : null,
      },
      dispositionFor(
        person.personNumber,
        person.schoolEnrollment,
        false,
        "No school identity is supplied, so no education enrollment is invented.",
      ),
      dispositionFor(
        person.personNumber,
        person.gradeAttending,
        false,
        "Retained without inventing a named education program.",
      ),
      dispositionFor(
        person.personNumber,
        person.educationalAttainment,
        false,
        "Existing history has no source-safe attainment record independent of an institution.",
      ),
      dispositionFor(
        person.personNumber,
        person.employmentStatus,
        false,
        "No employer or work relationship terms are supplied, so no work record is invented.",
      ),
      dispositionFor(
        person.personNumber,
        person.classOfWorker,
        false,
        "Retained without inventing work authority, dependency, or risk.",
      ),
      dispositionFor(
        person.personNumber,
        person.occupation,
        false,
        "Retained without inventing a job title or employer.",
      ),
      dispositionFor(
        person.personNumber,
        person.usualHoursWorked,
        false,
        "Retained without inventing a canonical work relationship.",
      ),
    );
  }

  const classification = input.residence
    ? dwellingClassification(household)
    : null;
  const tenure = input.residence ? tenureKind(household) : null;
  if (input.residence && classification) {
    const dwellingStableKey = `${input.householdStableKey}:dwelling`;
    transitions.push(
      {
        kind: "dwelling",
        input: {
          stableKey: dwellingStableKey,
          establishedAt: effectiveAt,
          jurisdictionId: input.residence.jurisdictionId,
          locationLabel: input.residence.label,
          classification,
          provenance: generatedProvenance,
        },
      },
      {
        kind: "dwelling-occupancy",
        input: {
          stableKey: `${dwellingStableKey}:occupancy`,
          dwellingStableKey,
          occupant: { kind: "household", householdId },
          startedAt: effectiveAt,
          residenceRole: "primary",
          kind: "residence:household",
          provenance: generatedProvenance,
        },
      },
    );
    if (tenure) {
      transitions.push({
        kind: "housing-tenure",
        input: {
          stableKey: `${dwellingStableKey}:tenure`,
          dwellingStableKey,
          holder: { kind: "household", householdId },
          startedAt: effectiveAt,
          kind: tenure,
          context: null,
          provenance: generatedProvenance,
        },
      });
    }
  }
  audit.push(
    dispositionFor(
      null,
      household.buildingType,
      classification !== null,
      classification
        ? "Mapped to an open dwelling classification; exact placement came from the caller."
        : "Retained because no supported building classification and separate placement were both available.",
    ),
    dispositionFor(
      null,
      household.tenure,
      tenure !== null && classification !== null,
      tenure && classification
        ? "Mapped to canonical household tenure."
        : "Retained because tenure requires a mapped dwelling and separate placement.",
    ),
  );

  const application = applyCharacterHistoryPlan(world, {
    stableKey: `${input.householdStableKey}:pums-donor-initialization`,
    mode: "quick-generated",
    personId: input.subjectPersonId,
    transitions,
  });
  return {
    ...application,
    selectionKey: selection.selectionKey,
    sourceReference: [
      `corpus=${selection.corpusId}`,
      `compilerVersion=${selection.compilerVersion}`,
      `parserVersion=${selection.parserVersion}`,
      `canonicalSha256=${selection.corpusCanonicalSha256}`,
      `inputClass=${selection.inputClass}`,
      `surveyYear=${household.shard.surveyYear}`,
      `state=${household.shard.stateUsps}/${household.shard.stateFips}`,
      `puma=${household.puma}`,
      `serialNumber=${household.serialNumber}`,
    ].join(";"),
    audit,
  };
}
