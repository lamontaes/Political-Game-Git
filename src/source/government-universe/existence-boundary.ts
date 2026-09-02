/**
 * The boundary between "this government exists" and "this government may act".
 *
 * The Census of Governments establishes that an entity exists, what class it
 * belongs to, and which function it was organized around. It establishes
 * nothing about what offices that entity has, how they are filled, what powers
 * they hold, or what its legislature may pass. Those are legal facts that come
 * from constitutions, statutes and charters — the governance layer — and they
 * must be sourced there, per jurisdiction, with their own citations.
 *
 * The temptation this module exists to block: a special district appears in the
 * universe with `functionCategory: "fire_protection"`, and a consumer concludes
 * it has an elected board with taxing authority. The Census record says no such
 * thing. A fire district in one state is governed by an elected board with a
 * levy; in another it is appointed by a county commission with none.
 */

import type { GovernmentClass, GovernmentFunctionCategory } from "./types.js";

/** Fields a government-universe record may never be asked to supply. */
export const GOVERNANCE_FIELDS_NOT_ESTABLISHED_BY_EXISTENCE = [
  "officeCount",
  "offices",
  "selectionMethod",
  "termLength",
  "taxingAuthority",
  "legislativePowers",
  "vetoPower",
  "homeRule",
  "chamberCount",
] as const;

export type GovernanceFieldNotEstablishedByExistence =
  (typeof GOVERNANCE_FIELDS_NOT_ESTABLISHED_BY_EXISTENCE)[number];

export interface ExistenceOnlyFact {
  readonly censusGovId: string;
  readonly governmentClass: GovernmentClass;
  readonly functionCategory: GovernmentFunctionCategory;
}

/**
 * States plainly what a universe record does and does not establish.
 *
 * Returned as data rather than prose so a consumer can surface the caveat
 * alongside the entity instead of quietly dropping it.
 */
export function describeExistenceOnlyFact(fact: ExistenceOnlyFact): {
  readonly establishes: readonly string[];
  readonly doesNotEstablish: readonly string[];
} {
  return {
    establishes: [
      `A government unit with Census Gov ID ${fact.censusGovId} was enumerated.`,
      `It is classified as ${fact.governmentClass}.`,
      `It was organized around the function ${fact.functionCategory}.`,
    ],
    doesNotEstablish: [
      "Which offices this unit has, or how many.",
      "Whether those offices are elected or appointed.",
      "What powers the unit or its officers hold.",
      "Whether it may tax, legislate, or veto.",
      "How its governing body is structured.",
    ],
  };
}

/**
 * Throws if a government-universe record has grown a governance field.
 *
 * Governance facts belong to the jurisdiction-profile layer, where every value
 * is a `SourcedValue<T>` carrying its own constitutional or statutory citation.
 * Letting one leak into the universe layer would give it the Census's authority
 * without the Census ever having said it.
 */
export function assertNoInferredGovernance(record: unknown): void {
  if (record === null || typeof record !== "object") return;

  const present = GOVERNANCE_FIELDS_NOT_ESTABLISHED_BY_EXISTENCE.filter(
    (field) => Object.hasOwn(record as Record<string, unknown>, field),
  );

  if (present.length > 0) {
    throw new Error(
      `Government-universe records must not carry governance fields (${present.join(", ")}). ` +
        "The Census of Governments establishes that an entity exists and what class it is; " +
        "offices, selection, powers and legislative rules are legal facts belonging to the " +
        "jurisdiction-profile layer, where each carries its own statutory citation.",
    );
  }
}
