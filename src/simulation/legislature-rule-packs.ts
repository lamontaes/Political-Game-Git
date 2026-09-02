import {
  fractionOf,
  knownRule,
  majorityOf,
  unknownRule,
  type ChamberRule,
  type LegislativeRulePack,
  type RuleSourceRef,
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

const RETRIEVED = "2026-09-01";

function constitution(
  state: string,
  citation: string,
  url: string,
  note: string | null = null,
): RuleSourceRef {
  return {
    authority: "constitution",
    citation,
    sourceTitle: `The Constitution of ${state}`,
    sourceUrl: url,
    retrievedAt: RETRIEVED,
    verification: "verified",
    note,
  };
}

function rules(
  title: string,
  citation: string,
  url: string,
  authority: RuleSourceRef["authority"],
  note: string | null = null,
): RuleSourceRef {
  return {
    authority,
    citation,
    sourceTitle: title,
    sourceUrl: url,
    retrievedAt: RETRIEVED,
    verification: "verified",
    note,
  };
}

// ---------------------------------------------------------------------------
// Kentucky — ordinary bicameral, simple-majority veto override
// ---------------------------------------------------------------------------

const KY_CONST_URL =
  "https://legislature.ky.gov/Law/Constitution/Pages/default.aspx";
const KY_HOUSE_RULES_URL =
  "https://legislature.ky.gov/Documents/HouseRules.pdf";
const KY_JOINT_RULES_URL =
  "https://legislature.ky.gov/Documents/JointRules.pdf";

const KY_SEC_46 = constitution(
  "the Commonwealth of Kentucky",
  "Const. Sec. 46",
  KY_CONST_URL,
  "Three readings on separate days; passage requires a majority of members elected to each house.",
);
const KY_SEC_88 = constitution(
  "the Commonwealth of Kentucky",
  "Const. Sec. 88",
  KY_CONST_URL,
  "Gubernatorial veto; each house may override by a majority of all members elected.",
);
const KY_SEC_42 = constitution(
  "the Commonwealth of Kentucky",
  "Const. Sec. 42",
  KY_CONST_URL,
  "Session length and mandatory adjournment deadlines.",
);
const KY_SEC_47 = constitution(
  "the Commonwealth of Kentucky",
  "Const. Sec. 47",
  KY_CONST_URL,
  "Revenue bills must originate in the House of Representatives.",
);
const KY_HOUSE_RULE_39 = rules(
  "Rules of the House of Representatives of the Commonwealth of Kentucky",
  "House Rule 39",
  KY_HOUSE_RULES_URL,
  "permanent-rules",
  "The Committee on Committees assigns bills; unassigned bills stay in its custody.",
);
const KY_HOUSE_RULE_41 = rules(
  "Rules of the House of Representatives of the Commonwealth of Kentucky",
  "House Rule 41",
  KY_HOUSE_RULES_URL,
  "permanent-rules",
  "The Rules Committee posts measures to the Orders of the Day for floor debate.",
);
const KY_JOINT_RULE_4 = rules(
  "Joint Rules of the Kentucky General Assembly",
  "Joint Rule 4",
  KY_JOINT_RULES_URL,
  "joint-rules",
  "Three conferees per chamber; the conference report is unamendable on the floor.",
);

function kentuckyChamber(
  chamberKey: string,
  name: string,
  seats: number,
  introductionAllowed: boolean,
): ChamberRule {
  return {
    chamberKey,
    name,
    seats,
    quorum: unknownRule(
      "The research set did not resolve Kentucky's constitutional quorum fraction.",
    ),
    introductionAllowed,
    referral: {
      authorityLabel: "Committee on Committees",
      multipleReferralAllowed: unknownRule(
        "The research set did not resolve whether Kentucky permits multiple referral.",
      ),
      everyMeasureMustBeHeard: knownRule(false, KY_HOUSE_RULE_39),
      source: KY_HOUSE_RULE_39,
    },
    committees: [
      {
        committeeKey: `${chamberKey}-standing`,
        name: `${name} standing committee`,
        appointedMembers: chamberKey === "house" ? 17 : 11,
        reportThreshold: majorityOf(
          "committee-members-appointed",
          "a majority of the committee's appointed members",
          KY_HOUSE_RULE_39,
        ),
        chairMayDeclineToHear: knownRule(true, KY_HOUSE_RULE_39),
        publicHearingNotice: unknownRule(
          "The research set did not resolve Kentucky's committee notice interval.",
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
            "a majority of all members elected to the chamber",
            KY_SEC_46,
          ),
          KY_SEC_46,
        ),
        source: KY_SEC_46,
      },
    ],
    amendments: {
      floorAmendmentsAllowed: knownRule(true, KY_HOUSE_RULE_41),
      germanenessStandard: unknownRule(
        "The research set did not resolve Kentucky's germaneness standard.",
      ),
      source: KY_HOUSE_RULE_41,
    },
  };
}

export const KENTUCKY_RULE_PACK: LegislativeRulePack = {
  packId: "us-ky-general-assembly-v1",
  jurisdictionKey: "US-KY",
  displayName: "Kentucky General Assembly",
  structure: "bicameral",
  chambers: [
    kentuckyChamber("house", "House of Representatives", 100, true),
    kentuckyChamber("senate", "Senate", 38, true),
  ],
  chamberOrder: ["house", "senate"],
  interChamber: {
    kind: "second-chamber",
    concurrenceThreshold: majorityOf(
      "members-elected",
      "a majority of all members elected to the chamber",
      KY_SEC_46,
    ),
    conference: knownRule(
      {
        confereesPerChamber: 3,
        reportAmendableOnFloor: false,
        adoptionThresholdLabel:
          "a majority of all members elected in each house",
      },
      KY_JOINT_RULE_4,
    ),
    source: KY_JOINT_RULE_4,
  },
  executive: {
    titleLabel: "Governor",
    presentmentRequired: knownRule(true, KY_SEC_88),
    actionWindowDaysInSession: knownRule(10, KY_SEC_88),
    actionWindowDaysAfterAdjournment: unknownRule(
      "The research set did not resolve Kentucky's period the Governor has after adjournment.",
    ),
    inactionOutcomeInSession: unknownRule(
      "The research set did not resolve what happens if the Governor neither signs nor returns a bill.",
    ),
    lineItemVeto: knownRule(true, KY_SEC_88),
    override: {
      kind: "each-chamber",
      threshold: majorityOf(
        "members-elected",
        "a majority of all members elected to each house",
        KY_SEC_88,
      ),
    },
    source: KY_SEC_88,
  },
  enactment: {
    effectiveDateDistinctFromEnactment: unknownRule(
      "The research set did not resolve Kentucky's default effective-date rule.",
    ),
    defaultEffectiveRule: unknownRule(
      "The research set did not resolve when Kentucky acts take effect.",
    ),
    source: KY_SEC_46,
  },
  session: {
    sessionLabel: "Regular session",
    adjournmentRule: knownRule(
      "Even-year sessions run 60 legislative days and adjourn by 15 April; odd-year sessions run 30 legislative days and adjourn by 30 March.",
      KY_SEC_42,
    ),
    measuresDieAtAdjournment: knownRule(true, KY_SEC_42),
    source: KY_SEC_42,
  },
  sources: [
    KY_SEC_46,
    KY_SEC_88,
    KY_SEC_42,
    KY_SEC_47,
    KY_HOUSE_RULE_39,
    KY_HOUSE_RULE_41,
    KY_JOINT_RULE_4,
  ],
  unresolvedGaps: [
    "Constitutional quorum fraction is unresolved.",
    "Post-adjournment gubernatorial action period is unresolved.",
    "Outcome of gubernatorial inaction is unresolved.",
    "Default effective-date rule is unresolved.",
  ],
};

// ---------------------------------------------------------------------------
// Nebraska — unicameral, three constitutional floor stages, no second chamber
// ---------------------------------------------------------------------------

const NE_CONST_URL =
  "https://nebraskalegislature.gov/laws/browse-constitution.php";
const NE_RULES_URL = "https://nebraskalegislature.gov/about/rules.php";

const NE_ART3_SEC14 = constitution(
  "the State of Nebraska",
  "Const. Art. III, Sec. 14",
  NE_CONST_URL,
  "Every bill passes General File, Select File and Final Reading on separate legislative days.",
);
const NE_ART4_SEC15 = constitution(
  "the State of Nebraska",
  "Const. Art. IV, Sec. 15",
  NE_CONST_URL,
  "Gubernatorial veto; three-fifths of elected members override.",
);
const NE_ART3_SEC10 = constitution(
  "the State of Nebraska",
  "Const. Art. III, Sec. 10",
  NE_CONST_URL,
  "Ninety legislative days in odd years, sixty in even years.",
);
const NE_RULE_3_4 = rules(
  "Rules of the Nebraska Unicameral Legislature",
  "Rule 3, Sec. 4",
  NE_RULES_URL,
  "permanent-rules",
  "The Reference Committee assigns bills; every referred bill receives a public hearing.",
);
const NE_RULE_7_10 = rules(
  "Rules of the Nebraska Unicameral Legislature",
  "Rule 7, Sec. 10",
  NE_RULES_URL,
  "permanent-rules",
  "Cloture requires two-thirds of all elected senators.",
);
const NE_RULE_8 = rules(
  "Rules of the Nebraska Unicameral Legislature",
  "Rule 8",
  NE_RULES_URL,
  "permanent-rules",
  "Priority bill designations govern which measures reach the floor.",
);

const NE_MAJORITY_ELECTED = majorityOf(
  "members-elected",
  "a majority of all elected senators",
  NE_ART3_SEC14,
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
        "The research set did not resolve Nebraska's quorum fraction.",
      ),
      introductionAllowed: true,
      referral: {
        authorityLabel: "Reference Committee",
        multipleReferralAllowed: unknownRule(
          "The research set did not resolve whether Nebraska permits multiple referral.",
        ),
        everyMeasureMustBeHeard: knownRule(true, NE_RULE_3_4),
        source: NE_RULE_3_4,
      },
      committees: [
        {
          committeeKey: "standing",
          name: "Standing committee",
          appointedMembers: 8,
          reportThreshold: majorityOf(
            "committee-members-appointed",
            "a majority of the committee's appointed members",
            NE_RULE_3_4,
          ),
          chairMayDeclineToHear: knownRule(false, NE_RULE_3_4),
          publicHearingNotice: unknownRule(
            "The research set did not resolve Nebraska's committee notice interval.",
          ),
        },
      ],
      floorStages: [
        {
          stageKey: "general-file",
          label: "General File",
          amendable: true,
          separateLegislativeDayRequired: true,
          vote: knownRule(NE_MAJORITY_ELECTED, NE_ART3_SEC14),
          source: NE_ART3_SEC14,
        },
        {
          stageKey: "select-file",
          label: "Select File",
          amendable: true,
          separateLegislativeDayRequired: true,
          vote: knownRule(NE_MAJORITY_ELECTED, NE_ART3_SEC14),
          source: NE_ART3_SEC14,
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
        floorAmendmentsAllowed: knownRule(true, NE_ART3_SEC14),
        germanenessStandard: unknownRule(
          "The research set did not resolve Nebraska's germaneness standard.",
        ),
        source: NE_ART3_SEC14,
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
      "The research set did not resolve Nebraska's period the Governor has after adjournment.",
    ),
    inactionOutcomeInSession: unknownRule(
      "The research set did not resolve what happens if the Governor neither signs nor returns a bill.",
    ),
    lineItemVeto: knownRule(true, NE_ART4_SEC15),
    override: {
      kind: "each-chamber",
      threshold: fractionOf(
        3,
        5,
        "members-elected",
        "three-fifths of all elected senators",
        NE_ART4_SEC15,
      ),
    },
    source: NE_ART4_SEC15,
  },
  enactment: {
    effectiveDateDistinctFromEnactment: unknownRule(
      "The research set did not resolve Nebraska's default effective-date rule.",
    ),
    defaultEffectiveRule: unknownRule(
      "The research set did not resolve when Nebraska acts take effect.",
    ),
    source: NE_ART3_SEC14,
  },
  session: {
    sessionLabel: "Regular session",
    adjournmentRule: knownRule(
      "Ninety legislative days in odd-numbered years and sixty in even-numbered years; measures die at the end of the biennium.",
      NE_ART3_SEC10,
    ),
    measuresDieAtAdjournment: knownRule(true, NE_ART3_SEC10),
    source: NE_ART3_SEC10,
  },
  sources: [
    NE_ART3_SEC14,
    NE_ART4_SEC15,
    NE_ART3_SEC10,
    NE_RULE_3_4,
    NE_RULE_7_10,
    NE_RULE_8,
  ],
  unresolvedGaps: [
    "Quorum fraction is unresolved.",
    "Post-adjournment gubernatorial action period is unresolved.",
    "Outcome of gubernatorial inaction is unresolved.",
    "Default effective-date rule is unresolved.",
  ],
};

// ---------------------------------------------------------------------------
// Alaska — bicameral, but vetoes are reconsidered in one joint sitting
// ---------------------------------------------------------------------------

const AK_CONST_URL = "https://www.akleg.gov/basis/constitution.asp";
const AK_UNIFORM_URL = "https://www.akleg.gov/basis/uniform_rules.asp";

const AK_ART2_SEC14 = constitution(
  "the State of Alaska",
  "Const. Art. II, Sec. 14",
  AK_CONST_URL,
  "Three readings on separate days; passage requires a majority of the total membership of the house.",
);
const AK_ART2_SEC16 = constitution(
  "the State of Alaska",
  "Const. Art. II, Sec. 16",
  AK_CONST_URL,
  "Vetoes are reconsidered in joint session: two-thirds of the total membership, three-quarters for appropriation and revenue bills.",
);
const AK_ART2_SEC15 = constitution(
  "the State of Alaska",
  "Const. Art. II, Sec. 15",
  AK_CONST_URL,
  "The Governor may veto or reduce individual appropriation items.",
);
const AK_ART2_SEC8 = constitution(
  "the State of Alaska",
  "Const. Art. II, Sec. 8",
  AK_CONST_URL,
  "Regular sessions run 121 consecutive calendar days, extendable by ten days.",
);
const AK_UNIFORM_22 = rules(
  "Uniform Rules of the Alaska State Legislature",
  "Uniform Rule 22",
  AK_UNIFORM_URL,
  "uniform-rules",
  "The presiding officer may refer a bill to one or more standing committees in sequence.",
);
const AK_UNIFORM_44 = rules(
  "Uniform Rules of the Alaska State Legislature",
  "Uniform Rule 44",
  AK_UNIFORM_URL,
  "uniform-rules",
  "Twenty-four hours' public notice; a majority of the committee reports the bill.",
);
const AK_UNIFORM_3 = rules(
  "Uniform Rules of the Alaska State Legislature",
  "Uniform Rule 3",
  AK_UNIFORM_URL,
  "uniform-rules",
  "Three conferees per chamber produce a conference report.",
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
      "The research set did not resolve Alaska's quorum fraction.",
    ),
    introductionAllowed: true,
    referral: {
      authorityLabel: "Presiding officer",
      multipleReferralAllowed: knownRule(true, AK_UNIFORM_22),
      everyMeasureMustBeHeard: unknownRule(
        "The research set did not resolve whether Alaska guarantees a hearing.",
      ),
      source: AK_UNIFORM_22,
    },
    committees: [
      {
        committeeKey: `${chamberKey}-standing`,
        name: `${name} standing committee`,
        appointedMembers: 7,
        reportThreshold: majorityOf(
          "committee-members-appointed",
          "a majority of the committee's appointed members",
          AK_UNIFORM_44,
        ),
        chairMayDeclineToHear: unknownRule(
          "The research set did not resolve Alaska chair scheduling discretion.",
        ),
        publicHearingNotice: knownRule(
          "Twenty-four hours' public notice during the first fifty days.",
          AK_UNIFORM_44,
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
            "a majority of the total membership of the house",
            AK_ART2_SEC14,
          ),
          AK_ART2_SEC14,
        ),
        source: AK_ART2_SEC14,
      },
    ],
    amendments: {
      floorAmendmentsAllowed: knownRule(true, AK_UNIFORM_22),
      germanenessStandard: unknownRule(
        "The research set did not resolve Alaska's germaneness standard.",
      ),
      source: AK_UNIFORM_22,
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
      "a majority of the total membership of the house",
      AK_ART2_SEC14,
    ),
    conference: knownRule(
      {
        confereesPerChamber: 3,
        reportAmendableOnFloor: false,
        adoptionThresholdLabel:
          "a majority of the elected membership in each house",
      },
      AK_UNIFORM_3,
    ),
    source: AK_UNIFORM_3,
  },
  executive: {
    titleLabel: "Governor",
    presentmentRequired: knownRule(true, AK_ART2_SEC16),
    actionWindowDaysInSession: knownRule(15, AK_ART2_SEC15),
    actionWindowDaysAfterAdjournment: knownRule(20, AK_ART2_SEC15),
    inactionOutcomeInSession: unknownRule(
      "The research set did not resolve what happens if the Governor neither signs nor returns a bill.",
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
        "two-thirds of the combined membership of both houses sitting jointly",
        AK_ART2_SEC16,
      ),
      appropriationsThreshold: knownRule(
        fractionOf(
          3,
          4,
          "joint-total-membership",
          "three-quarters of the combined membership for appropriation and revenue bills",
          AK_ART2_SEC16,
        ),
        AK_ART2_SEC16,
      ),
    },
    source: AK_ART2_SEC16,
  },
  enactment: {
    effectiveDateDistinctFromEnactment: unknownRule(
      "The research set did not resolve Alaska's default effective-date rule.",
    ),
    defaultEffectiveRule: unknownRule(
      "The research set did not resolve when Alaska acts take effect.",
    ),
    source: AK_ART2_SEC14,
  },
  session: {
    sessionLabel: "Regular session",
    adjournmentRule: knownRule(
      "One hundred twenty-one consecutive calendar days from the third Tuesday in January, extendable by ten days on a two-thirds vote.",
      AK_ART2_SEC8,
    ),
    measuresDieAtAdjournment: unknownRule(
      "The research set did not resolve whether Alaska measures carry over within a legislature.",
    ),
    source: AK_ART2_SEC8,
  },
  sources: [
    AK_ART2_SEC14,
    AK_ART2_SEC16,
    AK_ART2_SEC15,
    AK_ART2_SEC8,
    AK_UNIFORM_22,
    AK_UNIFORM_44,
    AK_UNIFORM_3,
  ],
  unresolvedGaps: [
    "Quorum fraction is unresolved.",
    "Outcome of gubernatorial inaction is unresolved.",
    "Default effective-date rule is unresolved.",
    "Whether measures carry over within a legislature is unresolved.",
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
