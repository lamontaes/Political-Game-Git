/**
 * What this domain claims, the sentence it read to claim it, and the shape of
 * the reading.
 *
 * Every fact here is a transcription. A declaration names a value, the
 * authority it came from, and the excerpt it was read out of — and the compiler
 * refuses to emit the value unless that excerpt is literally present in the
 * bytes the artifact lock pins. A declaration whose page has changed under it
 * does not quietly become a slightly wrong fact; it fails the build.
 *
 * Finding the sentence is not enough, though, and that is what the `proof`
 * field is for. An independent adversarial pass showed what a
 * find-the-value-in-the-sentence check admits: California's Senate section says
 * "a membership of 40 Senators elected for 4-year terms, 20 to begin every 2
 * years", and a claim of twenty seats passed on the staggered-cohort number
 * sitting in the same sentence. Minnesota's "Senators shall be chosen by single
 * districts" passed as proof that Minnesota senators are elected, when it is a
 * districting rule. Both are real quotations attached to propositions nobody
 * read.
 *
 * So each fact declares which closed proof it rests on. A seat count is proved
 * by a membership proposition whose subject is this chamber and whose number is
 * read out of the sentence and compared — never searched for. An elected claim
 * is proved by a clause naming who is elected, with an electorate doing the
 * electing; districts are not an electorate. A DERIVED fact names a closed
 * derivation kind and every premise it needs, so Illinois' 118 requires both
 * the district count and the one-member-per-district rule, and loses the fact
 * if either goes.
 *
 * An UNKNOWN declares a basis too. "The provision I read does not fix this" is
 * a much stronger statement than a blank and is only stronger if it cites the
 * provision and that provision actually has the shape claimed for it — a
 * delegation, a range, a composition by district. "Nobody retrieved the
 * authority" cites nothing, and must say that rather than dressing itself as a
 * claim about what the law is silent on.
 *
 * The thirty-five states with no declaration below have no legislature facts
 * here at all, only gaps saying what stopped the retrieval. That is the whole
 * design: a state this substrate could not read is visibly a state it could not
 * read, never a state that looks like the others because a template filled it
 * in.
 */

import type { LegislatureStructure, UnresolvedGap } from "./types";

/** One provision, and the words this repository actually read in it. */
export interface Transcription {
  /** The citation in the authority's own convention. */
  readonly citation: string;
  /** The instrument's full title. Must equal the locked source's own title. */
  readonly authorityTitle: string;
  /** The locked artifact the excerpt must be found in. */
  readonly artifactId: string;
  /** Where inside the instrument, in the publisher's own numbering. */
  readonly pageOrSection: string;
  /** Verbatim. The compiler searches the artifact for exactly this. */
  readonly excerpt: string;
}

/**
 * How a DIRECT fact's provision is read to say what is claimed.
 *
 * Closed, and discriminated, because the alternative is a growing pile of
 * regular expressions each of which admits one more thing nobody intended.
 */
export type DirectProof =
  /** The instrument vests legislative power in a body of this name. */
  | { readonly kind: "instrument-vests-legislature-named" }
  /** The provision names this chamber while composing the legislature. */
  | { readonly kind: "instrument-names-chamber" }
  /** The provision composes the legislature of these two named chambers. */
  | {
      readonly kind: "legislature-composed-of-chambers";
      readonly chamberTerms: readonly [string, string];
    }
  /** The provision composes the legislature of exactly one chamber. */
  | { readonly kind: "legislature-single-chamber" }
  /**
   * The provision states this chamber's membership.
   *
   * `chamberSubject` must be the chamber's own established name. The number is
   * read out of the membership clause that follows that subject and compared
   * with the claim; a number elsewhere in the sentence proves nothing.
   */
  | {
      readonly kind: "chamber-membership-count";
      readonly chamberSubject: string;
    }
  /**
   * The provision states that these members reach their seats by election.
   *
   * `clause` is the verbatim span of the excerpt carrying the proposition, and
   * `subject` the words inside it naming who is elected. `subjectScope` says
   * whether the subject is this chamber's members or the whole legislature's —
   * Alaska proves both chambers from one sentence about "Legislators", and that
   * has to be declared rather than assumed.
   */
  | {
      readonly kind: "chamber-members-elected";
      readonly subject: string;
      readonly clause: string;
      readonly subjectScope: "this-chamber" | "whole-legislature";
    };

/**
 * How a DERIVED fact's premises combine.
 *
 * Every kind validates each premise it needs. There is no kind that accepts a
 * transcription because the answer happens to appear in it.
 */
export type DerivationKind =
  /**
   * Seats equal districts, one member to each.
   *
   * Needs both premises: a provision fixing the number of districts, and a
   * provision electing one member from each. Illinois' House is 118 because
   * article IV fixes 118 Representative Districts and elects one Representative
   * from each; drop either and the count is not in the constitution.
   */
  | {
      readonly kind: "seats-equal-one-member-per-district";
      /** The districts counted, e.g. `Representative Districts`. */
      readonly districtSubject: string;
      /** The verbatim clause electing one member from each of them. */
      readonly perDistrictClause: string;
    }
  /**
   * Members are elected because the provision has the electors choose them.
   *
   * Delaware and Idaho say "chosen, by the qualified electors" rather than
   * "elected", which is election without the word.
   */
  | {
      readonly kind: "election-by-district-electors";
      readonly subject: string;
      readonly clause: string;
    }
  /**
   * Two chambers, because two provisions each compose one of them.
   *
   * Virginia composes a Senate in one section and a House of Delegates in the
   * next, and neither sentence alone says the legislature has two chambers.
   */
  | {
      readonly kind: "two-chambers-composed-separately";
      readonly chamberTerms: readonly [string, string];
    };

/** A declared fact: a value, its reasoning, the proof shape, and the provisions. */
export interface DeclaredFact<T> {
  readonly value: T;
  readonly derivation: "DIRECT" | "DERIVED";
  /** How the provisions combine. Mandatory for DERIVED, forbidden for DIRECT. */
  readonly derivationChain: string | null;
  /** The reading. Present for DIRECT, absent for DERIVED. */
  readonly proof: DirectProof | null;
  /** The closed derivation. Present for DERIVED, absent for DIRECT. */
  readonly derivationKind: DerivationKind | null;
  readonly transcriptions: readonly [Transcription, ...Transcription[]];
}

/**
 * What an investigated provision has to look like to support a given gap.
 *
 * The point is relevance. An UNKNOWN seat count backed by a provision that
 * delegates the number to statute is evidence; the same UNKNOWN backed by a
 * true, verbatim, entirely unrelated sentence from the same constitution is
 * not, and before this existed it validated.
 */
export type InvestigatedRelevance =
  /** The provision hands the matter to another instrument or provision. */
  | "delegates-to-other-provision"
  /** The provision fixes only a floor, a ceiling or a range. */
  | "states-limit-only"
  /** The provision composes the chamber by district and states no number. */
  | "composes-by-district-without-number"
  /** Several provisions state the matter differently and none was resolved. */
  | "competing-provisions-unresolved";

/**
 * Why nobody established this fact.
 *
 * `authority-not-retrieved` cites nothing because there is nothing to cite. It
 * is a fact about a retrieval. `provision-read-does-not-fix-it` is a claim
 * about a provision, so it has to produce the provision and the provision has
 * to have the shape the claim needs.
 */
export type UnknownBasis =
  | { readonly kind: "authority-not-retrieved" }
  | {
      readonly kind: "provision-read-does-not-fix-it";
      readonly relevance: InvestigatedRelevance;
    };

export interface DeclaredUnknown {
  readonly unknownReason: string;
  readonly basis: UnknownBasis;
  readonly investigated?: readonly Transcription[];
}

export type Declared<T> = DeclaredFact<T> | DeclaredUnknown;

/** True for a declaration that carries a value. */
export function isDeclaredFact<T>(
  declared: Declared<T>,
): declared is DeclaredFact<T> {
  return "value" in declared;
}

export interface ChamberDeclaration {
  readonly chamberKey: string;
  /**
   * How this chamber's members are named in its own instrument.
   *
   * Proof vocabulary, not a compiled fact: it is what lets "One Senator shall
   * be elected from each Legislative District" bind to the Senate rather than
   * to whichever chamber quoted it. Declared rather than guessed, and checked
   * to be disjoint from the other chamber's, so a record cannot prove its House
   * elected out of a sentence about Senators.
   */
  readonly memberNouns: readonly string[];
  readonly name: Declared<string>;
  readonly seatCount: Declared<number>;
  readonly membersElected: Declared<boolean>;
}

export interface StateDeclaration {
  readonly stateUsps: string;
  readonly stateName: string;
  /** `US-XX`. Checked against every cited artifact's own locked jurisdiction. */
  readonly jurisdictionKey: string;
  /**
   * Terms naming the legislature's members as a whole.
   *
   * Only used by a `whole-legislature` election proof, and only sound where the
   * structure is established: "Legislators shall be elected" covers both Alaskan
   * chambers because Alaska's legislature is those two chambers.
   */
  readonly legislatureMemberNouns: readonly string[];
  readonly legislatureName: Declared<string>;
  readonly structure: Declared<LegislatureStructure>;
  readonly chambers: readonly ChamberDeclaration[];
  readonly unresolvedGaps: readonly UnresolvedGap[];
}

/** The as-of date this corpus is evaluated against. An input, never a clock. */
export const STATE_LEGISLATURES_CORPUS_AS_OF = "2026-09-06";

/** An UNKNOWN that is about a retrieval, and therefore cites nothing. */
const notRetrieved = (unknownReason: string): DeclaredUnknown => ({
  unknownReason,
  basis: { kind: "authority-not-retrieved" },
});

/** An UNKNOWN about a provision that was read and does not fix the value. */
const readButNotFixed = (
  unknownReason: string,
  relevance: InvestigatedRelevance,
  ...investigated: readonly [Transcription, ...Transcription[]]
): DeclaredUnknown => ({
  unknownReason,
  basis: { kind: "provision-read-does-not-fix-it", relevance },
  investigated,
});

function direct<T>(
  value: T,
  proof: DirectProof,
  ...transcriptions: readonly [Transcription, ...Transcription[]]
): DeclaredFact<T> {
  return {
    value,
    derivation: "DIRECT",
    derivationChain: null,
    proof,
    derivationKind: null,
    transcriptions,
  };
}

function derived<T>(
  value: T,
  derivationChain: string,
  derivationKind: DerivationKind,
  ...transcriptions: readonly [Transcription, ...Transcription[]]
): DeclaredFact<T> {
  return {
    value,
    derivation: "DERIVED",
    derivationChain,
    proof: null,
    derivationKind,
    transcriptions,
  };
}

/** The legislature is vested in a body of the claimed name. */
const NAMES_LEGISLATURE: DirectProof = {
  kind: "instrument-vests-legislature-named",
};

/** The provision names this chamber. */
const NAMES_CHAMBER: DirectProof = { kind: "instrument-names-chamber" };

/** The provision composes the legislature of these two chambers. */
const twoChambers = (first: string, second: string): DirectProof => ({
  kind: "legislature-composed-of-chambers",
  chamberTerms: [first, second],
});

/** The provision composes the legislature of one chamber. */
const ONE_CHAMBER: DirectProof = { kind: "legislature-single-chamber" };

/** The provision states this chamber's membership. */
const seatsOf = (chamberSubject: string): DirectProof => ({
  kind: "chamber-membership-count",
  chamberSubject,
});

/** This chamber's members are elected, by this clause. */
const electedBy = (subject: string, clause: string): DirectProof => ({
  kind: "chamber-members-elected",
  subject,
  clause,
  subjectScope: "this-chamber",
});

/** Every legislator is elected, by this clause, so this chamber's are. */
const allLegislatorsElectedBy = (
  subject: string,
  clause: string,
): DirectProof => ({
  kind: "chamber-members-elected",
  subject,
  clause,
  subjectScope: "whole-legislature",
});

const AK_TITLE = "The Constitution of the State of Alaska";
const AK_ART2_SEC1: Transcription = {
  citation: "Alaska Const. art. II, § 1",
  authorityTitle: AK_TITLE,
  artifactId: "ak-constitution",
  pageOrSection: "Article II, Section 1 — Legislative Power; Membership",
  excerpt:
    "The legislative power of the State is vested in a legislature consisting of a senate with a membership of twenty and a house of representatives with a membership of forty.",
};
const AK_ART2_SEC3: Transcription = {
  citation: "Alaska Const. art. II, § 3",
  authorityTitle: AK_TITLE,
  artifactId: "ak-constitution",
  pageOrSection: "Article II, Section 3 — Election and Terms",
  excerpt: "Legislators shall be elected at general elections.",
};

// ---------------------------------------------------------------------------
// California
// ---------------------------------------------------------------------------

const CA_TITLE = "Constitution of the State of California, Article IV";
const CA_ART4_SEC1: Transcription = {
  citation: "Cal. Const. art. IV, § 1",
  authorityTitle: CA_TITLE,
  artifactId: "ca-constitution-article-4",
  pageOrSection: "Article IV, Section 1",
  excerpt:
    "The legislative power of this State is vested in the California Legislature which consists of the Senate and Assembly, but the people reserve to themselves the powers of initiative and referendum.",
};
const CA_ART4_SEC2_SENATE: Transcription = {
  citation: "Cal. Const. art. IV, § 2(a)(1)",
  authorityTitle: CA_TITLE,
  artifactId: "ca-constitution-article-4",
  pageOrSection: "Article IV, Section 2(a)(1)",
  excerpt:
    "The Senate has a membership of 40 Senators elected for 4-year terms, 20 to begin every 2 years.",
};
const CA_ART4_SEC2_ASSEMBLY: Transcription = {
  citation: "Cal. Const. art. IV, § 2(a)(2)",
  authorityTitle: CA_TITLE,
  artifactId: "ca-constitution-article-4",
  pageOrSection: "Article IV, Section 2(a)(2)",
  excerpt:
    "The Assembly has a membership of 80 members elected for 2-year terms.",
};

// ---------------------------------------------------------------------------
// Delaware
// ---------------------------------------------------------------------------

const DE_TITLE = "Constitution of the State of Delaware, Article II";
const DE_ART2_SEC1: Transcription = {
  citation: "Del. Const. art. II, § 1",
  authorityTitle: DE_TITLE,
  artifactId: "de-constitution-article-2",
  pageOrSection:
    "Article II, § 1 — Legislative power vested in General Assembly",
  excerpt:
    "The legislative power of this State shall be vested in a General Assembly, which shall consist of a Senate and House of Representatives.",
};
const DE_ART2_SEC2_HOUSE: Transcription = {
  citation: "Del. Const. art. II, § 2",
  authorityTitle: DE_TITLE,
  artifactId: "de-constitution-article-2",
  pageOrSection: "Article II, § 2 — Composition of House of Representatives",
  excerpt:
    "The House of Representatives shall be composed of 35 members, plus such additional members as shall be provided under Section 2A of this Article, who shall be chosen for 2 years.",
};
const DE_ART2_SEC2_SENATE: Transcription = {
  citation: "Del. Const. art. II, § 2",
  authorityTitle: DE_TITLE,
  artifactId: "de-constitution-article-2",
  pageOrSection: "Article II, § 2 — Composition of Senate",
  excerpt:
    "The Senate shall be composed of 21 members, who shall be chosen for 4 years.",
};
const DE_ART2_ELECTORS_REP: Transcription = {
  citation: "Del. Const. art. II, § 2A",
  authorityTitle: DE_TITLE,
  artifactId: "de-constitution-article-2",
  pageOrSection: "Article II — Representative Districts",
  excerpt:
    "From each Representative District there shall be chosen, by the qualified electors thereof, 1 Representative.",
};
const DE_ART2_ELECTORS_SEN: Transcription = {
  citation: "Del. Const. art. II, § 2A",
  authorityTitle: DE_TITLE,
  artifactId: "de-constitution-article-2",
  pageOrSection: "Article II — Senatorial Districts",
  excerpt:
    "This State is also hereby divided into 21 Senatorial Districts, from each of which shall be chosen, by the qualified electors thereof, 1 Senator.",
};

// ---------------------------------------------------------------------------
// Florida
// ---------------------------------------------------------------------------

const FL_TITLE = "Constitution of the State of Florida";
const FL_ART3_SEC1: Transcription = {
  citation: "Fla. Const. art. III, § 1",
  authorityTitle: FL_TITLE,
  artifactId: "fl-constitution",
  pageOrSection: "Article III, Section 1 — Composition",
  excerpt:
    "The legislative power of the state shall be vested in a legislature of the State of Florida, consisting of a senate composed of one senator elected from each senatorial district and a house of representatives composed of one member elected from each representative district.",
};
const FL_ART3_HOUSE_TERMS: Transcription = {
  citation: "Fla. Const. art. III, § 15(b)",
  authorityTitle: FL_TITLE,
  artifactId: "fl-constitution",
  pageOrSection:
    "Article III, Section 15(b) — Terms and qualifications of legislators",
  excerpt:
    "Members of the house of representatives shall be elected for terms of two years in each even-numbered year.",
};

// ---------------------------------------------------------------------------
// Hawaii
// ---------------------------------------------------------------------------

const HI_TITLE = "The Constitution of the State of Hawaii";
const HI_ART3_SEC1: Transcription = {
  citation: "Haw. Const. art. III, § 1",
  authorityTitle: HI_TITLE,
  artifactId: "hi-constitution",
  pageOrSection: "Article III, Section 1 — Legislative Power",
  excerpt:
    "The legislative power of the State shall be vested in a legislature, which shall consist of two houses, a senate and a house of representatives.",
};
const HI_ART3_SEC2: Transcription = {
  citation: "Haw. Const. art. III, § 2",
  authorityTitle: HI_TITLE,
  artifactId: "hi-constitution",
  pageOrSection: "Article III, Section 2 — Composition of Senate",
  excerpt:
    "The senate shall be composed of twenty-five members, who shall be elected by the qualified voters of the respective senatorial districts.",
};
const HI_ART3_SEC3: Transcription = {
  citation: "Haw. Const. art. III, § 3",
  authorityTitle: HI_TITLE,
  artifactId: "hi-constitution",
  pageOrSection:
    "Article III, Section 3 — Composition of House of Representatives",
  excerpt:
    "The house of representatives shall be composed of fifty-one members, who shall be elected by the qualified voters of the respective representative districts.",
};

// ---------------------------------------------------------------------------
// Idaho
// ---------------------------------------------------------------------------

const ID_TITLE = "Constitution of the State of Idaho, Article III";
const ID_ART3_SEC2_SENATE: Transcription = {
  citation: "Idaho Const. art. III, § 2(1)",
  authorityTitle: ID_TITLE,
  artifactId: "id-constitution-article-3-section-2",
  pageOrSection: "Article III, Section 2(1) — Size of legislature",
  excerpt:
    "Following the decennial census of 2020 and in each legislature thereafter, the senate shall consist of thirty-five members.",
};
const ID_ART3_SEC2_HOUSE: Transcription = {
  citation: "Idaho Const. art. III, § 2(1)",
  authorityTitle: ID_TITLE,
  artifactId: "id-constitution-article-3-section-2",
  pageOrSection: "Article III, Section 2(1) — Size of legislature",
  excerpt:
    "The legislature may fix the number of members of the house of representatives at not more than two times as many representatives as there are senators.",
};
const ID_ART3_SEC2_CHOSEN: Transcription = {
  citation: "Idaho Const. art. III, § 2",
  authorityTitle: ID_TITLE,
  artifactId: "id-constitution-article-3-section-2",
  pageOrSection: "Article III, Section 2 — Size of legislature",
  excerpt:
    "The senators and representatives shall be chosen by the electors of the respective counties or districts into which the state may, from time to time, be divided by law.",
};

// ---------------------------------------------------------------------------
// Illinois
// ---------------------------------------------------------------------------

const IL_TITLE = "Constitution of the State of Illinois, Article IV";
const IL_ART4_SEC1: Transcription = {
  citation: "Ill. Const. art. IV, § 1",
  authorityTitle: IL_TITLE,
  artifactId: "il-constitution-article-4",
  pageOrSection: "Article IV, Section 1 — Legislature - Power and Structure",
  excerpt:
    "The legislative power is vested in a General Assembly consisting of a Senate and a House of Representatives, elected by the electors from 59 Legislative Districts and 118 Representative Districts.",
};
const IL_ART4_SEC2A: Transcription = {
  citation: "Ill. Const. art. IV, § 2(a)",
  authorityTitle: IL_TITLE,
  artifactId: "il-constitution-article-4",
  pageOrSection: "Article IV, Section 2(a) — Legislative Composition",
  excerpt: "One Senator shall be elected from each Legislative District.",
};
const IL_ART4_SEC2B: Transcription = {
  citation: "Ill. Const. art. IV, § 2(b)",
  authorityTitle: IL_TITLE,
  artifactId: "il-constitution-article-4",
  pageOrSection: "Article IV, Section 2(b) — Legislative Composition",
  excerpt:
    "In 1982 and every two years thereafter one Representative shall be elected from each Representative District for a term of two years.",
};

// ---------------------------------------------------------------------------
// Massachusetts — read, and deliberately not compiled
// ---------------------------------------------------------------------------

const MA_TITLE =
  "Constitution of the Commonwealth of Massachusetts, with Articles of Amendment";
const MA_HOUSE_240: Transcription = {
  citation: "Mass. Const. amend. art. XXI",
  authorityTitle: MA_TITLE,
  artifactId: "ma-constitution",
  pageOrSection: "Articles of Amendment — apportionment of representatives",
  excerpt:
    "The house of representatives shall consist of two hundred and forty members",
};
const MA_SENATE_40: Transcription = {
  citation: "Mass. Const. amend. art. LXXI",
  authorityTitle: MA_TITLE,
  artifactId: "ma-constitution",
  pageOrSection: "Articles of Amendment — the senate",
  excerpt: "The senate shall consist of forty members.",
};

// ---------------------------------------------------------------------------
// Minnesota
// ---------------------------------------------------------------------------

const MN_ART4_SEC1: Transcription = {
  citation: "Minn. Const. art. IV, § 1",
  authorityTitle: "The Minnesota Constitution",
  artifactId: "mn-constitution",
  pageOrSection: "Article IV, Section 1 — Composition of legislature",
  excerpt:
    "The legislature consists of the senate and house of representatives.",
};
const MN_ART4_SEC2: Transcription = {
  citation: "Minn. Const. art. IV, § 2",
  authorityTitle: "The Minnesota Constitution",
  artifactId: "mn-constitution",
  pageOrSection: "Article IV, Section 2 — Apportionment of members",
  excerpt:
    "The number of members who compose the senate and house of representatives shall be prescribed by law.",
};
const MN_STAT_2_021: Transcription = {
  citation: "Minn. Stat. § 2.021",
  authorityTitle:
    "Minnesota Statutes, section 2.021 — Number of senators and representatives",
  artifactId: "mn-statutes-2-021",
  pageOrSection: "Section 2.021",
  excerpt:
    "For each legislature, until a new apportionment shall have been made, the senate is composed of 67 members and the house of representatives is composed of 134 members.",
};

// ---------------------------------------------------------------------------
// North Carolina
// ---------------------------------------------------------------------------

const NC_TITLE = "Constitution of North Carolina, Article II";
const NC_ART2_SEC1: Transcription = {
  citation: "N.C. Const. art. II, § 1",
  authorityTitle: NC_TITLE,
  artifactId: "nc-constitution-article-2",
  pageOrSection: "Article II, Section 1 — Bicameral General Assembly",
  excerpt:
    "The legislative power of the State shall be vested in the General Assembly, which shall consist of a Senate and a House of Representatives.",
};
const NC_ART2_SEC2: Transcription = {
  citation: "N.C. Const. art. II, § 2",
  authorityTitle: NC_TITLE,
  artifactId: "nc-constitution-article-2",
  pageOrSection: "Article II, Section 2 — Number of Senators",
  excerpt:
    "The Senate shall be composed of 50 Senators, biennially chosen by ballot.",
};
const NC_ART2_SEC4: Transcription = {
  citation: "N.C. Const. art. II, § 4",
  authorityTitle: NC_TITLE,
  artifactId: "nc-constitution-article-2",
  pageOrSection: "Article II, Section 4 — Number of Representatives",
  excerpt:
    "The House of Representatives shall be composed of 120 Representatives, biennially chosen by ballot.",
};
const NC_ART2_SEC3: Transcription = {
  citation: "N.C. Const. art. II, § 3",
  authorityTitle: NC_TITLE,
  artifactId: "nc-constitution-article-2",
  pageOrSection:
    "Article II, Section 3 — Senate districts; apportionment of Senators",
  excerpt: "The Senators shall be elected from districts.",
};
const NC_ART2_SEC5: Transcription = {
  citation: "N.C. Const. art. II, § 5",
  authorityTitle: NC_TITLE,
  artifactId: "nc-constitution-article-2",
  pageOrSection:
    "Article II, Section 5 — Representative districts; apportionment of Representatives",
  excerpt: "The Representatives shall be elected from districts.",
};

// ---------------------------------------------------------------------------
// Nebraska
// ---------------------------------------------------------------------------

const NE_TITLE = "Constitution of the State of Nebraska, Article III";
const NE_ART3_SEC1: Transcription = {
  citation: "Neb. Const. art. III, § 1",
  authorityTitle: NE_TITLE,
  artifactId: "ne-constitution-article-3-section-1",
  pageOrSection: "Article III-1 — Legislative authority; how vested",
  excerpt:
    "The legislative authority of the state shall be vested in a Legislature consisting of one chamber.",
};
const NE_ART3_SEC6: Transcription = {
  citation: "Neb. Const. art. III, § 6",
  authorityTitle: NE_TITLE,
  artifactId: "ne-constitution-article-3-section-6",
  pageOrSection: "Article III-6 — Legislature; number of members",
  excerpt:
    "The Legislature shall consist of not more than fifty members and not less than thirty members.",
};

// ---------------------------------------------------------------------------
// Nevada
// ---------------------------------------------------------------------------

const NV_ART4_SEC1: Transcription = {
  citation: "Nev. Const. art. 4, § 1",
  authorityTitle: "The Constitution of the State of Nevada",
  artifactId: "nv-constitution",
  pageOrSection:
    "Article 4, Section 1 — Legislative power vested in senate and assembly",
  excerpt:
    "The Legislative authority of this State shall be vested in a Senate and Assembly which shall be designated",
};

// ---------------------------------------------------------------------------
// Ohio
// ---------------------------------------------------------------------------

const OH_TITLE = "Ohio Constitution, Article II";
const OH_ART2_SEC1: Transcription = {
  citation: "Ohio Const. art. II, § 1",
  authorityTitle: OH_TITLE,
  artifactId: "oh-constitution-article-2",
  pageOrSection: "Article II, Section 1 — In whom power vested",
  excerpt:
    "The legislative power of the state shall be vested in a general assembly consisting of a senate and house of representatives",
};
const OH_ART2_SEC2: Transcription = {
  citation: "Ohio Const. art. II, § 2",
  authorityTitle: OH_TITLE,
  artifactId: "oh-constitution-article-2",
  pageOrSection:
    "Article II, Section 2 — Election and term of office of members",
  excerpt:
    "Senators shall be elected by the electors of the respective senate districts; their terms of office shall commence on the first day of January next after their election.",
};

// ---------------------------------------------------------------------------
// Oregon
// ---------------------------------------------------------------------------

const OR_TITLE = "Constitution of Oregon, Article IV";
const OR_ART4_SEC1: Transcription = {
  citation: "Or. Const. art. IV, § 1(1)",
  authorityTitle: OR_TITLE,
  artifactId: "or-constitution",
  pageOrSection: "Article IV, Section 1(1) — Legislative power",
  excerpt:
    "The legislative power of the state, except for the initiative and referendum powers reserved to the people, is vested in a Legislative Assembly, consisting of a Senate and a House of Representatives.",
};
const OR_ART4_SEC4: Transcription = {
  citation: "Or. Const. art. IV, § 4(1)",
  authorityTitle: OR_TITLE,
  artifactId: "or-constitution",
  pageOrSection: "Article IV, Section 4(1) — Terms of office",
  excerpt:
    "The Senators shall be elected for the term of four years, and Representatives for the term of two years.",
};
const OR_ART4_SEC6: Transcription = {
  citation: "Or. Const. art. IV, § 6(1)",
  authorityTitle: OR_TITLE,
  artifactId: "or-constitution",
  pageOrSection: "Article IV, Section 6(1) — Apportionment",
  excerpt:
    "the number of Senators and Representatives shall be fixed by law and apportioned among legislative districts according to population.",
};

// ---------------------------------------------------------------------------
// Virginia
// ---------------------------------------------------------------------------

const VA_TITLE = "Constitution of Virginia, Article IV";
const VA_ART4_SEC2: Transcription = {
  citation: "Va. Const. art. IV, § 2",
  authorityTitle: VA_TITLE,
  artifactId: "va-constitution-article-4-section-2",
  pageOrSection: "Article IV, Section 2 — Senate",
  excerpt:
    "The Senate shall consist of not more than forty and not less than thirty-three members, who shall be elected quadrennially by the voters of the several senatorial districts on the Tuesday succeeding the first Monday in November.",
};
const VA_ART4_SEC3: Transcription = {
  citation: "Va. Const. art. IV, § 3",
  authorityTitle: VA_TITLE,
  artifactId: "va-constitution-article-4-section-3",
  pageOrSection: "Article IV, Section 3 — House of Delegates",
  excerpt:
    "The House of Delegates shall consist of not more than one hundred and not less than ninety members, who shall be elected biennially by the voters of the several house districts on the Tuesday succeeding the first Monday in November.",
};

// ---------------------------------------------------------------------------
// The states this domain read
// ---------------------------------------------------------------------------

const SOURCED: readonly StateDeclaration[] = [
  {
    stateUsps: "AK",
    stateName: "Alaska",
    jurisdictionKey: "US-AK",
    legislatureMemberNouns: ["Legislators"],
    legislatureName: notRetrieved(
      "Article II names the body only as 'a legislature'. No authority read for this domain states an official collective name.",
    ),
    structure: direct<LegislatureStructure>(
      "bicameral",
      twoChambers("senate", "house of representatives"),
      AK_ART2_SEC1,
    ),
    chambers: [
      {
        chamberKey: "house",
        memberNouns: ["representatives", "representative"],
        name: direct("house of representatives", NAMES_CHAMBER, AK_ART2_SEC1),
        seatCount: direct(
          40,
          seatsOf("house of representatives"),
          AK_ART2_SEC1,
        ),
        membersElected: direct(
          true,
          allLegislatorsElectedBy(
            "Legislators",
            "Legislators shall be elected at general elections.",
          ),
          AK_ART2_SEC3,
        ),
      },
      {
        chamberKey: "senate",
        memberNouns: ["senators", "senator"],
        name: direct("senate", NAMES_CHAMBER, AK_ART2_SEC1),
        seatCount: direct(20, seatsOf("senate"), AK_ART2_SEC1),
        membersElected: direct(
          true,
          allLegislatorsElectedBy(
            "Legislators",
            "Legislators shall be elected at general elections.",
          ),
          AK_ART2_SEC3,
        ),
      },
    ],
    unresolvedGaps: [],
  },
  {
    stateUsps: "CA",
    stateName: "California",
    jurisdictionKey: "US-CA",
    legislatureMemberNouns: [],
    legislatureName: direct(
      "California Legislature",
      NAMES_LEGISLATURE,
      CA_ART4_SEC1,
    ),
    structure: direct<LegislatureStructure>(
      "bicameral",
      twoChambers("Senate", "Assembly"),
      CA_ART4_SEC1,
    ),
    chambers: [
      {
        chamberKey: "assembly",
        memberNouns: ["Member of the Assembly", "Members of the Assembly"],
        name: direct("Assembly", NAMES_CHAMBER, CA_ART4_SEC1),
        seatCount: direct(80, seatsOf("Assembly"), CA_ART4_SEC2_ASSEMBLY),
        membersElected: direct(
          true,
          electedBy(
            "members",
            "The Assembly has a membership of 80 members elected for 2-year terms.",
          ),
          CA_ART4_SEC2_ASSEMBLY,
        ),
      },
      {
        chamberKey: "senate",
        memberNouns: ["Senators", "Senator"],
        name: direct("Senate", NAMES_CHAMBER, CA_ART4_SEC1),
        seatCount: direct(40, seatsOf("Senate"), CA_ART4_SEC2_SENATE),
        membersElected: direct(
          true,
          electedBy(
            "Senators",
            "The Senate has a membership of 40 Senators elected for 4-year terms",
          ),
          CA_ART4_SEC2_SENATE,
        ),
      },
    ],
    unresolvedGaps: [],
  },
  {
    stateUsps: "DE",
    stateName: "Delaware",
    jurisdictionKey: "US-DE",
    legislatureMemberNouns: [],
    legislatureName: direct(
      "General Assembly",
      NAMES_LEGISLATURE,
      DE_ART2_SEC1,
    ),
    structure: direct<LegislatureStructure>(
      "bicameral",
      twoChambers("Senate", "House of Representatives"),
      DE_ART2_SEC1,
    ),
    chambers: [
      {
        chamberKey: "house",
        memberNouns: ["Representative", "Representatives"],
        name: direct("House of Representatives", NAMES_CHAMBER, DE_ART2_SEC1),
        seatCount: readButNotFixed(
          "Section 2 composes the House of '35 members, plus such additional members as shall be provided under Section 2A of this Article'. The total is therefore 35 plus an unread quantity, and 35 is not the number of seats.",
          "delegates-to-other-provision",
          DE_ART2_SEC2_HOUSE,
        ),
        membersElected: derived(
          true,
          "The provision states that a Representative is chosen from each Representative District by the qualified electors of that district, which is election by voters.",
          {
            kind: "election-by-district-electors",
            subject: "1 Representative",
            clause:
              "there shall be chosen, by the qualified electors thereof, 1 Representative",
          },
          DE_ART2_ELECTORS_REP,
        ),
      },
      {
        chamberKey: "senate",
        memberNouns: ["Senator", "Senators"],
        name: direct("Senate", NAMES_CHAMBER, DE_ART2_SEC1),
        seatCount: direct(21, seatsOf("Senate"), DE_ART2_SEC2_SENATE),
        membersElected: derived(
          true,
          "The provision states that a Senator is chosen from each Senatorial District by the qualified electors of that district, which is election by voters.",
          {
            kind: "election-by-district-electors",
            subject: "1 Senator",
            clause:
              "shall be chosen, by the qualified electors thereof, 1 Senator",
          },
          DE_ART2_ELECTORS_SEN,
        ),
      },
    ],
    unresolvedGaps: [
      {
        gapKind: "seat-count",
        chamberKey: "house",
        reason:
          "Del. Const. art. II, § 2A provides for additional House members beyond the 35 named in § 2. Resolving the House's size needs § 2A read in full, which this domain has not done.",
      },
    ],
  },
  {
    stateUsps: "FL",
    stateName: "Florida",
    jurisdictionKey: "US-FL",
    legislatureMemberNouns: [],
    legislatureName: direct(
      "legislature of the State of Florida",
      NAMES_LEGISLATURE,
      FL_ART3_SEC1,
    ),
    structure: direct<LegislatureStructure>(
      "bicameral",
      twoChambers("senate", "house of representatives"),
      FL_ART3_SEC1,
    ),
    chambers: [
      {
        chamberKey: "house",
        memberNouns: ["Members of the house of representatives"],
        name: direct("house of representatives", NAMES_CHAMBER, FL_ART3_SEC1),
        seatCount: readButNotFixed(
          "Article III, § 1 composes the House of one member per representative district and fixes no number. The number of districts is set by apportionment, which this domain has not read.",
          "composes-by-district-without-number",
          FL_ART3_SEC1,
        ),
        membersElected: direct(
          true,
          electedBy(
            "Members of the house of representatives",
            "Members of the house of representatives shall be elected for terms of two years in each even-numbered year.",
          ),
          FL_ART3_HOUSE_TERMS,
        ),
      },
      {
        chamberKey: "senate",
        memberNouns: ["one senator"],
        name: direct("senate", NAMES_CHAMBER, FL_ART3_SEC1),
        seatCount: readButNotFixed(
          "Article III, § 1 composes the Senate of one senator per senatorial district and fixes no number. The number of districts is set by apportionment, which this domain has not read.",
          "composes-by-district-without-number",
          FL_ART3_SEC1,
        ),
        membersElected: direct(
          true,
          electedBy(
            "one senator",
            "a senate composed of one senator elected from each senatorial district",
          ),
          FL_ART3_SEC1,
        ),
      },
    ],
    unresolvedGaps: [
      {
        gapKind: "seat-count",
        chamberKey: null,
        reason:
          "Florida fixes both chambers by district rather than by number. Seat counts need the current apportionment act, which is not among the authorities read here.",
      },
    ],
  },
  {
    stateUsps: "HI",
    stateName: "Hawaii",
    jurisdictionKey: "US-HI",
    legislatureMemberNouns: [],
    legislatureName: notRetrieved(
      "Article III names the body only as 'a legislature'. No authority read for this domain states an official collective name.",
    ),
    structure: direct<LegislatureStructure>(
      "bicameral",
      twoChambers("senate", "house of representatives"),
      HI_ART3_SEC1,
    ),
    chambers: [
      {
        chamberKey: "house",
        memberNouns: ["representatives"],
        name: direct("house of representatives", NAMES_CHAMBER, HI_ART3_SEC1),
        seatCount: direct(
          51,
          seatsOf("house of representatives"),
          HI_ART3_SEC3,
        ),
        membersElected: direct(
          true,
          electedBy(
            "members",
            "The house of representatives shall be composed of fifty-one members, who shall be elected by the qualified voters of the respective representative districts.",
          ),
          HI_ART3_SEC3,
        ),
      },
      {
        chamberKey: "senate",
        memberNouns: ["senators"],
        name: direct("senate", NAMES_CHAMBER, HI_ART3_SEC1),
        seatCount: direct(25, seatsOf("senate"), HI_ART3_SEC2),
        membersElected: direct(
          true,
          electedBy(
            "members",
            "The senate shall be composed of twenty-five members, who shall be elected by the qualified voters of the respective senatorial districts.",
          ),
          HI_ART3_SEC2,
        ),
      },
    ],
    unresolvedGaps: [],
  },
  {
    stateUsps: "ID",
    stateName: "Idaho",
    jurisdictionKey: "US-ID",
    legislatureMemberNouns: [],
    legislatureName: notRetrieved(
      "Only Article III, § 2 was read for Idaho, and it does not state the legislature's official collective name.",
    ),
    structure: derived<LegislatureStructure>(
      "bicameral",
      "Section 2 fixes a senate of thirty-five members and separately empowers the legislature to fix the number of members of the house of representatives. The section therefore describes two chambers.",
      {
        kind: "two-chambers-composed-separately",
        chamberTerms: ["senate", "house of representatives"],
      },
      ID_ART3_SEC2_SENATE,
      ID_ART3_SEC2_HOUSE,
    ),
    chambers: [
      {
        chamberKey: "house",
        memberNouns: ["representatives"],
        name: direct(
          "house of representatives",
          NAMES_CHAMBER,
          ID_ART3_SEC2_HOUSE,
        ),
        seatCount: readButNotFixed(
          "Article III, § 2 sets only a ceiling — the legislature may fix the House at not more than twice the number of senators — so the constitution does not state the number.",
          "states-limit-only",
          ID_ART3_SEC2_HOUSE,
        ),
        membersElected: derived(
          true,
          "The provision states that representatives are chosen by the electors of the counties or districts into which the state is divided, which is election by voters.",
          {
            kind: "election-by-district-electors",
            subject: "representatives",
            clause:
              "The senators and representatives shall be chosen by the electors of the respective counties or districts",
          },
          ID_ART3_SEC2_CHOSEN,
        ),
      },
      {
        chamberKey: "senate",
        memberNouns: ["senators"],
        name: direct("senate", NAMES_CHAMBER, ID_ART3_SEC2_SENATE),
        seatCount: direct(35, seatsOf("senate"), ID_ART3_SEC2_SENATE),
        membersElected: derived(
          true,
          "The provision states that senators are chosen by the electors of the counties or districts into which the state is divided, which is election by voters.",
          {
            kind: "election-by-district-electors",
            subject: "senators",
            clause:
              "The senators and representatives shall be chosen by the electors of the respective counties or districts",
          },
          ID_ART3_SEC2_CHOSEN,
        ),
      },
    ],
    unresolvedGaps: [
      {
        gapKind: "seat-count",
        chamberKey: "house",
        reason:
          "Idaho's House size is fixed by the legislature within a constitutional ceiling. The statute that fixes it is not among the authorities read here.",
      },
    ],
  },
  {
    stateUsps: "IL",
    stateName: "Illinois",
    jurisdictionKey: "US-IL",
    legislatureMemberNouns: [],
    legislatureName: direct(
      "General Assembly",
      NAMES_LEGISLATURE,
      IL_ART4_SEC1,
    ),
    structure: direct<LegislatureStructure>(
      "bicameral",
      twoChambers("Senate", "House of Representatives"),
      IL_ART4_SEC1,
    ),
    chambers: [
      {
        chamberKey: "house",
        memberNouns: ["Representative", "Representatives"],
        name: direct("House of Representatives", NAMES_CHAMBER, IL_ART4_SEC1),
        seatCount: derived(
          118,
          "Section 1 states that the General Assembly is elected from 118 Representative Districts and section 2(b) that one Representative is elected from each Representative District; one seat per district across 118 districts is 118 seats.",
          {
            kind: "seats-equal-one-member-per-district",
            districtSubject: "Representative Districts",
            perDistrictClause:
              "one Representative shall be elected from each Representative District",
          },
          IL_ART4_SEC1,
          IL_ART4_SEC2B,
        ),
        membersElected: direct(
          true,
          electedBy(
            "one Representative",
            "In 1982 and every two years thereafter one Representative shall be elected from each Representative District for a term of two years.",
          ),
          IL_ART4_SEC2B,
        ),
      },
      {
        chamberKey: "senate",
        memberNouns: ["Senator", "Senators"],
        name: direct("Senate", NAMES_CHAMBER, IL_ART4_SEC1),
        seatCount: derived(
          59,
          "Section 1 states that the General Assembly is elected from 59 Legislative Districts and section 2(a) that one Senator is elected from each Legislative District; one seat per district across 59 districts is 59 seats.",
          {
            kind: "seats-equal-one-member-per-district",
            districtSubject: "Legislative Districts",
            perDistrictClause:
              "One Senator shall be elected from each Legislative District",
          },
          IL_ART4_SEC1,
          IL_ART4_SEC2A,
        ),
        membersElected: direct(
          true,
          electedBy(
            "One Senator",
            "One Senator shall be elected from each Legislative District.",
          ),
          IL_ART4_SEC2A,
        ),
      },
    ],
    unresolvedGaps: [],
  },
  {
    stateUsps: "MA",
    stateName: "Massachusetts",
    jurisdictionKey: "US-MA",
    legislatureMemberNouns: [],
    legislatureName: notRetrieved(
      "Not compiled. See the unresolved gap for Massachusetts.",
    ),
    structure: readButNotFixed(
      "Not compiled: the retrieved document carries composition provisions from several eras at once and this domain did not resolve which governs. See the unresolved gap for Massachusetts.",
      "competing-provisions-unresolved",
      MA_HOUSE_240,
      MA_SENATE_40,
    ),
    chambers: [],
    unresolvedGaps: [
      {
        gapKind: "superseding-amendments-unresolved",
        chamberKey: null,
        reason:
          "The Commonwealth publishes the 1780 constitution together with its amendments in one document, and the composition provisions are amended more than once. The retrieved text contains both 'The house of representatives shall consist of two hundred and forty members' and later amendment text, and this domain did not resolve which provision governs. Compiling either number without that resolution would state a superseded rule as present law, so no Massachusetts chamber fact is compiled here.",
      },
    ],
  },
  {
    stateUsps: "MN",
    stateName: "Minnesota",
    jurisdictionKey: "US-MN",
    legislatureMemberNouns: [],
    legislatureName: notRetrieved(
      "Article IV names the body only as 'the legislature'. No authority read for this domain states an official collective name.",
    ),
    structure: direct<LegislatureStructure>(
      "bicameral",
      twoChambers("senate", "house of representatives"),
      MN_ART4_SEC1,
    ),
    chambers: [
      {
        chamberKey: "house",
        memberNouns: ["representatives"],
        name: direct("house of representatives", NAMES_CHAMBER, MN_ART4_SEC1),
        seatCount: direct(
          134,
          seatsOf("house of representatives"),
          MN_STAT_2_021,
        ),
        membersElected: notRetrieved(
          "No provision read for this domain says in terms that members of the Minnesota House are elected. Article IV, § 3 speaks of representatives being chosen by district, which is a districting rule rather than a statement about how a member reaches the seat.",
        ),
      },
      {
        chamberKey: "senate",
        memberNouns: ["senators"],
        name: direct("senate", NAMES_CHAMBER, MN_ART4_SEC1),
        seatCount: direct(67, seatsOf("senate"), MN_STAT_2_021),
        membersElected: notRetrieved(
          "No provision read for this domain says in terms that members of the Minnesota Senate are elected. Article IV, § 3 speaks of senators being chosen by district, which is a districting rule rather than a statement about how a member reaches the seat.",
        ),
      },
    ],
    unresolvedGaps: [
      {
        gapKind: "seat-count-is-statutory",
        chamberKey: null,
        reason:
          "Minn. Const. art. IV, § 2 delegates both chamber sizes to statute, so 67 and 134 rest on Minn. Stat. § 2.021 and change when it does. They are not constitutional numbers.",
      },
      {
        gapKind: "members-elected",
        chamberKey: null,
        reason:
          "The provision stating that Minnesota legislators are elected was not located in the articles read here.",
      },
    ],
  },
  {
    stateUsps: "NC",
    stateName: "North Carolina",
    jurisdictionKey: "US-NC",
    legislatureMemberNouns: [],
    legislatureName: direct(
      "General Assembly",
      NAMES_LEGISLATURE,
      NC_ART2_SEC1,
    ),
    structure: direct<LegislatureStructure>(
      "bicameral",
      twoChambers("Senate", "House of Representatives"),
      NC_ART2_SEC1,
    ),
    chambers: [
      {
        chamberKey: "house",
        memberNouns: ["Representatives", "Representative"],
        name: direct("House of Representatives", NAMES_CHAMBER, NC_ART2_SEC1),
        seatCount: direct(
          120,
          seatsOf("House of Representatives"),
          NC_ART2_SEC4,
        ),
        membersElected: direct(
          true,
          electedBy(
            "The Representatives",
            "The Representatives shall be elected from districts.",
          ),
          NC_ART2_SEC5,
        ),
      },
      {
        chamberKey: "senate",
        memberNouns: ["Senators", "Senator"],
        name: direct("Senate", NAMES_CHAMBER, NC_ART2_SEC1),
        seatCount: direct(50, seatsOf("Senate"), NC_ART2_SEC2),
        membersElected: direct(
          true,
          electedBy(
            "The Senators",
            "The Senators shall be elected from districts.",
          ),
          NC_ART2_SEC3,
        ),
      },
    ],
    unresolvedGaps: [],
  },
  {
    stateUsps: "NE",
    stateName: "Nebraska",
    jurisdictionKey: "US-NE",
    legislatureMemberNouns: [],
    legislatureName: direct("Legislature", NAMES_LEGISLATURE, NE_ART3_SEC1),
    structure: direct<LegislatureStructure>(
      "unicameral",
      ONE_CHAMBER,
      NE_ART3_SEC1,
    ),
    chambers: [
      {
        chamberKey: "legislature",
        memberNouns: [],
        name: direct("Legislature", NAMES_CHAMBER, NE_ART3_SEC1),
        seatCount: readButNotFixed(
          "Neb. Const. art. III, § 6 fixes only a range — not more than fifty and not less than thirty members — so the constitution does not state the number.",
          "states-limit-only",
          NE_ART3_SEC6,
        ),
        membersElected: notRetrieved(
          "Only Article III, §§ 1 and 6 were read for Nebraska, and neither states that members are elected.",
        ),
      },
    ],
    unresolvedGaps: [
      {
        gapKind: "seat-count",
        chamberKey: "legislature",
        reason:
          "Nebraska's number of senators is set within the constitutional range by an instrument not read here. Art. III, § 6 gives the range only.",
      },
      {
        gapKind: "members-elected",
        chamberKey: "legislature",
        reason:
          "The provision stating that Nebraska senators are elected is elsewhere in Article III and was not retrieved.",
      },
    ],
  },
  {
    stateUsps: "NV",
    stateName: "Nevada",
    jurisdictionKey: "US-NV",
    legislatureMemberNouns: [],
    legislatureName: notRetrieved(
      "Nev. Const. art. 4, § 1 designates the body by a name given in typographic quotation marks, and the retrieved bytes render those marks in an encoding this substrate does not decode. The name is on the page and could not be transcribed with confidence, so it is not claimed.",
    ),
    structure: direct<LegislatureStructure>(
      "bicameral",
      twoChambers("Senate", "Assembly"),
      NV_ART4_SEC1,
    ),
    chambers: [
      {
        chamberKey: "assembly",
        memberNouns: [],
        name: direct("Assembly", NAMES_CHAMBER, NV_ART4_SEC1),
        seatCount: notRetrieved(
          "The Nevada Constitution fixes the Assembly's size by law rather than by number; the statute was not read here.",
        ),
        membersElected: notRetrieved(
          "No provision read for this domain states in terms that members of the Nevada Assembly are elected.",
        ),
      },
      {
        chamberKey: "senate",
        memberNouns: [],
        name: direct("Senate", NAMES_CHAMBER, NV_ART4_SEC1),
        seatCount: notRetrieved(
          "Nev. Const. art. 4, § 5 fixes the Senate only as a ratio of the Assembly — not less than one-third nor more than one-half — so it states no number.",
        ),
        membersElected: notRetrieved(
          "No provision read for this domain states in terms that members of the Nevada Senate are elected.",
        ),
      },
    ],
    unresolvedGaps: [
      {
        gapKind: "seat-count",
        chamberKey: null,
        reason:
          "Both Nevada chamber sizes are statutory. The statute fixing them is not among the authorities read here.",
      },
    ],
  },
  {
    stateUsps: "OH",
    stateName: "Ohio",
    jurisdictionKey: "US-OH",
    legislatureMemberNouns: [],
    legislatureName: direct(
      "general assembly",
      NAMES_LEGISLATURE,
      OH_ART2_SEC1,
    ),
    structure: direct<LegislatureStructure>(
      "bicameral",
      twoChambers("senate", "house of representatives"),
      OH_ART2_SEC1,
    ),
    chambers: [
      {
        chamberKey: "house",
        memberNouns: ["Representatives"],
        name: direct("house of representatives", NAMES_CHAMBER, OH_ART2_SEC1),
        seatCount: notRetrieved(
          "Ohio's chamber sizes are in Article XI, which was not read for this domain. Article II states no number.",
        ),
        membersElected: notRetrieved(
          "Article II, § 2 states that senators are elected but the corresponding statement for representatives was not read.",
        ),
      },
      {
        chamberKey: "senate",
        memberNouns: ["Senators"],
        name: direct("senate", NAMES_CHAMBER, OH_ART2_SEC1),
        seatCount: notRetrieved(
          "Ohio's chamber sizes are in Article XI, which was not read for this domain. Article II states no number.",
        ),
        membersElected: direct(
          true,
          electedBy(
            "Senators",
            "Senators shall be elected by the electors of the respective senate districts",
          ),
          OH_ART2_SEC2,
        ),
      },
    ],
    unresolvedGaps: [
      {
        gapKind: "seat-count",
        chamberKey: null,
        reason:
          "Ohio Const. art. XI states the ratios of representation and the number of districts. Reading it would resolve both chamber sizes; this domain read Article II only.",
      },
    ],
  },
  {
    stateUsps: "OR",
    stateName: "Oregon",
    jurisdictionKey: "US-OR",
    legislatureMemberNouns: [],
    legislatureName: direct(
      "Legislative Assembly",
      NAMES_LEGISLATURE,
      OR_ART4_SEC1,
    ),
    structure: direct<LegislatureStructure>(
      "bicameral",
      twoChambers("Senate", "House of Representatives"),
      OR_ART4_SEC1,
    ),
    chambers: [
      {
        chamberKey: "house",
        memberNouns: ["Representatives"],
        name: direct("House of Representatives", NAMES_CHAMBER, OR_ART4_SEC1),
        seatCount: readButNotFixed(
          "Or. Const. art. IV, § 6 states that the number of Representatives shall be fixed by law, so the constitution states no number.",
          "delegates-to-other-provision",
          OR_ART4_SEC6,
        ),
        membersElected: direct(
          true,
          electedBy(
            "Representatives",
            "The Senators shall be elected for the term of four years, and Representatives for the term of two years.",
          ),
          OR_ART4_SEC4,
        ),
      },
      {
        chamberKey: "senate",
        memberNouns: ["Senators"],
        name: direct("Senate", NAMES_CHAMBER, OR_ART4_SEC1),
        seatCount: readButNotFixed(
          "Or. Const. art. IV, § 6 states that the number of Senators shall be fixed by law, so the constitution states no number.",
          "delegates-to-other-provision",
          OR_ART4_SEC6,
        ),
        membersElected: direct(
          true,
          electedBy(
            "The Senators",
            "The Senators shall be elected for the term of four years",
          ),
          OR_ART4_SEC4,
        ),
      },
    ],
    unresolvedGaps: [
      {
        gapKind: "seat-count",
        chamberKey: null,
        reason:
          "Oregon fixes both chamber sizes by law under art. IV, § 6. The statute doing so is not among the authorities read here.",
      },
    ],
  },
  {
    stateUsps: "VA",
    stateName: "Virginia",
    jurisdictionKey: "US-VA",
    legislatureMemberNouns: [],
    legislatureName: notRetrieved(
      "Only Article IV, §§ 2 and 3 were read for Virginia, and neither states the legislature's official collective name.",
    ),
    structure: derived<LegislatureStructure>(
      "bicameral",
      "Article IV composes a Senate in § 2 and a House of Delegates in § 3, each of its own members elected by its own districts. The article therefore describes two chambers.",
      {
        kind: "two-chambers-composed-separately",
        chamberTerms: ["Senate", "House of Delegates"],
      },
      VA_ART4_SEC2,
      VA_ART4_SEC3,
    ),
    chambers: [
      {
        chamberKey: "house",
        memberNouns: [],
        name: direct("House of Delegates", NAMES_CHAMBER, VA_ART4_SEC3),
        seatCount: readButNotFixed(
          "Va. Const. art. IV, § 3 fixes only a range — not more than one hundred and not less than ninety members — so the constitution states no number.",
          "states-limit-only",
          VA_ART4_SEC3,
        ),
        membersElected: direct(
          true,
          electedBy(
            "members",
            "The House of Delegates shall consist of not more than one hundred and not less than ninety members, who shall be elected biennially by the voters of the several house districts",
          ),
          VA_ART4_SEC3,
        ),
      },
      {
        chamberKey: "senate",
        memberNouns: [],
        name: direct("Senate", NAMES_CHAMBER, VA_ART4_SEC2),
        seatCount: readButNotFixed(
          "Va. Const. art. IV, § 2 fixes only a range — not more than forty and not less than thirty-three members — so the constitution states no number.",
          "states-limit-only",
          VA_ART4_SEC2,
        ),
        membersElected: direct(
          true,
          electedBy(
            "members",
            "The Senate shall consist of not more than forty and not less than thirty-three members, who shall be elected quadrennially by the voters of the several senatorial districts",
          ),
          VA_ART4_SEC2,
        ),
      },
    ],
    unresolvedGaps: [
      {
        gapKind: "seat-count",
        chamberKey: null,
        reason:
          "Virginia fixes both chambers within constitutional ranges by apportionment act. That act is not among the authorities read here.",
      },
    ],
  },
];

/**
 * Provisions quoted by a gap rather than by a value.
 *
 * Minnesota's art. IV, § 2 is why 67 and 134 are statutory rather than
 * constitutional numbers. It supports no value and still has to be checked,
 * because a gap that quotes a provision nobody verified is not evidence either.
 */
export const REFERENCED_DELEGATION_PROVISIONS: readonly Transcription[] = [
  MN_ART4_SEC2,
];

// ---------------------------------------------------------------------------
// The states this domain could not read
// ---------------------------------------------------------------------------

/**
 * Why a state has no facts here.
 *
 * Each reason names what was actually attempted and what actually happened. It
 * is a fact about a retrieval, never a fact about the state — a legislature
 * whose constitution is served by a client-rendered application is not a
 * legislature about which anything is unknown, only one this substrate has not
 * read yet.
 */
interface UnreadState {
  readonly stateUsps: string;
  readonly stateName: string;
  readonly attemptedUrl: string;
  readonly obstacle: string;
}

const CLIENT_RENDERED =
  "the publisher serves its constitution through a client-rendered application, so a plain HTTP retrieval returns an application shell containing no legislative text";
const REFUSES_BOT =
  "the publisher refused a non-browser client with an HTTP 403 at retrieval time";
const PDF_ONLY =
  "the publisher offers the text only as a PDF, and this substrate has no PDF parser, so the bytes could not be turned into checkable text";
const NOT_LOCATED =
  "no official static or machine-readable text of the legislative article was located for this domain";

const UNREAD: readonly UnreadState[] = [
  {
    stateUsps: "AL",
    stateName: "Alabama",
    attemptedUrl:
      "https://alison.legislature.state.al.us/constitution-of-alabama",
    obstacle: CLIENT_RENDERED,
  },
  {
    stateUsps: "AZ",
    stateName: "Arizona",
    attemptedUrl: "https://www.azleg.gov/constitution/?article=4",
    obstacle: CLIENT_RENDERED,
  },
  {
    stateUsps: "AR",
    stateName: "Arkansas",
    attemptedUrl: "https://arkleg.state.ar.us/Home/Constitution",
    obstacle: NOT_LOCATED,
  },
  {
    stateUsps: "CO",
    stateName: "Colorado",
    attemptedUrl: "https://leg.colorado.gov/colorado-constitution",
    obstacle: PDF_ONLY,
  },
  {
    stateUsps: "CT",
    stateName: "Connecticut",
    attemptedUrl:
      "https://portal.ct.gov/sots/register-manual/section-a/constitution-of-the-state-of-connecticut",
    obstacle: CLIENT_RENDERED,
  },
  {
    stateUsps: "GA",
    stateName: "Georgia",
    attemptedUrl: "https://sos.ga.gov/page/georgia-constitution",
    obstacle: REFUSES_BOT,
  },
  {
    stateUsps: "IN",
    stateName: "Indiana",
    attemptedUrl: "https://iga.in.gov/laws/2025/constitution/articles/4",
    obstacle: CLIENT_RENDERED,
  },
  {
    stateUsps: "IA",
    stateName: "Iowa",
    attemptedUrl: "https://www.legis.iowa.gov/law/constitution",
    obstacle: NOT_LOCATED,
  },
  {
    stateUsps: "KS",
    stateName: "Kansas",
    attemptedUrl: "https://www.kslegislature.gov/li/constitution/",
    obstacle: NOT_LOCATED,
  },
  {
    stateUsps: "KY",
    stateName: "Kentucky",
    attemptedUrl: "https://apps.legislature.ky.gov/law/constitution",
    obstacle:
      "the page retrieved is the constitution's table of sections; the operative text of each section is served separately and no static per-section URL was located",
  },
  {
    stateUsps: "LA",
    stateName: "Louisiana",
    attemptedUrl: "https://www.legis.la.gov/legis/Law.aspx?d=206133",
    obstacle: NOT_LOCATED,
  },
  {
    stateUsps: "MD",
    stateName: "Maryland",
    attemptedUrl: "https://mgaleg.maryland.gov/mgawebsite/Laws/Constitution",
    obstacle: CLIENT_RENDERED,
  },
  {
    stateUsps: "ME",
    stateName: "Maine",
    attemptedUrl:
      "https://legislature.maine.gov/ros/constitution/Constitution.htm",
    obstacle:
      "the page retrieved is the constitution's table of contents and carries no article text",
  },
  {
    stateUsps: "MI",
    stateName: "Michigan",
    attemptedUrl:
      "https://www.legislature.mi.gov/Laws/MCL?objectName=mclConstitution",
    obstacle: REFUSES_BOT,
  },
  {
    stateUsps: "MS",
    stateName: "Mississippi",
    attemptedUrl:
      "https://www.sos.ms.gov/content/documents/ed_pubs/pubs/Mississippi_Constitution.pdf",
    obstacle: PDF_ONLY,
  },
  {
    stateUsps: "MO",
    stateName: "Missouri",
    attemptedUrl: "https://revisor.mo.gov/main/OneSection.aspx?section=III++2",
    obstacle: CLIENT_RENDERED,
  },
  {
    stateUsps: "MT",
    stateName: "Montana",
    attemptedUrl:
      "https://archive.legmt.gov/bills/mca/title_0000/article_0050/part_0010/section_0020/0000-0050-0010-0020.html",
    obstacle: CLIENT_RENDERED,
  },
  {
    stateUsps: "NH",
    stateName: "New Hampshire",
    attemptedUrl: "https://www.nh.gov/glance/constitution.htm",
    obstacle: REFUSES_BOT,
  },
  {
    stateUsps: "NJ",
    stateName: "New Jersey",
    attemptedUrl: "https://pub.njleg.state.nj.us/Constitution/",
    obstacle: NOT_LOCATED,
  },
  {
    stateUsps: "NM",
    stateName: "New Mexico",
    attemptedUrl: "https://www.nmlegis.gov/",
    obstacle: "the publisher did not complete a connection at retrieval time",
  },
  {
    stateUsps: "NY",
    stateName: "New York",
    attemptedUrl: "https://www.nysenate.gov/legislation/laws/CNS/A3",
    obstacle: REFUSES_BOT,
  },
  {
    stateUsps: "ND",
    stateName: "North Dakota",
    attemptedUrl: "https://ndlegis.gov/constit/a02.pdf",
    obstacle: PDF_ONLY,
  },
  {
    stateUsps: "OK",
    stateName: "Oklahoma",
    attemptedUrl:
      "https://www.oscn.net/applications/oscn/DeliverDocument.asp?CiteID=87373",
    obstacle: NOT_LOCATED,
  },
  {
    stateUsps: "PA",
    stateName: "Pennsylvania",
    attemptedUrl:
      "https://www.legis.state.pa.us/WU01/LI/LI/CT/HTM/00/00.002.001.000..HTM",
    obstacle: NOT_LOCATED,
  },
  {
    stateUsps: "RI",
    stateName: "Rhode Island",
    attemptedUrl: "https://webserver.rilegislature.gov/RiConstitution/",
    obstacle: NOT_LOCATED,
  },
  {
    stateUsps: "SC",
    stateName: "South Carolina",
    attemptedUrl: "https://www.scstatehouse.gov/scconstitution/scconst.php",
    obstacle: CLIENT_RENDERED,
  },
  {
    stateUsps: "SD",
    stateName: "South Dakota",
    attemptedUrl: "https://sdlegislature.gov/Constitution/3",
    obstacle: CLIENT_RENDERED,
  },
  {
    stateUsps: "TN",
    stateName: "Tennessee",
    attemptedUrl: "https://www.capitol.tn.gov/about/docs/tn-constitution.pdf",
    obstacle: PDF_ONLY,
  },
  {
    stateUsps: "TX",
    stateName: "Texas",
    attemptedUrl: "https://statutes.capitol.texas.gov/Docs/CN/htm/CN.3.htm",
    obstacle: CLIENT_RENDERED,
  },
  {
    stateUsps: "UT",
    stateName: "Utah",
    attemptedUrl:
      "https://le.utah.gov/xcode/ArticleVI/Article_VI,_Section_2.html",
    obstacle: CLIENT_RENDERED,
  },
  {
    stateUsps: "VT",
    stateName: "Vermont",
    attemptedUrl:
      "https://legislature.vermont.gov/statutes/constitution-of-the-state-of-vermont/",
    obstacle:
      "the publisher served an incomplete TLS certificate chain, which the acquisition client rejects; the text is present but cannot be retrieved with the trust this substrate requires",
  },
  {
    stateUsps: "WA",
    stateName: "Washington",
    attemptedUrl: "https://leg.wa.gov/CodeReviser/Pages/WAConstitution.aspx",
    obstacle: CLIENT_RENDERED,
  },
  {
    stateUsps: "WV",
    stateName: "West Virginia",
    attemptedUrl: "https://code.wvlegislature.gov/6/",
    obstacle: CLIENT_RENDERED,
  },
  {
    stateUsps: "WI",
    stateName: "Wisconsin",
    attemptedUrl: "https://docs.legis.wisconsin.gov/constitution/wi/000021",
    obstacle: CLIENT_RENDERED,
  },
  {
    stateUsps: "WY",
    stateName: "Wyoming",
    attemptedUrl: "https://www.wyoleg.gov/statutes/compress/constitution.pdf",
    obstacle: PDF_ONLY,
  },
];

function unreadDeclaration(state: UnreadState): StateDeclaration {
  const reason = `No authority for ${state.stateName} was read for this domain: at ${state.attemptedUrl}, ${state.obstacle}.`;
  return {
    stateUsps: state.stateUsps,
    stateName: state.stateName,
    jurisdictionKey: `US-${state.stateUsps}`,
    legislatureMemberNouns: [],
    legislatureName: notRetrieved(reason),
    structure: notRetrieved(reason),
    chambers: [],
    unresolvedGaps: [
      {
        gapKind: "authority-not-retrieved",
        chamberKey: null,
        reason: `${reason} Nothing about ${state.stateName}'s legislature is claimed here, and nothing about it may be inferred from the states that were read.`,
      },
    ],
  };
}

/** All fifty states, sorted by USPS code so the corpus order is stable. */
export const STATE_DECLARATIONS: readonly StateDeclaration[] = [
  ...SOURCED,
  ...UNREAD.map(unreadDeclaration),
].sort((left, right) => (left.stateUsps < right.stateUsps ? -1 : 1));
