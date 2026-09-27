/**
 * The small person card's own words: how you know somebody and what you have
 * seen of their temperament.
 *
 * Only what the card is handed is said. The traits are the ones a written
 * tendency record established (`observedTraitLabels`); a seeded value nobody
 * has seen is never mentioned, and a card with nothing observed says nothing
 * about temperament rather than guessing.
 */

/** At most this many traits are named on the small card. */
export const CARD_TRAIT_LIMIT = 3;

/** "Reserved, cautious and follows through, from what you've seen." */
export function observedTraitsSentence(
  labels: readonly string[],
): string | null {
  const shown = labels.slice(0, CARD_TRAIT_LIMIT);
  if (shown.length === 0) return null;
  const words = shown.map((label, index) =>
    index === 0 ? label : label.charAt(0).toLowerCase() + label.slice(1),
  );
  const list =
    words.length === 1
      ? words[0]
      : `${words.slice(0, -1).join(", ")} and ${words[words.length - 1]}`;
  return `${list}, from what you've seen.`;
}

/** The one web edge between the player and this person the card reads. */
export interface KnownThroughEdge {
  readonly kind: "family" | "household" | "work" | "politics" | "acquaintance";
  readonly label: string;
}

const EDGE_ORDER: readonly KnownThroughEdge["kind"][] = [
  "family",
  "household",
  "work",
  "politics",
  "acquaintance",
];

/**
 * How the player knows this person, in one short line: the recorded
 * relationship when there is one; otherwise what the relationship web
 * already says joins them (a workplace, a chapter, a race, having spoken);
 * otherwise nothing.
 */
export function howYouKnowLine(
  dossier: { readonly relationship: string | null },
  edges: readonly KnownThroughEdge[] = [],
): string | null {
  if (dossier.relationship) return dossier.relationship;
  const edge = [...edges].sort(
    (a, b) => EDGE_ORDER.indexOf(a.kind) - EDGE_ORDER.indexOf(b.kind),
  )[0];
  if (!edge) return null;
  switch (edge.kind) {
    case "family":
      return edge.label;
    case "household":
      return "Lives with you";
    case "work":
      return edge.label.startsWith("Work at ")
        ? `From work at ${edge.label.slice("Work at ".length)}`
        : "From work";
    case "politics":
      return edge.label.startsWith("In ")
        ? `From ${edge.label.slice("In ".length)}`
        : edge.label;
    case "acquaintance":
      return "Somebody you have spoken with";
  }
}
