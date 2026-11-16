/* global fetch */
// Dev mode's money check by industry: this world against the same world given a bill that
// changes nothing (the game's own /api/dev/twin-industries route, src/bench/dev-law-industries.ts).
// One line per industry that moved, then the businesses that moved most. Labels come from
// controls.devBill.industries; industry and business names come from the records.
import { el } from "./dom.mjs";
import { makeButton } from "./button.mjs";

async function send(path, input) {
  const response = await fetch(`/api/dev/${path}`, {
    method: "POST",
    body: JSON.stringify(input),
  });
  const value = await response.json();
  if (!response.ok) throw new Error(value.error);
  return value;
}

const dollars = (minor) =>
  `${minor < 0 ? "-" : ""}$${Math.round(Math.abs(minor) / 100).toLocaleString("en-US")}`;
const signed = (n) => `${n > 0 ? "+" : ""}${n.toLocaleString("en-US")}`;
const percent = (here, twin) =>
  twin === 0
    ? ""
    : `${here >= twin ? "+" : ""}${(((here - twin) / Math.abs(twin)) * 100).toFixed(1)}%`;

/** One industry's line: staff, firms open, sales, pay, prices and cash, here against the twin. */
function industryLine(t, row) {
  const parts = [row.name];
  const { here, twin } = row;
  if (here.staff !== twin.staff)
    parts.push(`${t.staff} ${here.staff} (${signed(here.staff - twin.staff)})`);
  if (here.open !== twin.open)
    parts.push(`${t.open} ${here.open} (${signed(here.open - twin.open)})`);
  if (here.salesMinor !== twin.salesMinor)
    parts.push(
      `${t.sales} ${dollars(here.salesMinor - twin.salesMinor)} ${percent(here.salesMinor, twin.salesMinor)}`,
    );
  if (here.wagesPaidMinor !== twin.wagesPaidMinor)
    parts.push(
      `${t.pay} ${dollars(here.wagesPaidMinor - twin.wagesPaidMinor)}`,
    );
  if (Math.abs(here.priceIndex - twin.priceIndex) >= 0.0005)
    parts.push(`${t.prices} ${percent(here.priceIndex, twin.priceIndex)}`);
  if (here.cashMinor !== twin.cashMinor)
    parts.push(`${t.cash} ${dollars(here.cashMinor - twin.cashMinor)}`);
  return parts.length > 1 ? parts.join(" · ") : null;
}

/** One business's line: closed in one world only, staff, sales and cash against the twin. */
function businessLine(t, row) {
  if (!row.here) return `${row.name} · ${t.onlyTwin}`;
  if (!row.twin) return `${row.name} · ${t.onlyHere}`;
  const parts = [row.name];
  if ((row.here.closedAt ?? "") !== (row.twin.closedAt ?? ""))
    parts.push(row.here.closedAt ? t.closedHere : t.closedTwin);
  if (row.here.staff !== row.twin.staff)
    parts.push(`${t.staff} ${signed(row.here.staff - row.twin.staff)}`);
  if (row.here.salesMinor !== row.twin.salesMinor)
    parts.push(
      `${t.sales} ${dollars(row.here.salesMinor - row.twin.salesMinor)}`,
    );
  if (row.here.cashMinor !== row.twin.cashMinor)
    parts.push(`${t.cash} ${dollars(row.here.cashMinor - row.twin.cashMinor)}`);
  return parts.join(" · ");
}

/**
 * The Industries part of the money check. `t` is controls.devBill.industries. With
 * `opening` ({ series, level }) the twin has that law the town opened with set aside instead.
 */
export function industriesLines(t, opening) {
  const box = el("div", { className: "dev-twin" });
  const run = makeButton(
    { className: "action" },
    opening ? t.runOpening : t.run,
  );
  run.dataset.testid = opening
    ? "dev-industries-opening-run"
    : "dev-industries-run";
  const line = (text, testid) => {
    const p = el("p", { className: "dev-bill-line", textContent: text });
    if (testid) p.dataset.testid = testid;
    return p;
  };
  run.addEventListener("click", async () => {
    run.disabled = true;
    box.replaceChildren(line(t.running));
    try {
      const out = await send("twin-industries", opening ?? {});
      const industries = out.industries
        .map((row) => industryLine(t, row))
        .filter((text) => text !== null);
      box.replaceChildren(
        line(
          [
            t.span.replace("{from}", out.from).replace("{to}", out.to),
            out.changes.length
              ? `${t.done}: ${out.changes.map((c) => `${c.control} ${c.count}`).join(", ")}`
              : t.nothingDone,
          ].join(" · "),
          "dev-industries-span",
        ),
        line(
          out.baseline.kind === "opening-law"
            ? t.baselineOpening
            : t.baseline.replace("{n}", String(out.baseline.restated.length)),
          "dev-industries-baseline",
        ),
        ...(industries.length
          ? industries.map((text) => line(text, "dev-industries-row"))
          : [line(t.nothing, "dev-industries-row")]),
        el("h4", {
          className: "label",
          textContent: t.businesses.replace("{n}", String(out.businessesMoved)),
        }),
        ...out.businesses.map((row) =>
          line(businessLine(t, row), "dev-industries-business"),
        ),
      );
    } catch (error) {
      box.replaceChildren(line(error.message));
    } finally {
      run.disabled = false;
    }
  });
  return [el("h4", { className: "label", textContent: t.title }), run, box];
}
