import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld, NoPlayerHereError } from "../../../src/bench/world";
import { drawPlace } from "../../../scripts/core2-year/place";
import { setBookkeeping } from "../../../src/core2/bookkeeping";
import { gameStartDate } from "../../../src/core2/game-start";
import { addDays, makeIsoDate } from "../../../src/core2/kernel/dates";
import { advancePlayerV1, resumePlayerV1 } from "../../../src/core2/player-v1";
import { countedJobsOf } from "../../../src/core2/residents-economy";
import { coreAPI } from "../../../src/core2/state";
import type { CoreState, PersonId } from "../../../src/core2/types";
import sceneBank from "../../../data/english/parts/scene-talk.json" with { type: "json" };
import { purposeScene } from "../../../src/director/purpose-scene";
import type { TreeNode } from "../../../src/director/scene-talk";

// Someone the jobs engine hires where the player works is someone the player
// meets: a counted hire at the player's employer is filled in as a full person
// (src/core2/modules/jobs.ts, hireCounted), and the director introduces them
// at work (circumstance `new-coworker`, situation type `first-meeting`,
// purpose introduction) with the scene bank's own lines. Before, only a full
// person's new job counted, and most hires are counted, so the introduction
// came only by chance (CTO order 7139529302, item 5).
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const ATTEMPTS = 4;
const WEEKS = 13;

const linesOf = (node: TreeNode): { parts: string[]; text: string }[] => [
  ...node.lines,
  ...node.replies.flatMap((reply) => [
    reply.line,
    ...(reply.next ? linesOf(reply.next) : []),
  ]),
];

/**
 * A town resident with an open job at a business: the one whose employer has
 * the most positions open now (it is hiring), then the most people, then by id.
 */
function workerAt(core: CoreState, townId: string) {
  const open = new Map<string, number>();
  for (const row of coreAPI(core)
    .moduleState("jobs")
    .table("positions")
    .rows() as unknown as { organizationId: string; status: string }[])
    if (row.status === "open")
      open.set(row.organizationId, (open.get(row.organizationId) ?? 0) + 1);
  const heads = (org: string) =>
    (core.finance.jobsByOrganization.get(org)?.size ?? 0) +
    countedJobsOf(core, org).length;
  const employerOf = (id: string | undefined) => {
    const job = id ? core.jobs.get(id) : undefined;
    return job &&
      job.endsAt === undefined &&
      core.finance.businesses.has(job.organizationId as never)
      ? job.organizationId
      : undefined;
  };
  return [...core.people.values()]
    .filter((p) => p.alive && p.placeId === townId && employerOf(p.jobId))
    .sort((a, b) => {
      const x = employerOf(a.jobId)!,
        y = employerOf(b.jobId)!;
      return (
        (open.get(y) ?? 0) - (open.get(x) ?? 0) ||
        heads(y) - heads(x) ||
        a.id.localeCompare(b.id)
      );
    })[0];
}

it(`a counted hire where the player works is introduced to them at work (seed ${seed})`, () => {
  setBookkeeping(false);
  const passed: string[] = [];
  for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
    const place = drawPlace(
      attempt === 0 ? seed : `${seed}:${attempt}`,
      "new-coworker",
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
    const townId = core.people.get(core.playerId!)!.placeId;
    const worker = workerAt(core, townId);
    if (!worker) {
      passed.push(`${place.name}: no one works at a business`);
      continue;
    }
    // The player is the worker: the case is a hire where they work.
    const personId = worker.id as PersonId;
    core.playerId = personId;
    core.focusPersonIds.add(personId);
    director.watch(core, personId);
    const orgId = core.jobs.get(worker.jobId!)!.organizationId;
    const book = director.ledger.people.get(personId)!;
    const countedHires = () =>
      new Map(
        (
          coreAPI(core)
            .moduleState("jobs")
            .table("changes")
            .rows() as unknown as {
            kind: string;
            personId: string;
            organizationId: string;
            jobId: string;
            values?: { counted?: number };
          }[]
        )
          .filter(
            (row) =>
              row.kind === "hire" &&
              row.organizationId === orgId &&
              row.values?.counted === 1,
          )
          .map((row) => [row.jobId, row]),
      );
    const introduced = () => {
      const hires = countedHires();
      return book.schedule.find((entry) => {
        const moment = book.momentsById.get(entry.momentId);
        return (
          moment?.label === "circumstance:new-coworker" &&
          hires.has(moment.causeId)
        );
      });
    };
    let entry = introduced();
    // A stop only its owner releases (a meeting the worker sits on a board
    // for) holds this clock: the case is passed over, never waited out.
    let held: string | undefined;
    for (let week = 0; week < WEEKS && !entry && !held; week++) {
      let packet = advancePlayerV1(core, {
        controlledPersonId: personId,
        through: { date: addDays(makeIsoDate(core.date), 7), minuteOfDay: 0 },
      });
      while (packet.kind !== "complete") {
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
      entry = introduced();
    }
    if (held) {
      passed.push(`${place.name}: the worker's clock is held by ${held}`);
      continue;
    }
    if (!entry) {
      passed.push(
        `${place.name}: no counted hire at ${orgId} in ${WEEKS} weeks (${countedHires().size} hired)`,
      );
      continue;
    }
    const where = `${place.name} (${place.key}) seed ${place.seed}`;
    const moment = book.momentsById.get(entry.momentId)!;
    const hire = countedHires().get(moment.causeId)!;
    // The hire is a full person now, holding the job the engine hired them to.
    const hired = core.people.get(hire.personId as never);
    expect(hired, where).toBeTruthy();
    expect(hired?.jobId, where).toBe(hire.jobId);
    expect(core.jobs.get(hire.jobId as never)?.organizationId, where).toBe(
      orgId,
    );
    expect(moment.counterpartIds, where).toContain(hire.personId);
    const result = purposeScene(core, director, personId, entry);
    expect(result?.kind, `${where}: ${JSON.stringify(result)}`).toBe(
      "composed",
    );
    if (result?.kind !== "composed") return;
    // Every line is the scene bank's (W8's lines), none written here.
    const bank = new Set(
      (sceneBank as unknown as { parts: { key: string }[] }).parts.map(
        (part) => part.key,
      ),
    );
    const talk = result.scene.talk;
    const lines = [...talk.lines, ...linesOf(talk.tree)];
    expect(talk.state.text.trim(), where).not.toBe("");
    for (const line of lines)
      for (const key of line.parts)
        if (key.startsWith("scene-talk."))
          expect(bank.has(key), `${where}: ${key}`).toBe(true);
    process.stdout.write(
      `new-coworker: ${where}; passed over ${passed.join("; ") || "none"}; ` +
        `player ${personId} at ${orgId}; hire ${hire.jobId} (${hire.personId}) on ${core.date}; ` +
        `the newcomer: "${talk.open?.text ?? talk.state.text}"\n`,
    );
    return;
  }
  throw new Error(
    `No drawn place hired where the player works: ${passed.join("; ")}`,
  );
}, 1_800_000);
