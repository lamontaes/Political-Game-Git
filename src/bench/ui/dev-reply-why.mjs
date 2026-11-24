// Dev mode's "why these replies" (owner, Nov 16: dev mode does the tracing in the game): beside a
// scene the player has open, the facts the scene knows with the records each cites, and for each
// reply offered the use that placed it (the facts it needs, the facts that would rule it out, what
// it follows) and the wordings that fit the spot as closely. Every record id opens the one Trace
// box, so a vote's reasons term by term are one click from the reply that cites them. It reads
// only what /api/story serves with ?dev=1; it writes nothing and spends no time.
import { el } from "./dom.mjs";
import { idList } from "./dev-view.mjs";

/** One fact the scene knows: its key, its words and the records it cites. */
function factRow(row, onTrace) {
  return el(
    "div",
    { className: "kv" },
    `${row.key}: ${row.text} `,
    idList(row.recordIds, onTrace),
  );
}

/** Why one reply was offered: the use that placed it and what tied with it. */
function replyRow(labels, line, n, onTrace) {
  const placed = line.placed;
  const rows = [el("div", { className: "said" }, `${n}. ${line.text}`)];
  if (!placed) {
    rows.push(el("div", { className: "kv" }, labels.unplaced));
    return el("div", { className: "dev-reply" }, ...rows);
  }
  rows.push(
    el(
      "div",
      { className: "kv" },
      `${labels.needs}: `,
      ...(placed.needs.length
        ? placed.needs.map((need) =>
            el("span", {}, `${need.key} `, idList(need.recordIds, onTrace)),
          )
        : [labels.nothing]),
    ),
  );
  if (placed.rulesOut.length)
    rows.push(
      el(
        "div",
        { className: "kv" },
        `${labels.rulesOut}: ${placed.rulesOut.join(", ")}`,
      ),
    );
  if (placed.after)
    rows.push(
      el("div", { className: "kv" }, `${labels.after}: ${placed.after}`),
    );
  rows.push(
    el(
      "div",
      { className: "kv" },
      `${labels.ties}: `,
      placed.ties.length
        ? placed.ties.map((tie) => tie.text).join(" / ")
        : labels.nothing,
    ),
  );
  return el("div", { className: "dev-reply" }, ...rows);
}

/**
 * The panel for one turn of a scene: `why` is the scene's `{ cause, facts }`, `lines` what the
 * other side just said, `replies` the lines offered now; `trace` is the one Trace box
 * (`traceBox`), drawn under the panel and opened by every record id in it.
 */
export function replyWhy(labels, { why, lines, replies }, trace) {
  const onTrace = trace.open;
  return el(
    "li",
    { className: "why dev-reply-why" },
    el("h4", { textContent: labels.title }),
    el(
      "div",
      { className: "kv" },
      `${labels.cause}: `,
      idList([why.cause.id], onTrace),
    ),
    el("h4", { textContent: labels.facts }),
    ...why.facts.map((row) => factRow(row, onTrace)),
    ...(lines.length
      ? [
          el("h4", { textContent: labels.said }),
          ...lines.map((line, i) => replyRow(labels, line, i + 1, onTrace)),
        ]
      : []),
    ...(replies.length
      ? [
          el("h4", { textContent: labels.replies }),
          ...replies.map((line, i) => replyRow(labels, line, i + 1, onTrace)),
        ]
      : []),
    trace.node,
  );
}
