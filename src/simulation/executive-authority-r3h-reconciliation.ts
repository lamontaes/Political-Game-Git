/**
 * The R3I coverage reconciliation: what became of every accepted R3H node.
 *
 * The accepted research universe is exactly the 142 promoted nodes of the R3G
 * certified runtime subset across US, US-KY, US-NE, US-AK, US-MN and US-IL. The
 * 356 queued rows and the wider field taxonomy are OUTSIDE it and appear
 * nowhere here or in any pack.
 *
 * This module exists so that no accepted node can disappear silently. Every one
 * of the 142 is listed with a disposition and, where it resolved something, the
 * exact executive-authority contract fields it resolved. The accompanying test
 * checks the accounting against the live packs, so a claim here that a node was
 * compiled fails if the field it names is not actually `known` in the runtime.
 *
 * This module is a development-time audit artifact. It is not consulted by the
 * simulation, holds no legal authority of its own, and is never a fallback: a
 * pack's value comes from the pack, and nothing here can promote a field.
 */

import {
  EXECUTIVE_AUTHORITY_RULE_PACKS,
  executiveRulePackForJurisdiction,
} from "./executive-authority-rule-packs";
import type { ExecutiveAuthorityRulePack } from "./executive-authority-rules";

/** What R3I did with one accepted R3H node. */
export type R3hDisposition =
  /** The node resolved a contract field that was previously unknown. */
  | "newly-compiled"
  /** The runtime already carried this fact, at the same value. */
  | "already-represented"
  /** A legislative_powers node R3H routes to the separate R3J lane. */
  | "deferred-to-r3j"
  /** The accepted contract has no field for this fact, and R3I adds none. */
  | "no-exact-consumer"
  /**
   * A contract field exists, but the accepted value does not entail it at the
   * field's own precision, so the field stays unknown.
   */
  | "blocked-by-contract-mismatch";

export interface R3hNodeDisposition {
  /** Jurisdiction key as the certified subset states it, e.g. "US-KY". */
  readonly jurisdictionKey: string;
  /** Certified category, e.g. "clemency" or "legislative_powers". */
  readonly category: string;
  /** Certified node name within that category, e.g. "commands_militia". */
  readonly node: string;
  /** The accepted node's own status. */
  readonly acceptedStatus: "KNOWN" | "NOT_APPLICABLE";
  /** The official instrument the accepted receipt names, verbatim. */
  readonly citation: string;
  readonly disposition: R3hDisposition;
  /**
   * Dotted paths into {@link ExecutiveAuthorityRulePack} that this node
   * resolves. Non-empty only for `newly-compiled` and `already-represented`;
   * `pluralExecutive` names the officer list as a whole.
   */
  readonly targetFields: readonly string[];
  /** Why this disposition, in terms of the contract field and the node. */
  readonly reason: string;
}

/** The accepted node total. Every entry below is one of these. */
export const R3H_ACCEPTED_NODE_TOTAL = 142;

/** The jurisdictions the R3H audit promoted; no other pack is in scope. */
export const R3H_PROMOTED_JURISDICTIONS: readonly string[] = [
  "US",
  "US-KY",
  "US-NE",
  "US-AK",
  "US-MN",
  "US-IL",
];

/**
 * The accepted category counts, as the R3H activation states them. The test
 * checks the entries below reproduce these exactly, so a node cannot be added,
 * dropped or re-filed without the accounting failing.
 */
export const R3H_ACCEPTED_CATEGORY_COUNTS: Readonly<Record<string, number>> = {
  branch_structure: 6,
  appointments: 19,
  administrative_powers: 4,
  emergency_powers: 7,
  clemency: 16,
  budget: 8,
  plural_executive_constraints: 6,
  guard: 12,
  identity_selection: 28,
  legislative_powers: 36,
};

/** Every accepted R3H node, and what R3I did with it. */
export const R3H_NODE_RECONCILIATION: readonly R3hNodeDisposition[] = [
  {
    jurisdictionKey: "US",
    category: "identity_selection",
    node: "governor_selection",
    acceptedStatus: "KNOWN",
    citation: "U.S. Const. art. II, § 1, cl. 2; amend. XII",
    disposition: "no-exact-consumer",
    targetFields: [],
    reason:
      "The accepted executive-authority contract carries no election, term-length, term-limit, lieutenant-governor or succession field. R3I adds no schema to consume this node; it is recorded and left uncompiled.",
  },
  {
    jurisdictionKey: "US",
    category: "identity_selection",
    node: "lt_governor_relationship",
    acceptedStatus: "NOT_APPLICABLE",
    citation: "U.S. Const. art. II, § 1, cl. 1; art. I, § 3, cl. 4",
    disposition: "no-exact-consumer",
    targetFields: [],
    reason:
      "The accepted executive-authority contract carries no election, term-length, term-limit, lieutenant-governor or succession field. R3I adds no schema to consume this node; it is recorded and left uncompiled.",
  },
  {
    jurisdictionKey: "US",
    category: "identity_selection",
    node: "term_years",
    acceptedStatus: "KNOWN",
    citation: "U.S. Const. art. II, § 1, cl. 1",
    disposition: "no-exact-consumer",
    targetFields: [],
    reason:
      "The accepted executive-authority contract carries no election, term-length, term-limit, lieutenant-governor or succession field. R3I adds no schema to consume this node; it is recorded and left uncompiled.",
  },
  {
    jurisdictionKey: "US",
    category: "identity_selection",
    node: "term_limits",
    acceptedStatus: "KNOWN",
    citation: "U.S. Const. amend. XXII, § 1",
    disposition: "no-exact-consumer",
    targetFields: [],
    reason:
      "The accepted executive-authority contract carries no election, term-length, term-limit, lieutenant-governor or succession field. R3I adds no schema to consume this node; it is recorded and left uncompiled.",
  },
  {
    jurisdictionKey: "US",
    category: "identity_selection",
    node: "succession_basics",
    acceptedStatus: "KNOWN",
    citation: "3 U.S.C. § 19(a)(1), (b), (d)(1); U.S. Const. amend. XXV, § 1",
    disposition: "no-exact-consumer",
    targetFields: [],
    reason:
      "The accepted executive-authority contract carries no election, term-length, term-limit, lieutenant-governor or succession field. R3I adds no schema to consume this node; it is recorded and left uncompiled.",
  },
  {
    jurisdictionKey: "US",
    category: "appointments",
    node: "cabinet_department_heads",
    acceptedStatus: "KNOWN",
    citation: "U.S. Const. art. II, § 2, cl. 2",
    disposition: "already-represented",
    targetFields: [
      "appointment.executiveAppoints",
      "appointment.legislativeConfirmationRequired",
      "appointment.confirmingBody",
    ],
    reason:
      "Already carried by the federal pack from U.S. Const. Art. II, Sec. 2, cl. 2.",
  },
  {
    jurisdictionKey: "US",
    category: "appointments",
    node: "appointment_authority",
    acceptedStatus: "KNOWN",
    citation: "U.S. Const. art. II, § 2, cl. 2",
    disposition: "already-represented",
    targetFields: [
      "appointment.executiveAppoints",
      "appointment.legislativeConfirmationRequired",
      "appointment.confirmingBody",
    ],
    reason:
      "Already carried by the federal pack from U.S. Const. Art. II, Sec. 2, cl. 2.",
  },
  {
    jurisdictionKey: "US",
    category: "appointments",
    node: "recess_interim_appointments",
    acceptedStatus: "KNOWN",
    citation: "U.S. Const. art. II, § 2, cl. 3",
    disposition: "no-exact-consumer",
    targetFields: [],
    reason:
      "The accepted executive-authority contract carries no recess or interim appointment field. The node is recorded and left uncompiled; no schema is added to consume it.",
  },
  {
    jurisdictionKey: "US",
    category: "legislative_powers",
    node: "regular_veto",
    acceptedStatus: "KNOWN",
    citation: "U.S. Const. art. I, § 7, cl. 2",
    disposition: "deferred-to-r3j",
    targetFields: [],
    reason:
      "R3H routes the legislative_powers category to R3J. This node is not compiled here because LegislativeRulePack owns presentment, veto and override.",
  },
  {
    jurisdictionKey: "US",
    category: "legislative_powers",
    node: "item_partial_veto",
    acceptedStatus: "NOT_APPLICABLE",
    citation: "524 U.S. 417, 438 (1998)",
    disposition: "deferred-to-r3j",
    targetFields: [],
    reason:
      "R3H routes the legislative_powers category to R3J. This node is not compiled here because LegislativeRulePack owns presentment, veto and override.",
  },
  {
    jurisdictionKey: "US",
    category: "legislative_powers",
    node: "override_threshold",
    acceptedStatus: "KNOWN",
    citation: "U.S. Const. art. I, § 7, cl. 2",
    disposition: "deferred-to-r3j",
    targetFields: [],
    reason:
      "R3H routes the legislative_powers category to R3J. This node is not compiled here because LegislativeRulePack owns presentment, veto and override.",
  },
  {
    jurisdictionKey: "US",
    category: "legislative_powers",
    node: "special_session_call",
    acceptedStatus: "KNOWN",
    citation: "U.S. Const. art. II, § 3",
    disposition: "already-represented",
    targetFields: ["specialSession.executiveMayConvene"],
    reason:
      "Already carried: the federal pack resolves specialSession.executiveMayConvene from U.S. Const. Art. II, Sec. 3, which is the same convening power this node states.",
  },
  {
    jurisdictionKey: "US",
    category: "legislative_powers",
    node: "other_presentment_powers",
    acceptedStatus: "NOT_APPLICABLE",
    citation: "462 U.S. 919, 957-958 (1983)",
    disposition: "deferred-to-r3j",
    targetFields: [],
    reason:
      "R3H routes the legislative_powers category to R3J. This node is not compiled here because LegislativeRulePack owns presentment, veto and override.",
  },
  {
    jurisdictionKey: "US",
    category: "emergency_powers",
    node: "declaration_authority",
    acceptedStatus: "KNOWN",
    citation: "50 U.S.C. § 1621(a)",
    disposition: "newly-compiled",
    targetFields: ["emergencyDeclaration.executiveMayDeclare"],
    reason:
      "Compiled directly: the accepted node establishes the declaration power.",
  },
  {
    jurisdictionKey: "US",
    category: "emergency_powers",
    node: "legislative_extension_termination",
    acceptedStatus: "KNOWN",
    citation: "50 U.S.C. § 1622(a)(1)",
    disposition: "newly-compiled",
    targetFields: ["emergencyDeclaration.legislativeTermination"],
    reason:
      "Compiled into legislativeTermination only. The accepted value establishes how the legislature terminates a declaration; it does not establish how the executive extends one, so emergencyDeclaration.extension is not filled from it.",
  },
  {
    jurisdictionKey: "US",
    category: "clemency",
    node: "pardon",
    acceptedStatus: "KNOWN",
    citation: "U.S. Const. art. II, § 2, cl. 1",
    disposition: "already-represented",
    targetFields: ["clemency.model", "clemency.scope"],
    reason:
      "Already carried: the federal pack resolves clemency as executive-sole with its scope from U.S. Const. Art. II, Sec. 2, cl. 1. The accepted board-constraint node is NOT_APPLICABLE in the research; it enters runtime only as part of that composite executive-sole model, never as a not-applicable value, which this contract refuses.",
  },
  {
    jurisdictionKey: "US",
    category: "clemency",
    node: "commutation",
    acceptedStatus: "KNOWN",
    citation: "U.S. Const. art. II, § 2, cl. 1",
    disposition: "already-represented",
    targetFields: ["clemency.model", "clemency.scope"],
    reason:
      "Already carried: the federal pack resolves clemency as executive-sole with its scope from U.S. Const. Art. II, Sec. 2, cl. 1. The accepted board-constraint node is NOT_APPLICABLE in the research; it enters runtime only as part of that composite executive-sole model, never as a not-applicable value, which this contract refuses.",
  },
  {
    jurisdictionKey: "US",
    category: "clemency",
    node: "reprieve",
    acceptedStatus: "KNOWN",
    citation: "U.S. Const. art. II, § 2, cl. 1",
    disposition: "already-represented",
    targetFields: ["clemency.model", "clemency.scope"],
    reason:
      "Already carried: the federal pack resolves clemency as executive-sole with its scope from U.S. Const. Art. II, Sec. 2, cl. 1. The accepted board-constraint node is NOT_APPLICABLE in the research; it enters runtime only as part of that composite executive-sole model, never as a not-applicable value, which this contract refuses.",
  },
  {
    jurisdictionKey: "US",
    category: "clemency",
    node: "board_recommendation_constraints",
    acceptedStatus: "NOT_APPLICABLE",
    citation: "71 U.S. (4 Wall.) 333, 380 (1866)",
    disposition: "already-represented",
    targetFields: ["clemency.model"],
    reason:
      "Already carried: the federal pack resolves clemency as executive-sole with its scope from U.S. Const. Art. II, Sec. 2, cl. 1. The accepted board-constraint node is NOT_APPLICABLE in the research; it enters runtime only as part of that composite executive-sole model, never as a not-applicable value, which this contract refuses.",
  },
  {
    jurisdictionKey: "US",
    category: "budget",
    node: "executive_budget_submission_duty",
    acceptedStatus: "KNOWN",
    citation: "31 U.S.C. § 1105(a)",
    disposition: "newly-compiled",
    targetFields: ["budgetSubmission.executiveMustSubmit"],
    reason:
      "Compiled directly: the accepted node resolves this field exactly, at the field's own shape.",
  },
  {
    jurisdictionKey: "US",
    category: "budget",
    node: "timing",
    acceptedStatus: "KNOWN",
    citation: "31 U.S.C. § 1105(a)",
    disposition: "newly-compiled",
    targetFields: ["budgetSubmission.submissionDeadline"],
    reason:
      "Compiled directly: the accepted node resolves this field exactly, at the field's own shape.",
  },
  {
    jurisdictionKey: "US",
    category: "plural_executive_constraints",
    node: "independently_elected_officers",
    acceptedStatus: "KNOWN",
    citation:
      "U.S. Const. art. II, § 1, cl. 1; art. II, § 2, cl. 2; amend. XII; Buckley v. Valeo, 424 U.S. 1, 126 (1976)",
    disposition: "already-represented",
    targetFields: ["pluralExecutive"],
    reason:
      "The accepted independently-elected officer set is already carried by the pack's pluralExecutive list (empty for a unitary branch), and agrees with the accepted node.",
  },
  {
    jurisdictionKey: "US",
    category: "guard",
    node: "commands_militia",
    acceptedStatus: "KNOWN",
    citation: "U.S. Const. art. II, § 2, cl. 1",
    disposition: "already-represented",
    targetFields: ["guard.commandsMilitia"],
    reason:
      "Already carried by the federal pack from the operative text of U.S. Const. Art. II, Sec. 2, cl. 1.",
  },
  {
    jurisdictionKey: "US",
    category: "guard",
    node: "scope",
    acceptedStatus: "KNOWN",
    citation: "U.S. Const. art. II, § 2, cl. 1",
    disposition: "already-represented",
    targetFields: ["guard.scope"],
    reason:
      "Already carried by the federal pack from the operative text of U.S. Const. Art. II, Sec. 2, cl. 1.",
  },
  {
    jurisdictionKey: "US",
    category: "branch_structure",
    node: "branch_structure",
    acceptedStatus: "KNOWN",
    citation: "U.S. Const. art. II, § 1, cl. 1",
    disposition: "already-represented",
    targetFields: ["office.branchStructure"],
    reason:
      "The accepted branch structure is already carried by office.branchStructure on the compiled pack, at the same value; no runtime change is required.",
  },
  {
    jurisdictionKey: "US-KY",
    category: "identity_selection",
    node: "governor_selection",
    acceptedStatus: "KNOWN",
    citation: "Ky. Const. § 70",
    disposition: "no-exact-consumer",
    targetFields: [],
    reason:
      "The accepted executive-authority contract carries no election, term-length, term-limit, lieutenant-governor or succession field. R3I adds no schema to consume this node; it is recorded and left uncompiled.",
  },
  {
    jurisdictionKey: "US-KY",
    category: "identity_selection",
    node: "lt_governor_relationship",
    acceptedStatus: "KNOWN",
    citation: "Ky. Const. § 70",
    disposition: "no-exact-consumer",
    targetFields: [],
    reason:
      "The accepted executive-authority contract carries no election, term-length, term-limit, lieutenant-governor or succession field. R3I adds no schema to consume this node; it is recorded and left uncompiled.",
  },
  {
    jurisdictionKey: "US-KY",
    category: "identity_selection",
    node: "term_years",
    acceptedStatus: "KNOWN",
    citation: "Ky. Const. § 70",
    disposition: "no-exact-consumer",
    targetFields: [],
    reason:
      "The accepted executive-authority contract carries no election, term-length, term-limit, lieutenant-governor or succession field. R3I adds no schema to consume this node; it is recorded and left uncompiled.",
  },
  {
    jurisdictionKey: "US-KY",
    category: "identity_selection",
    node: "term_limits",
    acceptedStatus: "KNOWN",
    citation: "Ky. Const. § 71",
    disposition: "no-exact-consumer",
    targetFields: [],
    reason:
      "The accepted executive-authority contract carries no election, term-length, term-limit, lieutenant-governor or succession field. R3I adds no schema to consume this node; it is recorded and left uncompiled.",
  },
  {
    jurisdictionKey: "US-KY",
    category: "identity_selection",
    node: "succession_basics",
    acceptedStatus: "KNOWN",
    citation: "Ky. Const. § 84",
    disposition: "no-exact-consumer",
    targetFields: [],
    reason:
      "The accepted executive-authority contract carries no election, term-length, term-limit, lieutenant-governor or succession field. R3I adds no schema to consume this node; it is recorded and left uncompiled.",
  },
  {
    jurisdictionKey: "US-KY",
    category: "appointments",
    node: "appointment_authority",
    acceptedStatus: "KNOWN",
    citation: "Ky. Const. § 76",
    disposition: "blocked-by-contract-mismatch",
    targetFields: [],
    reason:
      "Blocked by contract mismatch. Ky. Const. Sec. 76 is a vacancy-filling clause; appointment.executiveAppoints asks whether the executive appoints the principal officers of the branch. The accepted node is narrower than the contract field, and the compiled pack already refuses to widen a specific appointment into a general power, so the field stays unknown.",
  },
  {
    jurisdictionKey: "US-KY",
    category: "legislative_powers",
    node: "regular_veto",
    acceptedStatus: "KNOWN",
    citation: "Ky. Const. § 88",
    disposition: "deferred-to-r3j",
    targetFields: [],
    reason:
      "R3H routes the legislative_powers category to R3J. This node is not compiled here because LegislativeRulePack owns presentment, veto and override.",
  },
  {
    jurisdictionKey: "US-KY",
    category: "legislative_powers",
    node: "item_partial_veto",
    acceptedStatus: "KNOWN",
    citation: "Ky. Const. § 88",
    disposition: "deferred-to-r3j",
    targetFields: [],
    reason:
      "R3H routes the legislative_powers category to R3J. This node is not compiled here because LegislativeRulePack owns presentment, veto and override.",
  },
  {
    jurisdictionKey: "US-KY",
    category: "legislative_powers",
    node: "override_threshold",
    acceptedStatus: "KNOWN",
    citation: "Ky. Const. § 88",
    disposition: "deferred-to-r3j",
    targetFields: [],
    reason:
      "R3H routes the legislative_powers category to R3J. This node is not compiled here because LegislativeRulePack owns presentment, veto and override.",
  },
  {
    jurisdictionKey: "US-KY",
    category: "legislative_powers",
    node: "special_session_call",
    acceptedStatus: "KNOWN",
    citation: "Ky. Const. § 80",
    disposition: "deferred-to-r3j",
    targetFields: [],
    reason:
      "R3H routes the legislative_powers category to R3J. This node is not compiled here even though specialSession.* is an executive-authority field with an exact consumer, because category ownership, not contract shape, withholds it.",
  },
  {
    jurisdictionKey: "US-KY",
    category: "legislative_powers",
    node: "special_session_agenda_restriction",
    acceptedStatus: "KNOWN",
    citation: "Ky. Const. § 80",
    disposition: "deferred-to-r3j",
    targetFields: [],
    reason:
      "R3H routes the legislative_powers category to R3J. This node is not compiled here even though specialSession.* is an executive-authority field with an exact consumer, because category ownership, not contract shape, withholds it.",
  },
  {
    jurisdictionKey: "US-KY",
    category: "legislative_powers",
    node: "legislative_rule_pack_cross_reference",
    acceptedStatus: "KNOWN",
    citation:
      "src/simulation/legislature-rule-packs.ts#us-ky-general-assembly-v1",
    disposition: "already-represented",
    targetFields: ["presentment.legislativeRulePackId"],
    reason:
      "The accepted cross-reference names exactly the legislative pack the compiled executive pack already resolves through presentment.legislativeRulePackId.",
  },
  {
    jurisdictionKey: "US-KY",
    category: "clemency",
    node: "pardon",
    acceptedStatus: "KNOWN",
    citation: "Ky. Const. § 77",
    disposition: "newly-compiled",
    targetFields: ["clemency.model", "clemency.scope"],
    reason:
      "The three accepted component grants agree and affirmatively name who holds the power (sole gubernatorial power), which establishes the composite executive-sole model. Scope carries the accepted component names and the accepted value verbatim.",
  },
  {
    jurisdictionKey: "US-KY",
    category: "clemency",
    node: "commutation",
    acceptedStatus: "KNOWN",
    citation: "Ky. Const. § 77",
    disposition: "newly-compiled",
    targetFields: ["clemency.model", "clemency.scope"],
    reason:
      "The three accepted component grants agree and affirmatively name who holds the power (sole gubernatorial power), which establishes the composite executive-sole model. Scope carries the accepted component names and the accepted value verbatim.",
  },
  {
    jurisdictionKey: "US-KY",
    category: "clemency",
    node: "reprieve",
    acceptedStatus: "KNOWN",
    citation: "Ky. Const. § 77",
    disposition: "newly-compiled",
    targetFields: ["clemency.model", "clemency.scope"],
    reason:
      "The three accepted component grants agree and affirmatively name who holds the power (sole gubernatorial power), which establishes the composite executive-sole model. Scope carries the accepted component names and the accepted value verbatim.",
  },
  {
    jurisdictionKey: "US-KY",
    category: "plural_executive_constraints",
    node: "independently_elected_officers",
    acceptedStatus: "KNOWN",
    citation: "Ky. Const. § 91",
    disposition: "already-represented",
    targetFields: ["pluralExecutive"],
    reason:
      "The accepted independently-elected officer set is already carried by the pack's pluralExecutive list (empty for a unitary branch), and agrees with the accepted node.",
  },
  {
    jurisdictionKey: "US-KY",
    category: "guard",
    node: "commands_militia",
    acceptedStatus: "KNOWN",
    citation: "Ky. Const. § 75",
    disposition: "newly-compiled",
    targetFields: ["guard.commandsMilitia"],
    reason:
      "Compiled directly: the accepted node resolves this field exactly, at the field's own shape.",
  },
  {
    jurisdictionKey: "US-KY",
    category: "guard",
    node: "scope",
    acceptedStatus: "KNOWN",
    citation: "Ky. Const. § 75",
    disposition: "newly-compiled",
    targetFields: ["guard.scope"],
    reason:
      "Compiled directly: the accepted node resolves this field exactly, at the field's own shape.",
  },
  {
    jurisdictionKey: "US-KY",
    category: "branch_structure",
    node: "branch_structure",
    acceptedStatus: "KNOWN",
    citation: "Ky. Const. § 69, 91",
    disposition: "already-represented",
    targetFields: ["office.branchStructure"],
    reason:
      "The accepted branch structure is already carried by office.branchStructure on the compiled pack, at the same value; no runtime change is required.",
  },
  {
    jurisdictionKey: "US-NE",
    category: "identity_selection",
    node: "governor_selection",
    acceptedStatus: "KNOWN",
    citation: "Neb. Const. art. IV § 1",
    disposition: "no-exact-consumer",
    targetFields: [],
    reason:
      "The accepted executive-authority contract carries no election, term-length, term-limit, lieutenant-governor or succession field. R3I adds no schema to consume this node; it is recorded and left uncompiled.",
  },
  {
    jurisdictionKey: "US-NE",
    category: "identity_selection",
    node: "lt_governor_relationship",
    acceptedStatus: "KNOWN",
    citation: "Neb. Const. art. IV § 1",
    disposition: "no-exact-consumer",
    targetFields: [],
    reason:
      "The accepted executive-authority contract carries no election, term-length, term-limit, lieutenant-governor or succession field. R3I adds no schema to consume this node; it is recorded and left uncompiled.",
  },
  {
    jurisdictionKey: "US-NE",
    category: "identity_selection",
    node: "term_years",
    acceptedStatus: "KNOWN",
    citation: "Neb. Const. art. IV § 1",
    disposition: "no-exact-consumer",
    targetFields: [],
    reason:
      "The accepted executive-authority contract carries no election, term-length, term-limit, lieutenant-governor or succession field. R3I adds no schema to consume this node; it is recorded and left uncompiled.",
  },
  {
    jurisdictionKey: "US-NE",
    category: "identity_selection",
    node: "term_limits",
    acceptedStatus: "KNOWN",
    citation: "Neb. Const. art. IV § 1",
    disposition: "no-exact-consumer",
    targetFields: [],
    reason:
      "The accepted executive-authority contract carries no election, term-length, term-limit, lieutenant-governor or succession field. R3I adds no schema to consume this node; it is recorded and left uncompiled.",
  },
  {
    jurisdictionKey: "US-NE",
    category: "identity_selection",
    node: "succession_basics",
    acceptedStatus: "KNOWN",
    citation: "Neb. Const. art. IV § 16",
    disposition: "no-exact-consumer",
    targetFields: [],
    reason:
      "The accepted executive-authority contract carries no election, term-length, term-limit, lieutenant-governor or succession field. R3I adds no schema to consume this node; it is recorded and left uncompiled.",
  },
  {
    jurisdictionKey: "US-NE",
    category: "appointments",
    node: "cabinet_department_heads",
    acceptedStatus: "KNOWN",
    citation: "Neb. Const. art. IV § 10",
    disposition: "newly-compiled",
    targetFields: ["appointment.executiveAppoints"],
    reason:
      "Compiled directly: the accepted node establishes a general power to appoint the principal officers of the executive branch, which is exactly this field.",
  },
  {
    jurisdictionKey: "US-NE",
    category: "appointments",
    node: "appointment_authority",
    acceptedStatus: "KNOWN",
    citation: "Neb. Const. art. IV § 10",
    disposition: "newly-compiled",
    targetFields: ["appointment.executiveAppoints"],
    reason:
      "Compiled directly: the accepted node establishes a general power to appoint the principal officers of the executive branch, which is exactly this field.",
  },
  {
    jurisdictionKey: "US-NE",
    category: "appointments",
    node: "confirmation_requirement",
    acceptedStatus: "KNOWN",
    citation: "Neb. Const. art. IV § 10",
    disposition: "newly-compiled",
    targetFields: [
      "appointment.legislativeConfirmationRequired",
      "appointment.confirmingBody",
    ],
    reason:
      "Compiled directly. The accepted value names the confirming body and that confirmation is required; its vote threshold has no contract field and is carried in the source note.",
  },
  {
    jurisdictionKey: "US-NE",
    category: "appointments",
    node: "recess_interim_appointments",
    acceptedStatus: "KNOWN",
    citation: "Neb. Const. art. IV, § 12",
    disposition: "no-exact-consumer",
    targetFields: [],
    reason:
      "The accepted executive-authority contract carries no recess or interim appointment field. The node is recorded and left uncompiled; no schema is added to consume it.",
  },
  {
    jurisdictionKey: "US-NE",
    category: "legislative_powers",
    node: "regular_veto",
    acceptedStatus: "KNOWN",
    citation: "Neb. Const. art. IV § 15",
    disposition: "deferred-to-r3j",
    targetFields: [],
    reason:
      "R3H routes the legislative_powers category to R3J. This node is not compiled here because LegislativeRulePack owns presentment, veto and override.",
  },
  {
    jurisdictionKey: "US-NE",
    category: "legislative_powers",
    node: "item_partial_veto",
    acceptedStatus: "KNOWN",
    citation: "Neb. Const. art. IV § 15",
    disposition: "deferred-to-r3j",
    targetFields: [],
    reason:
      "R3H routes the legislative_powers category to R3J. This node is not compiled here because LegislativeRulePack owns presentment, veto and override.",
  },
  {
    jurisdictionKey: "US-NE",
    category: "legislative_powers",
    node: "override_threshold",
    acceptedStatus: "KNOWN",
    citation: "Neb. Const. art. IV § 15",
    disposition: "deferred-to-r3j",
    targetFields: [],
    reason:
      "R3H routes the legislative_powers category to R3J. This node is not compiled here because LegislativeRulePack owns presentment, veto and override.",
  },
  {
    jurisdictionKey: "US-NE",
    category: "legislative_powers",
    node: "special_session_call",
    acceptedStatus: "KNOWN",
    citation: "Neb. Const. art. IV § 8",
    disposition: "deferred-to-r3j",
    targetFields: [],
    reason:
      "R3H routes the legislative_powers category to R3J. This node is not compiled here even though specialSession.* is an executive-authority field with an exact consumer, because category ownership, not contract shape, withholds it.",
  },
  {
    jurisdictionKey: "US-NE",
    category: "legislative_powers",
    node: "special_session_agenda_restriction",
    acceptedStatus: "KNOWN",
    citation: "Neb. Const. art. IV § 8",
    disposition: "deferred-to-r3j",
    targetFields: [],
    reason:
      "R3H routes the legislative_powers category to R3J. This node is not compiled here even though specialSession.* is an executive-authority field with an exact consumer, because category ownership, not contract shape, withholds it.",
  },
  {
    jurisdictionKey: "US-NE",
    category: "legislative_powers",
    node: "legislative_rule_pack_cross_reference",
    acceptedStatus: "KNOWN",
    citation: "src/simulation/legislature-rule-packs.ts#us-ne-legislature-v1",
    disposition: "already-represented",
    targetFields: ["presentment.legislativeRulePackId"],
    reason:
      "The accepted cross-reference names exactly the legislative pack the compiled executive pack already resolves through presentment.legislativeRulePackId.",
  },
  {
    jurisdictionKey: "US-NE",
    category: "clemency",
    node: "pardon",
    acceptedStatus: "KNOWN",
    citation: "Neb. Const. art. IV § 13",
    disposition: "newly-compiled",
    targetFields: ["clemency.model", "clemency.scope"],
    reason:
      "The three accepted component grants agree and affirmatively name who holds the power (a Board of Pardons composed of the Governor, Attorney General and Secretary of State), which establishes the composite board-exclusive model. Scope carries the accepted component names and the accepted value verbatim.",
  },
  {
    jurisdictionKey: "US-NE",
    category: "clemency",
    node: "commutation",
    acceptedStatus: "KNOWN",
    citation: "Neb. Const. art. IV § 13",
    disposition: "newly-compiled",
    targetFields: ["clemency.model", "clemency.scope"],
    reason:
      "The three accepted component grants agree and affirmatively name who holds the power (a Board of Pardons composed of the Governor, Attorney General and Secretary of State), which establishes the composite board-exclusive model. Scope carries the accepted component names and the accepted value verbatim.",
  },
  {
    jurisdictionKey: "US-NE",
    category: "clemency",
    node: "reprieve",
    acceptedStatus: "KNOWN",
    citation: "Neb. Const. art. IV § 13",
    disposition: "newly-compiled",
    targetFields: ["clemency.model", "clemency.scope"],
    reason:
      "The three accepted component grants agree and affirmatively name who holds the power (a Board of Pardons composed of the Governor, Attorney General and Secretary of State), which establishes the composite board-exclusive model. Scope carries the accepted component names and the accepted value verbatim.",
  },
  {
    jurisdictionKey: "US-NE",
    category: "budget",
    node: "executive_budget_submission_duty",
    acceptedStatus: "KNOWN",
    citation: "Neb. Const. art. IV § 7",
    disposition: "newly-compiled",
    targetFields: ["budgetSubmission.executiveMustSubmit"],
    reason:
      "Compiled directly: the accepted node resolves this field exactly, at the field's own shape.",
  },
  {
    jurisdictionKey: "US-NE",
    category: "plural_executive_constraints",
    node: "independently_elected_officers",
    acceptedStatus: "KNOWN",
    citation: "Neb. Const. art. IV § 1",
    disposition: "already-represented",
    targetFields: ["pluralExecutive"],
    reason:
      "The accepted independently-elected officer set is already carried by the pack's pluralExecutive list (empty for a unitary branch), and agrees with the accepted node.",
  },
  {
    jurisdictionKey: "US-NE",
    category: "guard",
    node: "commands_militia",
    acceptedStatus: "KNOWN",
    citation: "Neb. Const. art. IV § 14",
    disposition: "newly-compiled",
    targetFields: ["guard.commandsMilitia"],
    reason:
      "Compiled directly: the accepted node resolves this field exactly, at the field's own shape.",
  },
  {
    jurisdictionKey: "US-NE",
    category: "guard",
    node: "scope",
    acceptedStatus: "KNOWN",
    citation: "Neb. Const. art. IV § 14",
    disposition: "newly-compiled",
    targetFields: ["guard.scope"],
    reason:
      "Compiled directly: the accepted node resolves this field exactly, at the field's own shape.",
  },
  {
    jurisdictionKey: "US-NE",
    category: "branch_structure",
    node: "branch_structure",
    acceptedStatus: "KNOWN",
    citation: "Neb. Const. art. IV § 1",
    disposition: "already-represented",
    targetFields: ["office.branchStructure"],
    reason:
      "The accepted branch structure is already carried by office.branchStructure on the compiled pack, at the same value; no runtime change is required.",
  },
  {
    jurisdictionKey: "US-AK",
    category: "identity_selection",
    node: "governor_selection",
    acceptedStatus: "KNOWN",
    citation: "Alaska Const. art. III § 3",
    disposition: "no-exact-consumer",
    targetFields: [],
    reason:
      "The accepted executive-authority contract carries no election, term-length, term-limit, lieutenant-governor or succession field. R3I adds no schema to consume this node; it is recorded and left uncompiled.",
  },
  {
    jurisdictionKey: "US-AK",
    category: "identity_selection",
    node: "lt_governor_relationship",
    acceptedStatus: "KNOWN",
    citation: "Alaska Const. art. III § 8",
    disposition: "no-exact-consumer",
    targetFields: [],
    reason:
      "The accepted executive-authority contract carries no election, term-length, term-limit, lieutenant-governor or succession field. R3I adds no schema to consume this node; it is recorded and left uncompiled.",
  },
  {
    jurisdictionKey: "US-AK",
    category: "identity_selection",
    node: "term_years",
    acceptedStatus: "KNOWN",
    citation: "Alaska Const. art. III § 4",
    disposition: "no-exact-consumer",
    targetFields: [],
    reason:
      "The accepted executive-authority contract carries no election, term-length, term-limit, lieutenant-governor or succession field. R3I adds no schema to consume this node; it is recorded and left uncompiled.",
  },
  {
    jurisdictionKey: "US-AK",
    category: "identity_selection",
    node: "term_limits",
    acceptedStatus: "KNOWN",
    citation: "Alaska Const. art. III § 5",
    disposition: "no-exact-consumer",
    targetFields: [],
    reason:
      "The accepted executive-authority contract carries no election, term-length, term-limit, lieutenant-governor or succession field. R3I adds no schema to consume this node; it is recorded and left uncompiled.",
  },
  {
    jurisdictionKey: "US-AK",
    category: "identity_selection",
    node: "succession_basics",
    acceptedStatus: "KNOWN",
    citation: "Alaska Const. art. III, §§ 9, 11, 12",
    disposition: "no-exact-consumer",
    targetFields: [],
    reason:
      "The accepted executive-authority contract carries no election, term-length, term-limit, lieutenant-governor or succession field. R3I adds no schema to consume this node; it is recorded and left uncompiled.",
  },
  {
    jurisdictionKey: "US-AK",
    category: "appointments",
    node: "cabinet_department_heads",
    acceptedStatus: "KNOWN",
    citation: "Alaska Const. art. III § 25",
    disposition: "already-represented",
    targetFields: [
      "appointment.executiveAppoints",
      "appointment.legislativeConfirmationRequired",
      "appointment.confirmingBody",
    ],
    reason:
      "Already carried by the Alaska pack from Alaska Const. Art. III, Sec. 25.",
  },
  {
    jurisdictionKey: "US-AK",
    category: "appointments",
    node: "appointment_authority",
    acceptedStatus: "KNOWN",
    citation: "Alaska Const. art. III § 25",
    disposition: "already-represented",
    targetFields: [
      "appointment.executiveAppoints",
      "appointment.legislativeConfirmationRequired",
      "appointment.confirmingBody",
    ],
    reason:
      "Already carried by the Alaska pack from Alaska Const. Art. III, Sec. 25.",
  },
  {
    jurisdictionKey: "US-AK",
    category: "appointments",
    node: "confirmation_requirement",
    acceptedStatus: "KNOWN",
    citation: "Alaska Const. art. III § 25",
    disposition: "already-represented",
    targetFields: [
      "appointment.executiveAppoints",
      "appointment.legislativeConfirmationRequired",
      "appointment.confirmingBody",
    ],
    reason:
      "Already carried by the Alaska pack from Alaska Const. Art. III, Sec. 25.",
  },
  {
    jurisdictionKey: "US-AK",
    category: "appointments",
    node: "removal_method",
    acceptedStatus: "KNOWN",
    citation: "Alaska Const. art. III § 25",
    disposition: "newly-compiled",
    targetFields: ["removal.mode"],
    reason:
      "Compiled directly: the accepted value states appointees serve at the Governor's pleasure, which is exactly removal.mode 'at-pleasure'.",
  },
  {
    jurisdictionKey: "US-AK",
    category: "legislative_powers",
    node: "regular_veto",
    acceptedStatus: "KNOWN",
    citation: "Alaska Const. art. II § 17",
    disposition: "deferred-to-r3j",
    targetFields: [],
    reason:
      "R3H routes the legislative_powers category to R3J. This node is not compiled here because LegislativeRulePack owns presentment, veto and override.",
  },
  {
    jurisdictionKey: "US-AK",
    category: "legislative_powers",
    node: "item_partial_veto",
    acceptedStatus: "KNOWN",
    citation: "Alaska Const. art. II § 15",
    disposition: "deferred-to-r3j",
    targetFields: [],
    reason:
      "R3H routes the legislative_powers category to R3J. This node is not compiled here because LegislativeRulePack owns presentment, veto and override.",
  },
  {
    jurisdictionKey: "US-AK",
    category: "legislative_powers",
    node: "override_threshold",
    acceptedStatus: "KNOWN",
    citation: "Alaska Const. art. II § 16",
    disposition: "deferred-to-r3j",
    targetFields: [],
    reason:
      "R3H routes the legislative_powers category to R3J. This node is not compiled here because LegislativeRulePack owns presentment, veto and override.",
  },
  {
    jurisdictionKey: "US-AK",
    category: "legislative_powers",
    node: "special_session_call",
    acceptedStatus: "KNOWN",
    citation: "Alaska Const. art. II § 9",
    disposition: "deferred-to-r3j",
    targetFields: [],
    reason:
      "R3H routes the legislative_powers category to R3J. This node is not compiled here even though specialSession.* is an executive-authority field with an exact consumer, because category ownership, not contract shape, withholds it.",
  },
  {
    jurisdictionKey: "US-AK",
    category: "legislative_powers",
    node: "special_session_agenda_restriction",
    acceptedStatus: "KNOWN",
    citation: "Alaska Const. art. II § 9",
    disposition: "deferred-to-r3j",
    targetFields: [],
    reason:
      "R3H routes the legislative_powers category to R3J. This node is not compiled here even though specialSession.* is an executive-authority field with an exact consumer, because category ownership, not contract shape, withholds it.",
  },
  {
    jurisdictionKey: "US-AK",
    category: "legislative_powers",
    node: "other_presentment_powers",
    acceptedStatus: "KNOWN",
    citation: "Alaska Const. art. II § 15",
    disposition: "deferred-to-r3j",
    targetFields: [],
    reason:
      "R3H routes the legislative_powers category to R3J. This node is not compiled here because LegislativeRulePack owns presentment, veto and override.",
  },
  {
    jurisdictionKey: "US-AK",
    category: "legislative_powers",
    node: "legislative_rule_pack_cross_reference",
    acceptedStatus: "KNOWN",
    citation: "src/simulation/legislature-rule-packs.ts#us-ak-legislature-v1",
    disposition: "already-represented",
    targetFields: ["presentment.legislativeRulePackId"],
    reason:
      "The accepted cross-reference names exactly the legislative pack the compiled executive pack already resolves through presentment.legislativeRulePackId.",
  },
  {
    jurisdictionKey: "US-AK",
    category: "administrative_powers",
    node: "reorganization_authority",
    acceptedStatus: "KNOWN",
    citation: "Alaska Const. art. III § 23",
    disposition: "newly-compiled",
    targetFields: ["reorganization.executiveMayReorganize"],
    reason:
      "Compiled directly: the accepted node establishes that the executive may reorganize.",
  },
  {
    jurisdictionKey: "US-AK",
    category: "administrative_powers",
    node: "reorganization_sunset_ratification",
    acceptedStatus: "KNOWN",
    citation: "Alaska Const. art. III § 23",
    disposition: "newly-compiled",
    targetFields: ["reorganization.legislativeDisapprovalAvailable"],
    reason:
      "Compiled into legislativeDisapprovalAvailable only. The accepted value establishes a legislative disapproval window over a reorganization order; it does not establish that the grant of reorganization authority itself expires, so reorganization.sunset stays unknown, and the window's day count has no contract field.",
  },
  {
    jurisdictionKey: "US-AK",
    category: "clemency",
    node: "pardon",
    acceptedStatus: "KNOWN",
    citation: "Alaska Const. art. III § 21",
    disposition: "newly-compiled",
    targetFields: ["clemency.scope"],
    reason:
      "Scope only. The accepted value states the power is gubernatorial but subject to procedure or application rules prescribed by law, which does not settle whether a statutory board may block or hold the power; clemency.model therefore stays unknown rather than being promoted to executive-sole from silence about a board.",
  },
  {
    jurisdictionKey: "US-AK",
    category: "clemency",
    node: "commutation",
    acceptedStatus: "KNOWN",
    citation: "Alaska Const. art. III § 21",
    disposition: "newly-compiled",
    targetFields: ["clemency.scope"],
    reason:
      "Scope only. The accepted value states the power is gubernatorial but subject to procedure or application rules prescribed by law, which does not settle whether a statutory board may block or hold the power; clemency.model therefore stays unknown rather than being promoted to executive-sole from silence about a board.",
  },
  {
    jurisdictionKey: "US-AK",
    category: "clemency",
    node: "reprieve",
    acceptedStatus: "KNOWN",
    citation: "Alaska Const. art. III § 21",
    disposition: "newly-compiled",
    targetFields: ["clemency.scope"],
    reason:
      "Scope only. The accepted value states the power is gubernatorial but subject to procedure or application rules prescribed by law, which does not settle whether a statutory board may block or hold the power; clemency.model therefore stays unknown rather than being promoted to executive-sole from silence about a board.",
  },
  {
    jurisdictionKey: "US-AK",
    category: "budget",
    node: "executive_budget_submission_duty",
    acceptedStatus: "KNOWN",
    citation: "Alaska Const. art. IX § 12",
    disposition: "newly-compiled",
    targetFields: ["budgetSubmission.executiveMustSubmit"],
    reason:
      "Compiled directly: the accepted node resolves this field exactly, at the field's own shape.",
  },
  {
    jurisdictionKey: "US-AK",
    category: "plural_executive_constraints",
    node: "independently_elected_officers",
    acceptedStatus: "KNOWN",
    citation: "Alaska Const. art. III, §§ 1, 8, 22, 25, 26",
    disposition: "already-represented",
    targetFields: ["pluralExecutive"],
    reason:
      "The accepted independently-elected officer set is already carried by the pack's pluralExecutive list (empty for a unitary branch), and agrees with the accepted node.",
  },
  {
    jurisdictionKey: "US-AK",
    category: "guard",
    node: "commands_militia",
    acceptedStatus: "KNOWN",
    citation: "Alaska Const. art. III § 19",
    disposition: "newly-compiled",
    targetFields: ["guard.commandsMilitia"],
    reason:
      "Compiled directly: the accepted node resolves this field exactly, at the field's own shape.",
  },
  {
    jurisdictionKey: "US-AK",
    category: "guard",
    node: "scope",
    acceptedStatus: "KNOWN",
    citation: "Alaska Const. art. III § 19",
    disposition: "newly-compiled",
    targetFields: ["guard.scope"],
    reason:
      "Compiled directly: the accepted node resolves this field exactly, at the field's own shape.",
  },
  {
    jurisdictionKey: "US-AK",
    category: "branch_structure",
    node: "branch_structure",
    acceptedStatus: "KNOWN",
    citation: "Alaska Const. art. III § 1",
    disposition: "already-represented",
    targetFields: ["office.branchStructure"],
    reason:
      "The accepted branch structure is already carried by office.branchStructure on the compiled pack, at the same value; no runtime change is required.",
  },
  {
    jurisdictionKey: "US-MN",
    category: "identity_selection",
    node: "governor_selection",
    acceptedStatus: "KNOWN",
    citation: "Minn. Const. art. V § 1",
    disposition: "no-exact-consumer",
    targetFields: [],
    reason:
      "The accepted executive-authority contract carries no election, term-length, term-limit, lieutenant-governor or succession field. R3I adds no schema to consume this node; it is recorded and left uncompiled.",
  },
  {
    jurisdictionKey: "US-MN",
    category: "identity_selection",
    node: "lt_governor_relationship",
    acceptedStatus: "KNOWN",
    citation: "Minn. Const. art. V § 1",
    disposition: "no-exact-consumer",
    targetFields: [],
    reason:
      "The accepted executive-authority contract carries no election, term-length, term-limit, lieutenant-governor or succession field. R3I adds no schema to consume this node; it is recorded and left uncompiled.",
  },
  {
    jurisdictionKey: "US-MN",
    category: "identity_selection",
    node: "term_years",
    acceptedStatus: "KNOWN",
    citation: "Minn. Const. art. V § 2",
    disposition: "no-exact-consumer",
    targetFields: [],
    reason:
      "The accepted executive-authority contract carries no election, term-length, term-limit, lieutenant-governor or succession field. R3I adds no schema to consume this node; it is recorded and left uncompiled.",
  },
  {
    jurisdictionKey: "US-MN",
    category: "identity_selection",
    node: "succession_basics",
    acceptedStatus: "KNOWN",
    citation: "Minn. Const. art. V § 5",
    disposition: "no-exact-consumer",
    targetFields: [],
    reason:
      "The accepted executive-authority contract carries no election, term-length, term-limit, lieutenant-governor or succession field. R3I adds no schema to consume this node; it is recorded and left uncompiled.",
  },
  {
    jurisdictionKey: "US-MN",
    category: "appointments",
    node: "cabinet_department_heads",
    acceptedStatus: "KNOWN",
    citation: "Minn. Stat. § 15.06 subd. 1 & 2; Minn. Stat. § 15.066",
    disposition: "newly-compiled",
    targetFields: ["appointment.executiveAppoints"],
    reason:
      "Compiled directly: the accepted node establishes a general power to appoint the principal officers of the executive branch, which is exactly this field.",
  },
  {
    jurisdictionKey: "US-MN",
    category: "appointments",
    node: "confirmation_requirement",
    acceptedStatus: "KNOWN",
    citation:
      "Minn. Stat. § 15.066 subd. 1 & 3; Minn. Stat. § 15.06 subd. 2; Minn. Const. art. V § 3",
    disposition: "newly-compiled",
    targetFields: [
      "appointment.legislativeConfirmationRequired",
      "appointment.confirmingBody",
    ],
    reason:
      "Compiled directly. The accepted value names the confirming body and that confirmation is required; its vote threshold has no contract field and is carried in the source note.",
  },
  {
    jurisdictionKey: "US-MN",
    category: "legislative_powers",
    node: "regular_veto",
    acceptedStatus: "KNOWN",
    citation: "Minn. Const. art. IV § 23",
    disposition: "deferred-to-r3j",
    targetFields: [],
    reason:
      "R3H routes the legislative_powers category to R3J. This node is not compiled here because LegislativeRulePack owns presentment, veto and override.",
  },
  {
    jurisdictionKey: "US-MN",
    category: "legislative_powers",
    node: "item_partial_veto",
    acceptedStatus: "KNOWN",
    citation: "Minn. Const. art. IV § 23",
    disposition: "deferred-to-r3j",
    targetFields: [],
    reason:
      "R3H routes the legislative_powers category to R3J. This node is not compiled here because LegislativeRulePack owns presentment, veto and override.",
  },
  {
    jurisdictionKey: "US-MN",
    category: "legislative_powers",
    node: "override_threshold",
    acceptedStatus: "KNOWN",
    citation: "Minn. Const. art. IV § 23",
    disposition: "deferred-to-r3j",
    targetFields: [],
    reason:
      "R3H routes the legislative_powers category to R3J. This node is not compiled here because LegislativeRulePack owns presentment, veto and override.",
  },
  {
    jurisdictionKey: "US-MN",
    category: "legislative_powers",
    node: "special_session_call",
    acceptedStatus: "KNOWN",
    citation: "Minn. Const. art. IV § 12",
    disposition: "deferred-to-r3j",
    targetFields: [],
    reason:
      "R3H routes the legislative_powers category to R3J. This node is not compiled here even though specialSession.* is an executive-authority field with an exact consumer, because category ownership, not contract shape, withholds it.",
  },
  {
    jurisdictionKey: "US-MN",
    category: "legislative_powers",
    node: "legislative_rule_pack_cross_reference",
    acceptedStatus: "KNOWN",
    citation: "src/simulation/legislature-rule-packs.ts#us-mn-legislature-v1",
    disposition: "already-represented",
    targetFields: ["presentment.legislativeRulePackId"],
    reason:
      "The accepted cross-reference names exactly the legislative pack the compiled executive pack already resolves through presentment.legislativeRulePackId.",
  },
  {
    jurisdictionKey: "US-MN",
    category: "emergency_powers",
    node: "declaration_authority",
    acceptedStatus: "KNOWN",
    citation: "Minn. Stat. § 12.31 subd. 2",
    disposition: "newly-compiled",
    targetFields: ["emergencyDeclaration.executiveMayDeclare"],
    reason:
      "Compiled directly: the accepted node establishes the declaration power.",
  },
  {
    jurisdictionKey: "US-MN",
    category: "emergency_powers",
    node: "duration",
    acceptedStatus: "KNOWN",
    citation: "Minn. Stat. § 12.31 subd. 2",
    disposition: "newly-compiled",
    targetFields: [
      "emergencyDeclaration.initialDurationDays",
      "emergencyDeclaration.extension",
    ],
    reason:
      "The accepted value states an exact five-day initial duration and the mechanism by which it is extended, so both fields are resolved from it.",
  },
  {
    jurisdictionKey: "US-MN",
    category: "emergency_powers",
    node: "legislative_extension_termination",
    acceptedStatus: "KNOWN",
    citation: "Minn. Stat. § 12.31 subd. 2",
    disposition: "newly-compiled",
    targetFields: ["emergencyDeclaration.legislativeTermination"],
    reason:
      "Compiled into legislativeTermination only. The accepted value establishes how the legislature terminates a declaration; it does not establish how the executive extends one, so emergencyDeclaration.extension is not filled from it.",
  },
  {
    jurisdictionKey: "US-MN",
    category: "budget",
    node: "executive_budget_submission_duty",
    acceptedStatus: "KNOWN",
    citation: "Minn. Stat. § 16A.11 subd. 1",
    disposition: "newly-compiled",
    targetFields: ["budgetSubmission.executiveMustSubmit"],
    reason:
      "Compiled directly: the accepted node resolves this field exactly, at the field's own shape.",
  },
  {
    jurisdictionKey: "US-MN",
    category: "budget",
    node: "timing",
    acceptedStatus: "KNOWN",
    citation: "Minn. Stat. § 16A.11 subd. 1",
    disposition: "newly-compiled",
    targetFields: ["budgetSubmission.submissionDeadline"],
    reason:
      "Compiled directly: the accepted node resolves this field exactly, at the field's own shape.",
  },
  {
    jurisdictionKey: "US-MN",
    category: "plural_executive_constraints",
    node: "independently_elected_officers",
    acceptedStatus: "KNOWN",
    citation: "Minn. Const. art. V § 1",
    disposition: "already-represented",
    targetFields: ["pluralExecutive"],
    reason:
      "The accepted independently-elected officer set is already carried by the pack's pluralExecutive list (empty for a unitary branch), and agrees with the accepted node.",
  },
  {
    jurisdictionKey: "US-MN",
    category: "guard",
    node: "commands_militia",
    acceptedStatus: "KNOWN",
    citation: "Minn. Const. art. V § 3",
    disposition: "newly-compiled",
    targetFields: ["guard.commandsMilitia"],
    reason:
      "Compiled directly: the accepted node resolves this field exactly, at the field's own shape.",
  },
  {
    jurisdictionKey: "US-MN",
    category: "guard",
    node: "scope",
    acceptedStatus: "KNOWN",
    citation: "Minn. Const. art. V § 3",
    disposition: "newly-compiled",
    targetFields: ["guard.scope"],
    reason:
      "Compiled directly: the accepted node resolves this field exactly, at the field's own shape.",
  },
  {
    jurisdictionKey: "US-MN",
    category: "branch_structure",
    node: "branch_structure",
    acceptedStatus: "KNOWN",
    citation: "Minn. Const. art. V § 1",
    disposition: "already-represented",
    targetFields: ["office.branchStructure"],
    reason:
      "The accepted branch structure is already carried by office.branchStructure on the compiled pack, at the same value; no runtime change is required.",
  },
  {
    jurisdictionKey: "US-IL",
    category: "identity_selection",
    node: "governor_selection",
    acceptedStatus: "KNOWN",
    citation: "Ill. Const. art. V § 1",
    disposition: "no-exact-consumer",
    targetFields: [],
    reason:
      "The accepted executive-authority contract carries no election, term-length, term-limit, lieutenant-governor or succession field. R3I adds no schema to consume this node; it is recorded and left uncompiled.",
  },
  {
    jurisdictionKey: "US-IL",
    category: "identity_selection",
    node: "lt_governor_relationship",
    acceptedStatus: "KNOWN",
    citation: "Ill. Const. art. V § 4",
    disposition: "no-exact-consumer",
    targetFields: [],
    reason:
      "The accepted executive-authority contract carries no election, term-length, term-limit, lieutenant-governor or succession field. R3I adds no schema to consume this node; it is recorded and left uncompiled.",
  },
  {
    jurisdictionKey: "US-IL",
    category: "identity_selection",
    node: "term_years",
    acceptedStatus: "KNOWN",
    citation: "Ill. Const. art. V § 2",
    disposition: "no-exact-consumer",
    targetFields: [],
    reason:
      "The accepted executive-authority contract carries no election, term-length, term-limit, lieutenant-governor or succession field. R3I adds no schema to consume this node; it is recorded and left uncompiled.",
  },
  {
    jurisdictionKey: "US-IL",
    category: "identity_selection",
    node: "succession_basics",
    acceptedStatus: "KNOWN",
    citation: "Ill. Const. art. V § 6(a)",
    disposition: "no-exact-consumer",
    targetFields: [],
    reason:
      "The accepted executive-authority contract carries no election, term-length, term-limit, lieutenant-governor or succession field. R3I adds no schema to consume this node; it is recorded and left uncompiled.",
  },
  {
    jurisdictionKey: "US-IL",
    category: "appointments",
    node: "cabinet_department_heads",
    acceptedStatus: "KNOWN",
    citation: "Ill. Const. art. V § 9(a)",
    disposition: "newly-compiled",
    targetFields: ["appointment.executiveAppoints"],
    reason:
      "Compiled directly: the accepted node establishes a general power to appoint the principal officers of the executive branch, which is exactly this field.",
  },
  {
    jurisdictionKey: "US-IL",
    category: "appointments",
    node: "appointment_authority",
    acceptedStatus: "KNOWN",
    citation: "Ill. Const. art. V § 9(a)",
    disposition: "newly-compiled",
    targetFields: ["appointment.executiveAppoints"],
    reason:
      "Compiled directly: the accepted node establishes a general power to appoint the principal officers of the executive branch, which is exactly this field.",
  },
  {
    jurisdictionKey: "US-IL",
    category: "appointments",
    node: "confirmation_requirement",
    acceptedStatus: "KNOWN",
    citation: "Ill. Const. art. V § 9(a)",
    disposition: "newly-compiled",
    targetFields: [
      "appointment.legislativeConfirmationRequired",
      "appointment.confirmingBody",
    ],
    reason:
      "Compiled directly. The accepted value names the confirming body and that confirmation is required; its vote threshold has no contract field and is carried in the source note.",
  },
  {
    jurisdictionKey: "US-IL",
    category: "appointments",
    node: "recess_interim_appointments",
    acceptedStatus: "KNOWN",
    citation: "Ill. Const. art. V § 9(b)",
    disposition: "no-exact-consumer",
    targetFields: [],
    reason:
      "The accepted executive-authority contract carries no recess or interim appointment field. The node is recorded and left uncompiled; no schema is added to consume it.",
  },
  {
    jurisdictionKey: "US-IL",
    category: "appointments",
    node: "removal_method",
    acceptedStatus: "KNOWN",
    citation: "Ill. Const. art. V § 10",
    disposition: "newly-compiled",
    targetFields: ["removal.mode"],
    reason:
      "Compiled directly: the accepted value states removal requires stated cause, which is exactly removal.mode 'for-cause'.",
  },
  {
    jurisdictionKey: "US-IL",
    category: "legislative_powers",
    node: "regular_veto",
    acceptedStatus: "KNOWN",
    citation: "Ill. Const. art. IV § 9(b)",
    disposition: "deferred-to-r3j",
    targetFields: [],
    reason:
      "R3H routes the legislative_powers category to R3J. This node is not compiled here because LegislativeRulePack owns presentment, veto and override.",
  },
  {
    jurisdictionKey: "US-IL",
    category: "legislative_powers",
    node: "item_partial_veto",
    acceptedStatus: "KNOWN",
    citation: "Ill. Const. art. IV § 9(d)",
    disposition: "deferred-to-r3j",
    targetFields: [],
    reason:
      "R3H routes the legislative_powers category to R3J. This node is not compiled here because LegislativeRulePack owns presentment, veto and override.",
  },
  {
    jurisdictionKey: "US-IL",
    category: "legislative_powers",
    node: "override_threshold",
    acceptedStatus: "KNOWN",
    citation: "Ill. Const. art. IV § 9(c)",
    disposition: "deferred-to-r3j",
    targetFields: [],
    reason:
      "R3H routes the legislative_powers category to R3J. This node is not compiled here because LegislativeRulePack owns presentment, veto and override.",
  },
  {
    jurisdictionKey: "US-IL",
    category: "legislative_powers",
    node: "special_session_call",
    acceptedStatus: "KNOWN",
    citation: "Ill. Const. art. IV § 5(b)",
    disposition: "deferred-to-r3j",
    targetFields: [],
    reason:
      "R3H routes the legislative_powers category to R3J. This node is not compiled here even though specialSession.* is an executive-authority field with an exact consumer, because category ownership, not contract shape, withholds it.",
  },
  {
    jurisdictionKey: "US-IL",
    category: "legislative_powers",
    node: "special_session_agenda_restriction",
    acceptedStatus: "KNOWN",
    citation: "Ill. Const. art. IV § 5(b)",
    disposition: "deferred-to-r3j",
    targetFields: [],
    reason:
      "R3H routes the legislative_powers category to R3J. This node is not compiled here even though specialSession.* is an executive-authority field with an exact consumer, because category ownership, not contract shape, withholds it.",
  },
  {
    jurisdictionKey: "US-IL",
    category: "legislative_powers",
    node: "other_presentment_powers",
    acceptedStatus: "KNOWN",
    citation: "Ill. Const. art. IV § 9(e)",
    disposition: "deferred-to-r3j",
    targetFields: [],
    reason:
      "R3H routes the legislative_powers category to R3J. This node is not compiled here because LegislativeRulePack owns presentment, veto and override.",
  },
  {
    jurisdictionKey: "US-IL",
    category: "legislative_powers",
    node: "legislative_rule_pack_cross_reference",
    acceptedStatus: "KNOWN",
    citation:
      "src/simulation/legislature-rule-packs.ts#us-il-general-assembly-v1",
    disposition: "already-represented",
    targetFields: ["presentment.legislativeRulePackId"],
    reason:
      "The accepted cross-reference names exactly the legislative pack the compiled executive pack already resolves through presentment.legislativeRulePackId.",
  },
  {
    jurisdictionKey: "US-IL",
    category: "administrative_powers",
    node: "reorganization_authority",
    acceptedStatus: "KNOWN",
    citation: "Ill. Const. art. V § 11",
    disposition: "newly-compiled",
    targetFields: ["reorganization.executiveMayReorganize"],
    reason:
      "Compiled directly: the accepted node establishes that the executive may reorganize.",
  },
  {
    jurisdictionKey: "US-IL",
    category: "administrative_powers",
    node: "reorganization_sunset_ratification",
    acceptedStatus: "KNOWN",
    citation: "Ill. Const. art. V § 11",
    disposition: "newly-compiled",
    targetFields: ["reorganization.legislativeDisapprovalAvailable"],
    reason:
      "Compiled into legislativeDisapprovalAvailable only. The accepted value establishes a legislative disapproval window over a reorganization order; it does not establish that the grant of reorganization authority itself expires, so reorganization.sunset stays unknown, and the window's day count has no contract field.",
  },
  {
    jurisdictionKey: "US-IL",
    category: "emergency_powers",
    node: "declaration_authority",
    acceptedStatus: "KNOWN",
    citation: "20 ILCS 3305/7",
    disposition: "newly-compiled",
    targetFields: ["emergencyDeclaration.executiveMayDeclare"],
    reason:
      "Compiled directly: the accepted node establishes the declaration power.",
  },
  {
    jurisdictionKey: "US-IL",
    category: "emergency_powers",
    node: "duration",
    acceptedStatus: "KNOWN",
    citation: "20 ILCS 3305/7",
    disposition: "newly-compiled",
    targetFields: ["emergencyDeclaration.initialDurationDays"],
    reason:
      "The accepted value states an exact thirty-day duration per proclamation. It states no extension mechanism, so emergencyDeclaration.extension stays unknown.",
  },
  {
    jurisdictionKey: "US-IL",
    category: "clemency",
    node: "pardon",
    acceptedStatus: "KNOWN",
    citation: "Ill. Const. art. V § 12",
    disposition: "newly-compiled",
    targetFields: ["clemency.scope"],
    reason:
      "Scope only. The accepted value states the power is gubernatorial but subject to procedure or application rules prescribed by law, which does not settle whether a statutory board may block or hold the power; clemency.model therefore stays unknown rather than being promoted to executive-sole from silence about a board.",
  },
  {
    jurisdictionKey: "US-IL",
    category: "clemency",
    node: "commutation",
    acceptedStatus: "KNOWN",
    citation: "Ill. Const. art. V § 12",
    disposition: "newly-compiled",
    targetFields: ["clemency.scope"],
    reason:
      "Scope only. The accepted value states the power is gubernatorial but subject to procedure or application rules prescribed by law, which does not settle whether a statutory board may block or hold the power; clemency.model therefore stays unknown rather than being promoted to executive-sole from silence about a board.",
  },
  {
    jurisdictionKey: "US-IL",
    category: "clemency",
    node: "reprieve",
    acceptedStatus: "KNOWN",
    citation: "Ill. Const. art. V § 12",
    disposition: "newly-compiled",
    targetFields: ["clemency.scope"],
    reason:
      "Scope only. The accepted value states the power is gubernatorial but subject to procedure or application rules prescribed by law, which does not settle whether a statutory board may block or hold the power; clemency.model therefore stays unknown rather than being promoted to executive-sole from silence about a board.",
  },
  {
    jurisdictionKey: "US-IL",
    category: "budget",
    node: "executive_budget_submission_duty",
    acceptedStatus: "KNOWN",
    citation: "Ill. Const. art. VIII § 2(a)",
    disposition: "newly-compiled",
    targetFields: ["budgetSubmission.executiveMustSubmit"],
    reason:
      "Compiled directly: the accepted node resolves this field exactly, at the field's own shape.",
  },
  {
    jurisdictionKey: "US-IL",
    category: "budget",
    node: "timing",
    acceptedStatus: "KNOWN",
    citation: "15 ILCS 20/50-5",
    disposition: "newly-compiled",
    targetFields: ["budgetSubmission.submissionDeadline"],
    reason:
      "Compiled directly: the accepted node resolves this field exactly, at the field's own shape.",
  },
  {
    jurisdictionKey: "US-IL",
    category: "plural_executive_constraints",
    node: "independently_elected_officers",
    acceptedStatus: "KNOWN",
    citation: "Ill. Const. art. V § 1",
    disposition: "already-represented",
    targetFields: ["pluralExecutive"],
    reason:
      "The accepted independently-elected officer set is already carried by the pack's pluralExecutive list (empty for a unitary branch), and agrees with the accepted node.",
  },
  {
    jurisdictionKey: "US-IL",
    category: "guard",
    node: "commands_militia",
    acceptedStatus: "KNOWN",
    citation: "Ill. Const. art. XII § 4",
    disposition: "newly-compiled",
    targetFields: ["guard.commandsMilitia"],
    reason:
      "Compiled directly: the accepted node resolves this field exactly, at the field's own shape.",
  },
  {
    jurisdictionKey: "US-IL",
    category: "guard",
    node: "scope",
    acceptedStatus: "KNOWN",
    citation: "Ill. Const. art. XII § 4",
    disposition: "newly-compiled",
    targetFields: ["guard.scope"],
    reason:
      "Compiled directly: the accepted node resolves this field exactly, at the field's own shape.",
  },
  {
    jurisdictionKey: "US-IL",
    category: "branch_structure",
    node: "branch_structure",
    acceptedStatus: "KNOWN",
    citation: "Ill. Const. art. V § 1",
    disposition: "already-represented",
    targetFields: ["office.branchStructure"],
    reason:
      "The accepted branch structure is already carried by office.branchStructure on the compiled pack, at the same value; no runtime change is required.",
  },
];

/** Counts by disposition, for the completion report and the evidence export. */
export function summarizeR3hReconciliation(): Record<R3hDisposition, number> {
  const summary: Record<R3hDisposition, number> = {
    "newly-compiled": 0,
    "already-represented": 0,
    "deferred-to-r3j": 0,
    "no-exact-consumer": 0,
    "blocked-by-contract-mismatch": 0,
  };
  for (const entry of R3H_NODE_RECONCILIATION) {
    summary[entry.disposition] += 1;
  }
  return summary;
}

/**
 * Resolves a dotted reconciliation path against a pack and reports whether the
 * runtime actually carries a resolved value there.
 *
 * `pluralExecutive` is special: an empty list is the resolved value for a
 * unitary branch, and a non-empty one is resolved only if every officer's
 * independence is itself `known`.
 */
export function packFieldIsKnown(
  pack: ExecutiveAuthorityRulePack,
  path: string,
): boolean {
  if (path === "pluralExecutive") {
    return pack.pluralExecutive.every(
      (officer) => officer.independentlyElected.kind === "known",
    );
  }
  let node: unknown = pack;
  for (const segment of path.split(".")) {
    if (typeof node !== "object" || node === null) {
      return false;
    }
    node = (node as Record<string, unknown>)[segment];
  }
  return (
    typeof node === "object" &&
    node !== null &&
    (node as { kind?: unknown }).kind === "known"
  );
}

/** The pack an entry's jurisdiction resolves to, or null where none exists. */
export function packForEntry(
  entry: R3hNodeDisposition,
): ExecutiveAuthorityRulePack | null {
  return executiveRulePackForJurisdiction(entry.jurisdictionKey);
}

/** Every registered pack, re-exported so the audit export has one import. */
export { EXECUTIVE_AUTHORITY_RULE_PACKS };
