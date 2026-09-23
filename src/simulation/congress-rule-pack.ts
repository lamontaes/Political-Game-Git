import {
  fractionOf,
  knownRule,
  majorityOf,
  unknownRule,
  type ChamberRule,
  type CommitteeRule,
  type LegislativeRulePack,
  type RuleSourceRef,
  type RuleVerificationStatus,
} from "./legislature-rules";

/**
 * The Congress of the United States as a legislature the bill engine can move
 * a bill through: two chambers, the President's desk, and an override by
 * two-thirds of each House.
 *
 * It is not one of `LEGISLATIVE_RULE_PACKS`, which lists state legislatures
 * and is what the Content Browser shows as one. Like the municipal packs it
 * is resolvable by id through `rulePackById`, because the engine that moves a
 * state bill is the engine that moves a federal one.
 *
 * What was read. Article I, sections 5 and 7, were read in the Constitution
 * transcript the repository already holds at
 * `data/source/constitutional-process/raw/us-quorum.html` (retrieved
 * 2026-09-13 from archives.gov), so the quorum, presentment, the ten-day
 * window, the override and the revenue-origination rule are marked verified.
 * Everything else here — the Senate's cloture rule, referral, committee
 * jurisdiction, the default effective date — is well established but was not
 * retrieved for this pack, so it is marked partial, and a request to verify
 * it is filed as `us-congress-rules-verification`.
 *
 * NOT MODELED, each asked in that request:
 * - Unanimous consent. In the real Senate most bills pass without a cloture
 *   vote; here every Senate bill faces one, so the sixty-vote bar applies to
 *   everything, including bills nobody would filibuster.
 * - Budget reconciliation, which is exempt from cloture.
 * - Suspension of the rules in the House (two-thirds, no amendments) and
 *   special rules from the Rules Committee.
 * - Conference committees.
 * - A bill dying at the end of a two-year Congress. The session vocabulary
 *   holds a one-year boundary, so no Congress bill is ever declared dead at
 *   adjournment.
 * - The pocket veto, and Sundays being excepted from the ten days.
 */

export const US_CONGRESS_PACK_ID = "us-congress-v1";
export const US_CONGRESS_JURISDICTION_KEY = "US";

const CONSTITUTION_URL =
  "https://www.archives.gov/founding-docs/constitution-transcript";
const AMENDMENTS_URL =
  "https://www.archives.gov/founding-docs/amendments-11-27";
const HOUSE_RULES_URL = "https://rules.house.gov/rules-and-resources";
const SENATE_RULES_URL = "https://www.rules.senate.gov/rules-of-the-senate";

function source(
  authority: RuleSourceRef["authority"],
  citation: string,
  sourceTitle: string,
  sourceUrl: string,
  verification: RuleVerificationStatus,
  note: string,
  retrievedAt: string | null,
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

const READ_IN_REPOSITORY = "2026-09-13";

const ART1_SEC5 = source(
  "constitution",
  "U.S. Const. art. I, § 5, cl. 1",
  "The Constitution of the United States: A Transcription",
  CONSTITUTION_URL,
  "verified",
  '"a Majority of each shall constitute a Quorum to do Business." Read in data/source/constitutional-process/raw/us-quorum.html.',
  READ_IN_REPOSITORY,
);
const ART1_SEC7 = source(
  "constitution",
  "U.S. Const. art. I, § 7, cl. 1-2",
  "The Constitution of the United States: A Transcription",
  CONSTITUTION_URL,
  "verified",
  "Revenue bills originate in the House; every bill passed by both Houses is presented to the President, who signs it or returns it with objections; two-thirds of each House may pass it over the objections; a bill not returned within ten days (Sundays excepted) becomes law unless an adjournment prevents its return. Read in data/source/constitutional-process/raw/us-quorum.html.",
  READ_IN_REPOSITORY,
);
const ART1_SEC7_OVERRIDE_DENOMINATOR = source(
  "constitution",
  "U.S. Const. art. I, § 7, cl. 2, as construed",
  "National Prohibition Cases, 253 U.S. 350 (1920); Missouri Pacific Ry. Co. v. Kansas, 248 U.S. 276 (1919)",
  "https://www.law.cornell.edu/supremecourt/text/253/350",
  "partial",
  'Two-thirds "of that House" is two-thirds of the members present, a quorum being present, not of the whole membership. The National Prohibition Cases say so of the amendment vote (read in data/source/constitutional-process/raw/us-proposal-denominator.html); Missouri Pacific applied it to a veto override and was not retrieved.',
  READ_IN_REPOSITORY,
);
const ART1_SEC3 = source(
  "constitution",
  "U.S. Const. art. I, § 3, cl. 1",
  "The Constitution of the United States: A Transcription",
  CONSTITUTION_URL,
  "verified",
  '"The Senate of the United States shall be composed of two Senators from each State." Read in data/source/constitutional-process/raw/us-quorum.html; the Seventeenth Amendment later changed how they are chosen, not how many. Fifty states give one hundred seats.',
  READ_IN_REPOSITORY,
);
const AMEND20_SEC2 = source(
  "constitution",
  "U.S. Const. amend. XX, § 2",
  "Amendments 11-27",
  AMENDMENTS_URL,
  "partial",
  "Congress assembles at least once every year, beginning at noon on January 3 unless a law appoints a different day.",
  null,
);
const HOUSE_RULE_XII = source(
  "permanent-rules",
  "Rules of the House, Rule XII, cl. 2",
  "Rules of the House of Representatives",
  HOUSE_RULES_URL,
  "partial",
  "The Speaker refers each bill to the committee or committees with jurisdiction under Rule X. Not retrieved for this pack.",
  null,
);
const HOUSE_RULE_XI = source(
  "permanent-rules",
  "Rules of the House, Rule XI, cl. 2(h)",
  "Rules of the House of Representatives",
  HOUSE_RULES_URL,
  "partial",
  "A committee reports a measure by a majority vote with a majority of the committee actually present. Not retrieved for this pack.",
  null,
);
const SENATE_RULE_XVII = source(
  "permanent-rules",
  "Standing Rules of the Senate, Rule XVII",
  "Standing Rules of the Senate",
  SENATE_RULES_URL,
  "partial",
  "The presiding officer refers each bill to the committee with jurisdiction under Rule XXV. Not retrieved for this pack.",
  null,
);
const SENATE_RULE_XXII = source(
  "permanent-rules",
  "Standing Rules of the Senate, Rule XXII, para. 2",
  "Standing Rules of the Senate",
  SENATE_RULES_URL,
  "partial",
  "Debate on a measure is brought to a close by three-fifths of the Senators duly chosen and sworn. Not retrieved for this pack.",
  null,
);
const PARLIAMENTARY_MAJORITY = source(
  "parliamentary-fallback",
  "General parliamentary law; U.S. Const. art. I, § 5",
  "The Constitution of the United States: A Transcription",
  CONSTITUTION_URL,
  "partial",
  "Where the Constitution names no larger fraction, a question is decided by a majority of the members voting, a quorum being present.",
  READ_IN_REPOSITORY,
);
const EFFECTIVE_ON_ENACTMENT = source(
  "research-reference",
  "Gozlon-Peretz v. United States, 498 U.S. 395, 404 (1991)",
  "Opinion of the Supreme Court of the United States",
  "https://www.law.cornell.edu/supremecourt/text/498/395",
  "partial",
  "Absent a clear direction by Congress to the contrary, a law takes effect on the date of its enactment. Not retrieved for this pack.",
  null,
);
const LINE_ITEM = source(
  "research-reference",
  "Clinton v. City of New York, 524 U.S. 417 (1998)",
  "Opinion of the Supreme Court of the United States",
  "https://www.law.cornell.edu/supremecourt/text/524/417",
  "partial",
  "The President has no power to cancel part of an enacted bill; the Line Item Veto Act of 1996 was struck down. Not retrieved for this pack.",
  null,
);

/**
 * Which committee a federal bill goes to, by the policy field it is about.
 *
 * PLACEHOLDER until research question us-congress-rules-verification is
 * answered. Every committee named here is a real standing committee, but the
 * mapping is by whole field, where the real rules divide jurisdiction far
 * more finely (Medicare alone is shared between Ways and Means and Energy and
 * Commerce in the House, and belongs to Finance in the Senate). The sizes are
 * the game's, marked `scenario-fixture`: real committee sizes change every
 * Congress.
 */
export const CONGRESS_COMMITTEE_BY_DOMAIN: Readonly<
  Record<string, { readonly house: string; readonly senate: string }>
> = {
  budget: { house: "appropriations", senate: "appropriations" },
  tax: { house: "ways-and-means", senate: "finance" },
  "monetary-financial": { house: "financial-services", senate: "banking" },
  defense: { house: "armed-services", senate: "armed-services" },
  "foreign-affairs": { house: "foreign-affairs", senate: "foreign-relations" },
  trade: { house: "ways-and-means", senate: "finance" },
  immigration: { house: "judiciary", senate: "judiciary" },
  health: { house: "energy-and-commerce", senate: "help" },
  "social-insurance": { house: "ways-and-means", senate: "finance" },
  education: { house: "education-and-workforce", senate: "help" },
  "labor-commerce": { house: "education-and-workforce", senate: "help" },
  housing: { house: "financial-services", senate: "banking" },
  "transport-water": {
    house: "transportation-and-infrastructure",
    senate: "environment-and-public-works",
  },
  "energy-environment": {
    house: "energy-and-commerce",
    senate: "energy-and-natural-resources",
  },
  agriculture: { house: "agriculture", senate: "agriculture" },
  emergencies: {
    house: "transportation-and-infrastructure",
    senate: "homeland-security",
  },
  "justice-rights": { house: "judiciary", senate: "judiciary" },
  government: { house: "oversight", senate: "homeland-security" },
  "science-communications": { house: "science", senate: "commerce" },
  "territories-culture": {
    house: "natural-resources",
    senate: "energy-and-natural-resources",
  },
};

const HOUSE_COMMITTEES: readonly (readonly [string, string])[] = [
  ["appropriations", "Committee on Appropriations"],
  ["ways-and-means", "Committee on Ways and Means"],
  ["financial-services", "Committee on Financial Services"],
  ["armed-services", "Committee on Armed Services"],
  ["foreign-affairs", "Committee on Foreign Affairs"],
  ["judiciary", "Committee on the Judiciary"],
  ["energy-and-commerce", "Committee on Energy and Commerce"],
  ["education-and-workforce", "Committee on Education and the Workforce"],
  [
    "transportation-and-infrastructure",
    "Committee on Transportation and Infrastructure",
  ],
  ["agriculture", "Committee on Agriculture"],
  ["oversight", "Committee on Oversight and Government Reform"],
  ["science", "Committee on Science, Space, and Technology"],
  ["natural-resources", "Committee on Natural Resources"],
];

const SENATE_COMMITTEES: readonly (readonly [string, string])[] = [
  ["appropriations", "Committee on Appropriations"],
  ["finance", "Committee on Finance"],
  ["banking", "Committee on Banking, Housing, and Urban Affairs"],
  ["armed-services", "Committee on Armed Services"],
  ["foreign-relations", "Committee on Foreign Relations"],
  ["judiciary", "Committee on the Judiciary"],
  ["help", "Committee on Health, Education, Labor, and Pensions"],
  ["environment-and-public-works", "Committee on Environment and Public Works"],
  ["energy-and-natural-resources", "Committee on Energy and Natural Resources"],
  ["agriculture", "Committee on Agriculture, Nutrition, and Forestry"],
  [
    "homeland-security",
    "Committee on Homeland Security and Governmental Affairs",
  ],
  ["commerce", "Committee on Commerce, Science, and Transportation"],
];

function committees(
  list: readonly (readonly [string, string])[],
  size: number,
  referral: RuleSourceRef,
): readonly CommitteeRule[] {
  return list.map(([committeeKey, name]) => ({
    committeeKey,
    name,
    appointedMembers: size,
    membershipBasis: "scenario-fixture" as const,
    // Rule XI asks for a majority with a majority present; a committee vote
    // here records who voted, not who was in the room, so it is counted
    // against the members voting.
    reportThreshold: majorityOf(
      "members-voting",
      "a majority of the committee members voting",
      referral,
    ),
    chairMayDeclineToHear: unknownRule(
      "Whether a committee chair may simply never take a bill up was not resolved for this pack.",
    ),
    publicHearingNotice: unknownRule(
      "The committee hearing notice period was not resolved for this pack.",
    ),
  }));
}

const PASSAGE = majorityOf(
  "members-voting",
  "a majority of the members voting, a quorum being present",
  PARLIAMENTARY_MAJORITY,
);

function chamber(input: {
  readonly chamberKey: "house" | "senate";
  readonly name: string;
  readonly prefix: string;
  readonly seats: ChamberRule["seats"];
  readonly referralAuthority: string;
  readonly referralSource: RuleSourceRef;
  readonly committees: readonly CommitteeRule[];
  readonly floorStages: ChamberRule["floorStages"];
}): ChamberRule {
  return {
    chamberKey: input.chamberKey,
    name: input.name,
    billDesignationPrefix: input.prefix,
    seats: input.seats,
    quorum: knownRule(
      majorityOf("members-elected", "a majority of each House", ART1_SEC5),
      ART1_SEC5,
    ),
    introductionAllowed: true,
    referral: {
      authorityLabel: input.referralAuthority,
      multipleReferralAllowed: unknownRule(
        "Whether one bill may go to several committees was not resolved for this pack; a bill goes to one here.",
      ),
      everyMeasureMustBeHeard: unknownRule(
        "Whether every bill must be heard in committee was not resolved for this pack.",
      ),
      source: input.referralSource,
    },
    committees: input.committees,
    floorStages: input.floorStages,
    amendments: {
      floorAmendmentsAllowed: unknownRule(
        "Floor amendment in Congress depends on the House's special rules and the Senate's consent agreements, which are not modeled.",
      ),
      germanenessStandard: unknownRule(
        "Germaneness is not modeled for this pack.",
      ),
      source: input.referralSource,
    },
  };
}

export const US_CONGRESS_RULE_PACK: LegislativeRulePack = {
  packId: US_CONGRESS_PACK_ID,
  jurisdictionKey: US_CONGRESS_JURISDICTION_KEY,
  displayName: "Congress of the United States",
  basis: "researched",
  structure: "bicameral",
  chambers: [
    chamber({
      chamberKey: "house",
      name: "House of Representatives",
      prefix: "H.R.",
      // The size of the House is set by statute, which was not retrieved, so
      // no count is claimed here; the chamber is seated one member per Census
      // congressional district and votes count the members actually seated.
      seats: unknownRule(
        "The number of Representatives is fixed by statute (2 U.S.C. section 2a), not retrieved for this pack; the game seats one per Census congressional district.",
      ),
      referralAuthority: "The Speaker",
      referralSource: HOUSE_RULE_XII,
      // PLACEHOLDER committee size; see CONGRESS_COMMITTEE_BY_DOMAIN.
      committees: committees(HOUSE_COMMITTEES, 40, HOUSE_RULE_XI),
      floorStages: [
        {
          stageKey: "passage",
          label: "Passage",
          amendable: unknownRule(
            "Whether a House bill may be amended on the floor depends on the special rule it is considered under, which is not modeled.",
          ),
          separateLegislativeDayRequired: false,
          vote: knownRule(PASSAGE, PARLIAMENTARY_MAJORITY),
          source: PARLIAMENTARY_MAJORITY,
        },
      ],
    }),
    chamber({
      chamberKey: "senate",
      name: "Senate",
      prefix: "S.",
      seats: knownRule(100, ART1_SEC3),
      referralAuthority: "The presiding officer",
      referralSource: SENATE_RULE_XVII,
      // PLACEHOLDER committee size; see CONGRESS_COMMITTEE_BY_DOMAIN.
      committees: committees(SENATE_COMMITTEES, 22, SENATE_RULE_XVII),
      floorStages: [
        {
          stageKey: "cloture",
          label: "Cloture",
          amendable: unknownRule(
            "Amendment before cloture is governed by consent agreements, which are not modeled.",
          ),
          separateLegislativeDayRequired: false,
          vote: knownRule(
            fractionOf(
              3,
              5,
              "members-elected",
              "three-fifths of the Senators duly chosen and sworn",
              SENATE_RULE_XXII,
            ),
            SENATE_RULE_XXII,
          ),
          source: SENATE_RULE_XXII,
        },
        {
          stageKey: "passage",
          label: "Passage",
          amendable: unknownRule(
            "Amendment after cloture is limited to germane amendments already filed, which is not modeled.",
          ),
          separateLegislativeDayRequired: false,
          vote: knownRule(PASSAGE, PARLIAMENTARY_MAJORITY),
          source: PARLIAMENTARY_MAJORITY,
        },
      ],
    }),
  ],
  chamberOrder: ["house", "senate"],
  origination: {
    // Section 7 confines only revenue bills, which by its own terms leaves an
    // ordinary bill free to start in either House.
    generalOrigination: knownRule(["house", "senate"], ART1_SEC7),
    subjectRestrictions: [
      {
        subjectClass: "revenue",
        chamberKeys: ["house"],
        source: ART1_SEC7,
        note: "All bills for raising revenue shall originate in the House of Representatives.",
      },
    ],
    source: ART1_SEC7,
  },
  interChamber: {
    kind: "second-chamber",
    concurrenceThreshold: PASSAGE,
    conference: unknownRule(
      "Both Houses use conference committees, but they are not modeled.",
    ),
    source: ART1_SEC7,
  },
  executive: {
    titleLabel: "President",
    presentmentRequired: knownRule(true, ART1_SEC7),
    actionWindowDaysInSession: knownRule(10, ART1_SEC7),
    actionWindowDaysAfterAdjournment: unknownRule(
      "A bill whose return an adjournment prevents does not become law (the pocket veto); the pocket veto is not modeled.",
    ),
    inactionOutcomeInSession: knownRule(
      "becomes-law-without-signature",
      ART1_SEC7,
    ),
    lineItemVeto: knownRule(false, LINE_ITEM),
    override: {
      kind: "each-chamber",
      threshold: fractionOf(
        2,
        3,
        "members-present",
        "two-thirds of the members present in each House, a quorum being present",
        ART1_SEC7_OVERRIDE_DENOMINATOR,
      ),
    },
    source: ART1_SEC7,
  },
  enactment: {
    effectiveDateDistinctFromEnactment: knownRule(true, EFFECTIVE_ON_ENACTMENT),
    defaultEffectiveRule: knownRule(
      "A federal law takes effect on the date of its enactment unless the law itself says otherwise.",
      EFFECTIVE_ON_ENACTMENT,
    ),
    source: EFFECTIVE_ON_ENACTMENT,
  },
  session: {
    sessionLabel: "Session of Congress",
    adjournmentRule: knownRule(
      "Congress assembles at least once every year, beginning on January 3 unless a law sets a different day.",
      AMEND20_SEC2,
    ),
    measuresDieAtAdjournment: unknownRule(
      "A pending bill dies when the two-year Congress ends, not at each session's adjournment; the session vocabulary cannot yet say so.",
    ),
    source: AMEND20_SEC2,
  },
  sources: [
    ART1_SEC5,
    ART1_SEC7,
    ART1_SEC7_OVERRIDE_DENOMINATOR,
    ART1_SEC3,
    AMEND20_SEC2,
    HOUSE_RULE_XI,
    HOUSE_RULE_XII,
    SENATE_RULE_XVII,
    SENATE_RULE_XXII,
    PARLIAMENTARY_MAJORITY,
    EFFECTIVE_ON_ENACTMENT,
    LINE_ITEM,
  ],
  unresolvedGaps: [
    "Unanimous consent is not modeled: every Senate bill faces a cloture vote.",
    "Budget reconciliation, House suspension of the rules and special rules are not modeled.",
    "Conference committees are not modeled.",
    "A bill dying at the end of a two-year Congress is not modeled.",
    "The pocket veto, and Sundays being excepted from the ten days, are not modeled.",
    "Committee jurisdiction is mapped by whole policy field, and committee sizes are the game's.",
  ],
};

/** The Congress pack, when that is the id asked for. */
export function federalRulePackById(
  packId: string,
): LegislativeRulePack | null {
  return packId === US_CONGRESS_PACK_ID ? US_CONGRESS_RULE_PACK : null;
}
