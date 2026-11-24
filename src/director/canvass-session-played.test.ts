/**
 * A canvassing session, played (owner, Nov 24, P46 and P47: "you might get
 * 50 signatures. You might not even have a scene. You might get 32 and have 2
 * scenes ... it's just variable"; "after 2 hours, you come across a man
 * mowing his lawn"). A filed player knocks on doors through the campaign day
 * (`campaignDay`, kind "canvass") day after day, the days lived through the
 * player's own clock. Each session gathers what its doors give, and stages a
 * door scene for every door whose resident has a reason of their own
 * (`doorsKnocked`), in the order the session reached them; a session with no
 * such door stages none. Each door scene carries how far into the session it
 * is (`session-hours` or `session-early`, from the door's cause record),
 * never the clock. The place is drawn from all 56 (drawn-place-tests); a
 * place with no race to file for is passed over by name, and the run seed in
 * the GOLDEN_PATH_SEED variable replays a run.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { campaignDay } from "../bench/campaign";
import { announceForOffice, localRaces } from "../bench/government";
import { BenchPlayer } from "../bench/player";
import {
  buildBenchWorld,
  NoPlayerHereError,
  OPENING_WARMUP_DAYS,
} from "../bench/world";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { CAMPAIGNS_MODULE_ID } from "../core2/modules/campaigns";
import { petitionOf, type FilingRow } from "../core2/modules/elections";
import { coreAPI } from "../core2/state";
import { purposeScene } from "./purpose-scene";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const DRAWS = 4;
/** The days of canvassing a place is given to show every kind of session. */
const SESSIONS = 24;
const DOOR = /^circumstance:door-/;

type Race = { contestId: string; mayAnnounce: boolean };
type Packet = { kind: string; pauseId?: string };

it(`a canvassing session gathers what its doors give and stages a scene for each door with a reason (seed ${seed})`, () => {
  setBookkeeping(false);
  const passed: string[] = [];
  for (let draw = 0; draw < DRAWS; draw += 1) {
    const place = drawPlace(seed, `canvass-session:${draw}`);
    const where = `${place.name} (${place.key}), seed ${place.seed}`;
    let world;
    try {
      world = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
        warmUpDays: OPENING_WARMUP_DAYS,
      });
    } catch (error) {
      if (!(error instanceof NoPlayerHereError)) throw error;
      passed.push(`${where}: no player can live here`);
      continue;
    }
    const { core, director } = world;
    const playerId = core.playerId!;
    const race = (localRaces(core) as unknown as { races: Race[] }).races.find(
      (row) => row.mayAnnounce,
    );
    if (!race) {
      passed.push(`${where}: no race to file for on ${core.date}`);
      continue;
    }
    const made = announceForOffice(core, playerId, race.contestId);
    if ((made as { status: string }).status !== "announced") {
      passed.push(`${where}: could not file (${JSON.stringify(made)})`);
      continue;
    }
    const filingId = (made as { filing: FilingRow }).filing.id;
    const player = new BenchPlayer(core, director);
    player.select(playerId);
    const book = director.ledger.people.get(playerId)!;
    const api = coreAPI(core);
    const causes = api.moduleState(CAMPAIGNS_MODULE_ID).table("causes");
    // Live the hours through each pause, as the player's own clock does.
    const live = (step: { packet?: Packet } | undefined) => {
      let packet = step?.packet;
      for (let i = 0; i < 50 && packet && packet.kind !== "complete"; i += 1)
        packet = player.resume({
          kind: packet.kind === "stop" ? "stop" : "own-choice",
          pauseId: packet.pauseId,
        } as never).packet as Packet;
    };
    const sessions: {
      date: string;
      signed: number;
      scenes: { causeId: string; minuteIn: number }[];
    }[] = [];
    for (let session = 0; session < SESSIONS; session += 1) {
      const signedBefore = petitionOf(api, filingId)?.signed ?? 0;
      const day = campaignDay(core, playerId, { filingId, kind: "canvass" });
      director.stageDoors(core, playerId);
      const date = core.date;
      const entries = book.schedule.filter(
        (row) =>
          row.date === date &&
          DOOR.test(book.momentsById.get(row.momentId)?.label ?? ""),
      );
      const scenes = entries.map((entry) => {
        const causeId = book.momentsById.get(entry.momentId)!.causeId;
        const cause = causes.get(causeId) as { minuteIn?: number } | undefined;
        expect(
          cause?.minuteIn,
          `${where}: ${causeId} keeps its minutes into the session`,
        ).toBeTypeOf("number");
        // The scene says how far into the session it is, from the door's record.
        const binding = entry.bindings[0];
        if (binding) {
          const result = purposeScene(core, director, playerId, entry, {
            typeKey: binding.typeKey,
          });
          if (result?.kind === "composed")
            expect(
              result.scene.facts.find((fact) =>
                ["session-hours", "session-early"].includes(fact.key),
              )?.recordIds,
              `${where}: ${causeId}'s scene says where it fell in the session`,
            ).toContain(causeId);
        }
        return { causeId, minuteIn: cause!.minuteIn! };
      });
      // In the order the session reached them.
      expect(
        scenes.map((row) => row.minuteIn),
        `${where}: ${date}'s door scenes in session order`,
      ).toEqual([...scenes.map((row) => row.minuteIn)].sort((a, b) => a - b));
      sessions.push({
        date,
        signed: (petitionOf(api, filingId)?.signed ?? 0) - signedBefore,
        scenes,
      });
      live(player.spend(day.hours) as { packet?: Packet });
      for (let i = 0; i < 4 && core.date === date; i += 1)
        live(player.advance("day") as { packet?: Packet });
      const none = sessions.some((row) => row.scenes.length === 0);
      const several = sessions.some((row) => row.scenes.length >= 2);
      const counts = new Set(sessions.map((row) => row.signed));
      if (none && several && counts.size > 1) {
        const lines = sessions.map(
          (row) =>
            `${row.date} +${row.signed} signed, ${row.scenes.length} door scenes${row.scenes.length ? ` (${row.scenes.map((s) => `${s.causeId} at ${s.minuteIn} min`).join(", ")})` : ""}`,
        );
        process.stdout.write(
          `canvass-session-played: ${where} (run seed ${seed}); ${filingId}\n  ${lines.join("\n  ")}\n  passed over ${passed.length ? passed.join("; ") : "none"}\n`,
        );
        return;
      }
    }
    passed.push(
      `${where}: ${SESSIONS} sessions staged ${sessions.map((row) => row.scenes.length).join(",")} door scenes`,
    );
  }
  throw new Error(
    `none of ${DRAWS} drawn places showed a session with no door scene and one with two or more in ${SESSIONS} days (run seed ${seed}): ${passed.join("; ")}`,
  );
}, 1_800_000);
