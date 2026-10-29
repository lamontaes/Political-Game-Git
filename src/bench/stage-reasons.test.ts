/**
 * Nobody stands in a room without a reason on record (play-first-07). The first month of a drawn life is played day by day: every person
 * the home or work scene draws, and every person a stopping moment's scene
 * draws, carries a reason the records bear out, and no narration announces
 * someone as merely there.
 */
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import type { CoreState } from "../core2/types";
import { buildBenchWorld } from "./world";
import { BenchPlayer, ownPick } from "./player";
import { benchScene, stagePeople, type BenchScenePerson } from "./scene";
import { storyScene } from "./story";
import { plateFor } from "./mannequin-plates";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import staging from "../../art/backdrops/staging.json" with { type: "json" };

const runSeed =
  process.env.GOLDEN_PATH_SEED ??
  createHash("sha256").update(`stage-reasons:${Date.now()}`).digest("hex");

/** The organizations a person holds a current job at. */
const orgsOf = (core: CoreState, id: string) =>
  new Set(
    [...core.jobs.values()]
      .filter((job) => job.personId === id && !job.endsAt)
      .map((job) => job.organizationId),
  );

/** The narrator's removed sentences: someone announced as merely there. */
const MERELY_THERE = /\b(is|are) (here|there|with you|waiting for you)\./;

describe("people in a room", () => {
  it("are drawn only with a reason", () => {
    // A painted room, and someone handed to it with no reason: set aside
    // before any figure is chosen, never drawn.
    const room = Object.keys(staging.places)[0]!;
    const { people, unplaced } = stagePeople({} as CoreState, room, [
      { id: "someone", name: "Some One" } as never,
    ]);
    expect(people).toEqual([]);
    expect(unplaced).toEqual([{ personId: "someone", reason: "no-reason" }]);
  });

  it(
    "carry a reason the records bear out, over a drawn life's first month",
    { timeout: 1_500_000 },
    () => {
      setBookkeeping(false);
      const place = drawPlace(runSeed, "play-first-07");
      const where = `${place.name}, ${place.state} (${place.key}), run seed ${runSeed}, place seed ${place.seed}`;
      console.log(where);
      const world = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
      const core = world.core as CoreState;
      const me = world.playerId!;
      const player = new BenchPlayer(core, world.director);
      player.select(me);
      const household = () =>
        new Set(
          core.households.get(core.people.get(me)!.householdId)?.memberIds,
        );
      const seen = { scenes: 0, plated: 0, people: 0, moments: 0 };
      const check = (
        people: readonly BenchScenePerson[],
        allowed: Record<string, (id: string) => boolean>,
        at: string,
      ) => {
        seen.people += people.length;
        for (const person of people) {
          const holds = allowed[person.reason];
          expect(
            holds,
            `${person.name} stands with reason "${person.reason}" ${at}: ${where}`,
          ).toBeDefined();
          expect(
            holds!(person.personId),
            `${person.name}'s reason "${person.reason}" is not on record ${at}: ${where}`,
          ).toBe(true);
        }
      };
      const end = addDays(makeIsoDate(core.date), 30);
      let r = player.advance("day");
      for (let step = 0; step < 400 && core.date < end; step++) {
        const packet = r.packet as never as {
          kind: string;
          at: { date: string; minuteOfDay: number };
          pauseId?: string;
          stop?: { modules?: { moduleId: string; recordId: string }[] };
        };
        // The day's rooms in the morning, at noon and in the evening.
        for (const minuteOfDay of [8 * 60, 12 * 60, 18 * 60]) {
          const at = `on ${packet.at.date} at minute ${minuteOfDay}`;
          const scene = benchScene(core, me, {
            ...(r.packet as object),
            at: { ...packet.at, minuteOfDay },
          } as never);
          seen.scenes++;
          // A picture with no mannequin plate draws nobody (owner, Oct 28 and 29).
          if (plateFor(scene.backdrop.file)) seen.plated++;
          else expect(scene.people, `at ${scene.place} ${at}`).toEqual([]);
          check(
            scene.people,
            {
              you: (id) => id === me,
              household: (id) => household().has(id),
              coworker: (id) =>
                [...orgsOf(core, id)].some((org) => orgsOf(core, me).has(org)),
              act: (id) => core.people.has(id),
            },
            `at ${scene.place} ${at}`,
          );
        }
        if (packet.kind === "stop") {
          if (player.pollingPlace) player.leavePolls();
          r = player.resume({ kind: "stop", pauseId: packet.pauseId! });
        } else if (packet.kind === "choice") {
          r = player.resume({
            kind: "choice",
            pauseId: packet.pauseId!,
            offerId: ownPick(r.packet as never)!.offerId,
          });
        } else {
          if (player.pollingPlace) player.leavePolls();
          r = player.advance("day");
        }
      }
      // Every moment the director scheduled for the player this month, as its
      // scene would stage it.
      const book = world.director.ledger.people.get(me);
      for (const entry of book?.schedule ?? []) {
        const moment = book!.momentsById.get(entry.momentId);
        let story: ReturnType<typeof storyScene>;
        try {
          story = storyScene(core, world.director, me, entry.momentId, 18 * 60);
        } catch (error) {
          if (
            error instanceof Error &&
            error.message === "This moment has no scene."
          )
            continue; // a moment with no scene stages no one
          throw error;
        }
        seen.moments++;
        check(
          story.people,
          {
            you: (id) => id === me,
            household: (id) => household().has(id),
            moment: (id) =>
              (moment?.counterpartIds ?? []).includes(id as never) ||
              story.talkToId === id ||
              story.talk?.askerId === id,
          },
          `in the moment ${entry.momentId}`,
        );
        for (const line of story.narration)
          expect(line.text, `${entry.momentId}: ${where}`).not.toMatch(
            MERELY_THERE,
          );
      }
      console.log(
        `${seen.scenes} scenes, ${seen.people} people drawn, ${seen.moments} moments: ${where}`,
      );
      expect(seen.scenes, where).toBeGreaterThan(60);
      expect(seen.moments, where).toBeGreaterThan(0);
      // Where the picture has a plate, people were drawn: the checks above read real rooms.
      if (seen.plated) expect(seen.people, where).toBeGreaterThan(0);
    },
  );
});
