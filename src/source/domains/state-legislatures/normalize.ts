/**
 * Turning declarations into records, and refusing to when the evidence does not
 * say what the declaration says.
 *
 * The compiler's whole job is to be unconvinced, and it now has to be
 * unconvinced twice. First the excerpt: for each declared fact it goes back to
 * the enacted text the lock pins and refuses unless the quoted provision is
 * literally there. Then the proposition: the sentence has to actually state the
 * thing being claimed, under the closed proof the declaration named.
 *
 * That second check exists because an independent adversarial pass broke the
 * first one on its own. "The Senate has a membership of 40 Senators elected for
 * 4-year terms, 20 to begin every 2 years" contains the number twenty, so a
 * search-for-the-value check let California's Senate be declared at twenty
 * seats out of a real quotation. "Senators shall be chosen by single districts"
 * contains an election word, so it proved Minnesota senators elected when it is
 * a districting rule. Removing the one-member-per-district premise from
 * Illinois left 118 standing, because 118 still appeared in the other
 * transcription.
 *
 * So a seat count is not searched for. The membership clause following the
 * chamber's own name is parsed, the number it states is read out, and that
 * number is compared with the claim; a cohort size elsewhere in the sentence is
 * not the membership. An election claim needs a clause naming who is elected
 * and, where the sentence says who does the electing, an electorate doing it —
 * districts are not an electorate. A derivation names every premise it needs,
 * and losing one loses the fact.
 *
 * A defect stops the compile. There is no path where a Californian seat count
 * quietly becomes UNKNOWN because its page changed: either the evidence is
 * there or the build says which state, which chamber and which sentence.
 */

import { known, unknown } from "../../core/index";
import type { Evidence, Sourced } from "../../core/index";
import { stateLegislatureSource } from "./acquisition";
import { containsExcerpt, normalizeRetrievedText } from "./text";
import { isDeclaredFact, STATE_DECLARATIONS } from "./declarations";
import type {
  ChamberDeclaration,
  Declared,
  DeclaredFact,
  DirectProof,
  InvestigatedRelevance,
  StateDeclaration,
  Transcription,
} from "./declarations";
import type { ChamberIdentity, StateLegislatureIdentity } from "./types";

export interface NormalizationDefect {
  readonly stateUsps: string;
  readonly message: string;
}

const ONES = [
  "zero",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
  "eleven",
  "twelve",
  "thirteen",
  "fourteen",
  "fifteen",
  "sixteen",
  "seventeen",
  "eighteen",
  "nineteen",
];
const TENS = [
  "",
  "",
  "twenty",
  "thirty",
  "forty",
  "fifty",
  "sixty",
  "seventy",
  "eighty",
  "ninety",
];

/**
 * Every spelling of a number a state instrument plausibly uses.
 *
 * Constitutions write "thirty-five", "one hundred twenty" and "one hundred and
 * twenty" in roughly equal measure, and Delaware writes "35". Kept because it
 * documents the vocabulary the cardinal reader below accepts.
 */
export function numeralSpellings(value: number): readonly string[] {
  if (!Number.isInteger(value) || value < 0 || value > 999) {
    return [String(value)];
  }
  const words = (n: number): readonly string[] => {
    if (n < 20) return [ONES[n] as string];
    if (n < 100) {
      const tens = TENS[Math.floor(n / 10)] as string;
      const rest = n % 10;
      if (rest === 0) return [tens];
      return [
        `${tens}-${ONES[rest] as string}`,
        `${tens} ${ONES[rest] as string}`,
      ];
    }
    const hundreds = `${ONES[Math.floor(n / 100)] as string} hundred`;
    const rest = n % 100;
    if (rest === 0) return [hundreds];
    return words(rest).flatMap((tail) => [
      `${hundreds} ${tail}`,
      `${hundreds} and ${tail}`,
    ]);
  };
  return [String(value), ...words(value)];
}

const ONE_VALUES = new Map(ONES.map((word, index) => [word, index] as const));
const TEN_VALUES = new Map(
  TENS.map((word, index) => [word, index * 10] as const).filter(
    ([word]) => word !== "",
  ),
);

/**
 * Read the number a sentence states at this position, or nothing.
 *
 * The direction matters. This reads the instrument's number out and hands it
 * back to be compared, rather than being told a number and hunting for it. A
 * position that does not begin with a cardinal — "not more than forty" — yields
 * nothing, which is exactly right, because a range states no membership.
 */
export function readLeadingCardinal(text: string): number | null {
  const trimmed = text.replace(/^[\s,]+/, "");
  const digits = /^(\d{1,3})(?!\d)/.exec(trimmed);
  if (digits) return Number(digits[1]);

  const tokens = trimmed.toLowerCase().split(/[\s-]+/);
  let total: number | null = null;
  let seenHundred = false;
  for (const raw of tokens) {
    const token = raw.replace(/[.,;:]+$/, "");
    if (token === "hundred") {
      if (total === null) break;
      total *= 100;
      seenHundred = true;
      continue;
    }
    if (token === "and") {
      if (!seenHundred) break;
      continue;
    }
    const ones = ONE_VALUES.get(token);
    const tens = TEN_VALUES.get(token);
    if (ones === undefined && tens === undefined) break;
    total = (total ?? 0) + (ones ?? tens ?? 0);
  }
  return total;
}

/**
 * The forms in which an instrument states a chamber's membership.
 *
 * Closed. A sentence mentioning a chamber and a number without one of these
 * connectives between them has not stated a membership.
 */
const MEMBERSHIP_CONNECTIVE =
  /(?:with|has|have|having)\s+a\s+membership\s+of\s+|(?:shall\s+be\s+|is\s+|are\s+|be\s+)?composed\s+of\s+|(?:shall\s+)?consists?\s+of\s+|consisting\s+of\s+/gi;

/** A count the instrument itself leaves open is not a count. */
const OPEN_ENDED = /\bplus\s+such\s+additional\b|\bin\s+addition\s+to\b/i;

function wordBoundaryPattern(term: string, flags = "i"): RegExp {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const leading = /^\w/.test(term) ? "\\b" : "";
  const trailing = /\w$/.test(term) ? "\\b" : "";
  return new RegExp(`${leading}${escaped}${trailing}`, flags);
}

function indexOfTerm(text: string, term: string): number {
  if (term.trim() === "") return -1;
  return text.search(wordBoundaryPattern(term));
}

/**
 * The membership this sentence states for this chamber, or nothing.
 *
 * The subject is located first, then the first membership connective after it,
 * then the number that connective introduces. California's Senate section
 * yields forty and never twenty, because twenty is not what "has a membership
 * of" introduces.
 */
export function membershipStatedFor(
  excerpt: string,
  chamberSubject: string,
): number | null {
  const subjectAt = indexOfTerm(excerpt, chamberSubject);
  if (subjectAt < 0) return null;
  const after = excerpt.slice(subjectAt + chamberSubject.length);
  MEMBERSHIP_CONNECTIVE.lastIndex = 0;
  const connective = MEMBERSHIP_CONNECTIVE.exec(after);
  if (!connective) return null;
  const tail = after.slice(connective.index + connective[0].length);
  const stated = readLeadingCardinal(tail);
  if (stated === null) return null;
  if (OPEN_ENDED.test(tail.slice(0, 80))) return null;
  return stated;
}

/** Verbs by which a member reaches a seat. */
const ELECTION_VERB = /\belect(?:ed|s|ing)?\b|\bchosen\b|\bchoose\b/gi;

/**
 * Who may do the electing.
 *
 * Matched at the start of the agent phrase and not anywhere inside it: "elected
 * by the qualified voters of the respective representative districts" is an
 * electorate electing, and "chosen by single districts" is a districting rule
 * that happens to contain a district word.
 */
const ELECTORATE_AGENT =
  /^(?:the\s+)?(?:qualified\s+|legal\s+)?(?:electors|voters|people|citizens|ballot)\b/i;

/** Whether a clause states that its subject reaches the seat by election. */
export function statesElection(clause: string): boolean {
  ELECTION_VERB.lastIndex = 0;
  let verb: RegExpExecArray | null;
  while ((verb = ELECTION_VERB.exec(clause)) !== null) {
    const isElectForm = /^elect/i.test(verb[0]);
    const after = clause.slice(verb.index + verb[0].length);
    const by = /\bby\s+/i.exec(after);
    if (!by) {
      /*
       * No agent named. "Members shall be elected for terms of two years" is a
       * statement that members are elected; "chosen for 4 years" is a statement
       * about a term and says nothing about how the seat is reached.
       */
      if (isElectForm) return true;
      continue;
    }
    if (ELECTORATE_AGENT.test(after.slice(by.index + by[0].length)))
      return true;
  }
  return false;
}

/** Connectives by which an instrument composes a body out of parts. */
const COMPOSITION =
  /\bvested\s+in\b|\bconsists?\b|\bconsisting\b|\bcomposed\b|\btwo\s+houses\b|\bnumber\s+of\s+members\s+of\b|\bmembership\s+of\b|\bdesignated\b/i;

/** The shapes an investigated provision must have to support its gap. */
const RELEVANCE_FORMS: Readonly<Record<InvestigatedRelevance, RegExp>> = {
  "delegates-to-other-provision":
    /\b(?:shall\s+be\s+|as\s+shall\s+be\s+|as\s+)?(?:provided|prescribed|fixed|determined)\s+(?:by\s+law|under)\b/i,
  "states-limit-only": /\bn(?:ot|or)\s+(?:more|less)\s+than\b/i,
  "composes-by-district-without-number":
    /\bcomposed\s+of\s+one\b|\bone\s+\w+\s+elected\s+from\s+each\b/i,
  "competing-provisions-unresolved": /\b(?:consists?|composed)\b/i,
};

/**
 * A pinpoint appropriate to the instrument.
 *
 * A citation is falsifiable only if a reader can go and look. "Official
 * publication 2026" names a publisher and a year and leaves nowhere to go; it
 * passed before this check, because the old rule only rejected citations that
 * both named an instrument and lacked a pinpoint.
 *
 * The numeral must follow the word: an earlier form accepted "legislative
 * article", because case-insensitive `[ivxlc]` matched the "i" of "icle".
 */
export function hasPinpointFor(
  instrumentKind: string,
  citation: string,
): boolean {
  const sectionSymbol = /§\s*\S/.test(citation);
  const numberedSection = /\bsec(?:tion|\.)?\s*\d/i.test(citation);
  const numberedArticle = /\bart(?:icle|\.)\s*(?:\d+|[ivxlc]+)\b/i.test(
    citation,
  );
  if (instrumentKind === "statute") {
    return sectionSymbol || numberedSection || /\b\d+\.\d+\b/.test(citation);
  }
  return sectionSymbol || numberedSection || numberedArticle;
}

/**
 * Whether a transcription is bound to a real, declared, right authority.
 *
 * Four independent bindings, because the independent audit defeated the old
 * single one — an artifact-id prefix — by relabelling a California record as
 * Kentucky and inventing a `ky-*` id to go with it. An id is a name a declarer
 * chooses; none of these is.
 *
 * The artifact must be one this domain declared it retrieved, so renamed or
 * repackaged material from an unaccepted research wave has no route in at all,
 * and the domain does not have to guess at every string such material might
 * arrive under. Its locked jurisdiction must be the record's own. Its locked
 * instrument title must be the title the citation claims. And the citation must
 * carry a locator a reader can follow.
 */
function transcriptionBindingFails(
  transcription: Transcription,
  declaration: StateDeclaration,
): string | null {
  const spec = stateLegislatureSource(transcription.artifactId);
  if (!spec) {
    return `cites artifact "${transcription.artifactId}", which is not in this domain's locked acquisition lineage. Evidence is admitted from the authorities this domain declared it retrieved and from nowhere else.`;
  }
  if (spec.jurisdictionKey !== declaration.jurisdictionKey) {
    return `cites ${transcription.citation} out of an instrument of ${spec.jurisdictionKey}, and this is the ${declaration.jurisdictionKey} record. A state's identity may rest only on its own instruments.`;
  }
  if (spec.instrumentTitle !== transcription.authorityTitle) {
    return `cites artifact "${transcription.artifactId}" as "${transcription.authorityTitle}", and the locked artifact is "${spec.instrumentTitle}". A citation that renames its own instrument is not bound to it.`;
  }
  if (!hasPinpointFor(spec.instrumentKind, transcription.citation)) {
    return `cites "${transcription.citation}", which names no article, section or statutory locator inside a ${spec.instrumentKind}. A citation without a pinpoint cannot be checked.`;
  }
  return null;
}

function evidenceOf(transcription: Transcription): Evidence {
  return {
    artifactId: transcription.artifactId,
    locator: {
      kind: "legal-section",
      artifactId: transcription.artifactId,
      citation: transcription.citation,
      pageOrSection: transcription.pageOrSection,
    },
  };
}

/** The artifact text a compile reads, by artifact id. */
export type ArtifactTextLookup = (artifactId: string) => string | null;

/** Build a lookup over already-opened bytes. */
export function artifactTextLookup(
  bytesById: ReadonlyMap<string, Uint8Array>,
): ArtifactTextLookup {
  const cache = new Map<string, string>();
  return (artifactId) => {
    const cached = cache.get(artifactId);
    if (cached !== undefined) return cached;
    const bytes = bytesById.get(artifactId);
    if (!bytes) return null;
    const text = normalizeRetrievedText(bytes);
    cache.set(artifactId, text);
    return text;
  };
}

/** What a proof may look at besides its own excerpt. */
interface ProofContext {
  readonly declaration: StateDeclaration;
  readonly chamber: ChamberDeclaration | null;
}

function declaredNameOf(chamber: ChamberDeclaration): string | null {
  return isDeclaredFact(chamber.name) ? chamber.name.value : null;
}

function chamberNames(declaration: StateDeclaration): readonly string[] {
  return declaration.chambers
    .map(declaredNameOf)
    .filter((name): name is string => name !== null);
}

function sameNameSet(
  declared: readonly string[],
  claimed: readonly string[],
): boolean {
  if (declared.length !== claimed.length) return true;
  const left = declared.map((name) => name.toLowerCase()).sort();
  const right = claimed.map((name) => name.toLowerCase()).sort();
  return left.every((name, index) => name === right[index]);
}

/**
 * Whether the words naming who is elected belong to this chamber.
 *
 * Three admissible bindings, all explicit: the subject carries one of the
 * chamber's declared member nouns; or the chamber's own name stands in the
 * clause ahead of the subject; or the proof declared the subject to name the
 * whole legislature's membership, which covers a chamber only where an
 * established structure says the chambers are the legislature.
 */
function subjectBindsToChamber(
  proof: Extract<DirectProof, { kind: "chamber-members-elected" }>,
  context: ProofContext,
): string | null {
  const { declaration, chamber } = context;
  if (proof.subjectScope === "whole-legislature") {
    const named = declaration.legislatureMemberNouns.some((noun) =>
      wordBoundaryPattern(noun).test(proof.subject),
    );
    if (!named) {
      return `names "${proof.subject}" as every legislator, and that is none of the terms this state declares for them.`;
    }
    if (!isDeclaredFact(declaration.structure)) {
      return `names "${proof.subject}" as every legislator, but this state's structure is UNKNOWN, so there is no established set of chambers for that to cover.`;
    }
    return null;
  }
  if (!chamber) {
    return "is a chamber election proof outside any chamber.";
  }
  if (
    chamber.memberNouns.some((noun) =>
      wordBoundaryPattern(noun).test(proof.subject),
    )
  ) {
    return null;
  }
  const name = declaredNameOf(chamber);
  if (name) {
    const nameAt = indexOfTerm(proof.clause, name);
    const subjectAt = indexOfTerm(proof.clause, proof.subject);
    if (nameAt >= 0 && subjectAt >= 0 && nameAt <= subjectAt) return null;
  }
  return `rests on "${proof.subject}", which is neither one of chamber "${chamber.chamberKey}"'s declared member nouns nor preceded by the chamber's name in the clause. The sentence is not bound to this chamber.`;
}

/**
 * Whether one DIRECT proof holds against one excerpt.
 *
 * Returns null when it holds, and the reason when it does not.
 */
function directProofFails<T>(
  value: T,
  proof: DirectProof,
  excerpt: string,
  context: ProofContext,
): string | null {
  switch (proof.kind) {
    case "instrument-vests-legislature-named": {
      const vested = /\bvested\s+in\b/i.exec(excerpt);
      if (!vested) {
        return "claims the instrument names the legislature, and the provision quoted vests legislative power in nothing.";
      }
      const window = excerpt.slice(vested.index, vested.index + 200);
      if (indexOfTerm(window, String(value)) < 0) {
        return `claims the legislature is named "${String(value)}", which is not the body the quoted provision vests legislative power in.`;
      }
      return null;
    }
    case "instrument-names-chamber": {
      if (indexOfTerm(excerpt, String(value)) < 0) {
        return `claims the chamber is named "${String(value)}", and the quoted provision does not use that name.`;
      }
      if (!COMPOSITION.test(excerpt)) {
        return `names a chamber out of a provision that composes nothing. A sentence merely containing "${String(value)}" does not establish a chamber.`;
      }
      return null;
    }
    case "legislature-composed-of-chambers": {
      const [first, second] = proof.chamberTerms;
      if (first.toLowerCase() === second.toLowerCase()) {
        return "composes the legislature of one chamber named twice.";
      }
      for (const term of proof.chamberTerms) {
        if (indexOfTerm(excerpt, term) < 0) {
          return `composes the legislature of "${term}", which the quoted provision does not name.`;
        }
      }
      if (!COMPOSITION.test(excerpt)) {
        return "names two chambers out of a provision that composes nothing.";
      }
      if (!sameNameSet(chamberNames(context.declaration), proof.chamberTerms)) {
        return `composes the legislature of ${JSON.stringify(proof.chamberTerms)} while the record carries chambers ${JSON.stringify(chamberNames(context.declaration))}.`;
      }
      return null;
    }
    case "legislature-single-chamber": {
      if (!/\bone\s+chamber\b|\bunicameral\b/i.test(excerpt)) {
        return "claims a single-chamber legislature out of a provision that does not say so.";
      }
      if (!COMPOSITION.test(excerpt)) {
        return "claims a single-chamber legislature out of a provision that composes nothing.";
      }
      return null;
    }
    case "chamber-membership-count": {
      const chamber = context.chamber;
      const name = chamber ? declaredNameOf(chamber) : null;
      if (
        name !== null &&
        name.toLowerCase() !== proof.chamberSubject.toLowerCase()
      ) {
        return `proves a membership for "${proof.chamberSubject}" while the chamber it belongs to is named "${name}".`;
      }
      const stated = membershipStatedFor(excerpt, proof.chamberSubject);
      if (stated === null) {
        return `claims ${String(value)} seats, and the quoted provision states no membership for "${proof.chamberSubject}". A number occurring in the sentence is not a membership.`;
      }
      if (stated !== value) {
        return `claims ${String(value)} seats, and the quoted provision states a membership of ${stated} for "${proof.chamberSubject}".`;
      }
      return null;
    }
    case "chamber-members-elected": {
      if (value !== true) {
        return "uses an election proof to claim members are not elected, which no provision here can establish.";
      }
      if (!containsExcerpt(excerpt, proof.clause)) {
        return `relies on a clause that is not part of the provision it quotes: "${proof.clause.slice(0, 60)}…".`;
      }
      if (indexOfTerm(proof.clause, proof.subject) < 0) {
        return `names "${proof.subject}" as who is elected, and that does not appear in the clause it relies on.`;
      }
      const unbound = subjectBindsToChamber(proof, context);
      if (unbound) return unbound;
      if (!statesElection(proof.clause)) {
        return `rests on "${proof.clause.slice(0, 70)}…", in which nobody is elected and no electorate chooses anyone. Districting language is not election proof.`;
      }
      return null;
    }
  }
}

/**
 * Whether a DERIVED fact's premises are all present and all do their work.
 *
 * Every kind checks each premise separately. There is no path where one
 * transcription containing the answer carries a derivation on its own.
 */
function derivationFails<T>(
  value: T,
  declared: DeclaredFact<T>,
  context: ProofContext,
): string | null {
  const kind = declared.derivationKind;
  if (!kind) return "is DERIVED and names no derivation kind.";
  const excerpts = declared.transcriptions.map(
    (transcription) => transcription.excerpt,
  );

  switch (kind.kind) {
    case "seats-equal-one-member-per-district": {
      if (typeof value !== "number") {
        return "derives a seat count that is not a number.";
      }
      const districts = new RegExp(
        `\\b${String(value)}\\s+${kind.districtSubject.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`,
        "i",
      );
      if (!excerpts.some((excerpt) => districts.test(excerpt))) {
        return `derives ${String(value)} seats from ${String(value)} ${kind.districtSubject}, and no provision it quotes fixes that number of districts.`;
      }
      if (
        !excerpts.some((excerpt) =>
          containsExcerpt(excerpt, kind.perDistrictClause),
        )
      ) {
        return `derives ${String(value)} seats from one member per district, and no provision it quotes contains the clause "${kind.perDistrictClause.slice(0, 60)}…" establishing that.`;
      }
      const singular = kind.districtSubject.replace(/s$/i, "");
      if (
        !/\bone\b/i.test(kind.perDistrictClause) ||
        !/\bfrom\s+each\b/i.test(kind.perDistrictClause) ||
        indexOfTerm(kind.perDistrictClause, singular) < 0
      ) {
        return `derives ${String(value)} seats from a clause that does not elect one member from each ${singular}. Without that premise a district count is not a seat count.`;
      }
      return null;
    }
    case "election-by-district-electors": {
      if (value !== true) {
        return "uses an election derivation to claim members are not elected.";
      }
      if (!excerpts.some((excerpt) => containsExcerpt(excerpt, kind.clause))) {
        return `derives election from a clause no provision it quotes contains: "${kind.clause.slice(0, 60)}…".`;
      }
      if (indexOfTerm(kind.clause, kind.subject) < 0) {
        return `names "${kind.subject}" as who is chosen, and that does not appear in the clause it relies on.`;
      }
      const chamber = context.chamber;
      if (
        chamber &&
        !chamber.memberNouns.some((noun) =>
          wordBoundaryPattern(noun).test(kind.subject),
        )
      ) {
        const name = declaredNameOf(chamber);
        if (!name || indexOfTerm(kind.clause, name) < 0) {
          return `derives election for chamber "${chamber.chamberKey}" from a clause about "${kind.subject}", which is neither one of its declared member nouns nor its name.`;
        }
      }
      if (!statesElection(kind.clause)) {
        return `derives election from "${kind.clause.slice(0, 70)}…", in which no electorate chooses anyone.`;
      }
      return null;
    }
    case "two-chambers-composed-separately": {
      if (declared.transcriptions.length !== 2) {
        return `derives two chambers from ${declared.transcriptions.length} provision(s); this derivation composes each chamber in its own provision.`;
      }
      const [firstTerm, secondTerm] = kind.chamberTerms;
      if (firstTerm.toLowerCase() === secondTerm.toLowerCase()) {
        return "derives two chambers that are the same chamber named twice.";
      }
      const composes = (term: string): number =>
        excerpts.findIndex(
          (excerpt) =>
            indexOfTerm(excerpt, term) >= 0 && COMPOSITION.test(excerpt),
        );
      const firstAt = composes(firstTerm);
      const secondAt = composes(secondTerm);
      if (firstAt < 0) {
        return `derives two chambers, and no provision it quotes composes "${firstTerm}".`;
      }
      if (secondAt < 0) {
        return `derives two chambers, and no provision it quotes composes "${secondTerm}".`;
      }
      if (firstAt === secondAt) {
        return "derives two chambers out of one provision. A provision composing both is a DIRECT fact, not this derivation.";
      }
      if (!sameNameSet(chamberNames(context.declaration), kind.chamberTerms)) {
        return `derives chambers ${JSON.stringify(kind.chamberTerms)} while the record carries ${JSON.stringify(chamberNames(context.declaration))}.`;
      }
      return null;
    }
  }
}

interface Resolver {
  readonly lookup: ArtifactTextLookup;
  readonly asOf: string;
  readonly defects: NormalizationDefect[];
  readonly stateUsps: string;
}

/**
 * Resolve one declared fact against the evidence.
 *
 * The excerpt search proves the sentence is on the page; the proof proves the
 * sentence is about the value. They are separate on purpose, because the
 * dangerous declaration is the one that passes the first and fails the second —
 * a real quotation attached to a number nobody read.
 */
function resolve<T>(
  resolver: Resolver,
  label: string,
  declared: Declared<T>,
  context: ProofContext,
): Sourced<T> {
  const fail = (message: string): Sourced<T> => {
    resolver.defects.push({ stateUsps: resolver.stateUsps, message });
    return unknown<T>(message);
  };

  if (!isDeclaredFact(declared)) {
    const investigated = declared.investigated ?? [];
    const basis = declared.basis;
    if (!basis) {
      return fail(`${label} is UNKNOWN and declares no basis for being so.`);
    }
    if (basis.kind === "authority-not-retrieved") {
      if (investigated.length > 0) {
        return fail(
          `${label} is UNKNOWN because the authority was not retrieved, and still cites ${investigated.length} provision(s) it read. One of those two statements is untrue.`,
        );
      }
    } else {
      if (investigated.length === 0) {
        return fail(
          `${label} is UNKNOWN because a provision it read does not fix the value, and cites no provision. A claim about what an instrument says has to produce the instrument.`,
        );
      }
      const form = RELEVANCE_FORMS[basis.relevance];
      for (const transcription of investigated) {
        if (!form.test(transcription.excerpt)) {
          return fail(
            `${label} offers ${transcription.citation} as a "${basis.relevance}" provision and its text has no such form. An unrelated provision, however accurately quoted, is not evidence about this gap.`,
          );
        }
      }
      if (
        basis.relevance === "competing-provisions-unresolved" &&
        investigated.length < 2
      ) {
        return fail(
          `${label} is UNKNOWN for competing provisions and cites one. One provision competes with nothing.`,
        );
      }
    }
    for (const transcription of investigated) {
      const unbound = transcriptionBindingFails(
        transcription,
        context.declaration,
      );
      if (unbound) return fail(`${label} ${unbound}`);
      const text = resolver.lookup(transcription.artifactId);
      if (text === null || !containsExcerpt(text, transcription.excerpt)) {
        resolver.defects.push({
          stateUsps: resolver.stateUsps,
          message: `${label} is UNKNOWN citing ${transcription.citation} as the provision it read, and that text is not in the enacted text of artifact "${transcription.artifactId}". An investigated citation is evidence and is checked like one.`,
        });
      }
    }
    return unknown<T>(declared.unknownReason, investigated.map(evidenceOf));
  }

  if (declared.derivation === "DERIVED") {
    if (!declared.derivationChain?.trim()) {
      return fail(`${label} is DERIVED but states no derivation chain.`);
    }
    if (declared.proof !== null) {
      return fail(
        `${label} is DERIVED and also carries a DIRECT proof. A fact is read one way or the other.`,
      );
    }
  } else {
    if (declared.derivationChain !== null) {
      return fail(
        `${label} is DIRECT but carries a derivation chain. A chain describes reasoning across provisions and a DIRECT fact does none.`,
      );
    }
    if (declared.derivationKind !== null) {
      return fail(
        `${label} is DIRECT but names a derivation kind. A DIRECT fact derives nothing.`,
      );
    }
    if (declared.proof === null) {
      return fail(
        `${label} is DIRECT and names no proof, so nothing says how its provision establishes it.`,
      );
    }
  }

  for (const transcription of declared.transcriptions) {
    const unbound = transcriptionBindingFails(
      transcription,
      context.declaration,
    );
    if (unbound) return fail(`${label} ${unbound}`);
    const text = resolver.lookup(transcription.artifactId);
    if (text === null) {
      return fail(
        `${label} cites artifact "${transcription.artifactId}", which this compile did not open.`,
      );
    }
    if (!containsExcerpt(text, transcription.excerpt)) {
      return fail(
        `${label} quotes ${transcription.citation} as "${transcription.excerpt.slice(0, 80)}…", and that text is not in the enacted text of artifact "${transcription.artifactId}". The provision this repository read is not the provision on the page.`,
      );
    }
  }

  if (declared.derivation === "DERIVED") {
    const failure = derivationFails(declared.value, declared, context);
    if (failure) return fail(`${label} ${failure}`);
  } else {
    const proof = declared.proof as DirectProof;
    const failures = declared.transcriptions.map((transcription) =>
      directProofFails(declared.value, proof, transcription.excerpt, context),
    );
    if (failures.every((failure) => failure !== null)) {
      return fail(`${label} ${failures[0] as string}`);
    }
  }

  return known(
    declared.value,
    declared.transcriptions.map(evidenceOf),
    "FINAL",
    resolver.asOf,
  );
}

function normalizeState(
  declaration: StateDeclaration,
  lookup: ArtifactTextLookup,
  asOf: string,
  defects: NormalizationDefect[],
): StateLegislatureIdentity {
  const resolver: Resolver = {
    lookup,
    asOf,
    defects,
    stateUsps: declaration.stateUsps,
  };
  const jurisdictionKey = `US-${declaration.stateUsps}`;
  if (declaration.jurisdictionKey !== jurisdictionKey) {
    defects.push({
      stateUsps: declaration.stateUsps,
      message: `${declaration.stateUsps} declares jurisdiction key "${declaration.jurisdictionKey}", which is not its own.`,
    });
  }

  /*
   * Member nouns have to be disjoint, or the vocabulary binding a sentence to a
   * chamber binds it to both and proves nothing.
   */
  for (const chamber of declaration.chambers) {
    for (const other of declaration.chambers) {
      if (other.chamberKey === chamber.chamberKey) continue;
      for (const noun of chamber.memberNouns) {
        if (
          other.memberNouns.some(
            (theirs) => theirs.toLowerCase() === noun.toLowerCase(),
          )
        ) {
          defects.push({
            stateUsps: declaration.stateUsps,
            message: `${jurisdictionKey} gives member noun "${noun}" to both "${chamber.chamberKey}" and "${other.chamberKey}", so it binds a sentence to neither.`,
          });
        }
      }
    }
  }

  const chambers: ChamberIdentity[] = declaration.chambers
    .map((chamber) => {
      const context: ProofContext = { declaration, chamber };
      return {
        chamberKey: chamber.chamberKey,
        name: resolve(
          resolver,
          `${jurisdictionKey} ${chamber.chamberKey} name`,
          chamber.name,
          context,
        ),
        seatCount: resolve(
          resolver,
          `${jurisdictionKey} ${chamber.chamberKey} seatCount`,
          chamber.seatCount,
          context,
        ),
        membersElected: resolve(
          resolver,
          `${jurisdictionKey} ${chamber.chamberKey} membersElected`,
          chamber.membersElected,
          context,
        ),
      };
    })
    .sort((left, right) => (left.chamberKey < right.chamberKey ? -1 : 1));

  const stateContext: ProofContext = { declaration, chamber: null };
  return {
    recordId: jurisdictionKey,
    jurisdictionKey,
    stateUsps: declaration.stateUsps,
    stateName: declaration.stateName,
    legislatureName: resolve(
      resolver,
      `${jurisdictionKey} legislatureName`,
      declaration.legislatureName,
      stateContext,
    ),
    structure: resolve(
      resolver,
      `${jurisdictionKey} structure`,
      declaration.structure,
      stateContext,
    ),
    chambers,
    unresolvedGaps: declaration.unresolvedGaps,
  };
}

/**
 * Compile a given set of declarations against opened artifacts.
 *
 * Separate from the compiler below so an adversarial test can hand it a
 * declaration nobody would write on purpose — California's Senate at twenty
 * seats, Illinois' 118 with a premise removed — and watch it refuse. A proof
 * engine that can only be run over declarations already known to be good has
 * not been tested.
 */
export function normalizeDeclaredStates(
  declarations: readonly StateDeclaration[],
  lookup: ArtifactTextLookup,
  asOf: string,
): {
  readonly records: readonly StateLegislatureIdentity[];
  readonly defects: readonly NormalizationDefect[];
} {
  const defects: NormalizationDefect[] = [];
  const records = declarations.map((declaration) =>
    normalizeState(declaration, lookup, asOf, defects),
  );
  return { records, defects };
}

/** Compile every declared state against the artifacts a caller opened. */
export function normalizeStateLegislatures(
  lookup: ArtifactTextLookup,
  asOf: string,
): {
  readonly records: readonly StateLegislatureIdentity[];
  readonly defects: readonly NormalizationDefect[];
} {
  return normalizeDeclaredStates(STATE_DECLARATIONS, lookup, asOf);
}
