/**
 * A character the player controls keeps their weighed choices' scores for as
 * long as the player's do, even when they are not the entrant the world was
 * made around (pool item core-played-characters-decision-scores-kept-seven-days).
 * The condensing pass and the log write use one test for "the player's own".
 * A place drawn from all 56; GOLDEN_PATH_SEED pins one.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import {
  condenseCircleDecisions,
  isPlayersOwn,
  queueDecisionDetail,
} from "./decision-detail";
import { gameStartDate } from "./game-start";
import { advanceCore } from "./life";
import { parameter } from "./parameters";
import { registerControlledPersonV1 } from "./player-control-state-v1";
import { daysAfterStart } from "./tooling/test-days";
import type { PersonId } from "./types";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(16).toString("hex");

it(`a controlled character who is not the entrant keeps their scores, a circle member's are condensed (seed ${seed})`, () => {
  for (let draw = 0; draw < 2; draw += 1) {
    const place = drawPlace(`${seed}:${draw}`, "decision-detail-controlled");
    const where = `${place.name} (${place.key}), seed ${seed}:${draw}`;
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      placeKey: place.key,
      twoLevel: true,
      settings: { population: 1500 },
    });
    advanceCore(core, daysAfterStart(50));
    const acts = [...core.durableLog.values()].filter(
      (row) =>
        row.kind === "person.acted" &&
        row.decision &&
        row.actorId !== core.playerId &&
        !row.publicRecord &&
        !row.news,
    );
    const template = acts[0];
    expect(template, `${where}: no routine act to copy`).toBeTruthy();
    // The player plays a resident who is not the generated entrant.
    const chosen = [...core.people.values()].find(
      (p) =>
        p.alive &&
        p.id !== core.playerId &&
        p.id !== template!.actorId &&
        !p.id.startsWith("official:"),
    )!;
    registerControlledPersonV1(core, chosen.id);
    expect(isPlayersOwn(core, chosen.id), where).toBe(true);
    expect(isPlayersOwn(core, template!.actorId!), where).toBe(false);
    const copy = (id: string, actorId: PersonId) => {
      const row = {
        ...template!,
        id: `${template!.id}:${id}`,
        actorId,
        personIds: [actorId],
        decision: { ...template!.decision!, actorId, scores: [] },
      };
      core.durableLog.set(row.id, row);
      queueDecisionDetail(core, template!.date, row.id);
      return row.id;
    };
    const mine = copy("chosen", chosen.id as PersonId);
    const theirs = copy("circle", template!.actorId!);
    const day = new Date(`${core.date}T00:00:00Z`);
    day.setUTCDate(
      day.getUTCDate() + parameter("circleDecisionDetailDays") + 30,
    );
    core.date = day.toISOString().slice(0, 10);
    condenseCircleDecisions(core);
    // The chosen character's scores are still there; the circle member's are gone.
    expect(
      core.durableLog.get(mine)!.decision!.scores,
      `${where}: ${mine}`,
    ).toEqual([]);
    expect(
      core.durableLog.get(theirs)!.decision!.scores,
      `${where}: ${theirs}`,
    ).toBeUndefined();
  }
}, 600_000);
