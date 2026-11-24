/**
 * Plays the door in a drawn place and prints every talk whole (Story lead, Nov 17; development
 * tooling like scene-samples.ts, shipped play never imports it).
 *
 *   node --import tsx scripts/words/door-walk.ts --seed <word> [--label a] [--min-need 25]
 *     [--lead-months 0] [--after-window 60] [--speech]
 *
 * The place is drawn from all 56 by seed and label. A local resident files through the elections
 * engine, preferring a seat whose petition needs at least `--min-need` names (a place that has none
 * says SKIP), after `--lead-months` of life so the views engine holds stands. Every campaign day the
 * engine offers is canvassed through the petition window and then `--after-window` more days; each
 * staged door scene (signature, first knock, second knock) is composed with purposeScene and its whole
 * tree is printed with every reply pressed, with the facts it leans on and the piece keys said.
 * With `--speech`, a campaign speech that moves a watched listener is also composed
 * (speech-afterward) over 24 months instead of the door.
 */
import { buildBenchWorld } from "../../src/bench/world";
import { campaignDay } from "../../src/bench/campaign";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { PLATFORM_QUESTIONS } from "../../src/core2/campaign-data";
import { gameStartDate } from "../../src/core2/game-start";
import { addDays, ageOnDate, makeIsoDate } from "../../src/core2/kernel/dates";
import { advanceCore } from "../../src/core2/life";
import {
  fileCandidacy,
  openContests,
  petitionOf,
} from "../../src/core2/modules/elections";
import { townSeats } from "../../src/core2/modules/offices";
import { P } from "../../src/core2/parameters";
import { corePlaceByKey } from "../../src/core2/place-lookup";
import { advancePlayerV1, resumePlayerV1 } from "../../src/core2/player-v1";
import { townResidentsByCash } from "../../src/core2/resident-adults-test-kit";
import { coreAPI } from "../../src/core2/state";
import type { PersonId } from "../../src/core2/types";
import { purposeScene } from "../../src/director/purpose-scene";
import { speechAct, speechOccasion } from "../../src/director/scheduling";
import type { TreeNode } from "../../src/director/scene-talk";
import { drawPlace } from "../core2-year/place";

const option = (name: string, fallback: string) => {
  const at = process.argv.indexOf(`--${name}`);
  return at >= 0 ? (process.argv[at + 1] ?? fallback) : fallback;
};
const seed = option("seed", "");
if (!seed) throw new Error("--seed <word> is required");
const label = option("label", "a");
const minNeed = Number(option("min-need", "25"));
const leadMonths = Number(option("lead-months", "0"));
const afterWindow = Number(option("after-window", "60"));
const speech = process.argv.includes("--speech");
const LABELS = [
  "circumstance:door-first",
  "circumstance:door-again",
  "circumstance:door-petition",
];

setBookkeeping(false);
const place = drawPlace(seed, `door-walk:${label}`);
const where = `${place.name} (${place.key}), seed ${place.seed}`;
console.log(`# PLACE ${where}`);
const { core, director } = buildBenchWorld(place.seed, gameStartDate(), {
  twoLevel: true,
  placeKey: place.key,
});
const api = coreAPI(core);
const printTree = (node: TreeNode, ind: string) => {
  for (const l of node.lines)
    console.log(`${ind}${l.speaker}: ${l.text}   <${l.parts.join(" + ")}>`);
  for (const r of node.replies) {
    console.log(
      `${ind}> YOU press [${r.line.move}]: ${r.line.text}   <${r.line.parts.join(" + ")}>`,
    );
    if (r.next) printTree(r.next, ind + "    ");
  }
  if (node.end)
    console.log(
      `${ind}[END ${node.end.ending?.id}]${node.end.close ? ` close: ${node.end.close.text} <${node.end.close.parts.join(" + ")}>` : ""}`,
    );
};
const KEYS = [
  "signed",
  "would-not-sign",
  "rival",
  "rival-signed",
  "stand",
  "stand-with",
  "stand-apart",
  "voted-last",
  "sat-out-last",
  "about",
  "due",
  "filed-at-counter",
];
const show = (result: ReturnType<typeof purposeScene>, head: string) => {
  if (result?.kind !== "composed") return false;
  const { scene } = result;
  console.log(
    `\n## ${head}: ${scene.purpose}; facts: ${scene.facts.map((f) => f.key).join(", ")}`,
  );
  for (const f of scene.facts.filter((row) => KEYS.includes(row.key)))
    console.log(`   fact ${f.key} = ${f.text}  [${f.recordIds.join(" ")}]`);
  for (const n of scene.talk.narration) console.log(`Narrator: ${n.text}`);
  console.log(
    `${scene.talk.state.speaker}: ${scene.talk.state.text}   <${scene.talk.state.parts.join(" + ")}>`,
  );
  printTree(scene.talk.tree, "  ");
  return true;
};

if (speech) {
  const player = core.people.get(core.playerId!)!;
  const closeTies = (candidateId: string): PersonId[] => {
    const c = core.people.get(candidateId as PersonId);
    if (!c) return [];
    const ids = new Set<PersonId>(c.familyIds);
    for (const rel of core.relationshipsByPerson.get(c.id) ?? []) {
      const row = core.relationships.get(rel);
      if (row) ids.add(row.actorId === c.id ? row.otherId : row.actorId);
    }
    return [...ids]
      .filter(
        (id) =>
          core.people.get(id)?.alive &&
          core.people.get(id)!.placeId === c.placeId,
      )
      .slice(0, 25);
  };
  for (const id of [
    player.id,
    ...(core.households.get(player.householdId)?.memberIds ?? []),
  ])
    if (core.people.get(id)?.alive) director.watch(core, id);
  api.subscribeEvents("door-walk", ["candidate-filed"], (_api, event) => {
    for (const candidateId of event.personIds)
      for (const id of closeTies(candidateId)) director.watch(core, id);
  });
  const seen = new Set<string>();
  let told = 0;
  for (let month = 0; month < 24 && told < 2; month += 1) {
    advanceCore(core, addDays(makeIsoDate(core.date), 30));
    for (const book of director.ledger.people.values())
      for (const entry of book.schedule) {
        const key = `${book.personId}|${entry.momentId}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const moment = book.momentsById.get(entry.momentId);
        if (!moment || moment.label !== "cause:event:speech.heard") continue;
        const speaker = core.durableLog.get(moment.causeId)?.facts?.[
          "views:speaker"
        ];
        if (
          speechOccasion(core, moment.causeId) !== "campaign" ||
          typeof speaker !== "string" ||
          speaker === book.personId
        )
          continue;
        if (
          !["town-hall", "speech"].includes(
            speechAct(core, moment.causeId) ?? "",
          )
        )
          continue;
        if (!entry.bindings.some((row) => row.typeKey === "speech-afterward"))
          continue;
        if (
          show(
            purposeScene(core, director, book.personId as PersonId, entry, {
              typeKey: "speech-afterward",
            }),
            `speech-afterward on ${core.date}`,
          )
        )
          told += 1;
      }
  }
  console.log(`\n# DONE ${where}: ${told} speech-afterward scenes`);
  process.exit(0);
}

if (leadMonths > 0)
  advanceCore(core, addDays(makeIsoDate(core.date), 30 * leadMonths));
const open = () =>
  openContests(api).some((r) => r.level !== "federal" && r.level !== "state");
for (let w = 0; w < 52 && !open(); w += 1)
  advanceCore(core, addDays(makeIsoDate(core.date), 7));
const start = makeIsoDate(core.date);
const town = corePlaceByKey(place.key)?.context.jurisdiction.id;
const adults = townResidentsByCash(core, api).filter(
  (r) =>
    r.alive &&
    r.placeId === town &&
    r.tier !== "husk" &&
    ageOnDate(makeIsoDate(r.birthDate), start) >= 35,
);
let filing: { id: string } | null = null;
let personId: PersonId | undefined;
for (const row of adults.slice(0, 60)) {
  if (townSeats(api).some((s) => s.holder?.personId === row.id)) continue;
  for (const c of openContests(api)) {
    if (c.level === "federal" || c.level === "state") continue;
    const f = fileCandidacy(api, {
      personId: row.id,
      contestId: c.id,
      platform: [`${PLATFORM_QUESTIONS[0]}=1`],
    });
    if (
      f.status === "refused" ||
      !["petitioning", "on-ballot"].includes(f.filing.status ?? "")
    )
      continue;
    const need = petitionOf(api, f.filing.id)?.needed ?? 0;
    console.log(`# filed ${row.id} in ${c.id}: petition needs ${need}`);
    if (need >= minNeed) {
      filing = f.filing;
      personId = row.id;
      core.playerId = row.id;
    }
    break;
  }
  if (filing) break;
}
if (!filing || !personId) {
  console.log(`SKIP: no seat whose petition needs ${minNeed} names`);
  process.exit(0);
}
const due = petitionOf(api, filing.id)!.due;
const days =
  Math.ceil((Date.parse(due) - Date.parse(start)) / 86400000) + afterWindow;
console.log(
  `# PLAYER ${personId} filed ${filing.id} on ${start}; petition due ${due}; walking ${days} days`,
);
core.focusPersonIds.add(personId);
director.watch(core, personId);
const book = director.ledger.people.get(personId)!;
const seen = new Set<string>();
const got = new Map<string, number>();
const sweep = () => {
  for (const entry of book.schedule) {
    const m = book.momentsById.get(entry.momentId);
    if (!m || !LABELS.includes(m.label) || seen.has(entry.momentId)) continue;
    const result = purposeScene(core, director, personId!, entry);
    if (result?.kind !== "composed") continue;
    seen.add(entry.momentId);
    const first = result.scene.talk.tree.lines[0]?.move ?? "";
    const mark = `${m.label}|${first}|${result.scene.purpose}`;
    if ((got.get(mark) ?? 0) >= 2) continue;
    got.set(mark, (got.get(mark) ?? 0) + 1);
    show(result, `${m.label} on ${core.date}`);
  }
};
let canvassedOn = "";
let packet = advancePlayerV1(core, {
  controlledPersonId: personId,
  through: { date: addDays(start, days), minuteOfDay: P.zero },
});
while (packet.kind !== "complete") {
  sweep();
  if (canvassedOn !== core.date) {
    try {
      campaignDay(core, personId, { filingId: filing.id, kind: "canvass" });
    } catch {
      /* the day is closed */
    }
    canvassedOn = core.date;
  }
  packet = resumePlayerV1(core, {
    kind: packet.kind === "stop" ? "stop" : "own-choice",
    pauseId: packet.pauseId,
  } as never);
}
sweep();
console.log(
  `\n# DONE ${where}: ${[...got.entries()].map(([k, v]) => `${k} x${v}`).join("; ")}; last day ${core.date}`,
);
