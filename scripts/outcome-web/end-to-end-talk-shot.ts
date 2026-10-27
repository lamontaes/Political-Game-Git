/* global process, console */
// The effects end-to-end proof's talk, drawn the way /play draws it: the
// conversation scene (backdrop and standing figures, from the bench's own
// scene staging) with the talk panel's markup and play.css, filled with the
// talk's lines the way play.mjs fills it. The world is the proof's own
// (src/core2/effects-end-to-end.test.ts): the same seed and place, the same
// 150 households met, played day by day, the victim's household watched from
// the day before the crime, and the talk the listener opens with the victim
// the day after. Nothing is laid on the world by hand.
// Usage: node --import tsx scripts/outcome-web/end-to-end-talk-shot.ts <out.png>
//   [seed victimPersonId victimHouseholdId crimeDate listenerPersonId]
import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { chromium } from "playwright";
import { drawPlace } from "../core2-year/place";
import { buildBenchWorld } from "../../src/bench/world";
import * as scene from "../../src/bench/scene";
import { knownCard } from "../../src/bench/card";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { gameStartDate } from "../../src/core2/game-start";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";
import { advanceCore } from "../../src/core2/life";
import { lawChain } from "../../src/core2/modules/laws";
import { countedHouseholdsByPlace } from "../../src/core2/modules/residents";
import { coreAPI, fillInPerson } from "../../src/core2/state";
import type { CoreState, PersonId } from "../../src/core2/types";
import { openConversation } from "../../src/director/conversation";

const [
  out = "end-to-end-talk.png",
  seed = "6f539fcfdf6d96f9",
  victimId = "person_32c9f82c590ec88c",
  householdId = "household_4e07b185b4629ed1",
  crimeDate = "2025-12-04",
  listenerId = "person_8b103d8fa883c300",
] = process.argv.slice(2);
/** The proof's households met (EFFECTS_END_TO_END_MET), first by id. */
const MET_HOUSEHOLDS = 150;
const root = resolve(".");

setBookkeeping(false);
const place = drawPlace(seed, "effects-end-to-end");
const world = buildBenchWorld(seed, gameStartDate(), {
  twoLevel: true,
  placeKey: place.key,
});
const core = world.core as CoreState;
const director = world.director;
const town = lawChain(coreAPI(core)).townPlaceId;
for (const record of [...(countedHouseholdsByPlace(core).get(town) ?? [])]
  .sort((a, b) => a.household.id.localeCompare(b.household.id))
  .slice(0, MET_HOUSEHOLDS))
  if (record.people[0] && !core.people.has(record.people[0].id))
    fillInPerson(core, record.people[0].id);
const date = makeIsoDate(crimeDate);
advanceCore(core, addDays(date, -1));
for (const id of core.households.get(householdId)?.memberIds ?? [])
  if (core.people.get(id)?.alive) director.watch(core, id);
const talkDay = addDays(date, 1);
advanceCore(core, talkDay);

const eventId = `crime.victimized:assault:${householdId}:${crimeDate}`;
const moment = director.ledger.people
  .get(victimId as PersonId)
  ?.moments.find((row) => row.causeId === eventId);
if (!moment) throw new Error(`${victimId} holds no moment from ${eventId}`);
const talk = openConversation(
  core,
  listenerId as PersonId,
  victimId as PersonId,
  { director },
);
const raised = talk.lines.find(
  (line) =>
    line.speakerId === victimId && line.sourceRecordIds?.includes(eventId),
);
if (!raised) throw new Error(`${victimId} does not raise ${eventId}`);

// The listener's scene that day, as /play stages the player's; the victim
// stands in it at home, or is staged beside them where they talk.
let staged = scene.benchScene(core, listenerId);
if (!staged.people.some((p) => p.personId === victimId)) {
  const home = scene.homeOf(core, listenerId);
  staged = {
    ...staged,
    place: home,
    backdrop: scene.backdropFile(home, 12 * 60),
    ...scene.stagePeople(
      core,
      home,
      [listenerId, victimId].map((id) => ({
        id,
        name: `${core.people.get(id)!.givenName} ${core.people.get(id)!.familyName}`,
        reason: id === listenerId ? ("you" as const) : ("household" as const),
      })),
    ),
  };
}
const card = knownCard(core, listenerId, victimId);
const dir = mkdtempSync(join(tmpdir(), "talk-shot-"));
const figurePng = (scene as unknown as Record<string, unknown>).figurePng as
  | ((core: unknown, person: string, place: string, spot: string) => Buffer)
  | undefined;
const figures = staged.people.map((p, i) => {
  if (p.figureUrl.startsWith("/art/"))
    return { ...p, src: `file://${root}${p.figureUrl}` };
  const u = new URL(p.figureUrl, "http://bench");
  const file = join(dir, `figure-${i}.png`);
  writeFileSync(
    file,
    figurePng!(
      core,
      u.searchParams.get("person")!,
      u.searchParams.get("place")!,
      u.searchParams.get("spot")!,
    ),
  );
  return { ...p, src: `file://${file}` };
});
const victimFigure = figures.find((p) => p.personId === victimId)?.src ?? "";

// play.mjs spokenLines: your last line, dim, then up to three said back.
const lastMine =
  talk.lines.length -
  1 -
  [...talk.lines].reverse().findIndex((line) => line.speakerId === listenerId);
const mine = talk.lines.some((line) => line.speakerId === listenerId);
const shown = [
  ...(mine ? [{ className: "said", text: talk.lines[lastMine]!.text }] : []),
  ...talk.lines
    .slice(mine ? lastMine + 1 : 0)
    .slice(-3)
    .map((line) => ({ className: "speech", text: line.text })),
];
if (!shown.some((line) => line.text === raised.text))
  throw new Error(`the talk panel would not show "${raised.text}"`);

const css = readFileSync("src/bench/play.css", "utf8")
  .replaceAll('url("/fonts/', `url("file://${root}/public/fonts/`)
  .replaceAll('url("/ui/', `url("file://${root}/public/ui/`);
const html = readFileSync("src/bench/play.html", "utf8");
const panel = html.slice(
  html.indexOf('<section id="talk"'),
  html.indexOf("</section>", html.indexOf('<section id="talk"')) +
    "</section>".length,
);
const page = `<!doctype html><html><head><meta charset="utf-8"><style>${css}
html,body{margin:0;overflow:hidden}</style></head><body>
<main id="game"><div id="stage"><img id="backdrop" alt="" src="${scene.backdropPath(staged.backdrop.file).href}"><div id="people"></div></div>
${panel.replace(" hidden>", ">")}</main>
<script>
const figures = ${JSON.stringify(figures)};
const shown = ${JSON.stringify(shown)};
const choices = ${JSON.stringify(talk.choices.slice(0, 6).map((c) => c.text))};
const el = document.getElementById("people");
for (const person of figures) {
  const s = person.figure.shadow;
  if (!s || s === true) continue;
  const sh = document.createElement("div"); sh.className = "shadow";
  Object.assign(sh.style, { left: s.leftPercent + "%", top: s.topPercent + "%", width: s.widthPercent + "%", height: s.heightPercent + "%" });
  el.append(sh);
}
for (const person of figures) {
  const f = person.figure;
  const bottom = f.clipBelowPercent ?? f.topPercent + f.heightPercent;
  const visible = Math.max(bottom - f.topPercent, 0.1);
  const img = document.createElement("img"); img.src = person.src;
  img.style.height = (f.heightPercent / visible) * 100 + "%";
  if (f.mirrored) img.style.transform = "scaleX(-1)";
  const box = document.createElement("div"); box.className = "figure";
  if (f.shadow === true) { const sh = document.createElement("div"); sh.className = "shadow"; box.prepend(sh); }
  box.append(img);
  Object.assign(box.style, { left: f.leftPercent + "%", top: f.topPercent + "%", width: f.widthPercent + "%", height: visible + "%" });
  el.append(box);
}
document.getElementById("talk-name").textContent = ${JSON.stringify(card.name)};
document.getElementById("talk-role").textContent = ${JSON.stringify(
  [card.work?.title, card.work?.employer, card.relation]
    .filter(Boolean)
    .join(" · "),
)};
document.getElementById("talk-bust").style.backgroundImage = 'url("${victimFigure}")';
document.getElementById("talk-lines").replaceChildren(...shown.map((line) => {
  const li = document.createElement("li"); li.className = line.className; li.textContent = line.text; return li;
}));
document.getElementById("talk-choices").replaceChildren(...choices.map((text) => {
  const b = document.createElement("button"); b.type = "button"; b.className = "reply"; b.textContent = text; return b;
}));
</script></body></html>`;
const pageFile = join(dir, "talk.html");
writeFileSync(pageFile, page);
const browser = await chromium.launch(
  process.env.BENCH_BROWSER
    ? { executablePath: process.env.BENCH_BROWSER }
    : {},
);
const tab = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await tab.goto(`file://${pageFile}`);
await tab.waitForFunction(() =>
  [...document.images].every((image) => image.complete),
);
await tab.evaluate(() => document.fonts.ready);
await tab.screenshot({ path: out });
await browser.close();
writeFileSync(
  join(dirname(resolve(out)), `${resolve(out).split("/").pop()}.txt`),
  [
    `${place.name}, ${place.state} (${place.key}), seed ${seed}, ${talkDay}`,
    `the talk ${listenerId} opens with ${victimId} (${card.name}${card.relation ? `, ${card.relation}` : ""})`,
    `the scene: ${staged.place} (${staged.why}), figures ${figures.map((p) => p.personId).join(", ")}`,
    `the moment: ${moment.id} from ${eventId}`,
    `the line raised: "${raised.text}" (${raised.sourceRecordIds?.join(", ")})`,
    `lines shown: ${shown.map((line) => `${line.className}: ${line.text}`).join(" | ")}`,
  ].join("\n") + "\n",
);
console.log(readFileSync(`${out}.txt`, "utf8"));
