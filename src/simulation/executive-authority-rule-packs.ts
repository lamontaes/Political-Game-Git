import {
  type RuleSourceRef,
  type RuleVerificationStatus,
} from "./legislature-rules";
import { rulePackById } from "./legislature-rule-packs";
import {
  executiveKnown,
  executiveUnknown,
  type ClemencyModel,
  type ExecutiveAuthorityRulePack,
  type ExecutiveBranchStructure,
  type ExecutiveRuleValue,
  type PluralExecutiveConstraint,
  type RemovalMode,
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
 *   its synthetic pack identifiers appears in this module. The later R3G
 *   certified runtime subset that R3H accepted is a DIFFERENT artifact: it is a
 *   six-jurisdiction, primary-text, content-hashed certification, and nothing
 *   below is compiled from the rejected matrix.
 * - The accepted R3H node set — the 142 promoted nodes of that certified subset
 *   — is compiled into the fields this contract already has, and only those.
 *   No schema is added to consume a node, so the accepted election, term,
 *   succession and recess-appointment nodes are recorded in the R3I
 *   reconciliation and left uncompiled. The accepted legislative_powers nodes
 *   are routed to R3J and are likewise not compiled here, even where a
 *   `specialSession` field could have taken one. See
 *   {@link R3H_NODE_RECONCILIATION} for the node-by-node accounting.
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
 * that does not exist is impossible to write. Kentucky, Nebraska, Alaska,
 * Minnesota and Illinois all now have a compiled legislative pack — the
 * Minnesota and Illinois packs since accepted PR #102 — so those five
 * presentment references resolve. The federal executive is the one remaining
 * unresolved reference in this bounded corpus: no federal legislative pack has
 * been compiled (Art. I, Sec. 7 presentment has no pack to resolve), so its
 * reference stays `unknown`. No federal authority is invented to fill it.
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
function presentmentRef(legislativePackId: string): ExecutiveRuleValue<string> {
  const legislativePack = rulePackById(legislativePackId);
  return executiveKnown(
    legislativePack.packId,
    legislativePack.executive.source,
  );
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
// R3H accepted-node compilation
//
// The block below compiles the accepted R3H node set — the 142 promoted nodes
// of the R3G certified runtime subset, accepted by the independent R3H audit —
// into the fields this contract already has. It introduces no new schema, no
// second executive engine, and no research of its own.
//
// Two authoring conventions hold for everything compiled from R3H:
//
//  1. A contract field with a defined shape (a boolean, a closed enum, a day
//     count, the name of a confirming body) carries the contract-shaped value.
//  2. A contract field the contract documents as carrying the research's own
//     words carries the accepted value token VERBATIM, exactly as the certified
//     subset states it. These read as `snake_case` or `SHOUTING_CASE` tokens
//     rather than prose on purpose: rewriting one into a sentence would be this
//     module interpreting the research, and the R3H translation rule forbids
//     that. The gloss belongs to a later consumer, not to the compiled value.
//
// A node whose accepted value does not entail the target field at the field's
// own precision is NOT compiled, and the field's `unknown` note says so. That
// is why, for example, Alaska and Illinois gain a clemency scope but no
// clemency model, and why every reorganization sunset stays unknown.
// ---------------------------------------------------------------------------

/** Identifies the accepted research packet these values are compiled from. */
const RESEARCH_R3H =
  "R3G certified runtime subset, accepted by the independent R3H audit";

/** The certified subset's own generation date; the retrieval date it records. */
const R3H_RETRIEVED = "2026-09-06";

/**
 * A source for a value compiled from an accepted R3H node.
 *
 * Every node compiled here is evidence class A — primary legal text retrieved
 * and content-hashed by the certified pipeline, then independently accepted.
 * The note carries the retrieval identifier and the excerpt hash, so a reader
 * can tie the runtime value back to the exact certified excerpt rather than to
 * this module's summary of it. Per the R3H source rule, the citation names the
 * underlying official instrument, never the R3H report.
 */
function r3hSource(
  authority: RuleSourceRef["authority"],
  citation: string,
  sourceTitle: string,
  sourceUrl: string | null,
  retrievalId: string,
  excerptHash: string,
  acceptedValue: string,
): RuleSourceRef {
  return source(
    authority,
    citation,
    sourceTitle,
    sourceUrl,
    R3H_RETRIEVED,
    "verified",
    `Accepted R3H node value ${acceptedValue}. Class A primary text from the ${RESEARCH_R3H} (retrieval ${retrievalId}, excerpt hash ${excerptHash}).`,
  );
}

/**
 * The note an unknown carries when the accepted subset DOES hold a node for the
 * dimension, but R3H routes the whole legislative_powers category to R3J. The
 * distinction matters: this field is not unresearched, it is not this PR's.
 */
function deferredToR3J(dimension: string): string {
  return `${dimension} is held by an accepted R3H node, but R3H routes the legislative_powers category to R3J; it is deliberately not compiled here, and stays unknown rather than being filled by this PR.`;
}

/**
 * The note an unknown carries when the accepted subset holds no node at all for
 * the dimension — the R3H row is itself UNKNOWN, so nothing was withheld.
 */
function notResolvedByR3H(dimension: string): string {
  return `${dimension} is not resolved by the accepted R3H subset: the certified row for it is itself UNKNOWN, so no accepted value exists to compile.`;
}

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
function federalArticleII(
  citation: string,
  operativeText: string,
): RuleSourceRef {
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

// --- Federal statutory sources compiled from accepted R3H nodes -------------

const US_31_USC_1105 = r3hSource(
  "statute",
  "31 U.S.C. Sec. 1105(a)",
  "United States Code, Title 31 — Money and Finance",
  "https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title31-section1105&num=0&edition=prelim",
  "retrieval:uscode-house-gov:title31-sec1105",
  "0a4bb1a91691b8af",
  '"first_monday_in_january_to_first_monday_in_february", with an executive budget-submission duty',
);
const US_50_USC_1621 = r3hSource(
  "statute",
  "50 U.S.C. Sec. 1621(a)",
  "United States Code, Title 50 — War and National Defense",
  "https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title50-section1621&num=0&edition=prelim",
  "retrieval:uscode-house-gov:title50-sec1621",
  "633db45fc1b6d6fe",
  '"national_emergencies_act_proclamation"',
);
const US_50_USC_1622 = r3hSource(
  "statute",
  "50 U.S.C. Sec. 1622(a)(1)",
  "United States Code, Title 50 — War and National Defense",
  "https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title50-section1622&num=0&edition=prelim",
  "retrieval:uscode-house-gov:title50-sec1622",
  "cb1327bcafa18026",
  '"joint_resolution_of_congress"',
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
    branchStructure: executiveKnown<ExecutiveBranchStructure>(
      "unitary",
      US_ART2_S1_C1,
    ),
    source: US_ART2_S1_C1,
  },
  presentment: {
    // Presentment and the veto live in Art. I, Sec. 7, which belongs to a
    // federal legislative rule pack that has not been compiled. The reference
    // stays unknown rather than naming a pack that does not exist.
    legislativeRulePackId: executiveUnknown(
      "No federal legislative rule pack has been compiled; presentment and the veto (U.S. Const. Art. I, Sec. 7) are not yet represented as a pack this reference can resolve.",
    ),
  },
  appointment: {
    executiveAppoints: executiveKnown(true, US_ART2_S2_C2),
    legislativeConfirmationRequired: executiveKnown(true, US_ART2_S2_C2),
    confirmingBody: executiveKnown("the Senate", US_ART2_S2_C2),
    source: US_ART2_S2_C2,
  },
  removal: {
    mode: executiveUnknown<RemovalMode>(
      "Presidential removal authority rests on judicial doctrine (the line running through Myers and Humphrey's Executor), not on any Article II text, and no exact operative authority for it was read for this pack.",
    ),
    source: US_ART2_S1_C1,
  },
  specialSession: {
    executiveMayConvene: executiveKnown(true, US_ART2_S3),
    agendaLimitedToCall: executiveUnknown(
      "Art. II, Sec. 3 lets the President convene both Houses on extraordinary occasions and says nothing about what Congress may then consider. That silence is not a positive rule either way, so the agenda limit stays unknown. The accepted R3H subset holds no federal special-session agenda node either.",
    ),
    source: US_ART2_S3,
  },
  executiveDirective: {
    // Article II contains no express executive-order or directive clause. The
    // vesting clause and the take-care duty are general; reading a directive
    // power out of them would be inferring a power from a generic vesting
    // clause beyond what the operative text supports, so it stays unknown.
    hasDirectiveAuthority: executiveUnknown(
      "Article II contains no express executive-order or directive clause. Directive authority is a doctrinal and statutory question that no exact operative authority read for this pack resolves; it is not inferred from the vesting clause or the take-care duty.",
    ),
    authorityBasis: executiveUnknown(
      "With no express directive clause in the operative Article II text, the basis for federal directive authority is unresolved for this pack.",
    ),
    source: US_ART2_S1_C1,
  },
  reorganization: {
    executiveMayReorganize: executiveUnknown(
      "Federal executive reorganization authority is statutory (the lapsed Reorganization Act line), not constitutional, and no exact operative statute was read for this pack.",
    ),
    legislativeDisapprovalAvailable: executiveUnknown(
      "Whether a federal reorganization takes effect subject to congressional disapproval turns on the reorganization statute in force, which was not read for this pack.",
    ),
    sunset: executiveUnknown(
      "Whether federal reorganization authority sunsets turns on the reorganization statute in force, which was not read for this pack.",
    ),
    source: US_ART2_S1_C1,
  },
  emergencyDeclaration: {
    // Compiled from the accepted R3H nodes: the National Emergencies Act
    // supplies the declaration power and Congress's termination route. It does
    // not supply an initial duration or an executive extension mechanism at the
    // precision those fields ask for, and no accepted node states one.
    executiveMayDeclare: executiveKnown(true, US_50_USC_1621),
    initialDurationDays: executiveUnknown(
      notResolvedByR3H(
        "The initial duration of a federal emergency declaration",
      ),
    ),
    extension: executiveUnknown(
      "The accepted node for the federal emergency regime resolves termination by joint resolution (50 U.S.C. Sec. 1622(a)(1)); it does not state how the President extends or continues a declaration, so this field is not filled from it.",
    ),
    legislativeTermination: executiveKnown(
      "joint_resolution_of_congress",
      US_50_USC_1622,
    ),
    source: US_50_USC_1621,
  },
  clemency: {
    // The pardon power is granted to the President alone; no board appears in
    // the operative text.
    model: executiveKnown<ClemencyModel>("executive-sole", US_ART2_S2_C1),
    scope: executiveKnown(
      "Reprieves and pardons for offences against the United States, except in cases of impeachment.",
      US_ART2_S2_C1,
    ),
    source: US_ART2_S2_C1,
  },
  budgetSubmission: {
    // Compiled from the accepted R3H node: 31 U.S.C. Sec. 1105(a) carries both
    // the duty and its window, and the window is stored in the research's own
    // words rather than rewritten into a date.
    executiveMustSubmit: executiveKnown(true, US_31_USC_1105),
    submissionDeadline: executiveKnown(
      "first_monday_in_january_to_first_monday_in_february",
      US_31_USC_1105,
    ),
    source: US_31_USC_1105,
  },
  administrative: {
    faithfulExecutionDuty: executiveKnown(true, US_ART2_S3),
    // The nearest thing Article II has to a supervisory clause is the Opinions
    // Clause, which reaches only written opinions from department heads on
    // their own duties. That is narrower than a general supervisory authority,
    // so this field is not filled from it.
    supervisoryAuthority: executiveUnknown(
      "Article II grants no general supervisory clause. The Opinions Clause (Art. II, Sec. 2, cl. 1) reaches only the President's power to require written opinions from principal officers on the duties of their own offices, which does not establish general supervisory authority over the branch; the field stays unknown rather than being widened to fit.",
    ),
    source: US_ART2_S3,
  },
  pluralExecutive: [],
  guard: {
    commandsMilitia: executiveKnown(true, US_ART2_S2_C1),
    scope: executiveKnown(
      "Commander in Chief of the Army and Navy of the United States, and of the Militia of the several States when called into the actual Service of the United States.",
      US_ART2_S2_C1,
    ),
    source: US_ART2_S2_C1,
  },
  sources: [
    US_ART2_S1_C1,
    US_ART2_S2_C1,
    US_ART2_S2_C2,
    US_ART2_S3,
    US_31_USC_1105,
    US_50_USC_1621,
    US_50_USC_1622,
  ],
  unresolvedGaps: [
    "Presentment and the veto (Art. I, Sec. 7) belong to a federal legislative pack that has not been compiled.",
    "Presidential removal doctrine is unresolved.",
    "Whether the convening power limits Congress's agenda is unresolved; Article II is silent, and silence is not a rule.",
    "Federal directive/executive-order authority and general supervisory authority are unresolved: Article II has no express clause for either, and neither is inferred from the vesting clause.",
    "Statutory reorganization authority is unresolved; the accepted R3H reorganization rows for the federal executive are themselves UNKNOWN.",
    "The emergency-powers regime is resolved only as to the declaration power and congressional termination (50 U.S.C. Secs. 1621, 1622). No accepted node states an initial duration or a presidential extension mechanism, so both stay unknown.",
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
      mode: executiveUnknown<RemovalMode>(
        notResearchedBy92A("Removal authority"),
      ),
      source: identitySource,
    },
    specialSession: {
      executiveMayConvene: executiveUnknown(
        notResearchedBy92A("Special-session authority"),
      ),
      agendaLimitedToCall: executiveUnknown(
        notResearchedBy92A("Special-session agenda scope"),
      ),
      source: identitySource,
    },
    executiveDirective: {
      hasDirectiveAuthority: executiveUnknown(
        notResearchedBy92A("Executive-order/directive authority"),
      ),
      authorityBasis: executiveUnknown(
        notResearchedBy92A("The basis for executive-order authority"),
      ),
      source: identitySource,
    },
    reorganization: {
      executiveMayReorganize: executiveUnknown(
        notResearchedBy92A("Reorganization authority"),
      ),
      legislativeDisapprovalAvailable: executiveUnknown(
        notResearchedBy92A("Reorganization disapproval"),
      ),
      sunset: executiveUnknown(notResearchedBy92A("Reorganization sunset")),
      source: identitySource,
    },
    emergencyDeclaration: {
      executiveMayDeclare: executiveUnknown(
        notResearchedBy92A("Emergency-declaration authority"),
      ),
      initialDurationDays: executiveUnknown(
        notResearchedBy92A("Emergency-declaration duration"),
      ),
      extension: executiveUnknown(
        notResearchedBy92A("Emergency-declaration extension"),
      ),
      legislativeTermination: executiveUnknown(
        notResearchedBy92A("Legislative termination of an emergency"),
      ),
      source: identitySource,
    },
    clemency: {
      model: executiveUnknown<ClemencyModel>(
        notResearchedBy92A("Clemency authority"),
      ),
      scope: executiveUnknown(notResearchedBy92A("Clemency scope")),
      source: identitySource,
    },
    budgetSubmission: {
      executiveMustSubmit: executiveUnknown(
        notResearchedBy92A("Budget-submission duty"),
      ),
      submissionDeadline: executiveUnknown(
        notResearchedBy92A("Budget-submission deadline"),
      ),
      source: identitySource,
    },
    administrative: {
      faithfulExecutionDuty: executiveUnknown(
        notResearchedBy92A("The administrative/faithful-execution duty"),
      ),
      supervisoryAuthority: executiveUnknown(
        notResearchedBy92A("General supervisory authority"),
      ),
      source: identitySource,
    },
    guard: {
      commandsMilitia: executiveUnknown(
        notResearchedBy92A("Militia/Guard command"),
      ),
      scope: executiveUnknown(
        notResearchedBy92A("Militia/Guard command scope"),
      ),
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

const KY_SEC_75 = r3hSource(
  "constitution",
  "Ky. Const. Sec. 75",
  KY_CONST_TITLE,
  "https://apps.legislature.ky.gov/Law/Constitution/Constitution/ViewConstitution?rsn=83",
  "retrieval:apps-legislature-ky-gov:const-rsn83",
  "84d0788a1953626d",
  '"commands_militia" true, scope "commander_in_chief_except_in_federal_service"',
);
const KY_SEC_77 = r3hSource(
  "constitution",
  "Ky. Const. Sec. 77",
  KY_CONST_TITLE,
  "https://apps.legislature.ky.gov/Law/Constitution/Constitution/ViewConstitution?rsn=85",
  "retrieval:apps-legislature-ky-gov:const-rsn85",
  "fc6b311c241d5a14",
  '"GUBERNATORIAL_SOLE_POWER_WITH_WRITTEN_REPORT" for pardon, commutation and reprieve alike',
);

const KENTUCKY_EXECUTIVE_PACK: ExecutiveAuthorityRulePack = {
  packId: "us-ky-governor-v1",
  jurisdictionKey: "US-KY",
  displayName: "Governor of Kentucky",
  office: {
    officeKey: "us-ky-governor",
    title: "Governor",
    branchStructure: executiveKnown<ExecutiveBranchStructure>(
      "plural",
      KY_SEC_91,
    ),
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
    executiveAppoints: executiveUnknown(
      "No general appointment clause was read for Kentucky. Ky. Const. Sec. 118 establishes only appointment to a judicial vacancy from a nominating commission's list, and KRS 117.015(2) only the State Board of Elections; neither establishes a general power to appoint principal officers of the executive branch.",
    ),
    legislativeConfirmationRequired: executiveUnknown(
      "No general appointment-and-confirmation clause was read for Kentucky; the specific appointments the record captures (judicial vacancies, the State Board of Elections) are not senate-confirmed on that record, which is not a general rule either way.",
    ),
    confirmingBody: executiveUnknown(
      "Whether and which body confirms Kentucky executive appointments was not resolved by the 92A research, and the accepted R3H appointment node (Ky. Const. Sec. 76) is a vacancy-filling clause that establishes no confirmation regime.",
    ),
    source: KY_SEC_118,
  },
  ...unresearchedStateDimensions(KY_SEC_91),
  specialSession: {
    executiveMayConvene: executiveUnknown(
      deferredToR3J("Kentucky's special-session convening power"),
    ),
    agendaLimitedToCall: executiveUnknown(
      deferredToR3J(
        "Whether a Kentucky special-session agenda is limited to the call",
      ),
    ),
    source: KY_SEC_91,
  },
  // Sec. 77 is the operative clemency clause the accepted R3H subset resolves.
  // All three component grants agree that the power is the Governor's alone, so
  // the composite model is established rather than inferred.
  clemency: {
    model: executiveKnown<ClemencyModel>("executive-sole", KY_SEC_77),
    scope: executiveKnown(
      "pardon, commutation, reprieve — GUBERNATORIAL_SOLE_POWER_WITH_WRITTEN_REPORT",
      KY_SEC_77,
    ),
    source: KY_SEC_77,
  },
  guard: {
    commandsMilitia: executiveKnown(true, KY_SEC_75),
    scope: executiveKnown(
      "commander_in_chief_except_in_federal_service",
      KY_SEC_75,
    ),
    source: KY_SEC_75,
  },
  pluralExecutive: [
    kyOfficer("Attorney General"),
    kyOfficer("Secretary of State"),
    kyOfficer("Auditor of Public Accounts"),
    kyOfficer("Treasurer"),
    kyOfficer("Commissioner of Agriculture"),
  ],
  sources: [
    KY_SEC_91,
    KY_SEC_118,
    KY_SEC_145,
    KY_ELECTION_BOARD,
    KY_SEC_75,
    KY_SEC_77,
  ],
  unresolvedGaps: [
    "Removal, executive orders, reorganization, emergency declarations, budget submission and the administrative duty stay unknown: the accepted R3H rows for them are themselves UNKNOWN.",
    "Kentucky's general appointment power, and whether appointments require legislative confirmation, are both unresolved. The accepted R3H appointment node cites Ky. Const. Sec. 76, a vacancy-filling clause narrower than the general power this contract's field describes, so it does not fill it.",
    "Special-session convening and agenda scope are held by accepted R3H nodes but routed to R3J, not compiled here.",
  ],
};

function kyOfficer(officeLabel: string): PluralExecutiveConstraint {
  return {
    officeLabel,
    independentlyElected: executiveKnown(true, KY_SEC_91),
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

const NE_ART4_S7 = r3hSource(
  "constitution",
  "Neb. Const. art. IV, Sec. 7",
  NE_CONST_TITLE,
  "https://nebraskalegislature.gov/laws/articles.php?article=IV-7",
  "retrieval:nebraskalegislature-gov:const-art-iv-7",
  "57033db5c9102446",
  '"executive_budget_submission_duty" true',
);
const NE_ART4_S10 = r3hSource(
  "constitution",
  "Neb. Const. art. IV, Sec. 10",
  NE_CONST_TITLE,
  "https://nebraskalegislature.gov/laws/articles.php?article=IV-10",
  "retrieval:nebraskalegislature-gov:const-art-iv-10",
  "806bfb824e68f704",
  '"gubernatorial_with_legislative_approval" for department heads, confirmation "majority_of_legislature" (excerpt 184006d2717cf875)',
);
const NE_ART4_S13 = r3hSource(
  "constitution",
  "Neb. Const. art. IV, Sec. 13",
  NE_CONST_TITLE,
  "https://nebraskalegislature.gov/laws/articles.php?article=IV-13",
  "retrieval:nebraskalegislature-gov:const-art-iv-13",
  "d87b6b6211b28259",
  '"BOARD_OF_PARDONS_GOV_AG_SOS" for pardon, commutation and reprieve alike',
);
const NE_ART4_S14 = r3hSource(
  "constitution",
  "Neb. Const. art. IV, Sec. 14",
  NE_CONST_TITLE,
  "https://nebraskalegislature.gov/laws/articles.php?article=IV-14",
  "retrieval:nebraskalegislature-gov:const-art-iv-14",
  "873927f2bcdf56c5",
  '"commands_militia" true, scope "commander_in_chief_except_in_federal_service" (excerpt 1f39813d12c4f60c)',
);

const NEBRASKA_EXECUTIVE_PACK: ExecutiveAuthorityRulePack = {
  packId: "us-ne-governor-v1",
  jurisdictionKey: "US-NE",
  displayName: "Governor of Nebraska",
  office: {
    officeKey: "us-ne-governor",
    title: "Governor",
    branchStructure: executiveKnown<ExecutiveBranchStructure>(
      "plural",
      NE_ART4_S1,
    ),
    source: NE_ART4_S1,
  },
  presentment: {
    legislativeRulePackId: presentmentRef("us-ne-legislature-v1"),
  },
  appointment: {
    // Art. IV, Sec. 10 — the general appointment-and-confirmation provision the
    // 92A record could not reach — is exactly what the accepted R3H subset
    // resolves, so all three fields are compiled from it. The confirmation vote
    // (a majority of the Legislature) has no contract field and is carried in
    // the source note rather than dropped.
    executiveAppoints: executiveKnown(true, NE_ART4_S10),
    legislativeConfirmationRequired: executiveKnown(true, NE_ART4_S10),
    confirmingBody: executiveKnown("the Legislature", NE_ART4_S10),
    source: NE_ART4_S10,
  },
  ...unresearchedStateDimensions(NE_ART4_S1),
  specialSession: {
    executiveMayConvene: executiveUnknown(
      deferredToR3J("Nebraska's special-session convening power"),
    ),
    agendaLimitedToCall: executiveUnknown(
      deferredToR3J(
        "Whether a Nebraska special-session agenda is limited to the call",
      ),
    ),
    source: NE_ART4_S1,
  },
  // The Board of Pardons is the Governor, Attorney General and Secretary of
  // State sitting together, and it — not the Governor — holds the power, which
  // is what board-exclusive names. All three component grants say so.
  clemency: {
    model: executiveKnown<ClemencyModel>("board-exclusive", NE_ART4_S13),
    scope: executiveKnown(
      "pardon, commutation, reprieve — BOARD_OF_PARDONS_GOV_AG_SOS",
      NE_ART4_S13,
    ),
    source: NE_ART4_S13,
  },
  budgetSubmission: {
    executiveMustSubmit: executiveKnown(true, NE_ART4_S7),
    submissionDeadline: executiveUnknown(
      notResolvedByR3H("Nebraska's budget-submission deadline"),
    ),
    source: NE_ART4_S7,
  },
  guard: {
    commandsMilitia: executiveKnown(true, NE_ART4_S14),
    scope: executiveKnown(
      "commander_in_chief_except_in_federal_service",
      NE_ART4_S14,
    ),
    source: NE_ART4_S14,
  },
  pluralExecutive: [
    neOfficer("Attorney General"),
    neOfficer("Secretary of State"),
    neOfficer("Auditor of Public Accounts"),
    neOfficer("Treasurer"),
  ],
  sources: [
    NE_ART4_S1,
    NE_ART5_S21,
    NE_ART4_S7,
    NE_ART4_S10,
    NE_ART4_S13,
    NE_ART4_S14,
  ],
  unresolvedGaps: [
    "Removal, executive orders, reorganization, emergency declarations and the administrative duty stay unknown: the accepted R3H rows for them are themselves UNKNOWN.",
    "The Nebraska budget-submission duty is established, but no accepted node states its deadline.",
    "Special-session convening and agenda scope are held by accepted R3H nodes but routed to R3J, not compiled here.",
  ],
};

function neOfficer(officeLabel: string): PluralExecutiveConstraint {
  return {
    officeLabel,
    independentlyElected: executiveKnown(true, NE_ART4_S1),
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
const AK_CONST_URL =
  "https://ltgov.alaska.gov/information/alaskas-constitution/";

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
const AK_ART3_S19 = r3hSource(
  "constitution",
  "Alaska Const. art. III, Sec. 19",
  AK_CONST_TITLE,
  AK_CONST_URL,
  "retrieval:ltgov-alaska-gov:constitution",
  "c84521dccaf69b7b",
  '"commands_militia" true, scope "execute_laws_suppress_insurrection_repel_invasion" (excerpt 41c5d1f6433d1552)',
);
const AK_ART3_S21 = r3hSource(
  "constitution",
  "Alaska Const. art. III, Sec. 21",
  AK_CONST_TITLE,
  AK_CONST_URL,
  "retrieval:ltgov-alaska-gov:constitution:r3g",
  "9695082311ac8f99",
  '"GUBERNATORIAL_POWER_SUBJECT_TO_PROCEDURE_PRESCRIBED_BY_LAW_EXCLUDING_IMPEACHMENT" for pardon, commutation and reprieve alike',
);
const AK_ART3_S23 = r3hSource(
  "constitution",
  "Alaska Const. art. III, Sec. 23",
  AK_CONST_TITLE,
  AK_CONST_URL,
  "retrieval:ltgov-alaska-gov:constitution",
  "263ca48651a6a23c",
  '"reorganization_authority" true, sunset/ratification "sixty_days_joint_session_disapproval_window" (excerpt 50e71fee215343f8)',
);
const AK_ART3_S25_REMOVAL = r3hSource(
  "constitution",
  "Alaska Const. art. III, Sec. 25",
  AK_CONST_TITLE,
  AK_CONST_URL,
  "retrieval:ltgov-alaska-gov:constitution",
  "47bd653eafd88af6",
  '"at_pleasure_of_governor"',
);
const AK_ART9_S12 = r3hSource(
  "constitution",
  "Alaska Const. art. IX, Sec. 12",
  AK_CONST_TITLE,
  AK_CONST_URL,
  "retrieval:ltgov-alaska-gov:constitution",
  "5a1e2e9eb1ae55fa",
  '"executive_budget_submission_duty" true',
);

const ALASKA_EXECUTIVE_PACK: ExecutiveAuthorityRulePack = {
  packId: "us-ak-governor-v1",
  jurisdictionKey: "US-AK",
  displayName: "Governor of Alaska",
  office: {
    officeKey: "us-ak-governor",
    title: "Governor",
    branchStructure: executiveKnown<ExecutiveBranchStructure>(
      "unitary",
      AK_ART3_S25,
    ),
    source: AK_ART3_S25,
  },
  presentment: {
    legislativeRulePackId: presentmentRef("us-ak-legislature-v1"),
  },
  appointment: {
    executiveAppoints: executiveKnown(true, AK_ART3_S25),
    legislativeConfirmationRequired: executiveKnown(true, AK_ART3_S25),
    confirmingBody: executiveKnown(
      "the Legislature in joint session",
      AK_ART3_S25,
    ),
    source: AK_ART3_S25,
  },
  ...unresearchedStateDimensions(AK_ART3_S25),
  removal: {
    mode: executiveKnown<RemovalMode>("at-pleasure", AK_ART3_S25_REMOVAL),
    source: AK_ART3_S25_REMOVAL,
  },
  specialSession: {
    executiveMayConvene: executiveUnknown(
      deferredToR3J("Alaska's special-session convening power"),
    ),
    agendaLimitedToCall: executiveUnknown(
      deferredToR3J(
        "Whether an Alaska special-session agenda is limited to the call",
      ),
    ),
    source: AK_ART3_S25,
  },
  reorganization: {
    executiveMayReorganize: executiveKnown(true, AK_ART3_S23),
    // A sixty-day window in which the Legislature in joint session may
    // disapprove an order is exactly a legislative-disapproval regime.
    legislativeDisapprovalAvailable: executiveKnown(true, AK_ART3_S23),
    // It is NOT a sunset. The window governs an individual reorganization
    // order; whether the grant of authority itself expires is a different
    // question no accepted node answers, and the window's day count has no
    // field in this contract.
    sunset: executiveUnknown(
      "The accepted Alaska reorganization node states a sixty-day joint-session disapproval window over a reorganization order. That is a disapproval regime, not an expiry of the reorganization authority itself, so this field is not filled from it.",
    ),
    source: AK_ART3_S23,
  },
  // Art. III, Sec. 21 vests the power in the Governor but subjects it to
  // procedure prescribed by law. That leaves open whether a statutory board may
  // hold or block it, so the composite model is NOT established and stays
  // unknown; only the scope the accepted value states is compiled.
  clemency: {
    model: executiveUnknown<ClemencyModel>(
      "The accepted Alaska clemency nodes state a gubernatorial power subject to procedure prescribed by law. Because that procedure may itself install a board, the value settles neither executive-sole nor any board model, and no model is inferred from its silence about one.",
    ),
    scope: executiveKnown(
      "pardon, commutation, reprieve — GUBERNATORIAL_POWER_SUBJECT_TO_PROCEDURE_PRESCRIBED_BY_LAW_EXCLUDING_IMPEACHMENT",
      AK_ART3_S21,
    ),
    source: AK_ART3_S21,
  },
  budgetSubmission: {
    executiveMustSubmit: executiveKnown(true, AK_ART9_S12),
    submissionDeadline: executiveUnknown(
      notResolvedByR3H("Alaska's budget-submission deadline"),
    ),
    source: AK_ART9_S12,
  },
  guard: {
    commandsMilitia: executiveKnown(true, AK_ART3_S19),
    scope: executiveKnown(
      "execute_laws_suppress_insurrection_repel_invasion",
      AK_ART3_S19,
    ),
    source: AK_ART3_S19,
  },
  // Alaska is unitary, so it lists no independent officers. The two facts that
  // establish that — the appointed, joint-confirmed Attorney General and the
  // absence of a Secretary of State — are recorded as gaps, not as officers.
  pluralExecutive: [],
  sources: [
    AK_ART3_S25,
    AK_ART4_S5,
    AK_ART3_S19,
    AK_ART3_S21,
    AK_ART3_S23,
    AK_ART3_S25_REMOVAL,
    AK_ART9_S12,
  ],
  unresolvedGaps: [
    "Executive orders, emergency declarations and the administrative duty stay unknown: the accepted R3H rows for them are themselves UNKNOWN.",
    "Alaska's clemency model is unresolved. The accepted value subjects the gubernatorial power to procedure prescribed by law, which may install a board, so neither executive-sole nor a board model is established.",
    "Whether Alaska's reorganization authority itself sunsets is unresolved; the accepted node states a disapproval window over an order, which is a different thing.",
    "Special-session convening and agenda scope are held by accepted R3H nodes but routed to R3J, not compiled here.",
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

const MN_ART5_S3 = r3hSource(
  "constitution",
  "Minn. Const. art. V, Sec. 3",
  MN_CONST_TITLE,
  "https://www.revisor.mn.gov/constitution/",
  "retrieval:revisor-mn-gov:constitution",
  "7d81d4e0e240d209",
  '"commands_militia" true, scope "execute_laws_suppress_insurrection_repel_invasion"',
);
const MN_STAT_15_06 = r3hSource(
  "statute",
  "Minn. Stat. Sec. 15.06, subds. 1-2",
  "Minnesota Statutes",
  "https://www.revisor.mn.gov/statutes/cite/15.06",
  "retrieval:revisor-mn-gov:stat-15-06",
  "3d0409c36f163e6c",
  '"gubernatorial_appointment_senate_confirmation" for department heads',
);
const MN_STAT_15_066 = r3hSource(
  "statute",
  "Minn. Stat. Sec. 15.066, subds. 1 and 3",
  "Minnesota Statutes",
  "https://www.revisor.mn.gov/statutes/cite/15.066",
  "retrieval:revisor-mn-gov:stat-15-066",
  "104b600417e1c3b0",
  '"advice_and_consent_of_senate"',
);
const MN_STAT_16A_11 = r3hSource(
  "statute",
  "Minn. Stat. Sec. 16A.11, subd. 1",
  "Minnesota Statutes",
  "https://www.revisor.mn.gov/statutes/cite/16A.11",
  "retrieval:revisor-mn-gov:stat-16a-11",
  "54b216f000a6cbed",
  '"executive_budget_submission_duty" true, timing "fourth_tuesday_in_january_odd_year"',
);
const MN_STAT_12_31 = r3hSource(
  "statute",
  "Minn. Stat. Sec. 12.31, subd. 2",
  "Minnesota Statutes",
  "https://www.revisor.mn.gov/statutes/cite/12.31",
  "retrieval:revisor-mn-gov:stat-12-31",
  "56bdf8e48f739840",
  '"peacetime_emergency_declaration", duration "five_days_extendable_to_thirty_by_executive_council" (excerpt f4d7f6e674ec7f7e), termination "legislative_termination_majority_each_house" (excerpt e2eadca7d806d84b)',
);

const MINNESOTA_EXECUTIVE_PACK: ExecutiveAuthorityRulePack = {
  packId: "us-mn-governor-v1",
  jurisdictionKey: "US-MN",
  displayName: "Governor of Minnesota",
  office: {
    officeKey: "us-mn-governor",
    title: "Governor",
    branchStructure: executiveKnown<ExecutiveBranchStructure>(
      "plural",
      MN_ART5_S1,
    ),
    source: MN_ART5_S1,
  },
  presentment: {
    legislativeRulePackId: presentmentRef("us-mn-legislature-v1"),
  },
  appointment: {
    // Minn. Stat. Sec. 15.06 governs the heads of the executive departments —
    // the principal officers of the branch this field describes — and the
    // accepted R3H subset resolves it, so the general fields are compiled from
    // it rather than from the narrower sources the 92A record reached.
    executiveAppoints: executiveKnown(true, MN_STAT_15_06),
    legislativeConfirmationRequired: executiveKnown(true, MN_STAT_15_066),
    confirmingBody: executiveKnown("the Senate", MN_STAT_15_066),
    source: MN_STAT_15_06,
  },
  ...unresearchedStateDimensions(MN_ART5_S1),
  specialSession: {
    executiveMayConvene: executiveUnknown(
      deferredToR3J("Minnesota's special-session convening power"),
    ),
    agendaLimitedToCall: executiveUnknown(
      notResolvedByR3H(
        "Whether a Minnesota special-session agenda is limited to the call",
      ),
    ),
    source: MN_ART5_S1,
  },
  emergencyDeclaration: {
    executiveMayDeclare: executiveKnown(true, MN_STAT_12_31),
    // The accepted value states an exact five-day initial term, so the numeric
    // field is resolved; the same value states how it is extended.
    initialDurationDays: executiveKnown(5, MN_STAT_12_31),
    extension: executiveKnown(
      "five_days_extendable_to_thirty_by_executive_council",
      MN_STAT_12_31,
    ),
    legislativeTermination: executiveKnown(
      "legislative_termination_majority_each_house",
      MN_STAT_12_31,
    ),
    source: MN_STAT_12_31,
  },
  budgetSubmission: {
    executiveMustSubmit: executiveKnown(true, MN_STAT_16A_11),
    submissionDeadline: executiveKnown(
      "fourth_tuesday_in_january_odd_year",
      MN_STAT_16A_11,
    ),
    source: MN_STAT_16A_11,
  },
  guard: {
    commandsMilitia: executiveKnown(true, MN_ART5_S3),
    scope: executiveKnown(
      "execute_laws_suppress_insurrection_repel_invasion",
      MN_ART5_S3,
    ),
    source: MN_ART5_S3,
  },
  pluralExecutive: [
    mnOfficer("Attorney General"),
    mnOfficer("Secretary of State"),
    mnOfficer("State Auditor"),
  ],
  sources: [
    MN_ART5_S1,
    MN_ART6_S8,
    MN_CH_10A,
    MN_ART5_S3,
    MN_STAT_15_06,
    MN_STAT_15_066,
    MN_STAT_16A_11,
    MN_STAT_12_31,
  ],
  unresolvedGaps: [
    "Removal, executive orders, reorganization and the administrative duty stay unknown: the accepted R3H rows for them are themselves UNKNOWN.",
    "Minnesota clemency is unresolved. The accepted R3H clemency rows for Minnesota are themselves UNKNOWN, and no clemency mapping is carried: the mapping that appeared in rejected national research rested on a source that does not support it.",
    "The special-session convening power is held by an accepted R3H node but routed to R3J; no accepted node states an agenda restriction.",
  ],
};

function mnOfficer(officeLabel: string): PluralExecutiveConstraint {
  return {
    officeLabel,
    independentlyElected: executiveKnown(true, MN_ART5_S1),
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

const IL_CON5_URL = "https://www.ilga.gov/commission/lrb/con5.htm";

const IL_ART5_S9A = r3hSource(
  "constitution",
  "Ill. Const. art. V, Sec. 9(a)",
  IL_CONST_TITLE,
  IL_CON5_URL,
  "retrieval:ilga-gov:con5",
  "9aefaa7c1a2cb95e",
  '"gubernatorial_with_senate_advice_and_consent", confirmation "majority_of_senate_elected_members" (excerpt 85a496542e4c01b5)',
);
const IL_ART5_S10 = r3hSource(
  "constitution",
  "Ill. Const. art. V, Sec. 10",
  IL_CONST_TITLE,
  IL_CON5_URL,
  "retrieval:ilga-gov:con5",
  "4b4a82e236a5381e",
  '"gubernatorial_for_cause"',
);
const IL_ART5_S11 = r3hSource(
  "constitution",
  "Ill. Const. art. V, Sec. 11",
  IL_CONST_TITLE,
  IL_CON5_URL,
  "retrieval:ilga-gov:con5",
  "4de69aa4c7bf5a71",
  '"reorganization_authority" true, sunset/ratification "sixty_days_legislative_disapproval_window" (excerpt 13fd37691b6e00e2)',
);
const IL_ART5_S12 = r3hSource(
  "constitution",
  "Ill. Const. art. V, Sec. 12",
  IL_CONST_TITLE,
  IL_CON5_URL,
  "retrieval:ilga-gov:con5",
  "9bbd07d0f69ef04e",
  '"GUBERNATORIAL_SUBJECT_TO_APPLICATION_REGULATION" for pardon, commutation and reprieve alike',
);
const IL_ART8_S2A = r3hSource(
  "constitution",
  "Ill. Const. art. VIII, Sec. 2(a)",
  IL_CONST_TITLE,
  "https://www.ilga.gov/commission/lrb/con8.htm",
  "retrieval:ilga-gov:con8",
  "4cd754490c4e688c",
  '"executive_budget_submission_duty" true',
);
const IL_ART12_S4 = r3hSource(
  "constitution",
  "Ill. Const. art. XII, Sec. 4",
  IL_CONST_TITLE,
  "https://www.ilga.gov/commission/lrb/con12.htm",
  "retrieval:ilga-gov:con12",
  "92c9a973b70fc712",
  '"commands_militia" true, scope "enforce_laws_suppress_insurrection_repel_invasion" (excerpt b475b9a077eaa6f9)',
);
const IL_BUDGET_ACT = r3hSource(
  "statute",
  "15 ILCS 20/50-5",
  "Illinois Compiled Statutes",
  "https://www.ilga.gov/documents/legislation/ilcs/documents/001500200K50-5.htm",
  "retrieval:ilga-gov:stat-15-20-50-5",
  "fa112cf47b020ed2",
  '"third_wednesday_in_february"',
);
// The ILCS short form "20 ILCS 3305/7" names section 7 of the Act, but its
// four-digit act number is not a locator this contract's pinpoint check can
// read as one. The citation therefore states the same section in the form that
// names it explicitly; it is the identical provision, not a broader one.
const IL_EMERGENCY_ACT = r3hSource(
  "statute",
  "20 ILCS 3305/7 (Illinois Emergency Management Agency Act, Sec. 7)",
  "Illinois Compiled Statutes",
  "https://www.ilga.gov/documents/legislation/ilcs/documents/002033050K7.htm",
  "retrieval:ilga-gov:stat-20-3305-7",
  "4f6bf363a607c3bd",
  '"disaster_proclamation_by_governor", duration "thirty_days_per_proclamation" (excerpt 7fd70ea671048484)',
);

const ILLINOIS_EXECUTIVE_PACK: ExecutiveAuthorityRulePack = {
  packId: "us-il-governor-v1",
  jurisdictionKey: "US-IL",
  displayName: "Governor of Illinois",
  office: {
    officeKey: "us-il-governor",
    title: "Governor",
    branchStructure: executiveKnown<ExecutiveBranchStructure>(
      "plural",
      IL_ART5_S1,
    ),
    source: IL_ART5_S1,
  },
  presentment: {
    legislativeRulePackId: presentmentRef("us-il-general-assembly-v1"),
  },
  appointment: {
    // Art. V, Sec. 9(a) is the general appointment clause the 92A record could
    // not reach, and the accepted R3H subset resolves it. The confirmation vote
    // (a majority of the Senate's elected members) has no contract field and is
    // carried in the source note; still no three-fifths rule is asserted.
    executiveAppoints: executiveKnown(true, IL_ART5_S9A),
    legislativeConfirmationRequired: executiveKnown(true, IL_ART5_S9A),
    confirmingBody: executiveKnown("the Senate", IL_ART5_S9A),
    source: IL_ART5_S9A,
  },
  ...unresearchedStateDimensions(IL_ART5_S1),
  removal: {
    mode: executiveKnown<RemovalMode>("for-cause", IL_ART5_S10),
    source: IL_ART5_S10,
  },
  specialSession: {
    executiveMayConvene: executiveUnknown(
      deferredToR3J("Illinois's special-session convening power"),
    ),
    agendaLimitedToCall: executiveUnknown(
      deferredToR3J(
        "Whether an Illinois special-session agenda is limited to the call",
      ),
    ),
    source: IL_ART5_S1,
  },
  reorganization: {
    executiveMayReorganize: executiveKnown(true, IL_ART5_S11),
    legislativeDisapprovalAvailable: executiveKnown(true, IL_ART5_S11),
    // As in Alaska: a disapproval window over an order is not an expiry of the
    // authority, and the window's day count has no field here.
    sunset: executiveUnknown(
      "The accepted Illinois reorganization node states a sixty-day legislative disapproval window over a reorganization order. That is a disapproval regime, not an expiry of the reorganization authority itself, so this field is not filled from it.",
    ),
    source: IL_ART5_S11,
  },
  emergencyDeclaration: {
    executiveMayDeclare: executiveKnown(true, IL_EMERGENCY_ACT),
    initialDurationDays: executiveKnown(30, IL_EMERGENCY_ACT),
    extension: executiveUnknown(
      notResolvedByR3H("How an Illinois disaster proclamation is extended"),
    ),
    legislativeTermination: executiveUnknown(
      notResolvedByR3H(
        "How the Illinois General Assembly may terminate a disaster proclamation",
      ),
    ),
    source: IL_EMERGENCY_ACT,
  },
  // Art. V, Sec. 12 vests the power in the Governor but leaves the manner of
  // applying for it to be regulated by law, which may itself install a review
  // board. The composite model is therefore not established; only scope is.
  clemency: {
    model: executiveUnknown<ClemencyModel>(
      "The accepted Illinois clemency nodes state a gubernatorial power subject to regulation of the manner of application. Because that regulation may itself install a review board, the value settles neither executive-sole nor any board model, and no model is inferred from its silence about one.",
    ),
    scope: executiveKnown(
      "pardon, commutation, reprieve — GUBERNATORIAL_SUBJECT_TO_APPLICATION_REGULATION",
      IL_ART5_S12,
    ),
    source: IL_ART5_S12,
  },
  budgetSubmission: {
    executiveMustSubmit: executiveKnown(true, IL_ART8_S2A),
    submissionDeadline: executiveKnown(
      "third_wednesday_in_february",
      IL_BUDGET_ACT,
    ),
    source: IL_ART8_S2A,
  },
  guard: {
    commandsMilitia: executiveKnown(true, IL_ART12_S4),
    scope: executiveKnown(
      "enforce_laws_suppress_insurrection_repel_invasion",
      IL_ART12_S4,
    ),
    source: IL_ART12_S4,
  },
  pluralExecutive: [
    ilOfficer("Attorney General"),
    ilOfficer("Secretary of State"),
    ilOfficer("Comptroller"),
    ilOfficer("Treasurer"),
  ],
  sources: [
    IL_ART5_S1,
    IL_ART3_S5,
    IL_ELECTION_CODE,
    IL_ART5_S9A,
    IL_ART5_S10,
    IL_ART5_S11,
    IL_ART5_S12,
    IL_ART8_S2A,
    IL_ART12_S4,
    IL_BUDGET_ACT,
    IL_EMERGENCY_ACT,
  ],
  unresolvedGaps: [
    "Executive orders and the administrative duty stay unknown: the accepted R3H rows for them are themselves UNKNOWN.",
    "Illinois's clemency model is unresolved. The accepted value subjects the gubernatorial power to regulation of the manner of application, which may install a review board, so neither executive-sole nor a board model is established.",
    "Whether Illinois's reorganization authority itself sunsets is unresolved; the accepted node states a disapproval window over an order, which is a different thing.",
    "How an Illinois disaster proclamation is extended, and how the General Assembly may terminate one, are unresolved.",
    "Special-session convening and agenda scope are held by accepted R3H nodes but routed to R3J, not compiled here.",
  ],
};

function ilOfficer(officeLabel: string): PluralExecutiveConstraint {
  return {
    officeLabel,
    independentlyElected: executiveKnown(true, IL_ART5_S1),
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
