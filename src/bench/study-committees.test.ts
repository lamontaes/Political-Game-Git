import { buildBenchWorld } from "./world";
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { gameStartDate } from "../core2/game-start";
import { POLICY_QUESTIONS } from "../core2/policy-answers";
import { studiesOf } from "../core2/modules/legislature";
import { stanceRow } from "../core2/modules/views";
import { advanceCore } from "../core2/life";
import { makeIsoDate } from "../core2/kernel/dates";
import { coreAPI } from "../core2/state";
import { BenchPlayer } from "./player";
import { DevMode } from "./dev-mode";

// A body that cannot settle a bill sends it to a study committee: the committee, its sunset, its
// report, the chair's speech to the body and a member's view moving by it, by record id. A place
// drawn from all 56 on a seed nobody chose.
const seed =
  process.env.STUDY_SEED ??
  process.env.GOLDEN_PATH_SEED ??
  randomBytes(8).toString("hex");

describe(`study committees (seed ${seed})`, () => {
  it("a bill that fails narrowly forms a committee, which reports at its sunset and is heard", () => {
    const tried: string[] = [];
    for (let i = 0; i < 6; i += 1) {
      const place = drawPlace(`${seed}:${i}`, "study-committees");
      const world = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
      const api = coreAPI(world.core);
      const dev = new DevMode(
        world.core,
        world.director,
        new BenchPlayer(world.core, world.director),
        world.placeId,
      );
      const where = `${place.name} (${place.key}), seed ${place.seed}`;
      for (const body of dev
        .lawmakingBodies()
        .filter((b) => b.members.length > 2)) {
        for (const question of Object.keys(POLICY_QUESTIONS)) {
          const filed = dev.introduce({
            bodyOfficeId: body.id,
            sponsorId: body.members[0]!.key,
            series: question,
            value: 1,
          }).bill;
          if (filed.status === "blocked") continue;
          // Every member votes their own position.
          const result = dev.decideAt(filed.id, -1, {});
          const studies = studiesOf(api, filed.id);
          if (result.bill.status !== "failed" || !studies.length) continue;
          const study = studies[0]!;
          expect(study.memberIds.length, where).toBeGreaterThan(0);
          expect(study.chairId, where).toBe(filed.sponsorId);
          expect(study.sunsetOn > world.core.date, where).toBe(true);
          // The sunset: advance to it and the report is a record.
          advanceCore(world.core, makeIsoDate(study.sunsetOn));
          const reported = studiesOf(api, filed.id)[0]!;
          expect(
            reported.report,
            `${where}: ${study.id} reported`,
          ).toBeDefined();
          if (reported.report!.speechId) {
            // A member of the body heard the chair, and their view of the question carries it.
            const heard = [...world.core.people.values()].find((p) =>
              stanceRow(api, p.id, study.topic!)?.causes.some(
                (c) => c.eventId === reported.report!.speechId,
              ),
            );
            expect(
              heard,
              `${where}: a member's view moved by ${reported.report!.speechId}`,
            ).toBeDefined();
          }
          process.stderr.write(
            `study: ${where} ${body.kind} ${filed.id} formed ${study.formedOn} (${study.memberIds.length} members), reported ${reported.report!.on} finding ${reported.report!.finding.toFixed(2)}\n`,
          );
          return;
        }
      }
      tried.push(`${where}: no bill formed a committee`);
    }
    throw new Error(
      `no drawn place formed a study committee (seed ${seed}): ${tried.join("; ")}`,
    );
  }, 3_600_000);
});
