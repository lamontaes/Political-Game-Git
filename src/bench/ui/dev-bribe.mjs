/* global fetch */
// Dev mode's bribe, below the Bills panel: pick who wants the favor (one of the wealthiest
// residents), which official (only those with a say on the pending bill) and the stake. The offer runs
// through the game's own bribe code; each decides as the engine decides. The result line shows
// whether it was offered and taken, the money moved and the record id.
import { el } from "./dom.mjs";
import { makeButton } from "./button.mjs";
import { select, numberBox, statusLine } from "./fields.mjs";

/** The last result line, kept across the sheet's redraws. */
let lastResult = "";

async function send(path, input) {
  const response = await fetch(`/api/dev/${path}`, {
    method: input ? "POST" : "GET",
    ...(input ? { body: JSON.stringify(input) } : {}),
  });
  const value = await response.json();
  if (!response.ok) throw new Error(value.error);
  return value;
}

/** The bribe panel. `labels` is controls.devBribe; `bodies` the lawmaking bodies; `billId()` the pending vote. */
export async function devBribePanel({ labels, bodies, billId, onDone }) {
  const rich = await send("wealthiest");
  // Only people with a say on the pending bill: its chambers' members and the executive who signs.
  const pending = billId();
  const officials = pending
    ? (await send(`bill-deciders?billId=${encodeURIComponent(pending)}`)).map(
        (p) => ({
          value: p.personId,
          label: `${p.name} · ${p.body}`,
        }),
      )
    : bodies.flatMap((b) =>
        b.members
          .filter((m) => m.personId)
          .map((m) => ({
            value: m.personId,
            label: `${m.givenName} ${m.familyName} · ${b.name}`,
          })),
      );
  if (!rich.length || !officials.length) return null;
  const offerer = select({
    label: labels.offerer,
    value: rich[0].personId,
    options: rich.map((p) => ({ value: p.personId, label: p.name })),
  });
  const official = select({
    label: labels.official,
    value: officials[0].value,
    options: officials,
  });
  const stake = numberBox({ value: 500000, min: 1, label: labels.stake });
  // The official's answer: as the engine decides, or picked.
  const answer = select({
    label: labels.answer,
    value: "",
    options: [
      { value: "", label: labels.asEngine },
      { value: "takes", label: labels.takes },
      { value: "refuses", label: labels.refuses },
    ],
  });
  const result = statusLine();
  result.textContent = lastResult;
  const offer = makeButton({ className: "action" }, labels.offer);
  offer.dataset.testid = "dev-bribe";
  offer.addEventListener("click", async () => {
    offer.disabled = true;
    result.textContent = "";
    try {
      const subjectId = billId();
      if (!subjectId) throw new Error(labels.noBill);
      const out = await send("bribe", {
        offererId: offerer.value,
        officialId: official.value,
        subjectId,
        stakeMinor: Number(stake.value) * 100,
        answer: answer.value || undefined,
      });
      lastResult = [
        out.record.offered ? labels.offered : labels.declined,
        ...(out.record.offered
          ? [out.record.taken ? labels.taken : labels.refused]
          : []),
        ...(out.moved ? [`$${Math.round(out.moved / 100)}`] : []),
        out.record.id,
      ].join(" · ");
      result.textContent = lastResult;
      await onDone();
    } catch (error) {
      lastResult = error.message;
      result.textContent = lastResult;
    } finally {
      offer.disabled = false;
    }
  });
  return el(
    "section",
    { className: "dev-only dev-bribe" },
    el("h3", { textContent: labels.title }),
    el("div", { className: "dev-bills-row" }, offerer, official),
    el("div", { className: "dev-bills-row" }, stake, answer, offer),
    result,
  );
}
