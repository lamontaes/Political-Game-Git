// Dev mode's director's day (src/bench/dev-views/director-day.ts), on the Calendar's dev panels: the
// player's moments for a day with the cause record (opening in the shared trace box), what the director
// did to each (a scene now, a scene waiting, a journal line), the types it bound, the types it held
// back and why, the reason a waiting scene closed, and the bank piece its first line opened on with
// the facts that filled it. Counts by outcome and by reason follow. Reads only; spends no time.
import { el } from "./dom.mjs";
import { makeButton } from "./button.mjs";
import { statusLine } from "./fields.mjs";
import { traceBox } from "./dev-trace-box.mjs";

function momentNode(row, labels, open) {
  const link = makeButton({
    className: "link small",
    textContent: row.cause ? row.cause.id : row.momentId,
  });
  link.addEventListener(
    "click",
    () => void open(row.cause?.id ?? row.momentId),
  );
  const li = el(
    "li",
    { className: "dev-director-moment" },
    el("strong", { textContent: labels.outcomes[row.outcome] ?? row.outcome }),
    el("span", {
      textContent: ` · ${labels.cause}: ${row.cause ? `${row.cause.label} ` : ""}`,
    }),
    link,
  );
  li.dataset.outcome = row.outcome;
  for (const bound of row.bound)
    li.append(
      el("div", {
        className: "dev-director-bound",
        textContent: `${labels.bound}: ${bound.typeKey} (${labels.timings[bound.timing] ?? bound.timing})`,
      }),
    );
  for (const held of row.held)
    li.append(
      el("div", {
        className: "dev-director-held",
        textContent: `${labels.held}: ${held.typeKey} · ${labels.reasons[held.reason] ?? held.reason}`,
      }),
    );
  if (row.closed)
    li.append(
      el("div", {
        className: "dev-director-closed",
        textContent: `${labels.closed}: ${row.closed}`,
      }),
    );
  if (row.board) {
    const board = row.board;
    li.append(
      el("div", {
        className: "dev-director-board",
        textContent: `${labels.board}: ${labels.score} ${board.score.toFixed(3)}${board.picked ? ` · ${labels.picked}` : ""}${board.cut ? ` · ${labels.cut}: ${labels.cuts[board.cut] ?? board.cut}` : ""}`,
      }),
    );
    for (const card of board.candidates)
      li.append(
        el("div", {
          className: "dev-director-candidate",
          textContent: `${labels.candidates}: ${card.typeKey}${card.cut ? ` · ${labels.cut}: ${labels.cuts[card.cut] ?? card.cut}` : ""}`,
        }),
      );
    for (const offer of board.offers) {
      const open = makeButton({
        className: "link small",
        textContent: offer.causeId,
      });
      open.addEventListener("click", () => void open(offer.causeId));
      li.append(
        el(
          "div",
          { className: "dev-director-offer" },
          el("span", {
            textContent: `${labels.offered}: ${offer.typeKey} · ${labels.score} ${offer.score.toFixed(3)} · ${labels.cut}: ${labels.cuts[offer.cut] ?? offer.cut} · `,
          }),
          open,
        ),
      );
    }
  }
  if (row.firstLine?.piece)
    li.append(
      el("div", {
        className: "dev-director-piece",
        textContent: `${labels.firstLine}: ${row.firstLine.piece}${row.firstLine.facts.length ? ` · ${labels.filledBy}: ${row.firstLine.facts.join(", ")}` : ""}`,
      }),
    );
  return li;
}

function countsNode(table, title, labelOf) {
  const rows = Object.entries(table);
  return el(
    "div",
    { className: "dev-director-counts" },
    el("h4", { textContent: title }),
    el(
      "ul",
      {},
      ...rows.map(([key, count]) =>
        el("li", { textContent: `${labelOf(key)}: ${count}` }),
      ),
    ),
  );
}

export const slots = {
  calendar: ({ labels, send }) => {
    const trace = traceBox(labels.trace);
    const date = el("input", { type: "date" });
    const show = makeButton({ textContent: labels.show });
    const result = statusLine();
    const list = el("div", { className: "dev-director-day-list" });
    show.addEventListener("click", async () => {
      show.disabled = true;
      try {
        const day = await send(
          `director/day${date.value ? `?date=${date.value}` : ""}`,
        );
        date.value = day.date;
        list.replaceChildren(
          ...(day.moments.length
            ? [
                el(
                  "ul",
                  {},
                  ...day.moments.map((row) =>
                    momentNode(row, labels, trace.open),
                  ),
                ),
                countsNode(
                  day.byOutcome,
                  labels.byOutcome,
                  (key) => labels.outcomes[key] ?? key,
                ),
                countsNode(
                  day.byReason,
                  labels.byReason,
                  (key) => labels.reasons[key] ?? key,
                ),
                countsNode(
                  day.byCut ?? {},
                  labels.board,
                  (key) => labels.cuts[key] ?? key,
                ),
              ]
            : [el("p", { textContent: labels.nothing })]),
        );
      } catch (error) {
        result.textContent = error.message;
      } finally {
        show.disabled = false;
      }
    });
    return el(
      "section",
      { className: "dev-only dev-director-day" },
      el("h3", { textContent: labels.title }),
      el(
        "div",
        { className: "acts" },
        el("label", { textContent: `${labels.date} ` }, date),
        show,
      ),
      result,
      list,
      trace.node,
    );
  },
};
