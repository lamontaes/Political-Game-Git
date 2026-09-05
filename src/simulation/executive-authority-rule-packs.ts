import {
  knownRule,
  unknownRule,
  type RuleSourceRef,
  type RuleVerificationStatus,
} from "./legislature-rules";
import type {
  ClemencyModel,
  ExecutiveAuthorityRulePack,
  ExecutiveBranchStructure,
  PluralExecutiveConstraint,
  RemovalMode,
} from "./executive-authority-rules";

/**
 * Runtime executive-authority rule packs, compiled from completed jurisdiction
 * research. Each value cites the instrument the research resolved it from, and
 * everything the research did not resolve stays `unknown` — not zero, not
 * absent, and never guessed.
 *
 * The corpus these packs are built from is narrower than the full slate of
 * executive powers, and the packs say so rather than papering over it:
 *
 * - The five state packs (Kentucky, Nebraska, Alaska, Minnesota, Illinois) are
 *   drawn from the 92A jurisdiction-authority research wave. That research
 *   resolved office identity, the separately-elected officers that make a state
 *   a plural executive, and appointment/confirmation authority. It did not
 *   research special sessions, removal, executive orders, reorganization,
 *   emergency declarations, clemency, budget submission, the administrative
 *   duty, or militia command — so every one of those stays `unknown` in every
 *   state pack. They are gaps in the research, carried forward honestly, not
 *   powers the offices lack.
 *
 * - The federal pack rests on the text of the United States Constitution,
 *   Article II. Its constitutional clauses (the vesting of executive power,
 *   appointment with the Senate's advice and consent, the pardon power, the
 *   duty to take care that the laws be faithfully executed, the convening
 *   power, and command of the militia when called into federal service) are
 *   carried as `known`, but their sources are marked `unresolved`: the operative
 *   text was not retrieved and verified for this pack, and no executive-branch
 *   research warehouse resolved them. Everything that turns on federal statute
 *   rather than Article II — presidential removal doctrine, agency
 *   reorganization, the emergency-powers regime, and the statutory budget duty —
 *   stays `unknown`.
 *
 * Wisconsin is named in the intended corpus but is absent here on purpose: no
 * jurisdiction-authority or executive-authority research exists for it, and this
 * pack file will not invent state-constitutional citations to fill the slot.
 * See {@link UNRESEARCHED_JURISDICTIONS}.
 *
 * Presentment, veto, line-item veto and override are NOT restated here. Where a
 * legislative rule pack owns those facts, this pack points at it by id through
 * its `presentment` reference (Kentucky, Nebraska and Alaska each have one);
 * where none has been compiled yet (Minnesota, Illinois, the federal
 * executive), the reference stays `unknown`.
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

function federalArticleII(citation: string, note: string): RuleSourceRef {
  return source(
    "constitution",
    citation,
    US_CONST_TITLE,
    null,
    null,
    "unresolved",
    `${note} Stated from the text of the United States Constitution; the operative text was not retrieved and verified for this pack, and no executive-authority research warehouse resolved it.`,
  );
}

const US_ART2_S1 = federalArticleII(
  "U.S. Const. Art. II, Sec. 1",
  "The executive power is vested in a President of the United States, a single elected chief executive.",
);
const US_ART2_S2 = federalArticleII(
  "U.S. Const. Art. II, Sec. 2",
  "The President is Commander in Chief; grants reprieves and pardons for offenses against the United States except in cases of impeachment; and nominates, and by and with the advice and consent of the Senate appoints, principal officers.",
);
const US_ART2_S3 = federalArticleII(
  "U.S. Const. Art. II, Sec. 3",
  "The President may on extraordinary occasions convene both Houses, or either of them, and shall take care that the laws be faithfully executed.",
);

const US_FEDERAL_EXECUTIVE_PACK: ExecutiveAuthorityRulePack = {
  packId: "us-federal-executive-v1",
  jurisdictionKey: "US",
  displayName: "President of the United States",
  office: {
    officeKey: "us-federal-president",
    title: "President",
    branchStructure: knownRule<ExecutiveBranchStructure>("unitary", US_ART2_S1),
    source: US_ART2_S1,
  },
  presentment: {
    // Presentment and the veto live in Art. I, Sec. 7, which belongs to a
    // federal legislative rule pack that has not been compiled. The reference
    // stays unknown rather than pointing at a pack that does not exist.
    legislativeRulePackId: unknownRule(
      "No federal legislative rule pack has been compiled; presentment and the veto (U.S. Const. Art. I, Sec. 7) are not yet represented as a pack this reference can resolve.",
    ),
  },
  appointment: {
    executiveAppoints: knownRule(true, US_ART2_S2),
    legislativeConfirmationRequired: knownRule(true, US_ART2_S2),
    confirmingBody: knownRule("the Senate", US_ART2_S2),
    source: US_ART2_S2,
  },
  removal: {
    mode: unknownRule<RemovalMode>(
      "Presidential removal authority rests on judicial doctrine (the line running through Myers and Humphrey's Executor), not on Article II text, and was not resolved for this pack.",
    ),
    source: US_ART2_S1,
  },
  specialSession: {
    executiveMayConvene: knownRule(true, US_ART2_S3),
    agendaLimitedToCall: unknownRule(
      "The convening power in Art. II, Sec. 3 lets the President call Congress but does not by its text confine what Congress may then consider; whether any agenda limit applies was not resolved for this pack.",
    ),
    source: US_ART2_S3,
  },
  executiveDirective: {
    hasDirectiveAuthority: knownRule(true, US_ART2_S1),
    authorityBasis: knownRule(
      "The executive power vested by Art. II, Sec. 1 together with the duty to take care that the laws be faithfully executed (Art. II, Sec. 3); there is no express executive-order clause.",
      US_ART2_S3,
    ),
    source: US_ART2_S1,
  },
  reorganization: {
    executiveMayReorganize: unknownRule(
      "Federal executive reorganization authority is statutory (the lapsed Reorganization Act line), not constitutional, and was not resolved for this pack.",
    ),
    legislativeDisapprovalAvailable: unknownRule(
      "Whether a federal reorganization takes effect subject to congressional disapproval turns on the reorganization statute in force, which was not resolved for this pack.",
    ),
    sunset: unknownRule(
      "Whether federal reorganization authority sunsets turns on the reorganization statute in force, which was not resolved for this pack.",
    ),
    source: US_ART2_S1,
  },
  emergencyDeclaration: {
    executiveMayDeclare: unknownRule(
      "Federal emergency-declaration authority is statutory (the National Emergencies Act regime), not Article II, and was not resolved for this pack.",
    ),
    initialDurationDays: unknownRule(
      "The duration of a federal emergency declaration turns on the governing statute, which was not resolved for this pack.",
    ),
    extension: unknownRule(
      "How a federal emergency declaration is extended turns on the governing statute, which was not resolved for this pack.",
    ),
    legislativeTermination: unknownRule(
      "How Congress may terminate a federal emergency declaration turns on the governing statute, which was not resolved for this pack.",
    ),
    source: US_ART2_S1,
  },
  clemency: {
    model: knownRule<ClemencyModel>("executive-sole", US_ART2_S2),
    scope: knownRule(
      "Reprieves and pardons for offenses against the United States, except in cases of impeachment.",
      US_ART2_S2,
    ),
    source: US_ART2_S2,
  },
  budgetSubmission: {
    executiveMustSubmit: unknownRule(
      "The President's budget-submission duty is statutory (the Budget and Accounting Act line), not Article II, and was not resolved for this pack.",
    ),
    submissionDeadline: unknownRule(
      "The federal budget-submission deadline turns on the governing statute, which was not resolved for this pack.",
    ),
    source: US_ART2_S3,
  },
  administrative: {
    faithfulExecutionDuty: knownRule(true, US_ART2_S3),
    supervisoryAuthority: knownRule(
      "The President supervises the executive branch under the vesting of executive power (Art. II, Sec. 1) and the take-care duty (Art. II, Sec. 3).",
      US_ART2_S3,
    ),
    source: US_ART2_S3,
  },
  pluralExecutive: [],
  guard: {
    commandsMilitia: knownRule(true, US_ART2_S2),
    scope: knownRule(
      "Commander in Chief of the Army and Navy, and of the militia of the several states when called into the actual service of the United States.",
      US_ART2_S2,
    ),
    source: US_ART2_S2,
  },
  sources: [US_ART2_S1, US_ART2_S2, US_ART2_S3],
  unresolvedGaps: [
    "Presentment and the veto (Art. I, Sec. 7) belong to a federal legislative pack that has not been compiled.",
    "Presidential removal doctrine is unresolved.",
    "Whether the convening power limits Congress's agenda is unresolved.",
    "Statutory reorganization, emergency-powers, and budget-submission regimes are unresolved.",
    "The Article II clauses here rest on the constitutional text and were not independently retrieved and verified for this pack.",
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
    legislativeRulePackId: knownRule("us-ky-general-assembly-v1", KY_SEC_91),
  },
  appointment: {
    executiveAppoints: knownRule(true, KY_SEC_118),
    legislativeConfirmationRequired: unknownRule(
      "No general appointment-and-confirmation clause was resolved for Kentucky; the appointment powers the 92A research captured (judicial vacancies, the State Board of Elections) are not senate-confirmed on the record read.",
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
    "Removal, special sessions, executive orders, reorganization, emergency declarations, clemency, budget submission, the administrative duty, and militia command are all outside the 92A research and stay unknown.",
    "Whether Kentucky executive appointments require legislative confirmation is unresolved.",
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
    legislativeRulePackId: knownRule("us-ne-legislature-v1", NE_ART4_S1),
  },
  appointment: {
    executiveAppoints: knownRule(true, NE_ART5_S21),
    legislativeConfirmationRequired: unknownRule(
      "Whether Nebraska executive appointments require legislative confirmation was not resolved by the 92A research; the appointment power it captured is judicial merit selection, which is not a confirmation.",
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
    "Removal, special sessions, executive orders, reorganization, emergency declarations, clemency, budget submission, the administrative duty, and militia command are all outside the 92A research and stay unknown.",
    "Whether Nebraska executive appointments require legislative confirmation is unresolved.",
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
const AK_SOS_MERGER = stateConst(
  "Alaska Const. (1970 amendment)",
  AK_CONST_TITLE,
  null,
  "The office of Secretary of State was merged into the Lieutenant Governor by a 1970 constitutional amendment; there is no separate Secretary of State.",
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
    legislativeRulePackId: knownRule("us-ak-legislature-v1", AK_ART3_S25),
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
  sources: [AK_ART3_S25, AK_ART4_S5, AK_SOS_MERGER],
  unresolvedGaps: [
    "Removal, special sessions, executive orders, reorganization, emergency declarations, clemency, budget submission, the administrative duty, and militia command are all outside the 92A research and stay unknown.",
    "Alaska's Attorney General is appointed and confirmed by the Legislature in joint session (Art. III, Sec. 25), not elected; Alaska has no Secretary of State (1970 amendment). The branch is unitary.",
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
    executiveAppoints: knownRule(true, MN_ART6_S8),
    legislativeConfirmationRequired: unknownRule(
      "The 92A research did not resolve a general Minnesota confirmation requirement; it captured one board (the Campaign Finance and Public Disclosure Board, Minn. Stat. ch. 10A) whose members are confirmed by both houses, which is a specific instance rather than a general rule.",
    ),
    confirmingBody: unknownRule(
      "Whether and which body confirms Minnesota executive appointments generally was not resolved by the 92A research.",
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
    "Removal, special sessions, executive orders, reorganization, emergency declarations, clemency, budget submission, the administrative duty, and militia command are all outside the 92A research and stay unknown.",
    "No Minnesota legislative pack exists, so presentment/veto are not yet composable.",
    "A general Minnesota confirmation requirement is unresolved.",
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
    executiveAppoints: knownRule(true, IL_ART3_S5),
    legislativeConfirmationRequired: knownRule(true, IL_ART3_S5),
    confirmingBody: knownRule("the Senate", IL_ART3_S5),
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
    "Removal, special sessions, executive orders, reorganization, emergency declarations, clemency, budget submission, the administrative duty, and militia command are all outside the 92A research and stay unknown.",
    "No Illinois legislative pack exists, so presentment/veto are not yet composable.",
    "The captured confirmation fact is the State Board of Elections (Senate advice and consent); a general Illinois confirmation clause was not separately resolved.",
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
