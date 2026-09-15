import {
  knownRule,
  notApplicableRule,
  unknownRule,
  type RuleSourceRef,
  type RuleValue,
  type VoteThresholdRule,
} from "./legislature-rules";

/** Congressional readings, not state-pack aliases or an invented elected seat. */
const constitution = (citation: string): RuleSourceRef => ({
  authority: "constitution",
  citation,
  sourceTitle: "United States Constitution, National Archives transcription",
  sourceUrl: "https://www.archives.gov/founding-docs/constitution-transcript",
  retrievedAt: "2026-09-13",
  verification: "verified",
  note: "Read with the subsequently amended provisions; no current officeholder identity is inferred.",
});
const houseManual: RuleSourceRef = {
  authority: "permanent-rules",
  citation: "119th House Rules and Manual, Rule XX clause 1(c), § 1013",
  sourceTitle: "119th Congress House Rules and Manual",
  sourceUrl: "https://www.govinfo.gov/content/pkg/HMAN-119/pdf/HMAN-119.pdf",
  retrievedAt: "2026-09-13",
  verification: "verified",
  note: "House tie disposition only; this is not a Senate rule.",
};
const senateVoting: RuleSourceRef = {
  authority: "research-reference",
  citation: "About Voting — legislation cloture",
  sourceTitle: "United States Senate: About Voting",
  sourceUrl: "https://www.senate.gov/about/powers-procedures/voting.htm",
  retrievedAt: "2026-09-13",
  verification: "partial",
  note: "Official explanation; limited to the stated legislation cloture rule, not nomination precedents or all special motions.",
};
const houseMajority: RuleSourceRef = {
  ...houseManual,
  authority: "parliamentary-fallback",
  citation: "119th House Rules and Manual § 508; Rule XX clause 6(b)",
  note: "Ordinary majority of those voting, with quorum; express special thresholds/orders remain separate.",
};
const senateMajority: RuleSourceRef = {
  ...senateVoting,
  citation: "About Voting — ordinary majority; Enactment of a Law — Voting",
  note: "Ordinary roll-call question with quorum, not cloture, treaties, overrides, amendments to the Constitution or special statutory/order thresholds. Denominator reading: https://www.congress.gov/help/learn-about-the-legislative-process/enactment-of-a-law.",
};
const ordinaryMajority = (source: RuleSourceRef): VoteThresholdRule => ({
  numerator: 1,
  denominatorParts: 2,
  countedAgainst: "members-voting",
  rounding: "strictly-greater-than-fraction",
  label:
    "Ordinary majority of members voting, with quorum; express special thresholds remain separate",
  source,
});

export interface CongressionalProceduralClaims {
  readonly institutionId: string;
  readonly chamberKey: "house" | "senate";
  readonly name: string;
  readonly termYears: RuleValue<number>;
  readonly revenueOrigination: RuleValue<boolean>;
  readonly tieDisposition: RuleValue<string>;
  readonly legislationCloture: RuleValue<
    Omit<VoteThresholdRule, "countedAgainst"> & {
      readonly countedAgainst: "senators-duly-chosen-and-sworn";
    }
  >;
  readonly ordinaryFloorPassage: RuleValue<VoteThresholdRule>;
  readonly presentment: RuleValue<string>;
  readonly inaction: RuleValue<string>;
  readonly effectiveDate: RuleValue<string>;
}

export const CONGRESSIONAL_PROCEDURAL_CLAIMS: readonly CongressionalProceduralClaims[] =
  [
    {
      institutionId: "us-congress-house",
      chamberKey: "house",
      name: "United States House of Representatives",
      termYears: knownRule(2, constitution("Article I, § 2")),
      revenueOrigination: knownRule(
        true,
        constitution("Article I, § 7, clause 1"),
      ),
      tieDisposition: knownRule("The question is lost on a tie.", houseManual),
      legislationCloture: notApplicableRule(
        "The Senate Rule XXII cloture motion is not a House procedure; House debate limits require their own rule or order.",
      ),
      ordinaryFloorPassage: knownRule(
        ordinaryMajority(houseMajority),
        houseMajority,
      ),
      presentment: knownRule(
        "An ordinary bill passed by both chambers is presented to the President; approval is by signature or the supported Article I return/inaction route.",
        constitution("Article I, § 7, clause 2"),
      ),
      inaction: knownRule(
        "Ten days excluding Sundays; non-return becomes law unless congressional adjournment prevents return, in which case it does not become law.",
        constitution("Article I, § 7, clause 2"),
      ),
      effectiveDate: unknownRule(
        "No universal effective date is inferred from presentment; the enacted measure and applicable law must supply its operative date.",
      ),
    },
    {
      institutionId: "us-congress-senate",
      chamberKey: "senate",
      name: "United States Senate",
      termYears: knownRule(
        6,
        constitution(
          "Article I, § 3; Seventeenth Amendment changes the election method, not the six-year term",
        ),
      ),
      revenueOrigination: knownRule(
        false,
        constitution(
          "Article I, § 7, clause 1; Senate may propose or concur in amendments",
        ),
      ),
      tieDisposition: knownRule(
        "The Vice President may vote when Senators are equally divided; no automatic tie-breaking decision is supplied.",
        constitution("Article I, § 3, clause 4"),
      ),
      legislationCloture: knownRule(
        {
          numerator: 3,
          denominatorParts: 5,
          countedAgainst: "senators-duly-chosen-and-sworn",
          rounding: "at-least-fraction",
          label:
            "Three-fifths of Senators duly chosen and sworn for legislation cloture; not final passage",
          source: senateVoting,
        },
        senateVoting,
      ),
      ordinaryFloorPassage: knownRule(
        ordinaryMajority(senateMajority),
        senateMajority,
      ),
      presentment: knownRule(
        "An ordinary bill passed by both chambers is presented to the President; this is not a state governor route.",
        constitution("Article I, § 7, clause 2"),
      ),
      inaction: knownRule(
        "Ten days excluding Sundays; non-return becomes law unless congressional adjournment prevents return, in which case it does not become law.",
        constitution("Article I, § 7, clause 2"),
      ),
      effectiveDate: unknownRule(
        "The enacted measure and applicable law must supply the operative date.",
      ),
    },
  ];
