import { describe, expect, it } from "vitest";
import { addDays } from "../simulation/dates";
import { advanceWorld } from "../simulation/world";
import { createFutureTransitionHandlerRegistry } from "../simulation/future-transitions";
import { smallWorld } from "../../tests/fixtures/small-world";
import { drawRandomPlace } from "../../tests/support/random-place";
import { localGoverningBodiesForJurisdiction } from "../simulation/candidacy";
import {
  ELECTION_CONTEST_TRANSITION_KEY,
  scheduleElectionContest,
  resolveElectionContest,
} from "../simulation/election-contests";
import { localGoverningBodyIdentityForOfficeKey } from "../simulation/nationwide-world/local-governing-body-candidacy-packs";
import { deserializeWorld, serializeWorld } from "../simulation/serialization";
import {
  councilElectionNight,
  returnFromCouncilElectionNight,
} from "./election-night-scene";

const seed = "session13-council-night-records";
const place = drawRandomPlace(seed, (candidate) =>
  localGoverningBodiesForJurisdiction(candidate.context.jurisdiction.id).some(
    (office) => office.unit.unitType === "municipality",
  ),
);

function fixture() {
  const { world } = smallWorld({ place: place.key, seed });
  const office = localGoverningBodiesForJurisdiction(
    world.people[world.personOrder[0]!]!.homeJurisdictionId,
  ).find(
    (row) =>
      row.unit.unitType === "municipality" && row.seat === "governing-body",
  )!;
  const candidates = world.personOrder.slice(0, 2);
  const scheduled = scheduleElectionContest(world, {
    stableKey: "council-night:authored-contest",
    jurisdictionId: world.people[candidates[0]!]!.homeJurisdictionId,
    office: {
      officeKey: office.officeKey,
      title: office.officeTitle,
      seatKey: null,
      occupationClassification: "service:elected-local-official",
    },
    electionDate: addDays(world.currentDate, 1),
    candidatePersonIds: candidates,
    provenance: {
      method: "authored",
      sourceEntityIds: [],
      note: "Authored saved-result authority fixture; not player election proof.",
    },
  });
  const contest = scheduled.history.electionContests!.at(-1)!;
  return { world: scheduled, contest, candidates };
}

function decided() {
  const f = fixture();
  const world = advanceWorld(
    f.world,
    1,
    createFutureTransitionHandlerRegistry([
      [
        ELECTION_CONTEST_TRANSITION_KEY,
        (current) => {
          const resolved = resolveElectionContest(current, {
            contestId: f.contest.id,
            winnerPersonId: f.candidates[0]!,
            tallies: [
              {
                candidatePersonId: f.candidates[0]!,
                votes: 60,
                voteShare: 0.6,
              },
              {
                candidatePersonId: f.candidates[1]!,
                votes: 40,
                voteShare: 0.4,
              },
            ],
          });
          return {
            world: resolved,
            status: "resolved",
            reasonKey: null,
            context: "Authored one-day saved-result fixture",
            outcomeEventId:
              resolved.history.electionContestResults!.at(-1)!.outcomeEventId,
          };
        },
      ],
    ]),
  );
  return { ...f, world };
}

describe("council election night reads saved result authority", () => {
  it("has no winner or scene before a canonical result exists", () => {
    const f = fixture();
    expect(
      councilElectionNight(f.world, f.candidates[0]!, f.contest.id),
    ).toBeNull();
  });

  it.each([0, 1])(
    "shows the actual winner and saved counts for candidate %s without writing",
    (index) => {
      const f = decided();
      const before = serializeWorld(f.world);
      const result = f.world.history.electionContestResults!.at(-1)!;
      const night = councilElectionNight(
        f.world,
        f.candidates[index]!,
        f.contest.id,
      )!;
      expect(night.winnerPersonId).toBe(result.winnerPersonId);
      expect(night.won).toBe(index === 0);
      expect(
        night.tallies.map(({ candidatePersonId, votes, voteShare }) => ({
          candidatePersonId,
          votes,
          voteShare,
        })),
      ).toEqual(result.tallies);
      expect(night.presenceEventId).toBeNull();
      expect(night.sourceRecordIds).toContain(result.outcomeEventId);
      expect(serializeWorld(f.world)).toBe(before);
      expect(
        councilElectionNight(
          deserializeWorld(before),
          f.candidates[index]!,
          f.contest.id,
        ),
      ).toEqual(night);
    },
  );

  it("records an idempotent return and preserves the actual world, clock, control and result", () => {
    const f = decided();
    const result = f.world.history.electionContestResults!.at(-1)!;
    const returned = returnFromCouncilElectionNight(
      f.world,
      f.candidates[0]!,
      result.id,
    );
    expect(returned.id).toBe(f.world.id);
    expect(returned.currentMoment).toEqual(f.world.currentMoment);
    expect(returned.control).toEqual(f.world.control);
    expect(returned.history.electionContestResults).toBe(
      f.world.history.electionContestResults,
    );
    expect(returned.history.events).toHaveLength(
      f.world.history.events.length + 1,
    );
    expect(
      returnFromCouncilElectionNight(returned, f.candidates[0]!, result.id),
    ).toBe(returned);
    const restored = deserializeWorld(serializeWorld(returned));
    expect(
      councilElectionNight(restored, f.candidates[0]!, f.contest.id)
        ?.returnedEventId,
    ).toBe(returned.history.events.at(-1)!.id);
    expect(
      returnFromCouncilElectionNight(restored, f.candidates[0]!, result.id),
    ).toBe(restored);
  });

  it("does not accept a non-candidate, a future result or another office's authority", () => {
    const f = decided();
    expect(
      councilElectionNight(f.world, f.world.personOrder[2]!, f.contest.id),
    ).toBeNull();
    const result = f.world.history.electionContestResults!.at(-1)!;
    const future = {
      ...f.world,
      history: {
        ...f.world.history,
        electionContestResults: [
          { ...result, resolvedAt: "2099-01-01" as typeof result.resolvedAt },
        ],
      },
    };
    expect(
      councilElectionNight(future, f.candidates[0]!, f.contest.id),
    ).toBeNull();
    const elsewhere = {
      ...f.world,
      history: {
        ...f.world.history,
        electionContests: [
          {
            ...f.contest,
            office: { ...f.contest.office, officeKey: "us-senate:XX:class-1" },
          },
        ],
      },
    };
    expect(
      localGoverningBodyIdentityForOfficeKey("us-senate:XX:class-1"),
    ).toBeNull();
    expect(
      councilElectionNight(elsewhere, f.candidates[0]!, f.contest.id),
    ).toBeNull();
  });
});
