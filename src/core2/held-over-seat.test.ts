/**
 * A holdover does not restart the term (the Account lead's ruling, Nov 15).
 * A seat whose race no one won is held by its old holder only until a
 * successor is chosen: it is filled at the office's next regular election
 * for what is left of the term the law set, then comes up on its normal year.
 *
 * Pinned places and seeds, found by a script outside the test (Nov 16):
 * Minnesota (2753080), seed ho-200, whose county attorney and coroner races
 * had no filer on Nov 3, 2026; and Kansas (2058100), seed ho-2, whose county
 * attorney race had none. Both offices hold elections every two years and
 * elect four-year terms, so the next regular election (2028) comes before the
 * normal year (2030). Before the ruling was built, the 2028 winner served a
 * full four years from 2029.
 */
import { expect, it } from "vitest";
import { buildPopulation } from "./population";
import { advanceCore, createLifeCore } from "./life";
import { coreAPI } from "./state";
import { collapseToTwoLevels } from "./residents";
import { openLaws } from "./modules/laws";
import { openOffices, OFFICES_MODULE_ID } from "./modules/offices";
import {
  ELECTIONS_MODULE_ID,
  openElections,
  type ContestRow,
} from "./modules/elections";
import { openCampaigns } from "./modules/campaigns";
import { openParties } from "./modules/parties";
import { openVoting, VOTING_MODULE_ID } from "./modules/voting";

const START = "2026-10-20";

function world(seed: string, place: string) {
  const full = buildPopulation({
    seed,
    placeKey: place,
    startedAt: START,
    minimumPeople: 400,
  });
  const player = [...full.people]
    .filter(
      (p) => Number(START.slice(0, 4)) - Number(p.birthDate.slice(0, 4)) >= 18,
    )
    .sort((a, b) => a.id.localeCompare(b.id))[0]!;
  const core = createLifeCore(
    collapseToTwoLevels({ ...full, playerId: player.id }),
  );
  openLaws(core);
  openOffices(core, seed);
  openElections(core);
  openCampaigns(core);
  openParties(core);
  openVoting(core);
  return { core, api: coreAPI(core) };
}

const cases = [
  { seed: "ho-200", place: "2753080", seats: ["prosecutor:0", "coroner:0"] },
  { seed: "ho-2", place: "2058100", seats: ["prosecutor:0"] },
];

for (const { seed, place, seats } of cases)
  it(`a held-over seat is filled at the next regular election for what is left of its term (${place}, seed ${seed})`, () => {
    const { core, api } = world(seed, place);
    const contestsOf = (seatId: string) =>
      [
        ...(api
          .moduleState(ELECTIONS_MODULE_ID)
          .table("contests")
          .query("bySeat", [seatId]) as unknown as ContestRow[]),
      ].sort((a, b) => a.electionDate.localeCompare(b.electionDate));
    const terms = api.moduleState(OFFICES_MODULE_ID).table("terms");
    // Past the term's start: the races no one won are settled by holdover.
    advanceCore(core, "2027-02-03");
    const held = (
      api
        .moduleState(VOTING_MODULE_ID)
        .table("emptyRaces")
        .rows() as unknown as {
        id: string;
        contestId: string;
        seatId: string;
        method: string;
      }[]
    ).filter(
      (e) => e.method === "holdover" && seats.some((s) => e.seatId.endsWith(s)),
    );
    expect(
      held.map((e) => e.seatId.split(":").slice(-2).join(":")).sort(),
    ).toEqual([...seats].sort());
    const remainders = held.map((empty) => {
      const next = contestsOf(empty.seatId).find(
        (c) => c.electionDate > empty.contestId.slice(-10),
      )!;
      // The next regular election, not the normal year, for what is left of
      // the term, and it names the race no one won.
      expect(next.electionDate, empty.seatId).toBe("2028-11-07");
      expect(next.termEnd, empty.seatId).toBeDefined();
      expect(next.termEnd! > "2030-11-05", empty.seatId).toBe(true);
      expect(next.termEnd! < "2031-12-31", empty.seatId).toBe(true);
      expect(next.heldOverAfter, empty.seatId).toBe(empty.contestId);
      return next;
    });
    // The winner serves to that day, and the seat comes up on its normal year.
    advanceCore(core, "2029-03-01");
    for (const next of remainders) {
      const serving = (
        terms.query("bySeatStatus", [next.seatId, "serving"]) as unknown as {
          startDate: string;
          endDate: string | null;
        }[]
      )[0];
      expect(serving!.startDate > "2028-11-07", next.seatId).toBe(true);
      expect(serving!.endDate, next.seatId).toBe(next.termEnd);
      expect(
        contestsOf(next.seatId).some((c) => c.electionDate === "2030-11-05"),
        next.seatId,
      ).toBe(true);
    }
  }, 240_000);
