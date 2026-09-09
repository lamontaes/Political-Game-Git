/**
 * The reviewed transcriptions: which claim was checked against which words.
 *
 * A row of the research corpora says a thing about a state's law. This table
 * says where that thing is written, in an authority this repository retrieved
 * and hashed, and quotes the words that say it. The compiler refuses to emit a
 * record whose excerpt is not literally present in the enacted text cut from
 * those bytes, so a transcription that drifts from its source stops the build
 * rather than becoming data.
 *
 * This is the "reviewed transcription" half of the recovery path. Each entry is
 * a human-checkable claim of the form: *this provision, at this citation, says
 * this*. A reviewer reads the excerpt against the published provision and
 * agrees or does not. Nothing here decides what the law means, extends a
 * provision to an office it does not name, or repairs a citation — where the
 * research cites a provision that does not carry its claim, the claim is
 * refused and the refusal is reported, because choosing a better-fitting
 * section is legal research and this lane does not do legal research.
 *
 * Absent entries are the point as much as present ones. A research row with no
 * transcription here is not compiled, and
 * `docs/research/qualification-source-ledger.md` says why for every one.
 */

import type { OfficeFamily, QualificationField } from "./types";

/** One claim, and the words in a retrieved authority that establish it. */
export interface ReviewedTranscription {
  /** Which research batch the claim comes from. */
  readonly batch: "31C" | "31D";
  readonly stateUsps: string;
  readonly officeFamily: OfficeFamily;
  /** `OFFICE_EXISTENCE` is carried here as a field name; it compiles to an
   * `OfficeExistence` record rather than a claim, as it always has. */
  readonly field: QualificationField | "OFFICE_EXISTENCE";
  /** The retrieved authority whose enacted text was read. */
  readonly artifactId: string;
  /** The provision within it, by the citation that authority publishes. */
  readonly locator: string;
  /** Words that must be literally present in that provision's enacted text. */
  readonly excerpt: string;
}

/**
 * Compare two citations of the same provision.
 *
 * Citation style is not citation identity. The research writes
 * "Mo. Const. 1945, art. IV, § 1" where the Revisor publishes
 * "Mo. Const. art. IV, § 1", and "NRS 228.010 (amended 2021)" where the
 * Legislature publishes "NRS 228.010". A parenthetical aside and an adoption
 * year are formatting; the article and section number are the identity. Only
 * those two reductions are performed, and nothing else — no abbreviation
 * expansion, no section-number arithmetic, no nearest match.
 */
export function normalizeLocator(locator: string): string {
  return locator
    .replace(/\([^)]*\)/g, " ")
    .replace(/\b(?:1[6-9]|20)\d{2},\s*/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\.$/, "")
    .toLowerCase();
}

/**
 * Whether a research row's citation names the provision that was read.
 *
 * A compound citation ("art. VII, § 6; art. IV, § 6") names more than one
 * provision, and the claim is supported if the provision read is among them.
 */
export function locatorNames(
  researchLocator: string,
  provisionLocator: string,
): boolean {
  const wanted = normalizeLocator(provisionLocator);
  if (wanted === "") return false;
  const escaped = wanted.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?:^|;\\s*)${escaped}(?:\\s*;|$)`).test(
    normalizeLocator(researchLocator),
  );
}

export const QUALIFICATION_TRANSCRIPTIONS: readonly ReviewedTranscription[] = [
  {
    batch: "31C",
    stateUsps: "MN",
    officeFamily: "ATTORNEY_GENERAL",
    field: "MINIMUM_AGE",
    artifactId: "mn-constitution",
    locator: "Minn. Const. art. VII, § 6",
    excerpt:
      "is 21 years of age is eligible for any office elective by the people",
  },
  {
    batch: "31C",
    stateUsps: "MN",
    officeFamily: "GOVERNOR",
    field: "OFFICE_EXISTENCE",
    artifactId: "mn-constitution",
    locator: "Minn. Const. art. V, § 1",
    excerpt:
      "The executive department consists of a governor, lieutenant governor, secretary of state, auditor, and attorney general, who shall be chosen by the electors of the state.",
  },
  {
    batch: "31C",
    stateUsps: "MN",
    officeFamily: "LOWER_CHAMBER",
    field: "DISTRICT_RESIDENCE",
    artifactId: "mn-constitution",
    locator: "Minn. Const. art. IV, § 6",
    excerpt:
      "six months immediately preceding the election in the district from which elected",
  },
  {
    batch: "31C",
    stateUsps: "MN",
    officeFamily: "LOWER_CHAMBER",
    field: "MINIMUM_AGE",
    artifactId: "mn-constitution",
    locator: "Minn. Const. art. VII, § 6",
    excerpt:
      "is 21 years of age is eligible for any office elective by the people",
  },
  {
    batch: "31C",
    stateUsps: "MN",
    officeFamily: "LOWER_CHAMBER",
    field: "STATE_RESIDENCE",
    artifactId: "mn-constitution",
    locator: "Minn. Const. art. IV, § 6",
    excerpt: "shall have resided one year in the state",
  },
  {
    batch: "31C",
    stateUsps: "MN",
    officeFamily: "UPPER_CHAMBER",
    field: "TERM_LENGTH",
    artifactId: "mn-constitution",
    locator: "Minn. Const. art. IV, § 4",
    excerpt: "Senators shall be chosen for a term of four years",
  },
  {
    batch: "31C",
    stateUsps: "MO",
    officeFamily: "GOVERNOR",
    field: "MINIMUM_AGE",
    artifactId: "mo-constitution-art-4-sec-3",
    locator: "Mo. Const. art. IV, § 3",
    excerpt: "The governor shall be at least thirty years old",
  },
  {
    batch: "31C",
    stateUsps: "MO",
    officeFamily: "GOVERNOR",
    field: "OFFICE_EXISTENCE",
    artifactId: "mo-constitution-art-4-sec-1",
    locator: "Mo. Const. art. IV, § 1",
    excerpt: "The supreme executive power shall be vested in a governor.",
  },
  {
    batch: "31C",
    stateUsps: "MO",
    officeFamily: "GOVERNOR",
    field: "STATE_RESIDENCE",
    artifactId: "mo-constitution-art-4-sec-3",
    locator: "Mo. Const. art. IV, § 3",
    excerpt: "a resident of this state at least ten years next before election",
  },
  {
    batch: "31C",
    stateUsps: "MO",
    officeFamily: "GOVERNOR",
    field: "US_CITIZENSHIP",
    artifactId: "mo-constitution-art-4-sec-3",
    locator: "Mo. Const. art. IV, § 3",
    excerpt: "a citizen of the United States for at least fifteen years",
  },
  {
    batch: "31C",
    stateUsps: "MO",
    officeFamily: "GOVERNOR",
    field: "TERM_LIMIT",
    artifactId: "mo-constitution-art-4-sec-17",
    locator: "Mo. Const. art. IV, § 17",
    excerpt: "No person shall be elected governor or treasurer more than twice",
  },
  {
    batch: "31C",
    stateUsps: "MO",
    officeFamily: "LOWER_CHAMBER",
    field: "MINIMUM_AGE",
    artifactId: "mo-constitution-art-3-sec-4",
    locator: "Mo. Const. art. III, § 4",
    excerpt: "Each representative shall be twenty-four years of age",
  },
  {
    batch: "31C",
    stateUsps: "MO",
    officeFamily: "LOWER_CHAMBER",
    field: "TERM_LIMIT",
    artifactId: "mo-constitution-art-3-sec-8",
    locator: "Mo. Const. art. III, § 8",
    excerpt:
      "No one shall be elected to serve more than eight years total in any one house of the General Assembly nor more than sixteen years total in both houses of the General Assembly.",
  },
  {
    batch: "31C",
    stateUsps: "MO",
    officeFamily: "UPPER_CHAMBER",
    field: "MINIMUM_AGE",
    artifactId: "mo-constitution-art-3-sec-6",
    locator: "Mo. Const. art. III, § 6",
    excerpt: "Each senator shall be thirty years of age",
  },
  {
    batch: "31C",
    stateUsps: "NE",
    officeFamily: "GOVERNOR",
    field: "MINIMUM_AGE",
    artifactId: "ne-constitution-art-4-sec-2",
    locator: "Neb. Const. art. IV, § 2",
    excerpt: "who shall not have attained the age of thirty years",
  },
  {
    batch: "31C",
    stateUsps: "NE",
    officeFamily: "GOVERNOR",
    field: "OFFICE_EXISTENCE",
    artifactId: "ne-constitution-art-4-sec-1",
    locator: "Neb. Const. art. IV, § 1",
    excerpt:
      "The executive officers of the state shall be the Governor, Lieutenant Governor, Secretary of State, Auditor of Public Accounts, State Treasurer, Attorney General",
  },
  {
    batch: "31C",
    stateUsps: "NE",
    officeFamily: "GOVERNOR",
    field: "STATE_RESIDENCE",
    artifactId: "ne-constitution-art-4-sec-2",
    locator: "Neb. Const. art. IV, § 2",
    excerpt:
      "who shall not have been for five years next preceding his election a resident and citizen of this state",
  },
  {
    batch: "31C",
    stateUsps: "NE",
    officeFamily: "GOVERNOR",
    field: "TERM_LIMIT",
    artifactId: "ne-constitution-art-4-sec-1",
    locator: "Neb. Const. art. IV, § 1",
    excerpt:
      "The Governor shall be ineligible to the office of Governor for four years next after the expiration of two consecutive terms for which he or she was elected.",
  },
  {
    batch: "31C",
    stateUsps: "NE",
    officeFamily: "LIEUTENANT_GOVERNOR",
    field: "OFFICE_EXISTENCE",
    artifactId: "ne-constitution-art-4-sec-1",
    locator: "Neb. Const. art. IV, § 1",
    excerpt:
      "The executive officers of the state shall be the Governor, Lieutenant Governor",
  },
  {
    batch: "31C",
    stateUsps: "NE",
    officeFamily: "LOWER_CHAMBER",
    field: "OFFICE_EXISTENCE",
    artifactId: "ne-constitution-art-3-sec-1",
    locator: "Neb. Const. art. III, § 1",
    excerpt:
      "The legislative authority of the state shall be vested in a Legislature consisting of one chamber.",
  },
  {
    batch: "31C",
    stateUsps: "NE",
    officeFamily: "UPPER_CHAMBER",
    field: "OFFICE_EXISTENCE",
    artifactId: "ne-constitution-art-3-sec-1",
    locator: "Neb. Const. art. III, § 1",
    excerpt:
      "The legislative authority of the state shall be vested in a Legislature consisting of one chamber.",
  },
  {
    batch: "31C",
    stateUsps: "NE",
    officeFamily: "UNICAMERAL_CHAMBER",
    field: "OFFICE_EXISTENCE",
    artifactId: "ne-constitution-art-3-sec-1",
    locator: "Neb. Const. art. III, § 1",
    excerpt:
      "The legislative authority of the state shall be vested in a Legislature consisting of one chamber.",
  },
  {
    batch: "31C",
    stateUsps: "NE",
    officeFamily: "UNICAMERAL_CHAMBER",
    field: "DISTRICT_RESIDENCE",
    artifactId: "ne-constitution-art-3-sec-8",
    locator: "Neb. Const. art. III, § 8",
    excerpt:
      "has resided within the district from which he is elected for the term of one year next before his election",
  },
  {
    batch: "31C",
    stateUsps: "NE",
    officeFamily: "UNICAMERAL_CHAMBER",
    field: "MINIMUM_AGE",
    artifactId: "ne-constitution-art-3-sec-8",
    locator: "Neb. Const. art. III, § 8",
    excerpt: "has attained the age of twenty-one years",
  },
  {
    batch: "31C",
    stateUsps: "NE",
    officeFamily: "UNICAMERAL_CHAMBER",
    field: "SELECTION_MECHANISM",
    artifactId: "ne-constitution-art-3-sec-7",
    locator: "Neb. Const. art. III, § 7",
    excerpt:
      "Each member shall be nominated and elected in a nonpartisan manner and without any indication on the ballot that he or she is affiliated with or endorsed by any political party or organization.",
  },
  {
    batch: "31C",
    stateUsps: "NE",
    officeFamily: "UNICAMERAL_CHAMBER",
    field: "TERM_LENGTH",
    artifactId: "ne-constitution-art-3-sec-7",
    locator: "Neb. Const. art. III, § 7",
    excerpt: "thereafter all members shall be elected for a term of four years",
  },
  {
    batch: "31C",
    stateUsps: "NE",
    officeFamily: "UNICAMERAL_CHAMBER",
    field: "TERM_LIMIT",
    artifactId: "ne-constitution-art-3-sec-12",
    locator: "Neb. Const. art. III, § 12",
    excerpt:
      "No person shall be eligible to serve as a member of the Legislature for four years next after the expiration of two consecutive terms",
  },
  {
    batch: "31C",
    stateUsps: "NV",
    officeFamily: "ATTORNEY_GENERAL",
    field: "MINIMUM_AGE",
    artifactId: "nv-nrs-228",
    locator: "NRS 228.010",
    excerpt: "Has attained the age of 30 years at the time of such election",
  },
  {
    batch: "31C",
    stateUsps: "NV",
    officeFamily: "ATTORNEY_GENERAL",
    field: "PROFESSIONAL_QUALIFICATION",
    artifactId: "nv-nrs-228",
    locator: "NRS 228.010",
    excerpt: "Is a member of the State Bar of Nevada in good standing",
  },
  {
    batch: "31C",
    stateUsps: "NV",
    officeFamily: "ATTORNEY_GENERAL",
    field: "STATE_RESIDENCE",
    artifactId: "nv-nrs-228",
    locator: "NRS 228.010",
    excerpt:
      "has been a citizen resident of this State for 3 years next preceding the election",
  },
  {
    batch: "31C",
    stateUsps: "NV",
    officeFamily: "LOWER_CHAMBER",
    field: "MINIMUM_AGE",
    artifactId: "nv-nrs-218a",
    locator: "NRS 218A.200",
    excerpt: "has attained the age of 21 years",
  },
  {
    batch: "31C",
    stateUsps: "NV",
    officeFamily: "LOWER_CHAMBER",
    field: "STATE_RESIDENCE",
    artifactId: "nv-nrs-218a",
    locator: "NRS 218A.200",
    excerpt:
      "citizen resident of this State for 1 year next preceding the person",
  },
  {
    batch: "31D",
    stateUsps: "OH",
    officeFamily: "LOWER_CHAMBER",
    field: "OFFICE_EXISTENCE",
    artifactId: "oh-constitution-sec-2-1",
    locator: "Ohio Const. art. II, § 1",
    excerpt:
      "The legislative power of the state shall be vested in a general assembly consisting of a senate and house of representatives",
  },
  {
    batch: "31D",
    stateUsps: "OH",
    officeFamily: "UPPER_CHAMBER",
    field: "OFFICE_EXISTENCE",
    artifactId: "oh-constitution-sec-2-1",
    locator: "Ohio Const. art. II, § 1",
    excerpt:
      "The legislative power of the state shall be vested in a general assembly consisting of a senate and house of representatives",
  },
  {
    batch: "31D",
    stateUsps: "OH",
    officeFamily: "UNICAMERAL_CHAMBER",
    field: "OFFICE_EXISTENCE",
    artifactId: "oh-constitution-sec-2-1",
    locator: "Ohio Const. art. II, § 1",
    excerpt:
      "a general assembly consisting of a senate and house of representatives",
  },
  {
    batch: "31D",
    stateUsps: "OH",
    officeFamily: "LOWER_CHAMBER",
    field: "SELECTION_MECHANISM",
    artifactId: "oh-constitution-sec-2-2",
    locator: "Ohio Const. art. II, § 2",
    excerpt:
      "Representatives shall be elected biennially by the electors of the respective house of representatives districts",
  },
  {
    batch: "31D",
    stateUsps: "OH",
    officeFamily: "LOWER_CHAMBER",
    field: "TERM_LENGTH",
    artifactId: "oh-constitution-sec-2-2",
    locator: "Ohio Const. art. II, § 2",
    excerpt:
      "their term of office shall commence on the first day of January next thereafter and continue two years",
  },
  {
    batch: "31D",
    stateUsps: "OH",
    officeFamily: "LOWER_CHAMBER",
    field: "TERM_LIMIT",
    artifactId: "oh-constitution-sec-2-2",
    locator: "Ohio Const. art. II, § 2",
    excerpt:
      "No person shall hold the office of State Representative for a period longer than four successive terms of two years.",
  },
  {
    batch: "31D",
    stateUsps: "OH",
    officeFamily: "UPPER_CHAMBER",
    field: "SELECTION_MECHANISM",
    artifactId: "oh-constitution-sec-2-2",
    locator: "Ohio Const. art. II, § 2",
    excerpt:
      "Senators shall be elected by the electors of the respective senate districts",
  },
  {
    batch: "31D",
    stateUsps: "OH",
    officeFamily: "UPPER_CHAMBER",
    field: "TERM_LENGTH",
    artifactId: "oh-constitution-sec-2-2",
    locator: "Ohio Const. art. II, § 2",
    excerpt:
      "senators shall be elected to and hold office for terms of four years",
  },
  {
    batch: "31D",
    stateUsps: "OH",
    officeFamily: "UPPER_CHAMBER",
    field: "TERM_LIMIT",
    artifactId: "oh-constitution-sec-2-2",
    locator: "Ohio Const. art. II, § 2",
    excerpt:
      "No person shall hold the office of State Senator for a period of longer than two successive terms of four years.",
  },
  {
    batch: "31D",
    stateUsps: "OH",
    officeFamily: "LOWER_CHAMBER",
    field: "DISTRICT_RESIDENCE",
    artifactId: "oh-constitution-sec-2-3",
    locator: "Ohio Const. art. II, § 3",
    excerpt:
      "Senators and representatives shall have resided in their respective districts one year next preceding their election",
  },
  {
    batch: "31D",
    stateUsps: "OH",
    officeFamily: "UPPER_CHAMBER",
    field: "DISTRICT_RESIDENCE",
    artifactId: "oh-constitution-sec-2-3",
    locator: "Ohio Const. art. II, § 3",
    excerpt:
      "Senators and representatives shall have resided in their respective districts one year next preceding their election",
  },
  {
    batch: "31D",
    stateUsps: "OH",
    officeFamily: "GOVERNOR",
    field: "OFFICE_EXISTENCE",
    artifactId: "oh-constitution-sec-3-1",
    locator: "Ohio Const. art. III, § 1",
    excerpt:
      "The executive department shall consist of a governor, lieutenant governor, secretary of state, auditor of state, treasurer of state, and an attorney general",
  },
  {
    batch: "31D",
    stateUsps: "OH",
    officeFamily: "LIEUTENANT_GOVERNOR",
    field: "OFFICE_EXISTENCE",
    artifactId: "oh-constitution-sec-3-1",
    locator: "Ohio Const. art. III, § 1",
    excerpt:
      "The executive department shall consist of a governor, lieutenant governor",
  },
  {
    batch: "31D",
    stateUsps: "OH",
    officeFamily: "ATTORNEY_GENERAL",
    field: "OFFICE_EXISTENCE",
    artifactId: "oh-constitution-sec-3-1",
    locator: "Ohio Const. art. III, § 1",
    excerpt:
      "The executive department shall consist of a governor, lieutenant governor, secretary of state, auditor of state, treasurer of state, and an attorney general",
  },
  {
    batch: "31D",
    stateUsps: "OH",
    officeFamily: "SECRETARY_OF_STATE",
    field: "OFFICE_EXISTENCE",
    artifactId: "oh-constitution-sec-3-1",
    locator: "Ohio Const. art. III, § 1",
    excerpt:
      "The executive department shall consist of a governor, lieutenant governor, secretary of state",
  },
  {
    batch: "31D",
    stateUsps: "OH",
    officeFamily: "ATTORNEY_GENERAL",
    field: "SELECTION_MECHANISM",
    artifactId: "oh-constitution-sec-3-1",
    locator: "Ohio Const. art. III, § 1",
    excerpt:
      "who shall be elected on the first Tuesday after the first Monday in November, by the electors of the state",
  },
  {
    batch: "31D",
    stateUsps: "OH",
    officeFamily: "SECRETARY_OF_STATE",
    field: "SELECTION_MECHANISM",
    artifactId: "oh-constitution-sec-3-1",
    locator: "Ohio Const. art. III, § 1",
    excerpt:
      "who shall be elected on the first Tuesday after the first Monday in November, by the electors of the state",
  },
  {
    batch: "31D",
    stateUsps: "OH",
    officeFamily: "GOVERNOR",
    field: "TERM_LENGTH",
    artifactId: "oh-constitution-sec-3-2",
    locator: "Ohio Const. art. III, § 2",
    excerpt:
      "The governor, lieutenant governor, secretary of state, treasurer of state, and attorney general shall hold their offices for four years",
  },
  {
    batch: "31D",
    stateUsps: "OH",
    officeFamily: "LIEUTENANT_GOVERNOR",
    field: "TERM_LENGTH",
    artifactId: "oh-constitution-sec-3-2",
    locator: "Ohio Const. art. III, § 2",
    excerpt:
      "The governor, lieutenant governor, secretary of state, treasurer of state, and attorney general shall hold their offices for four years",
  },
  {
    batch: "31D",
    stateUsps: "OH",
    officeFamily: "ATTORNEY_GENERAL",
    field: "TERM_LENGTH",
    artifactId: "oh-constitution-sec-3-2",
    locator: "Ohio Const. art. III, § 2",
    excerpt:
      "The governor, lieutenant governor, secretary of state, treasurer of state, and attorney general shall hold their offices for four years",
  },
  {
    batch: "31D",
    stateUsps: "OH",
    officeFamily: "SECRETARY_OF_STATE",
    field: "TERM_LENGTH",
    artifactId: "oh-constitution-sec-3-2",
    locator: "Ohio Const. art. III, § 2",
    excerpt:
      "The governor, lieutenant governor, secretary of state, treasurer of state, and attorney general shall hold their offices for four years",
  },
  {
    batch: "31D",
    stateUsps: "OH",
    officeFamily: "GOVERNOR",
    field: "TERM_LIMIT",
    artifactId: "oh-constitution-sec-3-2",
    locator: "Ohio Const. art. III, § 2",
    excerpt:
      "No person shall hold the office of governor for a period longer than two successive terms of four years.",
  },
  {
    batch: "31D",
    stateUsps: "OH",
    officeFamily: "LIEUTENANT_GOVERNOR",
    field: "TERM_LIMIT",
    artifactId: "oh-constitution-sec-3-2",
    locator: "Ohio Const. art. III, § 2",
    excerpt:
      "No person shall hold any one of the offices of lieutenant governor, secretary of state, treasurer of state, attorney general, or auditor of state for a period longer than two successive terms of four years.",
  },
  {
    batch: "31D",
    stateUsps: "OH",
    officeFamily: "ATTORNEY_GENERAL",
    field: "TERM_LIMIT",
    artifactId: "oh-constitution-sec-3-2",
    locator: "Ohio Const. art. III, § 2",
    excerpt:
      "No person shall hold any one of the offices of lieutenant governor, secretary of state, treasurer of state, attorney general, or auditor of state for a period longer than two successive terms of four years.",
  },
  {
    batch: "31D",
    stateUsps: "OH",
    officeFamily: "SECRETARY_OF_STATE",
    field: "TERM_LIMIT",
    artifactId: "oh-constitution-sec-3-2",
    locator: "Ohio Const. art. III, § 2",
    excerpt:
      "No person shall hold any one of the offices of lieutenant governor, secretary of state, treasurer of state, attorney general, or auditor of state for a period longer than two successive terms of four years.",
  },
  {
    batch: "31D",
    stateUsps: "OH",
    officeFamily: "GOVERNOR",
    field: "ELECTOR_REQUIREMENT",
    artifactId: "oh-constitution-sec-15-4",
    locator: "Ohio Const. art. XV, § 4",
    excerpt:
      "No person shall be elected or appointed to any office in this state unless possessed of the qualifications of an elector.",
  },
  {
    batch: "31D",
    stateUsps: "OH",
    officeFamily: "LIEUTENANT_GOVERNOR",
    field: "ELECTOR_REQUIREMENT",
    artifactId: "oh-constitution-sec-15-4",
    locator: "Ohio Const. art. XV, § 4",
    excerpt:
      "No person shall be elected or appointed to any office in this state unless possessed of the qualifications of an elector.",
  },
  {
    batch: "31D",
    stateUsps: "OH",
    officeFamily: "ATTORNEY_GENERAL",
    field: "ELECTOR_REQUIREMENT",
    artifactId: "oh-constitution-sec-15-4",
    locator: "Ohio Const. art. XV, § 4",
    excerpt:
      "No person shall be elected or appointed to any office in this state unless possessed of the qualifications of an elector.",
  },
  {
    batch: "31D",
    stateUsps: "OH",
    officeFamily: "SECRETARY_OF_STATE",
    field: "ELECTOR_REQUIREMENT",
    artifactId: "oh-constitution-sec-15-4",
    locator: "Ohio Const. art. XV, § 4",
    excerpt:
      "No person shall be elected or appointed to any office in this state unless possessed of the qualifications of an elector.",
  },
  {
    batch: "31D",
    stateUsps: "OH",
    officeFamily: "LOWER_CHAMBER",
    field: "ELECTOR_REQUIREMENT",
    artifactId: "oh-constitution-sec-15-4",
    locator: "Ohio Const. art. XV, § 4",
    excerpt:
      "No person shall be elected or appointed to any office in this state unless possessed of the qualifications of an elector.",
  },
  {
    batch: "31D",
    stateUsps: "OH",
    officeFamily: "UPPER_CHAMBER",
    field: "ELECTOR_REQUIREMENT",
    artifactId: "oh-constitution-sec-15-4",
    locator: "Ohio Const. art. XV, § 4",
    excerpt:
      "No person shall be elected or appointed to any office in this state unless possessed of the qualifications of an elector.",
  },
];

/** The transcription for one claim, or nothing. */
export function transcriptionFor(
  batch: "31C" | "31D",
  stateUsps: string,
  officeFamily: OfficeFamily,
  field: QualificationField | "OFFICE_EXISTENCE",
): ReviewedTranscription | undefined {
  return QUALIFICATION_TRANSCRIPTIONS.find(
    (entry) =>
      entry.batch === batch &&
      entry.stateUsps === stateUsps &&
      entry.officeFamily === officeFamily &&
      entry.field === field,
  );
}

/**
 * Claims whose cited authority was retrieved and does not carry them.
 *
 * These are findings, not omissions, and they are the reason the verification
 * step earns its cost. Each names a claim the research states, an authority
 * this domain fetched and hashed, and the fact that the claim's substance is
 * not in it. Two shapes recur: a citation that points at a provision this
 * domain read and which turns out to be about something else, and a citation
 * that names a provision this domain did not retrieve at all while a *different*
 * retrieved provision carries the fact.
 *
 * Neither is repaired here. Re-citing a claim to the provision that would
 * support it is legal research, and this lane does not do legal research; it
 * reports the discrepancy and leaves the claim uncompiled so that somebody with
 * the authority to correct the citation can.
 *
 * `absentTerm`, where given, is checked: the compiler refuses to publish a
 * finding of "this provision does not say X" unless X really is missing from
 * the enacted text it holds. A negative claim gets the same treatment as a
 * positive one.
 */
export interface UnsupportedClaimFinding {
  readonly batch: "31C" | "31D";
  readonly stateUsps: string;
  readonly officeFamily: OfficeFamily;
  readonly field: QualificationField | "OFFICE_EXISTENCE";
  /** The authority this domain retrieved while examining the claim. */
  readonly artifactId: string;
  /** The provision of it that was read. */
  readonly locator: string;
  /** A word that must NOT appear in that provision, where the finding is that. */
  readonly absentTerm?: string;
  readonly finding: string;
}

export const QUALIFICATION_UNSUPPORTED: readonly UnsupportedClaimFinding[] = [
  {
    batch: "31C",
    stateUsps: "MN",
    officeFamily: "GOVERNOR",
    field: "MINIMUM_AGE",
    artifactId: "mn-constitution",
    locator: "Minn. Const. art. V, § 2",
    finding:
      "The research cites Minn. Const. art. V, § 5. The age of 25 is stated by art. V, § 2, which this domain retrieved; § 5 governs succession. The claim is sound and its citation is not, and correcting a citation is legal research.",
  },
  {
    batch: "31C",
    stateUsps: "MN",
    officeFamily: "GOVERNOR",
    field: "STATE_RESIDENCE",
    artifactId: "mn-constitution",
    locator: "Minn. Const. art. V, § 2",
    finding:
      "The research cites Minn. Const. art. V, § 5 for a one-year residence. The requirement is stated by art. V, § 2, which this domain retrieved. Same discrepancy as the minimum age.",
  },
  {
    batch: "31C",
    stateUsps: "MO",
    officeFamily: "LOWER_CHAMBER",
    field: "OFFICE_EXISTENCE",
    artifactId: "mo-constitution-art-3-sec-2",
    locator: "Mo. Const. art. III, § 2",
    absentTerm: "house of representatives shall be composed",
    finding:
      "The research cites Mo. Const. art. III, § 2 to establish the House. The provision published at that citation governs lobbying and campaign contribution limits and does not establish a chamber; it was amended in 2018 and no longer carries what the research read.",
  },
  {
    batch: "31C",
    stateUsps: "MO",
    officeFamily: "ATTORNEY_GENERAL",
    field: "PROFESSIONAL_QUALIFICATION",
    artifactId: "mo-statutes-27-010",
    locator: "RSMo 27.010",
    absentTerm: "licensed",
    finding:
      "The research cites RSMo 27.010 and 484.150 for admission to the Missouri bar. Section 27.010 was retrieved and states the Attorney General's election, term, salary and a bar on private practice — not a licensing requirement. Section 484.150 was not retrieved.",
  },
  {
    batch: "31D",
    stateUsps: "OH",
    officeFamily: "GOVERNOR",
    field: "SELECTION_MECHANISM",
    artifactId: "oh-constitution-sec-3-1b",
    locator: "Ohio Const. art. III, § 1b",
    absentTerm: "joint",
    finding:
      "The research cites Ohio Const. art. III, § 1b for election on a joint ticket. The provision retrieved at that citation assigns the lieutenant governor duties and says nothing about how either office is elected.",
  },
  {
    batch: "31D",
    stateUsps: "OH",
    officeFamily: "LIEUTENANT_GOVERNOR",
    field: "SELECTION_MECHANISM",
    artifactId: "oh-constitution-sec-3-1b",
    locator: "Ohio Const. art. III, § 1b",
    absentTerm: "joint",
    finding:
      "Same as the governor's: art. III, § 1b assigns duties and does not establish a joint ticket.",
  },
  {
    batch: "31D",
    stateUsps: "OH",
    officeFamily: "ATTORNEY_GENERAL",
    field: "PROFESSIONAL_QUALIFICATION",
    artifactId: "oh-revised-code-109-02",
    locator: "R.C. 109.02",
    absentTerm: "admitted",
    finding:
      "The research cites R.C. 109.02 for a bar-admission requirement. The section retrieved states that the attorney general is the state's chief law officer and describes the office's duties; it imposes no admission requirement.",
  },
];

/** The finding for one claim whose authority was read, or nothing. */
export function unsupportedFindingFor(
  batch: "31C" | "31D",
  stateUsps: string,
  officeFamily: OfficeFamily,
  field: QualificationField | "OFFICE_EXISTENCE",
): UnsupportedClaimFinding | undefined {
  return QUALIFICATION_UNSUPPORTED.find(
    (entry) =>
      entry.batch === batch &&
      entry.stateUsps === stateUsps &&
      entry.officeFamily === officeFamily &&
      entry.field === field,
  );
}
