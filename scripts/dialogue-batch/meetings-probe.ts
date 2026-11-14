/** Read-only probe for brief O: what stages for bargaining over a bill, player seated in a body. */
import { seatAct, seatView } from "../../src/bench/legislature";
import { buildBenchWorld } from "../../src/bench/world";
import { drawPlace } from "../core2-year/place";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { gameStartDate } from "../../src/core2/game-start";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";
import { advanceCore } from "../../src/core2/life";
import {
  castMemberVote,
  billOf,
  memberKey,
  memberPosition,
  members,
  votesOn,
  obligationsOf,
} from "../../src/core2/modules/legislature";
import { coreAPI } from "../../src/core2/state";
import type { CoreEventInput, PersonId } from "../../src/core2/types";
import { purposeScene, replyInScene } from "../../src/director/purpose-scene";

const [seedStr, daysArg] = process.argv.slice(2);
const DAYS = Number(daysArg ?? 150);
setBookkeeping(false);
const place = drawPlace(seedStr!, "meetings-floor");
const { core, director } = buildBenchWorld(place.seed, gameStartDate(), {
  twoLevel: true,
  placeKey: place.key,
});
const api = coreAPI(core);
const out = (s: string) => process.stdout.write(s + "\n");
out(
  `# ${place.name} (${place.key}), drawPlace("${seedStr}","meetings-floor") world seed ${place.seed}`,
);
import {
  OFFICES_MODULE_ID,
  type TermRow,
} from "../../src/core2/modules/offices";
const town = core.people.get(core.playerId!)?.placeId;
const terms = api
  .moduleState(OFFICES_MODULE_ID)
  .table("terms")
  .query("byStatus", ["serving"]) as unknown as TermRow[];
const bodyId = terms
  .filter((t) => {
    const q = core.people.get(t.personId as PersonId);
    return (
      q?.alive === true &&
      q.placeId === town &&
      members(api, t.officeId).length > 1
    );
  })
  .map((t) => t.officeId)
  .sort()[0]!;
out(`body ${bodyId}`);
const nm = (id: string) => {
  const p = core.people.get(id as PersonId) as any;
  return p ? `${p.givenName} ${p.familyName} [${id}]` : `[${id}]`;
};
const seated = members(api, bodyId!)
  .map(memberKey)
  .filter((id) => core.people.get(id as PersonId)?.alive)
  .sort();
core.playerId = seated[0]! as PersonId;
const player = core.playerId;
out(`player ${nm(player)}; ${seated.length} full members`);
for (const id of seated) {
  core.focusPersonIds.add(id as PersonId);
  director.watch(core, id as PersonId);
}
const KINDS = [
  "vote-ahead",
  "bill-amendment",
  "vote-promise",
  "carry-asked",
  "bill-held-in-committee",
  "budget-line-changed",
  "bill-vote",
  "bill-passed",
  "bill-failed",
  "lobby-meeting",
  "office.voted",
  "scene.reply",
  "obligation-settled",
  "endorsement",
];
const evs: CoreEventInput[] = [];
api.subscribeEvents(
  "bargain-probe",
  KINDS as any,
  (_: any, e: CoreEventInput) => {
    if (
      e.personIds.includes(player) ||
      e.facts?.askerId === player ||
      e.facts?.memberId === player
    )
      evs.push(e);
  },
);
// Draft bills until one has two members against on record.
const view = seatView(core, player);
const drafted: { id: string; number: string; against: string[] }[] = [];
for (const question of view.questions) {
  if (drafted.length >= 4) break;
  let bill: any;
  try {
    bill = seatAct(core, player, {
      kind: "draft",
      officeId: bodyId,
      question,
      value: 1,
    });
  } catch (e) {
    continue;
  }
  if (bill.status === "blocked") {
    out(`blocked ${bill.number} (${question}): the body lacks the power`);
    continue;
  }
  const against = seated.filter(
    (id) => id !== player && memberPosition(api, bill.id, id).total < 0,
  );
  const forIt = seated.filter(
    (id) => id !== player && memberPosition(api, bill.id, id).total > 0,
  );
  out(
    `drafted ${bill.number} (${question}) agenda ${bill.agendaDate ?? "-"} floor ${bill.floorDate ?? "-"}: ${forIt.length} for, ${against.length} against`,
  );
  drafted.push({ id: bill.id, number: bill.number, against });
}
// A town whose questions are mostly not its own: also cut budget lines and raise law amounts, the other bills a seat can write.
if (!drafted.some((d) => d.against.length >= 2)) {
  const items = view.bodies
    .filter((b: any) => b.officeId === bodyId)
    .flatMap((b: any) => b.menus.flatMap((m: any) => m.items));
  for (const item of items) {
    if (drafted.filter((d) => d.against.length >= 2).length >= 2) break;
    let input: any = null;
    if (item.line && item.inForce)
      input = {
        kind: "draft",
        officeId: bodyId,
        line: item.line,
        value: Math.round(item.inForce * 0.6),
      };
    else if (
      item.series &&
      typeof item.inForce === "number" &&
      item.inForce > 0
    )
      input = {
        kind: "draft",
        officeId: bodyId,
        series: item.series,
        value: item.inForce * 1.5,
      };
    if (!input) continue;
    let bill: any;
    try {
      bill = seatAct(core, player, input);
    } catch (e) {
      continue;
    }
    if (bill.status === "blocked") continue;
    const against = seated.filter(
      (id) => id !== player && memberPosition(api, bill.id, id).total < 0,
    );
    const forIt = seated.filter(
      (id) => id !== player && memberPosition(api, bill.id, id).total > 0,
    );
    out(
      `drafted ${bill.number} (${item.line ? "cut line " + item.line : "raise " + item.series} from ${item.inForce}) floor ${bill.floorDate ?? "-"}: ${forIt.length} for, ${against.length} against`,
    );
    drafted.push({ id: bill.id, number: bill.number, against });
  }
}
// The player presses Yes on their own bills (the stop a player answers in play).
for (const d of drafted) castMemberVote(api, d.id, player, "yes");
const pos = (b: string, id: string) => {
  const p: any = memberPosition(api, b, id);
  return `total ${p.total.toFixed(3)} (views ${p.views.toFixed(2)}, constituents ${p.constituents.toFixed(2)}, sponsor ${p.sponsor.toFixed(2)}, deal ${p.deal.toFixed(2)}, lobby ${p.lobby.toFixed(2)}, trait ${p.trait.toFixed(2)}, consistency ${p.consistency.toFixed(2)}${p.party !== undefined ? `, party ${p.party.toFixed(2)}, wing ${p.wing?.toFixed(2)}, ambition ${p.ambition?.toFixed(2)}, press ${p.press?.toFixed(2)}` : ""}${p.reply ? `, reply ${p.reply.toFixed(2)} ${p.replyIds}` : ""})`;
};
for (const d of drafted) {
  out(`## ${d.number} opposed on record by:`);
  for (const id of d.against) out(`  ${nm(id)}: ${pos(d.id, id)}`);
}
const WATCH = new Set([
  "floor-debate",
  "bill-held-chair",
  "town-hall-question",
  "action-confront",
  "office-hours",
  "budget-cut",
]);
const seen = new Set<string>();
const allTypes = new Map<string, number>();
const dump = (n: any, depth: number, ind: string) => {
  if (!n || depth > 3) return;
  for (const l of n.lines) out(`${ind}${l.speaker} [${l.move}]: ${l.text}`);
  if (n.end)
    out(
      `${ind}END ${n.end.outcome}${n.end.ending ? ` ending=${n.end.ending.id} keeps=${n.end.ending.keeps}` : ""}${n.end.close ? ` close: ${n.end.close.text}` : ""}`,
    );
  for (const r of n.replies) {
    out(`${ind}> PLAYER [${r.line.move}]: ${r.line.text}`);
    dump(r.next, depth + 1, ind + "    ");
  }
};
const start = makeIsoDate(gameStartDate());
for (let day = 1; day <= DAYS; day++) {
  advanceCore(core, addDays(start, day));
  const book = director.ledger.people.get(player);
  if (!book) continue;
  for (const entry of book.schedule)
    for (const b of entry.bindings) {
      const k = `${entry.momentId}|${b.typeKey}`;
      if (seen.has(k)) continue;
      seen.add(k);
      allTypes.set(b.typeKey, (allTypes.get(b.typeKey) ?? 0) + 1);
      if (!WATCH.has(b.typeKey)) continue;
      out(
        `\n### ${core.date} STAGED ${b.typeKey} moment ${entry.momentId} outcome ${entry.outcome} roles ${b.roles.map((r: any) => `${r.role}=${r.personIds.map(nm).join("+")}`).join("; ")}`,
      );
      let res: any;
      try {
        res = purposeScene(core, director, player, entry, {
          typeKey: b.typeKey,
          includeHeld: true,
        });
      } catch (e) {
        out(`  compose threw ${(e as Error).message}`);
        continue;
      }
      if (res?.kind !== "composed") {
        out(
          `  not composed: ${res?.kind} ${JSON.stringify(res).slice(0, 300)}`,
        );
        continue;
      }
      const s = res.scene;
      out(`  cause ${s.cause?.id} purpose ${s.talk.purpose}`);
      for (const l of s.talk.narration) out(`  NARR: ${l.text}`);
      if (s.talk.open)
        out(`  ${s.talk.open.speaker} [open]: ${s.talk.open.text}`);
      for (const l of s.talk.intro) out(`  ${l.speaker} [intro]: ${l.text}`);
      out(
        `  ${s.talk.state.speaker} [${s.talk.state.move}]: ${s.talk.state.text}`,
      );
      dump(s.talk.tree, 0, "  ");
      // For the player's own ask, take the bargain or plea path so the roll can be read.
      if (b.typeKey === "vote-sought") {
        const i = s.talk.tree.replies.findIndex((r: any) =>
          ["bargain", "plea"].includes(r.line.move),
        );
        if (i >= 0) {
          const rid = replyInScene(core, director, player, entry, [i], {
            typeKey: b.typeKey,
            includeHeld: true,
          });
          out(
            `  CHOSE path ${i} (${s.talk.tree.replies[i].line.move}) reply ${rid}`,
          );
        }
      }
    }
}
out(`\n## events touching the player`);
for (const e of evs)
  out(
    `  ${e.date} ${e.kind} ${e.id} ${JSON.stringify(e.facts ?? {}).slice(0, 260)}`,
  );
for (const d of drafted) {
  const b: any = billOf(api, d.id);
  out(
    `\n## ${d.number} status ${b.status}; deals ${JSON.stringify(b.deals).slice(0, 600)}`,
  );
  for (const v of votesOn(api, d.id) as any[])
    out(
      `  ${v.override ? "override " : ""}${nm(v.memberId)} ${v.vote} total ${v.position?.total?.toFixed(3)} replies ${v.position?.replyIds ?? []} traded ${JSON.stringify(v.traded ?? [])}`,
    );
}
out(
  `\nobligations owed by player: ${JSON.stringify(obligationsOf(api, player))}`,
);
for (const k of [
  "floor-debate",
  "bill-held-in-committee",
  "committee-hearing",
  "town-hall",
  "office.approached",
  "budget-line-changed",
  "civic.protest",
  "civic.strike",
]) {
  const ids = [...(core.logByKind.get(k) ?? [])];
  out(
    `RECORDS ${k}: ${ids.length} in the world, ${ids.filter((id) => (core.durableLog.get(id)?.personIds ?? []).includes(player)).length} name the player: ${ids.slice(0, 4).join(", ")}`,
  );
}
{
  const book = director.ledger.people.get(player)!;
  for (const id of [...(core.logByKind.get("office.approached") ?? [])]
    .filter((i) => (core.durableLog.get(i)?.personIds ?? []).includes(player))
    .slice(0, 4)) {
    const ms = [...book.momentsById.values()].filter(
      (m: any) => m.causeId === id,
    );
    out(
      `office.approached ${id}: ${ms.length} moments ${ms.map((m: any) => m.label + " selfNamed=" + m.selfNamed + " impact=" + m.impact).join("; ")}; schedule ${book.schedule
        .filter((e: any) => ms.some((m: any) => m.id === e.momentId))
        .map(
          (e: any) =>
            e.outcome + ":" + e.bindings.map((b: any) => b.typeKey).join(","),
        )
        .join(" | ")}`,
    );
  }
}
out(
  `\nall scene types staged for player in ${DAYS} days: ${[...allTypes].map(([k, n]) => `${k} ${n}`).join(", ")}`,
);
