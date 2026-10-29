/**
 * No scene at midnight (owner, Oct 27, 4 PM Eastern: offices and cafes open
 * at midnight with daylight in the windows; volunteers in the bedroom at
 * midnight). A filed candidate in a drawn place plays Week after Week for
 * half a year as the play screen drives them. Every stop the story director
 * makes lands inside the hours its scene's setting keeps (director.json
 * settingHours), and the scene is drawn at that hour.
 */
import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "./world";
import { BenchPlayer } from "./player";
import { gameStartDate } from "../core2/game-start";
import { parameter } from "../core2/parameters";
import { fileCandidacy, openContests } from "../core2/modules/elections";
import { PLATFORM_QUESTIONS } from "../core2/campaign-views";
import { coreAPI } from "../core2/state";
import {
  declineJobOffer,
  jobOffersFor,
  JOBS_MODULE_ID,
} from "../core2/modules/jobs";
import type { CoreState } from "../core2/types";
import directorJson from "../director/data/director.json" with { type: "json" };

const runSeed =
  process.env.GOLDEN_PATH_SEED ??
  createHash("sha256").update(`scene-hours:${Date.now()}`).digest("hex");
const HOURS = directorJson.settingHours.rows as Record<
  string,
  { opens: number | null; closes: number }
>;

it(
  "every story stop lands inside its setting's hours",
  { timeout: 900_000 },
  () => {
    const place = drawPlace(runSeed, "scene-hours");
    const where = `${place.name}, ${place.state} (${place.key}), run seed ${runSeed}, place seed ${place.seed}`;
    const { core, director, playerId } = buildBenchWorld(
      place.seed,
      gameStartDate(),
      { twoLevel: true, placeKey: place.key },
    );
    const api = coreAPI(core as CoreState);
    // A local race, so the season's scenes come.
    for (const contest of openContests(api)) {
      if (contest.level === "federal" || contest.level === "state") continue;
      const filed = fileCandidacy(api, {
        personId: playerId!,
        contestId: contest.id,
        platform: [`${PLATFORM_QUESTIONS[0]}=1`],
      });
      if (
        filed.status !== "refused" &&
        ["petitioning", "on-ballot"].includes(filed.filing.status ?? "")
      )
        break;
    }
    const start = parameter("playerDayStartMinute", core.data.parameters);
    const player = new BenchPlayer(core as CoreState, director);
    player.select(playerId!);
    const seen: string[] = [];
    for (let week = 0; week < 26; week++) {
      let packet = player.advance("week").packet;
      for (let guard = 0; packet.kind !== "complete" && guard < 400; guard++) {
        if (packet.kind === "stop") {
          for (const row of packet.stop.modules) {
            if (row.moduleId !== "p13-story-director") continue;
            const entry = director.ledger.people
              .get(playerId as never)
              ?.schedule.find((e) => e.momentId === row.recordId);
            const kind = entry?.bindings[0]?.setting.kind ?? "home";
            const hours = HOURS[kind];
            const opens = hours?.opens ?? start;
            const minute = packet.at.minuteOfDay;
            seen.push(
              `${packet.at.date} ${Math.floor(minute / 60)}:${String(minute % 60).padStart(2, "0")} ${kind} ${row.recordId}`,
            );
            expect(minute, `${row.recordId} at midnight: ${where}`).not.toBe(0);
            if (hours) {
              expect(
                minute,
                `${row.recordId} before ${kind} opens: ${where}`,
              ).toBeGreaterThanOrEqual(opens);
              expect(
                minute,
                `${row.recordId} after ${kind} closes: ${where}`,
              ).toBeLessThan(hours.closes);
            }
          }
          // A job offer's deadline holds the clock until it is answered: it
          // is turned down, so the week goes on.
          if (packet.stop.modules.some((m) => m.moduleId === JOBS_MODULE_ID))
            for (const offer of jobOffersFor(api, playerId!))
              declineJobOffer(api, offer.id);
          packet = player.resume({
            kind: "stop",
            pauseId: packet.pauseId,
          }).packet;
        } else if (packet.kind === "choice") {
          packet = player.resume({
            kind: "choice",
            pauseId: packet.pauseId,
            offerId: packet.offers[0]!.offerId,
          }).packet;
        } else break;
      }
      if (player.pollingPlace) player.leavePolls();
    }
    // The proof, by place, seed and record id (the runner keeps no console).
    writeFileSync(
      path.join(tmpdir(), "scene-hours-proof.txt"),
      `${where}\n${seen.length} story stops:\n${seen.join("\n")}\n`,
    );
    expect(
      seen.length,
      `no story stop in half a year: ${where}`,
    ).toBeGreaterThan(0);
  },
);
