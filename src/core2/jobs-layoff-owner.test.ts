/**
 * A layoff at an owned business names the owner on its books as decider
 * (pool item jobs-layoff-owner-decides-test). In a drawn played world,
 * advance a month at a time until an owned layoff appears; fail if bounded
 * draws run out. This does not prove the broader gov-standins-jobs chain.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { ownerOf } from "./modules/business";
import { coreAPI } from "./state";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
type Change = {
  id: string;
  organizationId: string;
  personId: string;
  decidedBy: string;
};

it("a layoff at a business is decided by its owner, never by the business itself", () => {
  setBookkeeping(false);
  const tried: string[] = [];
  for (let draw = 0; draw < 6; draw += 1) {
    const place = drawPlace(`${seed}:${draw}`, "layoff-owner");
    const world = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(world.core);
    // A month at a time, stopping once a layoff at an owned business was
    // decided by the owner on its books: a full year of a town holds several
    // gigabytes (a single run holding two draws ran out of heap), and the
    // claim needs only that one layoff, so the rest of the year is not played.
    let layoffs: Change[] = [];
    let owned: Change[] = [];
    const byOwner = (row: Change) =>
      row.decidedBy === ownerOf(api, row.organizationId);
    for (let step = 0; step < 12 && !owned.some(byOwner); step += 1) {
      advanceCore(world.core, addDays(makeIsoDate(world.core.date), 30));
      layoffs = api
        .moduleState("jobs")
        .table("changes")
        .query("byKind", ["layoff"]) as unknown as Change[];
      owned = layoffs.filter((row) => ownerOf(api, row.organizationId));
    }
    tried.push(
      `${place.name} (${place.key}), seed ${place.seed}: ${layoffs.length}`,
    );
    if (!owned.length) continue;
    for (const row of owned)
      expect(row.decidedBy, `${place.name}: ${row.id}`).not.toBe(
        row.organizationId,
      );
    // The owner on the books is the one who decided, for at least one layoff.
    expect(
      owned.some(byOwner),
      `${place.name}: ${owned.length} layoffs, none by the current owner`,
    ).toBe(true);
    const named = owned.find(byOwner)!;
    process.stdout.write(
      `LAYOFF-OWNER ${place.name} (${place.key}), seed ${place.seed}: ${owned.length} layoffs at owned businesses, ${owned.filter(byOwner).length} decided by the owner on the books today; ${named.id}: ${named.personId} laid off by ${named.decidedBy} at ${named.organizationId}\n`,
    );
    return;
  }
  throw new Error(
    `no layoff at an owned business in 6 draws: ${tried.join("; ")}`,
  );
}, 3_600_000);
