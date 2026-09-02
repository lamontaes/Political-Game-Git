import {
  fractionOf,
  knownRule,
  majorityOf,
  unknownRule,
  type ChamberRule,
  type LegislativeRulePack,
  type RuleSourceRef,
  type RuleVerificationStatus,
} from "./legislature-rules";

/**
 * Runtime rule packs compiled from the 50-state legislative institutional
 * research warehouse. Each value cites the official instrument it came from.
 *
 * Three legislatures are packed here because they differ *structurally*, not
 * cosmetically:
 * - Kentucky: ordinary bicameral, and a veto falls to a simple majority of
 *   elected members in each house;
 * - Nebraska: a single chamber with three separate constitutional floor stages
 *   and no second house or conference at all;
 * - Alaska: bicameral, but a veto is reconsidered by both houses sitting
 *   together as one 60-member body, with a higher bar for money bills.
 *
 * Anything the research did not resolve stays `unknown`. Anything the
 * institution does not have stays `not-applicable`. Neither is treated as zero.
 */

const RETRIEVED = "2026-09-02";

/**
 * Verification is a claim about evidence, not a default.
 *
 * `verified` means the operative text of the cited instrument was read at the
 * cited URL and says what the value claims. `partial` means the instrument and
 * section are the right ones but only a heading, table of contents or official
 * summary was checked. Nothing is marked verified by construction.
 */
function source(
  authority: RuleSourceRef["authority"],
  citation: string,
  sourceTitle: string,
  sourceUrl: string,
  verification: RuleVerificationStatus,
  note: string,
): RuleSourceRef {
  return {
    authority,
    citation,
    sourceTitle,
    sourceUrl,
    retrievedAt: RETRIEVED,
    verification,
    note,
  };
}

// ---------------------------------------------------------------------------
// Kentucky — ordinary bicameral, simple-majority veto override
//
// The two chambers keep their own rule books, and this pack keeps them apart:
// a House rule cannot establish Senate procedure, so each chamber cites its
// own instrument even where the two happen to agree.
// ---------------------------------------------------------------------------

const KY_CONST_URL =
  "https://legislature.ky.gov/Law/Constitution/Pages/default.aspx";
const KY_HOUSE_RULES_URL =
  "https://legislature.ky.gov/Legislators/Documents/HouseRules2024.pdf";
const KY_SENATE_RULES_URL =
  "https://legislature.ky.gov/Legislators/Documents/SenateRules2024.pdf";
const KY_HOUSE_RULES_TITLE =
  "Rules of the House of Representatives of the Commonwealth of Kentucky (2024)";
const KY_SENATE_RULES_TITLE =
  "Rules of the Senate of the Commonwealth of Kentucky (2024)";

const KY_SEC_46 = source(
  "constitution",
  "Ky. Const. Sec. 46",
  "The Constitution of the Commonwealth of Kentucky",
  KY_CONST_URL,
  "verified",
  "Bills must be reported by committee, printed and read; votes required for passage — a majority of all the members elected to each House.",
);
const KY_SEC_88 = source(
  "constitution",
  "Ky. Const. Sec. 88",
  "The Constitution of the Commonwealth of Kentucky",
  KY_CONST_URL,
  "partial",
  "Gubernatorial veto and reconsideration. The section was identified from the constitution's own table of sections; its operative text was not read line by line for this pack.",
);
const KY_SEC_42 = source(
  "constitution",
  "Ky. Const. Sec. 42",
  "The Constitution of the Commonwealth of Kentucky",
  KY_CONST_URL,
  "partial",
  "Session length and adjournment deadlines. This section fixes how long a session runs; it does not by itself say what becomes of a measure that is still pending when the session ends.",
);
const KY_SEC_47 = source(
  "constitution",
  "Ky. Const. Sec. 47",
  "The Constitution of the Commonwealth of Kentucky",
  KY_CONST_URL,
  "partial",
  "Revenue bills must originate in the House of Representatives.",
);

const KY_HOUSE_RULE_37 = source(
  "permanent-rules",
  "House Rule 37",
  KY_HOUSE_RULES_TITLE,
  KY_HOUSE_RULES_URL,
  "verified",
  "Committee on Committees: the Speaker, Speaker Pro Tempore, floor leaders, caucus chairs and whips; a majority of the Committee has full power to act on matters referred to it.",
);
const KY_HOUSE_RULE_38 = source(
  "permanent-rules",
  "House Rule 38",
  KY_HOUSE_RULES_TITLE,
  KY_HOUSE_RULES_URL,
  "verified",
  "Standing committees of the House, including Transportation.",
);
const KY_HOUSE_RULE_46 = source(
  "permanent-rules",
  "House Rule 46",
  KY_HOUSE_RULES_TITLE,
  KY_HOUSE_RULES_URL,
  "verified",
  "Committee Reports: a standing committee may report a bill with the expression of opinion that it should pass, that it should pass with a committee amendment or substitute, or that it should not pass.",
);
const KY_HOUSE_RULE_47 = source(
  "permanent-rules",
  "House Rule 47",
  KY_HOUSE_RULES_TITLE,
  KY_HOUSE_RULES_URL,
  "verified",
  "It requires a majority of the committee membership to report a bill; the chair keeps a record of each member's vote and reports the total on each side.",
);
const KY_HOUSE_RULE_54 = source(
  "permanent-rules",
  "House Rule 54",
  KY_HOUSE_RULES_TITLE,
  KY_HOUSE_RULES_URL,
  "verified",
  "Reference of Bills: the Committee on Committees may refer a bill to the proper standing committee; a House bill amended in the Senate and returned for concurrence is referred to the Rules Committee.",
);
const KY_HOUSE_RULE_58 = source(
  "permanent-rules",
  "House Rule 58",
  KY_HOUSE_RULES_TITLE,
  KY_HOUSE_RULES_URL,
  "verified",
  "Orders of the Day: after second reading a bill goes to the Rules Committee, which decides whether it is placed in the Orders of the Day.",
);
const KY_HOUSE_RULE_59 = source(
  "permanent-rules",
  "House Rule 59",
  KY_HOUSE_RULES_TITLE,
  KY_HOUSE_RULES_URL,
  "verified",
  "Final Passage: once the House concurs in a Senate amendment, the bill is immediately placed upon its passage.",
);
const KY_HOUSE_RULE_60 = source(
  "permanent-rules",
  "House Rule 60",
  KY_HOUSE_RULES_TITLE,
  KY_HOUSE_RULES_URL,
  "verified",
  "Amendments to Bills: form and signature requirements for amendments offered in the House.",
);

const KY_HOUSE_RULE_48 = source(
  "permanent-rules",
  "House Rule 48",
  KY_HOUSE_RULES_TITLE,
  KY_HOUSE_RULES_URL,
  "partial",
  "Discharge Petition: the remedy where a committee holds a bill, which is only needed because a committee may hold one.",
);

const KY_SENATE_RULE_37 = source(
  "permanent-rules",
  "Senate Rule 37",
  KY_SENATE_RULES_TITLE,
  KY_SENATE_RULES_URL,
  "partial",
  "Committee on Committees of the Senate. Identified from the Senate rule headings; its composition was not read line by line for this pack.",
);
const KY_SENATE_RULE_38 = source(
  "permanent-rules",
  "Senate Rule 38",
  KY_SENATE_RULES_TITLE,
  KY_SENATE_RULES_URL,
  "verified",
  "Standing committees of the Senate, including Transportation.",
);
const KY_SENATE_RULE_46 = source(
  "permanent-rules",
  "Senate Rule 46",
  KY_SENATE_RULES_TITLE,
  KY_SENATE_RULES_URL,
  "verified",
  "Committee Reports: every committee should report the disposition of every bill referred to it as promptly as possible, and may report it with the expression of opinion that it should pass, should pass as amended or substituted, or should not pass.",
);
const KY_SENATE_RULE_47 = source(
  "permanent-rules",
  "Senate Rule 47",
  KY_SENATE_RULES_TITLE,
  KY_SENATE_RULES_URL,
  "verified",
  "Majority and Minority Reports: it requires a majority of the committee membership to report a bill, and the chairman keeps a record of each member's vote.",
);
const KY_SENATE_RULE_48 = source(
  "permanent-rules",
  "Senate Rule 48",
  KY_SENATE_RULES_TITLE,
  KY_SENATE_RULES_URL,
  "verified",
  "Failure to Report: where a committee fails or refuses to report a bill, any member may petition, and a majority of the members elected to the Senate may vote to take the bill from the committee.",
);
const KY_SENATE_RULE_54 = source(
  "permanent-rules",
  "Senate Rule 54",
  KY_SENATE_RULES_TITLE,
  KY_SENATE_RULES_URL,
  "verified",
  "Reference of Bills: the Committee on Committees refers all bills to the proper standing committee not later than the fifth day the Senate is in session after introduction; a Senate bill amended in the House and returned for concurrence is referred to the Rules Committee.",
);
const KY_SENATE_RULE_58 = source(
  "permanent-rules",
  "Senate Rule 58",
  KY_SENATE_RULES_TITLE,
  KY_SENATE_RULES_URL,
  "partial",
  "Orders of the Day. Identified from the Senate rule headings; its operative text was not read line by line for this pack.",
);
const KY_SENATE_RULE_60 = source(
  "permanent-rules",
  "Senate Rule 60",
  KY_SENATE_RULES_TITLE,
  KY_SENATE_RULES_URL,
  "partial",
  "Amendments to Bills. Identified from the Senate rule headings; its operative text was not read line by line for this pack.",
);

interface KentuckyChamberRules {
  readonly committeeOnCommittees: RuleSourceRef;
  readonly standingCommittees: RuleSourceRef;
  readonly committeeReports: RuleSourceRef;
  readonly reportThreshold: RuleSourceRef;
  readonly reference: RuleSourceRef;
  readonly ordersOfTheDay: RuleSourceRef;
  readonly amendments: RuleSourceRef;
  /** The rule that says a committee can simply sit on a bill, where there is one. */
  readonly failureToReport: RuleSourceRef | null;
}

const KY_HOUSE_RULES: KentuckyChamberRules = {
  committeeOnCommittees: KY_HOUSE_RULE_37,
  standingCommittees: KY_HOUSE_RULE_38,
  committeeReports: KY_HOUSE_RULE_46,
  reportThreshold: KY_HOUSE_RULE_47,
  reference: KY_HOUSE_RULE_54,
  ordersOfTheDay: KY_HOUSE_RULE_58,
  amendments: KY_HOUSE_RULE_60,
  failureToReport: KY_HOUSE_RULE_48,
};

const KY_SENATE_RULES: KentuckyChamberRules = {
  committeeOnCommittees: KY_SENATE_RULE_37,
  standingCommittees: KY_SENATE_RULE_38,
  committeeReports: KY_SENATE_RULE_46,
  reportThreshold: KY_SENATE_RULE_47,
  reference: KY_SENATE_RULE_54,
  ordersOfTheDay: KY_SENATE_RULE_58,
  amendments: KY_SENATE_RULE_60,
  failureToReport: KY_SENATE_RULE_48,
};

function kentuckyChamber(
  chamberKey: string,
  name: string,
  seats: number,
  introductionAllowed: boolean,
  chamberRules: KentuckyChamberRules,
): ChamberRule {
  return {
    chamberKey,
    name,
    seats,
    quorum: unknownRule(
      "Kentucky's constitutional quorum fraction was not resolved for this pack.",
    ),
    introductionAllowed,
    referral: {
      authorityLabel: "Committee on Committees",
      multipleReferralAllowed: unknownRule(
        "Whether Kentucky permits referring one bill to several committees in sequence was not resolved for this pack.",
      ),
      everyMeasureMustBeHeard: chamberRules.failureToReport
        ? knownRule(false, chamberRules.failureToReport)
        : unknownRule(
            "No House rule establishing that every referred bill must be heard was found; the House rules read for this pack are silent on the point.",
          ),
      source: chamberRules.reference,
    },
    committees: [
      {
        committeeKey: `${chamberKey}-transportation`,
        name: "Committee on Transportation",
        // The committee is real and named in the chamber's own rules. How many
        // members sit on it in a given session is not fixed by those rules, so
        // the number here is the scenario's, not Kentucky's.
        appointedMembers: chamberKey === "house" ? 17 : 11,
        membershipBasis: "scenario-fixture",
        reportThreshold: majorityOf(
          "committee-members-appointed",
          "a majority of the committee's membership",
          chamberRules.reportThreshold,
        ),
        chairMayDeclineToHear: chamberRules.failureToReport
          ? knownRule(true, chamberRules.failureToReport)
          : unknownRule(
              "Whether a House committee chair may decline to take a bill up was not resolved for this pack.",
            ),
        publicHearingNotice: unknownRule(
          "Kentucky's committee notice interval was not resolved for this pack.",
        ),
      },
    ],
    floorStages: [
      {
        stageKey: "final-passage",
        label: "Third reading and final passage",
        amendable: true,
        separateLegislativeDayRequired: true,
        vote: knownRule(
          majorityOf(
            "members-elected",
            "a majority of all the members elected to the chamber",
            KY_SEC_46,
          ),
          KY_SEC_46,
        ),
        source: chamberRules.ordersOfTheDay,
      },
    ],
    amendments: {
      floorAmendmentsAllowed: knownRule(true, chamberRules.amendments),
      germanenessStandard: unknownRule(
        "Kentucky's germaneness standard was not resolved for this pack.",
      ),
      source: chamberRules.amendments,
    },
  };
}

export const KENTUCKY_RULE_PACK: LegislativeRulePack = {
  packId: "us-ky-general-assembly-v1",
  jurisdictionKey: "US-KY",
  displayName: "Kentucky General Assembly",
  structure: "bicameral",
  chambers: [
    kentuckyChamber(
      "house",
      "House of Representatives",
      100,
      true,
      KY_HOUSE_RULES,
    ),
    kentuckyChamber("senate", "Senate", 38, true, KY_SENATE_RULES),
  ],
  chamberOrder: ["house", "senate"],
  interChamber: {
    kind: "second-chamber",
    concurrenceThreshold: majorityOf(
      "members-elected",
      "a majority of all the members elected to the chamber",
      KY_SEC_46,
    ),
    conference: unknownRule(
      "Both chambers provide for conference committees, but the composition and report rules were not read for this pack, and conference is not modelled.",
    ),
    source: KY_HOUSE_RULE_54,
  },
  executive: {
    titleLabel: "Governor",
    presentmentRequired: knownRule(true, KY_SEC_88),
    actionWindowDaysInSession: knownRule(10, KY_SEC_88),
    actionWindowDaysAfterAdjournment: unknownRule(
      "The period the Governor has after adjournment was not resolved for this pack.",
    ),
    inactionOutcomeInSession: unknownRule(
      "What becomes of a Kentucky bill the Governor neither signs nor returns was not resolved for this pack.",
    ),
    lineItemVeto: knownRule(true, KY_SEC_88),
    override: {
      kind: "each-chamber",
      threshold: majorityOf(
        "members-elected",
        "a majority of all the members elected to each house",
        KY_SEC_88,
      ),
    },
    source: KY_SEC_88,
  },
  enactment: {
    effectiveDateDistinctFromEnactment: unknownRule(
      "Kentucky's default effective-date rule was not resolved for this pack; Sec. 55 is the section to review.",
    ),
    defaultEffectiveRule: unknownRule(
      "When a Kentucky act takes effect was not resolved for this pack; Sec. 55 is the section to review.",
    ),
    source: KY_SEC_46,
  },
  session: {
    sessionLabel: "Regular session",
    adjournmentRule: knownRule(
      "Even-year sessions run 60 legislative days and adjourn by 15 April; odd-year sessions run 30 legislative days and adjourn by 30 March.",
      KY_SEC_42,
    ),
    measuresDieAtAdjournment: unknownRule(
      "Sec. 42 fixes how long a session runs; it does not itself say what becomes of a measure still pending at adjournment, and no other source was read that establishes it.",
    ),
    source: KY_SEC_42,
  },
  sources: [
    KY_SEC_46,
    KY_SEC_88,
    KY_SEC_42,
    KY_SEC_47,
    KY_HOUSE_RULE_37,
    KY_HOUSE_RULE_38,
    KY_HOUSE_RULE_46,
    KY_HOUSE_RULE_47,
    KY_HOUSE_RULE_48,
    KY_HOUSE_RULE_54,
    KY_HOUSE_RULE_58,
    KY_HOUSE_RULE_59,
    KY_HOUSE_RULE_60,
    KY_SENATE_RULE_37,
    KY_SENATE_RULE_38,
    KY_SENATE_RULE_46,
    KY_SENATE_RULE_47,
    KY_SENATE_RULE_48,
    KY_SENATE_RULE_54,
    KY_SENATE_RULE_58,
    KY_SENATE_RULE_60,
  ],
  unresolvedGaps: [
    "Constitutional quorum fraction is unresolved.",
    "Post-adjournment gubernatorial action period is unresolved.",
    "Outcome of gubernatorial inaction is unresolved.",
    "Default effective-date rule is unresolved; Sec. 55 is the section to review.",
    "What becomes of a pending measure at adjournment is unresolved.",
    "Conference committee composition and report rules are unresolved, and conference is not modelled.",
    "Committee sizes here are the scenario's, not Kentucky's.",
  ],
};

// ---------------------------------------------------------------------------
// Nebraska — unicameral, three constitutional floor stages, no second chamber
// ---------------------------------------------------------------------------

const NE_CONST_URL =
  "https://nebraskalegislature.gov/laws/browse-constitution.php";
const NE_RULES_URL = "https://nebraskalegislature.gov/about/rules.php";
const NE_LAWMAKING_URL = "https://nebraskalegislature.gov/about/lawmaking.php";

const NE_LAWMAKING = source(
  "parliamentary-fallback",
  "Lawmaking in Nebraska",
  "Nebraska Legislature — official explanation of how a bill becomes law",
  NE_LAWMAKING_URL,
  "verified",
  "A nine-member Reference Committee assigns bills among fourteen standing committees; with the exception of a few technical bills, most bills must receive a public hearing; a majority of the Legislature — 25 votes — adopts amendments and advances a bill from General File; and a bill becomes law if the Governor signs it or declines to act.",
);
const NE_ART3_SEC14 = source(
  "constitution",
  "Neb. Const. Art. III, Sec. 14",
  "The Constitution of the State of Nebraska",
  NE_CONST_URL,
  "partial",
  "Printing, reading and final passage of bills. This section governs final reading and passage; the General File and Select File stages come from the Legislature's own rules and its official explanation of the process, not from this section alone.",
);
const NE_ART4_SEC15 = source(
  "constitution",
  "Neb. Const. Art. IV, Sec. 15",
  "The Constitution of the State of Nebraska",
  NE_CONST_URL,
  "partial",
  "Gubernatorial veto and reconsideration; three-fifths of the members elected override.",
);
const NE_ART3_SEC10 = source(
  "constitution",
  "Neb. Const. Art. III, Sec. 10",
  "The Constitution of the State of Nebraska",
  NE_CONST_URL,
  "partial",
  "Ninety legislative days in odd-numbered years and sixty in even-numbered years. This section sets session length; it does not itself say what becomes of a pending bill.",
);
const NE_RULE_3 = source(
  "permanent-rules",
  "Legislative Rule 3",
  "Rules of the Nebraska Unicameral Legislature",
  NE_RULES_URL,
  "partial",
  "Reference of bills by the Reference Committee and committee consideration.",
);
const NE_RULE_6 = source(
  "permanent-rules",
  "Legislative Rule 6",
  "Rules of the Nebraska Unicameral Legislature",
  NE_RULES_URL,
  "partial",
  "General File, Select File and Final Reading as the three separate stages a bill must clear.",
);

const NE_MAJORITY_ELECTED = majorityOf(
  "members-elected",
  "a majority of all the senators elected",
  NE_LAWMAKING,
);

export const NEBRASKA_RULE_PACK: LegislativeRulePack = {
  packId: "us-ne-legislature-v1",
  jurisdictionKey: "US-NE",
  displayName: "Nebraska Legislature",
  structure: "unicameral",
  chambers: [
    {
      chamberKey: "legislature",
      name: "Legislature",
      seats: 49,
      quorum: unknownRule(
        "Nebraska's quorum fraction was not resolved for this pack.",
      ),
      introductionAllowed: true,
      referral: {
        authorityLabel: "Reference Committee",
        multipleReferralAllowed: unknownRule(
          "Whether Nebraska permits referring one bill to several committees was not resolved for this pack.",
        ),
        // The official explanation says *most* bills get a hearing, with
        // exceptions for a few technical bills. That is not a guarantee, and
        // this pack will not turn "most" into "every".
        everyMeasureMustBeHeard: unknownRule(
          "Nebraska's official explanation says most bills receive a public hearing, with exceptions for a few technical bills. No source read for this pack establishes a universal guarantee, and which bills are excepted was not resolved.",
        ),
        source: NE_LAWMAKING,
      },
      committees: [
        {
          committeeKey: "transportation-telecommunications",
          name: "Transportation and Telecommunications Committee",
          // The Reference Committee routes bills among fourteen standing
          // committees. Which committee this is, and how many senators sit on
          // it, are the scenario's choices rather than sourced facts.
          appointedMembers: 8,
          membershipBasis: "scenario-fixture",
          reportThreshold: majorityOf(
            "committee-members-appointed",
            "a majority of the committee's membership",
            NE_RULE_3,
          ),
          chairMayDeclineToHear: unknownRule(
            "Whether a Nebraska committee chair may decline to take a bill up was not resolved for this pack.",
          ),
          publicHearingNotice: unknownRule(
            "Nebraska's committee notice interval was not resolved for this pack.",
          ),
        },
      ],
      floorStages: [
        {
          stageKey: "general-file",
          label: "General File",
          amendable: true,
          separateLegislativeDayRequired: true,
          vote: knownRule(NE_MAJORITY_ELECTED, NE_LAWMAKING),
          source: NE_RULE_6,
        },
        {
          stageKey: "select-file",
          label: "Select File",
          amendable: true,
          separateLegislativeDayRequired: true,
          vote: knownRule(NE_MAJORITY_ELECTED, NE_LAWMAKING),
          source: NE_RULE_6,
        },
        {
          stageKey: "final-reading",
          label: "Final Reading",
          amendable: false,
          separateLegislativeDayRequired: true,
          vote: knownRule(NE_MAJORITY_ELECTED, NE_ART3_SEC14),
          source: NE_ART3_SEC14,
        },
      ],
      amendments: {
        floorAmendmentsAllowed: knownRule(true, NE_LAWMAKING),
        germanenessStandard: unknownRule(
          "Nebraska's germaneness standard was not resolved for this pack.",
        ),
        source: NE_LAWMAKING,
      },
    },
  ],
  chamberOrder: ["legislature"],
  interChamber: {
    kind: "not-applicable",
    note: "Nebraska has one chamber, so there is no second house, no concurrence and no conference committee.",
  },
  executive: {
    titleLabel: "Governor",
    presentmentRequired: knownRule(true, NE_ART4_SEC15),
    actionWindowDaysInSession: knownRule(5, NE_ART4_SEC15),
    actionWindowDaysAfterAdjournment: unknownRule(
      "The period the Governor has after adjournment was not resolved for this pack.",
    ),
    inactionOutcomeInSession: knownRule(
      "becomes-law-without-signature",
      NE_LAWMAKING,
    ),
    lineItemVeto: knownRule(true, NE_ART4_SEC15),
    override: {
      kind: "each-chamber",
      threshold: fractionOf(
        3,
        5,
        "members-elected",
        "three-fifths of all the senators elected",
        NE_ART4_SEC15,
      ),
    },
    source: NE_ART4_SEC15,
  },
  enactment: {
    effectiveDateDistinctFromEnactment: unknownRule(
      "Nebraska's default effective-date rule was not resolved for this pack.",
    ),
    defaultEffectiveRule: unknownRule(
      "When a Nebraska act takes effect was not resolved for this pack.",
    ),
    source: NE_ART3_SEC14,
  },
  session: {
    sessionLabel: "Regular session",
    adjournmentRule: knownRule(
      "Ninety legislative days in odd-numbered years and sixty in even-numbered years.",
      NE_ART3_SEC10,
    ),
    // Bills carry over from the first session of a biennium to the second and
    // die at the end of the biennium. That is a different event from each
    // adjournment, and this field cannot tell the two apart, so it stays
    // unresolved rather than claiming the wrong one.
    measuresDieAtAdjournment: unknownRule(
      "Nebraska bills carry over within a biennium and die at its end, which is not the same as dying at each adjournment; no source read for this pack resolves this field as asked.",
    ),
    source: NE_ART3_SEC10,
  },
  sources: [
    NE_LAWMAKING,
    NE_ART3_SEC14,
    NE_ART4_SEC15,
    NE_ART3_SEC10,
    NE_RULE_3,
    NE_RULE_6,
  ],
  unresolvedGaps: [
    "Quorum fraction is unresolved.",
    "Post-adjournment gubernatorial action period is unresolved.",
    "Default effective-date rule is unresolved.",
    "Whether every referred bill is guaranteed a hearing is unresolved; the official explanation says most bills, with exceptions.",
    "Carryover within a biennium is real but is not the same as dying at adjournment, and this pack does not model the distinction.",
    "Which standing committee takes a bill, and its size, are the scenario's.",
  ],
};

// ---------------------------------------------------------------------------
// Alaska — bicameral, but vetoes are reconsidered in one joint sitting
// ---------------------------------------------------------------------------

const AK_CONST_URL = "https://www.akleg.gov/basis/constitution.asp";
const AK_UNIFORM_URL = "https://lec.akleg.gov/docs/pdf/uniform_rules.pdf";
const AK_UNIFORM_TITLE =
  "Uniform Rules of the Alaska State Legislature (adopted 2021)";
const AK_PROCESS_URL =
  "https://akleg.gov/docs/pdf/Legislative-Process-in-Alaska.pdf";

const AK_ART2_SEC14 = source(
  "constitution",
  "Alaska Const. Art. II, Sec. 14",
  "The Constitution of the State of Alaska",
  AK_CONST_URL,
  "partial",
  "Passage of bills: three readings, and a majority of the membership of each house for final passage.",
);
const AK_ART2_SEC15 = source(
  "constitution",
  "Alaska Const. Art. II, Sec. 15",
  "The Constitution of the State of Alaska",
  AK_CONST_URL,
  "verified",
  "Veto: the Governor may veto bills and may, by veto, strike or reduce items in appropriation bills, returning any vetoed bill with objections to the house of origin.",
);
const AK_ART2_SEC16 = source(
  "constitution",
  "Alaska Const. Art. II, Sec. 16",
  "The Constitution of the State of Alaska",
  AK_CONST_URL,
  "verified",
  "Action Upon Veto: the legislature meets immediately in joint session; bills to raise revenue and appropriation bills or items become law on three-fourths of the membership, other vetoed bills on two-thirds.",
);
const AK_ART2_SEC17 = source(
  "constitution",
  "Alaska Const. Art. II, Sec. 17",
  "The Constitution of the State of Alaska",
  AK_CONST_URL,
  "verified",
  "Bills Not Signed: a bill becomes law if the Governor neither signs nor vetoes it within fifteen days, Sundays excepted, while the legislature is in session, or within twenty days if it is not.",
);
const AK_ART2_SEC18 = source(
  "constitution",
  "Alaska Const. Art. II, Sec. 18",
  "The Constitution of the State of Alaska",
  AK_CONST_URL,
  "verified",
  "Effective Date: laws become effective ninety days after enactment, and the legislature may provide another effective date by concurrence of two-thirds of the membership of each house.",
);
const AK_ART2_SEC8 = source(
  "constitution",
  "Alaska Const. Art. II, Sec. 8",
  "The Constitution of the State of Alaska",
  AK_CONST_URL,
  "partial",
  "Regular sessions run 121 consecutive calendar days, extendable by ten days.",
);
const AK_UNIFORM_20 = source(
  "uniform-rules",
  "Uniform Rule 20",
  AK_UNIFORM_TITLE,
  AK_UNIFORM_URL,
  "partial",
  "Standing committees and their jurisdiction. The presiding officer refers a bill according to the jurisdictions this rule sets out.",
);
const AK_UNIFORM_23 = source(
  "uniform-rules",
  "Uniform Rule 23",
  AK_UNIFORM_TITLE,
  AK_UNIFORM_URL,
  "verified",
  "Committee Meetings: written notice of the time, place and subject of committee meetings must reach the chief clerk or secretary by 4:00 p.m. on the Thursday before the week of the meeting.",
);
const AK_UNIFORM_43 = source(
  "uniform-rules",
  "Uniform Rule 43",
  AK_UNIFORM_TITLE,
  AK_UNIFORM_URL,
  "verified",
  "Enrollment: once a bill has passed both houses the presiding officer of the house of origin directs that it be enrolled and checked before placement in final form.",
);
const AK_PROCESS = source(
  "parliamentary-fallback",
  "Legislative Process in Alaska",
  "Alaska State Legislature — official guide to the legislative process",
  AK_PROCESS_URL,
  "partial",
  "The presiding officer refers a bill to one or more committees, whose jurisdictions are set out in Uniform Rule 20.",
);

function alaskaChamber(
  chamberKey: string,
  name: string,
  seats: number,
): ChamberRule {
  return {
    chamberKey,
    name,
    seats,
    quorum: unknownRule(
      "Alaska's quorum fraction was not resolved for this pack.",
    ),
    introductionAllowed: true,
    referral: {
      authorityLabel: "Presiding officer",
      multipleReferralAllowed: knownRule(true, AK_PROCESS),
      everyMeasureMustBeHeard: unknownRule(
        "Whether Alaska guarantees every referred bill a hearing was not resolved for this pack.",
      ),
      source: AK_PROCESS,
    },
    committees: [
      {
        committeeKey: `${chamberKey}-transportation`,
        name: "Transportation Committee",
        // Both the committee named here and its size are the scenario's.
        appointedMembers: 7,
        membershipBasis: "scenario-fixture",
        reportThreshold: majorityOf(
          "committee-members-appointed",
          "a majority of the committee's membership",
          AK_UNIFORM_23,
        ),
        chairMayDeclineToHear: unknownRule(
          "Alaska chair scheduling discretion was not resolved for this pack.",
        ),
        publicHearingNotice: knownRule(
          "Written notice of the meeting must reach the chief clerk or secretary by 4:00 p.m. on the Thursday before the week it is held.",
          AK_UNIFORM_23,
        ),
      },
    ],
    floorStages: [
      {
        stageKey: "final-passage",
        label: "Third reading and final passage",
        amendable: true,
        separateLegislativeDayRequired: true,
        vote: knownRule(
          majorityOf(
            "members-elected",
            "a majority of the membership of the house",
            AK_ART2_SEC14,
          ),
          AK_ART2_SEC14,
        ),
        source: AK_ART2_SEC14,
      },
    ],
    amendments: {
      floorAmendmentsAllowed: unknownRule(
        "No rule establishing the authority for floor amendments in Alaska was read for this pack. Uniform Rule 22 is Open and Executive Sessions and does not supply it.",
      ),
      germanenessStandard: unknownRule(
        "Alaska's germaneness standard was not resolved for this pack.",
      ),
      source: AK_UNIFORM_20,
    },
  };
}

export const ALASKA_RULE_PACK: LegislativeRulePack = {
  packId: "us-ak-legislature-v1",
  jurisdictionKey: "US-AK",
  displayName: "Alaska State Legislature",
  structure: "bicameral",
  chambers: [
    alaskaChamber("house", "House of Representatives", 40),
    alaskaChamber("senate", "Senate", 20),
  ],
  chamberOrder: ["house", "senate"],
  interChamber: {
    kind: "second-chamber",
    concurrenceThreshold: majorityOf(
      "members-elected",
      "a majority of the membership of the house",
      AK_ART2_SEC14,
    ),
    conference: unknownRule(
      "Alaska provides for conference committees, but the rule was not read for this pack, and conference is not modelled.",
    ),
    source: AK_UNIFORM_43,
  },
  executive: {
    titleLabel: "Governor",
    presentmentRequired: knownRule(true, AK_ART2_SEC15),
    actionWindowDaysInSession: knownRule(15, AK_ART2_SEC17),
    actionWindowDaysAfterAdjournment: knownRule(20, AK_ART2_SEC17),
    inactionOutcomeInSession: knownRule(
      "becomes-law-without-signature",
      AK_ART2_SEC17,
    ),
    lineItemVeto: knownRule(true, AK_ART2_SEC15),
    override: {
      kind: "joint-session",
      forumName: "Joint session of the Legislature",
      combinedSeats: 60,
      threshold: fractionOf(
        2,
        3,
        "joint-total-membership",
        "two-thirds of the membership of the legislature sitting jointly",
        AK_ART2_SEC16,
      ),
      appropriationsThreshold: knownRule(
        fractionOf(
          3,
          4,
          "joint-total-membership",
          "three-quarters of the membership of the legislature, for revenue and appropriation bills",
          AK_ART2_SEC16,
        ),
        AK_ART2_SEC16,
      ),
    },
    source: AK_ART2_SEC15,
  },
  enactment: {
    effectiveDateDistinctFromEnactment: knownRule(true, AK_ART2_SEC18),
    defaultEffectiveRule: knownRule(
      "An act takes effect ninety days after enactment, unless two-thirds of the membership of each house set another date.",
      AK_ART2_SEC18,
    ),
    source: AK_ART2_SEC18,
  },
  session: {
    sessionLabel: "Regular session",
    adjournmentRule: knownRule(
      "One hundred twenty-one consecutive calendar days from the third Tuesday in January, extendable by ten days.",
      AK_ART2_SEC8,
    ),
    measuresDieAtAdjournment: unknownRule(
      "Whether Alaska measures carry over within a legislature was not resolved for this pack.",
    ),
    source: AK_ART2_SEC8,
  },
  sources: [
    AK_ART2_SEC14,
    AK_ART2_SEC15,
    AK_ART2_SEC16,
    AK_ART2_SEC17,
    AK_ART2_SEC18,
    AK_ART2_SEC8,
    AK_UNIFORM_20,
    AK_UNIFORM_23,
    AK_UNIFORM_43,
    AK_PROCESS,
  ],
  unresolvedGaps: [
    "Quorum fraction is unresolved.",
    "The authority for floor amendments is unresolved, so this pack does not permit them.",
    "Whether every referred bill is guaranteed a hearing is unresolved.",
    "Whether measures carry over within a legislature is unresolved.",
    "Conference committee rules are unresolved, and conference is not modelled.",
    "Committee sizes here are the scenario's, not Alaska's.",
  ],
};

export const LEGISLATIVE_RULE_PACKS: readonly LegislativeRulePack[] = [
  KENTUCKY_RULE_PACK,
  NEBRASKA_RULE_PACK,
  ALASKA_RULE_PACK,
];

export function rulePackById(packId: string): LegislativeRulePack {
  const pack = LEGISLATIVE_RULE_PACKS.find(
    (candidate) => candidate.packId === packId,
  );
  if (!pack) {
    throw new Error(`No legislative rule pack is registered as '${packId}'.`);
  }
  return pack;
}
