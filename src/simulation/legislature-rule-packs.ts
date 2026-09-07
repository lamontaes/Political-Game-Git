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
 * Nine legislatures are packed here because they differ *structurally*, not
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
 *   reduction veto on appropriation items that no other pack here has;
 * - Maryland: three-fifths of the members elected to override, a regular
 *   session capped at ninety days a year, and a default effective date fixed
 *   by calendar in the constitution itself;
 * - Missouri: the only pack whose constitution requires every bill to be
 *   referred to a committee and states its own germaneness standard, with a
 *   veto reconsidered by two-thirds of the elected members;
 * - Nevada: the first biennial legislature here, adjourning sine die at the end
 *   of the 120th consecutive calendar day, and the only pack that leaves the
 *   item veto unresolved rather than claiming or denying one;
 * - Ohio: three-fifths to override like Illinois but on a different body, and a
 *   default effective date measured from filing with the secretary of state
 *   because that is when the referendum window opens.
 *
 * Kentucky, Nebraska and Alaska were read on 2026-09-02 (see
 * docs/systems/legislative-rule-sources.md). Minnesota and Illinois were added
 * on 2026-09-05, and Maryland, Missouri, Nevada and Ohio on 2026-09-06, from
 * the operative text of each state's constitution; that provenance and its
 * retrieval method are recorded in the same document.
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
  introductionAllowed: boolean,
  chamberRules: KentuckyChamberRules,
): ChamberRule {
  return {
    chamberKey,
    name,
    seats: unknownRule(
      "Kentucky's formal chamber seat count was carried from compiled research, but no instrument fixing it was separately read for this pack. The unresolved formal count carries no numeric fallback.",
    ),
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
        // Each chamber's own Amendments to Bills rule is what lets a member
        // amend on the floor, and it is the same rule this pack already reads
        // for the chamber-level permission.
        amendable: knownRule(true, chamberRules.amendments),
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
    kentuckyChamber("house", "House of Representatives", true, KY_HOUSE_RULES),
    kentuckyChamber("senate", "Senate", true, KY_SENATE_RULES),
  ],
  chamberOrder: ["house", "senate"],
  origination: {
    // Sec. 47 confines revenue bills to the House. Nothing read for this pack
    // says where an ordinary Kentucky bill may start, so that stays unresolved
    // rather than being read off the order the chambers happen to be listed in.
    generalOrigination: unknownRule(
      "Where an ordinary Kentucky bill may be introduced was not resolved for this pack; Sec. 47 speaks only to revenue bills.",
    ),
    subjectRestrictions: [
      {
        subjectClass: "revenue",
        chamberKeys: ["house"],
        source: KY_SEC_47,
        note: "Revenue bills must originate in the House of Representatives.",
      },
    ],
    source: KY_SEC_47,
  },
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
      seats: unknownRule(
        "Nebraska's formal chamber seat count was carried from compiled research, but no instrument fixing the exact number was separately read for this pack. The unresolved formal count carries no numeric fallback.",
      ),
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
          // The Legislature's own explanation says twenty-five votes adopt
          // amendments and advance a bill from General File, which is this
          // stage taking amendments in so many words.
          amendable: knownRule(true, NE_LAWMAKING),
          separateLegislativeDayRequired: true,
          vote: knownRule(NE_MAJORITY_ELECTED, NE_LAWMAKING),
          source: NE_RULE_6,
        },
        {
          stageKey: "select-file",
          label: "Select File",
          amendable: knownRule(true, NE_RULE_6),
          separateLegislativeDayRequired: true,
          vote: knownRule(NE_MAJORITY_ELECTED, NE_LAWMAKING),
          source: NE_RULE_6,
        },
        {
          stageKey: "final-reading",
          label: "Final Reading",
          // A positive rule, not an absence of one: the constitution puts a
          // bill to its final reading and passage without amendment.
          amendable: knownRule(false, NE_ART3_SEC14),
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
  origination: {
    // With one chamber there is nowhere else a bill could start, and the
    // Legislature's own account of lawmaking describes introduction there. No
    // subject class can be confined to a different house, because there is not
    // one.
    generalOrigination: knownRule(["legislature"], NE_LAWMAKING),
    subjectRestrictions: [],
    source: NE_LAWMAKING,
  },
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

const AK_ART2_SEC1: RuleSourceRef = {
  authority: "constitution",
  citation: "Alaska Const. Art. II, Sec. 1",
  sourceTitle: "The Constitution of the State of Alaska",
  sourceUrl: AK_CONST_URL,
  retrievedAt: "2026-09-06",
  verification: "verified",
  note: 'Legislative power and membership: "The legislative power of the State is vested in a legislature consisting of a senate with a membership of twenty and a house of representatives with a membership of forty." The constitution fixes both formal chamber counts.',
};

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
const AK_UNIFORM_35 = source(
  "uniform-rules",
  "Uniform Rule 35",
  AK_UNIFORM_TITLE,
  AK_UNIFORM_URL,
  "verified",
  "Amendment: a bill in second reading is subject to amendment; an amendment may not be made to a bill in its third reading, but the bill may be returned to second reading by a majority vote of the full membership of the house for the purpose of specific amendment.",
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
    seats: knownRule(seats, AK_ART2_SEC1),
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
        // Uniform Rule 35 expressly prohibits amendments at third reading,
        // providing instead that a bill may be returned to second reading by a
        // majority of the full membership for specific amendment.
        amendable: knownRule(false, AK_UNIFORM_35),
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
  origination: {
    generalOrigination: unknownRule(
      "Where an Alaska bill may be introduced was not resolved for this pack; no source read states an origination rule or a revenue-bill exception.",
    ),
    subjectRestrictions: [],
    source: AK_ART2_SEC14,
  },
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
    AK_ART2_SEC1,
    AK_ART2_SEC14,
    AK_ART2_SEC15,
    AK_ART2_SEC16,
    AK_ART2_SEC17,
    AK_ART2_SEC18,
    AK_ART2_SEC8,
    AK_UNIFORM_20,
    AK_UNIFORM_23,
    AK_UNIFORM_35,
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
const MN_ART4_SEC2 = constitutionSource(
  "Minn. Const. art. IV, § 2",
  MN_CONST_TITLE,
  MN_CONST_URL,
  "verified",
  'Apportionment of members: "The number of members who compose the senate and house of representatives shall be prescribed by law." The constitution fixes no seat count of its own; it sends the number to statute, which is why the seat counts in this pack cite Minn. Stat. § 2.021 and not this section.',
);
const MN_STAT_2_021: RuleSourceRef = {
  authority: "statute",
  citation: "Minn. Stat. § 2.021",
  sourceTitle: "Minnesota Statutes — 2.021 Number of Members",
  sourceUrl: "https://www.revisor.mn.gov/statutes/cite/2.021",
  retrievedAt: RETRIEVED_MN_IL,
  verification: "verified",
  note: "Number of members: for each legislature, until a new apportionment has been made, the senate is composed of 67 members and the house of representatives is composed of 134 members. This is the instrument that actually fixes the seat counts this pack carries.",
};
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
    // Not the constitution: art. IV, § 2 prescribes the number "by law", and
    // Minn. Stat. § 2.021 is the law that does it.
    seats: knownRule(seats, MN_STAT_2_021),
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
        // This pack does not know whether an ordinary Minnesota bill may be
        // amended at third reading. That is the same gap the chamber-level
        // floor-amendment authority already records: the constitution sends
        // rules of proceeding to each house (art. IV, § 7) and those rules were
        // not read. Saying `true` would have contradicted the pack's own
        // unresolved authority; saying `false` would invent a prohibition.
        amendable: unknownRule(
          "Whether a Minnesota bill may be amended at third reading is set by each house's rules under Minn. Const. art. IV, § 7, which were not read for this pack. Art. IV, § 19 fixes only that a bill is considered on three different days.",
        ),
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
  origination: {
    // The constitution confines revenue bills to the House and says nothing
    // about where an ordinary bill starts. Both halves are recorded: the
    // confinement as the sourced rule it is, and the silence as silence. The
    // listed chamber order is not evidence of either.
    generalOrigination: unknownRule(
      "Where an ordinary Minnesota bill may be introduced was not resolved for this pack. Art. IV, § 18 confines revenue bills to the House and no source read states a general origination rule, so this pack does not claim one either way.",
    ),
    subjectRestrictions: [
      {
        subjectClass: "revenue",
        chamberKeys: ["house"],
        source: MN_ART4_SEC18,
        note: "All bills for raising revenue shall originate in the house of representatives, but the senate may propose and concur with the amendments as on other bills.",
      },
    ],
    source: MN_ART4_SEC18,
  },
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
    MN_ART4_SEC2,
    MN_STAT_2_021,
  ],
  unresolvedGaps: [
    "Minnesota's committee structure, referral among committees, and report and discharge thresholds are set by each house's rules and the joint rules, which were not read for this pack.",
    "Minnesota's authority for floor amendments and any germaneness standard are set by each house's rules, which were not read for this pack.",
    "Minnesota's conference committee composition and report rules are unresolved, and conference is not modelled.",
    "The default effective-date rule is set by Minn. Stat. § 645.02, which was not read for this pack.",
    "Whether a Minnesota measure dies at a given adjournment, as distinct from at the end of the biennium, is unresolved.",
    "This pack models a single third-reading final-passage stage; the Minnesota Constitution requires consideration on three different days (art. IV, § 19), but the intermediate general-orders and second-reading stages come from chamber rules not read here.",
    "Whether a Minnesota bill may be amended at third reading is unresolved, so this pack does not permit an amendment at that stage.",
    "Where an ordinary Minnesota bill may be introduced is unresolved; only the revenue confinement in art. IV, § 18 is established.",
  ],
};

const IL_CONST_URL = "https://www.ilga.gov/commission/lrb/con4.htm";
const IL_CONST_TITLE =
  "Constitution of the State of Illinois (1970), Article IV";

const IL_ART4_SEC1 = constitutionSource(
  "Ill. Const. art. IV, § 1",
  IL_CONST_TITLE,
  IL_CONST_URL,
  "verified",
  'Legislature: "The legislative power is vested in a General Assembly consisting of a Senate and a House of Representatives, elected by the electors from 59 Legislative Districts and 118 Representative Districts." Unlike Minnesota, Illinois fixes its seat counts in the constitution itself, so the seat provenance here is constitutional rather than statutory.',
);
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
    // Illinois names the district counts in the constitution itself.
    seats: knownRule(seats, IL_ART4_SEC1),
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
        // Art. IV, § 8 establishes that an Illinois bill is amendable — the
        // other house may amend or reject it — which is why the chamber-level
        // permission is `known`. It does not say a bill may be amended at third
        // reading, and which reading takes an amendment is a chamber-rules
        // matter this pack did not read. Chamber-level yes, stage-level
        // unresolved: two different questions, kept apart.
        amendable: unknownRule(
          "Whether an Illinois bill may be amended at third reading is set by each house's rules under Ill. Const. art. IV, § 6, which were not read for this pack. Art. IV, § 8 establishes that bills are amendable without fixing the stage at which it happens.",
        ),
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
  origination: {
    // Illinois says it outright, so this is a resolved rule and not an
    // inference from the order the chambers are listed in: an ordinary bill may
    // start in either house. No subject class is confined to one of them by any
    // source read here — in particular Illinois has no revenue-bill rule of the
    // kind Minnesota has.
    generalOrigination: knownRule(["house", "senate"], IL_ART4_SEC8),
    subjectRestrictions: [],
    source: IL_ART4_SEC8,
  },
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
  sources: [
    IL_ART4_SEC8,
    IL_ART4_SEC9,
    IL_ART4_SEC5,
    IL_ART4_SEC6,
    IL_ART4_SEC1,
  ],
  unresolvedGaps: [
    "Illinois's committee structure, referral among committees, and report and discharge thresholds are set by each house's rules and the joint rules, which were not read for this pack.",
    "Illinois's germaneness standard applied to floor amendments is set by each house's rules, which were not read for this pack.",
    "Illinois's conference committee composition and report rules are unresolved, and conference is not modelled.",
    "The default effective-date rule is set by the Effective Date of Laws Act (5 ILCS 75), which was not read for this pack.",
    "Whether an Illinois measure dies at a given adjournment, as distinct from at the end of the two-year General Assembly, is unresolved.",
    "This pack models a single third-reading final-passage stage; the Illinois Constitution requires a reading by title on three different days (art. IV, § 8), but the intermediate reading and amendment stages come from chamber rules not read here.",
    "Whether an Illinois bill may be amended at third reading is unresolved, so this pack does not permit an amendment at that stage even though bills are amendable in general.",
    "The Governor's reduction veto for appropriation items (a reduced item restored by a majority of the members elected, art. IV, § 9) is distinct from an ordinary item veto; the schema records only a line-item veto flag and the override threshold, so the reduction-restore majority is carried in the § 9 note rather than as its own field.",
  ],
};

// ---------------------------------------------------------------------------
// Maryland, Missouri, Nevada and Ohio — added 2026-09-06 from first-party
// official sources
//
// A second bounded wave compiled from the 42A/44 state legislative research
// warehouse. Each pack is read from the operative text of that state's own
// constitution, retrieved from the state's own publisher on 2026-09-06 and
// recorded in docs/systems/legislative-rule-sources.md. As with Minnesota and
// Illinois, the chamber-rule layer — committee structure, discharge,
// conference composition — was not read, so those fields stay `unknown` and no
// pack declares a committee its sources did not establish.
//
// The four were chosen because their instruments differ in ways a consumer
// branches on, not because of familiarity or geography:
// - Maryland: a veto overridden by three-fifths of the members elected, a
//   regular session capped at ninety days a year, and the only pack here whose
//   constitution fixes when an ordinary law takes effect by calendar date;
// - Missouri: the first pack whose constitution itself requires every bill to
//   be referred to a committee and states a germaneness standard, with a veto
//   reconsidered at two-thirds of the elected members;
// - Nevada: the first biennial legislature in the corpus, adjourning sine die
//   at the end of the 120th consecutive calendar day, and the first pack that
//   leaves the item veto unresolved rather than claiming one;
// - Ohio: three-fifths to repass like Illinois but on a different body, and a
//   default effective date measured from filing with the secretary of state
//   because that is when the referendum window opens.
// ---------------------------------------------------------------------------

const RETRIEVED_WAVE_TWO = "2026-09-06";

/**
 * A citation read on the 2026-09-06 primary-source pass.
 *
 * `verification` stays an argument rather than a default: this wave read the
 * operative text of every section it cites, and a helper that stamped
 * "verified" on its own would make that claim unfalsifiable.
 */
function waveTwoSource(
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
    retrievedAt: RETRIEVED_WAVE_TWO,
    verification,
    note,
  };
}

// --- Maryland --------------------------------------------------------------

const MD_ART3_URL =
  "https://msa.maryland.gov/msa/mdmanual/43const/html/03art3.html";
const MD_ART2_URL =
  "https://msa.maryland.gov/msa/mdmanual/43const/html/02art2.html";
const MD_ART3_TITLE =
  "Constitution of Maryland, Article III — Legislative Department (Maryland State Archives, Maryland Manual On-Line)";
const MD_ART2_TITLE =
  "Constitution of Maryland, Article II — Executive Department (Maryland State Archives, Maryland Manual On-Line)";

function marylandSource(
  citation: string,
  article: "II" | "III",
  note: string,
): RuleSourceRef {
  return waveTwoSource(
    "constitution",
    citation,
    article === "III" ? MD_ART3_TITLE : MD_ART2_TITLE,
    article === "III" ? MD_ART3_URL : MD_ART2_URL,
    "verified",
    note,
  );
}

const MD_ART3_SEC2 = marylandSource(
  "Md. Const. art. III, § 2",
  "III",
  'Membership: "The membership of the Senate shall consist of forty-seven (47) Senators. The membership of the House of Delegates shall consist of one hundred forty-one (141) Delegates." Maryland fixes both counts in the constitution itself, so the seat provenance in this pack is constitutional rather than statutory.',
);
const MD_ART3_SECS14_15 = marylandSource(
  "Md. Const. art. III, §§ 14 & 15(1)",
  "III",
  'Regular-session timing is compound provenance. Section 14 provides that the General Assembly "shall meet on the second Wednesday of January" every year. Section 15(1) separately permits a session "for a period not longer than ninety days in each year," makes those days consecutive unless law provides otherwise, and permits an extension of not more than thirty days by a three-fifths vote of each House.',
);
const MD_ART3_SEC19 = marylandSource(
  "Md. Const. art. III, § 19",
  "III",
  'Powers of each House: each House "shall appoint its own officers, determine the rules of its own proceedings, punish a member for disorderly or disrespectful behaviour." This is the authority under which Maryland\'s referral, committee and floor-amendment rules are made; those chamber rules were not read for this pack.',
);
const MD_ART3_SEC20 = marylandSource(
  "Md. Const. art. III, § 20",
  "III",
  'Quorum: "A majority of the whole number of members elected to each House shall constitute a quorum for the transaction of business; but a smaller number may adjourn from day to day, and compel the attendance of absent members."',
);
const MD_ART3_SEC27 = marylandSource(
  "Md. Const. art. III, § 27(a)",
  "III",
  'Origination and reading: "Any bill may originate in either House of the General Assembly and be altered, amended or rejected by the other." No bill may originate in either House during the last thirty-five calendar days of a regular session unless two-thirds of the members elected so determine, and a bill may not become law until it is read on three different days of the session in each House.',
);
const MD_ART3_SEC28 = marylandSource(
  "Md. Const. art. III, § 28",
  "III",
  'Passage: "No bill, nor single group of bills placed on the “consent calendar,” shall become a Law unless it be passed in each House by a majority of the whole number of members elected, and on its final passage, the yeas and nays be recorded."',
);
const MD_ART3_SEC30 = marylandSource(
  "Md. Const. art. III, § 30",
  "III",
  'Presentment: "Every bill, when passed by the General Assembly, and sealed with the Great Seal, shall be presented by the presiding officer of the House in which it originated to the Governor for the Governor’s approval. All bills passed during a regular or special session shall be presented to the Governor for the Governor’s approval no later than 20 days after adjournment."',
);
const MD_ART3_SEC31 = marylandSource(
  "Md. Const. art. III, § 31",
  "III",
  'Effective date: "A Law passed by the General Assembly shall take effect the first day of June next after the session at which it may be passed, unless it be otherwise expressly declared therein or provided for in this Constitution."',
);
const MD_ART3_SEC52 = waveTwoSource(
  "constitution",
  "Md. Const. art. III, § 52",
  "Constitution of Maryland, Article III, § 52 (Maryland General Assembly)",
  "https://mgaleg.maryland.gov/mgawebsite/Laws/StatuteText?article=c3&enactments=false&section=52",
  "verified",
  "Appropriations: § 52(2) establishes Budget Bills and Supplementary Appropriation Bills as the two kinds of appropriation bill. Section 52(8) permits either House to consider a Supplementary Appropriation Bill after the Budget Bill has been finally acted on and applies Article II, § 17 to that supplementary bill after presentment.",
);
const MD_ART2_SEC17 = waveTwoSource(
  "constitution",
  "Md. Const. art. II, § 17",
  "Constitution of Maryland, Article II, § 17 (Maryland General Assembly)",
  "https://mgaleg.maryland.gov/mgawebsite/Laws/StatuteText?article=c2&enactments=false&section=17",
  "verified",
  "Veto: §§ 17(a)-(e) govern the ordinary return, three-fifths reconsideration, action windows, inaction and appropriation-item rules. Section 17(f) separately permits the Governor to disapprove only Budget Bill items relating to the Executive Department that the General Assembly increased or added. Section 17(g) requires return of that Budget Bill to its House of origin and permits item-by-item reconsideration in an extraordinary session convened within thirty days, with three-fifths in each House to override.",
);

/** A Maryland chamber. Seats and quorum are constitutional; committees are not read. */
function marylandChamber(
  chamberKey: string,
  name: string,
  seats: number,
): ChamberRule {
  return {
    chamberKey,
    name,
    seats: knownRule(seats, MD_ART3_SEC2),
    quorum: knownRule(
      majorityOf(
        "members-elected",
        "a majority of the whole number of members elected to the House",
        MD_ART3_SEC20,
      ),
      MD_ART3_SEC20,
    ),
    introductionAllowed: true,
    referral: {
      authorityLabel: "Set by each House's rules of its own proceedings",
      multipleReferralAllowed: unknownRule(
        "Whether Maryland permits referring one bill to several committees is set by each House's rules under Md. Const. art. III, § 19, which were not read for this pack.",
      ),
      everyMeasureMustBeHeard: unknownRule(
        "Whether every referred bill is guaranteed a hearing in Maryland is set by each House's rules under Md. Const. art. III, § 19, which were not read for this pack.",
      ),
      source: MD_ART3_SEC19,
    },
    committees: [],
    floorStages: [
      {
        stageKey: "third-reading",
        label: "Third reading and final passage",
        // Art. III, § 27(a) establishes that a Maryland bill is amendable — the
        // other House may alter or amend it — but not that an amendment may be
        // offered at third reading. Which reading takes an amendment is a
        // chamber-rules question this pack did not read.
        amendable: unknownRule(
          "Whether a Maryland bill may be amended at third reading is set by each House's rules under Md. Const. art. III, § 19, which were not read for this pack. Art. III, § 27(a) establishes that a bill may be altered or amended without fixing the stage at which it happens.",
        ),
        separateLegislativeDayRequired: true,
        vote: knownRule(
          majorityOf(
            "members-elected",
            "a majority of the whole number of members elected to the House",
            MD_ART3_SEC28,
          ),
          MD_ART3_SEC28,
        ),
        source: MD_ART3_SEC27,
      },
    ],
    amendments: {
      floorAmendmentsAllowed: knownRule(true, MD_ART3_SEC27),
      germanenessStandard: unknownRule(
        "Maryland's germaneness standard for amendments is set by each House's rules under Md. Const. art. III, § 19, which were not read for this pack.",
      ),
      source: MD_ART3_SEC27,
    },
  };
}

export const MARYLAND_RULE_PACK: LegislativeRulePack = {
  packId: "us-md-general-assembly-v1",
  jurisdictionKey: "US-MD",
  displayName: "Maryland General Assembly",
  structure: "bicameral",
  chambers: [
    marylandChamber("house", "House of Delegates", 141),
    marylandChamber("senate", "Senate", 47),
  ],
  chamberOrder: ["house", "senate"],
  origination: {
    // Maryland states the rule outright and confines no subject class to one
    // House. In particular it has no revenue-bill confinement of the kind
    // Minnesota and Kentucky carry, and none was invented for it here.
    generalOrigination: knownRule(["house", "senate"], MD_ART3_SEC27),
    subjectRestrictions: [],
    source: MD_ART3_SEC27,
  },
  interChamber: {
    kind: "second-chamber",
    concurrenceThreshold: majorityOf(
      "members-elected",
      "a majority of the whole number of members elected to the House",
      MD_ART3_SEC28,
    ),
    conference: unknownRule(
      "Maryland resolves inter-chamber differences by conference committee under each House's rules, which were not read for this pack; conference is not modelled.",
    ),
    source: MD_ART3_SEC27,
  },
  executive: {
    titleLabel: "Governor",
    presentmentRequired: knownRule(true, MD_ART3_SEC30),
    actionWindowDaysInSession: knownRule(6, MD_ART2_SEC17),
    actionWindowDaysAfterAdjournment: knownRule(30, MD_ART2_SEC17),
    inactionOutcomeInSession: knownRule(
      "becomes-law-without-signature",
      MD_ART2_SEC17,
    ),
    lineItemVeto: knownRule(true, MD_ART2_SEC17),
    override: {
      kind: "each-chamber",
      threshold: fractionOf(
        3,
        5,
        "members-elected",
        "three-fifths of the members elected to each House",
        MD_ART2_SEC17,
      ),
    },
    source: MD_ART2_SEC17,
  },
  enactment: {
    effectiveDateDistinctFromEnactment: knownRule(true, MD_ART3_SEC31),
    defaultEffectiveRule: knownRule(
      "A Law passed by the General Assembly takes effect the first day of June next after the session at which it was passed, unless the Law itself or the Constitution expressly declares otherwise.",
      MD_ART3_SEC31,
    ),
    source: MD_ART3_SEC31,
  },
  session: {
    sessionLabel: "Regular session",
    adjournmentRule: knownRule(
      "The General Assembly meets on the second Wednesday of January each year and may continue its session for a period not longer than ninety days in each year, consecutive unless otherwise provided by law; it may extend the session by not more than a further thirty days by resolution concurred in by a three-fifths vote of the membership in each House.",
      MD_ART3_SECS14_15,
    ),
    measuresDieAtAdjournment: unknownRule(
      "What becomes of a pending Maryland measure at adjournment is not settled by the sections read for this pack; art. III, § 15 fixes session length and says nothing about the fate of a bill still before a House.",
    ),
    source: MD_ART3_SECS14_15,
  },
  sources: [
    MD_ART3_SEC28,
    MD_ART2_SEC17,
    MD_ART3_SECS14_15,
    MD_ART3_SEC20,
    MD_ART3_SEC27,
    MD_ART3_SEC30,
    MD_ART3_SEC31,
    MD_ART3_SEC19,
    MD_ART3_SEC2,
    MD_ART3_SEC52,
  ],
  unresolvedGaps: [
    "Maryland's committee structure, referral among committees, and report and discharge thresholds are set by each House's rules under art. III, § 19, which were not read for this pack.",
    "Maryland's germaneness standard for amendments, and whether a bill may be amended at third reading, are chamber-rules matters left unresolved here.",
    "Maryland's conference committee composition and report rules are unresolved, and conference is not modelled.",
    "Art. III, § 27(a) forbids a bill to originate in either House during the last thirty-five calendar days of a regular session unless two-thirds of the members elected so determine. The origination schema records which chambers may start a measure, not a date after which none may, so that cutoff is carried in the § 27 note rather than as a rule the runtime enforces.",
    "Maryland's appropriation routes and Budget Bill veto path do not fit the ordinary fields: art. III, § 52(2) recognizes both Budget Bills and Supplementary Appropriation Bills, while current art. II, § 17(f)-(g) gives the Governor a limited item veto over Executive Department items the General Assembly increased or added and provides return plus item-by-item reconsideration in an extraordinary session convened within thirty days. This pack's executive fields continue to model only the ordinary bill track.",
    "Md. Const. art. II, § 17(b) is a pocket veto: a bill the General Assembly's adjournment prevents the Governor from returning 'shall not be a law'. The schema records an inaction outcome for a bill left unacted on in session, which in Maryland is that it becomes law, and has no field for the adjournment case, so the pocket veto is carried in the § 17 note.",
    "Whether a Maryland measure dies at a given adjournment is unresolved; § 15 fixes only how long a session may run.",
    "This pack models a single third-reading final-passage stage; art. III, § 27(a) requires reading on three different days, but the intermediate reading and consent-calendar stages come from chamber rules not read here.",
  ],
};

// --- Missouri --------------------------------------------------------------

const MO_CONST_TITLE =
  "Constitution of Missouri (Missouri Revisor of Statutes)";

function missouriSource(
  citation: string,
  sectionPath: string,
  note: string,
): RuleSourceRef {
  return waveTwoSource(
    "constitution",
    citation,
    MO_CONST_TITLE,
    `https://revisor.mo.gov/main/OneSection.aspx?section=${sectionPath}`,
    "verified",
    note,
  );
}

const MO_ART3_SEC3 = missouriSource(
  "Mo. Const. art. III, § 3(a)",
  "Article%20III%20Section%203",
  'Membership of the lower house: "The house of representatives shall consist of one hundred sixty-three members elected at each general election and redistricted as provided in this section."',
);
const MO_ART3_SEC5 = missouriSource(
  "Mo. Const. art. III, § 5",
  "Article%20III%20Section%205",
  'Membership of the upper house: "The senate shall consist of thirty-four members elected by the qualified voters of the senatorial districts for a term of four years."',
);
const MO_ART3_SEC20 = missouriSource(
  "Mo. Const. art. III, § 20",
  "Article%20III%20Section%2020",
  'Sessions and quorum: the general assembly meets on the first Wednesday after the first Monday in January following each general election, and "a majority of the elected members of each house shall constitute a quorum to do business, but a smaller number may adjourn from day to day, and may compel the attendance of absent members."',
);
const MO_ART3_SEC20A = missouriSource(
  "Mo. Const. art. III, § 20(a)",
  "Article%20III%20Section%2020(a)",
  'Automatic adjournment: "The general assembly shall adjourn at midnight on May thirtieth until the first Wednesday after the first Monday of January of the following year, unless it has adjourned prior thereto. All bills in either house remaining on the calendar after 6:00 p.m. on the first Friday following the second Monday in May are tabled." The days between are reserved for enrolling, engrossing and signing bills already passed.',
);
const MO_ART3_SEC21 = missouriSource(
  "Mo. Const. art. III, § 21",
  "Article%20III%20Section%2021",
  'Bills: "No law shall be passed except by bill, and no bill shall be so amended in its passage through either house as to change its original purpose. Bills may originate in either house and may be amended or rejected by the other. Every bill shall be read by title on three different days in each house."',
);
const MO_ART3_SEC22 = missouriSource(
  "Mo. Const. art. III, § 22",
  "Article%20III%20Section%2022",
  'Referral: "Every bill shall be referred to a committee of the house in which it is pending. After it has been referred to a committee, one-third of the elected members of the respective houses shall have power to relieve a committee of further consideration of a bill and place it on the calendar for consideration." Each committee keeps the record its house’s rules require, and that record and the recorded committee vote are filed with all reports on bills.',
);
const MO_ART3_SEC27 = missouriSource(
  "Mo. Const. art. III, § 27",
  "Article%20III%20Section%2027",
  'Concurrence, conference and final passage: "No amendments to bills by one house shall be concurred in by the other, nor shall reports of committees of conference be adopted in either house, nor shall a bill be finally passed, unless a vote by yeas and nays be taken and a majority of the members elected to each house be recorded as voting favorably."',
);
const MO_ART3_SEC29 = missouriSource(
  "Mo. Const. art. III, § 29",
  "Article%20III%20Section%2029",
  'Effective date: "No law passed by the general assembly, except an appropriation act, shall take effect until ninety days after the adjournment of the session" at which it was enacted, unless an expressed emergency is directed otherwise by a two-thirds vote of each house. The section separately provides that, if the General Assembly recesses for thirty days or more, it may by joint resolution make previously passed, not-yet-effective laws take effect ninety days from the beginning of the recess.',
);
const MO_ART3_SEC30 = missouriSource(
  "Mo. Const. art. III, § 30",
  "Article%20III%20Section%2030",
  "Presentment: no bill becomes a law until signed by the presiding officer of each house in open session, and when a bill has been signed the secretary or chief clerk of the house of origin “shall present the bill in person to the governor on the same day on which it was signed and enter the fact upon the journal.”",
);
const MO_ART3_SEC31 = missouriSource(
  "Mo. Const. art. III, § 31",
  "Article%20III%20Section%2031",
  'Governor’s duty: "within fifteen days after presentment, he shall return such bill to the house in which it originated endorsed with his approval or accompanied by his objections." When the general assembly adjourns, or recesses for thirty days or more, the Governor has forty-five days to return the bill to the office of the secretary of state. "If any bill shall not be returned by the governor within the time limits prescribed by this section it shall become law in like manner as if the governor had signed it."',
);
const MO_ART3_SEC32 = missouriSource(
  "Mo. Const. art. III, § 32",
  "Article%20III%20Section%2032",
  'Reconsideration: the question on a returned bill is "Shall the bill pass, the objections of the governor thereto notwithstanding?" and the bill passes "if two-thirds of the elected members of the house vote in the affirmative," with like proceedings in the other house. A bill returned on or after the fifth day before the last day for considering bills sends the general assembly automatically back into a veto session on the first Wednesday following the second Monday in September, for no more than ten calendar days and for that sole purpose.',
);
const MO_ART4_SEC26 = missouriSource(
  "Mo. Const. art. IV, § 26",
  "Article%20IV%20Section%2026",
  'Partial veto: "The governor may object to one or more items or portions of items of appropriation of money in any bill presented to him, while approving other portions of the bill," and the items objected to do not take effect unless reconsidered separately. "The governor shall not reduce any appropriation for free public schools, or for the payment of principal and interest on the public debt."',
);

/** A Missouri chamber. Referral and germaneness are constitutional here; committees are not read. */
function missouriChamber(
  chamberKey: string,
  name: string,
  seats: number,
  seatsSource: RuleSourceRef,
): ChamberRule {
  return {
    chamberKey,
    name,
    seats: knownRule(seats, seatsSource),
    quorum: knownRule(
      majorityOf(
        "members-elected",
        "a majority of the elected members of the house",
        MO_ART3_SEC20,
      ),
      MO_ART3_SEC20,
    ),
    introductionAllowed: true,
    referral: {
      // Missouri is the first pack whose constitution requires referral
      // itself. Requiring referral is not the same as guaranteeing a hearing,
      // and § 22 does not promise one, so the hearing guarantee stays unknown.
      authorityLabel:
        "Every bill shall be referred to a committee of the house in which it is pending (Mo. Const. art. III, § 22)",
      multipleReferralAllowed: unknownRule(
        "Missouri requires referral to a committee (Mo. Const. art. III, § 22) but does not say whether one bill may be referred to several; that is set by each house's rules, which were not read for this pack.",
      ),
      everyMeasureMustBeHeard: unknownRule(
        "Mo. Const. art. III, § 22 requires that every bill be referred to a committee and lets one-third of the elected members relieve a committee of a bill, but it does not guarantee a hearing, and the sources read for this pack settle no such guarantee.",
      ),
      source: MO_ART3_SEC22,
    },
    committees: [],
    floorStages: [
      {
        stageKey: "third-reading",
        label: "Third reading and final passage",
        amendable: unknownRule(
          "Whether a Missouri bill may be amended at third reading is set by each house's rules; art. III, § 21 establishes that a bill is amended in its passage through either house and bounds the amendment by the bill's original purpose, without fixing the stage at which it happens.",
        ),
        separateLegislativeDayRequired: true,
        vote: knownRule(
          majorityOf(
            "members-elected",
            "a majority of the members elected to the house",
            MO_ART3_SEC27,
          ),
          MO_ART3_SEC27,
        ),
        source: MO_ART3_SEC21,
      },
    ],
    amendments: {
      // The germaneness standard is the constitution's own and not a chamber
      // rule: a Missouri amendment may not change the bill's original purpose.
      floorAmendmentsAllowed: knownRule(true, MO_ART3_SEC21),
      germanenessStandard: knownRule(
        "No bill shall be so amended in its passage through either house as to change its original purpose.",
        MO_ART3_SEC21,
      ),
      source: MO_ART3_SEC21,
    },
  };
}

export const MISSOURI_RULE_PACK: LegislativeRulePack = {
  packId: "us-mo-general-assembly-v1",
  jurisdictionKey: "US-MO",
  displayName: "Missouri General Assembly",
  structure: "bicameral",
  chambers: [
    missouriChamber("house", "House of Representatives", 163, MO_ART3_SEC3),
    missouriChamber("senate", "Senate", 34, MO_ART3_SEC5),
  ],
  chamberOrder: ["house", "senate"],
  origination: {
    generalOrigination: knownRule(["house", "senate"], MO_ART3_SEC21),
    subjectRestrictions: [],
    source: MO_ART3_SEC21,
  },
  interChamber: {
    kind: "second-chamber",
    concurrenceThreshold: majorityOf(
      "members-elected",
      "a majority of the members elected to the house",
      MO_ART3_SEC27,
    ),
    conference: unknownRule(
      "Mo. Const. art. III, § 27 fixes the vote needed to adopt a Missouri conference report but not how many conferees each house appoints or whether the report may be amended, so conference is not modelled here.",
    ),
    source: MO_ART3_SEC27,
  },
  executive: {
    titleLabel: "Governor",
    presentmentRequired: knownRule(true, MO_ART3_SEC30),
    actionWindowDaysInSession: knownRule(15, MO_ART3_SEC31),
    actionWindowDaysAfterAdjournment: knownRule(45, MO_ART3_SEC31),
    inactionOutcomeInSession: knownRule(
      "becomes-law-without-signature",
      MO_ART3_SEC31,
    ),
    lineItemVeto: knownRule(true, MO_ART4_SEC26),
    override: {
      kind: "each-chamber",
      threshold: fractionOf(
        2,
        3,
        "members-elected",
        "two-thirds of the elected members of each house",
        MO_ART3_SEC32,
      ),
    },
    source: MO_ART3_SEC32,
  },
  enactment: {
    effectiveDateDistinctFromEnactment: knownRule(true, MO_ART3_SEC29),
    defaultEffectiveRule: knownRule(
      "No law except an appropriation act takes effect until ninety days after the adjournment of the session at which it was enacted, unless an emergency stated in the act is directed otherwise by a two-thirds vote of the members elected to each house.",
      MO_ART3_SEC29,
    ),
    source: MO_ART3_SEC29,
  },
  session: {
    sessionLabel: "Regular session",
    adjournmentRule: knownRule(
      "The general assembly adjourns at midnight on May thirtieth until the first Wednesday after the first Monday of January of the following year, and all bills remaining on either house's calendar after 6:00 p.m. on the first Friday following the second Monday in May are tabled.",
      MO_ART3_SEC20A,
    ),
    measuresDieAtAdjournment: unknownRule(
      "Missouri tables the bills left on a calendar after 6:00 p.m. on the first Friday following the second Monday in May (art. III, § 20(a)). Being tabled at a deadline and dying at adjournment are different events, and this field cannot express the difference, so it stays unresolved.",
    ),
    source: MO_ART3_SEC20A,
  },
  sources: [
    MO_ART3_SEC27,
    MO_ART3_SEC32,
    MO_ART3_SEC31,
    MO_ART3_SEC30,
    MO_ART3_SEC29,
    MO_ART3_SEC22,
    MO_ART3_SEC21,
    MO_ART3_SEC20,
    MO_ART3_SEC20A,
    MO_ART3_SEC3,
    MO_ART3_SEC5,
    MO_ART4_SEC26,
  ],
  unresolvedGaps: [
    "Missouri's committee structure, committee sizes and report thresholds are set by each house's rules, which were not read for this pack; the constitution requires referral without naming the committees.",
    "Mo. Const. art. III, § 22 lets one-third of the elected members of a house relieve a committee of a bill and place it on the calendar. The schema records committee discretion per committee and has no field for a chamber-wide discharge threshold, so that power is carried in the § 22 note rather than modelled.",
    "Mo. Const. art. III, § 27 fixes the threshold for adopting a conference report but not the composition of a Missouri conference committee, and a conference rule cannot be recorded from the threshold alone.",
    "Missouri's veto session is a scheduled institution: art. III, § 32 automatically reconvenes the general assembly on the first Wednesday following the second Monday in September for up to ten calendar days when a bill is returned on or after the fifth day before the last day for considering bills. The schema records the override threshold and forum but not when the forum sits, so the veto session is carried in the § 32 note.",
    "The 6:00 p.m. tabling deadline in art. III, § 20(a) and the sixtieth-legislative-day limit on introducing bills in art. III, § 25 are calendar mechanics the schema has no field for.",
    "Mo. Const. art. III, § 29 separately provides that, after a recess of at least thirty days, the General Assembly may by joint resolution prescribe that laws previously passed and not yet effective take effect ninety days from the beginning of the recess. The schema carries the ordinary post-adjournment default but has no field for this recess-specific route, so it remains an explicit exception rather than being generalized into the default rule.",
    "Mo. Const. art. IV, § 26 bars the Governor from reducing an appropriation for free public schools or for principal and interest on the public debt. The schema records a line-item veto as a single flag, so that limit is carried in the § 26 note.",
    "Whether a Missouri measure dies at adjournment, as distinct from being tabled at the May deadline, is unresolved.",
    "This pack models a single third-reading final-passage stage; art. III, § 21 requires a reading by title on three different days, but the intermediate reading stages come from chamber rules not read here.",
  ],
};

// --- Nevada ----------------------------------------------------------------

const NV_CONST_URL = "https://www.leg.state.nv.us/const/nvconst.html";
const NV_CONST_TITLE =
  "The Constitution of the State of Nevada (Nevada Legislature)";

function nevadaSource(citation: string, note: string): RuleSourceRef {
  return waveTwoSource(
    "constitution",
    citation,
    NV_CONST_TITLE,
    NV_CONST_URL,
    "verified",
    note,
  );
}

const NV_ART4_SEC2 = nevadaSource(
  "Nev. Const. art. 4, § 2",
  'Biennial sessions: "The sessions of the Legislature shall be biennial, and shall commence on the 1st Monday of February following the election of members of the Assembly." The Legislature "shall adjourn sine die each regular session not later than midnight Pacific time at the end of the 120th consecutive calendar day of that session, inclusive of the day on which that session commences," and any legislative action taken after that moment is void.',
);
const NV_ART4_SEC5 = nevadaSource(
  "Nev. Const. art. 4, § 5",
  'Number of members: "the number of Senators shall not be less than one-third nor more than one-half of that of the members of the Assembly," and it is the mandatory duty of the Legislature after each decennial census "to fix by law the number of Senators and Assemblymen." The constitution therefore bounds the ratio and delegates the counts; it does not fix them, which is why this pack establishes no instrument for its seat numbers.',
);
const NV_ART4_SEC6 = nevadaSource(
  "Nev. Const. art. 4, § 6",
  'Powers of each House: each House shall "judge of the qualifications, elections and returns of its own members, choose its own officers (except the President of the Senate), determine the rules of its proceedings and may punish its members for disorderly conduct." This is the authority under which Nevada\'s referral, committee and floor-amendment rules are made; those rules were not read for this pack.',
);
const NV_ART4_SEC13 = nevadaSource(
  "Nev. Const. art. 4, § 13",
  'Quorum: "A majority of all the members elected to each House shall constitute a quorum to transact business, but a smaller number may adjourn, from day to day and may compel the attendance of absent members."',
);
const NV_ART4_SEC16 = nevadaSource(
  "Nev. Const. art. 4, § 16",
  'Origination: "Any bill may originate in either House of the Legislature, and all bills passed by one may be amended in the other."',
);
const NV_ART4_SEC18 = nevadaSource(
  "Nev. Const. art. 4, § 18",
  'Reading and passage: every bill "must be read by sections on three several days, in each House, unless in case of emergency, two thirds of the House where such bill is pending shall deem it expedient to dispense with this rule," and "a majority of all the members elected to each House is necessary to pass every bill or joint resolution." Subsection 2 requires "an affirmative vote of not fewer than two-thirds of the members elected to each House" to pass a bill or joint resolution "which creates, generates, or increases any public revenue in any form," and subsection 3 lets a majority refer such a measure to the people instead.',
);
const NV_ART4_SEC35 = nevadaSource(
  "Nev. Const. art. 4, § 35",
  'Veto: every bill is presented to the Governor, who signs it or returns it with objections to the House of origin; "If after such reconsideration it again pass both Houses by yeas and nays, by a vote of two thirds of the members elected to each House it shall become a law notwithstanding the Governors objections." A bill not returned "within five days after it shall have been presented to him (Sunday excepted)" becomes law as if signed, unless final adjournment prevents the return, in which case it is a law unless the Governor files it with objections in the office of the Secretary of State within ten days after the adjournment (Sundays excepted), to be laid before the Legislature at its next session. The section describes the return of a whole bill and grants no power over items.',
);

/** A Nevada chamber. The constitution delegates the seat counts, so none is cited. */
function nevadaChamber(chamberKey: string, name: string): ChamberRule {
  return {
    chamberKey,
    name,
    seats: unknownRule(
      "Nevada's formal chamber seat count is unresolved. Nev. Const. art. 4, § 5 delegates the number to law, and the retrieved NRS route adopts district shapefiles without textually stating 21 or 42; no qualifying operative source read for this pack fixes a numeric count.",
    ),
    quorum: knownRule(
      majorityOf(
        "members-elected",
        "a majority of all the members elected to the House",
        NV_ART4_SEC13,
      ),
      NV_ART4_SEC13,
    ),
    introductionAllowed: true,
    referral: {
      authorityLabel: "Set by each House's rules of its proceedings",
      multipleReferralAllowed: unknownRule(
        "Whether Nevada permits referring one bill to several committees is set by each House's rules under Nev. Const. art. 4, § 6, which were not read for this pack.",
      ),
      everyMeasureMustBeHeard: unknownRule(
        "Whether every referred bill is guaranteed a hearing in Nevada is set by each House's rules under Nev. Const. art. 4, § 6, which were not read for this pack.",
      ),
      source: NV_ART4_SEC6,
    },
    committees: [],
    floorStages: [
      {
        stageKey: "third-reading",
        label: "Third reading and final passage",
        amendable: unknownRule(
          "Whether a Nevada bill may be amended at third reading is set by each House's rules under Nev. Const. art. 4, § 6, which were not read for this pack. Art. 4, § 16 establishes that a bill passed by one House may be amended in the other without fixing the stage at which an amendment is offered.",
        ),
        separateLegislativeDayRequired: true,
        vote: knownRule(
          majorityOf(
            "members-elected",
            "a majority of all the members elected to the House",
            NV_ART4_SEC18,
          ),
          NV_ART4_SEC18,
        ),
        source: NV_ART4_SEC18,
      },
    ],
    amendments: {
      floorAmendmentsAllowed: knownRule(true, NV_ART4_SEC16),
      germanenessStandard: unknownRule(
        "Nevada confines each law to one subject (Nev. Const. art. 4, § 17), but the germaneness standard applied to amendments is set by each House's rules, which were not read for this pack.",
      ),
      source: NV_ART4_SEC16,
    },
  };
}

export const NEVADA_RULE_PACK: LegislativeRulePack = {
  packId: "us-nv-legislature-v1",
  jurisdictionKey: "US-NV",
  displayName: "Nevada Legislature",
  structure: "bicameral",
  chambers: [
    nevadaChamber("assembly", "Assembly"),
    nevadaChamber("senate", "Senate"),
  ],
  chamberOrder: ["assembly", "senate"],
  origination: {
    generalOrigination: knownRule(["assembly", "senate"], NV_ART4_SEC16),
    subjectRestrictions: [],
    source: NV_ART4_SEC16,
  },
  interChamber: {
    kind: "second-chamber",
    concurrenceThreshold: majorityOf(
      "members-elected",
      "a majority of all the members elected to the House",
      NV_ART4_SEC18,
    ),
    conference: unknownRule(
      "Nevada resolves inter-chamber differences by conference committee under each House's rules and the joint standing rules, which were not read for this pack; conference is not modelled.",
    ),
    source: NV_ART4_SEC16,
  },
  executive: {
    titleLabel: "Governor",
    presentmentRequired: knownRule(true, NV_ART4_SEC35),
    actionWindowDaysInSession: knownRule(5, NV_ART4_SEC35),
    actionWindowDaysAfterAdjournment: knownRule(10, NV_ART4_SEC35),
    inactionOutcomeInSession: knownRule(
      "becomes-law-without-signature",
      NV_ART4_SEC35,
    ),
    // Nevada's veto section describes the return of a whole bill and says
    // nothing about items. Silence is not a grant, and it is not a denial
    // either: reading "no item veto" out of a section that never mentions one
    // would be inventing a negative fact from an absence.
    lineItemVeto: unknownRule(
      "Nev. Const. art. 4, § 35 gives the Governor the return of a whole bill and says nothing about objecting to an item, and no source read for this pack establishes an item veto either way, so this pack claims neither the power nor its absence.",
    ),
    override: {
      kind: "each-chamber",
      threshold: fractionOf(
        2,
        3,
        "members-elected",
        "two thirds of the members elected to each House",
        NV_ART4_SEC35,
      ),
    },
    source: NV_ART4_SEC35,
  },
  enactment: {
    effectiveDateDistinctFromEnactment: unknownRule(
      "Whether a Nevada act takes effect on a date distinct from its enactment is set by NRS 218D.330, which was not read for this pack.",
    ),
    defaultEffectiveRule: unknownRule(
      "Nevada's default effective date is statutory (NRS 218D.330) rather than constitutional, and that statute was not read for this pack.",
    ),
    source: NV_ART4_SEC18,
  },
  session: {
    sessionLabel: "Regular session",
    adjournmentRule: knownRule(
      "Sessions are biennial and commence on the first Monday of February following the election of members of the Assembly; the Legislature adjourns sine die not later than midnight Pacific time at the end of the 120th consecutive calendar day of the session, and any legislative action taken after that moment is void.",
      NV_ART4_SEC2,
    ),
    measuresDieAtAdjournment: unknownRule(
      "Nev. Const. art. 4, § 2 voids legislative action taken after the 120th calendar day but does not say what becomes of a measure still pending when the Legislature adjourns, and no source read for this pack settles it.",
    ),
    source: NV_ART4_SEC2,
  },
  sources: [
    NV_ART4_SEC18,
    NV_ART4_SEC35,
    NV_ART4_SEC2,
    NV_ART4_SEC13,
    NV_ART4_SEC16,
    NV_ART4_SEC6,
    NV_ART4_SEC5,
  ],
  unresolvedGaps: [
    "Nevada's formal chamber seat counts are UNKNOWN. Art. 4, § 5 bounds the Senate at between one-third and one-half of the Assembly and delegates the numbers to law, and the retrieved route through NRS 218B.100, .250 and .260 creates the districts by adopting filed shapefiles rather than textually stating 21 or 42. The formal seat-count values therefore carry no number or source.",
    "Nev. Const. art. 4, § 18(2) requires two-thirds of the members elected to each House to pass a bill that creates, generates or increases any public revenue, and § 18(3) lets a majority refer such a measure to the people instead. The schema carries one passage threshold per floor stage and can confine a subject class by chamber but not by vote, so the revenue supermajority is recorded here rather than coerced into the ordinary passage rule, which remains the majority § 18(1) states.",
    "Whether the Nevada Governor may object to an item of an appropriation is unresolved; art. 4, § 35 speaks only of returning a bill.",
    "Nevada's default effective date is set by NRS 218D.330, which was not read for this pack.",
    "Nevada's committee structure, referral among committees, hearing guarantees, and report and discharge thresholds are set by each House's rules and the joint standing rules under art. 4, § 6, which were not read for this pack.",
    "Nevada's conference committee composition and report rules are unresolved, and conference is not modelled.",
    "Whether a Nevada measure dies at adjournment is unresolved; art. 4, § 2 voids late action without saying what becomes of a pending bill.",
    "This pack models a single third-reading final-passage stage; art. 4, § 18(1) requires reading by sections on three several days, but the intermediate stages come from chamber rules not read here.",
    "The biennial commencement date in art. 4, § 2 is recorded in the session rule's text; the schema has no field for how often a legislature meets, so a consumer that needs the biennium must read the rule rather than a flag.",
  ],
};

// --- Ohio ------------------------------------------------------------------

const OH_CONST_TITLE = "Ohio Constitution (Ohio Laws, Ohio Revised Code site)";

function ohioSource(
  citation: string,
  sectionSlug: string,
  note: string,
): RuleSourceRef {
  return waveTwoSource(
    "constitution",
    citation,
    OH_CONST_TITLE,
    `https://codes.ohio.gov/ohio-constitution/section-${sectionSlug}`,
    "verified",
    note,
  );
}

const OH_ART2_SEC1C = ohioSource(
  "Ohio Const. art. II, § 1c",
  "2.1c",
  'Referendum and effective date: "No law passed by the general assembly shall go into effect until ninety days after it shall have been filed by the governor in the office of the secretary of state, except as herein provided." The ninety days are the window in which a referendum petition may be filed against the law, a section of it, or an appropriation item in it.',
);
const OH_ART2_SEC1D = ohioSource(
  "Ohio Const. art. II, § 1d",
  "2.1d",
  "Immediate-effect categories are distinct. Laws providing for tax levies and appropriations for current expenses go into immediate effect under § 1d. An emergency law necessary for the immediate preservation of the public peace, health or safety goes into immediate effect only if it receives a yea-and-nay vote of two-thirds of all members elected to each branch and states the reasons for the necessity in a separate section passed by a separate roll call.",
);
const OH_ART2_SEC6 = ohioSource(
  "Ohio Const. art. II, § 6",
  "2.6",
  'Quorum: "A majority of all the members elected to each House shall be a quorum to do business; but, a less number may adjourn from day to day, and compel the attendance of absent members."',
);
const OH_ART2_SEC7 = ohioSource(
  "Ohio Const. art. II, § 7",
  "2.7",
  'Organization: "The mode of organizing each House of the general assembly shall be prescribed by law... Each House shall determine its own rules of proceeding." This is the authority under which Ohio\'s referral, committee and floor-amendment rules are made; those rules were not read for this pack.',
);
const OH_ART2_SEC8 = ohioSource(
  "Ohio Const. art. II, § 8",
  "2.8",
  'Sessions: "Each general assembly shall convene in first regular session on the first Monday of January in the odd-numbered year, or on the succeeding day if the first Monday of January is a legal holiday, and in second regular session on the same date of the following year." The section fixes convening and sets no adjournment deadline for a regular session.',
);
const OH_ART2_SEC15 = ohioSource(
  "Ohio Const. art. II, § 15",
  "2.15",
  'Passage of bills: "The general assembly shall enact no law except by bill, and no bill shall be passed without the concurrence of a majority of the members elected to each house. Bills may originate in either house, but may be altered, amended, or rejected in the other." Every bill is considered by each house on three different days unless two-thirds of the members elected to the house in which it is pending suspend the requirement, and no bill contains more than one subject.',
);
const OH_ART2_SEC16 = ohioSource(
  "Ohio Const. art. II, § 16",
  "2.16",
  'Veto: a disapproved bill is returned with objections to the house in which it originated; "If three-fifths of the members elected to the house of origin vote to repass the bill" it goes to the other house, and "if three-fifths of the members elected to the second house vote to repass it, it becomes law notwithstanding the objections of the governor." A bill not returned "within ten days, Sundays excepted, after being presented" becomes law as if signed, unless adjournment prevents its return, in which case it becomes law unless filed with objections within ten days after that adjournment. "The governor may disapprove any item or items in any bill making an appropriation of money."',
);
const OH_ART11_SEC2 = ohioSource(
  "Ohio Const. art. XI, § 2",
  "11.2",
  'Representation: "Each house of representatives district shall be entitled to a single representative in each general assembly. Each senate district shall be entitled to a single senator in each general assembly." This is the half of the chain that turns a count of districts into a count of members.',
);
const OH_ART11_SEC3 = ohioSource(
  "Ohio Const. art. XI, § 3(A)",
  "11.3",
  'Ratio of representation: the whole population of the state "shall be divided by the number “ninety-nine” and by the number “thirty-three” and the quotients shall be the ratio of representation in the house of representatives and in the senate, respectively." Ohio therefore fixes ninety-nine house districts and thirty-three senate districts in the constitution, and art. XI, § 2 gives each district one member.',
);

/** An Ohio chamber. Seats come from the district counts in art. XI; committees are not read. */
function ohioChamber(
  chamberKey: string,
  name: string,
  seats: number,
): ChamberRule {
  return {
    chamberKey,
    name,
    // The instrument that fixes the count is the redistricting article, not the
    // legislative one: art. XI, § 3(A) sets ninety-nine and thirty-three
    // districts and art. XI, § 2 gives each district a single member.
    seats: knownRule(seats, OH_ART11_SEC3),
    quorum: knownRule(
      majorityOf(
        "members-elected",
        "a majority of all the members elected to the House",
        OH_ART2_SEC6,
      ),
      OH_ART2_SEC6,
    ),
    introductionAllowed: true,
    referral: {
      authorityLabel: "Set by each house's own rules of proceeding",
      multipleReferralAllowed: unknownRule(
        "Whether Ohio permits referring one bill to several committees is set by each house's rules under Ohio Const. art. II, § 7, which were not read for this pack.",
      ),
      everyMeasureMustBeHeard: unknownRule(
        "Whether every referred bill is guaranteed a hearing in Ohio is set by each house's rules under Ohio Const. art. II, § 7, which were not read for this pack.",
      ),
      source: OH_ART2_SEC7,
    },
    committees: [],
    floorStages: [
      {
        stageKey: "third-consideration",
        label: "Third consideration and passage",
        amendable: unknownRule(
          "Whether an Ohio bill may be amended at its third consideration is set by each house's rules under Ohio Const. art. II, § 7, which were not read for this pack. Art. II, § 15 establishes that a bill may be altered or amended in the other house without fixing the stage at which it happens.",
        ),
        separateLegislativeDayRequired: true,
        vote: knownRule(
          majorityOf(
            "members-elected",
            "a majority of the members elected to the house",
            OH_ART2_SEC15,
          ),
          OH_ART2_SEC15,
        ),
        source: OH_ART2_SEC15,
      },
    ],
    amendments: {
      floorAmendmentsAllowed: knownRule(true, OH_ART2_SEC15),
      germanenessStandard: unknownRule(
        "Ohio confines a bill to one subject clearly expressed in its title (Ohio Const. art. II, § 15(D)), but the germaneness standard applied to amendments is set by each house's rules, which were not read for this pack.",
      ),
      source: OH_ART2_SEC15,
    },
  };
}

export const OHIO_RULE_PACK: LegislativeRulePack = {
  packId: "us-oh-general-assembly-v1",
  jurisdictionKey: "US-OH",
  displayName: "Ohio General Assembly",
  structure: "bicameral",
  chambers: [
    ohioChamber("house", "House of Representatives", 99),
    ohioChamber("senate", "Senate", 33),
  ],
  chamberOrder: ["house", "senate"],
  origination: {
    generalOrigination: knownRule(["house", "senate"], OH_ART2_SEC15),
    subjectRestrictions: [],
    source: OH_ART2_SEC15,
  },
  interChamber: {
    kind: "second-chamber",
    concurrenceThreshold: majorityOf(
      "members-elected",
      "a majority of the members elected to the house",
      OH_ART2_SEC15,
    ),
    conference: unknownRule(
      "Ohio resolves inter-chamber differences by conference committee under each house's rules and the joint rules, which were not read for this pack; conference is not modelled.",
    ),
    source: OH_ART2_SEC15,
  },
  executive: {
    titleLabel: "Governor",
    presentmentRequired: knownRule(true, OH_ART2_SEC16),
    actionWindowDaysInSession: knownRule(10, OH_ART2_SEC16),
    actionWindowDaysAfterAdjournment: knownRule(10, OH_ART2_SEC16),
    inactionOutcomeInSession: knownRule(
      "becomes-law-without-signature",
      OH_ART2_SEC16,
    ),
    lineItemVeto: knownRule(true, OH_ART2_SEC16),
    override: {
      kind: "each-chamber",
      threshold: fractionOf(
        3,
        5,
        "members-elected",
        "three-fifths of the members elected to each house",
        OH_ART2_SEC16,
      ),
    },
    source: OH_ART2_SEC16,
  },
  enactment: {
    effectiveDateDistinctFromEnactment: knownRule(true, OH_ART2_SEC1C),
    defaultEffectiveRule: knownRule(
      "No law passed by the general assembly goes into effect until ninety days after the governor files it in the office of the secretary of state, which is the window in which a referendum petition may be filed against it.",
      OH_ART2_SEC1C,
    ),
    source: OH_ART2_SEC1C,
  },
  session: {
    sessionLabel: "Regular session",
    adjournmentRule: knownRule(
      "Each general assembly convenes in first regular session on the first Monday of January in the odd-numbered year, or the succeeding day if that Monday is a legal holiday, and in second regular session on the same date of the following year; the constitution sets no adjournment deadline for a regular session.",
      OH_ART2_SEC8,
    ),
    measuresDieAtAdjournment: unknownRule(
      "The Ohio General Assembly is a two-year body; whether a measure dies at a given adjournment, rather than at the end of the general assembly, is not settled by the sections read for this pack.",
    ),
    source: OH_ART2_SEC8,
  },
  sources: [
    OH_ART2_SEC15,
    OH_ART2_SEC16,
    OH_ART2_SEC1C,
    OH_ART2_SEC1D,
    OH_ART2_SEC6,
    OH_ART2_SEC7,
    OH_ART2_SEC8,
    OH_ART11_SEC2,
    OH_ART11_SEC3,
  ],
  unresolvedGaps: [
    "Ohio's committee structure, referral among committees, and report and discharge thresholds are set by each house's rules under art. II, § 7, which were not read for this pack.",
    "Ohio's germaneness standard for amendments, and whether a bill may be amended at its third consideration, are chamber-rules matters left unresolved here.",
    "Ohio's conference committee composition and report rules are unresolved, and conference is not modelled.",
    "Ohio Const. art. II, § 1d creates distinct immediate-effect categories: tax levies and current-expense appropriations take immediate effect under § 1d, while an emergency law does so only after the specified two-thirds elected-members vote and a separate statement of reasons passed by separate roll call. The schema records one default effective rule and has no field for these category-specific routes, so they remain an explicit gap without changing the ordinary § 1c ninety-days-after-filing default.",
    "Whether an Ohio measure dies at a given adjournment, as distinct from at the end of the two-year general assembly, is unresolved.",
    "This pack models a single final-passage stage; art. II, § 15(C) requires consideration on three different days, but the intermediate stages come from chamber rules not read here.",
  ],
};

export const LEGISLATIVE_RULE_PACKS: readonly LegislativeRulePack[] = [
  KENTUCKY_RULE_PACK,
  NEBRASKA_RULE_PACK,
  ALASKA_RULE_PACK,
  MINNESOTA_RULE_PACK,
  ILLINOIS_RULE_PACK,
  MARYLAND_RULE_PACK,
  MISSOURI_RULE_PACK,
  NEVADA_RULE_PACK,
  OHIO_RULE_PACK,
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
