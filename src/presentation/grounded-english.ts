import { stableHash } from "../simulation/ids";
import type { EntityId } from "../simulation/types";

/**
 * A small, pure realization boundary for already-recorded facts. It does not
 * discover events, decide what a person knows, or author words at runtime.
 * Each surface has its own reviewed bank and register: a Journal line is not
 * interchangeable with dialogue, a menu action, legal text, or news copy.
 */
export type EnglishSurface =
  "scene" | "menu" | "dialogue" | "journal" | "bill-document" | "news";

export interface GroundedEnglishFact {
  readonly text: string;
  /** Records that establish this value, not a prose explanation of it. */
  readonly sourceRecordIds: readonly EntityId[];
}

export interface GroundedEnglishPerson {
  readonly personId: EntityId;
  /** Recorded personality cues may affect voice, never establish a new fact. */
  readonly traits: Readonly<Record<string, GroundedEnglishFact | undefined>>;
}

export interface GroundedEnglishKnowledge {
  readonly personId: EntityId;
  readonly factKey: string;
  /** A knowledge, direct-participation, or equivalent saved basis. */
  readonly sourceRecordIds: readonly EntityId[];
}

export interface GroundedEnglishPacket {
  readonly surface: EnglishSurface;
  /** Stable for this moment across Save/Continue. */
  readonly momentKey: string;
  readonly worldSeed: string;
  /** Pin an older saved moment to the bank version that wrote its words. */
  readonly bankVersion: string;
  readonly stage: string;
  readonly sourceRecordIds: readonly EntityId[];
  readonly facts: Readonly<Record<string, GroundedEnglishFact | undefined>>;
  readonly speaker?: GroundedEnglishPerson;
  readonly viewer?: GroundedEnglishPerson;
  readonly knowledge: readonly GroundedEnglishKnowledge[];
}

export type EnglishHolder = "speaker" | "viewer";

export interface EnglishKnowledgeRequirement {
  readonly holder: EnglishHolder;
  readonly factKey: string;
}

export interface EnglishTraitRequirement {
  readonly holder: EnglishHolder;
  readonly traitKey: string;
}

interface EnglishVariantBase {
  readonly key: string;
  /** Relative frequency among eligible variants; omitted means one share. */
  readonly weight?: number;
  readonly stages?: readonly string[];
  /** Include facts implied by the sentence even when no value is interpolated. */
  readonly requiresFacts?: readonly string[];
  readonly requiresKnowledge?: readonly EnglishKnowledgeRequirement[];
  readonly requiresTraits?: readonly EnglishTraitRequirement[];
}

export type AuthoredEnglishVariant = EnglishVariantBase &
  (
    | {
        readonly kind: "template";
        /** Reviewed wording. Slots use {{fact-key}} and only copy packet facts. */
        readonly text: string;
      }
    | {
        readonly kind: "verbatim";
        /** Filed legal and published news copy is read from its saved record. */
        readonly factKey: string;
      }
  );

export interface AuthoredEnglishBank {
  readonly key: string;
  readonly version: string;
  readonly surface: EnglishSurface;
  readonly variants: readonly AuthoredEnglishVariant[];
}

export type GroundedEnglishResult =
  | {
      readonly kind: "rendered";
      readonly text: string;
      readonly variantKey: string;
      readonly usedFactKeys: readonly string[];
      readonly sourceRecordIds: readonly EntityId[];
    }
  | {
      readonly kind: "missing-context";
      /** Internal diagnostics; never expose these to a player. */
      readonly reasons: readonly string[];
    };

const SLOT = /\{\{([a-z][a-z0-9-]*)\}\}/g;

/**
 * Variant selection changes wording only. Semantic effects belong to the
 * caller's saved action or event, independent of which line was selected.
 */
export function renderGroundedEnglish(
  packet: GroundedEnglishPacket,
  bank: AuthoredEnglishBank,
): GroundedEnglishResult {
  const structural = packetProblems(packet, bank);
  if (structural.length > 0) return missing(structural);

  const blocked: string[] = [];
  const usable = bank.variants
    .map((variant) => {
      const evaluation = evaluateVariant(packet, variant);
      if (evaluation.reasons.length > 0) {
        blocked.push(`${variant.key}: ${evaluation.reasons.join(", ")}`);
        return null;
      }
      return { variant, factKeys: evaluation.factKeys };
    })
    .filter(
      (row): row is { variant: AuthoredEnglishVariant; factKeys: string[] } =>
        row !== null,
    )
    .sort((left, right) => left.variant.key.localeCompare(right.variant.key));

  if (usable.length === 0)
    return missing(
      blocked.length > 0 ? blocked : ["No authored variant exists."],
    );

  const hash = stableHash(
    `${packet.worldSeed}:${packet.momentKey}:${bank.key}:${bank.version}`,
  );
  const totalWeight = usable.reduce(
    (total, row) => total + (row.variant.weight ?? 1),
    0,
  );
  let draw = Number(BigInt(`0x${hash}`) % BigInt(totalWeight));
  const { variant, factKeys } = usable.find((row) => {
    draw -= row.variant.weight ?? 1;
    return draw < 0;
  })!;
  const text =
    variant.kind === "verbatim"
      ? packet.facts[variant.factKey]!.text
      : variant.text.replace(
          SLOT,
          (_slot, key: string) => packet.facts[key]!.text,
        );

  const sourceRecordIds = new Set<EntityId>(packet.sourceRecordIds);
  for (const key of factKeys)
    for (const id of packet.facts[key]!.sourceRecordIds)
      sourceRecordIds.add(id);
  for (const requirement of effectiveKnowledgeRequirements(
    packet,
    variant,
    factKeys,
  )) {
    const person = packet[requirement.holder]!;
    for (const row of packet.knowledge)
      if (
        row.personId === person.personId &&
        row.factKey === requirement.factKey
      )
        for (const id of row.sourceRecordIds) sourceRecordIds.add(id);
  }
  for (const requirement of variant.requiresTraits ?? [])
    for (const id of packet[requirement.holder]!.traits[requirement.traitKey]!
      .sourceRecordIds)
      sourceRecordIds.add(id);

  return {
    kind: "rendered",
    text,
    variantKey: variant.key,
    usedFactKeys: factKeys,
    sourceRecordIds: [...sourceRecordIds],
  };
}

function packetProblems(
  packet: GroundedEnglishPacket,
  bank: AuthoredEnglishBank,
): string[] {
  const problems: string[] = [];
  if (packet.surface !== bank.surface)
    problems.push("Surface register differs from the bank.");
  if (packet.bankVersion !== bank.version)
    problems.push("Saved bank version is unavailable.");
  if (!packet.worldSeed.trim() || !packet.momentKey.trim() || !bank.key.trim())
    problems.push("Stable selection identity is missing.");
  if (packet.sourceRecordIds.length === 0)
    problems.push("The moment has no saved source record.");
  if (packet.sourceRecordIds.some((id) => !id.trim()))
    problems.push("The moment has an empty source record ID.");
  if (
    new Set(bank.variants.map((variant) => variant.key)).size !==
    bank.variants.length
  )
    problems.push("Authored variant keys are not unique.");
  if (
    bank.variants.some(
      (variant) =>
        variant.weight !== undefined &&
        (!Number.isSafeInteger(variant.weight) || variant.weight < 1),
    )
  )
    problems.push("Variant weights must be positive safe integers.");
  if (
    !Number.isSafeInteger(
      bank.variants.reduce(
        (total, variant) => total + (variant.weight ?? 1),
        0,
      ),
    )
  )
    problems.push("Combined variant weight exceeds the safe integer range.");
  return problems;
}

function evaluateVariant(
  packet: GroundedEnglishPacket,
  variant: AuthoredEnglishVariant,
): { factKeys: string[]; reasons: string[] } {
  const reasons: string[] = [];
  if (variant.stages && !variant.stages.includes(packet.stage))
    reasons.push(`stage ${packet.stage} is ineligible`);
  if (
    (packet.surface === "bill-document" || packet.surface === "news") &&
    variant.kind !== "verbatim"
  )
    reasons.push("filed or published copy must be verbatim");
  if (
    variant.kind === "template" &&
    /\{\{|\}\}/.test(variant.text.replace(SLOT, ""))
  )
    reasons.push("template has an invalid fact slot");
  const slots =
    variant.kind === "template"
      ? [...variant.text.matchAll(SLOT)].map((match) => match[1]!)
      : [variant.factKey];
  const factKeys = [...new Set([...slots, ...(variant.requiresFacts ?? [])])];
  for (const key of factKeys) {
    const fact = packet.facts[key];
    if (
      !fact?.text.trim() ||
      fact.sourceRecordIds.length === 0 ||
      fact.sourceRecordIds.some((id) => !id.trim())
    )
      reasons.push(`fact ${key} lacks saved support`);
  }
  for (const requirement of effectiveKnowledgeRequirements(
    packet,
    variant,
    factKeys,
  )) {
    const person = packet[requirement.holder];
    if (
      !person ||
      !packet.knowledge.some(
        (row) =>
          row.personId === person.personId &&
          row.factKey === requirement.factKey &&
          row.sourceRecordIds.length > 0,
      )
    )
      reasons.push(
        `${requirement.holder} lacks recorded knowledge of ${requirement.factKey}`,
      );
  }
  for (const requirement of variant.requiresTraits ?? []) {
    const trait = packet[requirement.holder]?.traits[requirement.traitKey];
    if (!trait?.text.trim() || trait.sourceRecordIds.length === 0)
      reasons.push(
        `${requirement.holder} lacks recorded trait ${requirement.traitKey}`,
      );
  }
  return { factKeys, reasons };
}

function effectiveKnowledgeRequirements(
  packet: GroundedEnglishPacket,
  variant: AuthoredEnglishVariant,
  factKeys: readonly string[],
): EnglishKnowledgeRequirement[] {
  const holder: EnglishHolder | null =
    packet.surface === "dialogue"
      ? "speaker"
      : packet.surface === "scene" ||
          packet.surface === "menu" ||
          packet.surface === "journal"
        ? "viewer"
        : null;
  const requirements = [
    ...(holder ? factKeys.map((factKey) => ({ holder, factKey })) : []),
    ...(variant.requiresKnowledge ?? []),
  ];
  return requirements.filter(
    (row, index) =>
      requirements.findIndex(
        (other) => other.holder === row.holder && other.factKey === row.factKey,
      ) === index,
  );
}

function missing(reasons: readonly string[]): GroundedEnglishResult {
  return { kind: "missing-context", reasons };
}
