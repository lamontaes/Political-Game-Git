/**
 * What the town knows of a public figure, in sentences. The figure's public
 * record (`publicKnowledgeOf`, src/core2/past-public.ts) holds party, service
 * start, votes, laws sponsored and laws signed; the authored bank
 * `data/english/parts/public-figure.json` words each one. A fact the record
 * does not hold gets no sentence.
 */
import bankJson from "../../../data/english/parts/public-figure.json" with { type: "json" };
import { heldByGrades } from "../../english/english-grades";

interface Part {
  key: string;
  text: string;
  uses: { subject: string; role: string; choice: string }[];
  shippable: boolean;
}
export const PUBLIC_FIGURE_BANK = bankJson as unknown as { parts: Part[] };

export interface PublicFigureFacts {
  readonly recordId: string;
  readonly name: string;
  readonly office: string | null;
  readonly party: string | null;
  readonly serviceDate: string | null;
  readonly votes: number;
  readonly sponsored: number;
  readonly signed: number;
}

export interface FigureSentence {
  readonly text: string;
  readonly partKey: string;
  readonly sourceRecordIds: readonly string[];
}

export function publicFigureSentences(
  figure: PublicFigureFacts,
  bank: { parts: Part[] } = PUBLIC_FIGURE_BANK,
  /** Grading and tests only: also use parts held back until graded; play never sets it. */
  includeHeld = false,
): FigureSentence[] {
  const say = (
    choice: string,
    slots: Record<string, string>,
  ): FigureSentence[] => {
    const found = bank.parts.find(
      (part) =>
        (part.shippable || includeHeld) &&
        !heldByGrades(part.key) &&
        part.uses.some((use) => use.choice === choice),
    );
    if (!found) return [];
    return [
      {
        text: found.text.replace(/\{(\w+)\}/g, (_all, slot: string) =>
          slot === "name" ? figure.name : (slots[slot] ?? ""),
        ),
        partKey: found.key,
        sourceRecordIds: [figure.recordId],
      },
    ];
  };
  const count = (many: string, one: string, n: number) =>
    n === 1 ? say(one, {}) : n > 1 ? say(many, { count: String(n) }) : [];
  return [
    ...(figure.party ? say("party", { party: figure.party }) : []),
    ...(figure.office && figure.serviceDate
      ? say("service", { office: figure.office, date: figure.serviceDate })
      : []),
    ...count("votes", "one-vote", figure.votes),
    ...count("sponsored", "one-sponsored", figure.sponsored),
    ...count("signed", "one-signed", figure.signed),
  ];
}
