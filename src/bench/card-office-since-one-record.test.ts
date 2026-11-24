/**
 * An officeholder's card says when they entered office once. The line under
 * the name ("Since 2025") and the public record's "In office since" read the
 * term's own service start, so a President in a later term is not "since 2025"
 * in one place and "since January 20, 2021" in the other (Player's replay of
 * #10337, Nov 24). Places are drawn from all 56 (drawn-place-tests);
 * GOLDEN_PATH_SEED=<seed> replays a run.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { coreAPI } from "../core2/state";
import { knownCard } from "./card";
import { buildBenchWorld } from "./world";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");

it(`the header's office year is the public record's service start (seed ${seed})`, () => {
  setBookkeeping(false);
  const place = drawPlace(seed, "card-office-since");
  const where = `${place.name} (${place.key}), seed ${place.seed}`;
  const { core, playerId } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const terms = coreAPI(core)
    .moduleState("core2-offices-v1")
    .table("terms")
    .rows() as unknown as {
    id: string;
    status: string;
    startDate: string;
    serviceStart?: string;
  }[];
  let checked = 0;
  let later = 0;
  for (const term of terms.filter((row) => row.status === "serving")) {
    const card = knownCard(core, playerId!, `official:${term.id}`) as {
      offices?: { from: number; to: number | null }[];
      publicKnowledge?: { serviceStart: string } | null;
    };
    const entered = card.publicKnowledge?.serviceStart;
    const serving = card.offices?.find((office) => office.to === null);
    if (!entered || !serving) continue;
    expect(serving.from, `${where}: ${term.id}`).toBe(
      Number(entered.slice(0, 4)),
    );
    checked += 1;
    if (term.serviceStart && term.serviceStart < term.startDate) later += 1;
  }
  expect(checked, `${where}: no officeholder card to check`).toBeGreaterThan(0);
  // A world whose holders all began this term proves less: say so.
  if (!later)
    console.log(`${where}: no holder in a later term (${checked} checked)`);
}, 300_000);
