/**
 * A speech's theme as its speaker words it: each theme has several plain
 * wordings (`themeWordings`, src/director/data/speech-outlines.json), and the
 * speaker's own traits choose one: a studious or duty-bound speaker says the
 * full phrase, a practical or skeptical one the short name, a nurturing or
 * tender-hearted one the concrete people it touches (W1, Nov 24: the
 * safety-net theme filled one "how we help people through hard times" into
 * every report line of the drawn worlds that argued it). The speaker's
 * traits decide, never a draw.
 */
import { P } from "../core2/parameters";
import speechOutlines from "./data/speech-outlines.json";

const WORDINGS = (
  speechOutlines as unknown as {
    themeWordings: Readonly<Record<string, readonly string[]>>;
  }
).themeWordings;

/** The facets that lean a speaker to each wording, in the wordings' order. */
const REGISTERS: readonly (readonly string[])[] = [
  ["analytical", "studious", "duty-bound", "deferential", "fair-minded"],
  ["practical", "skeptical", "cynical", "competitive", "restless", "guarded"],
  [
    "nurturing",
    "comforting",
    "tender-hearted",
    "generous",
    "sensitive",
    "devoted",
  ],
];

const lean = (
  traits: Readonly<Record<string, number>>,
  facets: readonly string[],
) =>
  facets.reduce(
    (sum, facet) => sum + (traits[`personality-v1:facet-${facet}`] ?? P.zero),
    P.zero,
  );

/**
 * The theme as this speaker says it, or null where the theme has none: the
 * wording whose facets the speaker leans to most, the first on a tie or no
 * lean.
 */
export function themeNameBy(
  traits: Readonly<Record<string, number>>,
  family: string,
): string | null {
  const wordings = WORDINGS[family];
  if (!wordings?.length) return null;
  let best = P.zero;
  let bestLean = P.zero;
  REGISTERS.forEach((facets, at) => {
    const here = lean(traits, facets);
    if (at < wordings.length && here > bestLean) {
      best = at;
      bestLean = here;
    }
  });
  return wordings[best]!;
}
