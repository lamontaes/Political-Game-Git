/* global URLSearchParams */
// Moved out of src/bench/play.mjs by scripts/screens/split-client.mjs: campaignParts takes the page's context first.
import { select, numberBox } from "./fields.mjs";
import { travelScreen } from "./travel-screen.mjs";
import { line } from "./text.mjs";
import { makeButton, buttonRow } from "./button.mjs";
import {
  stripBoard,
  stripSection,
  moneyFigure,
  dotRows,
  introText,
  deskBill,
} from "./strips.mjs";
import { moneyWords, dateWords } from "../../english/plain-words.mjs";
import { speechCard, debateCard } from "./campaign-acts.mjs";

export async function campaignParts(ctx) {
  const v = await ctx.api(`/api/campaign?id=${encodeURIComponent(ctx.me.id)}`);
  const parts = [];
  for (const {
    filing,
    contest,
    campaign,
    pollSample,
    pollPrice,
    petition,
    outings,
    standing,
    debates,
    team,
    pictures,
    runningMate,
  } of v.campaigns) {
    const goOut = async (outing, outletId) => {
      const kindOf = {
        doors: "canvass",
        calls: "raise-money",
        event: "event",
        forum: "forum",
        interview: "interview",
        party: "donor-meeting",
      };
      const result = await ctx.post(
        `/api/campaign/day?${new URLSearchParams({ filingId: filing.id, kind: kindOf[outing], ...(outletId ? { outletId } : {}) })}`,
      );
      // The outing's hours moved the clock: the card shows the new time.
      if (result.packet) ctx.renderPacket(result.packet);
      ctx.campaignLines = (result.calls ?? []).map((call) => call.line);
      // An evening of calls is a scene (owner: every campaign act is a scene):
      // the player at the phones, one call per Continue, each person heard by
      // name with what they gave or why not, then the night's total.
      if (outing === "calls" && result.callsLine) {
        ctx.campaignResult = result.callsLine;
        ctx.playAsks({
          asked: result.calls ?? [],
          summary: result.callsLine,
          scene: result.scene,
        });
        return;
      }
      ctx.campaignResult = [
        ctx.controls.campaignOutings[outing],
        result.doorsKnocked
          ? ctx.controls.campaignResults.doors.replace(
              "{n}",
              result.doorsKnocked,
            )
          : "",
        // Doors that opened on a petition's outing, whether asked to sign or
        // for the vote (the Words lead, Nov 14); "reached" says the people met
        // and shows where any door asked for the vote.
        result.answered !== null && result.answered !== undefined
          ? ctx.controls.campaignResults.answered.replace(
              "{n}",
              result.answered,
            )
          : "",
        result.reached &&
        (result.votesAsked === null ||
          result.votesAsked === undefined ||
          result.votesAsked > 0)
          ? ctx.controls.campaignResults.reached.replace("{n}", result.reached)
          : "",
        result.raisedMinor ? moneyWords(result.raisedMinor) : "",
      ]
        .filter(Boolean)
        .join(" · ");
      // An outlet that said no says why, in the words the trail already has
      // (a refusal with no label there shows the outing's name only).
      const refusal = {
        "already-interviewed": ctx.controls.campaignUnavailable.interviewed,
        "no-room": ctx.controls.campaignUnavailable.outletsFull,
      }[result.interview?.reason];
      if (
        outing === "interview" &&
        result.interview?.status === "declined" &&
        refusal
      )
        ctx.campaignResult = refusal;
      // A donor meeting is seen in the host's home, told by what the room gave.
      if (outing === "party" && result.callsLine)
        ctx.campaignResult = result.callsLine;
      // Something that came up while out holds the clock: it is shown, as
      // after Day, so Continue never stands over an empty screen.
      const moment = ctx.storyStop(result.packet);
      // The doors and the calls are seen where they happen, with the people reached.
      if (result.scene || moment) ctx.closeSheet();
      if (result.scene) {
        ctx.setBackdrop(result.scene.backdrop);
        ctx.drawHere(result.scene, (p) => ctx.talkTo(p.personId));
      }
      if (moment) await ctx.showStory(moment.recordId);
      if (!result.scene && !moment) ctx.reopenTrail(filing.id);
    };
    const act = async (kind, extra = {}) => {
      ctx.campaignLines = [];
      const result = await ctx.post(
        `/api/campaign/act?${new URLSearchParams({ filingId: filing.id, kind, ...extra })}`,
      );
      ctx.campaignResult =
        typeof result.line === "string" && result.setAsideMinor !== undefined
          ? result.line
          : result.volunteers !== undefined
            ? ctx.controls.campaignVolunteers.asked
                .replace("{asked}", String(result.answers.length))
                .replace(
                  "{yes}",
                  String(result.answers.filter((a) => a.yes).length),
                )
                .replace("{volunteers}", ctx.volunteerCount(result.volunteers))
            : result.contacted !== undefined
              ? `${ctx.controls.campaignActs[kind] ?? ""}: ${result.contacted} · ${Object.entries(
                  result.answers,
                )
                  .map(([k, n]) => `${ctx.plain(k) ?? ""} ${n}`)
                  .join(" · ")}`
              : result.reached !== undefined
                ? `${ctx.controls.campaignActs[kind] ?? ""}: ${result.reached} · +${result.warmer} · −${result.cooler}`
                : `${ctx.controls.campaignActs[kind] ?? ""}: ${result.answers.filter((a) => a.yes || a.givenMinor > 0).length} / ${result.answers.length}${result.answers.some((a) => a.givenMinor) ? ` · ${moneyWords(result.answers.reduce((t, a) => t + (a.givenMinor ?? 0), 0))}` : ""}`;
      // A volunteer shift is a scene: each person asked is the next Continue.
      if (kind === "ad" && result.scene) {
        ctx.playAsks({ asked: [], summary: result.line, scene: result.scene });
        return;
      }
      if (
        (kind === "volunteer" || kind === "endorsement") &&
        result.answers?.length
      ) {
        ctx.playAsks({
          asked: result.answers,
          summary: ctx.campaignResult,
          scene: result.scene,
        });
        return;
      }
      // A speech is seen where it was given, with the people it reached.
      if (result.scene) {
        ctx.closeSheet();
        ctx.setBackdrop(result.scene.backdrop);
        ctx.drawHere(result.scene);
        return;
      }
      ctx.reopenTrail(filing.id);
    };
    const venue = select({
      options: (v.venues ?? []).map((place) => ({
        value: place,
        label: ctx.controls.venues?.[place] ?? "",
      })),
    });
    const button = (label, kind, extra) => {
      const b = makeButton({ textContent: label });
      b.addEventListener("click", () =>
        act(kind, typeof extra === "function" ? extra() : extra),
      );
      return b;
    };
    // The acts are scenes you go to: each is a place on the trail (the mock's pl-trail), its
    // hours and why it is out of reach, and Go. Money, the speech and debates open their own
    // controls beside the list.
    const T = ctx.controls.campaignBoard;
    const go = (onClick) => ({ label: T.go, onClick });
    const entries = [
      ...(outings ?? []).map((choice) => {
        const why = choice.why
          ? (ctx.controls.campaignUnavailable[choice.why.key] ?? "")
              .replace("{price}", moneyWords(choice.why.priceMinor ?? 0))
              .replace("{cash}", moneyWords(choice.why.cashMinor ?? 0))
          : "";
        return {
          group: T.groupOut,
          title: ctx.controls.campaignOutings[choice.outing],
          picture: choice.picture,
          load: async () => ({
            facts: [
              {
                label: T.howLong,
                value: `${choice.hours} ${ctx.controls.campaignOutings.hours}`,
              },
              // What the doors ask for now: signatures while the petition is
              // short of its target, votes after it and in a race with none.
              ...(choice.outing === "doors"
                ? [
                    {
                      label: T.asking,
                      value: petition?.asksAtDoors
                        ? T.askingSignatures
                        : T.askingVotes,
                    },
                  ]
                : []),
            ],
            does: why
              ? [why]
              : choice.outing === "doors" && petition?.gatherTarget
                ? [
                    petition.asksAtDoors
                      ? T.askingWhySignatures
                      : T.askingWhyVotes,
                  ]
                : [],
          }),
          ...(choice.available
            ? { go: go(() => goOut(choice.outing, choice.outletId)) }
            : {}),
        };
      }),
      ...[
        ["volunteer", undefined],
        ["endorsement", undefined],
        ["ad", { amountMinor: "5000" }],
        ["poll", { sampleSize: String(pollSample) }],
      ].map(([kind, extra]) => ({
        group: T.groupAsk,
        title: ctx.controls.campaignActs[kind],
        picture: pictures?.[kind],
        // A poll's price is said where it is bought, not among where the race stands.
        load: async () =>
          kind === "poll" && pollPrice ? { nodes: [line(pollPrice)] } : {},
        // stopgapId: SG-PLAY-campaign-acts-buttons
        go: go(() => act(kind, extra)),
      })),
      {
        group: T.groupMoney,
        title: ctx.controls.campaignActs.mail,
        picture: pictures?.mail,
        load: async () => {
          const dollarsOut = numberBox({
            value: 50,
            min: 0,
            step: 1,
            label: ctx.controls.campaignContribute.dollars,
          });
          const send = button(ctx.controls.campaignActs.mail, "mail", () => ({
            amountMinor: String(Math.round(Number(dollarsOut.value) * 100)),
          }));
          send.dataset.testid = "campaign-mail";
          return { nodes: [buttonRow(dollarsOut, send)] };
        },
      },
      // Paid circulators gather the signatures a county, district or
      // statewide race needs outside the town while its petition circulates.
      ...(petition?.outside
        ? [
            {
              group: T.groupMoney,
              title: ctx.controls.campaignActs.circulators,
              picture: pictures?.circulators,
              load: async () => {
                const dollarsOut = numberBox({
                  value: 500,
                  min: 0,
                  step: 1,
                  label: ctx.controls.campaignContribute.dollars,
                });
                const hire = button(
                  ctx.controls.campaignActs.circulators,
                  "circulators",
                  () => ({
                    amountMinor: String(
                      Math.round(Number(dollarsOut.value) * 100),
                    ),
                  }),
                );
                hire.dataset.testid = "campaign-circulators";
                return { nodes: [buttonRow(dollarsOut, hire)] };
              },
            },
          ]
        : []),
      {
        group: T.groupMoney,
        title: ctx.controls.campaignContribute.give,
        picture: pictures?.contribute,
        load: async () => {
          const dollarsIn = numberBox({
            value: 0,
            min: 0,
            step: 1,
            label: ctx.controls.campaignContribute.dollars,
          });
          const give = makeButton({
            textContent: ctx.controls.campaignContribute.give,
          });
          give.addEventListener("click", () =>
            act("contribute", {
              amountMinor: String(Math.round(Number(dollarsIn.value) * 100)),
            }),
          );
          return { nodes: [buttonRow(dollarsIn, give)] };
        },
      },
      {
        group: T.groupSpeak,
        title: T.speech,
        picture: pictures?.speech,
        load: async () => ({
          nodes: [
            speechCard({
              words: ctx.controls.speech,
              state: ctx.speechState,
              venue,
              onBegin: async () => {
                ctx.speechState = await ctx.post("/api/campaign/speech/begin");
                ctx.reopenTrail(filing.id);
              },
              onPick: async (choice) => {
                ctx.speechState = await ctx.post(
                  `/api/campaign/speech/pick?${new URLSearchParams({ key: choice.key })}`,
                );
                ctx.reopenTrail(filing.id);
              },
              onGive: async () => {
                const result = await ctx.post(
                  `/api/campaign/speech/give?${new URLSearchParams({ filingId: filing.id, venue: venue.value })}`,
                );
                ctx.speechState = null;
                ctx.campaignResult = `${result.reached} · +${result.warmer} · −${result.cooler} · ${result.retold} ${ctx.controls.speech.retold}`;
                // A speech is seen where it was given, with the people it reached.
                ctx.closeSheet();
                ctx.setBackdrop(result.scene.backdrop);
                ctx.drawHere(result.scene);
              },
            }),
          ],
        }),
      },
      // A debate the outlet invited the candidates to: one position (or a pass) on each question it asks.
      ...(debates ?? []).map((debate) => ({
        group: T.groupSpeak,
        title: ctx.controls.debate.title ?? T.debate,
        picture: pictures?.debate,
        load: async () => ({
          nodes: [
            debateCard({
              words: ctx.controls.debate,
              // The day in words ("October 20, 2026"), never the record's digits.
              debate: { ...debate, date: dateWords(debate.date) },
              // Yes: the sitting goes on the record, and the director stages it.
              onAccept: async () => {
                await ctx.post(
                  `/api/campaign/debate/accept?${new URLSearchParams({
                    debateId: debate.id,
                  })}`,
                );
                ctx.reopenTrail(filing.id);
              },
              // No: the debate is held without the player's answers.
              onDecline: async () => {
                await ctx.post(
                  `/api/campaign/debate?${new URLSearchParams({
                    debateId: debate.id,
                    answers: "[]",
                  })}`,
                );
                ctx.reopenTrail(filing.id);
              },
            }),
          ],
        }),
      })),
    ];
    const trail = [
      ...travelScreen({
        entries,
        // The only list under a trail tile is why the act is out of reach today.
        labels: { whoIsThere: "", whatICanDo: T.notToday },
      }),
      ...(ctx.campaignResult ? [line(ctx.campaignResult)] : []),
      ...ctx.campaignLines.map((text) => line(text)),
    ];
    // The campaign board (the mock's pl-campaign): where the race stands in sentences the
    // English engine wrote, the money, and the way out onto the trail.
    // Its card in Travel shows the street the trail starts on, as each act's tile shows its place.
    const part = { filing, contest, trail, picture: pictures?.doors };
    const labelsC = ctx.controls.campaignBoard ?? {};
    const out = makeButton({ textContent: labelsC.trail });
    out.addEventListener("click", () => ctx.trailView(part));
    part.tab = stripBoard({
      className: "campaign-board",
      columns: [
        [
          stripSection(
            1,
            ctx.controls.raceStanding.title,
            ...(standing ?? []).map((text) => introText(text)),
          ),
          ...(runningMate ? [ctx.ticketSection(filing, runningMate)] : []),
        ],
        [
          stripSection(
            2,
            labelsC.money,
            moneyFigure(moneyWords(campaign.raisedMinor)),
            dotRows([
              {
                label: labelsC.raised,
                value: moneyWords(campaign.raisedMinor),
              },
              { label: labelsC.spent, value: moneyWords(campaign.spentMinor) },
              { label: labelsC.volunteers, value: String(campaign.volunteers) },
              { label: labelsC.doors, value: String(campaign.doors) },
              // The petition record: the signatures held against those the
              // law asks, and the day they are due (owner, Nov 14: the tab keeps
              // the running total). A race that asks no signatures shows none.
              ...(petition?.needed
                ? [
                    {
                      label: labelsC.signatures,
                      value: (petition.signed >= petition.needed
                        ? labelsC.signaturesEnough
                        : labelsC.signaturesHeld
                      ).replace("{date}", dateWords(petition.due)),
                    },
                  ]
                : []),
              ...(campaign.endorsements
                ? [
                    {
                      label: labelsC.endorsements,
                      value: String(campaign.endorsements),
                    },
                  ]
                : []),
            ]),
          ),
        ],
        [
          // The inbox: only requests a record holds (a debate the outlet invited you to), each
          // opening where it is answered; no heading when there is none.
          ...(debates?.length
            ? [
                stripSection(
                  3,
                  labelsC.inbox,
                  ...debates.map((debate) => {
                    const open = makeButton({ textContent: labelsC.inboxOpen });
                    open.addEventListener("click", () => ctx.trailView(part));
                    return deskBill(
                      line(ctx.controls.debate?.title ?? labelsC.debate),
                      line(dateWords(debate.date)),
                      buttonRow(open),
                    );
                  }),
                ),
              ]
            : []),
          // The team: the people on the campaign's own record, who runs it and who helps.
          ...(team?.staff.length || team?.volunteers.length
            ? [
                stripSection(
                  4,
                  labelsC.team,
                  ...team.staff.map((p) => ctx.row(p.name, labelsC.staff)),
                  ...team.volunteers.map((p) =>
                    ctx.row(p.name, labelsC.volunteer),
                  ),
                ),
              ]
            : []),
          buttonRow(out),
        ],
      ],
    });
    parts.push(part);
  }
  return parts;
}
