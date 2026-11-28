/* global URLSearchParams */
// Moved out of src/bench/play.mjs by scripts/screens/split-client.mjs: openBillPaper takes the page's context first.
import { makeButton } from "./button.mjs";
import { billStageSections } from "./bill-stage.mjs";
import { billPaper } from "./bill-paper.mjs";
import { billFigures } from "./bill-figures.mjs";
import { dateWords, moneyWords } from "../../english/plain-words.mjs";
import { devModeOn } from "./dev-setting.mjs";
import { devBillCard } from "./dev-bill-card.mjs";
import { devTraceVote } from "./dev-trace-vote.mjs";

export async function openBillPaper(ctx, billId, show, back, backLabel) {
  // Only the newest draw of a page is shown. Two acts close together (a vote,
  // then calling the question) each redraw the page; the earlier redraw can
  // finish its reads last, and must not put its older page over the newer one.
  const mine = (show.draws = (show.draws ?? 0) + 1);
  const paper = await ctx.api(`/api/bill?billId=${encodeURIComponent(billId)}`);
  const stage = await ctx.api(
    `/api/bill/stage?billId=${encodeURIComponent(billId)}`,
  );
  const view = await ctx.api(
    `/api/bill/page?billId=${encodeURIComponent(billId)}`,
  );
  const words = ctx.controls.bill ?? {};
  const pageWords = ctx.controls.billPage ?? {};
  // The bill's number and its body's name over the room that body works in (the government
  // screen's own room picture for that body); none when the body has no picture.
  const band = await ctx
    .api(
      `/api/government/bodies?${new URLSearchParams({
        id: ctx.me.id,
        level:
          view.level === "state" || view.level === "federal"
            ? view.level
            : "local",
        state:
          /^office:(US-[A-Z]{2}):/.exec(paper.bodyOfficeId ?? "")?.[1] ?? "",
      })}`,
    )
    .then((bodies) => {
      const rows = [...bodies.legislative, ...bodies.executive];
      // A federal bill names its chamber by kind ("federal:us-house"); the list names the
      // viewer's own state's seats of it ("office:US-WA:us-house", or the delegate's).
      const kind = /^federal:(.+)$/.exec(paper.bodyOfficeId ?? "")?.[1];
      const body =
        rows.find((row) => row.officeId === paper.bodyOfficeId) ??
        (kind &&
          (rows.find((row) => row.level === "federal" && row.kind === kind) ??
            rows.find(
              (row) => row.level === "federal" && row.kind.startsWith(kind),
            )));
      return body?.picture
        ? { picture: body.picture, title: `${paper.spoken} · ${body.name}` }
        : null;
    })
    .catch(() => null);
  const floor = ctx.controls.floor ?? {};
  // A bill opened inside the meeting or the desk returns to it; a menu has no Back
  // (owner, Oct 29: "continue and back needs to be removed from every single menu"):
  // a menu's bill closes with the menu's tabs and close control.
  const backButton = backLabel
    ? makeButton({ className: "action", textContent: backLabel })
    : null;
  backButton?.addEventListener("click", back);
  // Where the bill is: the committee's record, what members told you, the floor and
  // the override, each member by name (ui/bill-stage.mjs). They stand in the
  // bill's own board, under Where it is.
  const stageNodes = billStageSections(
    stage,
    ctx.controls.billStage ?? {},
    (person) => ctx.showPerson({ personId: person.personId }),
    async (how) => {
      await ctx.api(
        `/api/bill/vote?${new URLSearchParams({ billId, vote: how })}`,
        "POST",
      );
      await openBillPaper(ctx, billId, show, back, backLabel);
    },
    {
      onMove: async (index, direction) => {
        await ctx.api(
          `/api/bill/amend?${new URLSearchParams({ billId, index, direction })}`,
          "POST",
        );
        await openBillPaper(ctx, billId, show, back, backLabel);
      },
      onCall: async (item) => {
        await ctx.api(
          `/api/bill/amendment-vote?${new URLSearchParams({ amendmentId: item.id })}`,
          "POST",
        );
        await openBillPaper(ctx, billId, show, back, backLabel);
      },
      estimate: (item) =>
        [
          item.estimateAfter.workersRaised > 0
            ? `${item.estimateAfter.workersRaised} ${words.workers ?? ""}`
            : null,
          item.estimateAfter.annualPayMinor > 0
            ? moneyWords(item.estimateAfter.annualPayMinor)
            : null,
        ]
          .filter(Boolean)
          .join(" · "),
    },
    {
      onDecide: async (how) => {
        await ctx.api(
          `/api/desk?${new URLSearchParams({ billId, how })}`,
          "POST",
        );
        await openBillPaper(ctx, billId, show, back, backLabel);
      },
    },
    {
      onAsk: (index) =>
        ctx.api(`/api/bill/redraft?${new URLSearchParams({ billId, index })}`),
      onKeep: async (index) => {
        await ctx.api(
          `/api/bill/redraft?${new URLSearchParams({ billId, index })}`,
          "POST",
        );
        await openBillPaper(ctx, billId, show, back, backLabel);
      },
      estimate: (redraft) =>
        [
          redraft.estimateAfter.workersRaised > 0
            ? `${redraft.estimateAfter.workersRaised} ${ctx.controls.bill?.workers ?? ""}`
            : null,
          redraft.estimateAfter.annualPayMinor > 0
            ? moneyWords(redraft.estimateAfter.annualPayMinor)
            : null,
        ]
          .filter(Boolean)
          .join(" · "),
    },
    {
      onVote: async (how) => {
        await ctx.api(
          `/api/bill/override?${new URLSearchParams({ billId, vote: how })}`,
          "POST",
        );
        await openBillPaper(ctx, billId, show, back, backLabel);
      },
      onCall: async () => {
        await ctx.api(
          `/api/bill/override-call?${new URLSearchParams({ billId })}`,
          "POST",
        );
        await openBillPaper(ctx, billId, show, back, backLabel);
      },
    },
  );
  if (show.draws !== mine) return;
  show(
    ...(backButton ? [backButton] : []),
    billPaper({
      spoken: paper.spoken,
      title: paper.title,
      sponsor: `${words.sponsor ?? ""} ${paper.sponsor}`,
      sectionsLabel: words.sections ?? "",
      whereLabel: words.where ?? "",
      billLabel: words.bill ?? "",
      voteLabel: words.vote ?? "",
      band,
      stage: stageNodes,
      estimateLabel: words.estimate ?? "",
      // The budget lines the bill sets, this year beside last year's.
      extra: billFigures({
        view,
        textOf: (index) => paper.sections[index]?.text ?? paper.title,
        money: ctx.roundedMoney,
        percent: (value) =>
          new Intl.NumberFormat("en-US", {
            style: "percent",
            maximumFractionDigits: 1,
          }).format(value / 100),
        words,
      }),
      // Where it is: the committee or body that has it, who filed it and the days, from the page view.
      where: {
        heading: view.where.committee
          ? ctx.keyWords(view.where.committee)
          : view.where.bodyTitle,
        rows: [
          view.where.filedBy?.name && {
            label: pageWords.filedBy,
            value: view.where.filedBy.name,
          },
          view.where.filedOn && {
            label: pageWords.filedOn,
            value: dateWords(view.where.filedOn),
          },
          view.where.reachedChamberOn && {
            label: pageWords.reached,
            value: dateWords(view.where.reachedChamberOn),
          },
        ].filter(Boolean),
      },
      views: { clean: pageWords.clean, compare: pageWords.compare },
      amendsLabel: words.amends ?? "",
      // A phase-in's later steps: what stands until the step takes effect.
      untilLabel: words.untilThen ?? "",
      // Each chamber's result as the English engine words it, from the stage view, then the floor's
      // vote by party and those who cast none, from the page view.
      votes: [...stage.floor, ...stage.override].map((entry) => {
        const tally = view.tallies.find(
          (t) => t.stage === "floor" && t.chamber === entry.chamber,
        );
        return {
          big: entry.result,
          text: entry.chamberTitle,
          rows: [
            ...(tally?.byParty ?? []).map((row) => ({
              label: row.party ? ctx.keyWords(row.party) : pageWords.noParty,
              value: `${row.yes} ${pageWords.to} ${row.no}`,
            })),
            ...(tally?.notVoting
              ? [{ label: pageWords.notVoting, value: String(tally.notVoting) }]
              : []),
          ],
          // The player's own members in this chamber and the vote each cast
          // (the page view's yourMembers): a name, then the vote.
          members: (() => {
            const mine = (view.yourMembers ?? []).filter(
              (m) => m.chamber === entry.chamber && m.vote,
            );
            return {
              label: mine.length > 1 ? pageWords.yourMembers : pageWords.yours,
              rows: mine.map((m) => ({
                label: m.name,
                value: ctx.controls.billStage?.[m.vote] ?? "",
              })),
            };
          })(),
        };
      }),
      blank: ctx.billEstimate(paper, { estimate: {} }),
      sections: paper.sections.map((section) => ({
        text: section.text ?? paper.title,
        estimate: ctx.billEstimate(paper, section),
        inserted: view.sections[section.index]?.inserted ?? null,
        struck: view.sections[section.index]?.struck ?? null,
        amends: view.sections[section.index]?.amends?.citation ?? null,
      })),
      lines: [
        paper.authorityWarning,
        paper.effective,
        paper.floorDate
          ? `${floor.takenUp ?? ""} ${dateWords(paper.floorDate)}`
          : null,
        paper.decision
          ? `${words.decided ?? ""}: ${floor.status?.[paper.decision.status] ?? ""}${paper.decision.decidedOn ? ` · ${dateWords(paper.decision.decidedOn)}` : ""}`
          : null,
      ],
    }),
    // Dev mode: where to introduce it, how each member votes, the margin, then act (fr-dev-bill).
    ...(devModeOn()
      ? [
          await devBillCard({
            paper,
            labels: ctx.controls.devBill,
            traceLabel: ctx.controls.devTrace.trace,
            onTrace: async () => {
              const drawTrace = async (chosen) => {
                const traced = await ctx.api(
                  `/api/bill/stage?billId=${encodeURIComponent(billId)}`,
                );
                show(
                  backButton,
                  devTraceVote({
                    stage: traced,
                    paper,
                    labels: ctx.controls.devTrace,
                    words: ctx.controls.billStage,
                    floor: ctx.controls.floor,
                    chosen,
                    onPick: drawTrace,
                  }),
                );
              };
              await drawTrace(null);
            },
            onDone: () => openBillPaper(ctx, billId, show, back, backLabel),
          }),
        ].filter(Boolean)
      : []),
  );
}
