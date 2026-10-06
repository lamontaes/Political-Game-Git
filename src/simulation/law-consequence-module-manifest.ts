import type { AnyLawConsequenceKindRegistration } from "./law-consequence-types";

/**
 * Pure TypeScript list of reviewed extension modules. Session 20 is the sole
 * writer of this manifest; batch owners author their module, then Session 20
 * adds its typed export here after review. Keep this static so browser, Node,
 * profiles, source replay and tests share the same synchronous receiver.
 */
export const LAW_CONSEQUENCE_MODULE_REGISTRATIONS: readonly AnyLawConsequenceKindRegistration[] =
  [];
