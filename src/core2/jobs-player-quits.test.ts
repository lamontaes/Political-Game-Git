/**
 * The player leaves their job by their own press (Leave this job; owner, Nov 14). In the played world
 * at a place pinned below: the player takes a job offered through the jobs engine, works it, then
 * quits through `quitJob`, the call the bench's Leave this job button makes. Shown: the household's
 * cash and the employer's staffing before and after, that the pay stops, that the employer opens the
 * role again, and that the director reads the end as a job left (never a lost one).
 */
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { gameStartDate } from "./game-start";
import { drawPlace } from "../../scripts/core2-year/place";
import { advanceCore } from "./life";
import { coreAPI } from "./state";
import { setBookkeeping } from "./bookkeeping";
import { addDays, makeIsoDate } from "./kernel/dates";
import { P } from "./parameters";
import { advancePlayerV1, resumePlayerV1 } from "./player-v1";
import { purposeScene } from "../director/purpose-scene";
import { personCard } from "../bench/card";
import { leaveJobAs } from "../bench/openings";
import {
  acceptJobOffer,
  jobLeaveBlock,
  jobOffersFor,
  JOBS_MODULE_ID,
} from "./modules/jobs";

// Pinned in this file (pinned-tests): the place is drawn from this seed, the same every run.
// Marlborough, New Hampshire (place key 3345380) for this seed: 12 on staff, a job offered by April.
const SEED = "quit-job-3";

describe(
  "the player leaves a job by their own press",
  { timeout: 300_000 },
  () => {
    it("ends the pay, opens the role again and is read as a job left", () => {
      setBookkeeping(false);
      const place = drawPlace(SEED, "player-quits-job");
      const { core, director } = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
      const api = coreAPI(core);
      const playerId = core.playerId!;
      for (let weeks = 0; weeks < 52; weeks += 4) {
        if (jobOffersFor(api, playerId).length) break;
        advanceCore(core, addDays(makeIsoDate(core.date), 28));
      }
      const offer = jobOffersFor(api, playerId)[0];
      console.log(`quit-job: ${place.name} (${place.key}), offer ${offer?.id}`);
      expect(
        offer,
        `no offer at ${place.name} (${place.key}), seed ${SEED}`,
      ).toBeDefined();
      expect(acceptJobOffer(api, offer!.id)).toBe(true);
      const player = core.people.get(playerId)!;
      const jobId = player.jobId!;
      // Work it a month.
      const cashAtHire = player.liquidMinor;
      advanceCore(core, addDays(makeIsoDate(core.date), 30));
      console.log(
        `quit-job: a month at work moved the player's cash ${player.liquidMinor - cashAtHire}`,
      );
      expect(player.jobId).toBe(jobId);
      // Press it on whatever day it is, a day already worked included: the shift stands and is paid,
      // and the job's end date is then tomorrow.
      const workedToday =
        core.work.lastAttendanceByJob.get(jobId)?.date === core.date;
      expect(jobLeaveBlock(api, playerId)).toBeNull();
      expect(personCard(core, playerId).job?.leave).toBeNull();

      const org = core.jobs.get(jobId)!.organizationId;
      const state = () => {
        const t = api.moduleState(JOBS_MODULE_ID);
        return {
          // The player's household: everyone living there, the player's own cash first.
          household: [...core.people.values()]
            .filter((p) => p.householdId === player.householdId)
            .reduce((sum, p) => sum + p.liquidMinor, 0),
          own: player.liquidMinor,
          staff: [...(core.finance.jobsByOrganization.get(org) ?? [])].filter(
            (id) => core.jobs.get(id)?.endsAt === undefined,
          ).length,
          need: (t.table("employers").get(org) as { need?: number } | undefined)
            ?.need,
          open: (
            t.table("positions").rows() as {
              organizationId: string;
              status: string;
            }[]
          ).filter((r) => r.organizationId === org && r.status === "open")
            .length,
        };
      };
      core.focusPersonIds.add(playerId);
      director.watch(core, playerId);
      // Days as the bench plays them: the player's own clock, the character making its own pick.
      const play = (days: number) => {
        let packet = advancePlayerV1(core, {
          controlledPersonId: playerId,
          through: {
            date: addDays(makeIsoDate(core.date), days),
            minuteOfDay: P.zero,
          },
        });
        while (packet.kind !== "complete")
          packet = resumePlayerV1(core, {
            kind: packet.kind === "stop" ? "stop" : "own-choice",
            pauseId: packet.pauseId,
          });
      };
      const before = state();
      const pressed = core.date;
      const result = leaveJobAs(core, playerId);
      console.log(
        `quit-job: before ${JSON.stringify(before)}; ${JSON.stringify(result)}; after ${JSON.stringify(state())}`,
      );
      expect(result.left).toBe(true);
      expect(player.jobId).toBeUndefined();
      expect(core.jobs.get(jobId)!.endsAt).toBe(
        workedToday ? addDays(makeIsoDate(core.date), 1) : core.date,
      );
      console.log(`quit-job: worked that day ${workedToday}`);
      expect(personCard(core, playerId).job).toBeUndefined();
      // The director reads the end as a job left, never a job lost.
      expect(api.knows(playerId, `job:${jobId}:status`)?.sourceId).toBe(
        `jobs:left-work:${core.date}`,
      );
      const change = api
        .moduleState(JOBS_MODULE_ID)
        .table("changes")
        .get(result.left ? result.id : "") as
        { kind: string; decidedBy: string } | undefined;
      expect(change).toMatchObject({ kind: "left-work", decidedBy: playerId });
      const after = state();
      expect(after.staff).toBe(before.staff - 1);
      expect(after.need).toBeGreaterThan(before.need!);
      // The day after, as the bench plays it: the director reads a job left (a farewell with the former
      // coworkers at the workplace), never a job lost.
      play(3);
      const book = director.ledger.people.get(playerId)!;
      const moments = [...book.momentsById.values()].map((m) => m.label);
      console.log(
        `quit-job: moments ${JSON.stringify(moments.filter((l) => l.startsWith("money:")))}`,
      );
      expect(moments).toContain("money:job-left");
      expect(moments).not.toContain("money:job-ended");
      // The farewell with the former coworkers is staged from that moment and composes.
      const entry = book.schedule.find((row) =>
        row.bindings.some((b) => b.typeKey === "last-day"),
      );
      expect(entry, "the farewell is on the schedule").toBeDefined();
      const scene = purposeScene(core, director, playerId, entry!, {
        typeKey: "last-day",
      });
      expect(scene?.kind).toBe("composed");
      if (scene?.kind === "composed")
        console.log(
          `quit-job: farewell\n${scene.scene.talk.lines.map((l) => `  ${l.speaker}: ${l.text}`).join("\n")}\n  replies: ${scene.scene.talk.tree.replies.map((r) => r.line.text).join(" | ")}`,
        );
      // Pay stops: no shift is worked at the job after the day it ended, and its work commitment ends
      // that day. (Pay for days already worked is still owed and paid in arrears, as for any leaver.)
      const pressedOn = pressed;
      play(35);
      const later = state();
      console.log(`quit-job: after 35 days ${JSON.stringify(later)}`);
      const lastShift = core.work.lastAttendanceByJob.get(jobId)?.date;
      expect(lastShift === undefined || lastShift <= pressedOn).toBe(true);
      for (const id of core.work.commitmentsByPerson.get(playerId) ?? [])
        if (core.work.commitments.get(id)!.jobId === jobId)
          expect(core.work.commitments.get(id)!.endsAt).toBe(pressedOn);
      expect(player.jobId).toBeUndefined();
    });
  },
);
