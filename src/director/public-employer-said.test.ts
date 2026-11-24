/**
 * A public employer that owns its government's outside pay authority is said
 * by name, and only the outside market (work out of town) is not. Both carry
 * `outsideFlow` (opening-public-pay.ts gives the owner one), so the director
 * knows the market by its kind (`OUTSIDE_MARKET_KIND`). Before, a post
 * office's workers had no employer in any scene: the layoff at the Quemado
 * Post Office skipped with "no narration for layoff-terms can be worded".
 * The place is drawn from all 56 (drawn-place-tests); a place whose opening
 * has no worker at a pay-authority owner is passed over by name.
 * GOLDEN_PATH_SEED=<seed> replays a run.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { OUTSIDE_MARKET_KIND } from "../core2/modules/jobs";
import { employerWords } from "./words";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const DRAWS = 6;

it(`a public employer that owns its pay authority is said, and the outside market is not (seed ${seed})`, () => {
  setBookkeeping(false);
  const passed: string[] = [];
  for (let draw = 0; draw < DRAWS; draw += 1) {
    const place = drawPlace(seed, `public-employer-said:${draw}`);
    const where = `${place.name} (${place.key}), seed ${place.seed}`;
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const orgs = [...core.organizations.values()];
    for (const market of orgs.filter((o) => o.kind === OUTSIDE_MARKET_KIND))
      expect(employerWords(market), `${where}: ${market.id}`).toBeNull();
    // A pay-authority owner someone works at: outsideFlow, not the market.
    const owners = new Set(
      orgs
        .filter((o) => o.outsideFlow && o.kind !== OUTSIDE_MARKET_KIND)
        .map((o) => o.id),
    );
    const job = [...core.jobs.values()].find(
      (row) => row.endsAt === undefined && owners.has(row.organizationId),
    );
    if (!job) {
      passed.push(`${where}: no worker at a pay-authority owner`);
      continue;
    }
    const org = core.organizations.get(job.organizationId)!;
    const said = employerWords(org);
    expect(
      said,
      `${where}: ${org.id} (${org.name}), where ${job.personId} works, is said`,
    ).toEqual(expect.any(String));
    expect(said!.length, where).toBeGreaterThan(0);
    process.stdout.write(
      `public-employer-said: ${where} (run seed ${seed}); ${job.personId} at ${org.id} (${org.name}) is said "${said}"; passed over ${passed.length ? passed.join("; ") : "none"}\n`,
    );
    return;
  }
  throw new Error(
    `none of ${DRAWS} drawn places has a worker at a pay-authority owner (run seed ${seed}): ${passed.join("; ")}`,
  );
}, 1_800_000);
