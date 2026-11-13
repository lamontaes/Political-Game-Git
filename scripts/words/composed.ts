/**
 * The composed checks over played lives (docs/design/words-composer.md, part 6).
 * Development tooling; shipped play never imports it.
 *
 *   npm run words:composed -- [--draws N] [--seed S ...] [--place-key K]
 *        [--days D] [--report <file outside the repository>]
 *        [--write-baseline] [--check]
 *
 * For each draw it starts a new life on the bench through the bench's own
 * routes (`benchRequest`, the same calls the play screen makes, so the player
 * is played as a player is: the opening address and the evening after it,
 * every person at home who has something to say each day, Day pressed and
 * every stop and staged scene played) for D days (14 by default), and keeps
 * every text the player met as a composed text (`src/english/composed-text.ts`):
 * the speeches, talks, scenes, narration, the Journal's first page and each
 * new note, and each new news toast and story. A governor's or mayor's
 * address the window does not reach is composed from the played world's
 * records through `recordLocalAddress` at the end and labeled a proof.
 *
 * Then it runs every composed rule (`src/english/composed-checks.ts`) and
 * prints, per rule, texts read, breaks, and three examples with place, seed,
 * kind and text. `--write-baseline` writes tests/guards/english/composed-baseline.json
 * (breaks per 100 texts per rule, with the draws); `--check` replays the
 * baseline's draws and exits 1 when any rule's rate rose.
 *
 * Draws: `--seed S` (repeatable) draws a place from S; `--draws N` adds N
 * fresh seeds. `--place-key K` holds the first seed to a place (a labeled case).
 * One world at a time.
 */
import { randomUUID } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { benchRequest, benchWorld } from "../../src/bench/handler";
import { OPENING_EVENING_MINUTE } from "../../src/bench/opening";
import { officeholders } from "../../src/bench/officeholders";
import { corePlaceStateIdentities } from "../../src/core2/place-lookup";
import { realLocalities } from "../../src/core2/places";
import { racesOf } from "../../src/core2/modules/voting";
import { coreAPI } from "../../src/core2/state";
import { recordLocalAddress } from "../../src/director/local-address";
import {
  ADDRESS_FACT,
  ADDRESS_PART_BREAK,
} from "../../src/director/opening-facts";
import {
  baselineFailures,
  runComposedRules,
  type ComposedBreak,
  type ComposedRuleRow,
} from "../../src/english/composed-checks";
import {
  composedLine,
  type ComposedKind,
  type ComposedSample,
  type ComposedScreen,
  type ComposedText,
  type NamedPerson,
} from "../../src/english/composed-text";
import { drawPlace } from "../core2-year/place";

const ROOT = path.resolve(import.meta.dirname, "../..");
const BASELINE = path.join(ROOT, "tests/guards/english/composed-baseline.json");
/** The draw's purpose in drawPlace, so a seed names the same place every run. */
const PURPOSE = "words-composed";
/** The most replies the player gives in one talk, as the play walks do. */
const MOST_REPLIES = 3;
/** The most people at home talked to after each day. */
const MOST_TALKS = 3;
/** The most stops resumed in one Day before the run calls it stuck. */
const MOST_STOPS = 60;
const DEFAULT_DAYS = 14;
/** Rates are kept per this many texts. */
const PER = 100;

export interface Draw {
  readonly seed: string;
  readonly placeKey: string;
  readonly place: string;
}

type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

async function ask(method: string, route: string): Promise<Json | null> {
  const reply = await benchRequest(method, new URL(route, "http://bench"), {
    developer: true,
  });
  const body = JSON.parse(String(reply.body)) as Json | null;
  if (reply.status !== 200)
    throw new Error(
      `${method} ${route}: ${reply.status} ${JSON.stringify(body)}`,
    );
  return body;
}

/** A place for a seed: drawn from all 56, or held to a key for a labeled case. */
export function drawFor(seed: string, placeKey?: string): Draw {
  if (placeKey) {
    const row = realLocalities().find((place) => place.key === placeKey);
    if (!row) throw new Error(`No place with key ${placeKey}`);
    return { seed, placeKey, place: row.displayName };
  }
  const drawn = drawPlace(seed, PURPOSE);
  const row = realLocalities().find((place) => place.key === drawn.key);
  return {
    seed,
    placeKey: drawn.key,
    place: row?.displayName ?? drawn.name,
  };
}

/** Plays one life and returns every composed text it met. */
export async function playLife(
  draw: Draw,
  days: number,
): Promise<ComposedSample> {
  const life = (await ask(
    "POST",
    `/api/newlife?${new URLSearchParams({ seed: draw.seed, placeKey: draw.placeKey })}`,
  ))!;
  const me = String(life.personId);
  const world = benchWorld();
  const core = world.core!;
  const texts: ComposedText[] = [];
  const town = String(life.placeName).split(",")[0]!.trim();
  const states = corePlaceStateIdentities();
  const stateName = String(life.placeName).split(",").at(-1)!.trim();
  const player = core.people.get(me)!;
  const householdIds = [
    ...(core.households.get(player.householdId)?.memberIds ?? [me]),
  ];
  const minute = () =>
    world.player?.packet?.at.minuteOfDay ?? OPENING_EVENING_MINUTE;
  const date = () => world.player?.packet?.at.date ?? core.date;
  const add = (
    kind: ComposedKind,
    screens: ComposedScreen[],
    extra: Partial<ComposedText> = {},
  ) => {
    if (!screens.some((screen) => screen.lines.length)) return;
    texts.push({
      id: `${kind}:${date()}:${texts.length}`,
      kind,
      date: date(),
      minuteOfDay: minute(),
      presentIds: [me],
      screens,
      ...extra,
    });
  };
  const ownPlacesOf = (kind: ComposedKind): string[] =>
    kind === "speech:governor"
      ? [stateName]
      : kind === "speech:mayor"
        ? [town, stateName]
        : [];
  const speechKindOf = (eventKind: string): ComposedKind =>
    eventKind.startsWith("governor")
      ? "speech:governor"
      : eventKind.startsWith("mayor")
        ? "speech:mayor"
        : eventKind.startsWith("president")
          ? "speech:president"
          : "speech:player";
  const spoken = new Set<string>();
  const addSpeech = (
    eventKind: string,
    id: string,
    speakerId: string,
    parts: readonly string[],
    presentIds: readonly string[],
    proof = false,
  ) => {
    if (spoken.has(id)) return;
    spoken.add(id);
    const kind = speechKindOf(eventKind);
    add(
      kind,
      parts.map((part) => ({
        lines: [composedLine(part, speakerId)],
        offered: [],
      })),
      {
        speakerId,
        listenerId: me,
        presentIds,
        ownPlaces: ownPlacesOf(kind),
        ...(proof ? { proof } : {}),
      },
    );
  };

  /** Plays an open talk: the lines said, each set of replies offered, a reply chosen by turn. */
  const playTalk = async (
    otherId: string,
    kind: ComposedKind,
    presentIds: readonly string[],
    momentId?: string,
  ) => {
    const at = minute();
    let view = await ask(
      "POST",
      `/api/talk/open?${new URLSearchParams({ otherId, ...(momentId ? { momentId } : {}) })}`,
    );
    if (!view) return;
    const screens: ComposedScreen[] = [];
    let shown = 0;
    for (let turn = 0; ; turn += 1) {
      const lines = (view!.lines as Json[]).slice(shown);
      shown = view!.lines.length;
      const choices = (view!.choices ?? []) as Json[];
      screens.push({
        lines: lines.map((line) =>
          composedLine(String(line.text), String(line.speakerId)),
        ),
        offered: choices.map((choice) => String(choice.text)),
      });
      if (!choices.length || turn >= MOST_REPLIES) break;
      const chosen = choices[turn % choices.length]!;
      view = await ask(
        "POST",
        `/api/talk/say?${new URLSearchParams({ key: String(chosen.key) })}`,
      );
      if (!view) break;
    }
    await ask("POST", "/api/talk/leave");
    texts.push({
      id: `${kind}:${date()}:${texts.length}`,
      kind,
      date: date(),
      minuteOfDay: at,
      speakerId: otherId,
      listenerId: me,
      presentIds,
      screens,
    });
  };

  /** Plays a staged scene: its narration, a speech heard, an exchange, or the talk it opens. */
  const playStory = async (momentId: string) => {
    const story = (await ask(
      "GET",
      `/api/story?${new URLSearchParams({ momentId })}`,
    ))!;
    const presentIds = Object.keys(story.names ?? {}).filter(
      (id) => id !== story.speech?.speakerId,
    );
    add(
      "narration",
      [
        {
          lines: (story.narration as Json[]).map((line) =>
            composedLine(String(line.text)),
          ),
          offered: [],
        },
      ],
      { presentIds },
    );
    if (story.speech) {
      const eventKind =
        /(president|governor|mayor)\.address/.exec(momentId)?.[0] ?? "speech";
      addSpeech(
        eventKind,
        String(story.speech.sourceRecordIds?.[0] ?? momentId),
        String(story.speech.speakerId),
        story.speech.parts?.length ? story.speech.parts : [story.speech.text],
        presentIds,
      );
      return;
    }
    if (story.talk) {
      const talk = story.talk;
      const at = minute();
      const screens: ComposedScreen[] = [
        {
          lines: (talk.opening as Json[]).map((line) =>
            composedLine(String(line.text), line.speakerId ?? talk.askerId),
          ),
          offered: [],
        },
      ];
      const path: number[] = [];
      let node = talk.tree as Json | null;
      for (let turn = 0; node; turn += 1) {
        const replies = (node.replies ?? []) as Json[];
        const closing = node.end?.close ? [node.end.close] : [];
        screens.push({
          lines: [...(node.lines as Json[]), ...closing].map((line) =>
            composedLine(
              String(line.text),
              line.role === "asked" ? me : (line.speakerId ?? talk.askerId),
            ),
          ),
          offered: replies.map((reply) => String(reply.line.text)),
        });
        if (!replies.length) break;
        const index = turn % replies.length;
        const reply = replies[index]!;
        path.push(index);
        screens.push({
          lines: [composedLine(String(reply.line.text), me)],
          offered: [],
        });
        node = reply.next;
      }
      await ask(
        "POST",
        `/api/story/reply?${new URLSearchParams({ momentId, typeKey: String(talk.typeKey), path: path.join(".") })}`,
      ).catch(() => null);
      texts.push({
        id: `scene:${date()}:${texts.length}`,
        kind: "scene",
        date: date(),
        minuteOfDay: at,
        speakerId: String(talk.askerId),
        listenerId: me,
        presentIds,
        screens,
      });
      return;
    }
    if (story.talkToId)
      await playTalk(String(story.talkToId), "scene", presentIds, momentId);
  };

  /** Everyone here who has something to say, at most MOST_TALKS of them. */
  const talkAround = async () => {
    const scene = (await ask(
      "GET",
      `/api/scene?id=${encodeURIComponent(me)}`,
    ))!;
    const people = (scene.people ?? []) as Json[];
    const presentIds = [me, ...people.map((row) => String(row.personId))];
    const atHome = people.every((row) => householdIds.includes(row.personId));
    for (const row of people
      .filter((person) => person.talkable)
      .slice(0, MOST_TALKS))
      await playTalk(
        String(row.personId),
        atHome ? "talk:home" : "talk:town",
        presentIds,
      );
  };

  let lastNote = "";
  const newsSeen = new Set<string>();
  /** The Journal's newest line and the night's news, as the toasts show them. */
  const toasts = async () => {
    const chapters = ((await ask(
      "GET",
      `/api/journal?id=${encodeURIComponent(me)}`,
    )) ?? []) as Json[];
    const note = String(chapters.at(-1)?.lines?.at(-1)?.text ?? "");
    if (note && note !== lastNote)
      add("journal:note", [{ lines: [composedLine(note)], offered: [] }]);
    lastNote = note;
    const rows = ((await ask(
      "GET",
      `/api/news?id=${encodeURIComponent(me)}`,
    )) ?? []) as Json[];
    for (const row of rows) {
      const kind = String(row.kind ?? "");
      const facts = (row.facts ?? {}) as Json;
      if (
        /^(president|governor|mayor)\.address$/.test(kind) &&
        facts[ADDRESS_FACT.text]
      )
        addSpeech(
          kind,
          String(row.id),
          String(facts[ADDRESS_FACT.speaker] ?? ""),
          String(facts[ADDRESS_FACT.parts] ?? facts[ADDRESS_FACT.text]).split(
            ADDRESS_PART_BREAK,
          ),
          [me],
        );
    }
    const story = rows.find(
      (row) =>
        row.fresh !== false &&
        (row.headline || row.lede || row.broadcast?.[0]?.text),
    );
    if (story && !newsSeen.has(String(story.id))) {
      newsSeen.add(String(story.id));
      const headline = String(
        story.headline ?? story.lede ?? story.broadcast[0].text,
      );
      add("news:toast", [{ lines: [composedLine(headline)], offered: [] }]);
      const body: string[] = story.paragraphs?.length
        ? story.paragraphs
        : [
            ...(story.broadcast ?? []).map((line: Json) => String(line.text)),
            ...(story.lede && story.lede !== story.headline
              ? [story.lede]
              : []),
          ];
      if (body.length)
        add("news:story", [
          {
            lines: [headline, ...body].map((line) =>
              composedLine(String(line)),
            ),
            offered: [],
          },
        ]);
    }
  };

  // The opening: the address the household watches, then the evening at home.
  if (life.sceneMomentId) await playStory(String(life.sceneMomentId));
  const chapters = ((await ask(
    "GET",
    `/api/journal?id=${encodeURIComponent(me)}`,
  )) ?? []) as Json[];
  // The whole Journal as its screen shows it, every chapter's entries in order.
  if (chapters.length)
    add("journal:page", [
      {
        lines: chapters.flatMap((chapter) =>
          (chapter.lines as Json[]).map((line) =>
            composedLine(String(line.text)),
          ),
        ),
        offered: [],
      },
    ]);
  await toasts();
  await talkAround();
  for (let day = 0; day < days; day += 1) {
    let body = (await ask("POST", "/api/advance?mode=day"))!;
    for (let stops = 0; stops < MOST_STOPS; stops += 1) {
      if (body.pollingPlace || body.candidateMorning) {
        await ask("POST", "/api/polling-place/leave").catch(() => null);
        body = (await ask("POST", "/api/advance?mode=day"))!;
        continue;
      }
      const packet = body.packet as Json | undefined;
      if (packet?.kind !== "stop") break;
      const moment = (packet.stop?.modules ?? []).find(
        (row: Json) =>
          row.kind === "interrupt" && row.moduleId === "p13-story-director",
      );
      if (moment?.recordId) await playStory(String(moment.recordId));
      body = (await ask(
        "POST",
        `/api/resume?${new URLSearchParams({ kind: "stop", pauseId: String(packet.pauseId ?? "") })}`,
      ))!;
    }
    await toasts();
    await talkAround();
  }
  // A governor's or mayor's address the window did not reach: composed from
  // this world's records through the one function that records it, a proof.
  for (const level of ["state", "town"] as const) {
    const kind = level === "state" ? "speech:governor" : "speech:mayor";
    if (texts.some((text) => text.kind === kind)) continue;
    const story = recordLocalAddress(core, level);
    if (story)
      addSpeech(
        level === "state" ? "governor.address" : "mayor.address",
        story.id,
        story.speakerId,
        story.parts,
        [me],
        true,
      );
  }
  const roles = new Map(
    officeholders(core).map((row) => [row.personId, row.title]),
  );
  const people: NamedPerson[] = [...core.people.values()]
    .filter((person) => person.givenName && person.familyName)
    .map((person) => ({
      id: person.id,
      full: `${person.givenName} ${person.familyName}`,
      given: person.givenName,
      ...(roles.has(person.id) ? { role: roles.get(person.id)! } : {}),
    }));
  return {
    place: String(life.placeName),
    seed: draw.seed,
    playerId: me,
    householdIds,
    people,
    stateNames: states.map((row) => row.name),
    townName: town,
    // The world's election calendar, for a line that names when a vote is.
    electionDates: racesOf(coreAPI(core)).map((row) => row.date),
    texts,
  };
}

interface RuleTotal {
  read: number;
  breaks: number;
  examples: {
    place: string;
    seed: string;
    kind: string;
    why: string;
    text: string;
  }[];
}

export interface BaselineFile {
  readonly about: string;
  readonly days: number;
  readonly draws: readonly Draw[];
  readonly rules: Readonly<
    Record<string, { read: number; breaks: number; per100: number }>
  >;
}

const rate = (row: { read: number; breaks: number }) =>
  row.read ? Math.round((row.breaks / row.read) * PER * 10) / 10 : 0;

function args(argv: readonly string[]) {
  const seeds: string[] = [];
  let draws = 0;
  let days = DEFAULT_DAYS;
  let report: string | undefined;
  let placeKey: string | undefined;
  let write = false;
  let check = false;
  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i];
    const next = () => argv[++i] ?? "";
    if (flag === "--seed") seeds.push(next());
    else if (flag === "--draws") draws = Number(next());
    else if (flag === "--days") days = Number(next());
    else if (flag === "--report") report = next();
    else if (flag === "--place-key") placeKey = next();
    else if (flag === "--write-baseline") write = true;
    else if (flag === "--check") check = true;
  }
  return { seeds, draws, days, report, placeKey, write, check };
}

async function main() {
  const options = args(process.argv.slice(2));
  const rules = (
    JSON.parse(
      readFileSync(path.join(ROOT, "data/english/line-rules.json"), "utf8"),
    ) as { rules: ComposedRuleRow[] }
  ).rules.filter((rule) => rule.test.kind === "composed");
  const committed = options.check
    ? (JSON.parse(readFileSync(BASELINE, "utf8")) as BaselineFile)
    : undefined;
  const draws: Draw[] = committed
    ? [...committed.draws]
    : [
        ...options.seeds.map((seed, at) =>
          drawFor(seed, at === 0 ? options.placeKey : undefined),
        ),
        ...Array.from({ length: options.draws }, () => drawFor(randomUUID())),
      ];
  if (!draws.length) draws.push(drawFor(randomUUID()));
  const days = committed?.days ?? options.days;
  const totals = new Map<string, RuleTotal>(
    rules.map((rule) => [rule.id, { read: 0, breaks: 0, examples: [] }]),
  );
  const out: string[] = [];
  const say = (line: string) => {
    out.push(line);
    process.stdout.write(`${line}\n`);
  };
  const kinds = new Map<string, number>();
  for (const draw of draws) {
    const started = Date.now();
    const sample = await playLife(draw, days);
    for (const text of sample.texts)
      kinds.set(text.kind, (kinds.get(text.kind) ?? 0) + 1);
    say(
      `${sample.place}, seed ${draw.seed} (place key ${draw.placeKey}): ${sample.texts.length} texts in ${days} days, ${Math.round((Date.now() - started) / 1000)} s`,
    );
    const textOf = new Map(sample.texts.map((text) => [text.id, text]));
    for (const count of runComposedRules(rules, sample)) {
      const total = totals.get(count.rule)!;
      total.read += count.read;
      total.breaks += count.breaks.length;
      for (const found of count.breaks as ComposedBreak[])
        if (total.examples.length < 3)
          total.examples.push({
            place: sample.place,
            seed: draw.seed,
            kind: textOf.get(found.textId)!.kind,
            why: found.why,
            text: found.quote,
          });
    }
    if (options.report)
      writeFileSync(
        `${options.report}.${draws.indexOf(draw)}.json`,
        JSON.stringify(sample, null, 1),
      );
  }
  say("");
  say(
    `Texts by kind: ${[...kinds].map(([kind, n]) => `${kind} ${n}`).join(", ")}`,
  );
  say("");
  say("| rule | texts read | breaks | per 100 | example |");
  say("| --- | --- | --- | --- | --- |");
  for (const [rule, total] of totals) {
    const first = total.examples[0];
    say(
      `| ${rule} | ${total.read} | ${total.breaks} | ${rate(total)} | ${first ? `${first.place}, seed ${first.seed.slice(0, 8)}, ${first.kind}: ${first.why}: "${first.text.replace(/\|/g, "/").slice(0, 160)}"` : ""} |`,
    );
  }
  say("");
  for (const [rule, total] of totals) {
    say(`## ${rule}: ${total.breaks} breaks in ${total.read} texts`);
    for (const example of total.examples)
      say(
        `- ${example.place}, seed ${example.seed}, ${example.kind}: ${example.why}: "${example.text}"`,
      );
  }
  if (options.report) writeFileSync(options.report, out.join("\n"));
  const fresh = Object.fromEntries(
    [...totals].map(([rule, total]) => [
      rule,
      { read: total.read, breaks: total.breaks, per100: rate(total) },
    ]),
  );
  if (options.write) {
    const file: BaselineFile = {
      about:
        "For each composed rule (data/english/line-rules.json, test kind composed): texts read, breaks and breaks per 100 texts over new lives played on these draws (npm run words:composed). A rule's rate may only fall: npm run words:composed -- --check replays these draws and fails when one rose. Write it again with --write-baseline on the same draws after a change that lowers a count, and quote the before and after in the pull request.",
      days,
      draws,
      rules: fresh,
    };
    writeFileSync(BASELINE, `${JSON.stringify(file, null, 2)}\n`);
    say(`Wrote ${path.relative(ROOT, BASELINE)}`);
  }
  if (committed) {
    const where = draws.map((d) => `${d.place} ${d.seed}`).join("; ");
    const failures = baselineFailures(committed.rules, fresh);
    for (const failure of failures) say(`${failure} (draws ${where})`);
    if (failures.length) process.exitCode = 1;
    else say("No composed rule's count rose.");
  }
}

if (import.meta.url === `file://${process.argv[1]}`) await main();
