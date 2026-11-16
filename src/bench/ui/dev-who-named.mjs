// Dev mode's "Who is named" (src/bench/dev-views/who-named.ts), on the Calendar's dev panels: for
// the player's scenes, newest first, each person in the cast and why the narrator names them so
// (rule 136): the words said after their full name and the records behind them, or why they are
// named alone. Each record id opens in the trace box. Reads only; spends no time.
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

/** One person's line: name, what is said or why alone, how met, and the record ids as links. */
function personLine(row, labels, open) {
  const why = row.said
    ? `“${row.said}”`
    : (labels.alone[row.alone] ?? row.alone ?? "");
  const met = row.metBy
    ? ` · ${labels.metBy[row.metBy] ?? row.metBy}${row.metSource ? ` ${day(row.metSource.date)}` : ""}`
    : "";
  const ids = row.recordIds.map((id) => {
    const link = makeButton({ className: "link small", textContent: id });
    link.addEventListener("click", () => void open(id));
    return link;
  });
  const li = el(
    "li",
    {},
    el("strong", { textContent: row.name }),
    el("span", { textContent: ` · ${why}${met}` }),
    ...ids,
  );
  li.dataset.personId = row.personId;
  li.dataset.alone = row.alone ?? "said";
  return li;
}

export const slots = {
  calendar: ({ labels, send }) => {
    const list = el("div", { className: "dev-who-named-list" });
    const result = statusLine();
    const trace = traceBox(labels.title);
    const show = makeButton({ className: "action", textContent: labels.show });
    show.dataset.testid = "dev-who-named";
    show.addEventListener("click", async () => {
      show.disabled = true;
      result.textContent = "";
      try {
        const { scenes } = await send("who-named");
        list.replaceChildren(
          ...(scenes.length
            ? scenes.flatMap((scene) => [
                el("h4", {
                  textContent: `${day(scene.date)} · ${scene.typeKey}`,
                }),
                el(
                  "ul",
                  { className: "dev-who-named-cast" },
                  ...scene.cast.map((row) =>
                    personLine(row, labels, trace.open),
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
      { className: "dev-only dev-who-named" },
      el("h3", { textContent: labels.title }),
      el("div", { className: "acts" }, show),
      result,
      list,
      trace.node,
    );
  },
};
