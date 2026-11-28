import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import {
  allContests,
  atLargeGroup,
  checkEligibility,
  holdsAnotherSeatOnBody,
  racesOpenTo,
  type ContestRow,
} from "./modules/elections";
import { allTerms, seatById } from "./modules/offices";
import { coreAPI } from "./state";

// A person never holds two seats on one body (owner, Nov 27): a sitting
// member may file only for their own seat, for re-election; in an at-large
// race the seats up on one day are one race, so a member whose seat is in it
// stands in it. The test draws places until one has a body whose members sit
// on staggered seats (a contest of a seat that isn't the member's, on a day
// their seat isn't up), names every place it passed over, and fails by name
// when none has one.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const ATTEMPTS = 12;

it(`a sitting member is not offered, and cannot file for, another seat of their body (seed ${seed})`, () => {
  setBookkeeping(false);
  const passedOver: string[] = [];
  for (let attempt = 0; attempt < ATTEMPTS; attempt += 1) {
    const place = drawPlace(seed, `one-seat-per-body:${attempt}`);
    const where = `${place.name} (${place.key}), seed ${place.seed}`;
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(core);
    const contests = allContests(api);
    // A serving member (a town resident) of a body, and a contest of the same
    // office for a seat outside their own race.
    let found: {
      personId: string;
      theirs: ContestRow;
      other: ContestRow;
    } | null = null;
    for (const term of allTerms(api) as unknown as {
      status: string;
      personId: string | null;
      seatId: string;
      officeId: string;
    }[]) {
      if (term.status !== "serving" || !term.personId) continue;
      if (!api.state.people.has(term.personId)) continue;
      const own = contests.find(
        (c) =>
          c.seatId === term.seatId && !(c as { special?: boolean }).special,
      );
      const other = contests.find(
        (c) =>
          c.officeId === term.officeId &&
          !atLargeGroup(api, c).some((row) => row.seatId === term.seatId) &&
          c.seatId !== term.seatId &&
          (seatById(api, c.seatId) as unknown as { id: string } | undefined),
      );
      if (own && other) {
        found = { personId: term.personId, theirs: own, other };
        break;
      }
    }
    if (!found) {
      passedOver.push(
        `${where} (no member with a seat outside another contest's race)`,
      );
      continue;
    }
    const { personId, theirs, other } = found;
    // Their own seat's race: the same race, so no refusal.
    expect(holdsAnotherSeatOnBody(api, theirs, personId), where).toBe(false);
    expect(
      checkEligibility(api, personId, theirs.id).some(
        (c) => c.rule === "one-seat-per-body",
      ),
      where,
    ).toBe(false);
    // Another seat of the same body: refused by the clerk's rule and never
    // offered at the counter.
    expect(holdsAnotherSeatOnBody(api, other, personId), where).toBe(true);
    expect(
      checkEligibility(api, personId, other.id).find(
        (c) => c.rule === "one-seat-per-body",
      )?.met,
      where,
    ).toBe(false);
    expect(
      racesOpenTo(api, personId).some((c) => c.id === other.id),
      `${where}: ${other.id} is not offered`,
    ).toBe(false);
    process.stdout.write(
      `one-seat-per-body: ${where}; passed over ${passedOver.length ? passedOver.join("; ") : "none"}\n`,
    );
    return;
  }
  throw new Error(
    `no drawn place has a member with another seat of their body to file for (seed ${seed}); passed over ${passedOver.join("; ")}`,
  );
}, 400_000);
