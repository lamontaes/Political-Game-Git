/**
 * An address as its record keeps it (owner, Nov 16: every line registered
 * and traceable, "there can be no leftovers"; the lead, Nov 16: a speech
 * that was given is a record of what was said). The one writer
 * (`composeBlocks`, src/director/opening-story.ts) composes the address once,
 * on its day, and the record keeps each sentence as the bank pieces it was
 * joined from, the facts each slot said and the records those facts came
 * from. Every view of it (the address scene, the line a hearer quotes, the
 * paper, dev mode's "why each part") says it through `sentenceText` here,
 * so the words never change after it was given and never differ by who reads
 * them.
 */
import {
  OPENING_SPEECH_BANK,
  type OpeningLevel,
} from "../english/english-opening-speech";
import type { PartTie } from "../english/bank-parts";
import { ADDRESS_FACT } from "./opening-facts";
import { P } from "../core2/parameters";
import type { CoreState } from "../core2/types";
import { markWordsStopgap } from "./stopgaps";

/** One sentence of an address, as its record keeps it. */
export interface SaidSentence {
  /** The part of the address it is said in, one per Continue. */
  readonly part: number;
  readonly level: OpeningLevel;
  /** The bank pieces it was joined from, by key, in order. */
  readonly pieces: readonly string[];
  /** What each slot said, the name or figure as the sentence said it. */
  readonly values: Readonly<Record<string, string>>;
  /** A slot's bare name, said where the sentence follows it with a comma or a possessive. */
  readonly bare?: Readonly<Record<string, string>>;
  /** Each piece's tie (stand, place, law, record, frame), in the order of `pieces`. */
  readonly ties: readonly (PartTie | null)[];
  /** The records the sentence's facts came from. */
  readonly sources: readonly string[];
}

const TEXT_OF = new Map(
  OPENING_SPEECH_BANK.parts.map((part) => [part.key, part.text] as const),
);
const USES_OF = new Map(
  OPENING_SPEECH_BANK.parts.map((part) => [part.key, part.uses] as const),
);
const SLOT = /\{([\w-]+)\}/g;

/**
 * One sentence in words, from its pieces and the facts its slots said: each
 * piece filled and joined in order, a sentence begun with a capital and a
 * piece after a full stop too. A comma that ends a piece stays ("Because I
 * hold that ...,"); a comma before a closing mark goes, as an appositive's
 * does ("Jose Salgado, the town clerk,").
 */
export function sentenceText(
  sentence: Pick<SaidSentence, "pieces" | "values" | "bare">,
): string {
  let text = "";
  for (const key of sentence.pieces) {
    const template = TEXT_OF.get(key);
    if (template === undefined) continue;
    const filled = template.replace(
      SLOT,
      (slot, name: string, at: number, whole: string) =>
        sentence.bare?.[name] !== undefined &&
        /[,'’]/.test(whole.charAt(at + slot.length))
          ? sentence.bare[name]!
          : (sentence.values[name] ?? ""),
    );
    const piece =
      !text || /[.!?]["”]?$/.test(text)
        ? filled.charAt(P.zero).toUpperCase() + filled.slice(P.one)
        : filled;
    text = text ? `${text} ${piece}` : piece;
  }
  return text.replace(/,+(?=[.!?;:)"”])/g, "");
}

/**
 * The record of a composed address's sentences, each piece's tie read from the
 * bank's use for this kind of speech.
 */
export function saidFact(
  kind: string,
  /** The address's points: the belief wording each said, filled into a sentence's {belief} slot. */
  points: readonly { readonly belief: { readonly piece: string } | null }[],
  sentences: readonly {
    readonly part: number;
    readonly level: OpeningLevel;
    readonly pieces: readonly string[];
    readonly values: Readonly<Record<string, string>>;
    readonly bare?: Readonly<Record<string, string>>;
    readonly sourceRecordIds: readonly string[];
  }[],
): string {
  const said: Said = {
    sentences: sentences.map((row): SaidSentence => ({
      part: row.part,
      level: row.level,
      pieces: row.pieces,
      values: row.values,
      ...(row.bare && Object.keys(row.bare).length ? { bare: row.bare } : {}),
      ties: row.pieces.map(
        (key) =>
          USES_OF.get(key)?.find((use) => use.subject === kind)?.tie ??
          USES_OF.get(key)?.[P.zero]?.tie ??
          null,
      ),
      sources: row.sourceRecordIds,
    })),
    beliefPieces: points.flatMap((row) =>
      row.belief ? [row.belief.piece] : [],
    ),
  };
  return JSON.stringify(said);
}

/** What an address's record keeps of what was said. */
interface Said {
  readonly sentences: readonly SaidSentence[];
  /** The belief wordings its points said (the {belief} slots' own pieces), read by later addresses so they say other words. */
  readonly beliefPieces: readonly string[];
}

function saidRecord(
  facts: Readonly<Record<string, unknown>> | undefined,
): Said | null {
  const said = facts?.[ADDRESS_FACT.said];
  return typeof said === "string" && said ? (JSON.parse(said) as Said) : null;
}

/** The address's sentences as its record keeps them; empty where it keeps none. */
export function saidOf(
  facts: Readonly<Record<string, unknown>> | undefined,
): readonly SaidSentence[] {
  return saidRecord(facts)?.sentences ?? [];
}

/**
 * The bank pieces a speaker said in the addresses on the record before this
 * one, oldest first, from each address's own record of what was said: the one
 * writer of every address reads them so a voice prefers a wording it has not
 * used lately, and says the one used longest ago when every fitting wording
 * has been said (no dice; owner, Nov 12: the same sentence in address after
 * address). Read once an address is composed, a few times a year.
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
        !!row.facts?.[ADDRESS_FACT.said],
    )
    .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id))
    .flatMap((row) => {
      const said = saidRecord(row.facts)!;
      return [
        ...said.sentences.flatMap((sentence) => sentence.pieces),
        ...said.beliefPieces,
      ];
    });
}

/**
 * The address's parts in words, one per Continue. A governor's or a town's
 * greeting is never a part of its own, it joins the next; the President's
 * opening paragraph is its own part, whatever it holds (owner, Oct 28
 * sitting, 11 and 41: the opening paragraph, the country's story, the close).
 */
export function partsOf(
  sentences: readonly Pick<
    SaidSentence,
    "part" | "level" | "pieces" | "values" | "bare"
  >[],
  greetingAlone = false,
): string[] {
  const parts = [...new Set(sentences.map((row) => row.part))].map((part) =>
    sentences.filter((row) => row.part === part),
  );
  const out: string[] = [];
  let carried = "";
  for (const rows of parts) {
    const text = [carried, ...rows.map((row) => sentenceText(row))]
      .filter(Boolean)
      .join(" ");
    if (!greetingAlone && rows.every((row) => row.level === "salutation"))
      carried = text;
    else {
      out.push(text);
      carried = "";
    }
  }
  if (carried) out.push(carried);
  return out;
}

/** An address's parts in words, from its record. */
export function addressPartsOf(
  facts: Readonly<Record<string, unknown>> | undefined,
): string[] {
  return partsOf(saidOf(facts), !!facts?.[ADDRESS_FACT.president]);
}

/** The line of the address a hearer can quote, in words; null where the record keeps none. */
export function rememberedOf(
  facts: Readonly<Record<string, unknown>> | undefined,
): string | null {
  const at = Number(facts?.[ADDRESS_FACT.rememberedAt]);
  const sentence = Number.isInteger(at) ? saidOf(facts)[at] : undefined;
  return sentence ? sentenceText(sentence) : null;
}
