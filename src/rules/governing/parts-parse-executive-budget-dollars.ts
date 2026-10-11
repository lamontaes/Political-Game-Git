// STOPGAP RULES3-GOV-041: inherited policy expressions; preserve pending independent finishing.
// Pure expression kernels from src/simulation/governing/executive-budget-requests.ts :: parseExecutiveBudgetDollars.
// Caller supplies selected facts; preserve the legacy evaluation order and guards.
// Source anchors and input contracts: docs/plans/rules3/governing-kernels.json.

/** Legacy line 278: !match */
export function parseExecutiveBudgetDollarsRule1(facts: {
  readonly match: unknown;
}) {
  return !facts.match;
}

/** Legacy line 280: BigInt(match[1]!) * 100n + BigInt((match[2] ?? "").padEnd(2, "0")) */
export function parseExecutiveBudgetDollarsRule2(facts: {
  readonly match1: string;
  readonly match2PadEnd20: string;
}) {
  return BigInt(facts.match1) * 100n + BigInt(facts.match2PadEnd20);
}

/** Legacy line 281: cents > BigInt(Number.MAX_SAFE_INTEGER) */
export function parseExecutiveBudgetDollarsRule3(facts: {
  readonly cents: bigint;
  readonly NumberMAX_SAFE_INTEGER: number;
}) {
  return facts.cents > BigInt(facts.NumberMAX_SAFE_INTEGER);
}

/** Legacy line 282: Number(cents) */
export function parseExecutiveBudgetDollarsRule4(facts: {
  readonly cents: bigint;
}) {
  return Number(facts.cents);
}
