/* global fetch */
// Dev mode's bills, on the Government tab: pick a body and a member, introduce a bill through the
// game's own drafting, then pass or defeat it at a margin you pick (every member votes through the
// game's own vote), with the executive signing, vetoing or deciding as the game does, and an
// override margin for a veto. Words are control names and record data only.
import { el } from "./dom.mjs";
import { makeButton } from "./button.mjs";
import { select, numberBox, statusLine } from "./fields.mjs";

/** The bill last introduced here: kept across the sheet's redraws, which a refresh causes. */
let lastBillId = null;

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

/** The bills panel. `labels` is controls.devBills; `onDone()` refreshes the game's screens. */
export async function devBillsPanel({ labels, onDone }) {
  const [bodies, laws] = await Promise.all([
    send("lawmaking-bodies"),
    send("laws"),
  ]);
  if (!bodies.length) return null;
  const bodyBox = select({
    label: labels.body,
    value: bodies[0].id,
    options: bodies.map((b) => ({
      value: b.id,
      label: `${b.name} · ${b.level ?? ""}`,
    })),
  });
  const memberBox = select({ label: labels.sponsor, value: "", options: [] });
  const fillMembers = () => {
    const body = bodies.find((b) => b.id === bodyBox.value);
    memberBox.replaceChildren(
      ...body.members.map((m) =>
        el("option", {
          value: m.key,
          textContent: `${m.givenName} ${m.familyName}${m.party ? ` · ${m.party}` : ""}`,
        }),
      ),
    );
  };
  bodyBox.addEventListener("change", fillMembers);
  fillMembers();
  const seriesBox = select({
    label: labels.series,
    value: "minimum-wage",
    options: laws.series.map((s) => ({ value: s.series, label: s.series })),
  });
  const value = numberBox({ value: 15, step: "any", label: labels.value });
  const margin = numberBox({ value: 10, min: 0, label: labels.margin });
  const signBox = select({
    label: labels.executive,
    value: "game",
    options: [
      { value: "game", label: labels.executiveGame },
      { value: "sign", label: labels.sign },
      { value: "veto", label: labels.veto },
    ],
  });
  const overrideMargin = numberBox({
    value: 10,
    label: labels.overrideMargin,
  });
  const result = statusLine();
  result.textContent = lastResult;
  const act = (button, work) =>
    button.addEventListener("click", async () => {
      button.disabled = true;
      result.textContent = "";
      try {
        lastResult = await work();
        result.textContent = lastResult;
        await onDone();
      } catch (error) {
        lastResult = error.message;
        result.textContent = lastResult;
      } finally {
        button.disabled = false;
      }
    });
  const introduce = makeButton({ className: "action" }, labels.introduce);
  introduce.dataset.testid = "dev-introduce";
  act(introduce, async () => {
    const { bill } = await send("introduce", {
      bodyOfficeId: bodyBox.value,
      sponsorId: memberBox.value,
      series: seriesBox.value,
      value: Number(value.value),
    });
    lastBillId = bill.id;
    return [bill.number, bill.status, bill.id].join(" · ");
  });
  const decide = (button, sign) =>
    act(button, async () => {
      if (!lastBillId) throw new Error(labels.noBill);
      const executive =
        signBox.value === "game" ? undefined : signBox.value === "sign";
      const out = await send("decide", {
        billId: lastBillId,
        margin: sign * Number(margin.value),
        sign: executive,
        overrideMargin: Number(overrideMargin.value),
      });
      return [
        out.bill.number,
        out.bill.status,
        ...out.tallies.map((t) => `${t.yes}–${t.no}`),
        ...out.held.map(() => labels.held),
      ].join(" · ");
    });
  const pass = makeButton({ className: "action" }, labels.pass);
  pass.dataset.testid = "dev-pass";
  const defeat = makeButton({ className: "action" }, labels.defeat);
  defeat.dataset.testid = "dev-defeat";
  decide(pass, 1);
  decide(defeat, -1);
  const section = el(
    "section",
    { className: "dev-only dev-bills" },
    el("h3", { textContent: labels.title }),
    el("div", { className: "dev-bills-row" }, bodyBox, memberBox),
    el("div", { className: "dev-bills-row" }, seriesBox, value, introduce),
    el(
      "div",
      { className: "dev-bills-row" },
      margin,
      signBox,
      overrideMargin,
      pass,
      defeat,
    ),
    result,
  );
  return { section, bodies, billId: () => lastBillId };
}
