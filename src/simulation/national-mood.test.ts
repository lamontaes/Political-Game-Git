import { describe, expect, it, vi } from "vitest";
import { smallWorld } from "../../tests/fixtures/small-world";
import { ageOnDate, makeIsoDate } from "./dates";
import { currentFederalTenure } from "./federal-tenures";
import { lifePlaceStateIdentities } from "./life-places";
import * as nationalOffice from "./national-election-consumer";
import { viewOfOfficial } from "./official-view-reads";
import {
  nationalMoodDemocraticShift,
  presidentialSupportEstimate,
} from "./national-mood";
import { officialOpinionSubject } from "./political-opinion-subjects";
import { createFormationContext, recordPrivateBelief } from "./politics";
import { pickDistinct, SeededRng } from "./rng";
import { deserializeWorld, serializeWorld } from "./serialization";
import { majorPartyOf } from "./statewide-electorate";
import type { EntityId, World } from "./types";
import { recordWorldEvent } from "./world";

const seed = "a117-recorded-standing";
const [place] = pickDistinct(
  new SeededRng(seed),
  lifePlaceStateIdentities(),
  1,
);
function support(
  world: World,
  voter: EntityId,
  president: EntityId,
  favorable: boolean,
  key: string,
  salience: "low" | "central" | "moderate" = "moderate",
) {
  return recordPrivateBelief(world, {
    stableKey: key,
    personId: voter,
    propositionId: null,
    subject: officialOpinionSubject(president),
    formedAt: world.currentDate,
    position: favorable ? "support" : "oppose",
    conviction: "moderate",
    salience,
    flexibility: "open",
    rationale: null,
    formation: createFormationContext("reflection:initial"),
    supersedesBeliefId:
      world.history.privateBeliefs
        .filter(
          (b) =>
            b.personId === voter &&
            b.subject?.kind === "official" &&
            b.subject.personId === president,
        )
        .at(-1)?.id ?? null,
  });
}
function fixture() {
  let world = smallWorld({
    place: place!.jurisdictionKey,
    seed,
    date: "2026-01-01",
    offices: ["congress"],
  }).world;
  const tenure = currentFederalTenure(world, "us-president")!;
  const president = tenure.personId;
  const voters = world.personOrder.filter(
    (id) =>
      id !== president &&
      ageOnDate(world.people[id]!.birthDate, world.currentDate) >= 18,
  );
  world = support(world, voters[0]!, president, true, "a117:baseline");
  // Explicit test entry record after the baseline, using the canonical tenure writer.
  const event = tenure.event;
  world = recordWorldEvent(world, {
    ...event,
    stableKey: "a117:entry",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
  });
  const adults = new Set(
    world.personOrder.filter(
      (id) => ageOnDate(world.people[id]!.birthDate, world.currentDate) >= 18,
    ),
  ).size;
  const sign =
    majorPartyOf(world, president, world.currentDate) === "democratic" ? 1 : -1;
  return { world, president, voters, adults, sign };
}
const election = makeIsoDate("2026-11-03");
describe(`recorded presidential standing (${place!.name}; seed ${seed})`, () => {
  it("has no fixed penalty when support is unchanged or missing", () => {
    const { world } = fixture();
    expect(nationalMoodDemocraticShift(world, election)).toBe(0);
    const missing = {
      ...world,
      history: { ...world.history, privateBeliefs: [] },
    };
    expect(nationalMoodDemocraticShift(missing, election)).toBe(0);
  });
  it("uses same-day sequence at inauguration, counts each adult once, and survives Save/Continue", () => {
    const f = fixture();
    const changed = support(
      f.world,
      f.voters[0]!,
      f.president,
      false,
      "a117:loss",
    );
    expect(nationalMoodDemocraticShift(changed, election)).toBe(
      -f.sign / f.adults,
    );
    const duplicate = {
      ...changed,
      personOrder: [...changed.personOrder, f.voters[0]!],
    };
    expect(
      nationalMoodDemocraticShift(
        { ...changed, seed: "another-seed" },
        election,
      ),
    ).toBe(-f.sign / f.adults);
    expect(nationalMoodDemocraticShift(duplicate, election)).toBe(
      -f.sign / f.adults,
    );
    const saved = deserializeWorld(serializeWorld(changed));
    expect(nationalMoodDemocraticShift(saved, election)).toBe(
      -f.sign / f.adults,
    );
    const recovered = support(
      saved,
      f.voters[0]!,
      f.president,
      true,
      "a117:recovered",
    );
    expect(nationalMoodDemocraticShift(recovered, election)).toBe(0);
  });
  it("adds favorable support without salience weights or historical mean", () => {
    const f = fixture();
    const changed = support(
      f.world,
      f.voters[1]!,
      f.president,
      true,
      "a117:gain",
      "central",
    );
    expect(nationalMoodDemocraticShift(changed, election)).toBe(
      f.sign / f.adults,
    );
    const unrelated = support(
      f.world,
      f.voters[0]!,
      f.voters[1]!,
      false,
      "a117:other-official",
    );
    expect(nationalMoodDemocraticShift(unrelated, election)).toBe(
      -f.sign / f.adults,
    );
  });
  it("estimates missing new presidential views from current game officials and exposes the actual donors and spread", () => {
    const f = fixture();
    const peerA = f.voters[1]!;
    const peerB = f.voters[2]!;
    let world = support(f.world, f.voters[0]!, peerA, true, "a117:peer-a");
    world = support(world, f.voters[0]!, peerB, false, "a117:peer-b");
    const estimate = presidentialSupportEstimate(
      world,
      f.president,
      world.currentDate,
    )!;
    expect(estimate.label).toContain("ESTIMATED");
    expect(estimate.peers.map((peer) => peer.officialId).sort()).toEqual(
      [peerA, peerB].sort(),
    );
    expect(estimate.peers.flatMap((peer) => peer.voterIds)).toEqual([
      f.voters[0],
      f.voters[0],
    ]);
    expect(estimate.peers.flatMap((peer) => peer.beliefIds)).toEqual(
      world.history.privateBeliefs.slice(-2).map((belief) => belief.id),
    );
    expect(estimate.mean).toBe(1 / (2 * f.adults));
    expect(estimate.spread).toBe(1 / (2 * f.adults));
    expect(nationalMoodDemocraticShift(world, election)).toBe(
      -f.sign / (2 * f.adults),
    );
    const saved = deserializeWorld(serializeWorld(world));
    expect(
      presidentialSupportEstimate(saved, f.president, saved.currentDate),
    ).toEqual(estimate);
    expect(nationalMoodDemocraticShift(saved, election)).toBe(
      -f.sign / (2 * f.adults),
    );
    const exact = support(
      world,
      f.voters[0]!,
      f.president,
      true,
      "a117:re-recorded",
    );
    expect(nationalMoodDemocraticShift(exact, election)).toBe(0);
  });
  it("uses the nearest recorded term stage without a static term curve", () => {
    const f = fixture();
    const peerA = f.voters[1]!;
    const peerB = f.voters[2]!;
    let world = support(f.world, f.voters[0]!, peerA, true, "a117:stage-a");
    world = support(world, f.voters[0]!, peerB, false, "a117:stage-b");
    const entry = currentFederalTenure(world, "us-president")!.event;
    for (const [official, date] of [
      [peerA, "2026-01-01"],
      [peerB, "2025-01-01"],
    ] as const)
      world = recordWorldEvent(world, {
        ...entry,
        stableKey: `a117:peer-entry:${official}`,
        involvedEntityIds: [official],
        occurredAt: makeIsoDate(date),
        participants: [
          {
            personId: official,
            role: "focus:subject",
            detail: "Recorded peer office entry",
          },
        ],
      });
    const estimate = presidentialSupportEstimate(
      world,
      f.president,
      world.currentDate,
    )!;
    expect(estimate.comparison).toBe("nearest-recorded-term-stage");
    expect(estimate.peers.map((peer) => peer.officialId)).toEqual([peerA]);
    expect(estimate.peers[0]!.entryRecordId).toBe(
      world.history.events.at(-2)!.id,
    );
    expect(estimate.mean).toBe(1 / f.adults);
    expect(estimate.spread).toBe(0);
  });
  it("identifies the genuinely empty comparable pool without manufacturing an estimate", () => {
    const f = fixture();
    const empty = {
      ...f.world,
      history: { ...f.world.history, privateBeliefs: [] },
    };
    expect(
      presidentialSupportEstimate(empty, f.president, empty.currentDate),
    ).toBeNull();
  });
  it("uses the recorded presidential succession instant rather than the vice-presidential entry", () => {
    const f = fixture();
    const changed = support(
      f.world,
      f.voters[0]!,
      f.president,
      false,
      "a117:before-succession",
    );
    const entry = currentFederalTenure(f.world, "us-president")!.event;
    const base = {
      id: entry.id,
      stableKey: "a117:national",
      sequence: entry.sequence,
      recordedAt: f.world.currentDate,
      electionId: entry.id,
      provenance: {
        method: "authored" as const,
        sourceEntityIds: [],
        note: "Explicit reader fixture.",
      },
    };
    const holder: NonNullable<
      ReturnType<typeof nationalOffice.nationalOfficeHolder>
    > = {
      plan: {
        ...base,
        kind: "term-plan",
        office: "vice-president",
        outcomeId: entry.id,
        personId: f.president,
        startsAt: f.world.currentMoment,
        endsAt: { ...f.world.currentMoment, date: makeIsoDate("2029-01-20") },
        qualificationNote: "Reader fixture",
        workTimeDemand: {
          expectedWeekly: { minimumHours: 10, maximumHours: 45 },
          attention: "high",
          concurrency: "partly-concurrent",
          scheduleRigidity: "mixed",
          interruptibility: "limited",
          locationJurisdictionId: null,
        },
      },
      state: {
        ...base,
        kind: "term-state",
        planId: entry.id,
        effectiveAt: f.world.currentMoment,
        status: "entered",
        workRelationshipId: entry.id,
        outcomeEventId: entry.id,
        reason: null,
      },
      succession: {
        ...base,
        kind: "succession",
        sequence: changed.history.nextSequence,
        vacatedPlanId: entry.id,
        successorPlanId: entry.id,
        personId: f.president,
        deathRecordId: entry.id,
        effectiveAt: changed.currentMoment,
        basis: "us-const-amend-xxv-s1",
      },
    };
    const mock = vi
      .spyOn(nationalOffice, "nationalOfficeHolder")
      .mockReturnValue(holder);
    try {
      expect(nationalMoodDemocraticShift(changed, election)).toBe(0);
      mock.mockReturnValue({
        ...holder,
        succession: null,
        plan: { ...holder.plan, office: "president" },
      });
      expect(nationalMoodDemocraticShift({ ...changed }, election)).toBe(
        -f.sign / f.adults,
      );
    } finally {
      mock.mockRestore();
    }
  });
  it("excludes a later sequence from the inauguration read without changing the default current reader", () => {
    const f = fixture();
    const entry = currentFederalTenure(f.world, "us-president")!.event;
    const changed = support(
      f.world,
      f.voters[0]!,
      f.president,
      false,
      "a117:cutoff",
    );
    expect(
      viewOfOfficial(changed, f.voters[0]!, f.president, {
        asOfDate: f.world.currentDate,
        historySequenceExclusive: entry.sequence + 1,
      }).belief?.position,
    ).toBe("support");
    expect(
      viewOfOfficial(changed, f.voters[0]!, f.president).belief?.position,
    ).toBe("oppose");
  });
  it("adds nothing in a presidential year or an odd year", () => {
    const { world } = fixture();
    expect(nationalMoodDemocraticShift(world, makeIsoDate("2028-11-07"))).toBe(
      0,
    );
    expect(nationalMoodDemocraticShift(world, makeIsoDate("2027-11-02"))).toBe(
      0,
    );
  });
});
