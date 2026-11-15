/**
 * A put-off job offer is called back once, on the offer's last day (Words
 * lead, Nov 15, class E; jobs.ts keepPutOff). In a pinned place the player is
 * let go by the jobs engine's own path and waits for employers to pick them,
 * as job-offer-through-person.test.ts does. Each offer is put off a different
 * way in its own scene: "Can I think it over and call you back?", "I'd like
 * to talk it over at home first.", and a question then "I can't decide this
 * right now.". On each call back the offerer opens on what was said, the
 * player gets yes and no only, and the answer is the jobs engine's: a no
 * declines the offer (so the next employer may pick them), the last yes hires
 * them.
 */
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { applyChosenPerson } from "../bench/creator";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import {
  JOB_OFFERED_EVENT,
  JOBS_MODULE_ID,
  layOff,
  type JobOfferRow,
} from "../core2/modules/jobs";
import { coreAPI } from "../core2/state";
import type { PersonId } from "../core2/types";
import { purposeScene, replyInScene } from "./purpose-scene";
import type { SceneTalk } from "./scene-talk";
import type { ScheduleEntry } from "./scheduling";

const seed = process.env.JOB_CALL_BACK_SEED ?? "pin-job-call-back";
const DRAWS = Number(process.env.JOB_CALL_BACK_DRAWS ?? 1);
const FIRST = Number(process.env.JOB_CALL_BACK_FIRST ?? 0);

/** How each offer is put off, in order, and what the call back opens on. */
const WAYS = [
  {
    path: [
      "stall:scene-talk.reply-stall.can-i-think-it-over-and-call-you-back",
    ],
    open: "You were going to call me back about the job.",
    state: "I have to fill it. Do you want it?",
  },
  {
    path: [
      "stall:scene-talk.reply-stall.i-d-like-to-talk-it-over-at-home-first",
    ],
    open: "You wanted to talk it over at home.",
    state: "I have to fill the job. Do you want it?",
  },
  {
    path: ["ask", "leave:scene-talk.reply-leave.i-can-t-decide-this-right-now"],
    open: "We didn't finish talking about the job.",
    state: "I have to fill it today. Do you want it?",
  },
];

interface Seen {
  way: number;
  first: SceneTalk;
  said: string[];
  again?: SceneTalk;
  answer?: "agree" | "decline";
  status?: string;
}

function play(draw: number): { where: string; seen: Seen[] } | string {
  const place = drawPlace(`${seed}:${draw}`, "job-offer-call-back");
  const where = `${place.name} (${place.key}), seed ${seed}:${draw}`;
  setBookkeeping(false);
  const world = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const { core, director } = world;
  const me = world.playerId! as PersonId;
  applyChosenPerson(core, me, {
    givenName: "Pat",
    familyName: core.people.get(me)!.familyName,
    gender: "female",
    birthYear: 1985,
    birthMonth: 6,
    birthDay: 1,
  });
  const api = coreAPI(core);
  director.watch(core, me);
  for (let tries = 0; core.people.get(me)!.jobId && tries < 14; tries += 1) {
    const job = core.jobs.get(core.people.get(me)!.jobId!)!;
    layOff(api, job.organizationId, [job], 1, {});
    if (core.people.get(me)!.jobId)
      advanceCore(core, addDays(makeIsoDate(core.date), 1));
  }
  if (core.people.get(me)!.jobId) return `${where}: the player was not let go`;
  const offers = api.moduleState(JOBS_MODULE_ID).table("offers");
  const seen = new Map<string, Seen>();
  const done = new Set<string>();
  const sceneFor = (entry: ScheduleEntry) => {
    const result = purposeScene(core, director, me, entry, {
      typeKey: "job-offer",
    });
    return result?.kind === "composed" ? result.scene : undefined;
  };
  const end = addDays(makeIsoDate(core.date), 7 * 40);
  while (
    core.date < end &&
    !(seen.size === WAYS.length && [...seen.values()].every((row) => row.again))
  ) {
    advanceCore(core, addDays(makeIsoDate(core.date), 1));
    for (const entry of director.ledger.people.get(me)!.schedule) {
      if (done.has(entry.momentId)) continue;
      if (!entry.bindings.some((row) => row.typeKey === "job-offer")) continue;
      done.add(entry.momentId);
      const scene = sceneFor(entry);
      if (!scene) continue;
      const cause = core.durableLog.get(scene.cause.id as never)!;
      if (cause.kind !== JOB_OFFERED_EVENT) continue;
      const offerId = String(cause.facts!.offerId);
      const tree = scene.talk.tree;
      if (cause.facts?.again !== "yes") {
        if (seen.has(offerId) || seen.size >= WAYS.length) continue;
        const way = seen.size;
        // Walk the put-off's path: a move, or a move and its bank part.
        const path: number[] = [];
        const said: string[] = [];
        let node = tree;
        for (const step of WAYS[way]!.path) {
          const [move, piece] = step.split(":");
          const at = node.replies.findIndex(
            (r) =>
              r.line.move === move && (!piece || r.line.parts[0] === piece),
          );
          if (at < 0) return `${where}: offer ${way + 1} has no ${step}`;
          path.push(at);
          said.push(node.replies[at]!.line.text);
          node = node.replies[at]!.next!;
        }
        expect(
          replyInScene(core, director, me, entry, path, {
            typeKey: "job-offer",
          }),
          where,
        ).toBeTruthy();
        seen.set(offerId, { way, first: scene.talk, said });
        continue;
      }
      const row = seen.get(offerId);
      expect(row, `${where}: a call back only after a put-off`).toBeTruthy();
      expect(row!.again, `${where}: one call back per offer`).toBeUndefined();
      row!.again = scene.talk;
      // No to the first two, so the next employer may pick the player; yes
      // to the last.
      row!.answer = row!.way === WAYS.length - 1 ? "agree" : "decline";
      const at = tree.replies.findIndex((r) => r.line.move === row!.answer);
      expect(
        at,
        `${where}: the call back offers ${row!.answer}`,
      ).toBeGreaterThan(-1);
      expect(
        replyInScene(core, director, me, entry, [at], { typeKey: "job-offer" }),
        where,
      ).toBeTruthy();
      row!.status = (offers.get(offerId) as unknown as JobOfferRow).status;
    }
  }
  if (seen.size < WAYS.length || [...seen.values()].some((row) => !row.again))
    return `${where}: ${seen.size} offers, ${[...seen.values()].filter((r) => r.again).length} called back in 40 weeks`;
  return { where, seen: [...seen.values()] };
}

// Three offers, each to its last day, at one pinned place.
it("a put-off job offer is called back on its last day, on what was said, with yes and no only", () => {
  const tried: string[] = [];
  for (let draw = FIRST; draw < FIRST + DRAWS; draw += 1) {
    const played = play(draw);
    if (typeof played === "string") {
      tried.push(played);
      continue;
    }
    const { where, seen } = played;
    for (const row of seen) {
      const way = WAYS[row.way]!;
      const label = `${where}: after ${row.said.join(" / ")}`;
      process.stdout.write(
        `job-offer-call-back: ${label}: ${row.again!.open?.text} ${row.again!.state.text} -> ${row.answer} (${row.status})\n`,
      );
      expect(row.again!.open?.text, label).toBe(way.open);
      expect(row.again!.state.text, label).toBe(way.state);
      expect(
        row.again!.tree.replies.map((r) => r.line.move).sort(),
        label,
      ).toEqual(["agree", "decline"]);
      expect(row.first.open?.text, label).not.toBe(way.open);
      expect(row.status, label).toBe(
        row.answer === "agree" ? "accepted" : "declined",
      );
    }
    return;
  }
  throw new Error(tried.join("; "));
}, 600_000);
