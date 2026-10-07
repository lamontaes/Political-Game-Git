import { describe, expect, it } from "vitest";
import { smallWorld } from "../../tests/fixtures/small-world";
import { addDays } from "./dates";
import {
  countRecordedVoterBallots,
  PLAYER_ELECTION_BALLOT_EVENT,
  recordedPlayerElectionBallot,
  recordPlayerElectionBallot,
} from "./election-contests";
import { isEligibleVoterIn } from "./issue-record";
import { lifePlaceStateIdentities } from "./life-places";
import { createFormationContext, recordPrivateBelief } from "./politics";
import { deserializeWorld, serializeWorldPayload } from "./serialization";
import type { EntityId, World } from "./types";
import { assertWorldIntegrity } from "./world";

function fixture(place = lifePlaceStateIdentities()[0]!.jurisdictionKey) {
  const built = smallWorld({
    place,
    seed: "session56-player-ballot",
    people: 4,
  });
  const personId = built.world.personOrder.find((id) =>
    isEligibleVoterIn(
      built.world,
      id,
      built.stateJurisdictionId,
      built.world.currentDate,
    ),
  );
  if (!personId) throw new Error(`No generated eligible voter for ${place}.`);
  const candidates = built.world.personOrder
    .filter((id) => id !== personId)
    .slice(0, 2);
  let world: World = {
    ...built.world,
    control: { kind: "person" as const, personId },
  };
  world = recordPrivateBelief(world, {
    stableKey: "ballot:prior-candidate-view",
    personId,
    propositionId: null,
    subject: { kind: "official", personId: candidates[0]! },
    formedAt: world.currentDate,
    position: "support",
    conviction: "settled",
    salience: "central",
    flexibility: "firm",
    rationale: null,
    formation: createFormationContext("reflection:initial"),
    supersedesBeliefId: null,
  });
  const input = {
    stableKey: "player-ballot:contest",
    jurisdictionId: built.stateJurisdictionId,
    candidatePersonIds: candidates,
    electionDate: world.currentDate,
  };
  return { world, personId, candidates, input, built };
}

describe("player ballot records use the shared election count", () => {
  it("honors the chosen candidate over the held view in all 56 places and preserves the unsaved fallback", () => {
    const places = lifePlaceStateIdentities();
    expect(places).toHaveLength(56);
    for (const place of places) {
      const f = fixture(place.jurisdictionKey);
      const countInput = {
        ...f.input,
        admitVoter: (id: EntityId) => id === f.personId,
      };
      const prior = countRecordedVoterBallots(f.world, countInput);
      expect(prior?.winnerPersonId, place.jurisdictionKey).toBe(
        f.candidates[0],
      );
      const chosen = recordPlayerElectionBallot(f.world, {
        ...f.input,
        candidatePersonId: f.candidates[1]!,
      });
      const tally = countRecordedVoterBallots(chosen, countInput);
      expect(tally?.winnerPersonId, place.jurisdictionKey).toBe(
        f.candidates[1],
      );
      expect(
        tally?.tallies.find((row) => row.candidatePersonId === f.candidates[1])
          ?.votes,
      ).toBe(1);
      const abstained = recordPlayerElectionBallot(chosen, {
        ...f.input,
        candidatePersonId: null,
      });
      expect(countRecordedVoterBallots(abstained, countInput)).toBeNull();
    }
  });

  it("keeps a repeated choice idempotent and preserves a changed choice through reopening", () => {
    const f = fixture();
    const input = { ...f.input, candidatePersonId: f.candidates[1]! };
    const first = recordPlayerElectionBallot(f.world, input);
    expect(recordPlayerElectionBallot(first, input)).toBe(first);
    const changed = recordPlayerElectionBallot(first, {
      ...input,
      candidatePersonId: f.candidates[0]!,
    });
    const reopened = deserializeWorld(serializeWorldPayload(changed));
    expect(
      recordedPlayerElectionBallot(
        reopened,
        input.stableKey,
        f.personId,
        input.electionDate,
        input.jurisdictionId,
      ),
    ).toBe(f.candidates[0]);
    expect(
      reopened.history.events.filter(
        (row) => row.type === PLAYER_ELECTION_BALLOT_EVENT,
      ),
    ).toHaveLength(2);
    assertWorldIntegrity(reopened);
  });

  it("does not read a candidate's involvement as that candidate's own ballot", () => {
    const f = fixture();
    const chosen = recordPlayerElectionBallot(f.world, {
      ...f.input,
      candidatePersonId: f.candidates[1]!,
    });
    expect(
      recordedPlayerElectionBallot(
        chosen,
        f.input.stableKey,
        f.candidates[1]!,
        f.input.electionDate,
      ),
    ).toBeNull();
  });

  it("keeps contest, election date, and jurisdiction boundaries", () => {
    const f = fixture();
    const chosen = recordPlayerElectionBallot(f.world, {
      ...f.input,
      candidatePersonId: f.candidates[1]!,
    });
    expect(
      recordedPlayerElectionBallot(
        chosen,
        "another-contest",
        f.personId,
        f.input.electionDate,
      ),
    ).toBeNull();
    expect(
      recordedPlayerElectionBallot(
        chosen,
        f.input.stableKey,
        f.personId,
        addDays(f.input.electionDate, 1),
      ),
    ).toBeNull();
    expect(
      recordedPlayerElectionBallot(
        chosen,
        f.input.stableKey,
        f.personId,
        f.input.electionDate,
        f.built.jurisdictionId,
      ),
    ).toBeNull();
  });

  it("allows an unopposed candidate and a resident voting for themselves", () => {
    const f = fixture();
    const input = {
      ...f.input,
      candidatePersonIds: [f.personId],
      candidatePersonId: f.personId,
    };
    const chosen = recordPlayerElectionBallot(f.world, input);
    const event = chosen.history.events.at(-1)!;
    expect(event.involvedEntityIds).toEqual([f.personId]);
    expect(
      countRecordedVoterBallots(chosen, {
        ...input,
        admitVoter: (id) => id === f.personId,
      })?.winnerPersonId,
    ).toBe(f.personId);
    assertWorldIntegrity(chosen);
  });

  it("rejects an unknown candidate or an option outside the recorded slate", () => {
    const f = fixture();
    const unknown = `${f.candidates[0]}:missing` as EntityId;
    expect(() =>
      recordPlayerElectionBallot(f.world, {
        ...f.input,
        candidatePersonIds: [unknown],
        candidatePersonId: unknown,
      }),
    ).toThrow();
    expect(() =>
      recordPlayerElectionBallot(f.world, {
        ...f.input,
        candidatePersonId: f.personId,
      }),
    ).toThrow();
  });
});
