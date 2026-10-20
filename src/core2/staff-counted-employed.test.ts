import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { campaignParameter } from "./campaign-views";
import { setBookkeeping } from "./bookkeeping";
import { countedResidents } from "./electorate";
import { gameStartDate } from "./game-start";
import { staffCandidates } from "./modules/staff";
import { townSeats } from "./modules/offices";
import { lawChain } from "./modules/laws";
import { coreAPI } from "./state";

// An aide may come from the town's counted population whether or not they
// have work, so long as the post pays more than they earn now (pool item
// gov-staff-hire-employed). A place drawn from all 56 on a seed nobody chose.
const seed = process.env.STAFF_COUNTED_SEED ?? randomBytes(8).toString("hex");
const place = drawPlace(seed, "staff-counted-employed");
const where = `${place.name} (${place.key}), seed ${place.seed}`;

it(`counts a counted resident earning less than the post as a candidate, and one earning more as none (${where})`, () => {
  setBookkeeping(false);
  try {
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(core);
    const official = townSeats(api).find((seat) => seat.holder)?.holder
      ?.personId;
    expect(official, `${where}: no sitting official`).toBeDefined();
    const post = campaignParameter("staffHourlyMinor");
    const candidates = new Set(
      staffCandidates(api, official!)
        .filter((c) => c.counted)
        .map((c) => c.personId),
    );
    const adults = countedResidents(core).filter(
      (v) => v.placeId === lawChain(api).townPlaceId,
    );
    const employedLess = adults.filter(
      (v) => v.hourlyMinor > 0 && v.hourlyMinor < post,
    );
    const employedMore = adults.filter((v) => v.hourlyMinor >= post);
    // A person who earns less than the post pays and is of age may apply.
    expect(
      employedLess.some((v) => candidates.has(v.id)),
      `${where}: ${employedLess.length} counted residents earn less than ${post}, none applies`,
    ).toBe(true);
    // Nobody who already earns the post's pay or more applies.
    for (const v of employedMore)
      expect(
        candidates.has(v.id),
        `${where}: ${v.id} earns ${v.hourlyMinor}`,
      ).toBe(false);
  } finally {
    setBookkeeping(true);
  }
}, 900_000);
