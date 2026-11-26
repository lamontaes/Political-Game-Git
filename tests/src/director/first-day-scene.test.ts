import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld, NoPlayerHereError } from "../../../src/bench/world";
import { drawPlace } from "../../../scripts/core2-year/place";
import { setBookkeeping } from "../../../src/core2/bookkeeping";
import { gameStartDate } from "../../../src/core2/game-start";
import { addDays, ageOnDate, makeIsoDate } from "../../../src/core2/kernel/dates";
import { applyForOpening } from "../../../src/core2/modules/jobs";
import { advancePlayerV1, resumePlayerV1 } from "../../../src/core2/player-v1";
import { coreAPI } from "../../../src/core2/state";
import type { CoreState, PersonId } from "../../../src/core2/types";
import sceneBank from "../../../data/english/parts/scene-talk.json" with { type: "json" };
import { purposeScene, replyInScene } from "../../../src/director/purpose-scene";
import type { ScheduleEntry } from "../../../src/director/scheduling";
import type { TreeNode } from "../../../src/director/scene-talk";

// The player's first day at a job they took stops the day at work: the
// player applies for the town's openings (the Openings screen's own call),
// takes the offer on the employer's call (the scene's own yes, said while
// the clock is paused on the call), and the director stages first-day
// (purpose first-day-ropes) from the player's own pay change
// (money:job-started), their own record, and the player's clock stops for
// it. Before, it was filed as a journal line, fell under the moment floor
// for a small job, or its stop sat on the call's paused minute and was
// answered with the call (CTO order 7139529302, item 5).
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const ATTEMPTS = 4;
const WEEKS = 12;

const linesOf = (node: TreeNode): { parts: string[]; text: string }[] => [
  ...node.lines,
  ...node.replies.flatMap((reply) => [
    reply.line,
    ...(reply.next ? linesOf(reply.next) : []),
  ]),
];

/** The player, or the first jobless working-age adult at home in town when the player works. */
function joblessAdult(core: CoreState) {
  const player = core.people.get(core.playerId!)!;
  const adult = (birthDate: string) => {
    const age = ageOnDate(makeIsoDate(birthDate), makeIsoDate(core.date));
    return age >= 18 && age < 60;
  };
  if (!player.jobId && adult(player.birthDate)) return player;
  return [...core.people.values()]
    .filter(
      (p) =>
        p.alive &&
        p.placeId === player.placeId &&
        !p.jobId &&
        adult(p.birthDate) &&
        core.households.has(p.householdId),
    )
    .sort((a, b) => a.id.localeCompare(b.id))[0];
}

it(`the player's first day at a job they took stops the day at work (seed ${seed})`, () => {
  setBookkeeping(false);
  const passed: string[] = [];
  for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
    const place = drawPlace(
      attempt === 0 ? seed : `${seed}:${attempt}`,
      "first-day",
    );
    let world;
    try {
      world = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
    } catch (error) {
      if (error instanceof NoPlayerHereError) {
        passed.push(`${place.name}: no player here`);
        continue;
      }
      throw error;
    }
    const { core, director } = world;
    const api = coreAPI(core);
    const person = joblessAdult(core);
    if (!person) {
      passed.push(`${place.name}: no jobless adult`);
      continue;
    }
    const personId = person.id as PersonId;
    core.playerId = personId;
    core.focusPersonIds.add(personId);
    if (!director.ledger.people.has(personId)) director.watch(core, personId);
    const book = director.ledger.people.get(personId)!;
    let taken: string | undefined;
    let entry: ScheduleEntry | undefined;
    let held: string | undefined;
    const stoppedFor = new Set<string>();
    const answered = new Set<string>();
    for (let week = 0; week < WEEKS && !held; week++) {
      // Each week the player applies for what the town has open.
      if (!taken)
        for (const row of api
          .moduleState("jobs")
          .table("positions")
          .rows() as unknown as { id: string; status: string }[])
          if (row.status === "open") applyForOpening(api, row.id);
      let packet = advancePlayerV1(core, {
        controlledPersonId: personId,
        through: { date: addDays(makeIsoDate(core.date), 7), minuteOfDay: 0 },
      });
      while (packet.kind !== "complete") {
        if (packet.kind === "stop") {
          for (const row of packet.stop.modules) stoppedFor.add(row.recordId);
          // The employer's call: the player says yes in the scene.
          const call = taken
            ? undefined
            : book.schedule.find(
                (row) =>
                  !answered.has(row.momentId) &&
                  row.bindings.some((b) => b.typeKey === "job-offer"),
              );
          if (call) {
            answered.add(call.momentId);
            const composed = purposeScene(core, director, personId, call);
            const yes =
              composed?.kind === "composed"
                ? composed.scene.talk.tree.replies.findIndex(
                    (reply) => reply.line.move === "agree",
                  )
                : -1;
            if (yes >= 0 && replyInScene(core, director, personId, call, [yes]))
              taken = core.people.get(personId)?.jobId;
          }
        }
        const next = resumePlayerV1(core, {
          kind: packet.kind === "stop" ? "stop" : "own-choice",
          pauseId: packet.pauseId,
        } as never);
        if (next.kind === "stop" && next.pauseId === packet.pauseId) {
          held = next.stop.modules.map((row) => row.recordId).join(", ");
          break;
        }
        packet = next;
      }
      entry = book.schedule.find(
        (row) =>
          book.momentsById.get(row.momentId)?.label === "money:job-started" &&
          row.bindings.some((b) => b.typeKey === "first-day"),
      );
      if (entry && stoppedFor.has(entry.momentId)) break;
    }
    if (held) {
      passed.push(`${place.name}: the clock is held by ${held}`);
      continue;
    }
    if (!entry) {
      passed.push(
        `${place.name}: ${taken ? `took ${taken}, no first day` : "no offer"} in ${WEEKS} weeks`,
      );
      continue;
    }
    const where = `${place.name} (${place.key}) seed ${place.seed}`;
    const moment = book.momentsById.get(entry.momentId)!;
    const job = core.jobs.get(core.people.get(personId)!.jobId ?? "");
    // The job the player took, starting that day, is the cause.
    expect(moment.causeId, where).toBe(job?.id);
    expect(moment.selfNamed, where).toBe(true);
    // It stops the player's day at work, never only the Journal's line, and
    // the player's clock stopped for it.
    expect(entry.outcome, where).toBe("scene-now");
    expect(entry.stopsBecause, where).toContain("stops-day");
    expect(stoppedFor.has(entry.momentId), `${where}: the clock stopped`).toBe(
      true,
    );
    const result = purposeScene(core, director, personId, entry);
    expect(result?.kind, `${where}: ${JSON.stringify(result)}`).toBe(
      "composed",
    );
    if (result?.kind !== "composed") return;
    const talk = result.scene.talk;
    expect(talk.state.text.trim(), where).not.toBe("");
    const bank = new Set(
      (sceneBank as unknown as { parts: { key: string }[] }).parts.map(
        (part) => part.key,
      ),
    );
    for (const line of [...talk.lines, ...linesOf(talk.tree)])
      for (const key of line.parts)
        if (key.startsWith("scene-talk."))
          expect(bank.has(key), `${where}: ${key}`).toBe(true);
    process.stdout.write(
      `first-day: ${where}; passed over ${passed.join("; ") || "none"}; ` +
        `player ${personId} took ${taken}; job ${job?.id} began ${entry.date}; ` +
        `"${talk.open?.text ?? talk.state.text}"\n`,
    );
    return;
  }
  throw new Error(
    `No drawn place gave the player a first day: ${passed.join("; ")}`,
  );
}, 1_800_000);
