/**
 * Two small readers for the speech the player builds, one part a click: the
 * order a speaker's reach puts the parts on offer in, and the speech as given.
 * The sentences of each part are the planner's, said by the English engine
 * (`src/director/speech-builder.ts`); no bank is read here.
 */

/**
 * The parts of a speech in the order a speaker's reach takes them: someone
 * who carries talk on hears the longer, weightier parts first, someone who
 * keeps it short the plainer ones; parts of one length keep their order.
 */
export function speechPartsByReach<T extends { text: string }>(
  rows: readonly T[],
  longFirst: boolean,
): T[] {
  return rows
    .map((row, at) => ({ row, at }))
    .sort(
      (a, b) =>
        (longFirst ? -1 : 1) * (a.row.text.length - b.row.text.length) ||
        a.at - b.at,
    )
    .map(({ row }) => row);
}

/** The speech as given: its parts, in order. */
export function speechWords(parts: readonly { text: string }[]): string {
  return parts.map((row) => row.text).join(" ");
}
