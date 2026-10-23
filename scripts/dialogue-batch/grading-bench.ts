/**
 * The grading bench (Order 2 of docs/work-orders/words-and-director-2026-10-15.md,
 * owner Oct 15, 2026: "every word is a data point calibrating the entire
 * engine"). Development tooling; nothing here words anything.
 *
 *   OCD_STORAGE_OVERRIDE="cloud session, owner approved Oct 14" \
 *   npm run words:bench -- --id batch-12 --cache <world cache> --profiles 5 \
 *     [--max-per-type 3]
 *
 * It loads ONE played world from the coverage batch's `--cache` (the world
 * file written next to the cache, `<cache>.world`), draws no place and runs no
 * year. For every situation the director's own staging put on a watched
 * person's schedule it composes the scene with the same functions play calls
 * (`composeScene`, `openConversation`, `say`, `composeAddress`,
 * `composeJournal`), once per personality profile, records every line as a
 * data point and writes the page and the data.
 *
 * Nothing here is a scenario: a profile is a set of trait values
 * (`src/director/data/grading-profiles.json`) laid over the people in the
 * scene, and every word shown comes from the bank parts through the engine.
 */
import v8 from "node:v8";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { coreAPI, registerModule } from "../../src/core2/state";
import {
  moduleStateStores,
  type ModuleStateSnapshot,
} from "../../src/core2/module-state";
import type { CoreModule, CoreState } from "../../src/core2/types";
import type { Director } from "../../src/director/ledger";
import { mkdirSync } from "node:fs";
import {
  CONVERSATION_DATA,
  openConversation,
  say,
  type Conversation,
  type ConversationChoice,
} from "../../src/director/conversation";
import { composeScene } from "../../src/director/scene";
import { composeJournal } from "../../src/director/journal";
import {
  SITUATION_LIBRARY,
  type ScheduleEntry,
  type SceneBinding,
} from "../../src/director/scheduling";
import profilesFile from "../../src/director/data/grading-profiles.json" with { type: "json" };
import { sentenceCount, wordCount } from "../../src/english/calibration";
import { minedParts, slotValues } from "./mined-variants";
import { composeAddress } from "../../src/english/english-composition";
import type { GroundedEnglishPacket } from "../../src/english/grounded-english";
import { REGISTER_CARDS } from "../../src/english/speech-registers";
import { addressMoves } from "../english-corpus/address-bank";
import { corePlaceByJurisdictionId } from "../../src/core2/place-lookup";
import { spoken } from "../../src/director/words";
import { typeStatuses } from "./stage-world";

/* ------------------------------------------------------------- world cache */

/** What a module's tables look like, without the functions (indexes only). */
interface SavedModule {
  snapshot: ModuleStateSnapshot;
  indexes: Record<
    string,
    Record<string, { fields: string[]; unique?: boolean }>
  >;
}

/** The year-end world as the bench reads it: plain data, no functions. */
export interface SavedWorld {
  core: CoreState;
  ledger: Director["ledger"];
  modules: SavedModule[];
  playerId: string;
  placeName: string;
  seed: string;
}

/**
 * Saves the year-end core and the director's ledger with `node:v8`. The core
 * itself holds functions (module hooks, subscribers), which v8 cannot copy,
 * so those four registries are left out and each module's table rows are
 * saved as snapshots instead; `loadWorld` registers a table-only module for
 * each, which is all the composers read (`coreAPI(core).moduleState(id)`).
 */
export function saveWorld(
  path: string,
  core: CoreState,
  director: Pick<Director, "ledger">,
  info: { playerId: string; placeName: string; seed: string },
): number {
  const modules: SavedModule[] = [];
  for (const [id, store] of moduleStateStores(core)) {
    const definition = core.modules.get(id)?.state;
    modules.push({
      snapshot: store.snapshot(),
      indexes: Object.fromEntries(
        Object.entries(definition?.tables ?? {}).map(([name, table]) => [
          name,
          JSON.parse(JSON.stringify(table.indexes ?? {})),
        ]),
      ),
    });
  }
  const stripped = {
    ...core,
    modules: new Map(),
    reasonProviders: new Map(),
    eventSubscribers: new Map(),
    eventSubscribersByKind: new Map(),
    eventAppraisalSubscribers: new Map(),
    eventAppraisalSubscribersByKind: new Map(),
    relationshipSubscribers: new Map(),
    relationshipSubscribersByKind: new Map(),
    cashJournal: { ...core.cashJournal, sourceProviders: new Map() },
  } as unknown as CoreState;
  const saved: SavedWorld = {
    core: stripped,
    ledger: director.ledger,
    modules,
    ...info,
  };
  const bytes = v8.serialize(saved);
  writeFileSync(path, bytes);
  return bytes.length;
}

/** Loads a saved world: the core with a table-only module registered for each saved engine. */
export function loadWorld(path: string): SavedWorld & { director: Director } {
  const saved = v8.deserialize(readFileSync(path)) as SavedWorld;
  const core = saved.core;
  for (const row of saved.modules) {
    const id = row.snapshot.moduleId;
    registerModule(core, {
      id,
      state: {
        schemaVersion: row.snapshot.schemaVersion,
        tables: Object.fromEntries(
          Object.keys(row.snapshot.tables).map((name) => [
            name,
            { indexes: row.indexes[name] ?? {} },
          ]),
        ),
      },
    } as CoreModule);
  }
  // The year's own talks left "last talk" memories behind; a scene is composed
  // as if nobody had talked yet, so they are cleared.
  for (const known of core.knowledgeByPerson.values())
    for (const key of [...known.keys()])
      if (key.startsWith("talk:")) known.delete(key);
  // Rows go in once every module is registered.
  const api = coreAPI(core);
  for (const row of saved.modules)
    api.moduleState(row.snapshot.moduleId).restore(row.snapshot);
  return {
    ...saved,
    director: { ledger: saved.ledger } as unknown as Director,
  };
}

export const worldCachePath = (cache: string) => `${cache}.world`;
export const hasWorld = (cache: string) => existsSync(worldCachePath(cache));

/* ============================================================== the bench */

/** Trait levels as the game stores them: `personality-v1:facet-warm` to -2..2. */
export type TraitLevels = Readonly<Record<string, number>>;

export interface GradingProfile {
  id: string;
  why?: string;
  traits: TraitLevels;
}

export interface LineRow {
  /** Its number in the item, from 1; a grade names it. */
  n: number;
  /** The talk turn it belongs to (0 is the narration and the opening). */
  turn: number;
  role: "narrator" | "speaker" | "reply" | "lie" | "speech" | "journal";
  speaker: string;
  text: string;
  move: string;
  previousMove?: string;
  register: string;
  bearing?: string;
  key: string;
  endpoint: string;
  speakerTraits: TraitLevels;
  lie: boolean;
  words: number;
  sentences: number;
  parts: string[];
  slotRecordIds: string[];
}

export interface BenchItem {
  i: number;
  sceneId: string;
  typeKey: string;
  key: string;
  endpoint: string;
  profileId: string;
  causeRecordId: string;
  momentId: string;
  date: string;
  setting: { kind: string; recordId: string };
  castIds: string[];
  /** Every line of the item in the order shown. */
  lines: LineRow[];
}

/* ------------------------------------------------------- dedupe and variety */

export type DropRule =
  | "identical-profile"
  | "duplicate-item"
  | "same-choice-set"
  | "type-cap"
  | "repeated-phrase";

export const DROP_RULES: readonly DropRule[] = [
  "identical-profile",
  "duplicate-item",
  "same-choice-set",
  "type-cap",
  "repeated-phrase",
];

/** What the section 2 rules read of an item. */
export interface DedupeItem {
  sceneId: string;
  typeKey: string;
  castIds: readonly string[];
  profileId: string;
  /** Every piece id used in the item's lines. */
  pieces: readonly string[];
  /** Each turn's offered replies (the four, then the lies), joined. */
  choiceSets: readonly string[];
  /** Every line shown that the "once per page" rule counts. */
  phrases: readonly string[];
  register: string;
}

const normal = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/**
 * Section 2 of the order, exactly, in this order for each item (items come
 * scene by scene, profiles in order within a scene):
 *  1. a profile whose pieces equal an earlier profile's on the same scene
 *     is dropped (it reads identically);
 *  2. no two items share (situation type, cast, pieces used);
 *  3. no two items share the same four replies;
 *  4. a situation type appears at most `maxPerType` times per profile;
 *  5. a phrase is graded once per page: a line said in an earlier scene is
 *     shown as graded above, and an item that adds no new line is dropped.
 */
export function dedupe<T extends DedupeItem>(
  items: readonly T[],
  maxPerType: number,
  phraseOnce = true,
): {
  kept: T[];
  dropped: Record<DropRule, number>;
  log: { rule: DropRule; item: T }[];
  /** Each kept item's phrases already graded in an earlier scene. */
  repeats: Map<T, Set<string>>;
} {
  const dropped = Object.fromEntries(DROP_RULES.map((r) => [r, 0])) as Record<
    DropRule,
    number
  >;
  const log: { rule: DropRule; item: T }[] = [];
  const kept: T[] = [];
  const sceneSignatures = new Set<string>();
  const identity = new Set<string>();
  const choiceSets = new Set<string>();
  const perType = new Map<string, number>();
  // A phrase is shown once per page; profiles of one scene may share a line,
  // since comparing them is what the scene is for.
  const phrases = new Map<string, string>();
  const repeats = new Map<T, Set<string>>();
  for (const item of items) {
    const pieces = [...new Set(item.pieces)].sort().join("|");
    const sceneSignature = `${item.sceneId}#${pieces}`;
    const drop = (rule: DropRule) => {
      dropped[rule] += 1;
      log.push({ rule, item });
    };
    if (sceneSignatures.has(sceneSignature)) {
      drop("identical-profile");
      continue;
    }
    sceneSignatures.add(sceneSignature);
    const who = `${item.typeKey}#${[...item.castIds].sort().join(",")}#${pieces}`;
    if (identity.has(who)) {
      drop("duplicate-item");
      continue;
    }
    if (item.choiceSets.some((set) => choiceSets.has(set))) {
      drop("same-choice-set");
      continue;
    }
    const capKey = `${item.profileId}#${item.typeKey}`;
    if ((perType.get(capKey) ?? 0) >= maxPerType) {
      drop("type-cap");
      continue;
    }
    perType.set(capKey, (perType.get(capKey) ?? 0) + 1);
    const said = item.phrases.map(normal).filter(Boolean);
    // A phrase is graded once (Order 2, section 2): one already graded in
    // another scene is shown as graded above, and an item with no line of
    // its own to grade adds no data point and is dropped.
    const seen = said.filter((phrase) => {
      const where = phrases.get(phrase);
      return where !== undefined && where !== item.sceneId;
    });
    if (phraseOnce && said.length && seen.length === said.length) {
      perType.set(capKey, (perType.get(capKey) ?? 1) - 1);
      drop("repeated-phrase");
      continue;
    }
    if (seen.length) repeats.set(item, new Set(seen));
    identity.add(who);
    for (const set of item.choiceSets) choiceSets.add(set);
    for (const phrase of said)
      if (!phrases.has(phrase)) phrases.set(phrase, item.sceneId);
    kept.push(item);
  }
  return { kept, dropped, log, repeats };
}

/** Orders the page so adjacent items differ in situation type and in register, where the items allow. */
export function orderForPage<
  T extends Pick<DedupeItem, "typeKey" | "register">,
>(items: readonly T[]): T[] {
  const left = [...items];
  const out: T[] = [];
  while (left.length) {
    const last = out.at(-1);
    let at = left.findIndex(
      (row) =>
        !last ||
        (row.typeKey !== last.typeKey && row.register !== last.register),
    );
    if (at < 0)
      at = left.findIndex((row) => !last || row.typeKey !== last.typeKey);
    if (at < 0) at = 0;
    out.push(...left.splice(at, 1));
  }
  return out;
}

/* ------------------------------------------------------------------ helpers */

const MONTHS =
  "January|February|March|April|May|June|July|August|September|October|November|December";
/** A date in speech (owner, Oct 15: nobody says a date). */
export const DATE_IN_SPEECH = new RegExp(
  `\\b(?:${MONTHS})\\b(?:\\s+\\d{1,2})?|\\b(?:19|20)\\d{2}\\b`,
);
/** A bare acknowledgment is not a reply that continues the talk (section 7.3). */
export const BARE_ACK =
  /^(?:all right|alright|okay|ok|sure|yes|no|fine)[.!]?$/i;
/** A record id that reached a line instead of a name. */
export const RAW_ID = /\b[a-z]+_[0-9a-f]{12,}\b/;

const PARTS = minedParts();
const PART_LIST = [...PARTS.values()].sort(
  (a, b) => b.text.length - a.text.length,
);

/** The bank part (by key) that said a line of text in one bank, found by its slots. */
export function piecesOfText(text: string, bank: string): string[] {
  const hit = PART_LIST.find(
    (part) => part.bank === bank && slotValues(part, text) !== null,
  );
  return hit ? [hit.key] : [];
}

const info = (key: string) => {
  const part = PARTS.get(key) as
    | (ReturnType<typeof PARTS.get> & { tag?: { move?: string; key?: string } })
    | undefined;
  return part
    ? { bank: part.bank, move: part.tag?.move ?? part.move }
    : undefined;
};

/** Lays a profile's trait values over a person for one call, then puts theirs back. */
export function withTraits<T>(
  core: CoreState,
  personId: string,
  laid: TraitLevels,
  run: () => T,
): T {
  const person = core.people.get(personId) as unknown as
    { traits: TraitLevels } | undefined;
  if (!person) return run();
  const original = person.traits;
  person.traits = { ...original, ...laid };
  try {
    return run();
  } finally {
    person.traits = original;
  }
}

const option = (args: string[], name: string, fallback: string) => {
  const at = args.indexOf(`--${name}`);
  return at >= 0 && args[at + 1] !== undefined ? args[at + 1]! : fallback;
};

/* ----------------------------------------------------------------- the run */

export interface Skipped {
  what: string;
  reason: string;
}

/** The situation settings and kinds held until something new is said in them (section 7.10). */
const HELD_SETTINGS = new Set(["school", "workplace"]);
const HELD_TYPES = new Set(["public-hearing"]);

const MAX_TURNS_SHOWN = 3;

/** The profiles the bench lays over a scene's people, in file order. */
export const GRADING_PROFILES: readonly GradingProfile[] = (
  profilesFile as { profiles: GradingProfile[] }
).profiles;

/** What the bench composed from one cached world, before the page rules. */
export interface BenchRun {
  /** Every scene composed once per profile, in staged order. */
  items: (BenchItem & DedupeItem)[];
  /** The entries the director's staging put on a schedule, one per binding. */
  staged: number;
  stagedByType: Map<string, number>;
  skipped: Skipped[];
  standIn: string[];
  /** The world as first loaded; profile 0 is composed on it. */
  first: ReturnType<typeof loadWorld>;
}

export function runBench(args: string[]): number {
  const id = option(args, "id", "batch-12");
  const cache = option(args, "cache", "");
  const profileCount = Number(option(args, "profiles", "5"));
  const maxPerType = Number(option(args, "max-per-type", "3"));
  // `--phrase-once off` shows how many items the "a phrase appears once per
  // page" rule costs; it is on by default.
  const phraseOnce = option(args, "phrase-once", "on") !== "off";
  if (!cache || !hasWorld(cache)) {
    console.error(
      `No cached world at ${cache ? worldCachePath(cache) : "(no --cache given)"}. Build it once with: npm run dialogue:coverage -- --id ${id} --seed ${id} --days 365 --cache <file>`,
    );
    return 1;
  }
  const profiles = GRADING_PROFILES.slice(0, profileCount);
  const {
    items: all,
    staged,
    stagedByType: typesSeen,
    skipped,
    standIn,
    first,
  } = composeBench(worldCachePath(cache), profiles);

  const deduped = dedupe(all, maxPerType, phraseOnce);
  // A scene is shown once, with its narration; each profile's talk follows
  // as that scene's items. Scenes are ordered so neighbors differ.
  const byScene = new Map<string, (BenchItem & DedupeItem)[]>();
  for (const item of deduped.kept)
    byScene.set(item.sceneId, [...(byScene.get(item.sceneId) ?? []), item]);
  const kept = orderForPage(
    [...byScene.values()].map((list) => ({
      typeKey: list[0]!.typeKey,
      register: list[0]!.register,
      list,
    })),
  )
    .flatMap((scene) => scene.list)
    .map((item, at) => ({ ...item, i: at }));
  const stagedByType = Object.fromEntries(
    [...typesSeen.entries()].sort(([a], [b]) => a.localeCompare(b)),
  );
  writeOutputs({
    stagedByType,
    id,
    cache,
    profiles,
    kept,
    dropped: deduped.dropped,
    repeats: deduped.repeats,
    skipped,
    standIn,
    maxPerType,
    staged,
    loaded: first,
  });
  console.log(
    `${kept.length} items from ${staged} staged scenes x ${profiles.length} profiles; dropped ${JSON.stringify(deduped.dropped)}; skipped ${skipped.length} situations`,
  );
  return 0;
}

/**
 * Composes every scene the director staged in one saved world once per
 * profile, with the functions play calls. Each profile after the first gets a
 * fresh load, because talking records events on the core.
 */
export function composeBench(
  path: string,
  profiles: readonly GradingProfile[],
): BenchRun {
  const library = SITUATION_LIBRARY as unknown as {
    types: {
      key: string;
      setting: string[];
      causes: { awaitingProducer?: string; match?: Record<string, string> }[];
      awaiting?: string[];
      roles: { key: string; bearing?: string }[];
      tag: { key: string; endpoint: string; registers: string[] };
    }[];
  };
  const typeOf = new Map(library.types.map((type) => [type.key, type]));
  const skipped: Skipped[] = [];
  const standIn: string[] = [];
  const all: (BenchItem & DedupeItem)[] = [];

  // The staged entries come from the first load; each profile gets a fresh
  // load, because talking records events on the core.
  const first = loadWorld(path);
  // One staged scene for each situation type the moment's records bound.
  const staged: {
    personId: string;
    entry: ScheduleEntry;
    binding: SceneBinding;
  }[] = [];
  const typesSeen = new Map<string, number>();
  for (const [personId, book] of first.director.ledger.people)
    for (const entry of book.schedule) {
      for (const binding of entry.bindings) {
        typesSeen.set(
          binding.typeKey,
          (typesSeen.get(binding.typeKey) ?? 0) + 1,
        );
        staged.push({ personId, entry, binding });
      }
    }
  staged.sort(
    (a, b) =>
      a.entry.date.localeCompare(b.entry.date) ||
      a.entry.momentId.localeCompare(b.entry.momentId),
  );
  for (const row of typeStatuses(
    library.types as unknown as Parameters<typeof typeStatuses>[0],
    [...typesSeen.keys()].map((typeKey) => ({ typeKey })),
  ))
    if (row.skipped) skipped.push({ what: row.key, reason: row.skipped });

  profiles.forEach((profile, profileAt) => {
    const world = profileAt === 0 ? first : loadWorld(path);
    const { core, director } = world;
    const nameOf = (personId: string) => {
      const row = core.people.get(personId);
      return row ? `${row.givenName} ${row.familyName}` : personId;
    };
    const journals = new Map<string, ReturnType<typeof composeJournal>>();
    for (const { personId, entry: whole, binding } of staged) {
      // The director's composeScene reads the first binding: hand it this one.
      const entry = { ...whole, bindings: [binding] };
      const type = typeOf.get(binding.typeKey)!;
      const moment = director.ledger.people
        .get(personId)
        ?.momentsById.get(entry.momentId);
      if (!moment) continue;
      const sceneId = `${personId}:${entry.momentId}:${binding.typeKey}`;
      const hold =
        HELD_SETTINGS.has(binding.setting.kind) || HELD_TYPES.has(type.key)
          ? `held until something new is said in it (${binding.setting.kind} scene, owner Oct 15)`
          : undefined;
      if (hold) {
        if (profileAt === 0)
          skipped.push({ what: `${type.key} ${sceneId}`, reason: hold });
        continue;
      }
      try {
        const items = withTraits(core, personId, profile.traits, () =>
          composeSceneItems({
            core,
            director,
            personId,
            entry,
            binding,
            type,
            moment,
            sceneId,
            profile,
            nameOf,
            journals,
            standIn,
            skipped,
          }),
        );
        all.push(...items);
      } catch (error) {
        if (profileAt === 0)
          skipped.push({
            what: `${type.key} ${sceneId}`,
            reason: `composition stopped: ${error instanceof Error ? error.message : String(error)}`,
          });
      }
    }
  });
  return {
    items: all,
    staged: staged.length,
    stagedByType: typesSeen,
    skipped,
    standIn,
    first,
  };
}

interface SceneContext {
  core: CoreState;
  director: Director;
  personId: string;
  entry: ScheduleEntry;
  binding: SceneBinding;
  type: {
    key: string;
    roles: { key: string; bearing?: string }[];
    tag: { key: string; endpoint: string; registers: string[] };
  };
  moment: {
    id: string;
    causeId: string;
    label: string;
    counterpartIds: string[];
    date: string;
  };
  sceneId: string;
  profile: GradingProfile;
  nameOf: (id: string) => string;
  journals: Map<string, ReturnType<typeof composeJournal>>;
  standIn: string[];
  skipped: Skipped[];
}

/**
 * A scene is composed on its own day, as play does: the cached world is the
 * year's end, and the talk reads "lately" from the core's date, so the date is
 * set to the moment's for the call and put back.
 */
function composeSceneItems(ctx: SceneContext): (BenchItem & DedupeItem)[] {
  const core = ctx.core as { date: string };
  const year = core.date;
  core.date = ctx.moment.date;
  try {
    return composeSceneItemsAt(ctx);
  } finally {
    core.date = year;
  }
}

const profileDependent = (line: LineRow) =>
  line.role !== "narrator" && line.role !== "journal";

function composeSceneItemsAt(ctx: SceneContext): (BenchItem & DedupeItem)[] {
  const { core, director, personId, entry, binding, type, moment, profile } =
    ctx;
  const scene = composeScene(core, director, personId, entry);
  if (!scene) throw new Error("the director staged no scene");
  const bearingOf = (id: string) =>
    binding.roles.find((row) => row.personIds.includes(id))?.bearing ??
    binding.roles.find((row) => row.role === binding.opener)?.bearing ??
    type.roles[0]?.bearing;
  const lines: LineRow[] = [];
  const choiceSets: string[] = [];
  const row = (
    partial: Pick<
      LineRow,
      "role" | "speaker" | "text" | "parts" | "slotRecordIds"
    > &
      Partial<LineRow>,
    speakerId: string,
    turn: number,
  ): LineRow => {
    const first = partial.parts[0] ? info(partial.parts[0]) : undefined;
    const previous = lines.filter((l) => l.role !== "narrator").at(-1)?.move;
    const made = {
      n: lines.length + 1,
      turn,
      key: type.tag.key,
      endpoint: type.tag.endpoint,
      speakerTraits: profile.traits,
      lie: partial.role === "lie",
      move: first?.move ?? partial.move ?? "unknown",
      register: first?.bank ?? partial.register ?? "conversation",
      bearing: bearingOf(speakerId),
      ...(previous ? { previousMove: previous } : {}),
      words: wordCount(partial.text),
      sentences: sentenceCount(partial.text),
      ...partial,
    } as LineRow;
    lines.push(made);
    return made;
  };
  for (const line of scene.narration)
    row(
      {
        role: "narrator",
        speaker: "Narrator",
        text: line.text,
        parts: piecesOfText(line.text, "scene-words"),
        slotRecordIds: [...line.sourceRecordIds],
        register: "scene-words",
        move: "narrate",
      },
      personId,
      0,
    );
  const talkTo = scene.talkToId;
  let talkLines: (() => Conversation["lines"]) | undefined;
  let talkSaid = () => 0;
  if (lines.some((l) => RAW_ID.test(l.text))) {
    ctx.standIn.push(
      `${type.key} ${ctx.sceneId}: the narration names a record id`,
    );
    return [];
  }
  if (talkTo) {
    const talk = withTraits(core, talkTo, profile.traits, () =>
      openConversation(core, personId, talkTo, {
        presentIds: scene.presentIds,
        director,
        occasionId: entry.momentId,
      }),
    );
    let said = 0;
    talkLines = () => talk.lines;
    talkSaid = () => said;
    for (
      let turn = 0;
      turn < MAX_TURNS_SHOWN && talk.choices.length;
      turn += 1
    ) {
      for (const line of talk.lines.slice(said))
        row(
          {
            role: "speaker",
            speaker: ctx.nameOf(line.speakerId),
            text: line.text,
            move: line.kind,
            parts: [...(line.wording?.parts ?? [])],
            slotRecordIds: [...line.sourceRecordIds],
          },
          line.speakerId,
          turn,
        );
      said = talk.lines.length;
      // A bare acknowledgment does not continue the talk (section 7.3).
      const replies = talk.choices.filter(
        (choice) => !BARE_ACK.test(choice.text.trim()),
      );
      const offered = [
        ...replies.map((c) => [c, false] as const),
        ...talk.lies.map((c) => [c, true] as const),
      ];
      for (const [choice, lie] of offered)
        row(
          {
            role: lie ? "lie" : "reply",
            speaker: ctx.nameOf(personId),
            text: choice.text,
            move: choice.move,
            parts: [
              ...(choice.wording?.parts ?? []),
              ...(choice.tail?.parts ?? []),
            ],
            slotRecordIds: [...choice.sourceRecordIds],
          },
          personId,
          turn,
        );
      if (replies.length >= 2)
        choiceSets.push(offered.map(([c]) => c.text).join(" / "));
      // The player asks for more when a reply does, else takes the first.
      const kind = talk.lines.at(-1)?.kind ?? "";
      const asks = CONVERSATION_DATA.tells?.[kind] ?? {};
      const pick: ConversationChoice =
        replies.find((choice) => asks[choice.move]) ??
        replies[0] ??
        talk.choices[0]!;
      withTraits(core, personId, profile.traits, () =>
        withTraits(core, talkTo, profile.traits, () =>
          say(core, talk as Conversation, pick.key),
        ),
      );
    }
  }
  // A speech, where the situation has one: the same composeAddress play calls,
  // over the speaker's own record facts. A register the facts cannot word is
  // listed, never invented.
  for (const reg of type.tag.registers.filter((r) =>
    r.startsWith("address/"),
  )) {
    const register = reg.slice("address/".length);
    const note = (why: string) => {
      const what = `${type.key} speech ${register}`;
      if (!ctx.skipped.some((row) => row.what === what))
        ctx.skipped.push({ what, reason: why });
    };
    try {
      const card = addressMoves(register);
      if (REGISTER_CARDS[card.register].setting !== "public-address") continue;
      const who = core.people.get(personId)!;
      const town = corePlaceByJurisdictionId(who.placeId as never);
      const facts: Record<string, { text: string; sourceRecordIds: string[] }> =
        {
          name: { text: ctx.nameOf(personId), sourceRecordIds: [personId] },
          ...(town
            ? {
                place: {
                  text: spoken(town),
                  sourceRecordIds: [who.householdId],
                },
              }
            : {}),
        };
      const packet = {
        surface: "dialogue",
        momentKey: `${ctx.sceneId}:${register}`,
        worldSeed: core.seed,
        bankVersion: "words-address-v1",
        stage: "default",
        sourceRecordIds: [moment.causeId],
        facts,
        speaker: { personId, traits: {} },
        knowledge: Object.entries(facts).map(([factKey, fact]) => ({
          personId,
          factKey,
          sourceRecordIds: fact.sourceRecordIds,
        })),
      } as unknown as GroundedEnglishPacket;
      const composed = composeAddress(packet, card.register, card.moves, {
        speakerTraits: profile.traits,
      });
      if (composed.kind !== "rendered") {
        note(
          `composeAddress could not word it from the records: ${composed.reasons.slice(0, 2).join("; ")}`,
        );
        continue;
      }
      for (const move of composed.moves)
        row(
          {
            role: "speech",
            speaker: ctx.nameOf(personId),
            text: move.text,
            move: move.move.replace(/^\d+-/, ""),
            parts: move.parts.map((part) => part.variantKey),
            slotRecordIds: [...composed.sourceRecordIds],
            register: "address",
          },
          personId,
          97,
        );
    } catch (error) {
      note(
        `composeAddress stopped: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
  // What the other person said last, when the talk ended with no reply to offer.
  if (talkTo && talkLines)
    for (const line of talkLines().slice(talkSaid()))
      row(
        {
          role: "speaker",
          speaker: ctx.nameOf(line.speakerId),
          text: line.text,
          move: line.kind,
          parts: [...(line.wording?.parts ?? [])],
          slotRecordIds: [...line.sourceRecordIds],
        },
        line.speakerId,
        99 - 1,
      );
  // The journal line of the moment, once the scene has played.
  if (!ctx.journals.has(personId))
    ctx.journals.set(personId, composeJournal(core, director, personId));
  const journalLine = ctx.journals
    .get(personId)!
    .flatMap((chapter) => chapter.lines)
    .find((line) => line.momentIds.includes(entry.momentId));
  if (journalLine)
    row(
      {
        role: "journal",
        speaker: ctx.nameOf(personId),
        text: journalLine.text,
        parts: piecesOfText(journalLine.text, "journal"),
        slotRecordIds: [...journalLine.sourceRecordIds],
        register: "journal",
      },
      personId,
      99,
    );
  const said = lines.filter(
    (l) => l.role !== "narrator" && l.role !== "journal",
  );
  if (said.some((l) => RAW_ID.test(l.text))) {
    ctx.standIn.push(`${type.key} ${ctx.sceneId}: a line names a record id`);
    return [];
  }
  if (said.some((l) => DATE_IN_SPEECH.test(l.text))) {
    ctx.standIn.push(
      `${type.key} ${ctx.sceneId}: a line says a date (nobody says a date)`,
    );
    return [];
  }
  return [
    {
      i: -1,
      sceneId: ctx.sceneId,
      typeKey: type.key,
      key: type.tag.key,
      endpoint: type.tag.endpoint,
      profileId: profile.id,
      causeRecordId: moment.causeId,
      momentId: moment.id,
      date: moment.date,
      setting: binding.setting,
      // The people the scene names: whose scene it is, who opens it and the
      // moment's counterparts, never everyone the records bound to it.
      castIds: [
        personId,
        ...(talkTo ? [talkTo] : []),
        ...moment.counterpartIds,
      ].filter((id, at, all) => all.indexOf(id) === at),
      lines,
      // The narration and the journal line belong to the scene and read the
      // same for every profile; the rules count the profile's own lines.
      pieces: lines.filter(profileDependent).flatMap((line) => line.parts),
      choiceSets,
      phrases: lines.filter(profileDependent).map((l) => l.text),
      register:
        lines.find((l) => l.role !== "narrator")?.register ?? "scene-words",
    },
  ];
}

/* ------------------------------------------------------------------ outputs */

function writeOutputs(input: {
  stagedByType: Record<string, number>;
  id: string;
  cache: string;
  profiles: GradingProfile[];
  kept: (BenchItem & DedupeItem)[];
  repeats: Map<BenchItem & DedupeItem, Set<string>>;
  dropped: Record<DropRule, number>;
  skipped: Skipped[];
  standIn: string[];
  maxPerType: number;
  staged: number;
  loaded: SavedWorld;
}): void {
  const { id, kept, profiles } = input;
  const json = {
    id,
    title: `Grading bench ${id}`,
    place: input.loaded.placeName,
    seed: input.loaded.seed,
    profiles: profiles.map((p) => ({ id: p.id, traits: p.traits })),
    maxPerType: input.maxPerType,
    stagedScenes: input.staged,
    stagedByType: input.stagedByType,
    dropped: input.dropped,
    skipped: input.skipped,
    stoodIn: input.standIn,
    items: kept.map((item) => ({
      i: item.i,
      sceneId: item.sceneId,
      situationType: item.typeKey,
      key: item.key,
      endpoint: item.endpoint,
      profile: item.profileId,
      causeRecordId: item.causeRecordId,
      momentId: item.momentId,
      castRecordIds: item.castIds,
      parts: [...new Set(item.pieces)],
      lines: item.lines,
    })),
  };
  mkdirSync("data/english/batches", { recursive: true });
  writeFileSync(
    `data/english/batches/${id}.json`,
    `${JSON.stringify(json, null, 2)}\n`,
  );

  // A line graded in an earlier scene is marked, so it is graded once.
  const graded = (item: BenchItem & DedupeItem, text: string) =>
    input.repeats.get(item)?.has(normal(text)) ? " *(graded above)*" : "";
  const out: string[] = [];
  out.push(`# Grading bench ${id}`, "");
  out.push(
    `One cached world (${input.loaded.placeName}, seed ${input.loaded.seed}), ${input.staged} scenes the director staged from records, composed once per profile (${profiles.map((p) => p.id).join(", ")}) by the same functions play calls. ${kept.length} items. Grade each line 1 to 5 on naturalness, prose, sentence structure, length (too short, right, too long), creativity, trait fit and, for lies, plausibility.`,
    "",
    "## Dropped items (section 2 rules)",
    "",
  );
  for (const rule of DROP_RULES) out.push(`- ${rule}: ${input.dropped[rule]}`);
  out.push(
    "",
    `Scenes the director staged from records, by situation type: ${
      Object.entries(input.stagedByType)
        .map(([type, count]) => `${type} ${count}`)
        .join(", ") || "none"
    }.`,
  );
  out.push("", "## Situations skipped, with why", "");
  for (const row of input.skipped) out.push(`- ${row.what}: ${row.reason}`);
  out.push("", "## Facts that were stood in", "");
  if (input.standIn.length)
    for (const row of input.standIn) out.push(`- ${row}`);
  else out.push("- None: no scene's speaker or body resolved to a raw id.");
  out.push("");
  for (const item of kept) {
    const narrator = item.lines.filter((l) => l.role === "narrator");
    out.push(
      `## Item ${item.i}: ${item.typeKey} (${item.key}, ends in ${item.endpoint}), profile ${item.profileId}`,
      "",
      `*Fired by ${item.causeRecordId}. Cast: ${item.castIds.join(", ")}.*`,
      "",
    );
    const firstOfScene =
      kept.find((row) => row.sceneId === item.sceneId) === item;
    if (firstOfScene && narrator.length)
      out.push(`> ${narrator.map((l) => l.text).join(" ")}`, "");
    else if (!firstOfScene)
      out.push("*The same scene as above, with this profile's talk.*", "");
    const turns = [...new Set(item.lines.map((l) => l.turn))]
      .filter((t) => t < 99)
      .sort((a, b) => a - b);
    for (const turn of turns) {
      const here = item.lines.filter((l) => l.turn === turn);
      for (const l of here.filter(
        (x) => x.role === "speaker" || x.role === "speech",
      ))
        out.push(`**${l.speaker}:** ${l.text}${graded(item, l.text)}`, "");
      const picked = here.filter((x) => x.role === "reply");
      const lies = here.filter((x) => x.role === "lie");
      if (picked.length) {
        out.push("Replies:", "");
        picked.forEach((l, at) =>
          out.push(`${at + 1}. ${l.text}${graded(item, l.text)}`),
        );
        out.push("");
      }
      if (lies.length) {
        out.push("Lies:", "");
        lies.forEach((l, at) =>
          out.push(`${picked.length + at + 1}. ${l.text}`),
        );
        out.push("");
      }
    }
    for (const l of item.lines.filter((x) => x.role === "journal"))
      out.push(`*Journal:* ${l.text}`, "");
    out.push(
      `<sub>${item.lines
        .map(
          (l) =>
            `L${l.n} t${l.turn} ${l.role}/${l.move}/${l.register}/${l.bearing ?? "none"}/${l.words}w${l.sentences}s [${l.parts.join(", ") || "no piece"}]`,
        )
        .join("; ")}</sub>`,
      "",
    );
  }
  mkdirSync("docs/grading", { recursive: true });
  writeFileSync(`docs/grading/words-${id}.md`, `${out.join("\n")}\n`);
}

/**
 * The scenes the director fires in the cached year, composed for one profile by
 * the same functions play calls, a few candidates per situation type in date
 * order (the page picks one of each type). Nothing is staged by hand: each comes
 * from a schedule entry whose cause record matched a situation type.
 */
export function directorScenes(
  cache: string,
  profile: GradingProfile,
  perType = 4,
): {
  typeKey: string;
  sceneId: string;
  causeRecordId: string;
  item: BenchItem & DedupeItem;
}[] {
  const world = loadWorld(worldCachePath(cache));
  const { core, director } = world;
  const library = SITUATION_LIBRARY as unknown as {
    types: {
      key: string;
      roles: { key: string; bearing?: string }[];
      tag: { key: string; endpoint: string; registers: string[] };
    }[];
  };
  const typeOf = new Map(library.types.map((type) => [type.key, type]));
  const nameOf = (personId: string) => {
    const row = core.people.get(personId);
    return row ? `${row.givenName} ${row.familyName}` : personId;
  };
  const staged: {
    personId: string;
    entry: ScheduleEntry;
    binding: SceneBinding;
  }[] = [];
  for (const [personId, book] of director.ledger.people)
    for (const entry of book.schedule)
      for (const binding of entry.bindings)
        staged.push({ personId, entry, binding });
  staged.sort(
    (a, b) =>
      a.entry.date.localeCompare(b.entry.date) ||
      a.entry.momentId.localeCompare(b.entry.momentId),
  );
  const out: ReturnType<typeof directorScenes> = [];
  const taken = new Map<string, number>();
  const journals = new Map<string, ReturnType<typeof composeJournal>>();
  for (const { personId, entry: whole, binding } of staged) {
    const type = typeOf.get(binding.typeKey);
    if (!type) continue;
    if ((taken.get(type.key) ?? 0) >= perType) continue;
    if (HELD_SETTINGS.has(binding.setting.kind) || HELD_TYPES.has(type.key))
      continue;
    const entry = { ...whole, bindings: [binding] };
    const moment = director.ledger.people
      .get(personId)
      ?.momentsById.get(entry.momentId);
    if (!moment) continue;
    const sceneId = `${personId}:${entry.momentId}:${binding.typeKey}`;
    try {
      const items = withTraits(core, personId, profile.traits, () =>
        composeSceneItems({
          core,
          director,
          personId,
          entry,
          binding,
          type,
          moment,
          sceneId,
          profile,
          nameOf,
          journals,
          standIn: [],
          skipped: [],
        }),
      );
      for (const item of items) {
        taken.set(type.key, (taken.get(type.key) ?? 0) + 1);
        out.push({
          typeKey: type.key,
          sceneId,
          causeRecordId: moment.causeId,
          item,
        });
      }
    } catch {
      // A scene the engine cannot compose is not shown.
    }
  }
  return out;
}

/**
 * The situations the director fires in the cached year, one for each situation
 * type, with the person whose schedule it is and who opens the scene
 * (`composeScene`'s `talkToId`): what a generic, key-based exchange needs.
 */
export function directorStaged(cache: string): {
  typeKey: string;
  personId: string;
  talkToId?: string;
  momentId: string;
  causeId: string;
  label: string;
  date: string;
  counterpartIds: string[];
}[] {
  const world = loadWorld(worldCachePath(cache));
  const { core, director } = world;
  const rows: ReturnType<typeof directorStaged> = [];
  const seen = new Set<string>();
  const staged: {
    personId: string;
    entry: ScheduleEntry;
    binding: SceneBinding;
  }[] = [];
  for (const [personId, book] of director.ledger.people)
    for (const entry of book.schedule)
      for (const binding of entry.bindings)
        staged.push({ personId, entry, binding });
  staged.sort(
    (a, b) =>
      a.entry.date.localeCompare(b.entry.date) ||
      a.entry.momentId.localeCompare(b.entry.momentId),
  );
  for (const { personId, entry: whole, binding } of staged) {
    if (seen.has(binding.typeKey)) continue;
    const entry = { ...whole, bindings: [binding] };
    const moment = director.ledger.people
      .get(personId)
      ?.momentsById.get(entry.momentId);
    if (!moment) continue;
    const year = core.date;
    (core as { date: string }).date = moment.date;
    try {
      const scene = composeScene(core, director, personId, entry);
      if (!scene) continue;
      seen.add(binding.typeKey);
      rows.push({
        typeKey: binding.typeKey,
        personId,
        ...(scene.talkToId ? { talkToId: scene.talkToId } : {}),
        momentId: moment.id,
        causeId: moment.causeId,
        label: moment.label,
        date: moment.date,
        counterpartIds: [...moment.counterpartIds],
      });
    } catch {
      // A scene the director cannot compose is not listed.
    } finally {
      (core as { date: string }).date = year;
    }
  }
  return rows;
}

if (process.argv[1]?.endsWith("grading-bench.ts"))
  process.exitCode = runBench(process.argv.slice(2));
