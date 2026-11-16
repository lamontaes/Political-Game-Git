// Dev mode's "How this world opened" (src/bench/dev-views/opening.ts), under the Metrics board: pick
// a town, person, household, business or office and see each value the opening set, how the opening
// made it, the code and data row behind it, the record's own saved source and what replaces a draw
// or a fixed number. A row with a record opens it in the Trace box. A person's card shows their own
// rows too (slot "person"). Reads only.
import { el } from "./dom.mjs";
import { makeButton } from "./button.mjs";
import { select, statusLine } from "./fields.mjs";
import { traceBox } from "./dev-trace-box.mjs";

const SUBJECTS = ["town", "person", "household", "business", "office"];

/** Remembered across the sheet's redraws, so a refresh keeps what was open. */
let shown = { subject: "town", id: "" };

function table(view, labels, open) {
  const head = el(
    "tr",
    {},
    ...["value", "made", "by", "source", "drawKey", "replace"].map((key) =>
      el("th", { textContent: key === "value" ? "" : labels[key] }),
    ),
  );
  const rows = view.rows.map((row) =>
    el(
      "tr",
      { className: "dev-opening-row" },
      el(
        "td",
        {},
        el("b", { textContent: `${row.label}: ` }),
        row.recordId
          ? (() => {
              const link = makeButton({ className: "action small" }, row.value);
              link.addEventListener("click", () => open(row.recordId));
              return link;
            })()
          : el("span", { textContent: row.value }),
      ),
      el("td", { textContent: row.made }),
      el("td", { textContent: row.by }),
      // A record's source can run to a paragraph: its start here, the whole of it on hover.
      el("td", {
        textContent:
          (row.source ?? "").length > 180
            ? `${row.source.slice(0, 177)}...`
            : (row.source ?? ""),
        title: row.source ?? "",
      }),
      el("td", { textContent: row.drawKey ?? "" }),
      el("td", { textContent: row.replace ?? "" }),
    ),
  );
  return el("table", { className: "dev-opening-table" }, head, ...rows);
}

export const slots = {
  // On a person's card (the "person" slot, PR #9628): how that person opened, without the picker.
  async person({ personId, labels, send }) {
    const trace = traceBox(labels.trace);
    try {
      const view = await send(
        `opening?subject=person&id=${encodeURIComponent(personId)}`,
      );
      return el(
        "section",
        { className: "dev-only dev-opening" },
        el("h3", { textContent: labels.title }),
        table(view, labels, trace.open),
        trace.node,
      );
    } catch (error) {
      return el("p", { className: "dev-only", textContent: error.message });
    }
  },
  async metrics({ labels, send }) {
    const result = statusLine();
    const trace = traceBox(labels.trace);
    const body = el("div", { className: "dev-opening-body" });
    const subject = select({
      label: labels.title,
      value: shown.subject,
      options: SUBJECTS.map((s) => ({ value: s, label: labels.subjects[s] })),
    });
    const which = el("span", {});
    const draw = async () => {
      result.textContent = "";
      try {
        const query = `opening?subject=${encodeURIComponent(shown.subject)}${shown.id ? `&id=${encodeURIComponent(shown.id)}` : ""}`;
        const view = await send(query);
        shown = { subject: view.subject, id: view.id };
        const pick = select({
          label: labels.subjects[view.subject],
          value: view.id,
          options: view.choices[view.subject].map((c) => ({
            value: c.id,
            label: c.name,
          })),
          onChange: (value) => {
            shown = { subject: shown.subject, id: value };
            draw();
          },
        });
        pick.dataset.testid = "dev-opening-pick";
        which.replaceChildren(pick);
        body.replaceChildren(
          el("h4", { textContent: view.title }),
          el("p", {
            className: "dev-opening-counts",
            textContent: `${labels.counts}: ${Object.entries(view.kinds)
              .map(([kind, n]) => `${kind} ${n}`)
              .join(" · ")}`,
          }),
          table(view, labels, trace.open),
        );
      } catch (error) {
        result.textContent = error.message;
      }
    };
    subject.dataset.testid = "dev-opening-subject";
    subject.addEventListener("change", () => {
      shown = { subject: subject.value, id: "" };
      draw();
    });
    await draw();
    return el(
      "section",
      { className: "dev-only dev-opening" },
      el("h3", { textContent: labels.title }),
      el("div", { className: "dev-bills-row" }, subject, which),
      result,
      body,
      trace.node,
    );
  },
};
