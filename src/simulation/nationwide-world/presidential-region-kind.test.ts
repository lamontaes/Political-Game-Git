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
import * as nationalMood from "../national-mood";
import { applySwing, calibrationRow } from "../world-setup/political-start";
import { roundTo } from "../world-setup/deterministic-math";
import {
  PRESIDENTIAL_ELECTION_DAY,
  presidentialElectionDayHandler,
} from "./presidential-turnover";

afterEach(() => vi.restoreAllMocks());

describe("presidential jurisdiction rules preserve the recorded-mood driver", () => {
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
    // Geographic classification remains data even though the current count
    // driver no longer applies a regional residual.
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
    const moodRead = vi.spyOn(nationalMood, "nationalMoodDemocraticShift");
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
    expect(regionCodes).toEqual([]);
    expect(regionCodes).not.toContain("DC");
    expect(kindRead).not.toHaveBeenCalled();
    expect(moodRead).toHaveBeenCalledOnce();
    expect(moodRead).toHaveBeenCalledWith(
      expect.objectContaining({ id: world.id }),
      nationalElectionRules(2028).electionDate,
    );
    const mood = moodRead.mock.results[0]!.value as number;
    expect(mood).toBeTypeOf("number");
    for (const result of results) {
      const unit = nationalElectionRules(2028).units.find(
        (candidate) => candidate.key === result.unitKey,
      )!;
      expect(
        result.tallies.reduce((sum, tally) => sum + tally.votes, 0),
        unit.key,
      ).toBe(calibrationRow(`us-president:${unit.state}`)?.totalVotes ?? 0);
      const row = calibrationRow(`us-president:${unit.state}`);
      expect(row, unit.key).toBeDefined();
      if (
        !row ||
        row.totalVotes === null ||
        row.democraticTwoPartyShare === null
      )
        throw new Error(`Missing recorded calibration for ${unit.key}.`);
      expect(result.tallies[0]!.votes, unit.key).toBe(
        Math.round(
          row.totalVotes *
            roundTo(applySwing(row.democraticTwoPartyShare, mood * 100)),
        ),
      );
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
