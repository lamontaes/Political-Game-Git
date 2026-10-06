import type { DecisionConsideration } from "./types";

/** Ordinal custom: a reason the evaluator can combine with each person's other reasons. */
export type SeniorityImportance = NonNullable<
  DecisionConsideration["importance"]
>;

export type CommitteeAssignmentAuthority =
  | "speaker"
  | "senate-president"
  | "committee-on-committees"
  | "party-caucuses"
  | "council-president"
  | "mayor-pro-tem"
  | "estimated-chamber-leadership";

export type ChairSelectionAuthority =
  | "majority-caucus"
  | "speaker"
  | "senate-president"
  | "committee-on-committees"
  | "council-vote"
  | "estimated-majority-authority";

export interface ChamberLeadershipProfile {
  readonly jurisdictionKey: string;
  readonly chamberKey: string;
  readonly assignmentAuthority: CommitteeAssignmentAuthority;
  readonly chairSelectionAuthority: ChairSelectionAuthority;
  readonly posts: readonly {
    readonly key: string;
    readonly title: string;
    readonly selection: "caucus-and-floor-vote" | "floor-vote";
  }[];
  readonly partyRatioRule: "proportional" | "majority-controls";
  readonly chairMayDeclineBill: boolean;
  readonly seniorityImportance: SeniorityImportance;
  readonly status: "researched" | "estimated-from-average";
  readonly citations: Readonly<Record<string, string>>;
}

const FEDERAL_CITATIONS = {
  assignment:
    "House majority/minority party committee-on-committees practice under Rule X; Senate Rule XXV and party-caucus nominations",
  chairs:
    "Rules of the House of Representatives, 119th Congress, Rule X; Rules of the Senate, 119th Congress, Rule XXV",
  posts:
    "Rules of the House of Representatives, 119th Congress, Rule I; Standing Rules of the Senate, Rule I",
  ratio:
    "House Rule X and Senate Rule XXV (committee composition and party representation)",
  hearing: "House Rule XI; Standing Rules of the Senate, Rule XXVI",
  seniority:
    "House Rule X; Senate party conference practice (no mandatory seniority rule)",
} as const;

const STATE_CITATIONS = {
  assignment:
    "NCSL, Legislative Committees: State legislature practice varies; this row estimates the common presiding-officer/party-caucus pattern",
  chairs:
    "NCSL, Legislative Committees: chair selection is chamber-specific; this row estimates majority-caucus selection",
  posts:
    "NCSL, State Legislative Leadership: common floor leadership offices, estimated for unread chambers",
  ratio:
    "NCSL, Legislative Committees: membership reflects party control; proportional assignment is an estimated gameplay profile",
  hearing:
    "NCSL, Legislative Committees: referral and hearing discretion vary; chair gatekeeping is an estimated gameplay profile",
  seniority:
    "NCSL, Legislative Committees: seniority practice varies; slight is the estimated starting importance",
} as const;

const TERRITORY_CITATIONS = {
  assignment:
    "Estimated from the nearest state legislative chamber form; territorial chamber rules not individually read",
  chairs:
    "Estimated from the nearest state legislative chamber form; territorial chamber rules not individually read",
  posts:
    "Estimated from the nearest state legislative chamber form; territorial chamber rules not individually read",
  ratio:
    "Estimated from the nearest state legislative chamber form; territorial chamber rules not individually read",
  hearing:
    "Estimated from the nearest state legislative chamber form; territorial chamber rules not individually read",
  seniority:
    "Estimated from the nearest state legislative chamber form; territorial chamber rules not individually read",
} as const;

const COUNCIL_CITATIONS = {
  assignment:
    "municipal-rule-registry referral authority where present; the registry does not establish member assignment, which is estimated from the recorded form of government",
  chairs:
    "municipal-rule-registry committee rules where present; chair selection is estimated from the recorded form of government",
  posts:
    "municipal-rule-registry presiding office where present; otherwise estimated from the recorded form of government",
  ratio:
    "Estimated from the recorded council form; party ratio is not stated by the municipal rule registry",
  hearing:
    "municipal-rule-registry procedure.committeeReferral when stated; otherwise estimated from the recorded form of government",
  seniority:
    "Estimated from the recorded council form; seniority custom is not stated by the municipal rule registry",
} as const;

/**
 * Leadership and committee procedure are stored as data, not selected from a
 * location branch in the simulation. Unread chambers receive a labeled
 * estimate; a reader can replace a row field-by-field when a controlling rule
 * is found. The published chamber rule packs supply the chamber keys.
 */
export function chamberLeadershipProfileFor(input: {
  readonly jurisdictionKey: string;
  readonly chamberKey: string;
  readonly form?: "state" | "territory" | "council" | "federal";
  readonly councilForm?:
    "council-manager" | "mayor-council" | "elected-president";
}): ChamberLeadershipProfile {
  const form =
    input.form ?? (input.jurisdictionKey === "US" ? "federal" : "state");
  if (form === "federal") {
    const senate = input.chamberKey === "senate";
    return {
      jurisdictionKey: input.jurisdictionKey,
      chamberKey: input.chamberKey,
      assignmentAuthority: senate ? "party-caucuses" : "committee-on-committees",
      chairSelectionAuthority: "majority-caucus",
      posts: [
        {
          key: senate ? "president-pro-tempore" : "speaker",
          title: senate ? "President pro tempore" : "Speaker",
          selection: "floor-vote",
        },
        {
          key: "majority-leader",
          title: "Majority leader",
          selection: "caucus-and-floor-vote",
        },
        {
          key: "minority-leader",
          title: "Minority leader",
          selection: "caucus-and-floor-vote",
        },
        {
          key: "majority-whip",
          title: "Majority whip",
          selection: "caucus-and-floor-vote",
        },
        {
          key: "minority-whip",
          title: "Minority whip",
          selection: "caucus-and-floor-vote",
        },
      ],
      partyRatioRule: "proportional",
      chairMayDeclineBill: true,
      seniorityImportance: "slight",
      status: "researched",
      citations: FEDERAL_CITATIONS,
    };
  }
  const council = form === "council";
  const electedPresident = input.councilForm === "elected-president";
  const presidingPost = council
    ? {
        key: electedPresident ? "council-president" : "presiding-officer",
        title: electedPresident ? "Council president" : "Presiding officer",
      }
    : input.chamberKey === "senate"
      ? { key: "president-pro-tempore", title: "President pro tempore" }
      : { key: "speaker", title: "Speaker" };
  const citations = council
    ? COUNCIL_CITATIONS
    : form === "territory"
      ? TERRITORY_CITATIONS
      : STATE_CITATIONS;
  const authority = council
    ? electedPresident
      ? "council-president"
      : "mayor-pro-tem"
    : "estimated-chamber-leadership";
  return {
    jurisdictionKey: input.jurisdictionKey,
    chamberKey: input.chamberKey,
      assignmentAuthority: council
        ? authority
        : input.chamberKey === "senate"
          ? "senate-president"
          : "speaker",
    chairSelectionAuthority: council
      ? "council-vote"
      : "estimated-majority-authority",
    posts: [
      {
        ...presidingPost,
        selection: "floor-vote",
      },
      {
        key: "majority-leader",
        title: "Majority leader",
        selection: "caucus-and-floor-vote",
      },
      {
        key: "minority-leader",
        title: "Minority leader",
        selection: "caucus-and-floor-vote",
      },
      {
        key: "majority-whip",
        title: "Majority whip",
        selection: "caucus-and-floor-vote",
      },
      {
        key: "minority-whip",
        title: "Minority whip",
        selection: "caucus-and-floor-vote",
      },
    ],
    partyRatioRule: "proportional",
    chairMayDeclineBill: true,
    seniorityImportance: "slight",
    status: "estimated-from-average",
    citations,
  };
}
