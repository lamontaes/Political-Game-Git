/* global fetch */
// Dev mode's bribe, below the Bills panel: pick who wants the favor (one of the wealthiest
// residents), which official and which bill is the vote they want, and the stake. The offer runs
// through the game's own bribe code; each decides as the engine decides. The result line shows
// whether it was offered and taken, the money moved and the record id.
import { el } from "./dom.mjs";
import { makeButton } from "./button.mjs";
import { select, numberBox, statusLine } from "./fields.mjs";

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
  const officials = bodies.flatMap((b) =>
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
  const result = statusLine();
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
      });
      result.textContent = [
        out.record.offered ? labels.offered : labels.declined,
        ...(out.record.offered
          ? [out.record.taken ? labels.taken : labels.refused]
          : []),
        ...(out.moved ? [`$${Math.round(out.moved / 100)}`] : []),
        out.record.id,
      ].join(" · ");
      await onDone();
    } catch (error) {
      result.textContent = error.message;
    } finally {
      offer.disabled = false;
    }
  });
  return el(
    "section",
    { className: "dev-only dev-bribe" },
    el("h3", { textContent: labels.title }),
    el("div", { className: "dev-bills-row" }, offerer, official),
    el("div", { className: "dev-bills-row" }, stake, offer),
    result,
  );
}
