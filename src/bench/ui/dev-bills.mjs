/* global fetch */
// Dev mode's bills, on the Government tab: pick a body and a member, introduce a bill through the
// game's own drafting, then pass or defeat it at a margin you pick (every member votes through the
// game's own vote), with the executive signing, vetoing or deciding as the game does, and an
// override margin for a veto. Words are control names and record data only.
import { el } from "./dom.mjs";
import { makeButton } from "./button.mjs";
import { select, numberBox, statusLine } from "./fields.mjs";
import { devCheckbox } from "./dev-check.mjs";

/** The bill last introduced here: kept across the sheet's redraws, which a refresh causes. */
let lastBillId = null;
/** The law the last bill was about, for Run until's "hold it" option. */
let lastSeries = null;
export const lastIntroducedSeries = () => lastSeries;

/** The row Government's main column gives Dev mode's Bills and Bribe panels, so neither is drawn over the Members. */
export const devPanelsRow = (...sections) =>
  el("div", { className: "dev-only dev-panels" }, ...sections);

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
  // A yes-or-no law (the consumer loan cap, say) is answered Yes or No, and repealed by answering No.
  const questions = new Set(laws.questions);
  const answer = select({
    label: labels.answer,
    value: "1",
    options: [
      { value: "1", label: labels.yes },
      { value: "0", label: labels.no },
    ],
  });
  const showValue = () => {
    const asked = questions.has(seriesBox.value);
    value.hidden = asked;
    answer.hidden = !asked;
    repeal.hidden = !asked;
  };
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
  // Members sign a discharge petition before the committee meets: it matters only where a committee
  // does not report the bill and the chamber's rule lets its members take the bill from it.
  const petition = devCheckbox({ label: labels.petition });
  petition.box.dataset.testid = "dev-petition";
  // The chair of each committee is cast to hear the bill, through the committee's own hearing decision.
  const hear = devCheckbox({ label: labels.chairHears });
  hear.box.dataset.testid = "dev-chair-hears";
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
      value: questions.has(seriesBox.value)
        ? Number(answer.value)
        : Number(value.value),
    });
    lastBillId = bill.id;
    lastSeries = seriesBox.value;
    return [bill.number, bill.status, bill.id].join(" · ");
  });
  // Repealing a yes-or-no law is a bill that answers it No; repealing an
  // amount ends the body's own law, so its level holds what it held before.
  const repeal = makeButton({ className: "action" }, labels.repeal);
  repeal.dataset.testid = "dev-repeal";
  act(repeal, async () => {
    const { bill } = await send("introduce", {
      bodyOfficeId: bodyBox.value,
      sponsorId: memberBox.value,
      series: seriesBox.value,
      value: 0,
      ...(questions.has(seriesBox.value) ? {} : { repeal: true }),
    });
    lastBillId = bill.id;
    return [labels.repeal, bill.number, bill.status, bill.id].join(" · ");
  });
  seriesBox.addEventListener("change", showValue);
  showValue();
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
        discharge: petition.box.checked,
        chairHears: hear.box.checked,
      });
      return [
        out.bill.number,
        out.bill.status,
        ...out.tallies.map((t) => `${t.yes}–${t.no}`),
        ...out.committees
          .filter((c) => c.discharge)
          .map((c) =>
            [
              c.discharge.discharged ? labels.discharged : labels.notDischarged,
              `${c.discharge.signers.length}/${c.discharge.needed}`,
            ].join(" "),
          ),
        ...out.committees
          .filter((c) => !c.reported)
          .map((c) =>
            [
              labels[
                {
                  lost: "lost",
                  "petition-short": "held",
                  "unheard-no-route": "noRoute",
                }[c.why]
              ],
              `${c.yes}–${c.no}`,
              labels.chair,
              Number(c.chairPosition).toFixed(2),
              Number(c.chairTrait).toFixed(2),
            ].join(" "),
          ),
        ...(!out.veto && executive !== undefined ? [labels.noVeto] : []),
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
    el(
      "div",
      { className: "dev-bills-row" },
      seriesBox,
      value,
      answer,
      introduce,
      repeal,
    ),
    el(
      "div",
      { className: "dev-bills-row" },
      margin,
      signBox,
      overrideMargin,
      pass,
      defeat,
    ),
    petition.line,
    hear.line,
    result,
  );
  return { section, bodies, billId: () => lastBillId };
}
