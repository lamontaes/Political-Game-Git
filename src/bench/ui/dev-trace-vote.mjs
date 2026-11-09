// Dev mode's Trace of a bill's vote (mock fr-dev-trace), three columns: the record (the bill,
// where it stands, each chamber's roll with every name a button), why the chosen member voted as
// they did (their recorded reasons, from the bill stage view; the column draws only when the view
// carries them) and what came of it (the floor, the desk and the override, read from the same
// stage view). Words are the stage view's own and controls.billStage and controls.floor; a count
// or a date comes from the record, never from here.
import { el } from "./dom.mjs";
import { makeButton } from "./button.mjs";
import { stripBoard, stripSection } from "./strips.mjs";

/** How many names a roll shows before the control that opens the rest (layout, not a game rule). */
const SHOWN_NAMES = 12;

/**
 * `stage` is GET /api/bill/stage; `paper` is GET /api/bill; `labels` is controls.devTrace;
 * `words` is controls.billStage and `floor` controls.floor; `chosen` is the memberId whose
 * vote is read (or null); `onPick(memberId)` redraws for another member.
 */
export function devTraceVote({
  stage,
  paper,
  labels,
  words,
  floor,
  chosen,
  onPick,
}) {
  const rolls = [...stage.floor, ...stage.override];
  const rowOf = (entry) =>
    [...entry.yes, ...entry.no].find((row) => row.memberId === chosen);
  const picked = rolls.map(rowOf).find(Boolean) ?? null;
  const nameButton = (row) => {
    const b = makeButton({ className: "action small", textContent: row.name });
    b.setAttribute("aria-pressed", String(row.memberId === chosen));
    b.dataset.member = row.memberId;
    b.addEventListener("click", () => onPick(row.memberId));
    return b;
  };
  // A legislature's roll is hundreds of names: the first few show, a control opens the rest.
  const names = (rows) => {
    const box = el("div", { className: "acts" });
    const fill = (shown) => box.replaceChildren(...shown.map(nameButton));
    fill(rows.slice(0, SHOWN_NAMES));
    if (rows.length > SHOWN_NAMES) {
      const more = makeButton({
        className: "action small",
        textContent: `${words.showAll} ${rows.length}`,
      });
      more.addEventListener("click", () => fill(rows));
      box.append(more);
      box.dataset.more = "";
    }
    return box;
  };
  const roll = (entry) =>
    el(
      "div",
      { className: "stage-chamber" },
      el("b", { textContent: `${entry.chamberTitle} · ${entry.result}` }),
      names(entry.yes),
      names(entry.no),
    );
  const record = stripSection(
    2,
    `${paper.spoken} · ${paper.title}`,
    ...rolls.map(roll),
  );
  // The member's recorded reasons, when the stage view carries them (a reason's name and which
  // way it pulled); no reasons, no column.
  const reasons = picked?.reasons ?? [];
  const why = reasons.length
    ? stripSection(
        2,
        `${labels.why} ${picked.name} ${picked.vote === "yes" ? words.yes : words.no}`,
        ...reasons.map((r) =>
          el(
            "div",
            { className: "stage-row" },
            el("b", { textContent: words.reasons[r.reason] ?? "" }),
            el("span", { textContent: words[r.side] ?? "" }),
          ),
        ),
      )
    : null;
  // What came of it: the stage the bill reached, then the desk's decision by name.
  const came = [
    floor.status[stage.status] ?? "",
    ...stage.desk.decided.map(
      (row) =>
        `${row.vote === "sign" ? words.signed : words.vetoed} · ${row.name}`,
    ),
  ].filter(Boolean);
  const after = stripSection(
    2,
    labels.came,
    ...came.map((text) =>
      el("div", { className: "stage-row", textContent: text }),
    ),
  );
  return stripBoard({
    columns: [[record], ...(why ? [[why]] : []), [after]],
    className: "dev-trace-vote",
  });
}
