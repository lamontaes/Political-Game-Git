/**
 * The grading bench, step one: stage every situation the records fire in one
 * played world (owner, Oct 15, 2026, evening, Order 2 of
 * docs/work-orders/words-and-director-2026-10-15.md: every word is a data
 * point). Development tooling; nothing here words anything, and no scene or
 * cast is written by hand.
 *
 * The grading bench (`grading-bench.ts`) reads the types' statuses from here;
 * its test stages a drawn place's year through `stageWorld`.
 *
 * The place is drawn from all 56 by the seed and the world is the bench's
 * (`buildBenchWorld`, two-level), built once. The player's circle is watched by
 * the story director, the core advances day by day, and every entry the
 * director stages is recorded with the cause record that fired it and the
 * people the records put in the room. Each situation type in the catalog is
 * then either staged or listed with why it was not: a type whose every cause
 * waits on a producer the core does not have is `awaiting producer`, and any
 * other type had no cause record in this year. A scene whose narration or cast
 * resolves to a raw record id is not used; it is listed as a fact that was
 * stood in.
 */
import { buildBenchWorld } from "../../src/bench/world";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { advanceCore } from "../../src/core2/life";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";
import type { CoreState, PersonId } from "../../src/core2/types";
import { composeScene, type Scene } from "../../src/director/scene";
import { SITUATION_LIBRARY } from "../../src/director/scheduling";
import type { SituationType } from "../../src/director/scheduling";
import type { Director } from "../../src/director/ledger";
import { drawPlace } from "../core2-year/place";
import { gameStartDate } from "../../src/core2/game-start";

/** A record id or a raw key where a name or a place should be. */
const RAW_ID =
  /\b(?:[a-z][a-z-]*_[0-9a-f]{8,}|[a-z][a-z-]*(?::[A-Za-z0-9._@-]+){2,})\b/;

export interface StagedScene {
  typeKey: string;
  /** The watched person whose schedule held it. */
  watchedId: string;
  momentId: string;
  /** The moment's label, such as `money:job-ended`. */
  label: string;
  /** The record that fired it. */
  causeId: string;
  date: string;
  setting: { kind: string; recordId: string };
  /** The people the records put in the room. */
  castIds: string[];
}

export interface StoodIn {
  momentId: string;
  typeKey: string;
  why: string;
}

export interface TypeStatus {
  key: string;
  staged: number;
  /** Why a type with no staged scene was skipped. */
  skipped?: string;
}

export interface StageReport {
  id: string;
  seed: string;
  place: { name: string; key: string; seed: string };
  days: number;
  staged: StagedScene[];
  types: TypeStatus[];
  /** Scenes left out because their words or cast resolve to a raw id. */
  stoodIn: StoodIn[];
}

/**
 * Each type in the catalog, staged or skipped with why. A type none of whose
 * causes has a producer is awaiting it; one whose causes do and that did not
 * fire had no cause record in the year. Never invented.
 */
export function typeStatuses(
  types: readonly Pick<SituationType, "key" | "causes" | "awaiting">[],
  staged: readonly Pick<StagedScene, "typeKey">[],
): TypeStatus[] {
  const counts = new Map<string, number>();
  for (const scene of staged)
    counts.set(scene.typeKey, (counts.get(scene.typeKey) ?? 0) + 1);
  return types.map((type) => {
    const staged = counts.get(type.key) ?? 0;
    if (staged) return { key: type.key, staged };
    const live = type.causes.filter((cause) => !cause.awaitingProducer);
    const waiting = [
      ...new Set(
        type.causes.flatMap((cause) =>
          cause.awaitingProducer ? [cause.awaitingProducer] : [],
        ),
      ),
    ];
    // A type with no cause names the record it waits for instead.
    const reason = live.length
      ? "no cause record fired in this year"
      : waiting.length
        ? `awaiting producer: ${waiting.join(", ")}`
        : `awaiting ${(type.awaiting ?? []).join(", ") || "a cause record"}`;
    return { key: type.key, staged: 0, skipped: reason };
  });
}

/** Why a scene cannot be shown: a raw id where a name belongs, or a cast member with no record. */
export function standInReason(
  texts: readonly string[],
  castIds: readonly string[],
  has: (id: string) => boolean,
): string | null {
  const raw = texts.find((text) => RAW_ID.test(text));
  if (raw) return `a raw record id in the narration: ${raw.slice(0, 80)}`;
  const missing = castIds.find((id) => !has(id));
  return missing ? `a cast member with no person record: ${missing}` : null;
}

/** The bench's world, built once, watched and run for `days`; every staged entry recorded. */
export function stageWorld(
  options: { id: string; seed: string; days: number },
  log: (line: string) => void = () => {},
): StageReport {
  return stageWorldHeld(options, log).report;
}

/**
 * `stageWorld`, with the world and the director kept for composing the staged
 * scenes. `onStaged` sees each scene on the day it is staged, before the world
 * moves on, the way a player would meet it.
 */
export function stageWorldHeld(
  options: {
    id: string;
    seed: string;
    days: number;
    onStaged?: (
      staged: StagedScene,
      scene: Scene | null,
      core: CoreState,
      director: Director,
    ) => void;
  },
  log: (line: string) => void = () => {},
): {
  report: StageReport;
  core: CoreState;
  director: Director;
  playerId: string;
} {
  const place = drawPlace(options.seed, "grading-bench");
  setBookkeeping(false);
  log(`building ${place.name}`);
  const world = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const core: CoreState = world.core;
  const director: Director = world.director;
  const me = core.people.get(world.playerId!)!;
  const local = [...core.people.values()]
    .filter((p) => p.alive && p.placeId === me.placeId)
    .map((p) => p.id);
  const circle = [
    ...new Set([world.playerId!, ...me.familyIds, ...me.knownIds, ...local]),
  ].slice(0, 64);
  for (const id of circle) director.watch(core, id);
  const seen = new Map<string, number>();
  const staged: StagedScene[] = [];
  const stoodIn: StoodIn[] = [];
  for (let day = 0; day < options.days; day += 1) {
    advanceCore(core, addDays(makeIsoDate(core.date), 1));
    for (const [personId, book] of director.ledger.people) {
      const from = seen.get(personId) ?? 0;
      seen.set(personId, book.schedule.length);
      for (const entry of book.schedule.slice(from)) {
        if (!entry.bindings.length || entry.outcome === "journal-line")
          continue;
        const binding = entry.bindings[0]!;
        const moment = book.momentsById.get(entry.momentId)!;
        const scene = composeScene(core, director, personId as PersonId, entry);
        const why = standInReason(
          (scene?.narration ?? []).map((line) => line.text),
          binding.presentIds,
          (id) => core.people.has(id as PersonId),
        );
        if (why) {
          stoodIn.push({
            momentId: moment.id,
            typeKey: binding.typeKey,
            why,
          });
          continue;
        }
        const row: StagedScene = {
          typeKey: binding.typeKey,
          watchedId: personId,
          momentId: moment.id,
          label: moment.label,
          causeId: moment.causeId,
          date: String(entry.date),
          setting: binding.setting,
          castIds: [...binding.presentIds],
        };
        staged.push(row);
        options.onStaged?.(row, scene, core, director);
      }
    }
  }
  return {
    report: {
      id: options.id,
      seed: options.seed,
      place: { name: place.name, key: place.key, seed: place.seed },
      days: options.days,
      staged,
      types: typeStatuses(SITUATION_LIBRARY.types, staged),
      stoodIn,
    },
    core,
    director,
    playerId: world.playerId!,
  };
}
