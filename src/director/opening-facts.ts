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
} as const;

/** What separates the parts of the address in its recorded `address:parts` fact. */
export const ADDRESS_PART_BREAK = "\n\n";

/** One policy question the President spoke on in the address, as a hearer can raise it. */
export interface AddressPoint {
  /** The bill catalog's question. */
  readonly question: string;
  /** The question as a noun phrase, as the address worded it ("a higher minimum wage"). */
  readonly about: string;
  /** What the President would do, as a verb phrase ("raise the minimum wage"). */
  readonly to: string;
  /** Whether the President is for it or against it. */
  readonly stance: "for" | "against";
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

/**
 * The address's points: one row for each policy question the President spoke
 * on (the sentences whose source ids name `question:<question>`), in the
 * address's order, with what the address said of it. `about` and `to` are the
 * words the sentences filled in; where no sentence on the question said one,
 * the stand's own words, which every sentence of its block carries, stand in.
 * A question whose side no sentence records is left out.
 */
export function addressPoints(opening: {
  readonly address: { readonly sentences: readonly PointSentence[] };
}): AddressPoint[] {
  const rows = new Map<
    string,
    {
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
    if (!question) continue;
    const row = rows.get(question) ?? { ids: new Set<string>() };
    rows.set(question, row);
    row.about ??= sentence.values.about ?? sentence.stand?.about;
    row.to ??= sentence.values.to ?? sentence.stand?.to;
    row.stance ??= sentence.facts.includes("stance-for")
      ? "for"
      : sentence.facts.includes("stance-against")
        ? "against"
        : sentence.stand?.stance;
    for (const id of sentence.sourceRecordIds) row.ids.add(id);
  }
  return [...rows].flatMap(([question, row]) =>
    row.about && row.to && row.stance
      ? [
          {
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
