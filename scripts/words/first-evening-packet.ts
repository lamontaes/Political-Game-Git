/* eslint-disable @typescript-eslint/no-explicit-any -- a walk that prints many record shapes; it asserts nothing */
/**
 * The first evening as a player meets it, written as one numbered file the
 * owner can answer by voice ("2.3 is wrong"): the loading story, the address,
 * the arrival, the first talk at home, the Journal and the news, in drawn
 * places (the Story lead's brief, Nov 24). It plays; it asserts nothing.
 * Run: SEEDS=a,b,c node --import tsx scripts/words/first-evening-packet.ts > out.md
 * With SEEDS unset it draws three seeds and prints each, so a run replays.
 */
import { execSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { gameStartDate } from "../../src/core2/game-start";
import {
  buildBenchWorldInStages,
  OPENING_WARMUP_DAYS,
} from "../../src/bench/world";
import { openingArrivalMinute } from "../../src/bench/opening";
import { roomIds } from "../../src/bench/scene";
import {
  meetOverTalk,
  noteHeard,
  openConversation,
  say,
} from "../../src/director/conversation";
import { composeJournal } from "../../src/director/journal";
import { loadingStory } from "../../src/bench/loading";
import { BenchPlayer } from "../../src/bench/player";
import { storyScene } from "../../src/bench/story";
import { heardItems } from "../../src/bench/calendar";
import { ownRace } from "../../src/bench/results";
import { wordOwnResult } from "../../src/bench/archive-words";
import { nationStories } from "../../src/bench/nation-news";
import controls from "../../src/bench/data/controls.json" with { type: "json" };

setBookkeeping(false);
const head = execSync("git rev-parse HEAD").toString().trim();
const seeds = (process.env.SEEDS ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
while (seeds.length < 3 && !process.env.SEEDS)
  seeds.push(randomBytes(3).toString("hex"));
const out: string[] = [];
const p = (s = "") => out.push(s);
p("# First evening packet");
p("");
p("Answer by number: 2.3 means place 2, line 3.");
p("");
let placeNo = 0;
for (const seed of seeds) {
  placeNo += 1;
  let n = 0;
  const L = (text: string) => {
    n += 1;
    p(`**${placeNo}.${n}** ${text}`);
    p();
  };
  const world = await buildBenchWorldInStages(
    seed,
    gameStartDate(),
    { twoLevel: true, warmUpDays: OPENING_WARMUP_DAYS },
    () => undefined,
  );
  const { core, director } = world;
  const me = world.playerId as any;
  const player = new BenchPlayer(core, director);
  player.select(me);
  p(
    `## Place ${placeNo}: ${world.place.displayName}, seed ${seed}, head ${head}`,
  );
  p();
  // 1 loading
  p("### Loading");
  p();
  L("Steps: " + Object.values((controls as any).loading).join(" / "));
  const ls = loadingStory(core, me);
  for (const y of ls.years) {
    L(`Year ${y.year}`);
    for (const l of y.lines) L(`  told: ${l.text}`);
    for (const h of y.headlines) L(`  headline: ${h.headline}`);
  }
  // 2 address
  p("### The address");
  p();
  const story = director.ledger.opening;
  if (story) {
    L(
      `Kind: ${story.addressKind}; the President: ${core.people.get(story.president.id as any) ? core.people.get(story.president.id as any)!.givenName + " " + core.people.get(story.president.id as any)!.familyName : story.president.id}`,
    );
    for (const part of story.address.parts) L(part);
  } else L("no opening address");
  // 3 arrival
  p("### Arrival");
  p();
  const minute = openingArrivalMinute(core, me);
  const staged = director.ledger.people
    .get(me)
    ?.schedule.find(
      (row) =>
        row.date === core.date &&
        row.outcome.startsWith("scene") &&
        row.bindings.length > 0,
    );
  try {
    if (!staged) throw new Error("no scene staged for today");
    const sc: any = storyScene(core, director, me, staged.momentId, minute);
    const lines = (sc.narration ?? []) as { text: string }[];
    if (!lines.length) L("arrival: scene has no narration lines");
    for (const l of lines) L(l.text);
  } catch (e) {
    L(`arrival: not reached (${(e as Error).message})`);
  }
  // 4 talk
  p("### First talk at home");
  p();
  const meP = core.people.get(me)!;
  const household = core.households.get(meP.householdId ?? "");
  const room = roomIds(core, me, undefined, minute);
  let any = false;
  for (const id of (household?.memberIds ?? []).filter(
    (m: string) => m !== me,
  )) {
    const other = core.people.get(id as any);
    if (!other?.alive) continue;
    const talk = openConversation(core, me, id as any, {
      director,
      presentIds: room as any,
      minuteOfDay: minute,
      ...(staged ? { occasionId: staged.momentId } : {}),
    });
    if (!talk.lines.length) continue;
    any = true;
    L(
      `With ${other.givenName} ${other.familyName} (${other.relationLabel ?? ""})`,
    );
    for (const line of talk.lines) L(`  says: ${line.text}`);
    talk.choices.forEach((c: any, i: number) =>
      L(`  reply ${i + 1}: ${c.text}`),
    );
    meetOverTalk(core, talk);
    noteHeard(core, talk);
    const first = talk.choices[0];
    if (first) {
      const after: any = say(core, talk, first.key);
      const before = talk.lines.length;
      const answers = (after.lines ?? []).slice(before);
      L(`  after reply 1 ("${first.text}"):`);
      for (const l of answers.length ? answers : (after.lines ?? []).slice(-1))
        L(`  answer: ${l.text}`);
    }
  }
  if (!any) L("nobody in the household has anything to say");
  // 5 journal
  p("### The Journal");
  p();
  for (const c of composeJournal(core, director, me, {
    through: core.date as any,
  })) {
    L(`Chapter: ${c.title}`);
    for (const l of c.lines) L(`  ${l.text}`);
  }
  // 6 news
  p("### The news");
  p();
  const heard: any[] = heardItems(core, me);
  const race = ownRace(core, me);
  const own = race && wordOwnResult(core, race, me);
  if (own) heard.unshift(own);
  const all: any[] = [
    ...heard,
    ...nationStories(core, (controls as any).news.nation, me),
  ].filter((r) => r.headline || r.lede);
  if (!all.length) L("no stories to read");
  for (const s of all.slice(0, 6)) {
    L(`Story: ${s.headline ?? s.lede}${s.outlet ? ` (${s.outlet.name})` : ""}`);
    const paras: string[] = s.paragraphs?.length
      ? s.paragraphs
      : s.lede
        ? [s.lede]
        : [];
    paras.forEach((t) => L(`  paragraph: ${t}`));
  }
  p();
}
console.log(out.join("\n"));
