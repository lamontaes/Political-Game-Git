// "Who wrote it" on Budgets: how the budget was adopted, worded from the adoption record
// (the budgets engine's `adoptedBy`: kind, body, a tally per chamber, the bill, what the
// negotiation did to each line, the measures that changed it since, why last year carried).
// Every word comes from the labels the screen hands in; the line names are the ones the
// department rows use and the bill is called by its name, never its number. Nothing here
// computes a figure.
import { typedRow } from "./strips.mjs";

/**
 * `adoption`: the record. `lineName(line)`: a spending line as the department rows name it.
 * `billName`: the bill's name, or "". `words`: { kinds, by, bill, tally, halved, halvedTimes,
 * dropped, changedSince, once, times, carried: { vetoed, rejected } }.
 */
export function adoptedRows({ adoption, lineName, billName, words }) {
  if (!adoption) return [];
  const rows = [];
  const fill = (template, values) =>
    Object.entries(values).reduce(
      (text, [key, value]) => text.replace(`{${key}}`, String(value)),
      template,
    );
  if (words.kinds?.[adoption.kind])
    rows.push(typedRow(words.by, words.kinds[adoption.kind]));
  if (adoption.body) rows.push(typedRow(words.by, adoption.body));
  if (adoption.carried)
    rows.push(typedRow(words.carriedLabel, words.carried[adoption.carried]));
  // A chamber is told by its own name (the record's title); one chamber is just "Vote".
  (adoption.tallies ?? []).forEach((tally, at, all) =>
    rows.push(
      typedRow(
        all.length > 1 ? (tally.title ?? words.vote) : words.vote,
        fill(words.tally, { yes: tally.yes, no: tally.no }),
      ),
    ),
  );
  if (billName) rows.push(typedRow(words.bill, billName));
  for (const change of adoption.amendments ?? [])
    rows.push(
      typedRow(
        lineName(change.line),
        change.how === "dropped"
          ? words.dropped
          : change.times > 1
            ? fill(words.halvedTimes, { n: change.times })
            : words.halved,
      ),
    );
  if (adoption.amendedBy?.length)
    rows.push(
      typedRow(
        words.changedSince,
        adoption.amendedBy.length === 1
          ? words.once
          : fill(words.times, { n: adoption.amendedBy.length }),
      ),
    );
  return rows;
}
