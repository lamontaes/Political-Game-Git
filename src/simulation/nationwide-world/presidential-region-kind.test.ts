import { afterEach, describe, expect, it, vi } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { drawRandomPlace } from "../../../tests/support/random-place";
import {
  createFutureTransitionHandlerRegistry,
  scheduleFutureDueItem,
} from "../future-transitions";
import {
  ensureNationalElectionJurisdiction,
  NATIONAL_ELECTION_JURISDICTION,
} from "../national-election-geography";
import { nationalElectionRules } from "../national-election-rules";
import {
  nationalRecords,
  registerNationalElection,
} from "../national-elections";
import { deserializeWorld, serializeWorld } from "../serialization";
import * as placeReference from "../state-reference";
import { advanceWorld } from "../world";
import * as censusRegions from "../world-setup/census-regions";
import { calibrationRow } from "../world-setup/political-start";
import {
  PRESIDENTIAL_ELECTION_DAY,
  presidentialElectionDayHandler,
} from "./presidential-turnover";

afterEach(() => vi.restoreAllMocks());

describe("presidential regional residual follows existing jurisdiction-kind data", () => {
  it("preserves the old skip predicate for all 56 places and unread codes", () => {
    const codes = Object.keys(placeReference.STATES);
    expect(codes).toHaveLength(56);
    for (const code of [...codes, "not-a-place"]) {
      expect(placeReference.isFederalDistrictUsps(code), code).toBe(
        code === "DC",
      );
    }
    expect(placeReference.isFederalDistrictUsps(null)).toBe(false);
    expect(placeReference.isFederalDistrictUsps(undefined)).toBe(false);
    // The Census classification is retained; zero residual is the existing
    // presidential driver's behavior, not a replacement geographic fact.
    expect(censusRegions.censusRegionOf("DC")).toBe("south");
  });

  it("dispatches the actual election consumer without reading a district regional residual and preserves saved results", () => {
    const seed = "a109-presidential-region-consumer";
    const place = drawRandomPlace(
      seed,
      (candidate) =>
        candidate.stateJurisdictionKey !== null &&
        placeReference.STATES[candidate.stateJurisdictionKey.slice(3)]
          ?.electorAllocation !== "none",
    );
    const fixture = smallWorld({
      place: place.key,
      date: "2028-11-06",
      people: 4,
      seed,
    });
    const [a, av, b, bv] = fixture.world.personOrder;
    if (!a || !av || !b || !bv)
      throw new Error("Four canonical residents are required.");
    let world = registerNationalElection(
      ensureNationalElectionJurisdiction(fixture.world),
      {
        stableKey: "a109-region-election",
        cycle: 2028,
        jurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
        tickets: [
          {
            presidentPersonId: a,
            vicePresidentPersonId: av,
            presidentState: fixture.stateUsps,
            vicePresidentState: fixture.stateUsps,
          },
          {
            presidentPersonId: b,
            vicePresidentPersonId: bv,
            presidentState: fixture.stateUsps,
            vicePresidentState: fixture.stateUsps,
          },
        ],
        provenance: {
          method: "authored",
          sourceEntityIds: [],
          note: `Supplied registered ticket fixture in ${fixture.place.displayName}; seed ${seed}.`,
        },
      },
    );
    const electionId = world.history.nationalElections!.at(-1)!.id;
    world = scheduleFutureDueItem(world, {
      stableKey: "presidential-turnover/v1:2028:a109-region-election-day",
      dueAt: nationalElectionRules(2028).electionDate,
      transitionKey: PRESIDENTIAL_ELECTION_DAY,
      entityIds: [electionId],
      jurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
      provenance: {
        kind: "authored",
        note: "A109 actual election consumer fixture.",
      },
    });
    const regionRead = vi.spyOn(censusRegions, "censusRegionOf");
    const kindRead = vi.spyOn(placeReference, "isFederalDistrictUsps");
    const registry = createFutureTransitionHandlerRegistry([
      [PRESIDENTIAL_ELECTION_DAY, presidentialElectionDayHandler],
    ]);
    const counted = advanceWorld(world, 1, registry);
    expect(counted.currentDate).toBe(nationalElectionRules(2028).electionDate);
    const results = nationalRecords(counted, electionId).filter(
      (record) => record.kind === "unit-result",
    );
    expect(results.map((record) => record.unitKey)).toEqual(
      nationalElectionRules(2028).units.map((unit) => unit.key),
    );
    const regionCodes = regionRead.mock.calls.map(([code]) => code);
    expect([...new Set(regionCodes)].sort()).toEqual(
      Object.entries(placeReference.STATES)
        .filter(([, reference]) => reference.jurisdictionKind === "state")
        .map(([code]) => code)
        .sort(),
    );
    expect(regionCodes).not.toContain("DC");
    expect(kindRead.mock.calls.some(([code]) => code === "DC")).toBe(true);
    for (const result of results) {
      const unit = nationalElectionRules(2028).units.find(
        (candidate) => candidate.key === result.unitKey,
      )!;
      expect(
        result.tallies.reduce((sum, tally) => sum + tally.votes, 0),
        unit.key,
      ).toBe(calibrationRow(`us-president:${unit.state}`)?.totalVotes ?? 0);
    }
    const reopened = deserializeWorld(serializeWorld(counted));
    expect(nationalRecords(reopened, electionId)).toEqual(
      nationalRecords(counted, electionId),
    );
    expect(serializeWorld(reopened)).toBe(serializeWorld(counted));
    expect(
      serializeWorld(
        presidentialElectionDayHandler(
          reopened,
          world.history.futureDueItems.at(-1)!,
        ).world,
      ),
    ).toBe(serializeWorld(reopened));
  }, 120_000);
});
