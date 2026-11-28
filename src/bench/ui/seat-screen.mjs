/* global URLSearchParams */
// Moved out of src/bench/play.mjs by scripts/screens/split-client.mjs: seatRows takes the page's context first.
import { plate } from "./plate.mjs";
import { line } from "./text.mjs";
import {
  stripSection,
  stripBoard,
  deskList,
  deskBill,
  deskTitle,
  peopleSentence,
} from "./strips.mjs";
import { pager } from "./pager.mjs";
import { makeButton, buttonRow } from "./button.mjs";
import { dateWords } from "../../english/plain-words.mjs";
import { draftCard } from "./draft-card.mjs";

export async function seatRows(ctx) {
  const v = await ctx.api(`/api/seat?id=${encodeURIComponent(ctx.me.id)}`);
  const parts = await ctx.officeParts();
  const draftNodes = [];
  // Who to ask to carry an executive's bill: the members, likeliest yes first and marked; a press
  // asks that member (`/api/seat/act` with `memberId`).
  const chooseMember = async (body, params) => {
    const options = await ctx.api(
      `/api/seat/ask-options?${new URLSearchParams(params)}`,
    );
    ctx.$("sheet-body").replaceChildren(
      plate(
        null,
        line(ctx.controls.seat.askWho),
        ...options.members.map((member) => {
          const pick = makeButton({
            className: "action",
            textContent: member.likely
              ? `${member.name} · ${ctx.controls.seat.askLikely}`
              : member.name,
          });
          pick.dataset.act = "ask-member";
          pick.addEventListener("click", () =>
            act({ ...params, memberId: member.key }),
          );
          return pick;
        }),
      ),
    );
  };
  const act = async (params) => {
    // The draft card keeps Draft dark for every bill the engine would refuse, so no press
    // reaches a refusal here; one would be a fault, and it throws as a page error.
    const r = await ctx.post(`/api/seat/act?${new URLSearchParams(params)}`);
    ctx.seatText = r.text ?? [];
    // An executive's bill goes through a member: who was asked and what they said.
    const askedWord = r.asked
      ? (() => {
          const say = r.asked.pronouns;
          const fill = (line) =>
            line
              .replace("{name}", r.asked.name)
              .replace("{words}", r.asked.reasonWords ?? "")
              .replace("{subject}", say?.lower ?? "they")
              .replace("{object}", say?.object ?? "them")
              .replace("{possessive}", say?.possessive ?? "their");
          const reasons = say
            ? ctx.controls.seat.askedReasons
            : ctx.controls.seat.askedReasonsThey;
          const reason = reasons[r.asked.reason];
          const line = r.asked.carried
            ? ctx.controls.seat.askedCarried
            : r.asked.reasonWords
              ? ctx.controls.seat.askedRefusedSaid
              : reason
                ? ctx.controls.seat.askedRefusedBecause.replace(
                    "{reason}",
                    reason,
                  )
                : ctx.controls.seat.askedRefused;
          const earlier = r.asked.earlier ?? [];
          const before = earlier.length
            ? ` ${(earlier.length === 1
                ? ctx.controls.seat.askedBefore
                : ctx.controls.seat.askedBeforeMore
              ).replace("{date}", dateWords(earlier.at(-1)))}`
            : "";
          return fill(line + before);
        })()
      : "";
    ctx.seatResult = r.asked
      ? askedWord
      : r.spoken
        ? `${r.spoken} · ${ctx.controls.floor.status[r.status] ?? ""}${r.floorDate ? ` · ${ctx.controls.floor.takenUp} ${dateWords(r.floorDate)}` : ""}${
            r.authority?.some((a) => !a.allowed)
              ? ` · ${r.authority
                  .filter((a) => !a.allowed)
                  .map((a) => ctx.controls.authority?.[a.reason] ?? "")
                  .join("; ")}`
              : ""
          }`
        : "";
    ctx.openSheet("office");
  };
  for (const body of v.bodies) {
    for (const m of body.members)
      ctx.me.names = { ...ctx.me.names, [m.key]: m.name };
    // Every law area, one group each: its policies and budget lines, each with what is in
    // force today beside the amount you type. Money is typed in dollars and kept in cents.
    const seat = ctx.controls.seat ?? {};
    const itemKey = (item) =>
      item.series
        ? `series:${item.series}`
        : item.question
          ? `question:${item.question}`
          : `line:${item.line}`;
    const draftBlock = draftCard({
      today: String(ctx.today()).slice(0, 10),
      words: {
        title: seat.title ?? "",
        issue: seat.issue ?? "",
        today: seat.today ?? "",
        newAmount: seat.newAmount ?? "",
        draft: seat.draft ?? "",
        addStep: seat.addStep ?? "",
        firstStep: seat.firstStep ?? "",
        stepDate: seat.stepDate ?? "",
        risePerYear: seat.risePerYear ?? "",
        risePercent: seat.risePercent ?? "",
        riseYears: seat.riseYears ?? "",
        riseFirstDate: seat.riseFirstDate ?? "",
        riseBack: seat.riseBack ?? "",
        riseNeedsAmount: seat.riseNeedsAmount ?? "",
        risePercentNeeded: seat.risePercentNeeded ?? "",
        riseYearsNeeded: seat.riseYearsNeeded ?? "",
        riseDateNeeded: seat.riseDateNeeded ?? "",
        none: ctx.controls.bill?.none ?? "",
      },
      groups: (body.menus ?? []).map((menu) => ({
        name: menu.name,
        items: menu.items.map((item) => ({
          value: itemKey(item),
          label: `${
            item.series
              ? ctx.policyLabel(item.series)
              : item.question
                ? ctx.policyLabel(item.question)
                : item.name
          }${item.allowed === false ? ` · ${ctx.controls.authority?.[item.reason] ?? ""}` : ""}`,
          // What the law in force holds, as the bill's paper cites it: a
          // yes-or-no question reads Yes or No, as the Issues tab says it.
          today: item.charge
            ? ctx.feeToday(item.charge)
            : item.today?.value == null
              ? null
              : item.kind === "policy-question"
                ? item.today.value
                  ? ctx.controls.politics.yes
                  : ctx.controls.politics.no
                : ctx.amount(item.today.value, item.today.unit),
          // The list's short side note: a fee's yearly take, the card's long line is `today`.
          aside: item.charge
            ? (ctx.controls.fees?.aside ?? "").replace(
                "{amount}",
                ctx.roundedMoney(Number(item.charge.yearlyMinor)),
              )
            : undefined,
          unit: item.series ? ctx.amountUnit(item.unit) : item.line ? "$" : "",
          // As the player types a fee's level, the words the paper will print.
          say: item.charge
            ? (typed) => ctx.amount(typed, item.unit)
            : undefined,
          cents: item.unit?.startsWith("minor") || Boolean(item.line),
          blocked: item.allowed === false,
          // A percent a year needs an amount in force above zero to start from.
          raisable: Number(item.today?.value) > 0,
          note:
            item.allowed === false
              ? (ctx.controls.authority?.[item.reason] ?? "")
              : "",
        })),
      })),
      onDraft: (item, typed, steps = [], rise = null) => {
        const [kind, key] = [
          item.value.slice(0, item.value.indexOf(":")),
          item.value.slice(item.value.indexOf(":") + 1),
        ];
        const params = {
          kind: "draft",
          officeId: body.officeId,
          ...(kind === "series"
            ? { series: key }
            : kind === "line"
              ? { line: key }
              : { question: key }),
          // A phase-in names each step's amount and day, or a percent a year, its years and
          // its first day; a single bill, one amount.
          ...(rise
            ? {
                risePercent: String(rise.percent),
                riseYears: String(rise.years),
                riseFirstDate: rise.firstDate,
              }
            : steps.length
              ? {
                  steps: JSON.stringify(
                    steps.map((step) => ({
                      value: item.cents
                        ? Math.round(Number(step.amount) * 100)
                        : Number(step.amount),
                      effectiveDate: step.date,
                    })),
                  ),
                }
              : {
                  value: item.cents
                    ? String(Math.round(Number(typed) * 100))
                    : typed,
                }),
        };
        // An executive's bill goes through a member the player picks: the body's members, the
        // one the engine would ask marked as the likely yes.
        if (body.byRequest) chooseMember(body, params);
        else act(params);
      },
    });
    // The body's line on the board: who sits on it, and the way in to writing
    // a bill, which takes the whole screen (a list of subjects beside the
    // chosen one's page). A menu has no Back (owner, Oct 28 and 29): the Your
    // office tab above it returns to the seat.
    const write = makeButton({
      className: "action",
      textContent: seat.title ?? "",
    });
    write.dataset.act = "write-a-bill";
    write.addEventListener("click", () =>
      ctx.$("sheet-body").replaceChildren(draftBlock),
    );
    draftNodes.push(
      stripSection(
        2,
        body.title,
        line(body.members.map((m) => m.name).join(" · ")),
        buttonRow(write),
      ),
    );
  }
  const floor = ctx.controls.floor;
  const labels = ctx.controls.officeScreen ?? {};
  // Your bills, each with its standing, the day it is taken up, how the vote came out and
  // the paper that opens to read it (the mock's "On my desk").
  const desk = v.bills.map(({ bill, spoken, votes, tally, floorDate }) => {
    const open = makeButton({
      className: "action",
      textContent: ctx.controls.bill?.open ?? "",
    });
    open.addEventListener("click", () =>
      ctx.openBillPaper(
        bill.id,
        (...nodes) => ctx.$("sheet-body").replaceChildren(...nodes),
        () => ctx.openSheet("office"),
      ),
    );
    return deskBill(
      deskTitle(`${spoken} · ${floor.status[bill.status] ?? ""}`),
      ...(floorDate
        ? [line(`${floor.takenUp} ${dateWords(floorDate)}`, "floor-date")]
        : []),
      ...(votes.length
        ? [
            line(
              `${floor.voted}: ${tally.yes} ${floor.yes}, ${tally.no} ${floor.no}`,
              "floor-result",
            ),
          ]
        : []),
      open,
    );
  });
  const left = (v.incompatibilities ?? []).map((l) =>
    line(`${dateWords(l.date)} · ${l.left} → ${l.took} · ${l.law}`),
  );
  const result = ctx.seatResult
    ? [plate(null, line(ctx.seatResult), ...ctx.seatText.map((t) => line(t)))]
    : [];
  // Office hours: the residents' cases the cases engine opened for this official, each with the
  // two answers the engine offers; a decision runs the engine's own `handleCase`.
  const caseWords = ctx.controls.officeCases ?? {};
  const open = await ctx
    .api(`/api/office/cases?id=${encodeURIComponent(ctx.me.id)}`)
    .catch(() => []);
  const cases = open.length
    ? [
        stripSection(
          1,
          labels.officeHours,
          ...open.map((c) => {
            const answer = (decision, text) => {
              const b = makeButton({ textContent: text });
              b.addEventListener("click", async () => {
                await ctx.post(
                  `/api/office/case?${new URLSearchParams({ caseId: c.id, decision })}`,
                );
                ctx.openSheet("office");
              });
              return b;
            };
            return deskBill(
              peopleSentence([
                {
                  name: c.name,
                  onOpen: () => {
                    ctx.closeSheet();
                    ctx.showPerson({ personId: c.personId });
                  },
                },
              ]),
              line(
                `${caseWords.problems?.[c.problem] ?? ""} · ${caseWords.by} ${dateWords(c.respondBy)}`,
              ),
              buttonRow(
                answer("help", caseWords.help),
                answer("decline", caseWords.decline),
              ),
            );
          }),
        ),
      ]
    : [];
  return [
    stripBoard({
      className: "office-board",
      columns: [
        parts.seat,
        [
          ...parts.stops,
          ...result,
          ...(desk.length
            ? [
                stripSection(
                  1,
                  labels.onMyDesk,
                  desk.length > 3
                    ? pager({
                        items: desk,
                        render: (node) => node,
                        rows: 3,
                        columns: 1,
                        rowHeight: 110,
                        gap: 10,
                      })
                    : deskList(...desk),
                ),
              ]
            : []),
          ...draftNodes,
          ...(left.length ? [stripSection(3, labels.left, ...left)] : []),
        ],
        [...cases, ...parts.budget, ...parts.deals],
      ],
    }),
  ];
}
