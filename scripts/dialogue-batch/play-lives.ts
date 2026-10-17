/**
 * Plays seeded lives through the played world and records every conversation,
 * for the dialogue report and the multi-axis grading batch. Development
 * tooling; shipped play never imports it.
 *
 * Each life: a place drawn from all 56 by the seed `${seed}:${life}`, the
 * played world built as the bench builds it (`buildBenchWorld`, two-level),
 * then a day-by-day run. Each day the player talks to someone they know and,
 * on some days, to a neighbor from the wider population, who is filled in the
 * moment they are met (`personOrFillIn`). Every choice, including the lie
 * set, comes from the real writers (`openConversation`, `say`, `bringItUp`),
 * and which reply is chosen is a stable hash of (seed, life, day, turn): no
 * dice, so the same arguments give the same report.
 *
 * Nothing here words anything; it only records what the director returned.
 */
import { execSync } from "node:child_process";
import { buildBenchWorld } from "../../src/bench/world";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { traitLean } from "../../src/core2/choice";
import { advanceCore } from "../../src/core2/life";
import { personOrFillIn } from "../../src/core2/state";
import type { CoreState, PersonId } from "../../src/core2/types";
import { bringItUp } from "../../src/director/bring-it-up";
import {
  openConversation,
  say,
  type Conversation,
  type ConversationChoice,
  type ConversationLine,
  type Wording,
} from "../../src/director/conversation";
import { addDays, ageOnDate, makeIsoDate } from "../../src/core2/kernel/dates";
import { drawPlace } from "../core2-year/place";
import { countedHouseholdOfPerson } from "../../src/core2/tooling/counted-records";

/** The bench's opening day (src/bench/m0-check.ts). */
export const OPENING_DATE = "2026-10-12";
/** The most turns one conversation is played for. */
export const MAX_TURNS = 6;

export interface RecordedLine {
  speakerId: PersonId;
  speaker: string;
  act: ConversationLine["act"] | "bring-it-up";
  kind: string;
  subjectId: string;
  text: string;
  wording?: Wording;
  sourceRecordIds: readonly string[];
}

export interface RecordedChoice {
  key: string;
  move: string;
  text: string;
  lie: boolean;
  wording?: Wording;
  sourceRecordIds: readonly string[];
  claim?: { key: string; value: string };
  chosen: boolean;
}

export interface RecordedTurn {
  /** What was said since the last turn (the other person's, and the player's own). */
  said: RecordedLine[];
  choices: RecordedChoice[];
  lies: RecordedChoice[];
}

export interface RecordedConversation {
  life: number;
  day: number;
  date: string;
  playerId: PersonId;
  player: string;
  otherId: PersonId;
  other: string;
  /** The other person came from the wider population and was filled in when met. */
  filledIn: boolean;
  /** Both speakers' recorded traits. */
  traits: Record<PersonId, Record<string, number>>;
  /**
   * How far each speaker's traits lean toward reaching out to someone they
   * know, from -1 (reserved) to 1 (outgoing): the core's own trait lean
   * for the kinds of the act "contact-known-person", used as the personality-fit proxy.
   */
  reachesOut: Record<PersonId, number>;
  broughtUp: RecordedLine[];
  turns: RecordedTurn[];
}

export interface PlayedLife {
  life: number;
  seed: string;
  placeKey: string;
  placeName: string;
  state: string;
  placeId: string;
  playerId: PersonId | null;
  conversations: RecordedConversation[];
  /** Why a life stopped early, if it did. */
  error?: string;
  buildSeconds: number;
  runSeconds: number;
}

export interface PlayOptions {
  seed: string;
  lives: number;
  days: number;
  /** Called after each life, so a long run can say where it is. */
  onLife?: (life: PlayedLife) => void;
}

/** A stable number in [0, 2^32) from the parts: the only chooser here (no dice). */
export function hashOf(...parts: (string | number)[]): number {
  const text = parts.join(":");
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  // Avalanche the low bits, so `% 4` and `% 2` are not just the last character.
  hash ^= hash >>> 16;
  hash = Math.imul(hash, 0x85ebca6b) >>> 0;
  hash ^= hash >>> 13;
  return hash >>> 0;
}

export function headCommit(): string {
  try {
    return execSync("git rev-parse --short HEAD").toString().trim();
  } catch {
    return "unknown";
  }
}

function nameOf(core: CoreState, id: PersonId): string {
  const row = core.people.get(id);
  return row ? `${row.givenName} ${row.familyName}` : id;
}

function recordChoice(
  choice: ConversationChoice,
  chosen: string | undefined,
): RecordedChoice {
  return {
    key: choice.key,
    move: choice.move,
    text: choice.text,
    lie: choice.lie,
    ...(choice.wording ? { wording: choice.wording } : {}),
    sourceRecordIds: choice.sourceRecordIds,
    ...(choice.claim ? { claim: choice.claim } : {}),
    chosen: choice.key === chosen,
  };
}

function recordLine(core: CoreState, line: ConversationLine): RecordedLine {
  return {
    speakerId: line.speakerId,
    speaker: nameOf(core, line.speakerId),
    act: line.act,
    kind: line.kind,
    subjectId: line.subjectId,
    text: line.text,
    ...(line.wording ? { wording: line.wording } : {}),
    sourceRecordIds: line.sourceRecordIds,
  };
}

/** The lie set: the scales' false set; an older build had one `lie`. */
function liesOf(conversation: Conversation): ConversationChoice[] {
  const set = (conversation as { lies?: ConversationChoice[] }).lies;
  if (set) return set;
  const one = (conversation as { lie?: ConversationChoice | null }).lie;
  return one ? [one] : [];
}

function talk(
  core: CoreState,
  options: {
    seed: string;
    life: number;
    day: number;
    playerId: PersonId;
    otherId: PersonId;
    filledIn: boolean;
  },
): RecordedConversation {
  const { seed, life, day, playerId, otherId } = options;
  const conversation = openConversation(core, playerId, otherId);
  const broughtUp = bringItUp(core, otherId, playerId);
  const turns: RecordedTurn[] = [];
  let said = 0;
  for (let turn = 0; turn < MAX_TURNS; turn += 1) {
    const choices = conversation.choices;
    const lies = liesOf(conversation);
    const available = [...choices, ...lies];
    // The same hash chooses between the true replies and the lie set.
    const chooser = hashOf(seed, life, day, turn);
    const wantsLie =
      lies.length > 0 && hashOf(seed, life, day, turn, "lie") % 4 === 0;
    const pool = wantsLie || choices.length === 0 ? lies : choices;
    const chosen = pool.length ? pool[chooser % pool.length]!.key : undefined;
    turns.push({
      said: conversation.lines
        .slice(said)
        .map((line) => recordLine(core, line)),
      choices: choices.map((row) => recordChoice(row, chosen)),
      lies: lies.map((row) => recordChoice(row, chosen)),
    });
    said = conversation.lines.length;
    if (!chosen || available.length === 0) break;
    say(core, conversation, chosen);
    if (turn === MAX_TURNS - 1)
      turns.push({
        said: conversation.lines
          .slice(said)
          .map((line) => recordLine(core, line)),
        choices: conversation.choices.map((row) =>
          recordChoice(row, undefined),
        ),
        lies: liesOf(conversation).map((row) => recordChoice(row, undefined)),
      });
  }
  const traitsOf = (id: PersonId) => ({
    ...(core.people.get(id)?.traits ?? {}),
  });
  const contactKinds =
    core.data.actions.find((row) => row.id === "contact-known-person")
      ?.actKinds ?? [];
  const reach = (id: PersonId) => {
    const person = core.people.get(id);
    return person ? traitLean(core, person, contactKinds) : 0;
  };
  return {
    life,
    day,
    date: core.date,
    playerId,
    player: nameOf(core, playerId),
    otherId,
    other: nameOf(core, otherId),
    filledIn: options.filledIn,
    traits: { [playerId]: traitsOf(playerId), [otherId]: traitsOf(otherId) },
    reachesOut: { [playerId]: reach(playerId), [otherId]: reach(otherId) },
    broughtUp: (broughtUp?.lines ?? []).map((line) => ({
      speakerId: otherId,
      speaker: nameOf(core, otherId),
      act: "bring-it-up",
      kind: broughtUp!.change.kind,
      subjectId: broughtUp!.change.institutionId,
      text: line.text,
      sourceRecordIds: line.sourceRecordIds,
    })),
    turns,
  };
}

/** Plays one life and records its conversations. */
export function playLife(seed: string, life: number, days: number): PlayedLife {
  const place = drawPlace(`${seed}:${life}`, "dialogue-report");
  const started = performance.now();
  const played: PlayedLife = {
    life,
    seed: place.seed,
    placeKey: place.key,
    placeName: place.name,
    state: place.state,
    placeId: "",
    playerId: null,
    conversations: [],
    buildSeconds: 0,
    runSeconds: 0,
  };
  try {
    setBookkeeping(false); // play runs without the debug checks (AGENTS.md)
    const world = buildBenchWorld(place.seed, OPENING_DATE, {
      twoLevel: true,
      placeKey: place.key,
    });
    played.buildSeconds = (performance.now() - started) / 1000;
    played.placeId = world.placeId;
    const core = world.core;
    const playerId = world.playerId!;
    played.playerId = playerId;
    const counted = [...countedHouseholdOfPerson(core).keys()];
    const runStarted = performance.now();
    for (let day = 0; day < days; day += 1) {
      const me = core.people.get(playerId)!;
      const known = [...new Set([...me.knownIds, ...me.familyIds])]
        .filter((id) => id !== playerId && core.people.get(id)?.alive)
        .sort();
      if (known.length) {
        const otherId = known[hashOf(seed, life, day, "known") % known.length]!;
        played.conversations.push(
          talk(core, { seed, life, day, playerId, otherId, filledIn: false }),
        );
      }
      // Some days the player meets a neighbor from the wider population, who
      // is filled in as a full person the moment they are met.
      if (counted.length && hashOf(seed, life, day, "neighbor") % 2 === 0) {
        for (let attempt = 0; attempt < 6; attempt += 1) {
          const id =
            counted[
              hashOf(seed, life, day, "neighbor", attempt) % counted.length
            ]!;
          const neighbor = personOrFillIn(core, id);
          if (
            !neighbor?.alive ||
            ageOnDate(makeIsoDate(neighbor.birthDate), makeIsoDate(core.date)) <
              18
          )
            continue;
          played.conversations.push(
            talk(core, {
              seed,
              life,
              day,
              playerId,
              otherId: id,
              filledIn: true,
            }),
          );
          break;
        }
      }
      if (day < days - 1) advanceCore(core, addDays(makeIsoDate(core.date), 1));
    }
    played.runSeconds = (performance.now() - runStarted) / 1000;
  } catch (error) {
    played.error =
      error instanceof Error ? (error.stack ?? error.message) : String(error);
  }
  return played;
}

export function playLives(options: PlayOptions): PlayedLife[] {
  const lives: PlayedLife[] = [];
  for (let life = 0; life < options.lives; life += 1) {
    const played = playLife(options.seed, life, options.days);
    lives.push(played);
    options.onLife?.(played);
    (globalThis as { gc?: () => void }).gc?.();
  }
  return lives;
}
