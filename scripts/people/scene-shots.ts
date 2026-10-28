/* global process, console */
// Before-and-after proof for how people are drawn: builds a fresh game in a
// random place (one of all 56, named with its seed), stages the scenes the
// owner plays (the opening, home with the family, a workplace, the council
// or commission, the state chamber, the U.S. House and Senate, the Oval
// Office, a conversation), renders each the way /play draws it, and counts
// figures by source. Only the v2 standing figures (art/people-engine/v2) may
// be drawn.
// Usage: node --import tsx scripts/people/scene-shots.ts <out-dir> [seed ...]
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { createHash, randomBytes } from "node:crypto";
import { resolve } from "node:path";
import { chromium } from "playwright";
import { coreAPI } from "../../src/core2/state";
import { advanceCore } from "../../src/core2/life";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";
import manifest from "../../art/backdrops/manifest.json" with { type: "json" };
import { buildBenchWorld } from "../../src/bench/world";
import { openingFrames } from "../../src/bench/opening";
import * as scene from "../../src/bench/scene";
import scenePlaces from "../../src/bench/data/scene-places.json" with { type: "json" };
import { drawPlace } from "../../tests/golden-path/place";
import { recolorFigure } from "../../src/bench/figure-colors";
import index from "../../art/people-engine/v2/index.json" with { type: "json" };
import type { PlayerPacketV1 } from "../../src/core2/player-v1";

/** Each drawn person's occluder mask as a data URL, by its served path. */
function masksOf(people: { figure: unknown }[]): Record<string, string> {
  const masks: Record<string, string> = {};
  for (const { figure } of people) {
    const url = (figure as { occluder?: { url: string } | null }).occluder?.url;
    if (url)
      masks[url] = `data:image/png;base64,${readFileSync(
        `art/backdrops/occluders/${url.slice("/art/backdrops/occluders/".length)}`,
      ).toString("base64")}`;
  }
  return masks;
}

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
const BODY = scenePlaces.bodyPlaces as unknown as Record<string, string[]>;
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
  // The player alone in the close-up bedroom (the January 22 bedroom scene).
  add("bedroom", {
    place: "bedroom-plain",
    backdrop: scene.backdropFile("bedroom-plain", 22 * 60),
    ...scene.stagePeople(core, "bedroom-plain", [
      { id: me, name: "you", reason: "you" },
    ]),
  });
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
        reason: "act" as const,
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
        : (BODY[kinds.find((k) => BODY[k])!] ?? BODY.default!)[0]!;
    if (!people.length) continue;
    add(label, {
      place: placeName,
      backdrop: scene.backdropFile(placeName, 11 * 60),
      ...scene.stagePeople(core, placeName, people),
    });
    // The Oval Office with the Resolute desk, the opening's President's room:
    // the President with the Vice President and the Speaker.
    if (label === "oval-office") {
      const guests = cast(["vice-president", "us-house"]).slice(0, 2);
      add("oval-office-resolute", {
        place: "oval-office-resolute",
        backdrop: scene.backdropFile("oval-office-resolute", 11 * 60),
        ...scene.stagePeople(core, "oval-office-resolute", [
          ...people,
          ...guests,
        ]),
      });
    }
  }
  // A conversation: the player and the first other person in the household, at home.
  const other = household.find((id) => id !== me) ?? terms[0]?.personId;
  if (other) {
    const home = scene.homeOf(core, me);
    const ids = [me, other].map((id) => ({
      id,
      name: core.people.get(id) ? `${core.people.get(id)!.givenName}` : id,
      reason: id === me ? ("you" as const) : ("household" as const),
    }));
    add("conversation", {
      place: home,
      backdrop: scene.personBackdrop(core, me, home, 12 * 60),
      ...scene.stagePeople(core, home, ids),
    });
  }
  // A home of each condition, before (as painted) and after (in the
  // household's condition), once the housing records open on the first day.
  advanceCore(core, addDays(makeIsoDate(core.date), 1));
  for (const wanted of ["rundown", "lived-in", "as painted"]) {
    const household = [...core.households.values()].find((h) => {
      const id = h.memberIds[0];
      if (!id || !core.people.has(id)) return false;
      const condition = scene.roomCondition(core, id)[0] ?? "as painted";
      const room = scene.homeOf(core, id, 12 * 60);
      return (
        condition === wanted &&
        (wanted === "as painted" ||
          manifest.backdrops.some(
            (r) => r.place === room && r.variant === wanted,
          ))
      );
    });
    if (!household) continue;
    const id = household.memberIds[0]!;
    const home = scene.homeOf(core, id, 12 * 60);
    const ids = household.memberIds
      .filter((m) => core.people.has(m))
      .map((m) => ({
        id: m,
        name: core.people.get(m)!.givenName,
        reason: m === id ? ("you" as const) : ("household" as const),
      }));
    const staged = scene.stagePeople(core, home, ids);
    const name = wanted.replace(" ", "-");
    add(`home-${name}-before`, {
      place: home,
      backdrop: scene.backdropFile(home, 12 * 60),
      ...staged,
    });
    add(`home-${name}`, {
      place: home,
      backdrop: scene.personBackdrop(core, id, home, 12 * 60),
      ...staged,
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
        // Colored as the play server colors it (handler.ts): the figure
        // recolored from the person's own colors in the query.
        const u = new URL(src, "http://bench");
        const name = u.pathname
          .split("/")
          .pop()!
          .replace(/\.png$/, "");
        const file = resolve(
          out,
          `fig-${createHash("md5").update(src).digest("hex")}.png`,
        );
        writeFileSync(
          file,
          recolorFigure(
            readFileSync(`.${u.pathname}`),
            name,
            Object.fromEntries(u.searchParams),
          ),
        );
        src = `file://${file}`;
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
      // A mask must be same-origin to apply, so a page opened from disk gets them inline.
      const MASKS = ${JSON.stringify(masksOf(figs))};
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
        const img = document.createElement("img"); img.src = person.src;
        if (f.mirrored) img.style.transform = "scaleX(-1)";
        const box = document.createElement("div"); box.className = "figure";
        if (f.shadow === true) { const sh = document.createElement("div"); sh.className = "shadow"; box.prepend(sh); }
        box.append(img);
        Object.assign(box.style, { left: f.leftPercent + "%", top: f.topPercent + "%", width: f.widthPercent + "%", height: f.heightPercent + "%" });
        el.append(box);
        // What the painting has in front of them, laid back over them (play.mjs occluderOf).
        const o = f.occluder;
        if (o) {
          const along = (start, size) => (size >= 100 ? 0 : (start / (100 - size)) * 100);
          const node = document.createElement("div"); node.className = "occluder";
          Object.assign(node.style, { left: o.leftPercent + "%", top: o.topPercent + "%", width: o.widthPercent + "%", height: o.heightPercent + "%",
            backgroundImage: 'url("' + document.getElementById("backdrop").src + '")',
            backgroundSize: 10000 / o.widthPercent + "% " + 10000 / o.heightPercent + "%",
            backgroundPosition: along(o.leftPercent, o.widthPercent) + "% " + along(o.topPercent, o.heightPercent) + "%",
            maskImage: 'url("' + MASKS[o.url] + '")' });
          el.append(node);
        }
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
