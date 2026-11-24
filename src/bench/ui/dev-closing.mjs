// Dev mode's Businesses panel, on Metrics: the town's businesses, a control that cuts one's
// outside orders (the engine's own output limit, as a law's limit sets it) or closes it through its
// owner's own closing, and "What came of it": everyone it let go, why, the record each heard and
// where they are now, and the town month by month. Control names and record data only; every id
// opens in Trace. Registered from dev-views/dev-closing.ts; drawn in the "metrics" slot.
import { el } from "./dom.mjs";
import { makeButton } from "./button.mjs";
import { numberBox, select, statusLine } from "./fields.mjs";
import { stripSection } from "./strips.mjs";
import { idLink, recordTree, tableRows } from "./dev-view.mjs";
import { traceBox } from "./dev-trace-box.mjs";

/** The business picked, kept across the sheet's redraws. */
let picked = "";

/** The panel. `labels` are the view's (dev-views/dev-closing.ts); `refresh()` redraws Metrics. */
async function devClosingPanel({ labels, refresh, send }) {
  const businesses = await send("businesses");
  picked =
    businesses.find((row) => row.organizationId === picked)?.organizationId ??
    businesses[0]?.organizationId ??
    "";
  const result = statusLine();
  const { node: trace, open } = traceBox(labels.trace);
  const view = el("div", { className: "dev-closing" });
  const keep = numberBox({
    value: 0.25,
    min: 0.01,
    step: 0.05,
    label: labels.keep,
  });

  const draw = async () => {
    if (!picked) return view.replaceChildren();
    const came = await send(
      `closing?organizationId=${encodeURIComponent(picked)}`,
    );
    view.replaceChildren(
      el("h4", { textContent: labels.cameOf }),
      el(
        "div",
        { className: "kv" },
        idLink(came.organizationId, open, came.name),
        el("span", {}, ` ${labels.staff} ${came.staffNow}`),
        ...(came.closureId
          ? [el("span", {}, " "), idLink(came.closureId, open)]
          : []),
      ),
      recordTree(came.totals, open, labels.totals),
      el(
        "table",
        { className: "dev-table" },
        ...tableRows(
          [
            { name: labels.date, value: (r) => r.date },
            { name: labels.kind, value: (r) => r.kind },
            { name: labels.heads, value: (r) => r.heads },
            { name: labels.reason, value: (r) => r.reasonKey },
            { name: labels.person, value: (r) => idLink(r.personId, open) },
            {
              name: labels.heard,
              value: (r) => (r.eventId ? idLink(r.eventId, open) : labels.none),
            },
            {
              name: labels.now,
              value: (r) =>
                r.recordId
                  ? idLink(r.recordId, open, labels.where[r.now] ?? r.now)
                  : (labels.where[r.now] ?? r.now),
            },
            { name: labels.change, value: (r) => idLink(r.changeId, open) },
          ],
          came.letGo.slice(0, 300),
        ),
      ),
      el(
        "table",
        { className: "dev-table" },
        ...tableRows(
          [
            {
              name: labels.month,
              value: (r) =>
                r.metricsId ? idLink(r.metricsId, open, r.month) : r.month,
            },
            { name: labels.jobsInTown, value: (r) => r.jobsInTown ?? "" },
            { name: labels.people, value: (r) => r.people ?? "" },
            { name: labels.looking, value: (r) => r.residentsLooking ?? "" },
            { name: labels.claims, value: (r) => r.claimsOpen ?? "" },
            {
              name: labels.sales,
              value: (r) =>
                recordTree(r.salesByIndustryMinor, open, labels.sales, 2),
            },
          ],
          came.town,
        ),
      ),
      recordTree(came.trading, open, labels.trading, 1),
    );
  };

  const act = (label, testid, work) => {
    const node = makeButton({ className: "action small" }, label);
    node.dataset.testid = testid;
    node.addEventListener("click", async () => {
      node.disabled = true;
      result.textContent = "";
      try {
        const out = await work();
        result.replaceChildren(idLink(out.mark.id, open));
        await refresh();
      } catch (error) {
        result.textContent = error.message;
      } finally {
        node.disabled = false;
      }
    });
    return node;
  };

  const chooser = select({
    label: labels.business,
    value: picked,
    options: businesses.map((row) => ({
      value: row.organizationId,
      label: `${row.name} · ${row.classification} · ${row.staff}${row.closedAt ? ` · ${labels.closed}` : ""}`,
    })),
    onChange: (value) => {
      picked = value;
      void draw();
    },
  });
  chooser.dataset.testid = "dev-closing-business";
  await draw();
  return stripSection(
    9,
    labels.title,
    chooser,
    el(
      "div",
      { className: "acts" },
      keep,
      act(labels.shrink, "dev-shrink-business", () =>
        send("shrink-business", {
          organizationId: picked,
          keep: Number(keep.value),
        }),
      ),
      act(labels.close, "dev-close-business", () =>
        send("close-business", { organizationId: picked }),
      ),
    ),
    result,
    view,
    trace,
  );
}

/** Where it draws: under the Metrics board (ui/dev-views.mjs). */
export const slots = { metrics: devClosingPanel };
