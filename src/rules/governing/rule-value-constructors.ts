// Lifted unchanged from src/simulation/legislature-rules.ts; RULES-3, 2026-10-11.

export type RuleAuthorityLayer =
  | "constitution"
  | "permanent-rules"
  | "temporary-rules"
  | "joint-rules"
  | "uniform-rules"
  | "statute"
  | "parliamentary-fallback"
  | "research-reference"
  /**
   * Not an authority at all: the game's own disclosed rule, used where no
   * instrument for this jurisdiction has been read. It is named as a layer so
   * that a generated rule cannot be mistaken for a constitutional one by a
   * consumer reading the layer, and so that a pack carrying one is detectable
   * by inspection rather than by trusting whoever wrote it.
   */
  | "game-profile";

export type RuleVerificationStatus =
  | "verified"
  | "partial"
  | "unresolved"
  /**
   * The value came from the game's own profile rather than from a source.
   * `assertRulePackIntegrity` permits it only inside a pack that declares
   * itself a game profile, so it can never appear in a researched pack.
   */
  | "game-profile";

export interface RuleSourceRef {
  readonly authority: RuleAuthorityLayer;
  /** Rule or section identity, e.g. "Const. Sec. 88" or "House Rule 39". */
  readonly citation: string;
  readonly sourceTitle: string;
  readonly sourceUrl: string | null;
  readonly retrievedAt: string | null;
  readonly verification: RuleVerificationStatus;
  readonly note: string | null;
}

export type KnownRuleValue<T> = {
  readonly kind: "known";
  readonly value: T;
  readonly source: RuleSourceRef;
};

export type UnknownRuleValue = {
  readonly kind: "unknown";
  readonly note: string;
};

export type RuleValue<T> =
  | KnownRuleValue<T>
  | UnknownRuleValue
  | { readonly kind: "not-applicable"; readonly note: string };

export function knownRule<T>(
  value: T,
  source: RuleSourceRef,
): KnownRuleValue<T> {
  return { kind: "known", value, source };
}

export function unknownRule(note: string): UnknownRuleValue {
  if (note.trim().length === 0) {
    throw new Error("An unknown rule must explain what is unresolved.");
  }
  return { kind: "unknown", note };
}
