/**
 * The first evening's packet walk (Story lead's request, Nov 24). Starts a new
 * life in a drawn place through the play server's own routes, exactly as New
 * game does, and writes every text of the first evening, in the order a
 * player meets it, to numbered markdown files:
 *   01 loading steps and story, 02 the Jan 20 address (paragraph by
 *   paragraph), 03 arrival narration, 04 the first talk at home with every
 *   reply offered, 05 the first Journal page, 06 the first news stories.
 * It only reads and records what the game shows; it writes no player line.
 *
 * Usage: OCD_STORAGE_OVERRIDE="cloud session, owner approved Oct 14" \
 *   node --max-old-space-size=8192 --import tsx \
 *   scripts/play-walks/first-evening.ts <out-dir> [run-name] [places=3]
 * One folder per place under <out-dir>/<run-name>/, each file's head naming
 * the place and seed. Places are drawn from all 56 by drawPlace.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { drawPlace } from "../core2-year/place";

type Json = any; // eslint-disable-line @typescript-eslint/no-explicit-any

/** The loading card's steps, as play.mjs `followBuild` lists them. */
const LOADING_STEPS = [
  "people",
  "past",
  "economy",
  "core",
  "government",
  "elections",
  "budgets",
  "legislature",
  "cabinet",
  "workings",
  "history",
  "warmup",
  "opening",
];
const PORT = Number(process.env.BENCH_PORT ?? 3917);
const BASE = `http://127.0.0.1:${PORT}`;
const call = async (method: string, path: string): Promise<Json> => {
  const reply = await fetch(`${BASE}${path}`, { method });
  const text = await reply.text();
  if (reply.status !== 200) throw new Error(`${method} ${path}: ${text}`);
  return text ? JSON.parse(text) : null;
};

/** The bench server, as the New game screen reaches it, saving to a folder of its own. */
async function startServer(saves: string) {
  const child = spawn(
    process.execPath,
    ["--max-old-space-size=8192", "--import", "tsx", "src/bench/server.ts"],
    {
      env: { ...process.env, BENCH_PORT: String(PORT), OCD_SAVE_DIR: saves },
      stdio: "ignore",
    },
  );
  for (let tries = 0; tries < 600; tries += 1) {
    try {
      if ((await fetch(`${BASE}/api/title`)).ok) return child;
    } catch {
      /* not listening yet */
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  child.kill();
  throw new Error("The bench server did not start.");
}
const q = (params: Record<string, string>) =>
  new URLSearchParams(params).toString();

const out = process.argv[2];
if (!out) throw new Error("Usage: first-evening.ts <out-dir> [run] [places]");
const run = process.argv[3] ?? "run";
const count = Number(process.argv[4] ?? 3);
/** One quoted block per text, so a reader can paste a line into a grade. */
const quote = (text: string) =>
  text
    .split("\n")
    .map((line) => `> ${line}`)
    .join("\n");
const clean = (value: unknown) => String(value ?? "").trim();

const server = await startServer(`${out}/${run}/.saves`);
try {
  for (let n = 0; n < count; n += 1) {
    const place = drawPlace(`${run}-${n}`, "first-evening-walk");
    const dir = `${out}/${run}/place-${n + 1}-${place.key}`;
    mkdirSync(dir, { recursive: true });
    const head = (title: string, extra = "") =>
      `# ${title}\n\nPlace key: ${place.key}  \nSeed: ${place.seed}  \nRun: ${run}, place ${n + 1} of ${count}\n${extra}\n`;
    const files: string[] = [];
    const write = (name: string, body: string) => {
      const file = `${String(files.length + 1).padStart(2, "0")}-${name}.md`;
      files.push(file);
      writeFileSync(`${dir}/${file}`, body);
    };

    // 1. New game: the life is built while the loading screen polls its steps.
    const steps: string[] = [];
    const watcher = (async () => {
      for (;;) {
        const progress = await call("GET", "/api/newlife/progress");
        const stage = clean(progress.stage);
        if (stage && steps.at(-1) !== stage) steps.push(stage);
        if (stage === "done") return;
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
    })();
    const life = await call(
      "POST",
      `/api/newlife?${q({ seed: place.seed, placeKey: place.key })}`,
    );
    await watcher;
    const me: string = life.personId;
    const story = await call("GET", "/api/newlife/story");
    const names: Record<string, string> = {};
    const nameOf = (id: string) => names[id] ?? id;
    let loading = head(
      "Loading",
      `Player: ${me}, ${life.placeName}, ${life.date}\n`,
    );
    const controls = await call("GET", "/api/controls");
    loading += `\n## Steps the loading card lists (in order)\n\nStages the poll saw while this build ran: ${steps.join(", ") || "none"}. The card lists all thirteen as the build passes them.\n`;
    LOADING_STEPS.forEach((step, i) => {
      loading += `\n### ${i + 1}. ${step}\n\nStep line:\n${quote(clean(controls.loading?.[step]))}\n`;
      const pool: string[] = controls.loadingLines?.[step] ?? [];
      if (pool.length)
        loading += `\nDry lines this step may show (one at a time, a new one every few seconds):\n${pool.map((line) => quote(clean(line))).join("\n\n")}\n`;
    });
    loading += `\n## The loading story\n`;
    for (const year of story?.years ?? []) {
      loading += `\n### ${year.year}\n`;
      for (const line of year.lines ?? [])
        loading += `\n${quote(clean(line.text))}\n`;
      for (const h of year.headlines ?? [])
        loading += `\nHeadline: ${quote(clean(h.headline))}\n`;
    }
    write("loading", loading);

    // 2 and 3. The staged scene is the address; its narration then the parts.
    const moment: string | undefined = life.sceneMomentId;
    const opening = await call("GET", `/api/opening?${q({ id: me })}`);
    let address = head(
      "The address",
      `Scene: ${moment ?? "none staged"}\nSpeaker: ${opening?.speaker?.name ?? "unknown"}, ${opening?.speaker?.title ?? ""}\n`,
    );
    let arrival = head("Arrival narration");
    if (moment) {
      const scene = await call("GET", `/api/story?${q({ momentId: moment })}`);
      Object.assign(names, scene.names ?? {});
      arrival += `\n## Set before the address\n`;
      for (const line of scene.narration ?? [])
        arrival += `\n${quote(clean(line.text))}\n`;
      const parts: string[] = scene.speech?.parts?.length
        ? scene.speech.parts
        : scene.speech?.text
          ? [scene.speech.text]
          : [];
      parts.forEach((part, i) => {
        const beat = scene.beats?.[i];
        address += `\n## Paragraph ${i + 1} of ${parts.length}${beat ? ` (${beat.kind})` : ""}\n\n${quote(clean(part))}\n`;
      });
      if (scene.speech?.heardOn)
        address += `\nHeard on: ${clean(scene.speech.heardOn.station ?? scene.speech.heardOn.medium)}\n`;
    }
    const landing = opening?.home?.landing?.text;
    arrival += `\n## Landing at home\n\n${landing ? quote(clean(landing)) : "(none)"}\n`;
    write("address", address);
    write("arrival", arrival);

    // 4. The first talk at home: the first housemate the room offers, every
    // reply listed, the first reply pressed, to the end of the talk.
    const room = await call("GET", `/api/scene?${q({ id: me })}`);
    Object.assign(
      names,
      Object.fromEntries(
        (room.people ?? []).map((p: Json) => [p.personId, p.name]),
      ),
    );
    let other: Json = (room.people ?? []).find((p: Json) => p.talkable);
    // Nobody in the room the player is placed in: the first living housemate
    // the opening names stands in, and the file says so.
    let stoodIn = false;
    if (!other) {
      const housemate = (opening?.home?.memberIds ?? []).find(
        (id: string) => id !== me,
      );
      if (housemate) {
        other = {
          personId: housemate,
          name: nameOf(housemate),
          reason: "household",
        };
        stoodIn = true;
      }
    }
    let talk = head(
      "The first talk at home",
      `Room: ${room.place}, ${room.why}\nPeople here: ${(room.people ?? []).map((p: Json) => `${p.name} (${p.reason}${p.talkable ? "" : ", no talk"})`).join("; ")}\n`,
    );
    if (!other) talk += "\nNobody in the room had anything to say.\n";
    else {
      talk += `\nTalking with ${other.name} (${other.reason}).${stoodIn ? " The room showed nobody, so the first housemate the opening names is opened with directly." : ""}\n`;
      let view: Json = await call(
        "POST",
        `/api/talk/open?${q({ otherId: other.personId })}`,
      );
      let shown = 0;
      for (let turn = 1; view && turn <= 40; turn += 1) {
        const lines: Json[] = view.lines ?? [];
        talk += `\n## Turn ${turn}\n`;
        for (const line of lines.slice(shown))
          talk += `\n**${clean(line.speaker ?? nameOf(line.speakerId))}** (${line.kind ?? "line"}):\n${quote(clean(line.text))}\n`;
        shown = lines.length;
        const choices: Json[] = view.choices ?? [];
        if (!choices.length) {
          talk += "\n(No replies offered; the talk ends.)\n";
          break;
        }
        talk += `\nReplies offered:\n${choices.map((c, i) => `${i + 1}. ${clean(c.text ?? c.label ?? c.key)}`).join("\n")}\n\nPressed: reply 1.\n`;
        view = await call(
          "POST",
          `/api/talk/say?${q({ key: choices[0].key })}`,
        );
      }
      await call("POST", "/api/talk/leave");
    }
    write("talk-at-home", talk);

    // 5. The first Journal page: the newest chapter the player's Journal opens on.
    const chapters: Json[] = await call("GET", `/api/journal?${q({ id: me })}`);
    let journal = head(
      "The first Journal page",
      `Chapters: ${chapters.length}\n`,
    );
    chapters.forEach((chapter, i) => {
      journal += `\n## Chapter ${i + 1}${i === 0 ? " (first page)" : ""}: ${clean(chapter.title ?? chapter.heading ?? chapter.date)}\n`;
      for (const line of chapter.lines ?? [])
        journal += `\n${quote(clean(line.text ?? line))}\n`;
    });
    write("journal", journal);

    // 6. The first news: what the player has heard, each story with its headline.
    const items: Json[] = await call("GET", `/api/news?${q({ id: me })}`);
    const worded = items.filter((item) => item.headline);
    const bare = items.filter((item) => !item.headline);
    let news = head(
      "The first news stories",
      `Stories listed: ${items.length}; with a headline: ${worded.length}; public-record rows with no headline of their own: ${bare.length}\n`,
    );
    worded.forEach((item, i) => {
      news += `\n## Story ${i + 1}\n\nHeadline: ${quote(clean(item.headline))}\n`;
      if (item.lede) news += `\nLede:\n${quote(clean(item.lede))}\n`;
      for (const paragraph of item.paragraphs ?? [])
        news += `\n${quote(clean(paragraph))}\n`;
      news += `\nRecord: ${clean(item.id)}, ${item.date}${item.fresh ? ", fresh" : ""}\n`;
    });
    news += `\n## Public-record rows with no headline\n\nKind, date, record id:\n\n`;
    for (const item of bare)
      news += `- ${item.kind}, ${item.date}, ${item.id}\n`;
    write("news", news);
    console.log(`${place.key} ${place.seed}: ${dir}`);
  }
} finally {
  server.kill();
}
