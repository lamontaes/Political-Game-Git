/* global URLSearchParams */
// Moved out of src/bench/play.mjs by scripts/screens/split-client.mjs: officeParts takes the page's context first.
import {
  stripSection,
  settingRow,
  dotRows,
  deskBill,
  peopleSentence,
} from "./strips.mjs";
import { pager } from "./pager.mjs";
import { moneyWords, dateWords } from "../../english/plain-words.mjs";
import { listRow } from "./list-row.mjs";
import { select } from "./fields.mjs";
import { makeButton, buttonRow } from "./button.mjs";
import { line, labeled } from "./text.mjs";

export async function officeParts(ctx) {
  const v = await ctx.api(`/api/office?id=${encodeURIComponent(ctx.me.id)}`);
  if (!v.jobs.length && !v.stops.length)
    return { seat: [], stops: [], budget: [], deals: [] };
  const words = ctx.controls.officeStops ?? {};
  const labels = ctx.controls.officeScreen ?? {};
  const paged = (items, { rows, columns, rowHeight, className }) =>
    pager({
      items,
      render: (node) => node,
      rows,
      columns,
      rowHeight,
      gap: 8,
      className,
    });
  // What stops you: one On and Off switch per kind of vote this seat has. Off, you are away from
  // that kind of vote: the record has you absent, a bill on your desk waits, nothing is cast for you.
  const stops = v.stops.length
    ? [
        stripSection(
          1,
          labels.stops,
          ...v.stops.map((stop) =>
            settingRow(
              stop.key === "meetings" && v.stopsBody
                ? v.stopsBody
                : (words.switches?.[stop.key] ?? ""),
              ctx.onOffToggle({
                attr: "stop",
                testid: `office-stop-${stop.key}`,
                labels: ctx.controls.options,
                on: () => stop.on,
                set: async (wanted) => {
                  const next = await ctx.post(
                    `/api/office/stops?${new URLSearchParams({ key: stop.key, on: String(wanted) })}`,
                  );
                  stop.on =
                    next.stops.find((s) => s.key === stop.key)?.on ?? wanted;
                },
              }),
            ),
          ),
        ),
      ]
    : [];
  const seat = [
    ...v.jobs.map((job) =>
      stripSection(
        1,
        labels.mySeat,
        dotRows(
          [
            { label: labels.office, value: job.title },
            {
              label: labels.pay,
              value: `${moneyWords(job.annualMinor)} ${words.aYear ?? ""}`,
            },
            job.nextMeeting && {
              label: labels.nextMeeting,
              value: dateWords(job.nextMeeting),
            },
          ].filter(Boolean),
        ),
      ),
    ),
    // An open town post you appoint: the people it could go to, best first; left on the
    // official's own choice, the first stands.
    ...(v.heads?.length
      ? [
          stripSection(
            2,
            labels.heads,
            paged(
              v.heads.map((head) =>
                listRow(
                  "office-pick",
                  { as: "label" },
                  `${head.title} · ${words.nameHeadPick ?? ""} `,
                  select({
                    options: [
                      { value: "", label: words.ownChoice ?? "" },
                      // Only someone who may be asked now is offered; a no stands for a while.
                      ...head.candidates
                        .filter((c) => c.mayAsk)
                        .map((c) => ({
                          value: c.id,
                          label: (c.work && c.place
                            ? words.row
                            : c.place
                              ? words.rowPlace
                              : "{name}"
                          )
                            .replace("{name}", c.name)
                            .replace("{work}", c.work ?? "")
                            .replace("{place}", c.place ?? ""),
                        })),
                    ],
                    // Picking someone asks them (brief J): the sit-down plays, and only
                    // their yes names them.
                    onChange: async (nomineeId) => {
                      if (!nomineeId) return;
                      const asked = await ctx.post(
                        `/api/office/ask-head?${new URLSearchParams({ post: head.post, nomineeId })}`,
                      );
                      if (asked.packet) ctx.renderPacket(asked.packet);
                      const moment = ctx.storyStop(asked.packet);
                      ctx.closeSheet();
                      // The sit-down plays with nothing over it; with no scene, back to Office.
                      if (asked.story) await ctx.showStory(asked.story);
                      else if (moment) await ctx.showStory(moment.recordId);
                      else await ctx.openSheet("office");
                    },
                  }),
                ),
              ),
              { rows: 3, columns: 1, rowHeight: 52, className: "office-paged" },
            ),
          ),
        ]
      : []),
    // Your staff: the aides who serve now, and the people the staff engine would weigh for the
    // post with its reasons; Hire runs the engine's own hire, paid from the post's budget line.
    ...(v.aides?.serving.length || v.aides?.candidates.length
      ? [
          stripSection(
            2,
            labels.aides,
            ...v.aides.serving.map((a) =>
              ctx.row(a.name, labels.aideRole ?? ""),
            ),
            ...(v.aides.candidates.length
              ? [
                  paged(
                    v.aides.candidates.map((c) => {
                      const hire = makeButton({ textContent: labels.hire });
                      hire.addEventListener("click", async () => {
                        await ctx.post(
                          `/api/office/hire-aide?${new URLSearchParams({ personId: c.id })}`,
                        );
                        ctx.openSheet("office");
                      });
                      const why = Object.entries(c.reasons)
                        .filter(([, value]) => value > 0)
                        .map(([key, value]) =>
                          key === "family"
                            ? labels.reasons?.family
                            : `${labels.reasons?.[key] ?? ""} ${Math.round(value * 100)}%`,
                        )
                        .join(" · ");
                      return deskBill(
                        peopleSentence([
                          {
                            name: c.name,
                            onOpen: () => {
                              ctx.closeSheet();
                              ctx.showPerson({ personId: c.id });
                            },
                          },
                        ]),
                        line(
                          `${c.from === "known" ? labels.fromKnown : labels.fromApplicant} · ${why}`,
                        ),
                        buttonRow(hire),
                      );
                    }),
                    {
                      rows: 3,
                      columns: 1,
                      rowHeight: 116,
                      className: "office-paged",
                    },
                  ),
                ]
              : []),
          ),
        ]
      : []),
    ...(v.acts.length
      ? [
          stripSection(
            3,
            labels.acts,
            paged(
              v.acts.map((a) =>
                ctx.row(
                  `${dateWords(a.date)} · ${ctx.controls.actions?.[a.kind] ?? ""}`,
                  a.how === "absent"
                    ? (words.absent?.[a.detail] ?? "")
                    : `${a.kind === "vote" ? (words.votes?.[a.detail] ?? a.detail) : a.detail}${a.how === "own-choice" ? ` · ${words.ownChoice ?? ""}` : a.how === "adjourned" ? ` · ${words.adjourned ?? ""}` : ""}`,
                ),
              ),
              { rows: 4, columns: 1, rowHeight: 48, className: "office-paged" },
            ),
          ),
        ]
      : []),
  ];
  // The budget you may send now: the change to each line, in steps of its amount.
  const budget = v.budget
    ? [
        stripSection(
          1,
          ctx.controls.budgetEditor.title,
          paged(
            v.budget.lines.map((row) =>
              labeled(
                `${row.name} ${ctx.roundedMoney(row.amountMinor)}`,
                select({
                  options: [-20, -10, 0, 10, 20].map((pct) => {
                    const minor = Math.round((row.amountMinor * pct) / 100);
                    return {
                      value: minor,
                      label: ctx.controls.budgetEditor[String(pct)],
                      selected: row.changeMinor === minor,
                    };
                  }),
                  onChange: async (changeMinor) => {
                    await ctx.post(
                      `/api/office/budget-line?${new URLSearchParams({ line: row.line, changeMinor })}`,
                    );
                  },
                }),
              ),
            ),
            { rows: 5, columns: 2, rowHeight: 56, className: "office-paged" },
          ),
        ),
      ]
    : [];
  // The deal to offer each colleague who votes on a bill of yours when you talk to them.
  const deals = (v.deals ?? []).map((bill) =>
    stripSection(
      2,
      `${bill.number} · ${ctx.controls.deals.title}`,
      paged(
        bill.colleagues.map((colleague) =>
          labeled(
            colleague.name,
            select({
              value: colleague.deal ?? "none",
              options: ["none", "favor", "back-their-item"].map((deal) => ({
                value: deal,
                label: ctx.controls.deals[deal],
              })),
              onChange: async (deal) => {
                await ctx.post(
                  `/api/office/deal?${new URLSearchParams({ memberId: colleague.key, deal })}`,
                );
              },
            }),
          ),
        ),
        { rows: 4, columns: 2, rowHeight: 56, className: "office-paged" },
      ),
    ),
  );
  return { seat, stops, budget, deals };
}
