import {
  questionAbout,
  questionTo,
  yearClaimAbout,
} from "../english/question-names";

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
  /** The address as said: each sentence's bank pieces, the facts its slots said, each piece's tie and the records behind them (address-render.ts `saidFact`). */
  said: "address:said",
  /** Which of those sentences a hearer can quote, by its place in the address from 0. */
  rememberedAt: "address:remembered-at",
  /** A governor's or mayor's address: its first stand, in its own words, and the speaker's side on it. */
  pointAbout: "address:point-about",
  pointStance: "address:point-stance",
  /** The clock minute of the day the address airs at the hearer's own place (the opening day's address only). */
  airsAtMinute: "address:airs-at-minute",
  /** The speaker's office as the said-as words key it ("governor", "county-board:presiding"): the nameplate says them by it ("Chair Sara Mullen"). */
  office: "address:office",
} as const;

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
  /** The points as the outline planned them: the record the sentences are a view of. */
  readonly points?: readonly {
    readonly question: string;
    readonly side: "for" | "against";
  }[];
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
  // The outline's own record of each point fills what the sentences left
  // out: a speech that only asks to be held to a question names no stance
  // or verb phrase in its sentence, but the plan that chose the point holds
  // the President's side, and the question's names hold the rest (owner,
  // Oct 28: every view reads the same record; the sentences are a view of
  // the plan, not a second source for it).
  // Only a point the speech said aloud is one a listener can raise: a planned
  // point no sentence names is not in the address.
  for (const planned of opening.points ?? []) {
    const row = rows.get(planned.question);
    if (!row) continue;
    row.about ??= questionAbout(planned.question) ?? undefined;
    row.to ??= questionTo(planned.question) ?? undefined;
    row.stance ??= planned.side;
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
