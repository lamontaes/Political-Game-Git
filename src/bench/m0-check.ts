/* global process, console */
// Headless M0-01 to M0-05 checks against the bench, in the place the
// golden-path runner drew (GOLDEN_PATH_SEED, GOLDEN_PATH_PLACE_KEY).
// Usage: node --import tsx src/bench/m0-check.ts M0-02
import { createHash } from "node:crypto";
import { corePlaceStateIdentities } from "../core2/place-lookup";
import { realLocalities } from "../core2/places";
import { earliestPlayerStopV1 } from "../core2/player-v1";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { selectBenchPlace } from "./place-selection.mjs";
import { gameStartDate } from "../core2/game-start";
import { buildBenchWorld, type BenchWorld } from "./world";
import { BenchPlayer, ownPick } from "./player";
import { leaveHoldsToCharacter } from "./office";
import { judgeJumpEnd } from "./jump-end-check";
import type { IsoDate } from "../core2/kernel/brands";
import { benchProgress } from "./progress";

// Check-size town: engineering, not calibration. The owner's bench builds
// the full cohort; the checks need a whole town, not a big one.
const CHECK_PEOPLE = Number(process.env.BENCH_CHECK_PEOPLE ?? 400);
const OPENING_DATE = gameStartDate();
const seed = process.env.GOLDEN_PATH_SEED ?? "bench-check-local";
const placeKey = process.env.GOLDEN_PATH_PLACE_KEY;

const hash = (text: string) =>
  parseInt(createHash("sha256").update(text).digest("hex").slice(0, 8), 16);
function fail(message: string): never {
  throw new Error(message);
}
function check(condition: unknown, message: string): asserts condition {
  if (!condition) fail(message);
}
function world(): BenchWorld {
  return buildBenchWorld(seed, OPENING_DATE, {
    ...(placeKey ? { placeKey } : {}),
    minimumPeople: CHECK_PEOPLE,
  });
}
function adultOf(w: BenchWorld, tag: string, employed = false) {
  const adults = w.residents
    .filter((row) => row.age >= 18 && (!employed || row.jobId))
    .sort((a, b) => a.id.localeCompare(b.id));
  check(
    adults.length,
    `No ${employed ? "employed " : ""}adult in ${w.place.key}`,
  );
  return adults[hash(`${seed}:${tag}`) % adults.length]!;
}
const label = (w: BenchWorld) =>
  `${w.place.displayName ?? w.place.key} (${w.place.key}), seed ${seed}`;

const specs: Record<string, () => string> = {
  /** Three seeds, three places in three different states or territories. */
  "M0-01"() {
    const identities = corePlaceStateIdentities(),
      localities = realLocalities(),
      seen = new Map<string, string>();
    for (let i = 0; seen.size < 3; i++) {
      check(i < 64, "Seeds keep drawing the same states.");
      const s = `${seed}:m0-01:${i}`,
        place = selectBenchPlace(s, identities, localities);
      if (!seen.has(place.stateJurisdictionKey ?? place.key))
        seen.set(place.stateJurisdictionKey ?? place.key, s);
    }
    const out: string[] = [];
    for (const [state, s] of seen) {
      const w = buildBenchWorld(s, OPENING_DATE, {
        minimumPeople: CHECK_PEOPLE,
      });
      check(w.residents.length, `No residents in ${w.place.key}`);
      for (const row of w.residents) {
        const person = w.core.people.get(row.id);
        check(person, `Listed resident ${row.id} is not in the core.`);
        check(
          w.core.households.get(row.householdId)?.memberIds.includes(row.id),
          `Household of ${row.id} does not list them.`,
        );
      }
      out.push(`${state}: ${w.place.key}, ${w.residents.length} residents`);
    }
    return out.join("; ");
  },

  /**
   * Seven played days (owner, Oct 14, 2026: Day and Week never open a choice
   * list): every act of the chosen person is the character's own pick, saved
   * as its own decision, or answers a stop; an answer nobody was asked for is
   * refused and changes no record; other residents' lives continue.
   */
  "M0-02"() {
    const w = world(),
      player = new BenchPlayer(w.core, w.director),
      chosen = adultOf(w, "m0-02");
    player.select(chosen.id);
    const start = w.core.durableLog.size,
      answered = new Map<string, number>();
    // The character's own answers, by the act each chose (day, action, target).
    const own = (row: {
      at: { date: string };
      actionId: string;
      targetId: string;
    }) => {
      const key = `${row.at.date}|${row.actionId}|${row.targetId}`;
      answered.set(key, (answered.get(key) ?? 0) + 1);
    };
    let result = player.advance("week");
    for (const row of result.selfChosen) own(row);
    for (let guard = 0; result.packet.kind !== "complete"; guard++) {
      check(guard < 5000, "The week did not finish.");
      const packet = result.packet;
      // A week never opens a choice list for the player.
      check(
        packet.kind === "stop",
        `A week opened a choice list at ${packet.at.date}.`,
      );
      // A meeting or the desk holds the clock until it is answered: the
      // check leaves it to the character, its act kept as their own choice.
      leaveHoldsToCharacter(w.core, packet.controlledPersonId);
      const next = player.resume({ kind: "stop", pauseId: packet.pauseId });
      for (const row of next.selfChosen) own(row);
      result = { ...result, ...next };
    }
    const answers = [...answered.values()].reduce((a, b) => a + b, 0);
    check(answers > 0, "The character made no choice in seven days.");
    // An answer to a choice nobody issued is refused and leaves the records alone.
    const before = w.core.sequence;
    let threw = false;
    try {
      player.resume({
        kind: "choice",
        pauseId: "not-an-issued-pause",
        offerId: "not-an-issued-offer",
      });
    } catch {
      threw = true;
    }
    check(threw, "An answer nobody was asked for was accepted.");
    check(w.core.sequence === before, "A refused answer changed records.");
    let mine = 0,
      others = 0;
    for (const record of [...w.core.durableLog.values()].slice(start)) {
      const row = record as {
        kind: string;
        actorId?: string;
        date: string;
        actionId: string;
        targetId: string;
      };
      if (row.kind !== "person.acted") continue;
      if (row.actorId === chosen.id) {
        mine++;
        // Each act is one of the character's own answers, used once.
        const key = `${row.date}|${row.actionId}|${row.targetId}`;
        const left = answered.get(key) ?? 0;
        check(left > 0, `Act ${key} was not the character's own answer.`);
        answered.set(key, left - 1);
      }
    }
    // Unwatched residents' acts aren't kept in the log (bookkeeping is off
    // in play); the player clock counts every act it simulated.
    others = result.packet.acts - mine;
    check(mine > 0, "The chosen person did nothing in seven days.");
    check(others > 0, "Nobody else's life continued.");
    return `${label(w)}: ${answers} own answers, ${mine} acts by the chosen person, ${others} acts by others`;
  },

  /**
   * A skip from a random date stops at the earliest thing that needs the
   * player (a big moment, a deadline) and says which; a routine shift the
   * character attends on its own never stops it (owner, Oct 12); nothing is
   * skipped past.
   */
  "M0-03"() {
    const w = world(),
      player = new BenchPlayer(w.core, w.director),
      chosen = adultOf(w, "m0-03", true);
    player.select(chosen.id);
    const offset = 1 + (hash(`${seed}:m0-03:date`) % 14),
      // A fresh clock starts the day after the opening.
      from = addDays(makeIsoDate(OPENING_DATE), 1 + offset);
    let result = player.advance("calendar", from);
    for (let guard = 0; result.packet.kind !== "complete"; guard++) {
      check(guard < 5000, `The clock never reached ${from}.`);
      const packet = result.packet;
      // A meeting or the desk holds the clock until it is answered (a
      // character on a small board is held at its meeting): the check leaves
      // it to the character, as M0-02 does.
      if (packet.kind === "stop")
        leaveHoldsToCharacter(w.core, packet.controlledPersonId);
      result = {
        ...result,
        ...(packet.kind === "choice"
          ? player.resume({
              kind: "choice",
              pauseId: packet.pauseId,
              offerId: ownPick(packet)!.offerId,
            })
          : player.resume({ kind: "stop", pauseId: packet.pauseId })),
      };
    }
    const at = result.packet.at;
    // Check-size lookahead (engineering): a month of the character's days.
    const lookahead = 30;
    const known = earliestPlayerStopV1(w.core, {
      controlledPersonId: chosen.id,
      through: {
        date: addDays(makeIsoDate(at.date), lookahead),
        minuteOfDay: 0,
      },
    });
    const knownModuleStop = known?.modules.length ? known : null;
    const skip = player.advance(
        "calendar",
        addDays(makeIsoDate(at.date), lookahead),
      ),
      packet = skip.packet;
    let why: string[] = [];
    if (packet.kind === "stop") {
      check(packet.stop.modules.length, "A routine shift stopped the jump.");
      why = packet.stop.modules.map((row) =>
        row.kind === "interrupt" ? "big moment" : "deadline",
      );
    } else {
      // Election morning is a stop the jump must make (the polling place, or the player's own
      // morning): it ends the jump short on purpose and names its record.
      const end = judgeJumpEnd({
        kind: packet.kind,
        date: makeIsoDate(packet.at.date),
        target: addDays(makeIsoDate(at.date), lookahead),
        pollingRecordId: player.pollingPlace?.record.id,
        candidateMorning: player.candidateMorning as IsoDate | undefined,
      });
      check(end.ok, `The jump ended early without a stop (${end.why}).`);
      if (packet.at.date !== addDays(makeIsoDate(at.date), lookahead))
        why = [end.why];
    }
    // Nothing skipped past: no stop already known when the skip began is
    // earlier than where it ended (later moments can only be earlier).
    if (knownModuleStop) {
      const later =
        packet.at.date > knownModuleStop.at.date ||
        (packet.at.date === knownModuleStop.at.date &&
          packet.at.minuteOfDay > knownModuleStop.at.minuteOfDay);
      check(
        !later,
        `Skip passed a known stop at ${JSON.stringify(knownModuleStop.at)}.`,
      );
    }
    const shifts = skip.selfChosen.filter((row) =>
      /scheduled-work/.test(row.actionId),
    ).length;
    return `${label(w)}: from ${at.date}, skip ${packet.kind === "stop" ? `stopped ${packet.at.date} minute ${packet.at.minuteOfDay} for ${why.join(", ")}` : why.length ? `ended ${packet.at.date}, ${why.join(", ")}` : `ran ${lookahead} days to ${packet.at.date} with nothing needing the player`}; the character attended ${shifts} shift choices and made ${skip.selfChosen.length} choices itself`;
  },

  /** Twenty sampled decision records each open a "why" made of saved scores. */
  "M0-04"() {
    const w = world(),
      player = new BenchPlayer(w.core, w.director),
      chosen = adultOf(w, "m0-04");
    player.select(chosen.id);
    // Sampling rule: only items that come from a decision record (a
    // `person.acted` row of this character) are sampled. The core keeps
    // every option's scores for circleDecisionDetailDays only, so each new
    // decision record is opened on the day it appears on screen, as a player
    // would; the step fails on any sampled record that opens without scores.
    const seen = new Set<string>(),
      sample: string[] = [];
    const newDecisions = () =>
      [...(w.core.logByPerson.get(chosen.id) ?? [])]
        .filter((id) => {
          const row = w.core.durableLog.get(id);
          return (
            !seen.has(id) &&
            row?.kind === "person.acted" &&
            row.actorId === chosen.id
          );
        })
        .sort();
    // Records made before the character was taken are not on the played screen.
    for (const id of newDecisions()) seen.add(id);
    for (let day = 0; sample.length < 20 && day < 120; day++) {
      let result = player.advance("day");
      while (result.packet.kind !== "complete")
        result = {
          ...result,
          ...(result.packet.kind === "choice"
            ? player.resume({
                kind: "choice",
                pauseId: result.packet.pauseId,
                offerId: result.packet.offers[0]!.offerId,
              })
            : player.resume({ kind: "stop", pauseId: result.packet.pauseId })),
        };
      for (const id of newDecisions()) {
        seen.add(id);
        if (sample.length >= 20) break;
        const trace = player.trace(id) as {
          recordId?: string;
          status: string;
          scoresStatus: string;
          scores?: unknown;
        };
        check(
          trace.status === "saved",
          `${label(w)}: item ${id} opened no saved explanation (${trace.status}).`,
        );
        check(
          trace.scoresStatus === "saved" && trace.scores !== undefined,
          `${label(w)}: item ${id} opened a why with no saved scores.`,
        );
        check(
          trace.recordId === id && w.core.durableLog.has(id),
          `${label(w)}: item ${id} names a record that is not in the core.`,
        );
        sample.push(id);
      }
    }
    check(
      sample.length >= 20,
      `${label(w)}: only ${sample.length} decision records to sample.`,
    );
    return `${label(w)}: ${sample.length} decision records (${sample[0]} to ${sample.at(-1)}) each opened a saved why with saved scores and a record id that exists in the core`;
  },

  /** The golden path and world panel for a fresh life. */
  "M0-05"() {
    const w = world(),
      progress = benchProgress(w.core, w.placeId);
    for (const row of progress.steps.slice(0, 2))
      check(
        row.status === "reachable now",
        `Step ${row.step} is not reachable.`,
      );
    // Later steps are reachable only with record evidence; otherwise they
    // name the module that is missing.
    for (const row of progress.steps.slice(2))
      check(
        (row.status === "reachable now" && row.evidence) ||
          (row.status === "not in the new core yet" && row.missingModule),
        `Step ${row.step} neither shows evidence nor names its missing module.`,
      );
    // A world piece says it runs only when its modules are installed.
    for (const row of progress.world) {
      const running: readonly string[] =
        ("runningModules" in row ? row.runningModules : undefined) ?? [];
      check(
        running.every((id: string) => w.core.modules.has(id)),
        `${row.label} names a module that is not installed.`,
      );
      check(
        row.status === "not in the new core yet"
          ? running.length === 0 && row.missingModule
          : running.length > 0,
        `${row.label} says ${row.status} without its modules.`,
      );
    }
    check(
      progress.furthestReachedStep === null,
      "A step claims to be reached.",
    );
    const reachable = progress.steps.filter(
      (row) => row.status === "reachable now",
    );
    return `${label(w)}: steps ${reachable.map((row) => row.step).join(", ")} reachable, ${progress.steps.length - reachable.length} name their modules; world ${progress.world.map((row) => `${row.label} ${row.status}`).join(", ")}`;
  },
};

const id = process.argv[2] ?? process.env.GOLDEN_PATH_SPEC_ID ?? "";
const run = specs[id];
if (!run)
  fail(`Unknown spec ${id}; use one of ${Object.keys(specs).join(", ")}.`);
const started = performance.now();
console.log(
  `${id} passed: ${run()} (${((performance.now() - started) / 1000).toFixed(1)} s)`,
);
