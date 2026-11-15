// @vitest-environment node
/**
 * A person of the state the governor's list names without holding them in
 * full is asked to take a cabinet post, is filled in where they live with
 * the work their home town's counts give them (workFromHome), and answers as
 * themselves: an attorney who earns more than the post pays turns it down for
 * the job they would leave, and the post stays open. Before, a person drawn
 * from another town was filled in with no work, so the job term and the pay
 * term read them as out of work and every one of them said yes.
 *
 * HAND-STAGED: the death of the general-services secretary, which opens the
 * post (a post stands open when its holder has died; statePostsToFill), and
 * the player seated as governor. Everything after is the game's own calls.
 *
 * Pinned: Edgar, Wisconsin (5522550), seed edgar-petition-1, a small town that
 * is not the state's seat; John Weber, an attorney from elsewhere in the
 * state, says no (lean -0.15: the job he holds -0.15, the pay -0.05).
 */
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import {
  appointmentsIn,
  stateCandidateNames,
  statePostsToFill,
} from "../core2/modules/executive";
import { lawChain } from "../core2/modules/laws";
import { askToServe, postAsks, serveAsk } from "../core2/modules/serve-asks";
import { seatPlayerInStateOffice } from "../core2/office-day-state";
import { workHeld } from "../core2/person-work";
import { coreAPI } from "../core2/state";
import type { PersonId } from "../core2/types";
import { playServeAsk } from "../../tests/support/serve-ask-play";

const PLACE = "5522550";
const SEED = "edgar-petition-1";
const POST = "general-services";
const NO = "John Weber";
const where = `Edgar, Wisconsin (${PLACE}), seed ${SEED}`;

it(
  `${where}: a drawn person with a good job, asked to take a state post, says no as themselves and the post stays open`,
  { timeout: 240_000 },
  () => {
    const previous = setBookkeeping(false);
    try {
      const { core, director } = buildBenchWorld(SEED, gameStartDate(), {
        twoLevel: true,
        placeKey: PLACE,
      });
      const api = coreAPI(core);
      const player = core.playerId! as PersonId;
      // HAND-STAGED: the player governs, and the post's secretary dies.
      seatPlayerInStateOffice(api, { personId: player, role: "governor" });
      director.watch(core, player);
      const held = appointmentsIn(api, lawChain(api).stateKey).find(
        (row) => row.post === POST,
      )!;
      expect(held, where).toBeDefined();
      const dead = core.people.get(held.holderId) as {
        alive: boolean;
        jobId?: string;
      };
      dead.alive = false;
      if (dead.jobId) api.endJob(dead.jobId, `died:${core.date}`);
      expect(
        statePostsToFill(api, player).map((p) => p.key),
        where,
      ).toContain(POST);

      // On the list by name, not yet a person the world holds.
      const [askedId] = [...stateCandidateNames(api, POST)].find(
        ([, name]) => name === NO,
      )!;
      expect(askedId, `${where}: ${NO} offered`).toBeDefined();
      expect(core.people.has(askedId as PersonId), where).toBe(false);
      const people = core.people.size;

      // Asked, they are filled in once, holding their home town's work.
      const row = askToServe(api, {
        seat: "post",
        appointerId: player,
        post: POST,
        personId: askedId,
      });
      expect(row.askedId, where).toBe(askedId);
      expect(core.people.size, `${where}: the one asked`).toBe(people + 1);
      const work = workHeld(core, askedId)!;
      expect(work.title, where).toBe("Attorney");
      expect(work.jobId, `${where}: work kept where they live`).toBeNull();
      expect(
        work.hourlyMinor,
        `${where}: pays more than the post`,
      ).toBeGreaterThan(4_600);
      expect(row.standing.reason, where).toBe("own-job");
      expect(row.standing.terms.pay, where).toBeLessThan(0);
      expect(row.standing.lean, where).toBeLessThan(0);

      // The scene plays their no; it is kept and the post stays open.
      const played = playServeAsk(core, director, player, row.eventId);
      expect(played.scene.purpose, where).toBe("ask-to-serve");
      expect(played.reply.facts?.ending, played.lines.join("\n")).toBe(
        "turned-down",
      );
      expect(serveAsk(api, row.id)?.answer, where).toBe("no");
      expect(
        statePostsToFill(api, player).map((p) => p.key),
        `${where}: the post stays open`,
      ).toContain(POST);
      const listed = postAsks(api, player, POST).find(
        (a) => a.personId === askedId,
      );
      expect(listed?.declined?.reason, where).toBe("own-job");
      expect(listed?.mayAsk, where).toBe(false);
      // Still one person: nobody else was made for them.
      expect(core.people.size, where).toBe(people + 1);
      process.stdout.write(
        [`DRAWN NO ${where}: ${POST}, ${askedId}`, ...played.lines, ""].join(
          "\n",
        ),
      );
    } finally {
      setBookkeeping(previous);
    }
  },
);
