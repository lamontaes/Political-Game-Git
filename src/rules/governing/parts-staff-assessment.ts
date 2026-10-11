// STOPGAP RULES3-GOV-057: inherited policy expressions; preserve pending independent finishing.
// Pure expression kernels from src/simulation/governing/staff-evidence.ts :: staffAssessment.
// Caller supplies selected facts; preserve the legacy evaluation order and guards.
// Source anchors and input contracts: docs/plans/rules3/governing-kernels.json.

/** Legacy line 101: row.source === "canonical" && row.state.status === "completed" */
export function staffAssessmentRule1(facts: {
  readonly rowSource: string;
  readonly rowStateStatus: string;
}) {
  return (
    facts.rowSource === "canonical" && facts.rowStateStatus === "completed"
  );
}

/** Legacy line 103: posts.length === 0 */
export function staffAssessmentRule2(facts: { readonly postsLength: number }) {
  return facts.postsLength === 0;
}

/** Legacy line 107: person ? personName(person) : "this person" */
export function staffAssessmentRule3(facts: {
  readonly person: unknown;
  readonly personNamePerson: string;
}) {
  return facts.person ? facts.personNamePerson : "this person";
}

/** Legacy line 113: -1 */
export function staffAssessmentRule4() {
  return -1;
}

/** Legacy line 115: post.classification === "sector:government" */
export function staffAssessmentRule5(facts: {
  readonly postClassification: string | null;
}) {
  return facts.postClassification! === "sector:government";
}

/** Legacy line 116: total + post.years */
export function staffAssessmentRule6(facts: {
  readonly total: number;
  readonly postYears: number;
}) {
  return facts.total + facts.postYears;
}

/** Legacy line 118: post.occupation === "profession:legislative-staff" */
export function staffAssessmentRule7(facts: {
  readonly postOccupation: string | null;
}) {
  return facts.postOccupation! === "profession:legislative-staff";
}

/** Legacy line 121: post.occupation === "profession:public-budget-analysis" */
export function staffAssessmentRule8(facts: {
  readonly postOccupation: string | null;
}) {
  return facts.postOccupation! === "profession:public-budget-analysis";
}

/** Legacy line 124: post.occupation === "profession:campaign-management" */
export function staffAssessmentRule9(facts: {
  readonly postOccupation: string | null;
}) {
  return facts.postOccupation! === "profession:campaign-management";
}

/** Legacy line 126: latest.endedAt     ? yearsBetween(latest.endedAt, world.currentDate)     : 0 */
export function staffAssessmentRule10(facts: {
  readonly latestEndedAt: string | null;
  readonly yearsBetweenLatestEndedAtWorldCurrentDate: number;
}) {
  return facts.latestEndedAt!
    ? facts.yearsBetweenLatestEndedAtWorldCurrentDate
    : 0;
}

/** Legacy line 130: posts.length > 1       ? `, after ${posts.length - 1} earlier post${posts.length > 2 ? "s" : ""} there`       : "" */
export function staffAssessmentRule11(facts: { readonly postsLength: number }) {
  return facts.postsLength > 1
    ? `, after ${facts.postsLength - 1} earlier post${facts.postsLength > 2 ? "s" : ""} there`
    : "";
}

/** Legacy line 133: degrees.length > 0 ? ", with a completed degree" : "" */
export function staffAssessmentRule12(facts: {
  readonly degreesLength: number;
}) {
  return facts.degreesLength > 0 ? ", with a completed degree" : "";
}

/** Legacy line 134: budget     ? "reads a budget quickly, and the record shows years of doing it"     : legislative       ? "has worked inside the legislature and knows its staff"       : campaign         ? "has run a campaign organization under pressure"         : publ */
export function staffAssessmentRule13(facts: {
  readonly budget: boolean;
  readonly legislative: boolean;
  readonly campaign: boolean;
  readonly publicYears: number;
}) {
  return facts.budget
    ? "reads a budget quickly, and the record shows years of doing it"
    : facts.legislative
      ? "has worked inside the legislature and knows its staff"
      : facts.campaign
        ? "has run a campaign organization under pressure"
        : facts.publicYears > 0
          ? "has spent years inside government offices"
          : "brings experience from outside government";
}

/** Legacy line 143: !legislative     ? "has never worked in the legislature, by the record"     : publicYears === 0       ? "has no recorded time inside an executive agency"       : awayYears >= 2         ? `has been out of public office work for ${yearWord(awayYears)}` */
export function staffAssessmentRule14(facts: {
  readonly legislative: boolean;
  readonly publicYears: number;
  readonly awayYears: number;
  readonly yearWordAwayYears: string;
}) {
  return !facts.legislative
    ? "has never worked in the legislature, by the record"
    : facts.publicYears === 0
      ? "has no recorded time inside an executive agency"
      : facts.awayYears >= 2
        ? `has been out of public office work for ${facts.yearWordAwayYears}`
        : "has always worked in one institution, and knows little of the others";
}

/** Legacy line 155: Math.max(       1,       Math.min(4, 1 + Math.floor((publicYears + latest.years) / 6)),     ) */
export function staffAssessmentRule15(facts: {
  readonly publicYears: number;
  readonly latestYears: number;
}) {
  return Math.max(
    1,
    Math.min(4, 1 + Math.floor((facts.publicYears + facts.latestYears) / 6)),
  );
}
