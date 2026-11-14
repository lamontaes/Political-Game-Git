import type { CoreState } from "../core2/types";
import { markWordsStopgap } from "./stopgaps";
import { yearClaimAbout } from "../english/question-names";

/**
 * The knowledge keys the President's opening address is recorded with: the
 * event's facts, which the news engine teaches everyone who hears the story
 * and the core teaches everyone who saw it.
 */
export const ADDRESS_FACT = {
  event: "address:event",
  /** The offices engine's inauguration record the address was given at. */
  inauguration: "address:inauguration",
  president: "address:president",
  /** Whoever gave the address: the President, a governor or a mayor. */
  speaker: "address:speaker",
  kind: "address:kind",
  /** The kind it took (crisis, combative, hopeful, victory, mourning, policy): what the world and the speaker gave it to say. */
  style: "address:style",
  opening: "address:opening",
  remembered: "address:remembered",
  text: "address:text",
  /** The address in its parts, one per Continue, split by ADDRESS_PART_BREAK. */
  parts: "address:parts",
  /** A governor's or mayor's address: its first stand, in its own words, and the speaker's side on it. */
  pointAbout: "address:point-about",
  pointStance: "address:point-stance",
  /** The bank pieces the address was said with, in order, split by a space: what its speaker's later addresses read so they say other words. */
  pieces: "address:pieces",
  /** The speaker's office as the said-as words key it ("governor", "county-board:presiding"): the nameplate says them by it ("Chair Sara Mullen"). */
  office: "address:office",
} as const;

/**
 * The bank pieces a speaker said in the addresses on the record before this
 * one, oldest first: the one writer of every address reads them so a voice
 * prefers a wording it has not used lately, and says the one used longest
 * ago when every fitting wording has been said (no dice; owner, Nov 12: the
 * same sentence in address after address). Read once an address is composed,
 * a few times a year.
 */
export function earlierAddressPieces(
  core: CoreState,
  /** One speaker's addresses; left out, every address in the world (the frames a governor said are not said again by the town's head). */
  speakerId?: string,
): string[] {
  // stopgapId: SG-WORDS-address-pieces-log-scan
  markWordsStopgap("SG-WORDS-address-pieces-log-scan");
  return [...core.durableLog.values()]
    .filter(
      (row) =>
        // Before today, so the day's own address, once recorded, composes
        // the same again (composed from records, the same every time).
        row.date < core.date &&
        (speakerId === undefined ||
          row.facts?.[ADDRESS_FACT.speaker] === speakerId) &&
        !!row.facts?.[ADDRESS_FACT.pieces],
    )
    .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id))
    .flatMap((row) => row.facts![ADDRESS_FACT.pieces]!.split(" "));
}

/** The pieces an address's sentences were said with, as its record keeps them. */
export function addressPiecesFact(
  sentences: readonly { readonly pieces: readonly string[] }[],
  points: readonly { readonly belief: { readonly piece: string } | null }[],
): string {
  return [
    ...sentences.flatMap((row) => row.pieces),
    ...points.flatMap((row) => (row.belief ? [row.belief.piece] : [])),
  ].join(" ");
}

/** What separates the parts of the address in its recorded `address:parts` fact. */
export const ADDRESS_PART_BREAK = "\n\n";

/**
 * One point of the address a hearer can raise: a policy question the
 * President spoke on (`policy`), or something the address said about the
 * country's year, a claim on work, pay, prices, rent or growth (`year`).
 */
export interface AddressPoint {
  readonly kind: "policy" | "year";
  /** The bill catalog's question, or `year:<claim>` for a claim about the year. */
  readonly question: string;
  /** The claim fact a `year` point stands on ("prices-up"). */
  readonly claim?: string;
  /** The point as a noun phrase, as the address worded it ("a higher minimum wage", "prices still going up"). */
  readonly about: string;
  /** What the President would do, as a verb phrase ("raise the minimum wage"); empty for a year point. */
  readonly to: string;
  /** Whether the President is for it or against it; a year point has no stance to stand against. */
  readonly stance?: "for" | "against";
  /** The ids the address's sentences on it stand on. */
  readonly sourceRecordIds: readonly string[];
}

/** The sentence shape `addressPoints` reads: the opening story's address sentences. */
interface PointSentence {
  readonly facts: readonly string[];
  readonly values: Readonly<Record<string, string>>;
  readonly sourceRecordIds: readonly string[];
  readonly stand?: {
    readonly about: string;
    readonly to: string;
    readonly stance: "for" | "against";
  };
}

const QUESTION_ID = /^question:(?<question>.+)$/;
const YEAR = "year:";

/**
 * The address's points, in the address's order. One row for each policy
 * question the President spoke on (the sentences whose source ids name
 * `question:<question>`), with what the address said of it: `about` and `to`
 * are the words the sentences filled in, and where no sentence on the
 * question said one, the stand's own words, which every sentence of its
 * block carries, stand in; a question whose side no sentence records is left
 * out. And one row for each claim the address made about the country's year
 * (a sentence whose facts name a claim on work, pay, prices, rent or growth,
 * worded in data/english/year-claims.json), which the President states rather
 * than proposes, so it has no stance. Most federal questions give a President
 * no stand yet, so an address often names one policy point; its year gives
 * the rest.
 */
export function addressPoints(opening: {
  readonly address: { readonly sentences: readonly PointSentence[] };
}): AddressPoint[] {
  const rows = new Map<
    string,
    {
      claim?: string;
      about?: string;
      to?: string;
      stance?: "for" | "against";
      ids: Set<string>;
    }
  >();
  for (const sentence of opening.address.sentences) {
    const question = sentence.sourceRecordIds
      .map((id) => QUESTION_ID.exec(id)?.groups?.question)
      .find(Boolean);
    const claim = question
      ? undefined
      : sentence.facts.find((key) => !!yearClaimAbout(key));
    const key = question ?? (claim ? `${YEAR}${claim}` : undefined);
    if (!key) continue;
    const row = rows.get(key) ?? { ids: new Set<string>() };
    rows.set(key, row);
    for (const id of sentence.sourceRecordIds) row.ids.add(id);
    if (claim) {
      row.claim = claim;
      row.about ??= yearClaimAbout(claim)!;
      continue;
    }
    row.about ??= sentence.values.about ?? sentence.stand?.about;
    row.to ??= sentence.values.to ?? sentence.stand?.to;
    row.stance ??= sentence.facts.includes("stance-for")
      ? "for"
      : sentence.facts.includes("stance-against")
        ? "against"
        : sentence.stand?.stance;
  }
  return [...rows].flatMap(([question, row]): AddressPoint[] =>
    row.claim && row.about
      ? [
          {
            kind: "year",
            question,
            claim: row.claim,
            about: row.about,
            to: "",
            sourceRecordIds: [...row.ids],
          },
        ]
      : row.about && row.to && row.stance
        ? [
            {
              kind: "policy",
              question,
              about: row.about,
              to: row.to,
              stance: row.stance,
              sourceRecordIds: [...row.ids],
            },
          ]
        : [],
  );
}
