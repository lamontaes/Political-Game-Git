/**
 * Plays a sitting member of a body through a year in drawn places and
 * composes every scene of the thin banks the director stages for them
 * (brief K). Development tooling.
 *   node --import tsx scripts/dialogue-batch/thin-seat.ts --seed <seed> --places 5 [--days 365] [--out f.md]
 */
import { writeFileSync } from "node:fs";
import { buildBenchWorld } from "../../src/bench/world";
import { drawPlace } from "../core2-year/place";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { gameStartDate } from "../../src/core2/game-start";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";
import {
  bodyReach,
  LEGISLATURE_MODULE_ID,
  members,
} from "../../src/core2/modules/legislature";
import {
  OFFICES_MODULE_ID,
  type TermRow,
} from "../../src/core2/modules/offices";
import { P } from "../../src/core2/parameters";
import { advancePlayerV1, resumePlayerV1 } from "../../src/core2/player-v1";
import { coreAPI, fillInPerson } from "../../src/core2/state";
import type { PersonId } from "../../src/core2/types";
import {
  adjourn,
  deskWaiting,
  leaveDeskToCharacter,
  meetingInProgress,
  releaseHold,
  takeUpItem,
} from "../../src/core2/modules/office-day";
import rules from "../../src/director/data/scene-talk-rules.json" with { type: "json" };
import { purposeScene } from "../../src/director/purpose-scene";
import type { TreeNode, SceneTalkLine } from "../../src/director/scene-talk";

const option = (name: string, fallback: string) => {
  const at = process.argv.indexOf(`--${name}`);
  return at >= 0 ? (process.argv[at + 1] ?? fallback) : fallback;
};
const seed = option("seed", "thin-seat");
const places = Number(option("places", "3"));
const days = Number(option("days", "183"));
const out = option("out", "");
const want = option("want", "small");
const firstIndex = Number(option("from", "0"));
const WANT = new Set(
  option(
    "types",
    "floor-debate,bill-held-chair,town-hall-question,action-confront,office-hours,budget-cut",
  ).split(","),
);
if (process.env.SMALL_BOARD_SEATS)
  (rules.floorRegister.smallBoardSeats as { value: number }).value = Number(
    process.env.SMALL_BOARD_SEATS,
  );
const lines: string[] = [];
const say = (s: string) => lines.push(s);
const tally: Record<string, number> = {};
const perPlace: string[] = [];
setBookkeeping(false);
for (let i = firstIndex; i < firstIndex + places; i += 1) {
  const place = drawPlace(`${seed}:${i}`, "meetings-floor");
  const where = `${place.name} (${place.key}), seed ${seed}:${i}`;
  const { core, director } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const api = coreAPI(core);
  const town = core.people.get(core.playerId!)?.placeId;
  const terms = api
    .moduleState(OFFICES_MODULE_ID)
    .table("terms")
    .query("byStatus", ["serving"]) as unknown as TermRow[];
  const local = terms
    .filter((t) => {
      const p = core.people.get(t.personId as PersonId);
      if (!core.modules.has(LEGISLATURE_MODULE_ID)) return false;
      // A council's members are counted residents until someone meets them: this run meets one.
      if (want === "council" && !p && t.personId) {
        const seatsOf = members(api, t.officeId).length;
        const levelOf = bodyReach(api, t.officeId);
        return seatsOf > 7 && levelOf !== "state" && levelOf !== "federal";
      }
      if (p?.alive !== true) return false;
      const seats = members(api, t.officeId).length;
      if (seats <= 1) return false;
      const level = bodyReach(api, t.officeId);
      if (want === "state") return level === "state";
      if (level === "state" || level === "federal" || p.placeId !== town)
        return false;
      return want === "council" ? seats > 7 : seats <= 7;
    })
    .sort(
      (a, b) =>
        a.officeId.localeCompare(b.officeId) || a.id.localeCompare(b.id),
    );
  let personId = local[0]?.personId as PersonId | undefined;
  if (personId && !core.people.has(personId)) fillInPerson(core, personId);
  if (!personId) {
    perPlace.push(`${where}: no sitting member who is a full person`);
    console.error(perPlace.at(-1));
    continue;
  }
  const nameOf = (id: string) => {
    const r = core.people.get(id as PersonId);
    return r ? `${r.givenName} ${r.familyName}` : id;
  };
  core.focusPersonIds.add(personId);
  director.watch(core, personId);
  const book = director.ledger.people.get(personId)!;
  const got: Record<string, number> = {};
  const seen = new Set<string>();
  let packet = advancePlayerV1(core, {
    controlledPersonId: personId,
    through: {
      date: addDays(makeIsoDate(core.date), days),
      minuteOfDay: P.zero,
    },
  });
  let loops = 0;
  const stops: string[] = [];
  while (packet.kind !== "complete") {
    loops += 1;
    if (loops % 5000 === 0)
      console.error(
        `  ${where} date ${core.date} loops ${loops} kind ${packet.kind}`,
      );
    if (packet.kind === "stop") {
      for (const stop of packet.stop.modules) {
        if (seen.has(stop.recordId)) continue;
        const entry = book.schedule.find((r) => r.momentId === stop.recordId);
        const moment = book.momentsById.get(stop.recordId);
        if (!entry || !moment) continue;
        for (const b of entry.bindings) {
          if (!WANT.has(b.typeKey)) continue;
          seen.add(stop.recordId);
          got[b.typeKey] = (got[b.typeKey] ?? 0) + 1;
          tally[b.typeKey] = (tally[b.typeKey] ?? 0) + 1;
          const res = purposeScene(core, director, personId, entry, {
            typeKey: b.typeKey,
          });
          say(
            `\n### ${b.typeKey} for ${nameOf(personId)} in ${where} on ${core.date} — cause ${moment.causeId} (${moment.label})`,
          );
          if (!res || res.kind !== "composed") {
            say(`not composed: ${res ? (res as any).reason : "none"}`);
            continue;
          }
          const t = res.scene.talk;
          const asker = nameOf(t.askerId);
          say(
            `purpose ${t.purpose}; asker ${asker}; asked ${nameOf(t.askedId)}; facts: ${res.scene.facts.map((f) => f.key + "=" + f.text).join("; ")}`,
          );
          for (const l of t.narration)
            say(`Narration: ${l.text}  _[${l.parts.join(",")}]_`);
          if (t.open)
            say(`${asker}: ${t.open.text}  _[${t.open.parts.join(",")}]_`);
          say(
            `${asker}: ${t.state.text}  _[${t.state.bearing ?? "-"}; ${t.state.parts.join(",")}]_`,
          );
          const flat = (n: TreeNode, ind: string) => {
            const who = (l: SceneTalkLine) =>
              l.role === "asked" ? "You" : asker;
            for (const l of n.lines)
              say(
                `${ind}${who(l)}: ${l.text}  _[${l.move}${l.after ? " <" + l.after : ""}; ${l.bearing ?? "-"}; ${l.parts.join(",")}]_`,
              );
            if (n.end?.close)
              say(
                `${ind}${asker}: ${n.end.close.text}  _[close; ${n.end.close.parts.join(",")}]_`,
              );
            if (n.end)
              say(
                `${ind}**end: ${n.end.outcome}${n.end.ending ? " / " + n.end.ending.label : ""}**`,
              );
            for (const r of n.replies) {
              say(
                `${ind}- You (${r.line.move}): ${r.line.text}  _[${r.line.bearing ?? "-"}; ${r.line.parts.join(",")}]_`,
              );
              if (r.next) flat(r.next, ind + "  ");
            }
          };
          flat(t.tree, "");
        }
      }
      const stopLog: string[] = [];
      for (const stop of packet.stop.modules)
        stopLog.push(
          `${stop.reasonKey}:${stop.recordId}${stop.hold ? " HELD" : ""}`,
        );
      const meeting = meetingInProgress(api);
      if (meeting) {
        for (const billId of meeting.agenda.filter(
          (id) => !meeting.takenUp.includes(id),
        )) {
          try {
            takeUpItem(api, meeting.id, billId, "own");
          } catch (e) {
            stopLog.push(`takeUp threw ${(e as Error).message}`);
          }
        }
        try {
          adjourn(api, meeting.id);
          stopLog.push(`adjourned ${meeting.id}`);
        } catch (e) {
          stopLog.push(`adjourn threw ${(e as Error).message}`);
        }
      }
      for (const bill of deskWaiting(api, true)) {
        try {
          leaveDeskToCharacter(api, bill.id);
          stopLog.push(`desk left ${bill.id}`);
        } catch (e) {
          stopLog.push(`desk threw ${(e as Error).message}`);
        }
      }
      for (const stop of packet.stop.modules)
        if (stop.hold) {
          try {
            releaseHold(api, stop.recordId);
          } catch (e) {
            stopLog.push(`release threw ${(e as Error).message}`);
          }
        }
      stops.push(`${core.date}: ${stopLog.join(" | ")}`);
      const before = packet.pauseId;
      packet = resumePlayerV1(core, { kind: "stop", pauseId: packet.pauseId });
      if (packet.kind === "stop" && packet.pauseId === before) {
        stops.push(`${core.date}: STUCK on ${before}`);
        break;
      }
    } else
      packet = resumePlayerV1(core, {
        kind: "choice",
        pauseId: packet.pauseId,
        offerId: packet.offers[P.zero]!.offerId,
      });
  }
  for (const entry of book.schedule)
    for (const b of entry.bindings) {
      if (!WANT.has(b.typeKey) || seen.has(entry.momentId)) continue;
      const moment = book.momentsById.get(entry.momentId);
      say(
        `\n### SCHEDULED, NO STOP: ${b.typeKey} for ${nameOf(personId)} in ${where}, scheduled day ${entry.date}, outcome ${entry.outcome}, cause ${moment?.causeId} (${moment?.label}); roles ${b.roles.map((r: any) => r.role + "=" + r.personIds.map(nameOf).join("+")).join("; ")}`,
      );
      let res: any;
      try {
        res = purposeScene(core, director, personId, entry, {
          typeKey: b.typeKey,
          includeHeld: true,
        } as any);
      } catch (e) {
        say(`compose threw ${(e as Error).message}`);
        continue;
      }
      if (!res || res.kind !== "composed") {
        say(
          `not composed: ${res ? JSON.stringify(res).slice(0, 300) : "none"}`,
        );
        continue;
      }
      const t = res.scene.talk;
      const asker = nameOf(t.askerId);
      say(
        `purpose ${t.purpose}; asker ${asker}; asked ${nameOf(t.askedId)}; facts: ${res.scene.facts.map((f: any) => f.key + "=" + f.text).join("; ")}`,
      );
      for (const l of t.narration) say(`Narration: ${l.text}`);
      if (t.open) say(`${asker}: ${t.open.text}`);
      say(`${asker}: ${t.state.text}`);
      const flat2 = (n: TreeNode, ind: string) => {
        for (const l of n.lines)
          say(
            `${ind}${l.role === "asked" ? "You" : asker}: ${l.text}  _[${l.move}]_`,
          );
        if (n.end)
          say(
            `${ind}**end: ${n.end.outcome}${n.end.ending ? " / " + n.end.ending.label : ""}**`,
          );
        for (const r of n.replies) {
          say(`${ind}- You (${r.line.move}): ${r.line.text}`);
          if (r.next) flat2(r.next, ind + "  ");
        }
      };
      flat2(t.tree, "");
      seen.add(entry.momentId);
    }
  const kinds = [
    "floor-debate",
    "bill-held-in-committee",
    "committee-hearing",
    "town-hall",
    "office.approached",
    "budget-line-changed",
    "civic.protest",
    "civic.strike",
  ];
  const recs = kinds.map((k) => {
    const ids = [...(core.logByKind.get(k) ?? [])];
    const mine = ids.filter((id) =>
      (core.durableLog.get(id)?.personIds ?? []).includes(personId),
    ).length;
    return `${k} ${ids.length} (names the member ${mine})`;
  });
  const sched: Record<string, number> = {};
  for (const r of book.schedule)
    for (const b of r.bindings)
      if (WANT.has(b.typeKey)) sched[b.typeKey] = (sched[b.typeKey] ?? 0) + 1;
  const office = (
    api
      .moduleState(OFFICES_MODULE_ID)
      .table("terms")
      .query("byStatus", ["serving"]) as unknown as TermRow[]
  )
    .filter((t) => t.personId === personId)
    .map((t) => `${t.officeId} (${members(api, t.officeId).length} seats)`);
  perPlace.push(
    `${where}: STOPS ${stops.length}: ${stops.slice(0, 40).join(" // ")}\n  member ${nameOf(personId)}, ${days} days, stopped-and-composed ${JSON.stringify(got)}; scheduled ${JSON.stringify(sched)}; seats ${office.join(", ")}; records in the world: ${recs.join("; ")}`,
  );
  console.error(perPlace.at(-1));
}
const text =
  `# Sitting member played ${days} days in ${places} drawn places (seed ${seed})\n\n${perPlace.join("\n")}\n\nTotals: ${JSON.stringify(tally)}\n` +
  lines.join("\n") +
  "\n";
if (out) writeFileSync(out, text);
else console.log(text);
