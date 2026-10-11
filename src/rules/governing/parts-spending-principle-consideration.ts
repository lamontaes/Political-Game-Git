// STOPGAP RULES3-GOV-051: inherited policy expressions; preserve pending independent finishing.
// Pure expression kernels from src/simulation/governing/officeholder-principles.ts :: spendingPrincipleConsideration.
// Caller supplies selected facts; preserve the legacy evaluation order and guards.
// Source anchors and input contracts: docs/plans/rules3/governing-kernels.json.

/** Legacy line 326: stableKey ? stableKey.slice(stableKey.lastIndexOf(":") + 1) : null */
export function spendingPrincipleConsiderationRule1(facts: {
  readonly stableKey: string | undefined;
  readonly stableKeySliceStableKeyLastIndexOf1: string;
}) {
  return facts.stableKey! ? facts.stableKeySliceStableKeyLastIndexOf1 : null;
}

/** Legacy line 326: stableKey.lastIndexOf(":") + 1 */
export function spendingPrincipleConsiderationRule2(facts: {
  readonly stableKeyLastIndexOf: number;
}) {
  return facts.stableKeyLastIndexOf + 1;
}

/** Legacy line 329: principlesByPerson(world).get(personId) ?? [] */
export function spendingPrincipleConsiderationRule3(facts: {
  readonly principlesByPersonWorldGetPersonId: unknown;
}) {
  return facts.principlesByPersonWorldGetPersonId ?? [];
}

/** Legacy line 330: record.formedAt > world.currentDate */
export function spendingPrincipleConsiderationRule4(facts: {
  readonly recordFormedAt: string;
  readonly currentDate: string;
}) {
  return facts.recordFormedAt > facts.currentDate;
}

/** Legacy line 332: !prior || prior.sequence < record.sequence */
export function spendingPrincipleConsiderationRule5(facts: {
  readonly prior: unknown;
  readonly priorSequence: number;
  readonly recordSequence: number;
}) {
  return !facts.prior || facts.priorSequence < facts.recordSequence;
}

/** Legacy line 338: held.stance === "conflicted" */
export function spendingPrincipleConsiderationRule6(facts: {
  readonly heldStance: string;
}) {
  return facts.heldStance === "conflicted";
}

/** Legacy line 340: row.principle === keyOf(held.principleId) */
export function spendingPrincipleConsiderationRule7(facts: {
  readonly rowPrinciple: string;
  readonly keyOfHeldPrincipleId: string | null;
}) {
  return facts.rowPrinciple === facts.keyOfHeldPrincipleId!;
}

/** Legacy line 342: !bearing */
export function spendingPrincipleConsiderationRule8(facts: {
  readonly bearing: unknown;
}) {
  return !facts.bearing;
}

/** Legacy line 344: (held.stance === "endorses") === (bearing.bearing === "consistent-with") */
export function spendingPrincipleConsiderationRule9(facts: {
  readonly heldStance: string;
  readonly bearingBearing: string;
}) {
  return (
    (facts.heldStance === "endorses") ===
    (facts.bearingBearing === "consistent-with")
  );
}

/** Legacy line 345: score += (agrees ? 1 : -1) * held.strength * 4 */
export function spendingPrincipleConsiderationRule10(facts: {
  readonly score: number;
  readonly agrees: boolean;
  readonly heldStrength: number;
}) {
  return facts.score + (facts.agrees ? 1 : -1) * facts.heldStrength * 4;
}

/** Legacy line 348: score === 0 */
export function spendingPrincipleConsiderationRule11(facts: {
  readonly score: number;
}) {
  return facts.score === 0;
}

/** Legacy line 349: Math.abs(score) */
export function spendingPrincipleConsiderationRule12(facts: {
  readonly score: number;
}) {
  return Math.abs(facts.score);
}

/** Legacy line 351: score > 0 ? "member:spending:for" : "member:spending:against" */
export function spendingPrincipleConsiderationRule13(facts: {
  readonly score: number;
}) {
  return facts.score > 0 ? "member:spending:for" : "member:spending:against";
}

/** Legacy line 352: score > 0 ? "vote-yea" : "vote-nay" */
export function spendingPrincipleConsiderationRule14(facts: {
  readonly score: number;
}) {
  return facts.score > 0 ? "vote-yea" : "vote-nay";
}

/** Legacy line 356: size >= VOTE_IMPORTANCE.decisive         ? "decisive"         : size >= VOTE_IMPORTANCE.strong           ? "strong"           : size >= VOTE_IMPORTANCE.moderate             ? "moderate"             : "slight" */
export function spendingPrincipleConsiderationRule15(facts: {
  readonly size: number;
  readonly VOTE_IMPORTANCEDecisive: number;
  readonly VOTE_IMPORTANCEStrong: number;
  readonly VOTE_IMPORTANCEModerate: number;
}) {
  return facts.size >= facts.VOTE_IMPORTANCEDecisive
    ? "decisive"
    : facts.size >= facts.VOTE_IMPORTANCEStrong
      ? "strong"
      : facts.size >= facts.VOTE_IMPORTANCEModerate
        ? "moderate"
        : "slight";
}

/** Legacy line 365: score > 0         ? "The member holds that some things are met better by everyone together."         : "The member holds that government should spend no more than the job requires." */
export function spendingPrincipleConsiderationRule16(facts: {
  readonly score: number;
}) {
  return facts.score > 0
    ? "The member holds that some things are met better by everyone together."
    : "The member holds that government should spend no more than the job requires.";
}
