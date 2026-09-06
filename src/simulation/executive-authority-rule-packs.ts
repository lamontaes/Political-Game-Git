import {
  knownRule,
  unknownRule,
  type RuleSourceRef,
  type RuleValue,
  type RuleVerificationStatus,
} from "./legislature-rules";
import { rulePackById } from "./legislature-rule-packs";
import type {
  ClemencyModel,
  ExecutiveAuthorityRulePack,
  ExecutiveBranchStructure,
  PluralExecutiveConstraint,
  RemovalMode,
} from "./executive-authority-rules";

/**
 * Runtime executive-authority rule packs, compiled from the independently
 * verified six-jurisdiction subset. Each value cites the instrument the
 * verified record resolved it from, and everything that record does not
 * resolve at the precision the field asks for stays `unknown` — not zero, not
 * absent, and never guessed.
 *
 * Evidence boundary, recorded because it is what constrains these packs:
 *
 * - The `92H` executive-governing research is complete, and it is read here as
 *   research. It does NOT convert the national executive-authority matrix into
 *   primary legal authority for any field.
 * - The national 92K executive-authority matrix is REJECTED and requires
 *   reconstruction. It is candidate/diagnostic evidence only. No row of it is
 *   ingested here, no field is promoted to `known` on its strength, and none of
 *   its synthetic pack identifiers appears in this module.
 * - The five state packs (Kentucky, Nebraska, Alaska, Minnesota, Illinois) rest
 *   on the 92A jurisdiction-authority wave, which resolved office identity and
 *   the separately elected officers that make a state a plural executive, and —
 *   for Alaska alone — appointment with legislative confirmation at the exact
 *   scope of Alaska Const. Art. III, Sec. 25. It resolved nothing else. A
 *   clause that establishes one specific appointment (a judicial vacancy, a
 *   named board) does not establish a general appointment power, so the general
 *   field stays `unknown` rather than being widened to fit.
 * - The federal pack rests on the operative text of Article II of the United
 *   States Constitution, retrieved from the National Archives transcript. Only
 *   what that text says is `known`. There is no express executive-order clause
 *   and no general supervisory clause in Article II, so directive authority and
 *   supervisory authority stay `unknown` rather than being inferred from the
 *   vesting clause. Everything that turns on federal statute rather than
 *   Article II — removal doctrine, reorganization, the emergency-powers regime,
 *   and the budget-submission duty — stays `unknown`.
 *
 * Wisconsin is named in the intended corpus but is absent here on purpose: it
 * is outside the verified six-jurisdiction subset and no accepted research
 * resolves it. See {@link UNRESEARCHED_JURISDICTIONS}.
 *
 * Presentment, veto, line-item veto and override are NOT restated here. Where a
 * legislative rule pack owns those facts, this pack points at it by id through
 * its `presentment` reference, and {@link presentmentRef} resolves that id
 * against the live compiled registry at module load, so a reference to a pack
 * that does not exist is impossible to write. Where no legislative pack has
 * been compiled (Minnesota, Illinois, the federal executive), the reference
 * stays `unknown`.
 */

// ---------------------------------------------------------------------------
// Source helper
// ---------------------------------------------------------------------------

function source(
  authority: RuleSourceRef["authority"],
  citation: string,
  sourceTitle: string,
  sourceUrl: string | null,
  retrievedAt: string | null,
  verification: RuleVerificationStatus,
  note: string,
): RuleSourceRef {
  return {
    authority,
    citation,
    sourceTitle,
    sourceUrl,
    retrievedAt,
    verification,
    note,
  };
}

/**
 * Builds an executive pack's presentment reference from the LIVE compiled
 * legislative registry.
 *
 * The reference is not a legal fact about the jurisdiction — it is a statement
 * that a specific compiled artifact in this repository owns presentment for
 * this office. So it is resolved against that artifact rather than asserted:
 * `rulePackById` throws at module load if no pack carries the id, which makes a
 * synthetic or remembered pack identifier impossible to ship. The reference
 * carries the referenced pack's own executive-rule source, so the evidence a
 * reader sees is the evidence the legislative pack actually holds.
 */
function presentmentRef(legislativePackId: string): RuleValue<string> {
  const legislativePack = rulePackById(legislativePackId);
  return knownRule(legislativePack.packId, legislativePack.executive.source);
}

/**
 * Jurisdictions named in the intended corpus that no completed research
 * supports, listed so the gap is a value in the module rather than an omission
 * a reader has to notice. A later research pass fills these; until then, a pack
 * for one of them would be fabricated, and there is none.
 */
export const UNRESEARCHED_JURISDICTIONS: readonly {
  readonly jurisdictionKey: string;
  readonly displayName: string;
  readonly reason: string;
}[] = [
  {
    jurisdictionKey: "US-WI",
    displayName: "Wisconsin",
    reason:
      "Wisconsin was not part of the 92A jurisdiction-authority research wave and no executive-authority research resolves it; no pack is compiled rather than invent Wisconsin constitutional citations.",
  },
];

// ---------------------------------------------------------------------------
// United States — federal executive (President)
//
// Anchored to Article II of the United States Constitution. The clauses below
// are stated from that text; their sources are marked `unresolved` because the
// operative text was not retrieved and verified for this pack and no executive
// research warehouse resolved them. Statutory powers stay `unknown`.
// ---------------------------------------------------------------------------

const US_CONST_TITLE = "The Constitution of the United States";
const US_CONST_URL =
  "https://www.archives.gov/founding-docs/constitution-transcript";
const US_CONST_RETRIEVED = "2026-09-06";

/**
 * A clause of Article II whose operative text was retrieved from the National
 * Archives transcript for this pack. The note carries the operative words
 * themselves, so a reader can see exactly how far the clause reaches — and
 * therefore where it stops.
 */
function federalArticleII(citation: string, operativeText: string): RuleSourceRef {
  return source(
    "constitution",
    citation,
    US_CONST_TITLE,
    US_CONST_URL,
    US_CONST_RETRIEVED,
    "verified",
    `Operative text: "${operativeText}"`,
  );
}

const US_ART2_S1_C1 = federalArticleII(
  "U.S. Const. Art. II, Sec. 1, cl. 1",
  "The executive Power shall be vested in a President of the United States of America.",
);
const US_ART2_S2_C1 = federalArticleII(
  "U.S. Const. Art. II, Sec. 2, cl. 1",
  "The President shall be Commander in Chief of the Army and Navy of the United States, and of the Militia of the several States, when called into the actual Service of the United States; ... and he shall have Power to grant Reprieves and Pardons for Offences against the United States, except in Cases of Impeachment.",
);
const US_ART2_S2_C2 = federalArticleII(
  "U.S. Const. Art. II, Sec. 2, cl. 2",
  "he shall nominate, and by and with the Advice and Consent of the Senate, shall appoint Ambassadors, other public Ministers and Consuls, Judges of the supreme Court, and all other Officers of the United States.",
);
const US_ART2_S3 = federalArticleII(
  "U.S. Const. Art. II, Sec. 3",
  "he may, on extraordinary Occasions, convene both Houses, or either of them ... he shall take Care that the Laws be faithfully executed, and shall Commission all the Officers of the United States.",
);

const US_FEDERAL_EXECUTIVE_PACK: ExecutiveAuthorityRulePack = {
  packId: "us-federal-executive-v1",
  jurisdictionKey: "US",
  displayName: "President of the United States",
  office: {
    officeKey: "us-federal-president",
    title: "President",
    // The vesting clause puts the whole executive power in one elected
    // officer, which is what makes the branch unitary.
    branchStructure: knownRule<ExecutiveBranchStructure>(
      "unitary",
      US_ART2_S1_C1,
    ),
    source: US_ART2_S1_C1,
  },
  presentment: {
    // Presentment and the veto live in Art. I, Sec. 7, which belongs to a
    // federal legislative rule pack that has not been compiled. The reference
    // stays unknown rather than naming a pack that does not exist.
    legislativeRulePackId: unknownRule(
      "No federal legislative rule pack has been compiled; presentment and the veto (U.S. Const. Art. I, Sec. 7) are not yet represented as a pack this reference can resolve.",
    ),
  },
  appointment: {
    executiveAppoints: knownRule(true, US_ART2_S2_C2),
    legislativeConfirmationRequired: knownRule(true, US_ART2_S2_C2),
    confirmingBody: knownRule("the Senate", US_ART2_S2_C2),
    source: US_ART2_S2_C2,
  },
  removal: {
    mode: unknownRule<RemovalMode>(
      "Presidential removal authority rests on judicial doctrine (the line running through Myers and Humphrey's Executor), not on any Article II text, and no exact operative authority for it was read for this pack.",
    ),
    source: US_ART2_S1_C1,
  },
  specialSession: {
    executiveMayConvene: knownRule(true, US_ART2_S3),
    agendaLimitedToCall: unknownRule(
      "Art. II, Sec. 3 lets the President convene both Houses on extraordinary occasions and says nothing about what Congress may then consider. That silence is not a positive rule either way, so the agenda limit stays unknown.",
    ),
    source: US_ART2_S3,
  },
  executiveDirective: {
    // Article II contains no express executive-order or directive clause. The
    // vesting clause and the take-care duty are general; reading a directive
    // power out of them would be inferring a power from a generic vesting
    // clause beyond what the operative text supports, so it stays unknown.
    hasDirectiveAuthority: unknownRule(
      "Article II contains no express executive-order or directive clause. Directive authority is a doctrinal and statutory question that no exact operative authority read for this pack resolves; it is not inferred from the vesting clause or the take-care duty.",
    ),
    authorityBasis: unknownRule(
      "With no express directive clause in the operative Article II text, the basis for federal directive authority is unresolved for this pack.",
    ),
    source: US_ART2_S1_C1,
  },
  reorganization: {
    executiveMayReorganize: unknownRule(
      "Federal executive reorganization authority is statutory (the lapsed Reorganization Act line), not constitutional, and no exact operative statute was read for this pack.",
    ),
    legislativeDisapprovalAvailable: unknownRule(
      "Whether a federal reorganization takes effect subject to congressional disapproval turns on the reorganization statute in force, which was not read for this pack.",
    ),
    sunset: unknownRule(
      "Whether federal reorganization authority sunsets turns on the reorganization statute in force, which was not read for this pack.",
    ),
    source: US_ART2_S1_C1,
  },
  emergencyDeclaration: {
    executiveMayDeclare: unknownRule(
      "Federal emergency-declaration authority is statutory (the National Emergencies Act regime), not Article II, and no exact operative statute was read for this pack.",
    ),
    initialDurationDays: unknownRule(
      "The duration of a federal emergency declaration turns on the governing statute, which was not read for this pack.",
    ),
    extension: unknownRule(
      "How a federal emergency declaration is extended turns on the governing statute, which was not read for this pack.",
    ),
    legislativeTermination: unknownRule(
      "How Congress may terminate a federal emergency declaration turns on the governing statute, which was not read for this pack.",
    ),
    source: US_ART2_S1_C1,
  },
  clemency: {
    // The pardon power is granted to the President alone; no board appears in
    // the operative text.
    model: knownRule<ClemencyModel>("executive-sole", US_ART2_S2_C1),
    scope: knownRule(
      "Reprieves and pardons for offences against the United States, except in cases of impeachment.",
      US_ART2_S2_C1,
    ),
    source: US_ART2_S2_C1,
  },
  budgetSubmission: {
    executiveMustSubmit: unknownRule(
      "The President's budget-submission duty is statutory (the Budget and Accounting Act line), not Article II, and no exact operative statute was read for this pack.",
    ),
    submissionDeadline: unknownRule(
      "The federal budget-submission deadline turns on the governing statute, which was not read for this pack.",
    ),
    source: US_ART2_S3,
  },
  administrative: {
    faithfulExecutionDuty: knownRule(true, US_ART2_S3),
    // The nearest thing Article II has to a supervisory clause is the Opinions
    // Clause, which reaches only written opinions from department heads on
    // their own duties. That is narrower than a general supervisory authority,
    // so this field is not filled from it.
    supervisoryAuthority: unknownRule(
      "Article II grants no general supervisory clause. The Opinions Clause (Art. II, Sec. 2, cl. 1) reaches only the President's power to require written opinions from principal officers on the duties of their own offices, which does not establish general supervisory authority over the branch; the field stays unknown rather than being widened to fit.",
    ),
    source: US_ART2_S3,
  },
  pluralExecutive: [],
  guard: {
    commandsMilitia: knownRule(true, US_ART2_S2_C1),
    scope: knownRule(
      "Commander in Chief of the Army and Navy of the United States, and of the Militia of the several States when called into the actual Service of the United States.",
      US_ART2_S2_C1,
    ),
    source: US_ART2_S2_C1,
  },
  sources: [US_ART2_S1_C1, US_ART2_S2_C1, US_ART2_S2_C2, US_ART2_S3],
  unresolvedGaps: [
    "Presentment and the veto (Art. I, Sec. 7) belong to a federal legislative pack that has not been compiled.",
    "Presidential removal doctrine is unresolved.",
    "Whether the convening power limits Congress's agenda is unresolved; Article II is silent, and silence is not a rule.",
    "Federal directive/executive-order authority and general supervisory authority are unresolved: Article II has no express clause for either, and neither is inferred from the vesting clause.",
    "Statutory reorganization, emergency-powers, and budget-submission regimes are unresolved.",
  ],
};

// ---------------------------------------------------------------------------
// State packs — 92A jurisdiction-authority research wave
//
// Resolved by 92A: office identity, the separately-elected officers, and
// appointment/confirmation authority. Everything else the wave did not
// research, so it stays unknown in every state pack below.
// ---------------------------------------------------------------------------

const RESEARCH_92A = "92A jurisdiction-authority research wave";

/** A state source the 92A wave resolved from a state constitution. */
function stateConst(
  citation: string,
  sourceTitle: string,
  sourceUrl: string | null,
  paraphrase: string,
): RuleSourceRef {
  return source(
    "constitution",
    citation,
    sourceTitle,
    sourceUrl,
    null,
    "partial",
    `${paraphrase} Resolved by the ${RESEARCH_92A}; the section is the one the research identified, and its operative text was not re-read for this pack.`,
  );
}

/** A state source the 92A wave resolved from a state statute. */
function stateStatute(
  citation: string,
  sourceTitle: string,
  paraphrase: string,
): RuleSourceRef {
  return source(
    "statute",
    citation,
    sourceTitle,
    null,
    null,
    "partial",
    `${paraphrase} Resolved by the ${RESEARCH_92A}; the citation is the one the research identified, and its operative text was not re-read for this pack.`,
  );
}

/**
 * The nine dimensions the 92A wave never researched. Each state pack fills them
 * with an unknown carrying this note, so the reason is identical and auditable
 * everywhere rather than reworded per state.
 */
function notResearchedBy92A(dimension: string): string {
  return `${dimension} was not part of the ${RESEARCH_92A} and no completed research resolves it for this jurisdiction.`;
}

/** Builds the block of dimensions 92A left entirely unresearched. */
function unresearchedStateDimensions(
  identitySource: RuleSourceRef,
): Pick<
  ExecutiveAuthorityRulePack,
  | "removal"
  | "specialSession"
  | "executiveDirective"
  | "reorganization"
  | "emergencyDeclaration"
  | "clemency"
  | "budgetSubmission"
  | "administrative"
  | "guard"
> {
  return {
    removal: {
      mode: unknownRule<RemovalMode>(notResearchedBy92A("Removal authority")),
      source: identitySource,
    },
    specialSession: {
      executiveMayConvene: unknownRule(
        notResearchedBy92A("Special-session authority"),
      ),
      agendaLimitedToCall: unknownRule(
        notResearchedBy92A("Special-session agenda scope"),
      ),
      source: identitySource,
    },
    executiveDirective: {
      hasDirectiveAuthority: unknownRule(
        notResearchedBy92A("Executive-order/directive authority"),
      ),
      authorityBasis: unknownRule(
        notResearchedBy92A("The basis for executive-order authority"),
      ),
      source: identitySource,
    },
    reorganization: {
      executiveMayReorganize: unknownRule(
        notResearchedBy92A("Reorganization authority"),
      ),
      legislativeDisapprovalAvailable: unknownRule(
        notResearchedBy92A("Reorganization disapproval"),
      ),
      sunset: unknownRule(notResearchedBy92A("Reorganization sunset")),
      source: identitySource,
    },
    emergencyDeclaration: {
      executiveMayDeclare: unknownRule(
        notResearchedBy92A("Emergency-declaration authority"),
      ),
      initialDurationDays: unknownRule(
        notResearchedBy92A("Emergency-declaration duration"),
      ),
      extension: unknownRule(
        notResearchedBy92A("Emergency-declaration extension"),
      ),
      legislativeTermination: unknownRule(
        notResearchedBy92A("Legislative termination of an emergency"),
      ),
      source: identitySource,
    },
    clemency: {
      model: unknownRule<ClemencyModel>(
        notResearchedBy92A("Clemency authority"),
      ),
      scope: unknownRule(notResearchedBy92A("Clemency scope")),
      source: identitySource,
    },
    budgetSubmission: {
      executiveMustSubmit: unknownRule(
        notResearchedBy92A("Budget-submission duty"),
      ),
      submissionDeadline: unknownRule(
        notResearchedBy92A("Budget-submission deadline"),
      ),
      source: identitySource,
    },
    administrative: {
      faithfulExecutionDuty: unknownRule(
        notResearchedBy92A("The administrative/faithful-execution duty"),
      ),
      supervisoryAuthority: unknownRule(
        notResearchedBy92A("General supervisory authority"),
      ),
      source: identitySource,
    },
    guard: {
      commandsMilitia: unknownRule(notResearchedBy92A("Militia/Guard command")),
      scope: unknownRule(notResearchedBy92A("Militia/Guard command scope")),
      source: identitySource,
    },
  };
}

// --- Kentucky --------------------------------------------------------------

const KY_CONST_URL = "https://apps.legislature.ky.gov/Law/Constitution/";
const KY_CONST_TITLE = "The Constitution of the Commonwealth of Kentucky";

const KY_SEC_91 = stateConst(
  "Ky. Const. Sec. 91",
  KY_CONST_TITLE,
  KY_CONST_URL,
  "Separately elected statewide constitutional officers — Attorney General, Secretary of State, Auditor of Public Accounts, Treasurer and Commissioner of Agriculture.",
);
const KY_SEC_118 = stateConst(
  "Ky. Const. Sec. 118",
  KY_CONST_TITLE,
  KY_CONST_URL,
  "The Governor fills a judicial vacancy by appointment from a list of three nominees submitted by the Judicial Nominating Commission.",
);
const KY_SEC_145 = stateConst(
  "Ky. Const. Sec. 145",
  KY_CONST_TITLE,
  KY_CONST_URL,
  "A person's civil rights, including the vote, may be restored by executive pardon — mentioned only incidentally; the pardon power itself was not resolved.",
);
const KY_ELECTION_BOARD = stateStatute(
  "KRS 117.015(2)",
  "Kentucky Revised Statutes",
  "The Governor appoints the eight voting members of the State Board of Elections, four from each major party.",
);

const KENTUCKY_EXECUTIVE_PACK: ExecutiveAuthorityRulePack = {
  packId: "us-ky-governor-v1",
  jurisdictionKey: "US-KY",
  displayName: "Governor of Kentucky",
  office: {
    officeKey: "us-ky-governor",
    title: "Governor",
    branchStructure: knownRule<ExecutiveBranchStructure>("plural", KY_SEC_91),
    source: KY_SEC_91,
  },
  presentment: {
    legislativeRulePackId: presentmentRef("us-ky-general-assembly-v1"),
  },
  appointment: {
    // Sec. 118 establishes one specific appointment — filling a judicial
    // vacancy from a nominating commission's list. It does not establish a
    // general power to appoint the principal officers of the branch, which is
    // what this field asks, so the field is not filled from it.
    executiveAppoints: unknownRule(
      "No general appointment clause was read for Kentucky. Ky. Const. Sec. 118 establishes only appointment to a judicial vacancy from a nominating commission's list, and KRS 117.015(2) only the State Board of Elections; neither establishes a general power to appoint principal officers of the executive branch.",
    ),
    legislativeConfirmationRequired: unknownRule(
      "No general appointment-and-confirmation clause was read for Kentucky; the specific appointments the record captures (judicial vacancies, the State Board of Elections) are not senate-confirmed on that record, which is not a general rule either way.",
    ),
    confirmingBody: unknownRule(
      "Whether and which body confirms Kentucky executive appointments was not resolved by the 92A research.",
    ),
    source: KY_SEC_118,
  },
  ...unresearchedStateDimensions(KY_SEC_91),
  // Kentucky's clemency is unknown, but the incidental Sec. 145 mention is the
  // nearest thing the research surfaced, so it carries that citation rather
  // than the generic identity source.
  clemency: {
    model: unknownRule<ClemencyModel>(
      "Kentucky's clemency power was not resolved by the 92A research; Sec. 145 mentions an executive pardon only incidentally, as a thing that restores civil rights, and does not establish the power or any board constraint.",
    ),
    scope: unknownRule(
      "The scope of Kentucky's clemency power was not resolved by the 92A research.",
    ),
    source: KY_SEC_145,
  },
  pluralExecutive: [
    kyOfficer("Attorney General"),
    kyOfficer("Secretary of State"),
    kyOfficer("Auditor of Public Accounts"),
    kyOfficer("Treasurer"),
    kyOfficer("Commissioner of Agriculture"),
  ],
  sources: [KY_SEC_91, KY_SEC_118, KY_SEC_145, KY_ELECTION_BOARD],
  unresolvedGaps: [
    "Removal, special sessions, executive orders, reorganization, emergency declarations, clemency, budget submission, the administrative duty, and militia command are all outside the verified record and stay unknown.",
    "Kentucky's general appointment power, and whether appointments require legislative confirmation, are both unresolved: only specific appointments were read.",
  ],
};

function kyOfficer(officeLabel: string): PluralExecutiveConstraint {
  return {
    officeLabel,
    independentlyElected: knownRule(true, KY_SEC_91),
    source: KY_SEC_91,
  };
}

// --- Nebraska --------------------------------------------------------------

const NE_CONST_TITLE = "The Constitution of the State of Nebraska";

const NE_ART4_S1 = stateConst(
  "Neb. Const. Art. IV, Sec. 1",
  NE_CONST_TITLE,
  null,
  "Separately elected partisan statewide officers — Attorney General, Secretary of State, Auditor of Public Accounts and Treasurer.",
);
const NE_ART5_S21 = stateConst(
  "Neb. Const. Art. V, Sec. 21",
  NE_CONST_TITLE,
  null,
  "Judicial merit selection — the Judicial Nominating Commission submits at least two nominees and the Governor must appoint from the list within sixty days, or the Chief Justice appoints if the Governor fails to.",
);

const NEBRASKA_EXECUTIVE_PACK: ExecutiveAuthorityRulePack = {
  packId: "us-ne-governor-v1",
  jurisdictionKey: "US-NE",
  displayName: "Governor of Nebraska",
  office: {
    officeKey: "us-ne-governor",
    title: "Governor",
    branchStructure: knownRule<ExecutiveBranchStructure>("plural", NE_ART4_S1),
    source: NE_ART4_S1,
  },
  presentment: {
    legislativeRulePackId: presentmentRef("us-ne-legislature-v1"),
  },
  appointment: {
    // Neb. Const. Art. IV, Sec. 10 is the provision that would establish the
    // general appointment-and-confirmation regime, and it was not read for
    // this pack. Art. V, Sec. 21 is judicial merit selection, a different and
    // narrower thing, so it does not fill this field.
    executiveAppoints: unknownRule(
      "No general Nebraska appointment clause was read for this pack. Neb. Const. Art. V, Sec. 21 establishes only judicial merit selection from a nominating commission's list; the general appointment provision (Art. IV, Sec. 10) was not read at the precision this field requires.",
    ),
    legislativeConfirmationRequired: unknownRule(
      "Whether Nebraska executive appointments require legislative confirmation was not read at exact operative precision; judicial merit selection is not a confirmation and does not answer it.",
    ),
    confirmingBody: unknownRule(
      "Whether and which body confirms Nebraska executive appointments was not resolved by the 92A research.",
    ),
    source: NE_ART5_S21,
  },
  ...unresearchedStateDimensions(NE_ART4_S1),
  pluralExecutive: [
    neOfficer("Attorney General"),
    neOfficer("Secretary of State"),
    neOfficer("Auditor of Public Accounts"),
    neOfficer("Treasurer"),
  ],
  sources: [NE_ART4_S1, NE_ART5_S21],
  unresolvedGaps: [
    "Removal, special sessions, executive orders, reorganization, emergency declarations, clemency, budget submission, the administrative duty, and militia command are all outside the verified record and stay unknown.",
    "Nebraska's general appointment and confirmation regime (Art. IV, Sec. 10) was not read and stays unresolved.",
  ],
};

function neOfficer(officeLabel: string): PluralExecutiveConstraint {
  return {
    officeLabel,
    independentlyElected: knownRule(true, NE_ART4_S1),
    source: NE_ART4_S1,
  };
}

// --- Alaska ----------------------------------------------------------------
//
// Alaska is the sharp contrast among the states: it elects no independent
// statewide executive officer other than the Lieutenant Governor, appoints its
// Attorney General and department heads subject to confirmation by the
// Legislature in joint session, and has no Secretary of State at all. That
// makes its executive branch unitary where the other four states are plural —
// and it is the one state where the research resolved appointment-with-
// confirmation directly.

const AK_CONST_TITLE = "The Constitution of the State of Alaska";

const AK_ART3_S25 = stateConst(
  "Alaska Const. Art. III, Sec. 25",
  AK_CONST_TITLE,
  null,
  "The Attorney General and the heads of the principal departments are appointed by the Governor and confirmed by a majority of the Legislature in joint session; Alaska is the sole state whose Attorney General is filled this way.",
);
const AK_ART4_S5 = stateConst(
  "Alaska Const. Art. IV, Sec. 5",
  AK_CONST_TITLE,
  null,
  "The Alaska Judicial Council nominates at least two candidates and the Governor must appoint one within forty-five days.",
);
const ALASKA_EXECUTIVE_PACK: ExecutiveAuthorityRulePack = {
  packId: "us-ak-governor-v1",
  jurisdictionKey: "US-AK",
  displayName: "Governor of Alaska",
  office: {
    officeKey: "us-ak-governor",
    title: "Governor",
    branchStructure: knownRule<ExecutiveBranchStructure>(
      "unitary",
      AK_ART3_S25,
    ),
    source: AK_ART3_S25,
  },
  presentment: {
    legislativeRulePackId: presentmentRef("us-ak-legislature-v1"),
  },
  appointment: {
    executiveAppoints: knownRule(true, AK_ART3_S25),
    legislativeConfirmationRequired: knownRule(true, AK_ART3_S25),
    confirmingBody: knownRule("the Legislature in joint session", AK_ART3_S25),
    source: AK_ART3_S25,
  },
  ...unresearchedStateDimensions(AK_ART3_S25),
  // Alaska is unitary, so it lists no independent officers. The two facts that
  // establish that — the appointed, joint-confirmed Attorney General and the
  // absence of a Secretary of State — are recorded as gaps, not as officers.
  pluralExecutive: [],
  sources: [AK_ART3_S25, AK_ART4_S5],
  unresolvedGaps: [
    "Removal, special sessions, executive orders, reorganization, emergency declarations, clemency, budget submission, the administrative duty, and militia command are all outside the verified record and stay unknown.",
    "Alaska's Attorney General is appointed and confirmed by the Legislature in joint session (Art. III, Sec. 25) rather than elected, which is what makes the branch unitary here. The separate history by which the office of Secretary of State ceased to exist was not read to a pinpoint provision and is not cited as authority.",
  ],
};

// --- Minnesota -------------------------------------------------------------

const MN_CONST_TITLE = "The Constitution of the State of Minnesota";

const MN_ART5_S1 = stateConst(
  "Minn. Const. Art. V, Sec. 1",
  MN_CONST_TITLE,
  null,
  "Separately elected statewide constitutional officers — Attorney General, Secretary of State and State Auditor.",
);
const MN_ART6_S8 = stateConst(
  "Minn. Const. Art. VI, Sec. 8",
  MN_CONST_TITLE,
  null,
  "Most judges first take office by gubernatorial appointment to interim vacancies.",
);
const MN_CH_10A = stateStatute(
  "Minn. Stat. ch. 10A",
  "Minnesota Statutes",
  "The Campaign Finance and Public Disclosure Board's six members are appointed by the Governor and confirmed by both houses — a specific board, not a general appointment clause.",
);

const MINNESOTA_EXECUTIVE_PACK: ExecutiveAuthorityRulePack = {
  packId: "us-mn-governor-v1",
  jurisdictionKey: "US-MN",
  displayName: "Governor of Minnesota",
  office: {
    officeKey: "us-mn-governor",
    title: "Governor",
    branchStructure: knownRule<ExecutiveBranchStructure>("plural", MN_ART5_S1),
    source: MN_ART5_S1,
  },
  presentment: {
    legislativeRulePackId: unknownRule(
      "No Minnesota legislative rule pack has been compiled, so presentment and the veto cannot be resolved through this reference yet.",
    ),
  },
  appointment: {
    // The officer class the read source covers is judges filling interim
    // vacancies, not the principal officers of the executive branch this field
    // describes. The field stays unknown at the general precision it asks for.
    executiveAppoints: unknownRule(
      "The read Minnesota sources cover only specific officer classes — judges filling interim vacancies (Minn. Const. Art. VI, Sec. 8) and one named board (Minn. Stat. ch. 10A) — not a general power to appoint the principal officers of the executive branch.",
    ),
    legislativeConfirmationRequired: unknownRule(
      "No general Minnesota confirmation requirement was read; the one captured instance (the Campaign Finance and Public Disclosure Board, Minn. Stat. ch. 10A, confirmed by both houses) is a specific board, not a general rule.",
    ),
    confirmingBody: unknownRule(
      "Whether and which body confirms Minnesota executive appointments generally was not read at exact operative precision.",
    ),
    source: MN_ART6_S8,
  },
  ...unresearchedStateDimensions(MN_ART5_S1),
  pluralExecutive: [
    mnOfficer("Attorney General"),
    mnOfficer("Secretary of State"),
    mnOfficer("State Auditor"),
  ],
  sources: [MN_ART5_S1, MN_ART6_S8, MN_CH_10A],
  unresolvedGaps: [
    "Removal, special sessions, executive orders, reorganization, emergency declarations, clemency, budget submission, the administrative duty, and militia command are all outside the verified record and stay unknown.",
    "No Minnesota legislative pack exists on accepted main, so presentment/veto are not yet composable and the reference stays unknown.",
    "Minnesota's general appointment power and confirmation requirement are both unresolved.",
    "Minnesota clemency is unresolved. No clemency mapping is carried: the mapping that appeared in rejected national research rested on a source that does not support it.",
  ],
};

function mnOfficer(officeLabel: string): PluralExecutiveConstraint {
  return {
    officeLabel,
    independentlyElected: knownRule(true, MN_ART5_S1),
    source: MN_ART5_S1,
  };
}

// --- Illinois --------------------------------------------------------------

const IL_CONST_TITLE = "The Constitution of the State of Illinois";

const IL_ART5_S1 = stateConst(
  "Ill. Const. Art. V, Sec. 1",
  IL_CONST_TITLE,
  null,
  "Separately elected statewide constitutional officers — Attorney General, Secretary of State, Comptroller and Treasurer.",
);
const IL_ART3_S5 = stateConst(
  "Ill. Const. Art. III, Sec. 5",
  IL_CONST_TITLE,
  null,
  "The eight members of the State Board of Elections are appointed by the Governor with the advice and consent of the Senate.",
);
const IL_ELECTION_CODE = stateStatute(
  "10 ILCS 5/1A-1",
  "Illinois Compiled Statutes",
  "The State Board of Elections is constituted as the Election Code provides, its members appointed by the Governor with Senate advice and consent.",
);

const ILLINOIS_EXECUTIVE_PACK: ExecutiveAuthorityRulePack = {
  packId: "us-il-governor-v1",
  jurisdictionKey: "US-IL",
  displayName: "Governor of Illinois",
  office: {
    officeKey: "us-il-governor",
    title: "Governor",
    branchStructure: knownRule<ExecutiveBranchStructure>("plural", IL_ART5_S1),
    source: IL_ART5_S1,
  },
  presentment: {
    legislativeRulePackId: unknownRule(
      "No Illinois legislative rule pack has been compiled, so presentment and the veto cannot be resolved through this reference yet.",
    ),
  },
  appointment: {
    // Art. III, Sec. 5 establishes how one body — the State Board of Elections
    // — is appointed. It is not the general appointment clause, and its
    // advice-and-consent requirement is not the general confirmation rule.
    // Both fields stay unknown until the general constitutional provision is
    // read at its own precision.
    executiveAppoints: unknownRule(
      "No general Illinois appointment clause was read. Ill. Const. Art. III, Sec. 5 and 10 ILCS 5/1A-1 establish only how the State Board of Elections is constituted, which does not establish a general power to appoint the principal officers of the executive branch.",
    ),
    legislativeConfirmationRequired: unknownRule(
      "Illinois's general confirmation requirement was not read at exact operative precision. The captured advice-and-consent fact is specific to the State Board of Elections, and no supermajority confirmation rule is carried: the three-fifths figure that appeared in rejected national research is not supported by any source read here.",
    ),
    confirmingBody: unknownRule(
      "Which body confirms Illinois executive appointments generally, and on what vote, was not read at exact operative precision.",
    ),
    source: IL_ART3_S5,
  },
  ...unresearchedStateDimensions(IL_ART5_S1),
  pluralExecutive: [
    ilOfficer("Attorney General"),
    ilOfficer("Secretary of State"),
    ilOfficer("Comptroller"),
    ilOfficer("Treasurer"),
  ],
  sources: [IL_ART5_S1, IL_ART3_S5, IL_ELECTION_CODE],
  unresolvedGaps: [
    "Removal, special sessions, executive orders, reorganization, emergency declarations, clemency, budget submission, the administrative duty, and militia command are all outside the verified record and stay unknown.",
    "No Illinois legislative pack exists on accepted main, so presentment/veto are not yet composable and the reference stays unknown.",
    "The only captured confirmation fact is the State Board of Elections (Senate advice and consent). Illinois's general confirmation clause and its vote requirement are unresolved; no three-fifths rule is carried.",
  ],
};

function ilOfficer(officeLabel: string): PluralExecutiveConstraint {
  return {
    officeLabel,
    independentlyElected: knownRule(true, IL_ART5_S1),
    source: IL_ART5_S1,
  };
}

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

export const EXECUTIVE_AUTHORITY_RULE_PACKS: readonly ExecutiveAuthorityRulePack[] =
  [
    US_FEDERAL_EXECUTIVE_PACK,
    KENTUCKY_EXECUTIVE_PACK,
    NEBRASKA_EXECUTIVE_PACK,
    ALASKA_EXECUTIVE_PACK,
    MINNESOTA_EXECUTIVE_PACK,
    ILLINOIS_EXECUTIVE_PACK,
  ];

export {
  US_FEDERAL_EXECUTIVE_PACK,
  KENTUCKY_EXECUTIVE_PACK,
  NEBRASKA_EXECUTIVE_PACK,
  ALASKA_EXECUTIVE_PACK,
  MINNESOTA_EXECUTIVE_PACK,
  ILLINOIS_EXECUTIVE_PACK,
};

export function executiveRulePackById(
  packId: string,
): ExecutiveAuthorityRulePack {
  const pack = EXECUTIVE_AUTHORITY_RULE_PACKS.find(
    (candidate) => candidate.packId === packId,
  );
  if (!pack) {
    throw new Error(
      `No executive-authority rule pack is registered as '${packId}'.`,
    );
  }
  return pack;
}

/** The executive pack for a jurisdiction key (e.g. "US-KY"), or null. */
export function executiveRulePackForJurisdiction(
  jurisdictionKey: string,
): ExecutiveAuthorityRulePack | null {
  return (
    EXECUTIVE_AUTHORITY_RULE_PACKS.find(
      (candidate) => candidate.jurisdictionKey === jurisdictionKey,
    ) ?? null
  );
}
