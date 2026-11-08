/* global fetch */
// Dev mode's Campaign set-up panel, on the Calendar: what a campaign needs before its acts can be tried.
// Donors give runs the campaign day's own raise-money choice (each donor decides by their own warmth
// and means, and every gift writes the donation and the journal entries a gift writes); a person is
// cast yes or no on the volunteer ask, which the campaign's own ask then reads in place of their lean.
// Control names and record data only.
import { el } from "./dom.mjs";
import { makeButton } from "./button.mjs";
import { select, statusLine } from "./fields.mjs";

async function send(path, input) {
  const response = await fetch(`/api/dev/${path}`, {
    method: input ? "POST" : "GET",
    ...(input ? { body: JSON.stringify(input) } : {}),
  });
  const value = await response.json();
  if (!response.ok) throw new Error(value.error);
  return value;
}

/** The last result line, kept across the sheet's redraws. */
let lastResult = "";

/** The panel, or null while the player has no campaign. `labels` is controls.devCampaign; `onDone()` refreshes the screens. */
export async function devCampaignPanel({ labels, onDone }) {
  const campaigns = await send("campaign-setup");
  if (!campaigns.length) return null;
  const campaign = select({
    label: labels.campaign,
    value: campaigns[0].filingId,
    options: campaigns.map((row, index) => ({
      value: row.filingId,
      label: `${row.title || index + 1} · $${Math.round(row.raisedMinor / 100)}`,
    })),
  });
  const people = select({
    label: labels.person,
    value: campaigns[0].people[0]?.personId ?? "",
    options: campaigns[0].people.map((p) => ({
      value: p.personId,
      label: p.name,
    })),
  });
  const result = statusLine();
  result.textContent = lastResult;
  const act = (button, run) =>
    button.addEventListener("click", async () => {
      button.disabled = true;
      result.textContent = "";
      try {
        lastResult = await run();
        result.textContent = lastResult;
        await onDone();
      } catch (error) {
        lastResult = error.message;
        result.textContent = lastResult;
      } finally {
        button.disabled = false;
      }
    });
  const give = makeButton({ className: "action" }, labels.donorsGive);
  give.dataset.testid = "dev-donors-give";
  act(give, async () => {
    const out = await send("raise-money", { filingId: campaign.value });
    return [
      out.raisedMinor > 0 ? labels.raised : labels.noneGave,
      ...(out.raisedMinor > 0 ? [`$${Math.round(out.raisedMinor / 100)}`] : []),
      `${out.gave.length}/${out.asked}`,
      out.mark.id,
    ].join(" · ");
  });
  const cast = (yes) => async () => {
    if (!people.value) throw new Error(labels.nobody);
    const out = await send("volunteer-cast", {
      filingId: campaign.value,
      personId: people.value,
      yes,
    });
    return [yes ? labels.saysYes : labels.saysNo, out.id].join(" · ");
  };
  const yes = makeButton({ className: "action" }, labels.saysYes);
  yes.dataset.testid = "dev-volunteer-yes";
  act(yes, cast(true));
  const no = makeButton({ className: "action" }, labels.saysNo);
  no.dataset.testid = "dev-volunteer-no";
  act(no, cast(false));
  return el(
    "section",
    { className: "dev-only dev-campaign" },
    el("h3", { textContent: labels.title }),
    el("div", { className: "dev-run-row" }, campaign, give),
    el("div", { className: "dev-run-row" }, people, yes, no),
    result,
  );
}
