/**
 * Turning declarations into records, and refusing to when the evidence moved.
 *
 * The compiler's whole job is to be unconvinced. For each declared fact it goes
 * back to the bytes the lock pins, finds the excerpt, and then checks that the
 * excerpt actually carries the value being claimed: a seat count must appear in
 * its sentence as digits or as the English cardinal, a chamber name must appear
 * in the sentence naming it, and an `elected` claim must rest on a sentence
 * with an election word in it. A declaration that passes the excerpt search but
 * fails the value check is the dangerous case — a real quotation attached to a
 * number nobody read — and it is a defect, not a warning.
 *
 * A defect stops the compile. There is no path where a Californian seat count
 * quietly becomes UNKNOWN because its page changed: either the evidence is
 * there or the build says which state, which chamber and which sentence.
 */

import { known, unknown } from "../../core/index";
import type { Evidence, Sourced } from "../../core/index";
import { containsExcerpt, normalizeRetrievedText } from "./text";
import { isDeclaredFact, STATE_DECLARATIONS } from "./declarations";
import type { Declared, StateDeclaration, Transcription } from "./declarations";
import type {
  ChamberIdentity,
  LegislatureStructure,
  StateLegislatureIdentity,
} from "./types";

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
 * twenty" in roughly equal measure, and Delaware writes "35". All of them are
 * accepted; nothing else is, so a declaration claiming 118 out of a sentence
 * that says 108 fails.
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

/** Words that make a sentence a statement about members reaching a seat. */
const ELECTION_WORDS = ["elect", "chosen", "ballot", "voters", "electors"];

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

interface Resolver {
  readonly lookup: ArtifactTextLookup;
  readonly asOf: string;
  readonly defects: NormalizationDefect[];
  readonly stateUsps: string;
}

/**
 * Resolve one declared fact against the evidence.
 *
 * A DERIVED declaration must state its chain — the reasoning is the disclosure,
 * whether it spans two provisions or reads one provision a step further than
 * its literal words.
 *
 * `carries` is the value check: given the excerpt, does this sentence actually
 * say the thing being claimed? It is separate from the excerpt search on
 * purpose — the search proves the sentence is on the page, and `carries` proves
 * the sentence is about the value.
 */
function resolve<T>(
  resolver: Resolver,
  label: string,
  declared: Declared<T>,
  carries: (value: T, excerpt: string) => boolean,
): Sourced<T> {
  if (!isDeclaredFact(declared)) {
    const investigated = declared.investigated ?? [];
    for (const transcription of investigated) {
      const text = resolver.lookup(transcription.artifactId);
      if (text === null || !containsExcerpt(text, transcription.excerpt)) {
        resolver.defects.push({
          stateUsps: resolver.stateUsps,
          message: `${label} is UNKNOWN citing ${transcription.citation} as the provision it read, and that text is not in artifact "${transcription.artifactId}". An investigated citation is evidence and is checked like one.`,
        });
      }
    }
    return unknown<T>(declared.unknownReason, investigated.map(evidenceOf));
  }

  const fail = (message: string): Sourced<T> => {
    resolver.defects.push({ stateUsps: resolver.stateUsps, message });
    return unknown<T>(message);
  };

  if (declared.derivation === "DERIVED") {
    if (!declared.derivationChain?.trim()) {
      return fail(`${label} is DERIVED but states no derivation chain.`);
    }
  } else if (declared.derivationChain !== null) {
    return fail(
      `${label} is DIRECT but carries a derivation chain. A chain describes reasoning across provisions and a DIRECT fact does none.`,
    );
  }

  let carried = false;
  for (const transcription of declared.transcriptions) {
    const text = resolver.lookup(transcription.artifactId);
    if (text === null) {
      return fail(
        `${label} cites artifact "${transcription.artifactId}", which this compile did not open.`,
      );
    }
    if (!containsExcerpt(text, transcription.excerpt)) {
      return fail(
        `${label} quotes ${transcription.citation} as "${transcription.excerpt.slice(0, 80)}…", and that text is not in artifact "${transcription.artifactId}". The provision this repository read is not the provision on the page.`,
      );
    }
    if (carries(declared.value, transcription.excerpt)) carried = true;
  }
  /*
   * A DERIVED fact may be carried by the provisions together rather than by any
   * one of them — that is what deriving is. Virginia composes a Senate in one
   * section and a House of Delegates in the next, and neither sentence alone
   * says the legislature has two chambers.
   */
  if (!carried && declared.derivation === "DERIVED") {
    const joined = declared.transcriptions
      .map((transcription) => transcription.excerpt)
      .join(" ");
    if (carries(declared.value, joined)) carried = true;
  }
  if (!carried) {
    return fail(
      `${label} claims ${JSON.stringify(declared.value)}, but none of the ${declared.transcriptions.length} provision(s) it quotes says so.`,
    );
  }

  return known(
    declared.value,
    declared.transcriptions.map(evidenceOf),
    "FINAL",
    resolver.asOf,
  );
}

const carriesText = (value: string, excerpt: string): boolean =>
  excerpt.toLowerCase().includes(value.toLowerCase());

const carriesNumber = (value: number, excerpt: string): boolean => {
  const lower = excerpt.toLowerCase();
  return numeralSpellings(value).some((spelling) => lower.includes(spelling));
};

const carriesElection = (value: boolean, excerpt: string): boolean => {
  const lower = excerpt.toLowerCase();
  const stated = ELECTION_WORDS.some((word) => lower.includes(word));
  return value ? stated : false;
};

const carriesStructure = (
  value: LegislatureStructure,
  excerpt: string,
): boolean => {
  const lower = excerpt.toLowerCase();
  if (value === "unicameral") {
    return lower.includes("one chamber") || lower.includes("unicameral");
  }
  // Two chambers are stated either by naming both or by counting them.
  const names = [
    "senate",
    "house of representatives",
    "house of delegates",
    "assembly",
  ];
  const named = names.filter((name) => lower.includes(name)).length;
  return named >= 2 || lower.includes("two houses");
};

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

  const chambers: ChamberIdentity[] = declaration.chambers
    .map((chamber) => ({
      chamberKey: chamber.chamberKey,
      name: resolve(
        resolver,
        `${jurisdictionKey} ${chamber.chamberKey} name`,
        chamber.name,
        carriesText,
      ),
      seatCount: resolve(
        resolver,
        `${jurisdictionKey} ${chamber.chamberKey} seatCount`,
        chamber.seatCount,
        carriesNumber,
      ),
      membersElected: resolve(
        resolver,
        `${jurisdictionKey} ${chamber.chamberKey} membersElected`,
        chamber.membersElected,
        carriesElection,
      ),
    }))
    .sort((left, right) => (left.chamberKey < right.chamberKey ? -1 : 1));

  return {
    recordId: jurisdictionKey,
    jurisdictionKey,
    stateUsps: declaration.stateUsps,
    stateName: declaration.stateName,
    legislatureName: resolve(
      resolver,
      `${jurisdictionKey} legislatureName`,
      declaration.legislatureName,
      carriesText,
    ),
    structure: resolve(
      resolver,
      `${jurisdictionKey} structure`,
      declaration.structure,
      carriesStructure,
    ),
    chambers,
    unresolvedGaps: declaration.unresolvedGaps,
  };
}

/** Compile every declared state against the artifacts a caller opened. */
export function normalizeStateLegislatures(
  lookup: ArtifactTextLookup,
  asOf: string,
): {
  readonly records: readonly StateLegislatureIdentity[];
  readonly defects: readonly NormalizationDefect[];
} {
  const defects: NormalizationDefect[] = [];
  const records = STATE_DECLARATIONS.map((declaration) =>
    normalizeState(declaration, lookup, asOf, defects),
  );
  return { records, defects };
}
