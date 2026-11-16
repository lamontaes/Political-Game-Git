// Dev mode's "Why each line of an address" (src/bench/dev-views/address-parts.ts), on the
// Calendar's dev panels: each address on the record, newest first, sentence by sentence, with the
// bank pieces it was joined from and each piece's tie, the facts its slots said, and the records
// behind them; each record id opens in the trace box. Reads only; spends no time.
import { el } from "./dom.mjs";
import { makeButton } from "./button.mjs";
import { statusLine } from "./fields.mjs";
import { traceBox } from "./dev-trace-box.mjs";

/** A record date in words ("Mar 4, 2027"), never the ISO form. */
function day(iso) {
  return new Date(`${iso}T12:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** One sentence: its words, then each piece with its tie, the facts said and the record links. */
function sentenceLine(row, labels, open) {
  const pieces = row.pieces.map((piece) =>
    el("li", {
      textContent: `${piece.key} · ${labels.ties[piece.tie] ?? piece.tie ?? ""}`,
    }),
  );
  const facts = row.facts.map((fact) =>
    el("li", { textContent: `${fact.slot}: ${fact.said}` }),
  );
  const ids = row.sources.map((id) => {
    const link = makeButton({ className: "link small", textContent: id });
    link.addEventListener("click", () => void open(id));
    return link;
  });
  const li = el(
    "li",
    {},
    el("strong", {
      textContent: `“${row.text}”${row.quoted ? ` · ${labels.quoted}` : ""}`,
    }),
    el("ul", { className: "dev-address-pieces" }, ...pieces),
    el("ul", { className: "dev-address-facts" }, ...facts),
    ...ids,
  );
  return li;
}

export const slots = {
  calendar: ({ labels, send }) => {
    const list = el("div", { className: "dev-address-parts-list" });
    const result = statusLine();
    const trace = traceBox(labels.title);
    const show = makeButton({ className: "action", textContent: labels.show });
    show.dataset.testid = "dev-address-parts";
    show.addEventListener("click", async () => {
      show.disabled = true;
      result.textContent = "";
      try {
        const { addresses } = await send("address-parts");
        list.replaceChildren(
          ...(addresses.length
            ? addresses.flatMap((address) => [
                el("h4", {
                  textContent: `${day(address.date)} · ${address.speaker}`,
                }),
                el(
                  "ol",
                  { className: "dev-address-sentences" },
                  ...address.sentences.map((row) =>
                    sentenceLine(row, labels, trace.open),
                  ),
                ),
              ])
            : [el("p", { textContent: labels.none })]),
        );
      } catch (error) {
        result.textContent = error.message;
      } finally {
        show.disabled = false;
      }
    });
    return el(
      "section",
      { className: "dev-only dev-address-parts" },
      el("h3", { textContent: labels.title }),
      el("div", { className: "acts" }, show),
      result,
      list,
      trace.node,
    );
  },
};
