/* global process, console */
// Before-and-after proof for how people are drawn: builds a fresh game in a
// random place (one of all 56, named with its seed), stages the scenes the
// owner plays (the opening, home with the family, a workplace, the council
// or commission, the state chamber, the U.S. House and Senate, the Oval
// Office, a conversation), renders each the way /play draws it, and counts
// figures by source. Only the v2 standing figures (art/people-engine/v2) may
// be drawn (owner, Oct 24).
// Usage: node --import tsx scripts/people/scene-shots.ts <out-dir> [seed ...]
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { createHash, randomBytes } from "node:crypto";
import { resolve } from "node:path";
import { chromium } from "playwright";
import { coreAPI } from "../../src/core2/state";
import { buildBenchWorld } from "../../src/bench/world";
import { openingFrames } from "../../src/bench/opening";
import * as scene from "../../src/bench/scene";
import scenePlaces from "../../src/bench/data/scene-places.json" with { type: "json" };
import { drawPlace } from "../../tests/golden-path/place";
import index from "../../art/people-engine/v2/index.json" with { type: "json" };
import type { PlayerPacketV1 } from "../../src/core2/player-v1";

const [out = "scene-shots", ...given] = process.argv.slice(2);
const seeds = given.length
  ? given
  : [0, 1, 2, 3].map(() => randomBytes(6).toString("hex"));
mkdirSync(out, { recursive: true });
const root = resolve(".");
const css = readFileSync("src/bench/play.css", "utf8");

interface Shot {
  name: string;
  place: string;
  backdrop: { url: string };
  people: {
    personId: string;
    name: string;
    figureUrl: string;
    figure: Record<string, unknown>;
  }[];
}
const BODY = scenePlaces.bodyPlaces as Record<string, string>;
const OFFICES = "core2-offices-v1";

function shotsFor(seed: string) {
  const place = drawPlace(seed, "people-scene-shots");
  const w = buildBenchWorld(seed, "2026-10-13", {
    twoLevel: true,
    placeKey: place.key,
  });
  const core = w.core;
  const me = w.playerId!;
  const api = coreAPI(core);
  const shots: Shot[] = [];
  const add = (name: string, s: Omit<Shot, "name">) =>
    shots.push({
      name: `${String(shots.length + 1).padStart(2, "0")}-${name}`,
      ...s,
    });
  const story = w.director.ledger.opening;
  for (const s of story ? openingFrames(core, me, story).frames : [])
    add(`intro-${s.place}`, s);
  add("home", scene.benchScene(core, me));
  // A workplace: someone in the household with a job, on shift.
  const household =
    core.households.get(core.people.get(me)!.householdId)?.memberIds ?? [];
  // Else the first filled-in resident with a job.
  const worker =
    [me, ...household].find((id) => core.people.get(id)?.jobId) ??
    [...core.people.values()].find((row) => row.alive && row.jobId)?.id;
  const shift = {
    kind: "stop",
    stop: { work: true },
    at: { minuteOfDay: 600 },
  } as unknown as PlayerPacketV1;
  if (worker) add("workplace", scene.benchScene(core, worker, shift));
  // Bodies in session: everyone serving in an office of that kind.
  const offices = api
    .moduleState(OFFICES)
    .table("offices")
    .rows() as unknown as { id: string; kind: string }[];
  const terms = api.moduleState(OFFICES).table("terms").rows() as unknown as {
    id: string;
    officeId: string;
    status: string;
    personId?: string;
    identity: { givenName: string; familyName: string };
  }[];
  const cast = (kinds: string[]) =>
    terms
      .filter(
        (t) =>
          t.status === "serving" &&
          kinds.includes(offices.find((o) => o.id === t.officeId)?.kind ?? ""),
      )
      .map((t) => ({
        id: t.personId ?? t.id,
        name: `${t.identity.givenName} ${t.identity.familyName}`,
      }));
  for (const [label, kinds] of [
    [
      "council",
      ["council", "municipal-council", "county-board", "township-board"],
    ],
    ["state-chamber", ["legislature-lower", "legislature-upper"]],
    ["us-house", ["us-house"]],
    ["us-senate", ["us-senate"]],
    ["oval-office", ["president"]],
  ] as const) {
    const people = cast([...kinds]);
    const placeName =
      label === "oval-office"
        ? "oval-office"
        : (BODY[kinds.find((k) => BODY[k])!] ?? BODY.default!);
    if (!people.length) continue;
    add(label, {
      place: placeName,
      backdrop: scene.backdropFile(placeName, 11 * 60),
      ...scene.stagePeople(core, placeName, people),
    });
  }
  // A conversation: the player and the first other person in the household, at home.
  const other = household.find((id) => id !== me) ?? terms[0]?.personId;
  if (other) {
    const home = scene.homeOf(core, me);
    const ids = [me, other].map((id) => ({
      id,
      name: core.people.get(id) ? `${core.people.get(id)!.givenName}` : id,
    }));
    add("conversation", {
      place: home,
      backdrop: scene.backdropFile(home, 12 * 60),
      ...scene.stagePeople(core, home, ids),
    });
  }
  return { place, w, shots };
}

const figurePng = (scene as unknown as Record<string, unknown>).figurePng as
  | ((core: unknown, person: string, place: string, spot: string) => Buffer)
  | undefined;

const browser = await chromium.launch({
  executablePath:
    process.env.BENCH_BROWSER ??
    "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
});
const page = await browser.newPage({ viewport: { width: 1672, height: 941 } });
const summary: string[] = [];
const FIGURE_LOOK = new Map(
  index.figures.map(
    (row) => [row.file.split("/").pop()!, `${row.outfit}:${row.sex}`] as const,
  ),
);
let twinTotal = 0;
let whole = 0,
  other = 0;
for (const seed of seeds) {
  const { place, w, shots } = shotsFor(seed);
  const tag = `${place.state}-${place.key}`;
  summary.push(`## ${place.name} (${place.state}, ${place.key}), seed ${seed}`);
  for (const s of shots) {
    let w0 = 0,
      o0 = 0;
    const figs = s.people.map((p) => {
      let src = p.figureUrl;
      if (src.startsWith("/art/people-engine/v2/")) {
        w0++;
        src = `file://${root}${src}`;
      } else {
        o0++;
        const u = new URL(p.figureUrl, "http://bench");
        const file = resolve(
          out,
          `fig-${createHash("md5").update(p.figureUrl).digest("hex")}.png`,
        );
        if (figurePng)
          writeFileSync(
            file,
            figurePng(
              w.core,
              u.searchParams.get("person")!,
              u.searchParams.get("place")!,
              u.searchParams.get("spot")!,
            ),
          );
        src = `file://${file}`;
      }
      return { ...p, src };
    });
    whole += w0;
    other += o0;
    const html = `<!doctype html><html><head><style>${css}
      html,body{margin:0;overflow:hidden} #stage{width:1672px;height:941px;left:0;top:0;transform:none}
      .label{position:absolute;left:8px;top:8px;background:#000a;color:#fff;font:13px sans-serif;padding:4px 8px;z-index:9}</style></head>
      <body><div id="game"><div id="stage"><img id="backdrop" src="file://${root}${s.backdrop.url}"><div id="people"></div></div>
      <div class="label">${place.name}, ${place.state} · seed ${seed} · ${s.place} · v2 ${w0}, other ${o0}</div></div>
      <script>
      const people = ${JSON.stringify(figs)};
      const el = document.getElementById("people");
      // As play.mjs draws it: shadows on the floor first, then the figures.
      for (const person of people) {
        const s = person.figure.shadow;
        if (!s || s === true) continue;
        const sh = document.createElement("div"); sh.className = "shadow";
        Object.assign(sh.style, { left: s.leftPercent + "%", top: s.topPercent + "%", width: s.widthPercent + "%", height: s.heightPercent + "%" });
        el.append(sh);
      }
      for (const person of people) {
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
      </script></body></html>`;
    const htmlFile = resolve(out, "page.html");
    writeFileSync(htmlFile, html);
    await page.goto(`file://${htmlFile}`);
    await page.waitForFunction(() =>
      [...document.images].every((i) => i.complete),
    );
    const file = `${out}/${tag}-${s.name}.png`;
    await page.screenshot({ path: file });
    // Twins: two people in one look.
    const looks = s.people.map((p) =>
      FIGURE_LOOK.get(p.figureUrl.split("/").pop()!),
    );
    const twins = looks.length - new Set(looks).size;
    twinTotal += twins;
    summary.push(
      `- ${s.name} (${s.place}): ${s.people.length} drawn, v2 ${w0}, other ${o0}, twins ${twins}`,
    );
  }
}
await browser.close();
summary.push(`\nTotal: v2 ${whole}, not v2 ${other}, twins ${twinTotal}`);
writeFileSync(`${out}/counts.md`, summary.join("\n") + "\n");
console.log(summary.join("\n"));
