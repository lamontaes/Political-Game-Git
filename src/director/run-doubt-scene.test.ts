import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { P } from "../core2/parameters";
import { advancePlayerV1, resumePlayerV1 } from "../core2/player-v1";
import { ELECTIONS_MODULE_ID } from "../core2/modules/elections";
import { coreAPI } from "../core2/state";
import type { PersonId } from "../core2/types";
import { purposeScene } from "./purpose-scene";
import { expectUpToFourDifferent } from "./reply-set-check";

// "Never winning" (owner, Nov 8: failing and failing upward, never winning, the
// "why do I want to do this" moment). A player who has filed and lost before and
// loses again is asked by someone who lives with them whether another run is
// worth it, a few days after the count. A played world rarely holds a player
// who lost two races in the window of a test, so the filings and the counts are
// written by hand (an edge proof): one loss is no such scene, a second loss is,
// and a win after is none.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");

it(`a second lost race brings the question home (seed ${seed})`, () => {
  setBookkeeping(false);
  const tried: string[] = [];
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const place = drawPlace(`${seed}:${attempt}`, "run-doubt");
    const where = `${place.name} (${place.key}), seed ${seed}:${attempt}`;
    const { core, director, playerId } = buildBenchWorld(
      place.seed,
      gameStartDate(),
      { twoLevel: true, placeKey: place.key },
    );
    const me = playerId as PersonId;
    const player = core.people.get(me)!;
    const household = core.households.get(player.householdId);
    if (
      !household ||
      household.memberIds.filter((id) => id !== me).length === 0
    ) {
      tried.push(`${where}: the player lives alone`);
      continue;
    }
    core.focusPersonIds.add(me);
    director.watch(core, me);
    const api = coreAPI(core);
    const filings = api.moduleState(ELECTIONS_MODULE_ID).table("filings");
    const rival = [...core.people.values()].find(
      (person) => person.alive && person.id !== me,
    )!;
    const contest = (n: number, winner: string) => {
      const contestId = `contest:run-doubt:${n}`;
      filings.put({
        id: `filing:run-doubt:${n}`,
        contestId,
        personId: me,
        filedOn: core.date,
        filedWith: "test",
        platform: [],
        status: "on-ballot",
      } as never);
      api.emit({
        id: `election-result:${contestId}`,
        date: core.date,
        kind: "election-result",
        personIds: [me, rival.id],
        placeId: player.placeId,
        publicRecord: true,
        source: { tag: "SOURCED", citation: "test count", asOf: core.date },
        facts: { contestId, office: "Council", winnerId: winner, totals: "{}" },
      });
    };
    const book = director.ledger.people.get(me)!;
    const doubts = () =>
      book.schedule.filter((row) =>
        row.bindings.some((binding) => binding.typeKey === "run-doubt"),
      );
    // The player plays through the clock as the bench plays them: the circumstance
    // producer serves the person the player controls.
    const step = (days: number) => {
      let packet = advancePlayerV1(core, {
        controlledPersonId: me,
        through: {
          date: addDays(makeIsoDate(core.date), days),
          minuteOfDay: P.zero,
        },
      });
      while (packet.kind !== "complete")
        packet =
          packet.kind === "stop"
            ? resumePlayerV1(core, { kind: "stop", pauseId: packet.pauseId })
            : resumePlayerV1(core, {
                kind: "choice",
                pauseId: packet.pauseId,
                offerId: packet.offers[P.zero]!.offerId,
              });
    };
    // One loss, and another race lost on the same ballot: one election, not a
    // habit of losing, so no scene.
    contest(1, rival.id);
    contest(4, rival.id);
    step(6);
    expect(doubts().length, `${where}: two races lost on one ballot`).toBe(0);
    // A second loss: the question comes home.
    step(30);
    contest(2, rival.id);
    step(6);
    expect(doubts().length, `${where}: a second loss`).toBeGreaterThan(0);
    const entry = doubts()[0]!;
    const result = purposeScene(core, director, me, entry, {
      typeKey: "run-doubt",
    });
    expect(result?.kind, `${where}: ${JSON.stringify(result)}`).toBe(
      "composed",
    );
    if (result?.kind !== "composed") return;
    const { scene } = result;
    expect(scene.purpose, where).toBe("run-doubt");
    expect(household.memberIds, where).toContain(scene.askerId);
    expect(scene.askerId, where).not.toBe(me);
    const root = scene.talk.tree.replies.map((reply) => reply.line);
    expectUpToFourDifferent(root, where);
    for (const row of root)
      expect(["tell", "comfort", "promise", "deflect"], where).toContain(
        row.move,
      );
    for (const row of [scene.talk.state, ...root])
      expect(row.text, where).not.toMatch(
        /\d{4}-\d{2}-\d{2}|\b[a-z]+[-.:][a-z-]+:|\{|\}|undefined|\d{5,}/,
      );
    // A win after that is no such scene.
    const before = doubts().length;
    step(30);
    contest(3, me);
    step(6);
    expect(doubts().length, `${where}: a win`).toBe(before);
    process.stdout.write(`RUN DOUBT ${where}\n  ${scene.talk.state.text}\n`);
    return;
  }
  throw new Error(`no run-doubt scene: ${tried.join("; ")} (seed ${seed})`);
}, 900_000);
