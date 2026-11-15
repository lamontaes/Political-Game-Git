/**
 * A holder in mid-term who files for another office by their own choice
 * (pool item gov-legislative-seat-has-no-serving-term-after-election, the
 * mid-term half). Two pinned worlds where the world's own candidates did it,
 * found by scanning played worlds for a filer who held a seat that was not on
 * the same ballot; nobody files in the test.
 *
 * Utah, seed aa11: a state senator (four-year term, seat not on the 2028
 * ballot) is on the lieutenant governor's ballot, loses, and keeps the seat.
 * Nevada, seed bb22: the lieutenant governor is on a state senate ballot,
 * wins, and the incompatibility rule ends the old term and the vacancy
 * engine fills the seat.
 *
 * The runs are the game's own days from the opening in October 2026 to the
 * swearing-in of January 2029, so each takes about two minutes.
 */
import { createHash } from "node:crypto";
import { expect, it } from "vitest";
import { buildPopulation } from "./population";
import { advanceCore, createLifeCore } from "./life";
import { coreAPI } from "./state";
import { openLaws } from "./modules/laws";
import { OFFICES_MODULE_ID, openOffices } from "./modules/offices";
import { ELECTIONS_MODULE_ID, openElections } from "./modules/elections";
import { openCampaigns } from "./modules/campaigns";
import { openParties } from "./modules/parties";
import { openVoting, openWorldRaces } from "./modules/voting";
import { openLegislature } from "./modules/legislature";
import { searchCorePlaces, corePlaceStateIdentities } from "./place-lookup";

interface Term {
  id: string;
  seatId: string;
  personId: string | null;
  startDate: string;
  endDate: string | null;
  status: string;
  endedBy?: string;
}

function playTo(seed: string, date: string) {
  const pick = <T>(list: readonly T[], salt: string): T =>
    list[
      parseInt(
        createHash("sha256")
          .update(`${seed}:${salt}`)
          .digest("hex")
          .slice(0, 8),
        16,
      ) % list.length
    ]!;
  const state = pick(
    [...corePlaceStateIdentities()].map((s) => s.jurisdictionKey).sort(),
    "state",
  );
  const places = [
    ...searchCorePlaces("", Number.MAX_SAFE_INTEGER, {
      stateJurisdictionKey: state,
      scope: "locality",
    }),
  ].sort((a, b) => a.key.localeCompare(b.key));
  const core = createLifeCore(
    buildPopulation({
      seed,
      placeKey: pick(places, "place").key,
      startedAt: "2026-10-20",
      minimumPeople: 120,
    }),
  );
  openLaws(core);
  openOffices(core, seed);
  openElections(core);
  openCampaigns(core);
  openParties(core);
  openVoting(core);
  openLegislature(core);
  openWorldRaces(core);
  advanceCore(core, date);
  const api = coreAPI(core);
  const offices = api.moduleState(OFFICES_MODULE_ID);
  const elections = api.moduleState(ELECTIONS_MODULE_ID);
  const contests = elections.table("contests").rows() as unknown as {
    id: string;
    seatId: string;
    electionDate: string;
  }[];
  const filings = elections.table("filings").rows() as unknown as {
    personId: string;
    contestId: string;
    filedOn: string;
    status: string;
  }[];
  const terms = offices.table("terms").rows() as unknown as Term[];
  return {
    terms,
    vacancies: offices.table("vacancies").rows() as unknown as {
      seatId: string;
      since: string;
      cause: string;
      status: string;
    }[],
    incompatibilities: offices
      .table("incompatibilities")
      .rows() as unknown as { personId: string; previousTermId: string }[],
    /** The filing of someone who held `held` that day, for a contest on `seat` and `date`. */
    midTermFiling: (held: string, seat: string, date: string) => {
      const contest = contests.find(
        (c) => c.seatId === seat && c.electionDate === date,
      );
      expect(contest, `a contest for ${seat} on ${date}`).toBeDefined();
      const found = filings.filter(
        (f) =>
          f.contestId === contest!.id &&
          terms.some(
            (t) =>
              t.seatId === held &&
              t.personId === f.personId &&
              t.startDate <= f.filedOn &&
              (t.endDate === null || t.endDate >= f.filedOn),
          ),
      );
      expect(found.length, `holders of ${held} filed for ${seat}`).toBe(1);
      // The held seat is not on that ballot: no contest for it that day.
      expect(
        contests.some((c) => c.seatId === held && c.electionDate === date),
        `${held} is on the ${date} ballot`,
      ).toBe(false);
      return found[0]!;
    },
  };
}

const serving = (terms: readonly Term[], seat: string) =>
  terms.filter((t) => t.seatId === seat && t.status === "serving");

it("a state senator mid-term on the lieutenant governor's ballot who loses keeps the seat", () => {
  const w = playTo("aa11", "2029-01-10");
  const filing = w.midTermFiling(
    "seat:US-UT:upper:010:0",
    "seat:US-UT:lieutenant-governor",
    "2028-11-07",
  );
  expect(filing.status).toBe("on-ballot");
  const own = serving(w.terms, "seat:US-UT:upper:010:0");
  expect(own.map((t) => t.personId)).toEqual([filing.personId]);
  const lieutenant = serving(w.terms, "seat:US-UT:lieutenant-governor");
  expect(lieutenant.length).toBe(1);
  expect(lieutenant[0]!.personId).not.toBe(filing.personId);
  expect(
    w.vacancies.filter((v) => v.seatId === "seat:US-UT:upper:010:0"),
  ).toEqual([]);
}, 300_000);

it("a lieutenant governor mid-term who wins a state senate seat leaves the old seat to the vacancy engine", () => {
  const w = playTo("bb22", "2029-01-10");
  const filing = w.midTermFiling(
    "seat:US-NV:lieutenant-governor",
    "seat:US-NV:upper:019:0",
    "2028-11-07",
  );
  const senate = serving(w.terms, "seat:US-NV:upper:019:0");
  expect(senate.map((t) => t.personId)).toEqual([filing.personId]);
  const old = w.terms.filter(
    (t) =>
      t.seatId === "seat:US-NV:lieutenant-governor" &&
      t.personId === filing.personId,
  );
  expect(old.length).toBeGreaterThan(0);
  expect(old.every((t) => t.status === "ended")).toBe(true);
  expect(
    w.incompatibilities.some((i) => i.personId === filing.personId),
  ).toBe(true);
  const vacancy = w.vacancies.filter(
    (v) =>
      v.seatId === "seat:US-NV:lieutenant-governor" &&
      v.cause === "accepted incompatible office",
  );
  expect(vacancy.length).toBe(1);
  expect(vacancy[0]!.status).toBe("filled");
  const lieutenant = serving(w.terms, "seat:US-NV:lieutenant-governor");
  expect(lieutenant.length).toBe(1);
  expect(lieutenant[0]!.personId).not.toBe(filing.personId);
}, 300_000);
