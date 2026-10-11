// STOPGAP RULES3-GOV-064: inherited policy expressions; preserve pending independent finishing.
// Pure expression kernels from src/simulation/governing/state-governing.ts :: openProgramMatter.
// Caller supplies selected facts; preserve the legacy evaluation order and guards.
// Source anchors and input contracts: docs/plans/rules3/governing-kernels.json.

/** Legacy line 2098: world.currentDate < appropriation.availableFrom */
export function openProgramMatterRule1(facts: {
  readonly currentDate: string;
  readonly appropriationAvailableFrom: string;
}) {
  return facts.currentDate < facts.appropriationAvailableFrom;
}

/** Legacy line 2101: !instance */
export function openProgramMatterRule2(facts: {
  readonly instance: string | null;
}) {
  return !facts.instance!;
}

/** Legacy line 2105: office.programOffice ?? { kind: "state-executive" } */
export function openProgramMatterRule3(facts: {
  readonly officeProgramOffice: unknown;
  readonly kindStateExecutive: unknown;
}) {
  return facts.officeProgramOffice ?? facts.kindStateExecutive;
}

/** Legacy line 2108: authority.status !== "available" */
export function openProgramMatterRule4(facts: {
  readonly authorityStatus: string;
}) {
  return facts.authorityStatus !== "available";
}

/** Legacy line 2113: appropriation.programKey.split(":")[0] ?? null */
export function openProgramMatterRule5(facts: {
  readonly appropriationProgramKeySplit0: string | undefined;
}) {
  return facts.appropriationProgramKeySplit0! ?? null;
}
