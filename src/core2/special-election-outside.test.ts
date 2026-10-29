/**
 * A vacancy in a seat outside the town is filled by a real race (pool item
 * gov-special-election-races-outside-town): when a House district's or a
 * legislative district's holder leaves and the law calls a special election,
 * the world counts the race on the election day between the two major
 * parties' named candidates, and the winner serves what was left of the term.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import {
  OFFICES_MODULE_ID,
  townSeats,
  vacateSeat,
  type TermRow,
  type VacancyRow,
} from "./modules/offices";
import { racesOf, VOTING_MODULE_ID, worldRacesOpen } from "./modules/voting";
import { stateParties } from "./modules/parties";
import { partySide } from "./appointments";
import { coreAPI } from "./state";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const DRAWS = 8;

/** A vacancy in a drawn place outside the town is filled by a counted race; the places a draw may land in are `accept`'s. */
function specialRace(salt: string, accept: (stateKey: string) => boolean) {
  const misses: string[] = [];
  let draws = 0;
  for (let n = 0; draws < DRAWS && n < DRAWS * 200; n += 1) {
    const place = drawPlace(`${seed}:${n}`, salt);
    if (!accept(place.state)) continue;
    draws += 1;
    const where = `${place.name}, seed ${seed}:${n}`;
    setBookkeeping(false);
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(core);
    if (!worldRacesOpen(api)) {
      misses.push(`${where}: world races not open`);
      continue;
    }
    const offices = api.moduleState(OFFICES_MODULE_ID);
    const inTown = new Set(townSeats(api).map((entry) => entry.seat.id));
    const outside = (
      offices.table("seats").rows() as unknown as {
        id: string;
        officeId: string;
        coversTown: boolean;
      }[]
    )
      .filter((seat) => !seat.coversTown && !inTown.has(seat.id))
      .flatMap((seat) => {
        const office = offices
          .table("offices")
          .get(seat.officeId) as unknown as
          | {
              kind: string;
              elected: boolean;
              vacancyRule: { method: string };
            }
          | undefined;
        const holder = (
          offices
            .table("terms")
            .query("bySeatStatus", [seat.id, "serving"]) as unknown as TermRow[]
        )[0];
        return office?.elected &&
          holder &&
          (office.kind === "us-house" ||
            office.kind.startsWith("legislature-")) &&
          /special/.test(office.vacancyRule.method)
          ? [{ seat, holder }]
          : [];
      });
    const target = outside[0];
    if (!target) {
      misses.push(`${where}: no seat outside the town with a special rule`);
      continue;
    }
    const vacancy = vacateSeat(api, target.seat.id, "resignation")!;
    expect(vacancy.status, where).toBe("awaiting-election");
    const day = vacancy.electionDate!;
    advanceCore(core, addDays(makeIsoDate(day), 2));
    const race = racesOf(api).find((row) => row.id.endsWith(":special"));
    expect(race, `${where}: a counted special race`).toBeDefined();
    const row = api
      .moduleState(VOTING_MODULE_ID)
      .table("races")
      .get(race!.id) as unknown as {
      candidates: { party: string; identity: { givenName: string } }[];
      special: { vacancyId: string; termEnd: string | null };
    };
    expect(row.special.vacancyId, where).toBe(vacancy.id);
    expect(row.candidates.length, `${where}: two named candidates`).toBe(2);
    for (const candidate of row.candidates)
      expect(candidate.identity.givenName, where).toBeTruthy();
    const filled = offices
      .table("vacancies")
      .get(vacancy.id) as unknown as VacancyRow;
    expect(filled.status, `${where}: vacancy filled`).toBe("filled");
    const seated = (
      offices
        .table("terms")
        .query("bySeatStatus", [
          target.seat.id,
          "serving",
        ]) as unknown as TermRow[]
    )[0];
    expect(seated?.reached, where).toMatch(/special election/);
    expect(seated?.party, where).toBe(race!.winnerParty);
    expect(seated?.endDate ?? null, where).toBe(row.special.termEnd);
    process.stdout.write(
      `SPECIAL ${where}: ${race!.id}, ${row.candidates.map((c) => c.party).join(" v ")}, winner ${race!.winnerParty}, term to ${seated?.endDate}\n`,
    );
    return;
  }
  expect.fail(
    `no draw reached a special race in ${DRAWS}: ${misses.join("; ")}`,
  );
}

it(`a vacancy outside the town is filled by a counted race with named candidates, from seed ${seed}`, () => {
  specialRace("special-outside", () => true);
}, 3_600_000);

// Named regression: a seat left with no holder has no side until the count
// gives it one. Where the state's parties include no third party (Alabama,
// Illinois, Tennessee and four territories), the count asked for a national
// party on neither side and stopped the year ("No national party on side
// 0"; McCalla, Alabama, in party-filing.test.ts with seed pet-run-1).
it(`a vacancy outside the town is filled where the state has no third party, from seed ${seed}`, () => {
  specialRace(
    "special-outside-two-parties",
    (stateKey) => !stateParties(stateKey).some((p) => partySide(p.name) === 0),
  );
}, 3_600_000);
