/**
 * Scene review page: builds the data for a click-through of scenes of any kind
 * from the game's own scene composer. Development tooling; nothing here words
 * anything. Every line is a bank piece the composer said, and each line
 * carries its piece key.
 *
 *   node --import tsx scripts/words/door-scenes-review.ts <seed> [versions] [manifest.json] > review.json
 *   node scripts/words/door-scenes-review-page.mjs review.json page.html
 *
 * The manifest is a list of scenes to show, in order:
 *
 *   { "type": "door-signature", "variant": "sick", "kind": "Doors",
 *     "title": "Signature at a sick door", "revised": "2026-11-14",
 *     "seed": "abc" }
 *
 * `type` is a situation type of `src/director/data/situation-types.json`;
 * `variant` one of its arc variants (`arc-variants.json`), absent for the
 * kind's own arc; `kind` groups scenes on the page; `title` is what a voice
 * note calls the scene; `revised` is the date the words were last changed after
 * feedback; `seed` draws the place and cast (default: the run seed). Without a
 * manifest, every situation type with a purpose is shown, with each variant.
 *
 * How it works: a drawn place's bench world gives real people for the cast.
 * `composeSceneTalk` composes the whole tree. Where the player asks (the door
 * scenes) the resident's first answer is decided by the world, so the scene is
 * composed once for each answer the records can give (agree, hold back,
 * decline) and the page lets the reader pick. The composer picks pieces on the
 * scene's cause id, so a different cause id reads a different wording;
 * `versions` of them are composed for each scene. Ids read aloud as "4.2.7":
 * scene 4, wording 2, line 7 (doors add the answer, "4.2y.7").
 *
 * Slot values a scene's records would give (the employer, the rent owed) come
 * from the drawn world where it has them; otherwise a marked sample, and a slot
 * with no sample shows as [slot] so a missing fact is plain on the page.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { buildBenchWorld } from "../../src/bench/world";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { gameStartDate } from "../../src/core2/game-start";
import { ageOnDate, makeIsoDate } from "../../src/core2/kernel/dates";
import { drawPlace } from "../core2-year/place";
import { corePlaceByKey } from "../../src/core2/place-lookup";
import { composeSceneTalk } from "../../src/director/scene-talk";
import type {
  PurposeType,
  SceneTalkLine,
  TreeNode,
} from "../../src/director/scene-talk";
import { SITUATION_LIBRARY } from "../../src/director/scheduling";
import variantFile from "../../src/director/data/arc-variants.json" with { type: "json" };
import placesFile from "../../src/bench/data/scene-places.json" with { type: "json" };
import type { Fact } from "../../src/english/bank-line";
import type { CoreState } from "../../src/core2/types";

const [seed = "scene-review", versionsArg = "6", manifestPath] =
  process.argv.slice(2);
const VERSIONS = Number(versionsArg);

interface StaticLine {
  role: "narrator" | "resident" | "you" | "plain";
  who?: string;
  text: string;
  key?: string;
}
interface ManifestEntry {
  /** A situation type; absent for a text scene (`lines`) or an empty slot (`coming`). */
  type?: string;
  /** A scene that is text as played (a speech, a journal page, a paper story, a counter visit). */
  lines?: StaticLine[];
  /**
   * Text as played, read from a markdown file: the section under the first
   * heading that contains `heading`, up to the next heading of the same or a
   * higher level. Lines read "Name: text   (tag)", "- **Name:** text" or
   * "- _narration_"; anything else is plain text.
   */
  from?: {
    file: string;
    /** A heading path; absent, the whole file (or the lines from `start` to `end`). */
    heading?: string | string[];
    /** The first line containing this text, and the line containing `end`, left out. */
    start?: string;
    end?: string;
    /** One cell of a markdown table: the row containing `row`, the column's number from 1. */
    table?: { row: string; column: number };
    /**
     * The quoted pieces of one line, in order, said by `roles` in turn: the line
     * is found by `row` text, searched from `after` (a place's heading line).
     */
    quoted?: {
      row: string;
      after?: string;
      roles: ("resident" | "you")[];
      who?: string;
    };
  };
  /** A slot for a scene not built yet: its title says what is coming. */
  coming?: boolean;
  /** Where the text came from and what it was played in (part, place, seed, commit). */
  source?: string;
  variant?: string;
  kind?: string;
  title?: string;
  revised?: string;
  seed?: string;
}
interface OutLine {
  id: string;
  who: string;
  role: "narrator" | "resident" | "you" | "plain";
  text: string;
  key: string;
  move: string;
  tag?: string;
  /** Not a line of the scene: a header, a seed line, a screen note. */
  meta?: true;
}
interface OutChoice {
  line: OutLine;
  next: OutNode | null;
}
interface OutNode {
  lines: OutLine[];
  choices: OutChoice[];
  end?: { label: string; keeps: string; close?: OutLine };
}
interface Part {
  key: string;
  text: string;
  uses: {
    purpose?: string;
    step?: string;
    move?: string;
    role?: string;
    requiresFacts?: string[];
  }[];
}

const ANSWERS = [
  { name: "yes", letter: "y", label: "They agree", lean: 1, favor: 0 },
  { name: "maybe", letter: "m", label: "They hold back", lean: 0, favor: 1 },
  { name: "no", letter: "n", label: "They decline", lean: -1, favor: 0 },
] as const;

/** Where a kind of scene belongs on the page, by the situation type's key. */
const KIND_OF: Readonly<Record<string, string>> = {
  "door-ask": "Doors",
  "door-signature": "Doors",
  "vote-asked": "Votes and bills",
  "vote-sought": "Votes and bills",
  "vote-confirmed": "Votes and bills",
  "bill-carry": "Votes and bills",
  "section-bargain": "Votes and bills",
  "bill-held-chair": "Votes and bills",
  "floor-debate": "Votes and bills",
  "desk-visit": "Votes and bills",
  "budget-cut": "Votes and bills",
  "party-recruit": "Running for office",
  filing: "Running for office",
  "speech-afterward": "Running for office",
  "race-won": "Running for office",
  "race-lost": "Running for office",
  "polling-place": "Running for office",
  "family-filing": "Running for office",
  "manager-offer": "Running for office",
  "volunteer-offer": "Running for office",
  "rally-opponent": "Running for office",
  "rally-word": "Running for office",
  "rival-word": "Running for office",
  "debate-invite": "Running for office",
  "interview-invite": "Running for office",
  "press-interview": "Press",
  scandal: "Press",
  "donor-ask": "Money and favors",
  "bribe-offer": "Money and favors",
  "bribe-pressed": "Money and favors",
  "lobby-remembers": "Money and favors",
  "reach-out": "Money and favors",
  "job-offer": "Work",
  layoff: "Work",
  "first-day": "Work",
  "last-day": "Work",
  appointment: "Offices and appointments",
  "swearing-in": "Offices and appointments",
  recall: "Offices and appointments",
  accusation: "Conflict",
  argument: "Conflict",
  betrayal: "Conflict",
  warning: "Conflict",
  reconciliation: "Conflict",
  apology: "Conflict",
  "office-doubt": "Conflict",
  "constituent-stop": "Constituents",
  "office-hours": "Constituents",
  "town-hall-question": "Constituents",
  "action-confront": "Constituents",
  "cause-invite": "Constituents",
  "notice-home": "Constituents",
  "home-damaged": "Constituents",
};
const kindOf = (type: string) => KIND_OF[type] ?? "Home and family";

/** Samples for slots the world does not hold; marked in the page's note. */
const SAMPLES: Readonly<Record<string, string>> = {
  office: "mayor",
  bill: "the road bill",
  seat: "the council seat",
  post: "finance secretary",
  employer: "the plant",
  relative: "her mother",
  since: "a few months",
  owed: "$900",
  deadline: "the end of the month",
  due: "Friday",
  late: "two months",
  money: "$2,000",
  cost: "$4 million",
  issue: "the water rates",
  source: "the paper",
  outlet: "the Courier",
  opponent: "Dana Whitfield",
  winner: "Dana Whitfield",
  destination: "Ohio",
  executive: "the mayor",
  general: "the general election",
  primary: "the primary",
  margin: "312 votes",
  story: "the water rates",
  cause: "the library",
  section: "section 4",
  position: "chair",
  term: "two years",
  title: "councilmember",
  years: "ten",
  hours: "two",
  number: "three",
  signatures: "the signatures",
  required: "two hundred",
  party: "the party",
  body: "the council",
  school: "the high school",
  kid: "your son",
  child: "your daughter",
  "new-child": "the baby",
  deceased: "her husband",
  loss: "the layoff",
  aid: "the aid",
  where: "the hall",
  home: "the house",
  hometown: "home",
  area: "the east side",
  absent: "two",
  ayes: "five",
  nays: "two",
  clerk: "the clerk",
  leader: "the leader",
  crew: "the crew",
  cut: "the cut",
  companion: "a friend",
  spouse: "your wife",
  partner: "your partner",
  honoree: "your mother",
  age: "eighteen",
  percent: "ten percent",
  begins: "Monday",
  remaining: "two",
  left: "two",
  given: "$500",
  away: "away",
  earlier: "the road bill",
};

setBookkeeping(false);

interface World {
  core: CoreState;
  place: { name: string; key: string; seed: string };
  player: CoreState["people"] extends Map<unknown, infer P> ? P : never;
  cast: (CoreState["people"] extends Map<unknown, infer P> ? P : never)[];
  orgs: { id: string; name: string }[];
}
const worlds = new Map<string, World>();
function worldFor(worldSeed: string): World {
  const had = worlds.get(worldSeed);
  if (had) return had;
  const place = drawPlace(worldSeed, "scene-review");
  const { core } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const start = makeIsoDate(core.date);
  const town = corePlaceByKey(place.key)?.context.jurisdiction.id;
  const adults = [...core.people.values()]
    .filter(
      (row) =>
        row.alive &&
        row.placeId === town &&
        row.tier !== "husk" &&
        ageOnDate(makeIsoDate(row.birthDate), start) >= 25,
    )
    .sort((a, b) => a.id.localeCompare(b.id));
  if (adults.length < VERSIONS + 2) throw new Error("not enough adults");
  const made: World = {
    core,
    place: { name: place.name, key: place.key, seed: place.seed },
    player: adults[0]!,
    cast: adults.slice(1),
    orgs: [...core.organizations.values()].sort((a, b) =>
      a.id.localeCompare(b.id),
    ) as unknown as { id: string; name: string }[],
  };
  worlds.set(worldSeed, made);
  return made;
}

const parts = (
  JSON.parse(readFileSync("data/english/parts/scene-talk.json", "utf8")) as {
    parts: Part[];
  }
).parts;
const slotsOf = (purposes: string[]): Set<string> => {
  const out = new Set<string>();
  for (const part of parts)
    if (part.uses.some((u) => purposes.includes(u.purpose ?? "")))
      for (const m of part.text.matchAll(/\{(\w[\w-]*)\}/g)) out.add(m[1]!);
  return out;
};

const fact = (text: string, ids: string[] = []): Fact => ({
  text,
  sourceRecordIds: ids.length ? ids : ["scene-review:sample"],
});

function factsFor(
  w: World,
  i: number,
  slots: Set<string>,
): Record<string, Fact> {
  const other = w.cast[i % w.cast.length]!;
  const house = w.core.households.get(other.householdId);
  const kin = (house?.memberIds ?? [])
    .map((id) => w.core.people.get(id))
    .find((row) => row && row.id !== other.id);
  const org = w.orgs[i % Math.max(1, w.orgs.length)];
  const facts: Record<string, Fact> = {};
  for (const slot of slots) facts[slot] = fact(`[${slot}]`);
  for (const [slot, text] of Object.entries(SAMPLES))
    if (slots.has(slot)) facts[slot] = fact(text);
  const known: Record<string, Fact> = {
    name: fact(`${other.givenName} ${other.familyName}`, [other.id]),
    first: fact(other.givenName, [other.id]),
    self: fact(w.player.givenName, [w.player.id]),
    place: fact(w.place.name),
    employer: fact(org?.name ?? SAMPLES.employer!, org ? [org.id] : []),
    relative: fact(kin?.givenName ?? SAMPLES.relative!, kin ? [kin.id] : []),
  };
  return { ...facts, ...known };
}

function line(
  ids: { next(): string },
  l: SceneTalkLine,
  playerName: string,
): OutLine {
  const role =
    l.role === "narrator"
      ? "narrator"
      : l.speaker === playerName
        ? "you"
        : "resident";
  return {
    id: ids.next(),
    who: l.role === "narrator" ? "" : role === "you" ? "You" : l.speaker,
    role,
    text: l.text,
    key: l.parts.join(" + "),
    move: l.move,
    ...(l.tag ? { tag: l.tag } : {}),
  };
}

function walk(
  node: TreeNode,
  ids: { next(): string },
  playerName: string,
): OutNode {
  const out: OutNode = {
    lines: node.lines.map((l) => line(ids, l, playerName)),
    choices: [],
  };
  if (node.end?.ending || node.end?.close)
    out.end = {
      label: node.end.ending?.label ?? "",
      keeps: node.end.ending?.keeps ?? "none",
      ...(node.end.close
        ? { close: line(ids, node.end.close, playerName) }
        : {}),
    };
  for (const reply of node.replies)
    out.choices.push({
      line: line(ids, reply.line, playerName),
      next: reply.next ? walk(reply.next, ids, playerName) : null,
    });
  return out;
}

const keysOfNode = (node: OutNode, into: Set<string>) => {
  for (const l of node.lines) for (const k of l.key.split(" + ")) into.add(k);
  if (node.end?.close)
    for (const k of node.end.close.key.split(" + ")) into.add(k);
  for (const c of node.choices) {
    for (const k of c.line.key.split(" + ")) into.add(k);
    if (c.next) keysOfNode(c.next, into);
  }
};

const library = (SITUATION_LIBRARY as unknown as { types: PurposeType[] })
  .types;
const families = variantFile.families as unknown as Record<
  string,
  { variants: Record<string, { purpose: string }> }
>;

function defaultManifest(): ManifestEntry[] {
  const out: ManifestEntry[] = [];
  for (const type of library) {
    if (!type.purpose) continue;
    out.push({ type: type.key, kind: kindOf(type.key) });
    for (const variant of Object.keys(families[type.purpose]?.variants ?? {}))
      if (variant !== "plain")
        out.push({ type: type.key, variant, kind: kindOf(type.key) });
  }
  return out.sort(
    (a, b) =>
      (a.kind ?? "").localeCompare(b.kind ?? "") ||
      a.type.localeCompare(b.type),
  );
}

const manifest: ManifestEntry[] = manifestPath
  ? (JSON.parse(readFileSync(manifestPath, "utf8")) as ManifestEntry[])
  : defaultManifest();

/** The lines of one section of a markdown file of text as played. */
function linesFromRange(from: NonNullable<ManifestEntry["from"]>): {
  lines: StaticLine[];
  context: string;
} {
  const all = readFileSync(from.file, "utf8").split("\n");
  const context = from.file.split("/").slice(-2).join("/");
  if (from.table) {
    const row = all.find(
      (r) => r.startsWith("|") && r.includes(from.table!.row),
    );
    if (!row)
      throw new Error(`no table row "${from.table.row}" in ${from.file}`);
    const cell = row.split("|").map((c) => c.trim())[from.table.column];
    return { lines: [{ role: "plain", text: cell ?? "" }], context };
  }
  if (from.quoted) {
    const q = from.quoted;
    const begin = q.after ? all.findIndex((r) => r.includes(q.after!)) : 0;
    const row = all.slice(Math.max(begin, 0)).find((r) => r.includes(q.row));
    if (!row) throw new Error(`no line "${q.row}" in ${from.file}`);
    const pieces = [...row.matchAll(/"([^"]+)"/g)].map((m) => m[1]!);
    return {
      lines: pieces.map((text, i) => {
        const role = q.roles[i % q.roles.length]!;
        return {
          role,
          who: role === "you" ? "You" : (q.who ?? "Resident"),
          text,
        };
      }),
      context: `${context}, ${(q.after ?? "").slice(0, 60)}`,
    };
  }
  const first = from.start ? all.findIndex((r) => r.includes(from.start!)) : 0;
  const last = from.end
    ? all.findIndex((r, i) => i > first && r.includes(from.end!))
    : all.length;
  if (first < 0 || last < 0) throw new Error(`range not found in ${from.file}`);
  const text = all
    .slice(first + (from.start ? 1 : 0), last)
    .filter((r) => r.trim());
  return {
    lines: text.map((r) => ({ role: "plain" as const, text: r.trim() })),
    context,
  };
}

function linesFromFile(
  file: string,
  heading: string | string[],
): { lines: StaticLine[]; context: string } {
  const rows = readFileSync(file, "utf8").split("\n");
  // Each name narrows the search: the next heading after the last one found.
  let at = -1;
  for (const name of [heading].flat()) {
    const next = rows.findIndex(
      (r, i) => i > at && /^#{2,6} /.test(r) && r.includes(name),
    );
    if (next < 0) throw new Error(`no heading "${name}" in ${file}`);
    at = next;
  }
  const place = rows
    .slice(0, at)
    .reverse()
    .find((r) => /^## /.test(r));
  const level = /^(#+)/.exec(rows[at]!)![1]!.length;
  const out: StaticLine[] = [];
  for (const raw of rows.slice(at + 1)) {
    const head = /^(#+) /.exec(raw);
    if (head && head[1]!.length <= level) break;
    const row = raw.trim();
    if (!row || row === "---" || /^#{1,6} /.test(row)) continue;
    const narr = /^[-*]\s+_(.+)_$/.exec(row);
    if (narr) {
      out.push({ role: "narrator", text: narr[1]! });
      continue;
    }
    const said =
      /^[-*]?\s*(?:\*\*)?([A-Z][\w .'-]{0,40}?)(?::\*\*|:)\s+(.+?)(?:\s{2,}\(([^)]*)\))?$/.exec(
        row,
      );
    if (said) {
      out.push({
        role: said[1] === "You" ? "you" : "resident",
        who: said[1] === "You" ? "You" : said[1]!,
        text: said[2]!.replace(/\*\*/g, ""),
        ...(said[3] ? { key: said[3] } : {}),
      });
      continue;
    }
    out.push({ role: "plain", text: row.replace(/^[-*]\s+/, "") });
  }
  return {
    lines: out,
    context: `${file.split("/").slice(-2).join("/")}${place ? `, ${place.replace(/^## /, "").slice(0, 140)}` : ""}`,
  };
}

const sentence = (s: string) => s.replace(/[-.]/g, " ");
const scenes: unknown[] = [];
const notReady: { title: string; kind: string; why: string }[] = [];
const places = placesFile.situationPlaces as Record<string, string[]>;
let sceneNo = 0;

for (const entry of manifest) {
  let context = "";
  if (entry.from) {
    const read = entry.from.heading
      ? linesFromFile(entry.from.file, entry.from.heading)
      : linesFromRange(entry.from);
    entry.lines = read.lines;
    context = read.context;
  }
  if (entry.coming || entry.lines) {
    sceneNo += 1;
    const n = { i: 0 };
    const ids = { next: () => `${sceneNo}.1.${(n.i += 1)}` };
    const META =
      /^(Seed:|Place:|Filed:|COUNTER TEXT|CAMPAIGN TAB|\[screen|Continue$|MEANING-COUNT|- ?outlet:|World seed)/;
    const lines = (entry.lines ?? []).map<OutLine>((l) => ({
      id: ids.next(),
      who: l.who ?? "",
      role: l.role,
      text: l.text,
      // A tag from a played file (here/ask) is not a bank piece key.
      key: "",
      move: "",
      ...(l.key ? { tag: l.key } : {}),
      ...(l.role === "plain" && META.test(l.text)
        ? { meta: true as const }
        : {}),
    }));
    scenes.push({
      id: String(sceneNo),
      kind: entry.kind ?? "Other",
      title: entry.title ?? "Untitled",
      type: "text",
      variant: "plain",
      purpose: "",
      revised: entry.revised ?? "",
      place: entry.source ?? context,
      picture: null,
      asking: false,
      coming: !!entry.coming,
      bank: [],
      versions: [
        {
          v: 1,
          answers: [
            {
              answer: "play",
              label: "",
              opening: lines,
              tree: { lines: [], choices: [] },
            },
          ],
        },
      ],
    });
    continue;
  }
  if (!entry.type) {
    notReady.push({
      title: entry.title ?? "Untitled",
      kind: entry.kind ?? "Other",
      why: "no type",
    });
    continue;
  }
  const base = library.find((row) => row.key === entry.type);
  const title =
    entry.title ??
    `${sentence(entry.type)}${entry.variant ? `, ${sentence(entry.variant)}` : ""}`;
  const kind = entry.kind ?? kindOf(entry.type);
  if (!base?.purpose) {
    notReady.push({ title, kind, why: "no scene purpose for this type" });
    continue;
  }
  const family = base.purpose;
  const variant = entry.variant
    ? families[family]?.variants[entry.variant]
    : undefined;
  if (entry.variant && !variant) {
    notReady.push({ title, kind, why: `no variant ${entry.variant}` });
    continue;
  }
  const purpose = variant ? variant.purpose : family;
  const w = worldFor(entry.seed ?? seed);
  const playerName = `${w.player.givenName} ${w.player.familyName}`;
  const asking = !!base.playerAsks;
  const slots = slotsOf([purpose, family]);
  const type = {
    ...base,
    purpose,
    ...(variant ? { family } : {}),
  } as PurposeType;
  sceneNo += 1;
  const versions: unknown[] = [];
  let failed = "";
  for (let v = 1; v <= VERSIONS; v += 1) {
    const answers: unknown[] = [];
    for (const answer of asking ? ANSWERS : ANSWERS.slice(0, 1)) {
      const asker = w.cast[(v - 1) % w.cast.length]!;
      const result = composeSceneTalk(
        w.core,
        undefined,
        {
          causeId: `scene-review:${purpose}:${v}`,
          askerId: asker.id,
          askedId: w.player.id,
        },
        type,
        factsFor(w, v - 1, slots),
        asking ? { standing: { lean: answer.lean, favor: answer.favor } } : {},
        { includeHeld: !process.env.REVIEW_SHIPPED },
      );
      if (result.kind !== "composed") {
        failed = result.reason;
        answers.push({ answer: answer.name, label: answer.label });
        continue;
      }
      const n = { i: 0 };
      const ids = {
        next: () =>
          `${sceneNo}.${v}${asking ? answer.letter : ""}.${(n.i += 1)}`,
      };
      const talk = result.talk;
      answers.push({
        answer: asking ? answer.name : "play",
        label: asking ? answer.label : "",
        opening: [
          ...talk.narration,
          ...(talk.open ? [talk.open] : []),
          ...talk.intro,
          talk.state,
        ].map((l) => line(ids, l, playerName)),
        tree: walk(talk.tree, ids, playerName),
      });
    }
    versions.push({ v, answers });
  }
  const composed = (versions as { answers: { tree?: OutNode }[] }[]).some((v) =>
    v.answers.some((a) => a.tree),
  );
  if (!composed) {
    sceneNo -= 1;
    notReady.push({ title, kind, why: failed || "did not compose" });
    continue;
  }
  const shown = new Set<string>();
  for (const v of versions as {
    answers: { opening?: OutLine[]; tree?: OutNode }[];
  }[])
    for (const a of v.answers) {
      for (const l of a.opening ?? [])
        for (const k of l.key.split(" + ")) shown.add(k);
      if (a.tree) keysOfNode(a.tree, shown);
    }
  const own = new Set(
    parts
      .filter((p) => p.uses.some((u) => u.purpose === purpose))
      .map((p) => p.key),
  );
  const bank = parts
    .filter((p) => shown.has(p.key) || own.has(p.key))
    .map((p, i) => {
      const use = p.uses.find((u) => u.purpose === purpose) ?? p.uses[0]!;
      return {
        id: `${sceneNo}.b${i + 1}`,
        key: p.key,
        step: use.step,
        move: use.move,
        role: use.role,
        text: p.text,
        requires: use.requiresFacts ?? [],
        shown: shown.has(p.key),
        family: use.purpose !== purpose,
      };
    });
  scenes.push({
    id: String(sceneNo),
    kind,
    title,
    type: entry.type,
    variant: entry.variant ?? "plain",
    purpose,
    revised: entry.revised ?? "",
    place: w.place.name,
    picture:
      places[`${entry.type}:${base.setting?.[0] ?? "other-home"}`] ?? null,
    asking,
    bank,
    versions,
  });
}

const generated = new Date().toISOString().slice(0, 10);
const commit = process.env.REVIEW_COMMIT ?? "";
const news: { fresh: string[]; revised: string[] } = {
  fresh: [],
  revised: [],
};
// A scene whose text changed since the earlier run is marked revised, with the
// earlier text one click away; one that did not keeps its earlier mark.
if (process.env.REVIEW_PREVIOUS) {
  const old = JSON.parse(readFileSync(process.env.REVIEW_PREVIOUS, "utf8")) as {
    generated: string;
    commit: string;
    scenes: {
      title: string;
      revised?: string;
      versions: unknown;
      bank: unknown;
      previous?: unknown;
    }[];
  };
  const oldByTitle = new Map(old.scenes.map((row) => [row.title, row]));
  for (const row of scenes as {
    title: string;
    revised: string;
    versions: unknown;
    previous?: unknown;
  }[]) {
    const was = oldByTitle.get(row.title);
    if (!was) {
      news.fresh.push(row.title);
      continue;
    }
    if (JSON.stringify(was.versions) !== JSON.stringify(row.versions)) {
      news.revised.push(row.title);
      row.revised = row.revised || generated;
      row.previous = {
        date: old.generated,
        commit: old.commit,
        versions: was.versions,
        bank: was.bank,
      };
    } else if (was.revised) {
      row.revised = was.revised;
      if (was.previous) row.previous = was.previous;
    }
  }
}
// The batch file the voice-note reader reads: one moment per scene, every line
// of it with its id and its bank piece keys.
if (process.env.REVIEW_BATCH) {
  const flat = (node: OutNode, into: OutLine[]) => {
    into.push(...node.lines);
    if (node.end?.close) into.push(node.end.close);
    for (const c of node.choices) {
      into.push(c.line);
      if (c.next) flat(c.next, into);
    }
  };
  const moments = (
    scenes as {
      id: string;
      title: string;
      kind: string;
      versions: {
        answers: { opening?: OutLine[]; tree?: OutNode }[];
      }[];
    }[]
  ).map((row) => {
    const lines: OutLine[] = [];
    for (const v of row.versions)
      for (const a of v.answers) {
        lines.push(...(a.opening ?? []));
        if (a.tree) flat(a.tree, lines);
      }
    return {
      moment: Number(row.id),
      description: row.title,
      sceneKind: row.kind,
      lines: lines.map((l) => ({
        id: l.id,
        key: l.key,
        line: l.text,
        ...(l.meta ? { meta: true } : {}),
      })),
    };
  });
  writeFileSync(
    process.env.REVIEW_BATCH,
    JSON.stringify({ id: `scene-review-${generated}`, moments }, null, 1),
  );
}

process.stdout.write(
  JSON.stringify(
    {
      seed,
      place: worldFor(seed).place,
      commit,
      generated,
      scenes,
      notReady,
      news,
    },
    null,
    1,
  ),
);
