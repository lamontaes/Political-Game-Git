import {
  fractionOf,
  knownRule,
  majorityOf,
  notApplicableRule,
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
 * Five legislatures are packed here because they differ *structurally*, not
 * cosmetically:
 * - Kentucky: ordinary bicameral, and a veto falls to a simple majority of
 *   elected members in each house;
 * - Nebraska: a single chamber with three separate constitutional floor stages
 *   and no second house or conference at all;
 * - Alaska: bicameral, but a veto is reconsidered by both houses sitting
 *   together as one 60-member body, with a higher bar for money bills;
 * - Minnesota: bicameral, a veto overridden by two-thirds of the members
 *   elected in each house, revenue bills confined to the House of
 *   Representatives, and a session capped at 120 legislative days;
 * - Illinois: bicameral, a veto overridden by three-fifths of the members
 *   elected in each house, a flat sixty-calendar-day presentment window, and a
 *   reduction veto on appropriation items that no other pack here has.
 *
 * Kentucky, Nebraska and Alaska were read on 2026-09-02 (see
 * docs/systems/legislative-rule-sources.md). Minnesota and Illinois were added
 * on 2026-09-05 from the operative text of each state's constitution; that
 * provenance and its retrieval method are recorded in the same document.
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

// ---------------------------------------------------------------------------
// Minnesota and Illinois — added 2026-09-05 from first-party official sources
//
// Both packs are compiled from the operative text of each state's constitution
// (article IV — the legislative article — and its passage, veto, session and
// enactment sections). Direct network egress to revisor.mn.gov and ilga.gov was
// blocked in the build environment, so the operative text of each cited section
// was read through an authoritative search index of the official constitution
// on 2026-09-05; the canonical instrument is cited as the source of record and
// the retrieval method is documented in docs/systems/legislative-rule-sources.md.
//
// Every `known` value below is the constitution's own words. The chamber-rule
// layer — committee structure, referral mechanics, discharge, conference — was
// not read for these two states, so those fields stay `unknown` rather than
// being copied from another state or inferred from common practice. Committees
// are therefore empty here: the packs assert no committee the sources did not
// establish.
// ---------------------------------------------------------------------------

const RETRIEVED_MN_IL = "2026-09-05";

/** A citation to a state constitution read on the 2026-09-05 primary-source pass. */
function constitutionSource(
  citation: string,
  sourceTitle: string,
  sourceUrl: string,
  verification: RuleVerificationStatus,
  note: string,
): RuleSourceRef {
  return {
    authority: "constitution",
    citation,
    sourceTitle,
    sourceUrl,
    retrievedAt: RETRIEVED_MN_IL,
    verification,
    note,
  };
}

const MN_CONST_URL = "https://www.revisor.mn.gov/constitution/";
const MN_CONST_TITLE = "The Constitution of the State of Minnesota";

const MN_ART4_SEC22 = constitutionSource(
  "Minn. Const. art. IV, § 22",
  MN_CONST_TITLE,
  MN_CONST_URL,
  "verified",
  'Majority vote of all members to pass a law: "No law shall be passed unless voted for by a majority of all the members elected to each house of the legislature, and the vote entered in the journal of each house."',
);
const MN_ART4_SEC23 = constitutionSource(
  "Minn. Const. art. IV, § 23",
  MN_CONST_TITLE,
  MN_CONST_URL,
  "verified",
  "Approval of bills by the governor. A bill not returned within three days (Sundays excepted) after presentment becomes law unless adjournment prevents its return; a bill passed in the last three days of a session may be presented within three days after final adjournment and becomes law only if the governor signs and deposits it within fourteen days, and otherwise does not become law. The governor may veto items of appropriation while approving the rest, returning a vetoed bill or item to the house of origin; a vetoed bill, and a vetoed appropriation item, is repassed over the objections by two-thirds of the members elected to each house.",
);
const MN_ART4_SEC12 = constitutionSource(
  "Minn. Const. art. IV, § 12",
  MN_CONST_TITLE,
  MN_CONST_URL,
  "verified",
  'Sessions: "The legislature shall meet at the seat of government in regular session in each biennium at the times prescribed by law for not exceeding a total of 120 legislative days. The legislature shall not meet in regular session, nor in any adjournment thereof, after the first Monday following the third Saturday in May of any year."',
);
const MN_ART4_SEC13 = constitutionSource(
  "Minn. Const. art. IV, § 13",
  MN_CONST_TITLE,
  MN_CONST_URL,
  "verified",
  'Quorum: "A majority of each house constitutes a quorum to transact business, but a smaller number may adjourn from day to day and compel the attendance of absent members in the manner and under the penalties it may provide."',
);
const MN_ART4_SEC18 = constitutionSource(
  "Minn. Const. art. IV, § 18",
  MN_CONST_TITLE,
  MN_CONST_URL,
  "verified",
  'Revenue bills: "All bills for raising revenue shall originate in the house of representatives, but the senate may propose and concur with the amendments as on other bills."',
);
const MN_ART4_SEC19 = constitutionSource(
  "Minn. Const. art. IV, § 19",
  MN_CONST_TITLE,
  MN_CONST_URL,
  "verified",
  "Every bill is considered on three different days in each house unless, in case of urgency, two-thirds of the house where the bill is pending deem it expedient to dispense with the rule. This establishes the separate-day requirement; the intermediate reading stages are set by each house's rules.",
);
const MN_ART4_SEC20 = constitutionSource(
  "Minn. Const. art. IV, § 20",
  MN_CONST_TITLE,
  MN_CONST_URL,
  "verified",
  'Enrollment: "Every bill passed by both houses shall be enrolled and signed by the presiding officer of each house." This is the point at which both chambers have agreed on one text.',
);
const MN_ART4_SEC7 = constitutionSource(
  "Minn. Const. art. IV, § 7",
  MN_CONST_TITLE,
  MN_CONST_URL,
  "verified",
  'Rules of government: "Each house may determine the rules of its proceedings, sit upon its own adjournment, punish its members for disorderly behavior, and with the concurrence of two-thirds expel a member." This is the authority under which referral, committee and floor-amendment rules are made; those chamber rules were not read for this pack.',
);

/** A Minnesota chamber. Seats and names are the constitution's; committees are not read. */
function minnesotaChamber(
  chamberKey: string,
  name: string,
  seats: number,
): ChamberRule {
  return {
    chamberKey,
    name,
    seats,
    quorum: knownRule(
      majorityOf("members-elected", "a majority of the house", MN_ART4_SEC13),
      MN_ART4_SEC13,
    ),
    introductionAllowed: true,
    referral: {
      authorityLabel: "Set by each house's rules of proceedings",
      multipleReferralAllowed: unknownRule(
        "Whether Minnesota permits referring one bill to several committees is set by each house's rules under Minn. Const. art. IV, § 7, which were not read for this pack.",
      ),
      everyMeasureMustBeHeard: unknownRule(
        "Whether every referred bill is guaranteed a hearing is set by each house's rules under Minn. Const. art. IV, § 7, which were not read for this pack.",
      ),
      source: MN_ART4_SEC7,
    },
    committees: [],
    floorStages: [
      {
        stageKey: "final-passage",
        label: "Third reading and final passage",
        amendable: true,
        separateLegislativeDayRequired: true,
        vote: knownRule(
          majorityOf(
            "members-elected",
            "a majority of all the members elected to the house",
            MN_ART4_SEC22,
          ),
          MN_ART4_SEC22,
        ),
        source: MN_ART4_SEC19,
      },
    ],
    amendments: {
      floorAmendmentsAllowed: unknownRule(
        'The authority for floor amendments is set by each house\'s rules under Minn. Const. art. IV, § 7, which were not read for this pack. Art. IV, § 18 speaks of amending revenue bills "as on other bills," but the general floor-amendment procedure is a chamber-rules matter left unresolved here.',
      ),
      germanenessStandard: unknownRule(
        "Minnesota's germaneness standard is set by each house's rules under Minn. Const. art. IV, § 7, which were not read for this pack.",
      ),
      source: MN_ART4_SEC7,
    },
  };
}

export const MINNESOTA_RULE_PACK: LegislativeRulePack = {
  packId: "us-mn-legislature-v1",
  jurisdictionKey: "US-MN",
  displayName: "Minnesota Legislature",
  structure: "bicameral",
  chambers: [
    minnesotaChamber("house", "House of Representatives", 134),
    minnesotaChamber("senate", "Senate", 67),
  ],
  chamberOrder: ["house", "senate"],
  interChamber: {
    kind: "second-chamber",
    concurrenceThreshold: majorityOf(
      "members-elected",
      "a majority of all the members elected to the house",
      MN_ART4_SEC22,
    ),
    conference: unknownRule(
      "Minnesota resolves inter-chamber differences by conference committee under each house's rules and the joint rules, which were not read for this pack; conference is not modelled.",
    ),
    source: MN_ART4_SEC20,
  },
  executive: {
    titleLabel: "Governor",
    presentmentRequired: knownRule(true, MN_ART4_SEC23),
    actionWindowDaysInSession: knownRule(3, MN_ART4_SEC23),
    actionWindowDaysAfterAdjournment: knownRule(14, MN_ART4_SEC23),
    inactionOutcomeInSession: knownRule(
      "becomes-law-without-signature",
      MN_ART4_SEC23,
    ),
    lineItemVeto: knownRule(true, MN_ART4_SEC23),
    override: {
      kind: "each-chamber",
      threshold: fractionOf(
        2,
        3,
        "members-elected",
        "two-thirds of the members elected to each house",
        MN_ART4_SEC23,
      ),
    },
    source: MN_ART4_SEC23,
  },
  enactment: {
    effectiveDateDistinctFromEnactment: unknownRule(
      "Whether taking effect is a date distinct from enactment is set by Minn. Stat. § 645.02, which was not read for this pack.",
    ),
    defaultEffectiveRule: unknownRule(
      "Minnesota's default effective date is set by Minn. Stat. § 645.02, which was not read for this pack.",
    ),
    source: MN_ART4_SEC22,
  },
  session: {
    sessionLabel: "Regular session",
    adjournmentRule: knownRule(
      "The legislature meets in regular session each biennium for not more than a total of 120 legislative days, and may not meet in regular session, or in any adjournment of it, after the first Monday following the third Saturday in May of any year.",
      MN_ART4_SEC12,
    ),
    measuresDieAtAdjournment: unknownRule(
      "Minnesota's legislature is a two-year body and a bill may carry from the first year of a biennium to the second; whether a measure dies at a given adjournment, rather than at the end of the biennium, is not settled by the sources read for this pack.",
    ),
    source: MN_ART4_SEC12,
  },
  sources: [
    MN_ART4_SEC22,
    MN_ART4_SEC23,
    MN_ART4_SEC12,
    MN_ART4_SEC13,
    MN_ART4_SEC18,
    MN_ART4_SEC19,
    MN_ART4_SEC20,
    MN_ART4_SEC7,
  ],
  unresolvedGaps: [
    "Minnesota's committee structure, referral among committees, and report and discharge thresholds are set by each house's rules and the joint rules, which were not read for this pack.",
    "Minnesota's authority for floor amendments and any germaneness standard are set by each house's rules, which were not read for this pack.",
    "Minnesota's conference committee composition and report rules are unresolved, and conference is not modelled.",
    "The default effective-date rule is set by Minn. Stat. § 645.02, which was not read for this pack.",
    "Whether a Minnesota measure dies at a given adjournment, as distinct from at the end of the biennium, is unresolved.",
    "This pack models a single third-reading final-passage stage; the Minnesota Constitution requires consideration on three different days (art. IV, § 19), but the intermediate general-orders and second-reading stages come from chamber rules not read here.",
    "Revenue bills must originate in the Minnesota House of Representatives (art. IV, § 18); the rule-pack schema has no per-chamber origination field, so this restriction is carried in the cited sources and this note rather than as a structural value.",
  ],
};

const IL_CONST_URL = "https://www.ilga.gov/commission/lrb/con4.htm";
const IL_CONST_TITLE =
  "Constitution of the State of Illinois (1970), Article IV";

const IL_ART4_SEC8 = constitutionSource(
  "Ill. Const. art. IV, § 8",
  IL_CONST_TITLE,
  IL_CONST_URL,
  "verified",
  'Passage of bills: "No bill shall become a law without the concurrence of a majority of the members elected to each house." Bills may originate in either house but may be amended or rejected by the other; a bill is read by title on three different days in each house; and bills, except bills for appropriations and for the codification, revision or rearrangement of laws, are confined to one subject.',
);
const IL_ART4_SEC9 = constitutionSource(
  "Ill. Const. art. IV, § 9",
  IL_CONST_TITLE,
  IL_CONST_URL,
  "verified",
  "Veto procedure: any bill not returned by the Governor within 60 calendar days after presentment becomes law. A vetoed bill is returned to the house of origin and becomes law if each house passes it again by a record vote of three-fifths of the members elected. The Governor may reduce or veto any item of appropriation; a vetoed item is returned like a vetoed bill and restored by three-fifths of the members elected, while an item reduced in amount is restored to its original amount by a majority of the members elected to each house.",
);
const IL_ART4_SEC5 = constitutionSource(
  "Ill. Const. art. IV, § 5",
  IL_CONST_TITLE,
  IL_CONST_URL,
  "verified",
  'Sessions: "The General Assembly shall convene each year on the second Wednesday of January." The constitution fixes the convening day and sets no fixed adjournment deadline for a regular session.',
);
const IL_ART4_SEC6 = constitutionSource(
  "Ill. Const. art. IV, § 6",
  IL_CONST_TITLE,
  IL_CONST_URL,
  "verified",
  'Organization: "A majority of the members elected to each house constitutes a quorum." Each house determines the rules of its proceedings, and its sessions and committee meetings are open to the public unless two-thirds of the members elected to that house vote to close them. The chamber rules made under this section were not read for this pack.',
);

/** An Illinois chamber. Seats and names are the constitution's; committees are not read. */
function illinoisChamber(
  chamberKey: string,
  name: string,
  seats: number,
): ChamberRule {
  return {
    chamberKey,
    name,
    seats,
    quorum: knownRule(
      majorityOf(
        "members-elected",
        "a majority of the members elected to the house",
        IL_ART4_SEC6,
      ),
      IL_ART4_SEC6,
    ),
    introductionAllowed: true,
    referral: {
      authorityLabel: "Set by each house's rules of proceedings",
      multipleReferralAllowed: unknownRule(
        "Whether Illinois permits referring one bill to several committees is set by each house's rules under Ill. Const. art. IV, § 6, which were not read for this pack.",
      ),
      everyMeasureMustBeHeard: unknownRule(
        "Whether every referred bill is guaranteed a hearing is set by each house's rules under Ill. Const. art. IV, § 6, which were not read for this pack.",
      ),
      source: IL_ART4_SEC6,
    },
    committees: [],
    floorStages: [
      {
        stageKey: "third-reading",
        label: "Third reading and final passage",
        amendable: true,
        separateLegislativeDayRequired: true,
        vote: knownRule(
          majorityOf(
            "members-elected",
            "a majority of the members elected to the house",
            IL_ART4_SEC8,
          ),
          IL_ART4_SEC8,
        ),
        source: IL_ART4_SEC8,
      },
    ],
    amendments: {
      floorAmendmentsAllowed: knownRule(true, IL_ART4_SEC8),
      germanenessStandard: unknownRule(
        "Illinois confines a bill to a single subject (Ill. Const. art. IV, § 8), but the germaneness standard applied to floor amendments is set by each house's rules, which were not read for this pack.",
      ),
      source: IL_ART4_SEC8,
    },
  };
}

export const ILLINOIS_RULE_PACK: LegislativeRulePack = {
  packId: "us-il-general-assembly-v1",
  jurisdictionKey: "US-IL",
  displayName: "Illinois General Assembly",
  structure: "bicameral",
  chambers: [
    illinoisChamber("house", "House of Representatives", 118),
    illinoisChamber("senate", "Senate", 59),
  ],
  chamberOrder: ["house", "senate"],
  interChamber: {
    kind: "second-chamber",
    concurrenceThreshold: majorityOf(
      "members-elected",
      "a majority of the members elected to the house",
      IL_ART4_SEC8,
    ),
    conference: unknownRule(
      "Illinois resolves inter-chamber differences by conference committee under the joint rules and each house's rules, which were not read for this pack; conference is not modelled.",
    ),
    source: IL_ART4_SEC8,
  },
  executive: {
    titleLabel: "Governor",
    presentmentRequired: knownRule(true, IL_ART4_SEC9),
    actionWindowDaysInSession: knownRule(60, IL_ART4_SEC9),
    actionWindowDaysAfterAdjournment: notApplicableRule(
      "Illinois applies a single 60-calendar-day window after presentment (Ill. Const. art. IV, § 9) and draws no separate post-adjournment action period.",
    ),
    inactionOutcomeInSession: knownRule(
      "becomes-law-without-signature",
      IL_ART4_SEC9,
    ),
    lineItemVeto: knownRule(true, IL_ART4_SEC9),
    override: {
      kind: "each-chamber",
      threshold: fractionOf(
        3,
        5,
        "members-elected",
        "three-fifths of the members elected to each house",
        IL_ART4_SEC9,
      ),
    },
    source: IL_ART4_SEC9,
  },
  enactment: {
    effectiveDateDistinctFromEnactment: unknownRule(
      "Illinois's effective-date rule is set by the Effective Date of Laws Act (5 ILCS 75), which was not read for this pack.",
    ),
    defaultEffectiveRule: unknownRule(
      "Illinois's default effective date is set by the Effective Date of Laws Act (5 ILCS 75), which was not read for this pack.",
    ),
    source: IL_ART4_SEC8,
  },
  session: {
    sessionLabel: "Regular session",
    adjournmentRule: knownRule(
      "The General Assembly convenes each year on the second Wednesday of January; the constitution sets no fixed adjournment deadline for a regular session.",
      IL_ART4_SEC5,
    ),
    measuresDieAtAdjournment: unknownRule(
      "The Illinois General Assembly is a two-year body; whether a measure dies at a given adjournment, rather than at the end of the General Assembly, is not settled by the sources read for this pack.",
    ),
    source: IL_ART4_SEC5,
  },
  sources: [IL_ART4_SEC8, IL_ART4_SEC9, IL_ART4_SEC5, IL_ART4_SEC6],
  unresolvedGaps: [
    "Illinois's committee structure, referral among committees, and report and discharge thresholds are set by each house's rules and the joint rules, which were not read for this pack.",
    "Illinois's germaneness standard applied to floor amendments is set by each house's rules, which were not read for this pack.",
    "Illinois's conference committee composition and report rules are unresolved, and conference is not modelled.",
    "The default effective-date rule is set by the Effective Date of Laws Act (5 ILCS 75), which was not read for this pack.",
    "Whether an Illinois measure dies at a given adjournment, as distinct from at the end of the two-year General Assembly, is unresolved.",
    "This pack models a single third-reading final-passage stage; the Illinois Constitution requires a reading by title on three different days (art. IV, § 8), but the intermediate reading and amendment stages come from chamber rules not read here.",
    "The Governor's reduction veto for appropriation items (a reduced item restored by a majority of the members elected, art. IV, § 9) is distinct from an ordinary item veto; the schema records only a line-item veto flag and the override threshold, so the reduction-restore majority is carried in the § 9 note rather than as its own field.",
  ],
};

export const LEGISLATIVE_RULE_PACKS: readonly LegislativeRulePack[] = [
  KENTUCKY_RULE_PACK,
  NEBRASKA_RULE_PACK,
  ALASKA_RULE_PACK,
  MINNESOTA_RULE_PACK,
  ILLINOIS_RULE_PACK,
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
