/**
 * Plays the home talks in a drawn place and prints every answer line a rewritten
 * piece said (Story lead, Nov 17; development tooling like door-walk.ts, shipped
 * play never imports it).
 *
 *   node --import tsx scripts/words/home-talk-walk.ts --seed <word> [--days 90] [--file]
 *
 * The place is drawn from all 56 by seed. Each evening the player opens a talk
 * with each housemate and presses one reply (a different one each time, so the
 * answers of every move play). The table at the top prints what each slot the
 * rewritten lines use renders as in this world, from the subjects the housemates
 * could raise. The end lists the rewritten pieces (those whose text differs from
 * origin/main) that were said, and the ones composed but not seen.
 * With --file the player files for an open local seat first, so the player-news
 * and player-day talks have a filing to bring up.
 */
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { buildBenchWorld } from "../../src/bench/world";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { PLATFORM_QUESTIONS } from "../../src/core2/campaign-data";
import { gameStartDate } from "../../src/core2/game-start";
import { addDays, ageOnDate, makeIsoDate } from "../../src/core2/kernel/dates";
import { advanceCore } from "../../src/core2/life";
import { fileCandidacy, openContests } from "../../src/core2/modules/elections";
import { corePlaceByKey } from "../../src/core2/place-lookup";
import { townResidentsByCash } from "../../src/core2/resident-adults-test-kit";
import { coreAPI } from "../../src/core2/state";
import type { PersonId } from "../../src/core2/types";
import { hoursSaid } from "../../src/english/count-words";
import { composeConversationLine } from "../../src/english/conversation-words";
import { businessNameSaid, properName } from "../../src/director/words";
import {
  meetOverTalk,
  noteHeard,
  openConversation,
  say,
  subjectsBetween,
} from "../../src/director/conversation";
import { drawPlace } from "../core2-year/place";

const option = (name: string, fallback: string) => {
  const at = process.argv.indexOf(`--${name}`);
  return at >= 0 ? (process.argv[at + 1] ?? fallback) : fallback;
};
const seed = option("seed", "");
if (!seed) throw new Error("--seed <word> is required");
const days = Number(option("days", "90"));
const filing = process.argv.includes("--file");
const FILE = "data/english/parts/conversation.json";
type Part = { key: string; text: string };
const parts = (text: string) => (JSON.parse(text) as { parts: Part[] }).parts;
const before = new Map(
  parts(
    execSync(`git show origin/main:${FILE}`, { maxBuffer: 1 << 28 }).toString(),
  ).map((row) => [row.key, row.text]),
);
const changed = new Map(
  parts(readFileSync(FILE, "utf8"))
    .filter((row) => before.get(row.key) !== row.text)
    .map((row) => [row.key, row.text]),
);
const SLOTS = [
  "said",
  "employer",
  "office",
  "decider",
  "hours",
  "rent-again",
  "school",
  "name",
  "illness",
  "kin",
  "place",
];

setBookkeeping(false);
const place = drawPlace(seed, "home-talk-walk");
const where = `${place.name} (${place.key}), seed ${place.seed}`;
console.log(`# PLACE ${where}; ${changed.size} rewritten pieces`);
const { core, director } = buildBenchWorld(place.seed, gameStartDate(), {
  twoLevel: true,
  placeKey: place.key,
});
const api = coreAPI(core);
const town = corePlaceByKey(place.key)?.context.jurisdiction.id;
if (filing) {
  const adults = townResidentsByCash(core, api).filter(
    (r) =>
      r.alive &&
      r.placeId === town &&
      r.tier !== "husk" &&
      ageOnDate(makeIsoDate(r.birthDate), makeIsoDate(core.date)) >= 25 &&
      (core.households.get(r.householdId)?.memberIds.length ?? 0) > 1,
  );
  for (
    let w = 0;
    w < 52 && !openContests(api).some((c) => c.level !== "federal");
    w += 1
  )
    advanceCore(core, addDays(makeIsoDate(core.date), 7));
  for (const row of adults.slice(0, 80)) {
    let done = false;
    for (const c of openContests(api)) {
      if (c.level === "federal" || c.level === "state") continue;
      const f = fileCandidacy(api, {
        personId: row.id,
        contestId: c.id,
        platform: [`${PLATFORM_QUESTIONS[0]}=1`],
      });
      if (f.status === "refused") continue;
      core.playerId = row.id;
      console.log(
        `# PLAYER ${row.id} filed ${f.filing.id} in ${c.id} on ${core.date}`,
      );
      done = true;
      break;
    }
    if (done) break;
  }
}
const playerId = core.playerId as PersonId;
core.focusPersonIds.add(playerId);
const house = core.households.get(core.people.get(playerId)!.householdId)!;
for (const id of house.memberIds) director.watch(core, id as PersonId);
console.log(`# PLAYER ${playerId}; household of ${house.memberIds.length}`);

const slotRows = new Map<string, Set<string>>();
const said = new Map<string, { text: string; day: string; mate: string }>();
const minute = 19 * 60;
let n = 0;
for (let day = 0; day < days; day += 1) {
  advanceCore(core, addDays(makeIsoDate(core.date), 1));
  for (const id of house.memberIds) {
    const mate = core.people.get(id as PersonId);
    if (id === playerId || !mate?.alive) continue;
    for (const subject of subjectsBetween(
      core,
      id as PersonId,
      playerId,
      director,
      {
        presentIds: [playerId, id as PersonId],
        minuteOfDay: minute,
      },
    ))
      for (const slot of SLOTS) {
        const fact = subject.facts[slot];
        if (fact?.text)
          (slotRows.get(slot) ?? slotRows.set(slot, new Set()).get(slot)!).add(
            `${fact.text}  (${subject.kind})`,
          );
      }
    const talk = openConversation(core, playerId, id as PersonId, {
      director,
      presentIds: [playerId, id as PersonId],
      minuteOfDay: minute,
    });
    if (!talk.lines.length) continue;
    meetOverTalk(core, talk);
    noteHeard(core, talk);
    const pick = talk.choices.filter((c) => !c.lie);
    const choice = pick[n % Math.max(pick.length, 1)];
    n += 1;
    const from = talk.lines.length;
    const after = choice ? say(core, talk, choice.key) : talk;
    const hits = after.lines
      .slice(from)
      .filter((l) => (l.wording?.parts ?? []).some((p) => changed.has(p)));
    for (const l of hits)
      for (const p of l.wording?.parts ?? [])
        if (changed.has(p) && !said.has(p)) {
          said.set(p, { text: l.text, day: core.date, mate: id });
          console.log(`\n## ${core.date} with ${id}`);
          for (const t of talk.lines.slice(0, from))
            console.log(
              `   ${t.speakerId === playerId ? "YOU" : "THEM"}: ${t.text}  <${(t.wording?.parts ?? []).join("+")}>`,
            );
          console.log(`   YOU press [${choice?.move}]: ${choice?.text}`);
          for (const t of after.lines.slice(from))
            console.log(
              `   ${t.speakerId === playerId ? "YOU" : "THEM"}: ${t.text}  <${(t.wording?.parts ?? []).join("+")}>`,
            );
        }
  }
}
console.log("\n# SLOTS as rendered in this world");
for (const slot of SLOTS)
  console.log(
    `{${slot}}: ${[...(slotRows.get(slot) ?? [])].slice(0, 4).join(" | ") || "(none raised in this run)"}`,
  );
console.log(
  `\n# SAID ${said.size} of ${changed.size} rewritten pieces in ${days} days at ${where}`,
);
// Composed, not seen: each rewritten piece that carries a record slot, composed through the same
// conversation composer from facts shaped as this world's records give them (the slot values are
// this world's: its own subjects' said and decider, its business and its filing's office).
const fileOffice = [...core.durableLog.values()]
  .map((row) => (row as { facts?: Record<string, string> }).facts?.office)
  .find((office) => !!office);
const business = [...core.organizations.values()].find(
  (org) => org.kind === "business",
);
const sample = (slot: string): string | undefined => {
  const seen = [...(slotRows.get(slot) ?? [])][0]?.split("  (")[0];
  if (seen) return seen;
  if (slot === "employer" && business) return businessNameSaid(business);
  if (slot === "office" && fileOffice) return properName(fileOffice);
  if (slot === "hours") return hoursSaid(540);
  if (slot === "school") return "school";
  if (slot === "illness") return "cancer";
  return undefined;
};
const file = JSON.parse(readFileSync(FILE, "utf8")) as {
  parts: {
    key: string;
    text: string;
    uses: { subject: string; stages?: string[]; requiresFacts?: string[] }[];
  }[];
};
console.log(
  "\n# COMPOSED, NOT SEEN (rewritten pieces with a record slot, composed from this world's values)",
);
for (const piece of file.parts) {
  if (!changed.has(piece.key) || said.has(piece.key)) continue;
  const slots = [...piece.text.matchAll(/\{([\w-]+)\}/g)].map((m) =>
    m[1]!.replace(/_/g, "-"),
  );
  if (!slots.length) continue;
  const use = piece.uses[0]!;
  const facts: Record<string, { text: string; sourceRecordIds: string[] }> = {};
  for (const need of [...(use.requiresFacts ?? []), ...slots])
    facts[need] = {
      text: sample(need) ?? "yes",
      sourceRecordIds: ["sample:" + need],
    };
  let text: string | undefined;
  for (let k = 0; k < 400 && !text; k += 1) {
    const line = composeConversationLine({
      seed: place.seed,
      subject: use.subject,
      speakerId: playerId,
      traits: {},
      facts,
      stage: use.stages?.[0] ?? "",
      momentKey: `walk:${k}`,
    });
    if (line?.wording?.parts.includes(piece.key)) text = line.text;
  }
  console.log(
    `COMPOSED ${piece.key} | ${text ?? "(not reached in 400 draws)"}`,
  );
}
for (const [key, row] of said)
  console.log(`SEEN ${key} | ${row.text} | ${row.day}`);
for (const key of changed.keys())
  if (!said.has(key)) console.log(`NOT SEEN ${key}`);
