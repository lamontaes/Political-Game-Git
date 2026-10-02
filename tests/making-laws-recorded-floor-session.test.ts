import { describe, expect, it } from "vitest";
import { CHIEF_EXECUTIVE_JURISDICTIONS } from "../src/simulation/nationwide-world/state-executive-candidacy-packs";
import {
  applyInstitutionStep,
  measureSessionIsClosed,
} from "../src/simulation/governing/legislative-clock";
import { applyLegislativeStep } from "../src/presentation/legislation-session";
import { addDays } from "../src/simulation/dates";
import {
  serializeWorld,
  deserializeWorld,
} from "../src/simulation/serialization";
import { measurePosition } from "../src/simulation/legislation";
import { SEED, cases, floorFixture, on } from "./fixtures/seated-floor-session";

describe(`Making Laws supplied floor rolls respect session closure (seed ${SEED})`, () => {
  it("selects five actual dated state sessions from all 56 jurisdictions", () => {
    expect(CHIEF_EXECUTIVE_JURISDICTIONS).toHaveLength(56);
    expect(cases).toHaveLength(5);
  });
  describe.each(cases)("$usps actual controlled sponsor", ({ usps }) => {
    it("admits the supplied open-session roll and preserves its actual people's ballots", () => {
      const fixture = floorFixture(usps);
      const result = applyInstitutionStep(
        fixture.world,
        fixture.measure.id,
        (world) => world,
        { recordedFloorVote: fixture.vote },
      );
      expect(result.kind).toBe("applied");
      if (result.kind !== "applied")
        throw new Error(`Open-session recorded floor vote was ${result.kind}`);
      const votes = result.world.history.legislativeVotes!.filter(
        (vote) => vote.stableKey === `${fixture.vote.stableKey}:vote`,
      );
      expect(votes).toHaveLength(1);
      expect(votes[0]!.dispositions).toEqual(fixture.vote.dispositions);
      expect(result.world.control).toEqual(fixture.world.control);
      const resumed = deserializeWorld(serializeWorld(result.world));
      const repeated = applyInstitutionStep(
        resumed,
        fixture.measure.id,
        (world) => world,
        { recordedFloorVote: fixture.vote },
      );
      const after =
        ("world" in repeated ? repeated.world : undefined) ?? resumed;
      expect(
        after.history.legislativeVotes!.filter(
          (vote) => vote.stableKey === `${fixture.vote.stableKey}:vote`,
        ),
      ).toEqual(votes);
    });
    it("applies the ordinary session-end outcome to supplied rolls without saving a floor vote", () => {
      const fixture = floorFixture(usps);
      const closed = deserializeWorld(
        serializeWorld(on(fixture.world, addDays(fixture.closedOn, 1))),
      );
      expect(measureSessionIsClosed(closed, fixture.measure.id).closed).toBe(
        true,
      );
      const ordinary = applyInstitutionStep(
        {
          ...closed,
          control: { kind: "person", personId: fixture.observerPersonId },
        },
        fixture.measure.id,
        (world) => world,
      );
      const supplied = applyInstitutionStep(
        closed,
        fixture.measure.id,
        (world) => world,
        { recordedFloorVote: fixture.vote },
      );
      const expectedKind =
        fixture.pack.session.measuresDieAtAdjournment.kind === "known" &&
        fixture.pack.session.measuresDieAtAdjournment.value
          ? "ended"
          : "blocked";
      expect(ordinary.kind).toBe(expectedKind);
      expect(supplied.kind).toBe(ordinary.kind);
      if (ordinary.kind === "blocked" && supplied.kind === "blocked")
        expect(supplied.reason).toBe(ordinary.reason);
      const after =
        ("world" in supplied ? supplied.world : undefined) ?? closed;
      expect(after.history.legislativeVotes).toEqual(
        closed.history.legislativeVotes,
      );
      expect(
        after.history.legislativeVotes!.some(
          (vote) => vote.stableKey === `${fixture.vote.stableKey}:vote`,
        ),
      ).toBe(false);
      const resumed = deserializeWorld(serializeWorld(after));
      const repeated = applyInstitutionStep(
        resumed,
        fixture.measure.id,
        (world) => world,
        { recordedFloorVote: fixture.vote },
      );
      expect(
        (("world" in repeated ? repeated.world : undefined) ?? resumed).history
          .legislativeVotes,
      ).toEqual(closed.history.legislativeVotes);
    });
    it("the presentation caller retains the shared session-end result after Continue", () => {
      const fixture = floorFixture(usps);
      const closed = on(fixture.world, addDays(fixture.closedOn, 1));
      const beforeVotes = closed.history.legislativeVotes;
      const result = applyLegislativeStep(
        fixture.context,
        closed,
        "move-floor-vote",
      );
      expect(result.world.history.legislativeVotes).toEqual(beforeVotes);
      const dies = fixture.pack.session.measuresDieAtAdjournment;
      expect(measurePosition(result.world, fixture.measure.id).terminal).toBe(
        dies.kind === "known" && dies.value,
      );
      const resumed = deserializeWorld(serializeWorld(result.world));
      expect(measurePosition(resumed, fixture.measure.id)).toEqual(
        measurePosition(result.world, fixture.measure.id),
      );
      const repeated = applyLegislativeStep(
        fixture.context,
        resumed,
        "move-floor-vote",
      );
      expect(repeated.world.history.legislativeVotes).toEqual(beforeVotes);
      expect(repeated.world.history.legislativeActions).toEqual(
        resumed.history.legislativeActions,
      );
    });
    it("retains measure matching and actual seated-voter admission", () => {
      const fixture = floorFixture(usps);
      const mismatch = applyInstitutionStep(
        fixture.world,
        fixture.measure.id,
        (world) => world,
        {
          recordedFloorVote: {
            ...fixture.vote,
            measureId: fixture.world.personOrder[0]!,
          },
        },
      );
      expect(mismatch.kind).toBe("blocked");
      const duplicate = applyInstitutionStep(
        fixture.world,
        fixture.measure.id,
        (world) => world,
        {
          recordedFloorVote: {
            ...fixture.vote,
            dispositions: [
              ...fixture.vote.dispositions,
              fixture.vote.dispositions[0]!,
            ],
          },
        },
      );
      expect(duplicate.kind).toBe("blocked");
      if (duplicate.kind === "blocked")
        expect(duplicate.reason).toMatch(/vote twice/);
    });
  });
});
