// @vitest-environment node
/**
 * A legislative seat's election year falls on its chamber's own cycle, read from
 * data (pool item elections-puerto-rico-legislature-election-year): for every
 * state and territory in the data, each chamber's seats are in the year its
 * research gives (the filing research's 2026 or next regular election, or the
 * state's own next general election where it has none in 2026), stepped by the
 * chamber's cycle. Puerto Rico, which elects in presidential years, reads 2028
 * and then 2032 rather than the 2026 anchor.
 */
import { describe, expect, it } from "vitest";
import filingResearch from "../../data/research/elections/filing-requirements.json" with { type: "json" };
import stateOfficeResearch from "../../data/research/offices/state-offices.json" with { type: "json" };
import { stateOffices } from "./offices-state";

type Chamber = { chamber: string; termYears?: number; staggered?: boolean };
const offices = (
  stateOfficeResearch as unknown as {
    places: Record<
      string,
      {
        legislature?: { chambers?: Chamber[] };
        generalElectionDate2026?: { nextGeneralElection?: string };
      }
    >;
  }
).places;
const filing = (
  filingResearch as unknown as {
    places: Record<
      string,
      Record<
        string,
        { offeredIn2026?: boolean; nextRegularElection?: string | null }
      >
    >;
  }
).places;

describe("legislative seats' election years follow their own cycle", () => {
  it("every chamber with a research row has its seats on its cycle from the research anchor", () => {
    let checked = 0;
    for (const stateKey of Object.keys(offices)) {
      const row = filing[stateKey]?.stateLegislative;
      if (!row) continue;
      const general =
        offices[stateKey]?.generalElectionDate2026?.nextGeneralElection;
      const anchor =
        row.offeredIn2026 === false
          ? row.nextRegularElection
            ? Number(row.nextRegularElection)
            : general
              ? Number(general.slice(0, 4))
              : 2026
          : 2026;
      for (const office of stateOffices(stateKey, "0000000", "2025-01-20")) {
        if (!office.office.kind.startsWith("legislature")) continue;
        const chamber = offices[stateKey]?.legislature?.chambers?.find((c) =>
          office.office.id.endsWith(`legislature-${c.chamber}`),
        );
        const termYears = chamber?.termYears ?? 2;
        const period = termYears > 2 && !chamber?.staggered ? termYears : 2;
        for (const seat of office.seats) {
          const year = seat.electionYear;
          if (year === undefined) continue;
          // A staggered four-year chamber splits its seats across two cycles.
          const onCycle = (((year - anchor) % period) + period) % period === 0;
          expect(
            onCycle,
            `${stateKey} ${office.office.id} seat ${seat.id}: ${year} is not on the ${period}-year cycle from ${anchor}`,
          ).toBe(true);
          checked += 1;
        }
      }
    }
    expect(checked).toBeGreaterThan(100);
  });

  it("Puerto Rico's legislature, which elects in presidential years, has no 2022 or 2026 seat", () => {
    const seats = stateOffices("US-PR", "7202680", "2025-01-20")
      .filter((o) => o.office.kind.startsWith("legislature"))
      .flatMap((o) => o.seats);
    expect(seats.length).toBeGreaterThan(0);
    for (const seat of seats) expect(seat.electionYear, seat.id).toBe(2028);
  });
});
