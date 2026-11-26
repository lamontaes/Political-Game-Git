/**
 * Someone the player knows, laid off, calls the working player to ask for a
 * word, in a played world (scene-producers, step 5). The cause is the jobs
 * engine's own record: dev mode's scene control with no one picked (as the
 * Scenes panel's For: Any sends it; `DevMode.forceScene`, recipe "layoff")
 * lays off the first person the player knows in another home who works, through
 * `layOffWorker`, which writes `work.job-lost`. The director's circumstance row `job-lost-calls`
 * reads it for a player who works or holds or seeks office, casts the one the
 * record names if the player knows them and they live apart, and stages the
 * `reach-out` scene (purpose `favor-job`) as a phone call. Circumstances come
 * only for a controlled player, so the days pass through the player's own
 * clock (`advancePlayerV1`). A new player's circle outside their home is
 * mostly kin with no job here (their starting job fills in no coworkers:
 * pool item people-player-meets-coworkers-at-job), so where no one they know
 * apart works, the player first meets a working townsperson the way play
 * does: a talk opened with them (`openConversation`, then `meetOverTalk`, the
 * bench's own road). The place is drawn from all 56 (drawn-place-tests); a
 * place with no working player, or no working townsperson apart who will
 * talk, is passed over by name. GOLDEN_PATH_SEED=<seed> replays a run.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../../scripts/core2-year/place";
import { DevMode } from "../../../src/bench/dev-mode";
import { buildBenchWorld } from "../../../src/bench/world";
import { setBookkeeping } from "../../../src/core2/bookkeeping";
import { gameStartDate } from "../../../src/core2/game-start";
import { addDays, makeIsoDate } from "../../../src/core2/kernel/dates";
import { personWorkOf } from "../../../src/core2/person-work";
import { advancePlayerV1, resumePlayerV1 } from "../../../src/core2/player-v1";
import type { CoreState, PersonId } from "../../../src/core2/types";
import {
  meetOverTalk,
  openConversation,
} from "../../../src/director/conversation";
import type { Director } from "../../../src/director/ledger";
import { purposeScene } from "../../../src/director/purpose-scene";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const DRAWS = 10;
/** The days the call may take to stage after the layoff. */
const DAYS = 5;

/** One day of the player's own clock, through any pause it stops at. */
function playDay(core: CoreState, personId: PersonId) {
  let packet = advancePlayerV1(core, {
    controlledPersonId: personId,
    // Past midnight: the day closes, and its scenes from circumstance with it.
    through: { date: addDays(makeIsoDate(core.date), 1), minuteOfDay: 1 },
  });
  while (packet.kind !== "complete") {
    const next = resumePlayerV1(core, {
      kind: packet.kind === "stop" ? "stop" : "own-choice",
      pauseId: packet.pauseId,
    } as never);
    if (next.kind === "stop" && next.pauseId === packet.pauseId) return;
    packet = next;
  }
}

/**
 * The player meets a working townsperson in another home by talking with
 * them, as the bench's talk does: the first, by id, whose talk opens on a
 * line. Their job is one a layoff can end (not an office's own seat).
 */
function meetSomeoneWhoWorks(
  core: CoreState,
  director: Director,
  me: PersonId,
): PersonId | undefined {
  const player = core.people.get(me)!;
  const working = [...core.people.values()]
    .filter((other) => {
      const job = other.jobId ? core.jobs.get(other.jobId) : undefined;
      return (
        other.alive &&
        other.id !== me &&
        other.placeId === player.placeId &&
        other.householdId !== player.householdId &&
        !!job &&
        job.endsAt === undefined &&
        personWorkOf(core, other.id).job !== null
      );
    })
    .map((other) => other.id)
    .sort();
  for (const id of working) {
    const talk = openConversation(core, me, id, { director });
    if (!talk.lines.length) continue;
    meetOverTalk(core, talk);
    if (player.knownIds.has(id)) return id;
  }
  return undefined;
}

it(`a laid-off friend calls the working player to ask for a word (seed ${seed})`, () => {
  setBookkeeping(false);
  const passed: string[] = [];
  for (let draw = 0; draw < DRAWS; draw += 1) {
    const place = drawPlace(seed, `favor-job-played:${draw}`);
    const where = `${place.name} (${place.key}), seed ${place.seed}`;
    let world: ReturnType<typeof buildBenchWorld>;
    try {
      world = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
    } catch (error) {
      passed.push(`${where}: no player here (${(error as Error).message})`);
      continue;
    }
    const { core, director } = world;
    const me = world.playerId as PersonId | undefined;
    const player = me ? core.people.get(me) : undefined;
    if (!me || !player?.jobId) {
      passed.push(`${where}: the player has no job`);
      continue;
    }
    director.watch(core, me);
    const dev = new DevMode(core, director, undefined, place.key);
    const force = () =>
      dev.forceScene({ typeKey: "reach-out" }) as { personId?: string };
    let forced: { personId?: string };
    let met: PersonId | undefined;
    try {
      forced = force();
    } catch {
      // No one the player knows apart works: they meet someone who does.
      met = meetSomeoneWhoWorks(core, director, me);
      if (!met) {
        passed.push(`${where}: no working townsperson apart would talk`);
        continue;
      }
      try {
        forced = force();
      } catch (error) {
        passed.push(`${where}: met ${met}; ${(error as Error).message}`);
        continue;
      }
    }
    const friend = core.people.get(forced.personId as PersonId)!;
    expect(
      friend.householdId,
      `${where}: dev mode lays off someone in another home`,
    ).not.toBe(player.householdId);
    expect(
      player.knownIds.has(friend.id) || player.familyIds.has(friend.id),
    ).toBe(true);
    const recordId = [...core.durableLog.keys()].find(
      (id) =>
        String(id).startsWith("event:work.job-lost:") &&
        core.durableLog.get(id)?.personIds.includes(friend.id),
    );
    expect(
      recordId,
      `${where}: dev mode's layoff of ${friend.id} wrote work.job-lost`,
    ).toBeDefined();
    const book = director.ledger.people.get(me)!;
    const staged = () =>
      book.schedule.find(
        (entry) =>
          book.momentsById.get(entry.momentId)?.causeId === recordId &&
          entry.bindings.some((b) => b.typeKey === "reach-out"),
      );
    for (let day = 0; day < DAYS && !staged(); day += 1) playDay(core, me);
    const entry = staged();
    const moments = book.moments
      .filter((m) => m.causeId === recordId)
      .map((m) => `${m.label} (${m.causeKind})`);
    expect(
      entry,
      `${where}: ${friend.id}'s layoff ${recordId} stages a call within ${DAYS} days; its moments: ${moments.join(", ") || "none"}`,
    ).toBeDefined();
    const moment = book.momentsById.get(entry!.momentId)!;
    expect(moment.label, where).toBe("circumstance:job-lost-calls");
    const binding = entry!.bindings.find((b) => b.typeKey === "reach-out")!;
    expect(
      binding.roles.find((row) => row.role === "asking")?.personIds,
      `${where}: the one who calls is the one laid off`,
    ).toEqual([friend.id]);
    const result = purposeScene(core, director, me, entry!, {
      typeKey: "reach-out",
    });
    expect(
      result?.kind,
      `${where}: ${result?.kind === "skipped" ? result.reason : "composed"}`,
    ).toBe("composed");
    process.stdout.write(
      `favor-job-played: ${where} (run seed ${seed}); ${friend.id} laid off in ${recordId}; staged ${entry!.date}${met ? `; met ${met} in a talk first` : ""}; passed over ${passed.length ? passed.join("; ") : "none"}\n`,
    );
    return;
  }
  throw new Error(
    `none of ${DRAWS} drawn places has a working player with someone they know in another home to lay off (run seed ${seed}): ${passed.join("; ")}`,
  );
}, 1_800_000);
