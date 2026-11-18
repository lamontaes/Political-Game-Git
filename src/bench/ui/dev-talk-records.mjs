// Dev mode's record of a talk (owner, Nov 14: every effect is triggered and traced in dev mode):
// under the talk box, each reply the player pressed, the move it made and the records it wrote
// (the told event, a stand kept, a point let go), each id opening the one Trace box. It reads
// only what /api/talk serves; it writes nothing and spends no time.
import { el } from "./dom.mjs";
import { idList } from "./dev-view.mjs";

/** The records one reply wrote: the event `say` applied under its id, and its own parts. */
function writtenBy(line, recorded) {
  return recorded.filter(
    (id) =>
      !!line.recordId &&
      (id === line.recordId || id.startsWith(`${line.recordId}:`)),
  );
}

/**
 * The panel for a talk: `lines` the talk's lines (the player's carry `move` and `recordId`),
 * `recorded` the ids the talk wrote; `trace` is the one Trace box (`traceBox`), drawn under it.
 */
export function talkRecords(labels, { lines, recorded }, trace) {
  const rows = lines
    .filter((line) => line.move)
    .map((line, i) =>
      el(
        "div",
        { className: "kv" },
        `${labels.reply} ${i + 1}: ${line.move} `,
        idList(writtenBy(line, recorded), trace.open),
      ),
    );
  return el(
    "li",
    { className: "why dev-talk-records" },
    el("h4", { textContent: labels.title }),
    ...(rows.length ? rows : [el("div", { className: "kv" }, labels.nothing)]),
    trace.node,
  );
}
