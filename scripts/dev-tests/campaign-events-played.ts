/**
 * Campaign events as played (Brief Q, step 1; development tooling only).
 *
 *   node --import tsx scripts/dev-tests/campaign-events-played.ts <seed> <town|county|state> [out.md]
 *
 * Draws a place from the seed (the first of the seed's draws whose filing
 * list holds a race of the wanted kind that the player may file for and that
 * at least one other candidate also files for), files the player, gathers the
 * petition's signatures, and then plays day by day to three days after the
 * vote: every Campaign tab act is taken on a rotation, and every scene the
 * director stages for the player's race is recorded with its cause record,
 * its packet and its whole tree. Prints markdown.
 */
import { writeFileSync } from "node:fs";
import { drawPlace } from "../core2-year/place";
import { applyChosenPerson } from "../../src/bench/creator";
import { fileForOffice } from "../../src/bench/government";
import { buildBenchWorld } from "../../src/bench/world";
import { campaignAct, campaignDay } from "../../src/bench/campaign";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { gameStartDate } from "../../src/core2/game-start";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";
import { advanceCore } from "../../src/core2/life";
import { campaignFor } from "../../src/core2/modules/campaigns";
import {
  ELECTIONS_MODULE_ID,
  type FilingRow,
  openContests,
  playerMayFileFor,
} from "../../src/core2/modules/elections";
import { coreAPI } from "../../src/core2/state";
import { OFFICES_MODULE_ID } from "../../src/core2/modules/offices";
import type { PersonId } from "../../src/core2/types";
import { purposeScene, replyInScene } from "../../src/director/purpose-scene";
import { openConversation, say } from "../../src/director/conversation";
import { composeScene } from "../../src/director/scene";
import type { TreeNode } from "../../src/director/scene-talk";
import { gatherSignatures } from "../../src/core2/campaign-petition-kit";

const seed = process.argv[2] ?? "q1";
const kind = process.argv[3] ?? "town";
const outFile = process.argv[4] ?? "";
const KINDS: Record<string, (c: { level: string; family: string }) => boolean> =
  {
    town: (c) =>
      c.level === "city" || c.level === "township" || c.level === "town",
    county: (c) => c.level === "county",
    state: (c) => c.level === "state" && c.family === "stateLegislative",
  };
const wanted = KINDS[kind]!;

const out: string[] = [];
const log = (s = "") => {
  out.push(s);
  console.log(s);
};
const nameOf = (
  core: ReturnType<typeof buildBenchWorld>["core"],
  id: string,
) => {
  const row = core.people.get(id as PersonId);
  return row ? `${row.givenName} ${row.familyName}` : id;
};

setBookkeeping(false);
let chosen:
  | undefined
  | {
      place: ReturnType<typeof drawPlace>;
      world: ReturnType<typeof buildBenchWorld>;
      contest: {
        id: string;
        level: string;
        family: string;
        title: string;
        electionDate: string;
      };
      me: PersonId;
    };
for (let draw = 0; draw < (kind === "county" ? 60 : 12) && !chosen; draw += 1) {
  const place = drawPlace(`${seed}:${draw}`, "campaign-events");
  const world = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const { core, director } = world;
  const me = world.playerId! as PersonId;
  applyChosenPerson(core, me, {
    givenName: "Pat",
    familyName: core.people.get(me)!.familyName,
    gender: "female",
    birthYear: 1985,
    birthMonth: 6,
    birthDay: 1,
  });
  const player = core.people.get(me)!;
  for (const id of [
    me,
    ...(core.households.get(player.householdId)?.memberIds ?? []),
  ])
    if (core.people.get(id)?.alive) director.watch(core, id as PersonId);
  const api = coreAPI(core);
  if (kind === "county") {
    // The player runs for a county office only where the home has no city or township government.
    const local = (
      api
        .moduleState(OFFICES_MODULE_ID)
        .table("offices")
        .query("byTown", [true]) as unknown as { level: string; kind: string }[]
    ).filter((o) => o.level === "city" || o.level === "township");
    if (local.length) {
      log(
        `(draw ${draw}: ${place.name} has a ${local[0]!.kind}, so no county race for the player)`,
      );
      continue;
    }
  }
  for (let week = 0; week < 110; week += 1) {
    const open = [...openContests(api)]
      .filter(
        (c) =>
          wanted(c) &&
          c.electionDate >= addDays(makeIsoDate(core.date), 75) &&
          playerMayFileFor(api, c.id),
      )
      .sort(
        (a, b) =>
          a.electionDate.localeCompare(b.electionDate) ||
          a.id.localeCompare(b.id),
      );
    if (open.length) {
      chosen = { place, world, contest: open[0] as never, me };
      break;
    }
    advanceCore(core, addDays(makeIsoDate(core.date), 7));
  }
  if (!chosen)
    log(
      `(draw ${draw}: ${place.name} has no ${kind} race the player may file for)`,
    );
}
if (!chosen) throw new Error("no place offered the race");
const { place, world, contest, me } = chosen;
const { core, director } = world;
const api = coreAPI(core);
const pending = (rows: unknown[]) => rows.length;
void pending;

log(`# Campaign events played: ${kind}, seed ${seed}`);
log();
log(
  `Place ${place.name} (${place.key}), world seed ${place.seed}. Player ${nameOf(core, me)} (${me}). Race ${contest.id} "${contest.title}" (${contest.level}/${contest.family}), election ${contest.electionDate}, filing opened ${core.date}.`,
);

const filed = fileForOffice(core, me, contest.id) as {
  filing?: { id?: string; status?: string };
};
log(`Filed: ${JSON.stringify(filed.filing)}`);
const filingId = filed.filing?.id ?? `filing:${contest.id}:${me}`;
const petition = gatherSignatures(core, filingId);
log(
  `Petition: ${petition ? JSON.stringify({ needed: petition.needed, valid: petition.check?.valid }) : "none"}`,
);
const filedOn = core.date;
{
  const c = campaignFor(api, filingId);
  log(
    `Campaign platform at filing: ${c.platform.map((x) => `${x.question}=${x.position}`).join(", ") || "(none)"}`,
  );
}

type Rec = {
  date: string;
  typeKey: string;
  momentId: string;
  causeId: string;
  interrupt: boolean;
  outcome: string;
};
const staged: Rec[] = [];
const seen = new Set<string>();
const dumped = new Map<string, number>();
const CAMPAIGN_TYPES = new Set([
  "debate-invite",
  "debate-sitting",
  "interview-invite",
  "interview-sitting",
  "rally-word",
  "rally-opponent",
  "donor-ask",
  "volunteer-offer",
  "manager-offer",
  "party-recruit",
  "rival-word",
  "polling-place",
  "race-won",
  "race-lost",
]);
const dumpTree = (
  node: TreeNode | null,
  depth: number,
  budget: { n: number },
): string[] => {
  if (!node || budget.n <= 0) return [];
  const rows: string[] = [];
  const pad = "  ".repeat(depth);
  for (const l of node.lines)
    rows.push(
      `${pad}- [${l.role}${l.speaker ? " " + l.speaker : ""} / ${l.move}] ${l.text}`,
    );
  for (const b of node.branches ?? []) {
    rows.push(`${pad}- branch ${b.label}`);
    rows.push(...dumpTree(b.node, depth + 1, budget));
  }
  for (const r of node.replies) {
    budget.n -= 1;
    rows.push(`${pad}- **Player** [${r.line.move}] ${r.line.text}`);
    rows.push(...dumpTree(r.next, depth + 1, budget));
  }
  if (node.end) {
    const e = node.end as {
      outcome?: unknown;
      close?: { text: string };
      ending?: { id?: string; label?: string };
    };
    rows.push(
      `${pad}- END ${JSON.stringify(e.outcome)} ${e.ending ? `ending ${e.ending.id}` : ""}${e.close ? ` close: ${e.close.text}` : ""}`,
    );
  }
  return rows;
};

const actLog: string[] = [];
const tryAct = (label: string, fn: () => unknown) => {
  try {
    const r = fn() as Record<string, unknown> | undefined;
    const brief = r
      ? JSON.stringify(r, (k, v) =>
          Array.isArray(v) && v.length > 3 ? `[${v.length} items]` : v,
        ).slice(0, 220)
      : "";
    actLog.push(`${core.date} ${label}: ok ${brief}`);
  } catch (e) {
    {
      const c = campaignFor(api, filingId);
      actLog.push(
        `${core.date} ${label}: REFUSED ${(e as Error).message.slice(0, 140)} [cash ${c.raisedMinor - c.spentMinor}, platform ${c.platform.length}]`,
      );
    }
  }
};

const ANSWER_YES = new Set([
  "debate-invite",
  "interview-invite",
  "volunteer-offer",
  "manager-offer",
  "donor-ask",
  "rival-word",
  "party-recruit",
]);
const scenesOut: string[] = [];
const slog = (t = "") => scenesOut.push(t);
const playEntry = (r: Rec) => {
  const entry = director.ledger.people
    .get(me)!
    .schedule.find((e) => e.momentId === r.momentId)!;
  const count = dumped.get(r.typeKey) ?? 0;
  const show = count < 3;
  dumped.set(r.typeKey, count + 1);
  const L = show ? slog : () => undefined;
  L();
  L(
    `### ${r.date} ${r.typeKey} (cause ${r.causeId}${r.interrupt ? ", stops the day" : ", does not stop the day"}, outcome ${r.outcome})`,
  );
  const cause = core.durableLog.get(r.causeId as never);
  L(
    `Cause record: kind ${cause?.kind} facts ${JSON.stringify(cause?.facts ?? {}).slice(0, 700)}`,
  );
  if (r.typeKey === "debate-sitting" || r.typeKey === "interview-sitting") {
    const scene = composeScene(core, director, me, entry);
    L(`Sitting narration: ${scene?.narration.map((l) => l.text).join(" ")}`);
    if (!scene?.talkToId) {
      L("no one to talk to");
      return;
    }
    const conv = openConversation(core, me, scene.talkToId, {
      director,
      occasionId: entry.momentId,
    });
    L(
      `Sitting kind ${conv.sitting?.row.kind ?? "NONE"}; questions ${JSON.stringify(conv.sitting?.row.questions)}`,
    );
    const printed = new Set<number>();
    const flush = () => {
      conv.lines.forEach((l, i) => {
        if (!printed.has(i)) {
          printed.add(i);
          L(
            `- [${l.speakerId === me ? "Player" : nameOf(core, l.speakerId as string)} / ${l.act}] ${l.text}`,
          );
        }
      });
    };
    flush();
    const prefer = ["further", "turn", "plain", "brief"];
    for (let at = 0; conv.choices.length && at < 12; at += 1) {
      L(
        `  choices: ${conv.choices.map((c) => `[${c.move}] ${c.text}`).join(" | ")}${conv.lies.length ? ` | LIE: ${conv.lies.map((c) => c.text).join(" | ")}` : ""}`,
      );
      const pick =
        prefer
          .map((m) => conv.choices.find((c) => c.move === m))
          .find(Boolean) ?? conv.choices[0]!;
      say(core, conv, pick.key);
      flush();
    }
    L(`published: ${conv.sitting?.published ?? "not published"}`);
    return;
  }
  let res;
  try {
    res = purposeScene(core, director, me, entry, { typeKey: r.typeKey });
  } catch (e) {
    L(`purposeScene threw: ${(e as Error).message}`);
    return;
  }
  if (!res) {
    L("No purpose on the row. composeScene says:");
    try {
      const s = composeScene(core, director, me, entry);
      L(
        "```\n" +
          JSON.stringify(s, (k, v) => (k === "talk" ? undefined : v)).slice(
            0,
            1500,
          ) +
          "\n```",
      );
    } catch (e) {
      L(`composeScene threw: ${(e as Error).message}`);
    }
    return;
  }
  if (res.kind === "skipped") {
    L(`SKIPPED: ${res.reason}`);
    return;
  }
  const s = res.scene;
  L(
    `Purpose ${s.purpose}${s.variant ? ` variant ${s.variant.variant}` : ""}; asker ${nameOf(core, s.askerId)} (${s.askerId}), asked ${nameOf(core, s.askedId)}.`,
  );
  L("Packet facts:");
  for (const f of s.facts)
    L(`- ${f.key}: ${f.text} [${f.recordIds.join(", ").slice(0, 160)}]`);
  L("Narration: " + s.talk.narration.map((l) => l.text).join(" / "));
  if (s.talk.open) L(`Opens: [${s.talk.open.speaker}] ${s.talk.open.text}`);
  for (const l of dumpTree(s.talk.tree, 0, { n: 40 })) L(l);
  if (ANSWER_YES.has(r.typeKey) && r.interrupt) {
    const yes = s.talk.tree.replies.findIndex((x) =>
      ["agree", "promise", "offer"].includes(x.line.move),
    );
    if (yes >= 0) {
      const id = replyInScene(core, director, me, entry, [yes]);
      L(
        `Player answered [${s.talk.tree.replies[yes]!.line.move}] -> record ${id}`,
      );
    }
  }
};
const pollingSeen = new Set<string>();
const end = addDays(makeIsoDate(contest.electionDate), 3);
let day = 0;
const dayKinds = [
  "canvass",
  "canvass",
  "event",
  "canvass",
  "forum",
  "canvass",
  "interview",
  "raise-money",
  "canvass",
  "donor-meeting",
];
while (core.date < end) {
  day += 1;
  if (core.date <= contest.electionDate) {
    const k = dayKinds[day % dayKinds.length]!;
    tryAct(`day:${k}`, () => campaignDay(core, me, { filingId, kind: k }));
    if (day % 12 === 3)
      tryAct("act:volunteer", () =>
        campaignAct(core, me, { filingId, kind: "volunteer" }),
      );
    if (day % 12 === 5)
      tryAct("act:endorsement", () =>
        campaignAct(core, me, { filingId, kind: "endorsement" }),
      );
    if (day % 12 === 7)
      tryAct("act:poll", () =>
        campaignAct(core, me, { filingId, kind: "poll", sampleSize: 400 }),
      );
    const cashNow = () => {
      const c = campaignFor(api, filingId);
      return c.raisedMinor - c.spentMinor;
    };
    if (day % 12 === 9 && cashNow() > 200000)
      tryAct("act:mail", () =>
        campaignAct(core, me, { filingId, kind: "mail", amountMinor: 20000 }),
      );
    if (day % 12 === 10 && cashNow() > 200000)
      tryAct("act:ad", () =>
        campaignAct(core, me, { filingId, kind: "ad", amountMinor: 5000 }),
      );
    if (day % 12 === 11)
      tryAct("act:contribute", () =>
        campaignAct(core, me, {
          filingId,
          kind: "contribute",
          amountMinor: 10000,
        }),
      );
  }
  advanceCore(core, addDays(makeIsoDate(core.date), 1));
  for (const [vid, visit] of director.ledger.pollingVisits)
    if (visit.personId === me && !pollingSeen.has(vid)) {
      pollingSeen.add(vid);
      staged.push({
        date: core.date,
        typeKey: "polling-place",
        momentId: vid,
        causeId: `polling-visit ${JSON.stringify(visit.contestIds)}`,
        interrupt: false,
        outcome: `visit ${visit.status} for ${visit.electionDate}`,
      });
    }
  const book = director.ledger.people.get(me)!;
  for (const entry of book.schedule) {
    if (seen.has(entry.momentId)) continue;
    seen.add(entry.momentId);
    const moment = book.momentsById.get(entry.momentId);
    if (!moment || moment.date < filedOn) continue;
    for (const b of entry.bindings) {
      staged.push({
        date: moment.date,
        typeKey: b.typeKey,
        momentId: entry.momentId,
        causeId: moment.causeId,
        interrupt: entry.interrupt,
        outcome: entry.outcome,
      });
      if (
        b.typeKey !== "polling-place" &&
        (CAMPAIGN_TYPES.has(b.typeKey) || b.typeKey.endsWith("-sitting"))
      )
        playEntry(staged[staged.length - 1]!);
    }
  }
}

// Census.
log();
log(
  "## Census: every scene type staged for the player between filing and three days after the vote",
);
log();
const census = new Map<string, Rec[]>();
for (const r of staged)
  census.set(r.typeKey, [...(census.get(r.typeKey) ?? []), r]);
log("| type | times | stops the day | first date |");
log("|---|---|---|---|");
for (const [t, rows] of [...census].sort()) {
  log(
    `| ${t}${CAMPAIGN_TYPES.has(t) ? " **" : ""} | ${rows.length} | ${rows.filter((r) => r.interrupt).length} | ${rows[0]!.date} |`,
  );
}
log();
log(
  "Campaign-event types in the brief that never staged: " +
    [...CAMPAIGN_TYPES].filter((t) => !census.has(t)).join(", "),
);

// Rivals.
const rivals = (
  api
    .moduleState(ELECTIONS_MODULE_ID)
    .table("filings")
    .query("byContest", [contest.id]) as unknown as FilingRow[]
).filter((r) => r.personId !== me);
log();
log(
  `Rivals filed: ${rivals.map((r) => `${nameOf(core, r.personId)} (${r.personId}, ${r.status})`).join("; ") || "none"}`,
);
const camp = campaignFor(api, filingId);
{
  const offers = [...core.durableLog.values()].filter(
    (r) =>
      r.kind === "volunteer-offered" &&
      JSON.stringify(r.facts ?? {}).includes(filingId),
  );
  const byRole = new Map<string, number>();
  for (const o of offers)
    byRole.set(
      String((o.facts as Record<string, unknown>).role),
      (byRole.get(String((o.facts as Record<string, unknown>).role)) ?? 0) + 1,
    );
  log(
    `volunteer-offered records by role: ${[...byRole].map(([k, v]) => `${k} ${v}`).join(", ")}; staff ${JSON.stringify(campaignFor(api, filingId).staffIds)}`,
  );
  const pm = [...core.durableLog.values()].filter(
    (r) => r.kind === "party-asked",
  );
  log(`party-asked records in the world: ${pm.length}`);
}
log(
  `Campaign row after: raised ${camp.raisedMinor}, spent ${camp.spentMinor}, volunteers ${camp.volunteerIds.length}`,
);

log();
log("## Acts taken (every Campaign tab act on a rotation)");
log();
for (const l of actLog) log(`- ${l}`);

log();
log(
  "## Scenes, whole and in order (the first three of each kind; a yes is said to invitations and offers that stop the day)",
);
for (const l of scenesOut) log(l);
if (outFile) writeFileSync(outFile, out.join("\n"));
