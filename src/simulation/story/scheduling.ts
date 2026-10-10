import { addDays } from "../dates";
import { appendedList } from "../history-index";
import { createStableId } from "../ids";
import { formativeIntervalAt } from "../character-history";
import type {
  EntityId,
  StoryCoverageReason,
  StoryCoverageRecord,
  StoryMomentRecord,
  World,
} from "../types";
import { storyMoments, storyMomentsOf } from "./moments";
import { bindSituation, situationCausesFor } from "./situation-binding";
import { STORY_SCHEDULING } from "./situations";

/**
 * Scheduling: which moments become scenes (story director, part 4), and the
 * coverage log of the moments the library cannot stage (part 7).
 *
 * Every moment above zero is journal material. A moment of the person being
 * played becomes a scene when a situation type it opens binds from the
 * records, the player fills a role in it, and it ranks within the life's pace:
 * about how many scenes a year the life carries at that age. In a quiet year a
 * modest moment ranks; in a year with a death in the family, a schoolyard
 * quarrel stays in the journal. Nothing is drawn by chance.
 *
 * A moment that matters but cannot be staged for a reason inside the director
 * is logged with the reason, never filled in: no type opens it, a role has no
 * record to fill it, or no setting could be placed. Nothing in the log reaches
 * a player; `npm run story:coverage` totals it.
 *
 * A moment from before its scene could still open is journal material only:
 * a life's earlier years, read on its first day, do not replay as scenes.
 *
 * Speed: scheduling reads only the moments the day's intake wrote, and a
 * moment's rank reads only its own person's trailing year.
 */

const NO_COVERAGE: readonly StoryCoverageRecord[] = [];

export function storyCoverage(world: World): readonly StoryCoverageRecord[] {
  return world.history.storyCoverage ?? NO_COVERAGE;
}

/** About how many scenes a year this life carries now, by band of childhood agency. */
export function storyPaceOf(world: World, personId: EntityId): number {
  const band =
    formativeIntervalAt(world, personId, world.currentDate)?.band ?? "adult";
  return STORY_SCHEDULING.paces[band] ?? 0;
}

/**
 * Where a moment ranks among its person's moments over the trailing year,
 * itself included: 1 for the one that matters most. Equal scores rank the
 * earlier-written moment first.
 */
export function storyPaceRank(world: World, moment: StoryMomentRecord): number {
  const since = addDays(world.currentDate, -STORY_SCHEDULING.trailingDays);
  let rank = 1;
  for (const other of storyMomentsOf(world, moment.personId)) {
    if (other.id === moment.id || other.occurredAt <= since) continue;
    if (
      other.salience > moment.salience ||
      (other.salience === moment.salience && other.sequence < moment.sequence)
    )
      rank += 1;
  }
  return rank;
}

/**
 * Whether the moment is recent enough for its scene to open: no older than
 * the days its timing keeps a scene open.
 */
function stillOpen(
  world: World,
  moment: StoryMomentRecord,
  timing: string,
): boolean {
  const days = STORY_SCHEDULING.openDays[timing] ?? 0;
  return moment.occurredAt >= addDays(world.currentDate, -days);
}

/** The first index whose moment was written at or after `from`. */
function firstWrittenAt(
  moments: readonly StoryMomentRecord[],
  from: number,
): number {
  let low = 0;
  let high = moments.length;
  while (low < high) {
    const middle = (low + high) >>> 1;
    if (moments[middle]!.sequence < from) low = middle + 1;
    else high = middle;
  }
  return low;
}

interface CoverageRow {
  readonly moment: StoryMomentRecord;
  readonly reason: StoryCoverageReason;
  readonly typeKey: string | null;
  readonly detail: string;
}

/**
 * Schedules the moments written at or after `fromSequence`: binds the scenes
 * the person being played gets, and logs every moment the library cannot
 * stage. Returns the World unchanged when there is nothing to do.
 */
export function scheduleStoryScenes(world: World, fromSequence: number): World {
  const all = storyMoments(world);
  const written = all.slice(firstWrittenAt(all, fromSequence));
  if (written.length === 0) return world;
  const playerId =
    world.control.kind === "person" ? world.control.personId : null;

  let next = world;
  const rows: CoverageRow[] = [];
  for (const moment of written) {
    const causes = situationCausesFor(moment.kindKey);
    if (causes.length === 0) {
      rows.push({
        moment,
        reason: "no-type",
        typeKey: null,
        detail: `No situation type is opened by ${moment.kindKey}`,
      });
      continue;
    }
    if (moment.personId !== playerId) continue;
    // Beyond the life's pace the moment is a journal line, not a gap.
    if (storyPaceRank(next, moment) > storyPaceOf(next, moment.personId))
      continue;
    const types = new Map(causes.map((entry) => [entry.type.key, entry.type]));
    for (const [typeKey, type] of types) {
      // A moment from before its scene could still open, such as a life's
      // earlier years read on its first day, is the journal's, not a scene.
      if (!stillOpen(next, moment, type.timing)) continue;
      const result = bindSituation(next, {
        typeKey,
        momentId: moment.id,
        playerPersonId: moment.personId,
      });
      if (result.kind === "bound") next = result.world;
      else if (result.coverage)
        rows.push({
          moment,
          reason: result.coverage,
          typeKey,
          detail: result.reason,
        });
    }
  }
  return appendCoverage(next, rows);
}

function coverageId(world: World, stableKey: string): EntityId {
  return createStableId("story-coverage", `${world.id}:${stableKey}`);
}

function appendCoverage(world: World, rows: readonly CoverageRow[]): World {
  if (rows.length === 0) return world;
  let sequence = world.history.nextSequence;
  const records = rows.map((row): StoryCoverageRecord => {
    const stableKey = `${row.moment.id}:${row.reason}:${row.typeKey ?? "none"}`;
    const record: StoryCoverageRecord = {
      id: coverageId(world, stableKey),
      stableKey,
      sequence,
      recordedAt: world.currentDate,
      momentId: row.moment.id,
      personId: row.moment.personId,
      kindKey: row.moment.kindKey,
      salience: row.moment.salience,
      reason: row.reason,
      typeKey: row.typeKey,
      detail: row.detail,
    };
    sequence += 1;
    return record;
  });
  return {
    ...world,
    history: {
      ...world.history,
      nextSequence: sequence,
      storyCoverage: appendedList(storyCoverage(world), records),
    },
  };
}

const REASONS: ReadonlySet<StoryCoverageReason> = new Set([
  "no-type",
  "role-unbound",
  "no-place",
]);

/** World integrity: one row per moment, reason and type, citing a written moment. */
export function assertStoryCoverageIntegrity(world: World): void {
  const keys = new Set<string>();
  const momentIds = new Set(storyMoments(world).map((moment) => moment.id));
  let lastSequence = -1;
  for (const row of storyCoverage(world)) {
    if (
      keys.has(row.stableKey) ||
      row.sequence <= lastSequence ||
      row.sequence >= world.history.nextSequence ||
      !world.people[row.personId] ||
      !momentIds.has(row.momentId) ||
      !REASONS.has(row.reason) ||
      row.id !== coverageId(world, row.stableKey)
    )
      throw new Error(`Invalid story coverage row: ${row.stableKey}`);
    keys.add(row.stableKey);
    lastSequence = row.sequence;
  }
}
