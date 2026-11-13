/**
 * Every pair (line before, reply) the director can produce, for the judges.
 *
 * `replyPairs(parts)` lists each pair `{ before, reply }` such that the
 * picker (`fitting`, `scene-talk-words.ts`) could return `reply` when the
 * director passes `afterPiece: before` and `after: before`'s move, in a scene
 * where both pieces serve. It asks the picker's own test (`useFit`) for the
 * reply, with the facts that reply's use requires: facts only narrow the
 * choice, so a pair that needs a fact is still a pair. It ignores which of
 * the fitting replies wins by closeness: the verdicts take a reply out
 * before the closest is chosen, so a lower fit may come to be offered.
 *
 * Which line can come right after which, read from `src/director/scene-talk.ts`
 * (every call that words a line with `afterPiece`; line numbers as of Nov 10):
 *   - open -> auto            the asked answers a compliment or news (l. 1021)
 *   - state -> auto, reply    an unprompted line (`withAuto`, l. 1092 to 1109), the replies
 *                             (l. 1419, 1445); in the player's own ask the request is the
 *                             state and the answer a reply (l. 832)
 *   - auto -> follow          the asker answers it (l. 1043, 1130)
 *   - follow -> auto, reply   an unprompted line after an answer (l. 1109), the replies
 *                             (l. 1419, 1445); in the player's own ask, the asker's second ask
 *                             follows the first answer (l. 901) and a reply follows that
 *   - reply -> follow         the asker's answer (l. 1575); after a lie, believed or caught
 *                             (l. 1342, 1375)
 *   - reply -> continue, state, follow   the purpose goes on once (l. 1671; one call, closest fit across the three steps)
 *   - reply -> close          only after a reply some close names in `after` (`leaveClose`,
 *                             l. 1284 to 1295), in the moves such closes are written in; the
 *                             usual close (`closeFor`, l. 1204 to 1227) names no line before it
 * A "continue" is asked like a follow: replies come after it (l. 1419).
 * `answerInTalk` (l. 415 to 421) passes a subject and choice in `afterPiece`, not a
 * bank piece; it makes no pair.
 *
 * Which moves can follow which is the arc's (purpose-arcs.json and the
 * variants'); the director gives it as a `flow`. Without one, every move
 * counts, which is far too many pairs for any judge.
 *
 * Pure: no files, no world.
 */
import {
  useFit,
  usesSpot,
  type BankPart,
  type Fact,
  type PartUse,
  type SceneMove,
  type SceneSpot,
} from "./scene-talk-words";
import {
  follows,
  REPLY_FOLLOWS,
  type ReplyFollowsTable,
} from "./reply-follows";
import { hash53 } from "./judged";

/** A scene: the purpose it plays, the purpose it is a variant of and the situation key. */
export interface ReplyScene extends SceneSpot {
  readonly purpose: string;
  readonly key: string;
}

/** Which moves the arc lets follow a line of this step and move; undefined where it does not say. */
export interface ReplyFlow {
  next(
    scene: ReplyScene,
    beforeStep: string,
    beforeMove: string,
  ): ReadonlySet<string> | undefined;
}

export interface ReplyPair {
  readonly before: string;
  readonly reply: string;
  readonly purpose: string;
  readonly key: string;
  /** The reply's step and move, in this scene. */
  readonly step: string;
  readonly move: string;
}

const FACT: Fact = { text: "yes", sourceRecordIds: [] };

/**
 * The scenes the bank is written for, when the caller names none: each
 * purpose any use names, with each key any use of it (or of its family) names.
 */
export function scenesOf(
  parts: readonly BankPart[],
  families: Readonly<Record<string, string>> = {},
): ReplyScene[] {
  const keys = new Map<string, Set<string>>();
  for (const part of parts)
    for (const u of part.uses) {
      if (u.subject !== "scene" || !u.purpose) continue;
      const set = keys.get(u.purpose) ?? new Set<string>();
      if (u.key) set.add(u.key);
      keys.set(u.purpose, set);
    }
  return [...keys.keys()].sort().flatMap((purpose) => {
    const family = families[purpose];
    const named = new Set([
      ...(keys.get(purpose) ?? []),
      ...(family ? (keys.get(family) ?? []) : []),
    ]);
    return [...(named.size ? named : new Set([""]))].sort().map((key) => ({
      purpose,
      key,
      ...(family ? { family } : {}),
    }));
  });
}

/** The step sets the director asks for after each step: one call is one set, and `fitting` takes the closest fit across it. */
export const STEP_SETS_AFTER: Readonly<
  Record<string, readonly (readonly string[])[]>
> = {
  open: [["auto"]],
  state: [["auto"], ["reply"]],
  auto: [["follow"]],
  follow: [["auto"], ["reply"]],
  continue: [["reply"]],
  reply: [["follow"], ["continue", "follow", "state"], ["close"]],
};

interface Row {
  readonly part: BankPart;
  readonly use: PartUse;
}

/**
 * Every pair the picker could offer, once per scene it can be offered in.
 * `parts` are the pieces play may say (the caller passes only playable ones).
 *
 * The picker takes out a reply the verdicts say does not follow the line
 * before it, then chooses the closest fit among what is left, so a reply that
 * is not the closest fit today becomes a pair once a closer one is judged "no".
 * `verdicts` are the "no" verdicts the picker reads (the file's by default); judging the pairs this returns and
 * asking again finds the next ones, until none is unjudged. With
 * `everyFit`, no closeness and no verdicts apply: every reply any fact could
 * allow, the set an id on a sheet must belong to.
 */
export function replyPairs(
  parts: readonly BankPart[],
  options: {
    scenes?: readonly ReplyScene[];
    flow?: ReplyFlow;
    verdicts?: ReplyFollowsTable;
    everyFit?: boolean;
    /** Called where every reply that fits is a "no": the picker then serves them anyway, and a new reply is needed. */
    onSilenced?: (spot: {
      before: string;
      purpose: string;
      key: string;
      step: string;
      move: string;
    }) => void;
  } = {},
): ReplyPair[] {
  const scenes = options.scenes ?? scenesOf(parts);
  const verdicts = options.verdicts ?? REPLY_FOLLOWS;
  const pairs: ReplyPair[] = [];
  const seen = new Set<string>();
  const closeCache = new Map<string, ReadonlySet<string>>();
  /** The moves of the closes written to answer a line of this move, in any purpose. */
  const closesAfter = (move: string): ReadonlySet<string> => {
    let found = closeCache.get(move);
    if (!found) {
      found = new Set(
        parts.flatMap((part) =>
          part.uses
            .filter((u) => u.step === "close" && u.after === move)
            .map((u) => u.move),
        ),
      );
      closeCache.set(move, found);
    }
    return found;
  };
  for (const scene of scenes) {
    const byStep = new Map<string, Row[]>();
    const serving: Row[] = [];
    for (const part of parts)
      for (const use of part.uses)
        if (use.subject === "scene" && usesSpot(use, scene)) {
          const row = { part, use };
          serving.push(row);
          const list = byStep.get(use.step) ?? [];
          list.push(row);
          byStep.set(use.step, list);
        }
    // The replies the picker chooses among, for each step set: by move, role and whether they draw on the player's own life.
    const groups = new Map<string, Map<string, Row[]>>();
    const groupsOf = (steps: readonly string[]) => {
      const name = steps.join("+");
      let found = groups.get(name);
      if (!found) {
        found = new Map();
        for (const step of steps)
          for (const row of byStep.get(step) ?? []) {
            const at = `${row.use.move}|${row.use.role}|${row.use.requiresFacts?.some((fact) => fact.startsWith("asked_")) ? "tagged" : "plain"}`;
            const list = found.get(at) ?? [];
            list.push(row);
            found.set(at, list);
          }
        groups.set(name, found);
      }
      return found;
    };
    for (const before of serving) {
      for (const steps of STEP_SETS_AFTER[before.use.step] ?? []) {
        const moves = options.flow?.next(
          scene,
          before.use.step,
          before.use.move,
        );
        // The director words a close after a line only when some close names that line's move in its
        // `after` (`leaveClose`); it then tries the moves such closes are written in, with the outcome "open".
        const close = steps[0] === "close";
        const closeMoves = close ? closesAfter(before.use.move) : undefined;
        for (const rows of groupsOf(steps).values()) {
          const { move: replyMove, role } = rows[0]!.use;
          if (
            close ? !closeMoves!.has(replyMove) : moves && !moves.has(replyMove)
          )
            continue;
          const candidates = rows.filter(
            (row) => row.part.key !== before.part.key,
          );
          if (!candidates.length) continue;
          const outcomes = close ? (["open"] as const) : [undefined];
          // A purpose's variant is worded from its own pieces, then from the family's alone.
          const asked: (ReplyScene & { family?: string })[] = [scene];
          if (scene.family && !options.everyFit)
            asked.push({ purpose: scene.family, key: scene.key });
          const factSets = new Set(
            candidates.map((row) => (row.use.requiresFacts ?? []).join(",")),
          );
          for (const outcome of outcomes)
            for (const where of asked)
              for (const names of factSets) {
                const facts = Object.fromEntries(
                  names
                    .split(",")
                    .filter(Boolean)
                    .map((name) => [name, FACT]),
                );
                const use: SceneMove = {
                  step: (steps.length === 1
                    ? steps[0]!
                    : [...steps]) as SceneMove["step"],
                  move: replyMove,
                  role,
                  purpose: where.purpose,
                  ...(where.family ? { family: where.family } : {}),
                  key: scene.key,
                  after: before.use.move,
                  afterPiece: before.part.key,
                  ...(outcome ? { outcome } : {}),
                };
                // The same test the picker makes, once per piece (its best use).
                const fits = new Map<BankPart, number>();
                for (const row of candidates) {
                  const score = useFit(row.use, use, steps, facts);
                  if (score >= 0)
                    fits.set(
                      row.part,
                      Math.max(score, fits.get(row.part) ?? -1),
                    );
                }
                let chosen = [...fits];
                if (!options.everyFit) {
                  const fol = ([part]: [BankPart, number]) =>
                    follows(part.key, before.part.key, verdicts);
                  const following = chosen.filter(fol);
                  // The picker sorts whole lines and joined pieces apart
                  // (wordSceneMove: each kind keeps what follows, else all of
                  // its own kind), so the verdicts thin each kind on its own.
                  const ofKind = (piece: boolean) => {
                    const kind = chosen.filter(
                      ([part]) => !!part.piece === piece,
                    );
                    const fit = kind.filter(fol);
                    return fit.length ? fit : kind;
                  };
                  if (following.length)
                    chosen = [...ofKind(false), ...ofKind(true)];
                  else if (chosen.length && options.onSilenced)
                    options.onSilenced({
                      before: before.part.key,
                      purpose: scene.purpose,
                      key: scene.key,
                      step: steps[0]!,
                      move: replyMove,
                    });
                  const best = Math.max(0, ...chosen.map(([, score]) => score));
                  chosen = chosen.filter(([, score]) => score === best);
                }
                for (const [part] of chosen) {
                  const id = `${before.part.key}|${part.key}|${scene.purpose}|${scene.key}`;
                  if (seen.has(id)) continue;
                  seen.add(id);
                  pairs.push({
                    before: before.part.key,
                    reply: part.key,
                    purpose: scene.purpose,
                    key: scene.key,
                    step: steps[0]!,
                    move: replyMove,
                  });
                }
              }
        }
      }
    }
  }
  return pairs;
}

/** One pair's identity by keys alone, the same whatever scene it comes up in (verdicts use `verdictId`, which adds the text). */
export const pairId = (before: string, reply: string): string =>
  hash53(`${before}|${reply}`);

/** One row per (before, reply), the scene order of the first scene that offers it. */
export function distinctPairs(pairs: readonly ReplyPair[]): ReplyPair[] {
  const seen = new Set<string>();
  return pairs.filter((pair) => {
    const id = pairId(pair.before, pair.reply);
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

/** What the run reports for the rule `reply-follows-the-line-before`. */
export interface ReplyFollowsReport {
  /** Pairs play can offer now, given the verdicts. */
  readonly pairs: number;
  /** Pairs judged, yes and no (the verdict file's `judged`). */
  readonly judged: number;
  /** Pairs offered now that nobody has judged: they play as before. */
  readonly unjudged: number;
  readonly no: number;
  readonly repliesWithNo: number;
  /**
   * The rewrite queue: lines after which no reply that fits follows, with the
   * purpose and move where a new reply is needed (`purpose/move`).
   */
  readonly noReplyFollows: Readonly<Record<string, readonly string[]>>;
}

/**
 * The report from the pairs offered now, the ids judged (yes or no), the
 * "no" verdicts and the spots the verdicts silenced.
 */
export function replyFollowsReport(input: {
  readonly pairs: readonly ReplyPair[];
  readonly judgedIds: ReadonlySet<string>;
  /** A pair's verdict id (`verdictId` over its keys and their text). */
  readonly idOf: (pair: ReplyPair) => string;
  readonly no: ReplyFollowsTable;
  readonly silenced: readonly {
    before: string;
    purpose: string;
    move: string;
  }[];
}): ReplyFollowsReport {
  const queue = new Map<string, Set<string>>();
  for (const spot of input.silenced) {
    const set = queue.get(spot.before) ?? new Set<string>();
    set.add(`${spot.purpose}/${spot.move}`);
    queue.set(spot.before, set);
  }
  let no = 0;
  for (const befores of input.no.values()) no += befores.size;
  return {
    pairs: input.pairs.length,
    judged: input.judgedIds.size,
    unjudged: input.pairs.filter(
      (pair) => !input.judgedIds.has(input.idOf(pair)),
    ).length,
    no,
    repliesWithNo: input.no.size,
    noReplyFollows: Object.fromEntries(
      [...queue]
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .map(([before, spots]) => [before, [...spots].sort()]),
    ),
  };
}
