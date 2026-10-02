import { describe, expect, it, vi } from "vitest";
import * as municipalGovernment from "./municipal-government";
import * as legislativeProcedureWorld from "./legislative-procedure-world";

import { createScenarioWorld } from "./demo";
import { requireLifePlace } from "./life-places";
import {
  measureActions,
  measureEnactment,
  measurePosition,
} from "./legislation";
import {
  municipalGovernmentByKey,
  municipalGovernmentForLifePlace,
  municipalRulePackFor,
} from "./municipal-government";
import { applyInstitutionStep } from "./governing/legislative-clock";
import { assertRulePackIntegrity, knownRule } from "./legislature-rules";
import { KENTUCKY_RULE_PACK } from "./legislature-rule-packs";
import {
  installMunicipalGovernment,
  evaluateMunicipalManagerElection,
  municipalManagerDecisionRuleSource,
  introduceMunicipalOrdinance,
  municipalSeats,
  seatMunicipalMember,
} from "./municipal-public-work";
import {
  admitCouncilAction,
  councilActHandlers,
  municipalOrdinanceStatus,
  municipalReadingQuestion,
  passMunicipalOrdinance,
  placeMunicipalOrdinanceOnAgenda,
  scheduleOrdinaryCouncilReading,
} from "./municipal-ordinance-procedure";
import { recordMemberBallot } from "./governing/member-ballots";
import { createFutureTransitionHandlerRegistry } from "./future-transitions";
import { deserializeWorld, serializeWorld } from "./serialization";
import { advanceWorld } from "./world";
import { addDays, makeIsoDate } from "./dates";
import type {
  EntityId,
  LegislativeVoteDisposition,
  LegislativeVoteProvenance,
  World,
} from "./types";

const PROVENANCE: LegislativeVoteProvenance = {
  method: "authored-fixture",
  note: "Test roll call supplied by the test.",
  sourceEntityIds: [],
};

function charlottesville() {
  const place = requireLifePlace("5114968");
  const government = municipalGovernmentForLifePlace(place)!;
  let world = createScenarioWorld(
    "rules-to-play-cville-ordinance",
    place.context,
    {
      peopleCount: 12,
    },
  );
  const people = world.personOrder;
  world = installMunicipalGovernment(world, {
    governmentKey: government.key,
    jurisdictionId: place.context.jurisdiction.id,
    formedAt: world.currentDate,
  });
  for (let index = 0; index < 5; index += 1) {
    world = seatMunicipalMember(world, {
      governmentKey: government.key,
      personId: people[index + 1]!,
      startedAt: world.currentDate,
      role: index === 0 ? "presiding-member" : "member",
      seatLabel: index === 0 ? "Mayor" : `Seat ${index + 1}`,
    });
  }
  const member = people[1]!;
  world = { ...world, control: { kind: "person", personId: member } };
  const council = municipalSeats(world, government.key).map(
    (seat) => seat.personId,
  );
  return { world, key: government.key, people, member, council };
}

function roll(
  council: readonly EntityId[],
  yeas: number,
  nays: number,
): readonly LegislativeVoteDisposition[] {
  return council.map((personId, index) => ({
    memberKey: `council:${index + 1}`,
    personId,
    disposition: index < yeas ? "yea" : index < yeas + nays ? "nay" : "absent",
  }));
}

function introduced(world: World, key: string, designation = "Ord. 26-1") {
  const filed = introduceMunicipalOrdinance(world, {
    governmentKey: key,
    designation,
    shortTitle: "Sidewalk dining permits",
    summary: "A general ordinance introduced by a councilor.",
  });
  if (!filed.ok) throw new Error(filed.reason);
  const measure = (filed.world.history.legislativeMeasures ?? []).at(-1)!;
  const placed = placeMunicipalOrdinanceOnAgenda(filed.world, {
    governmentKey: key,
    measureId: measure.id,
  });
  if (!placed.ok) throw new Error(placed.reason);
  return { world: placed.world, measureId: measure.id };
}

describe("a Charlottesville general ordinance through the shared measure engine", () => {
  it("resolves a scheduled council reading from saved member ballots and seated colleagues", () => {
    const { world, key, member } = charlottesville();
    const { world: onAgenda, measureId } = introduced(world, key);
    const scheduled = scheduleOrdinaryCouncilReading(onAgenda, key, measureId);
    const due = scheduled.history.futureDueItems.at(-1)!;
    expect(due.dueAt).toBe(addDays(scheduled.currentDate, 4));
    const question = municipalReadingQuestion(scheduled, key, measureId)!;
    const decided = recordMemberBallot(scheduled, {
      personId: member,
      jurisdictionId: scheduled.history.legislativeMeasures!.find(
        (measure) => measure.id === measureId,
      )!.jurisdictionId,
      question,
      ballot: "yea",
      summary: "The councilor decided to vote yea on this ordinance.",
    });
    const restored = deserializeWorld(serializeWorld(decided));
    const finished = advanceWorld(
      restored,
      4,
      createFutureTransitionHandlerRegistry([...councilActHandlers()]),
    );
    expect(measurePosition(finished, measureId).phase).toBe("enacted");
    const vote = finished.history.legislativeVotes!.find(
      (entry) => entry.measureId === measureId,
    )!;
    expect(vote.provenance.method).toBe("member-decisions");
    expect(
      vote.dispositions.find((entry) => entry.personId === member),
    ).toMatchObject({
      disposition: "yea",
      reason: "member:own-ballot",
    });
    expect(
      deserializeWorld(serializeWorld(finished)).history.legislativeVotes,
    ).toEqual(finished.history.legislativeVotes);
  });

  it("enforces the declared timing and actual quorum in the shared driver", () => {
    const { world, key, council, people } = charlottesville();
    const { world: onAgenda, measureId } = introduced(world, key);
    const applyVote = (before: World, dispositions = roll(council, 2, 1)) =>
      applyInstitutionStep(before, measureId, (unchanged) => unchanged, {
        recordedFloorVote: {
          stableKey: "shared-council-floor",
          measureId,
          dispositions,
          // A claimed present count cannot substitute for the actual roll.
          presentMembers: council.length,
          electedMembers: council.length,
          provenance: PROVENANCE,
          seatedMemberPersonIds: council,
        },
      });
    const early = advanceWorld(onAgenda, 3);
    expect(applyVote(early)).toMatchObject({
      kind: "blocked",
      reason: expect.stringMatching(/declared introduction interval is 4/),
    });
    const ready = deserializeWorld(serializeWorld(advanceWorld(onAgenda, 4)));
    expect(applyVote(ready, roll(council, 2, 0))).toMatchObject({
      kind: "blocked",
      reason: expect.stringMatching(/2 present, 3 required/),
    });
    const outsider = applyVote(ready, [
      ...roll(council, 2, 1).slice(0, 4),
      { memberKey: "outsider", personId: people[9]!, disposition: "yea" },
    ]);
    expect(outsider).toMatchObject({ kind: "blocked" });
    const duplicate = applyVote(ready, [
      ...roll(council, 2, 1),
      { memberKey: "duplicate", personId: council[0]!, disposition: "yea" },
    ]);
    expect(duplicate).toMatchObject({ kind: "blocked" });
    const passed = applyVote(ready);
    expect(passed.kind).toBe("applied");
    if (passed.kind !== "applied") throw new Error("No council floor result.");
    expect(measurePosition(passed.world, measureId).phase).toBe(
      "awaiting-enrollment",
    );
    expect(passed.world.history.legislativeVotes?.at(-1)?.dispositions).toEqual(
      roll(council, 2, 1),
    );
    expect(deserializeWorld(serializeWorld(passed.world))).toEqual(
      passed.world,
    );
    expect(applyVote(passed.world)).toEqual({ kind: "idle" });
  });

  it("keeps the D.C. second reading behind its sourced fourteen-day boundary after reload", () => {
    const place = requireLifePlace("1150000");
    const government = municipalGovernmentForLifePlace(place)!;
    let world = createScenarioWorld(
      "shared-driver-dc-readings",
      place.context,
      { peopleCount: 16 },
    );
    world = installMunicipalGovernment(world, {
      governmentKey: government.key,
      jurisdictionId: place.context.jurisdiction.id,
      formedAt: world.currentDate,
    });
    const people = world.personOrder.slice(1, 14);
    for (const [index, personId] of people.entries()) {
      world = seatMunicipalMember(world, {
        governmentKey: government.key,
        personId,
        startedAt: world.currentDate,
        role: index === 0 ? "presiding-member" : "member",
        seatLabel: `Seat ${index + 1}`,
      });
    }
    world = { ...world, control: { kind: "person", personId: people[0]! } };
    const { world: onAgenda, measureId } = introduced(
      world,
      government.key,
      "B26-1",
    );
    const council = municipalSeats(onAgenda, government.key).map(
      (seat) => seat.personId,
    );
    expect(council).toHaveLength(13);
    const applyVote = (before: World) =>
      applyInstitutionStep(before, measureId, (unchanged) => unchanged, {
        recordedFloorVote: {
          stableKey: `dc-reading:${before.currentDate}`,
          measureId,
          dispositions: roll(council, 8, 5),
          electedMembers: council.length,
          presentMembers: council.length,
          provenance: PROVENANCE,
          seatedMemberPersonIds: council,
        },
      });
    const first = applyVote(onAgenda);
    if (first.kind !== "applied") throw new Error("No first council reading.");
    const restored = deserializeWorld(serializeWorld(first.world));
    const expected = addDays(onAgenda.currentDate, 14);
    expect(measurePosition(restored, measureId).earliestNextFloorDate).toBe(
      expected,
    );
    expect(applyVote(advanceWorld(restored, 13))).toMatchObject({
      kind: "blocked",
      reason: expect.stringContaining(`cannot be taken until ${expected}`),
    });
    const second = applyVote(advanceWorld(restored, 14));
    if (second.kind !== "applied")
      throw new Error("No second council reading.");
    expect(measurePosition(second.world, measureId).phase).toBe(
      "awaiting-enrollment",
    );
    expect(
      second.world.history.legislativeVotes?.filter(
        (vote) => vote.measureId === measureId,
      ),
    ).toHaveLength(2);
    expect(deserializeWorld(serializeWorld(second.world))).toEqual(
      second.world,
    );
  });

  it("carries the existing municipal interval citations into floor rules", () => {
    const cville = municipalRulePackFor(
      municipalGovernmentByKey("us-va-charlottesville")!,
    );
    const dc = municipalRulePackFor(
      municipalGovernmentByKey("us-dc-washington")!,
    );
    if (!cville.ok || !dc.ok)
      throw new Error("The sourced packs were not admitted.");
    expect(
      cville.pack.chambers[0]!.floorStages.at(-1)?.minimumDaysFromIntroduction,
    ).toMatchObject({
      kind: "known",
      value: 4,
      source: { citation: "City Code § 2-97", verification: "verified" },
    });
    expect(
      dc.pack.chambers[0]!.floorStages.at(-1)?.readingIntervalDays,
    ).toMatchObject({
      kind: "known",
      value: 14,
      source: { citation: "D.C. Code § 1-204.12(a)", verification: "verified" },
    });
    expect(
      dc.pack.chambers[0]!.floorStages.at(-1)?.minimumDaysFromIntroduction,
    ).toBeUndefined();
    const chamber = KENTUCKY_RULE_PACK.chambers[0]!;
    const invalid = {
      ...KENTUCKY_RULE_PACK,
      chambers: [
        {
          ...chamber,
          floorStages: chamber.floorStages.map((stage) => ({
            ...stage,
            readingIntervalDays: {
              kind: "known" as const,
              value: -1,
              source: stage.source,
            },
          })),
        },
        ...KENTUCKY_RULE_PACK.chambers.slice(1),
      ],
    };
    expect(() => assertRulePackIntegrity(invalid)).toThrow(
      /nonnegative integer/,
    );
  });

  it("waits the Code's three intervening days, passes by majority of those voting, and takes effect on passage", () => {
    const { world, key, council } = charlottesville();
    const { world: onAgenda, measureId } = introduced(world, key);
    const status = municipalOrdinanceStatus(onAgenda, key, measureId)!;
    expect(status.phase).toBe("on-floor");
    expect(status.earliestPassageOn).toBe(
      makeIsoDate(
        new Date(Date.parse(`${onAgenda.currentDate}T00:00:00Z`) + 4 * 864e5)
          .toISOString()
          .slice(0, 10),
      ),
    );
    expect(status.timingRule).toContain("City Code § 2-97");

    const tooSoon = passMunicipalOrdinance(advanceWorld(onAgenda, 3), {
      governmentKey: key,
      measureId,
      dispositions: roll(council, 3, 0),
      provenance: PROVENANCE,
    });
    expect(tooSoon.ok).toBe(false);
    if (!tooSoon.ok)
      expect(tooSoon.reason).toMatch(
        /declared introduction interval is 4 elapsed days/,
      );

    const ready = advanceWorld(onAgenda, 4);
    const noQuorum = passMunicipalOrdinance(ready, {
      governmentKey: key,
      measureId,
      dispositions: roll(council, 2, 0),
      provenance: PROVENANCE,
    });
    expect(noQuorum.ok).toBe(false);
    if (!noQuorum.ok) {
      expect(noQuorum.reason).toMatch(/2 present, 3 required/);
      expect(noQuorum.world).toBe(ready);
    }

    // Two yeas and one nay with two absent is a quorum and a majority voting.
    const passed = passMunicipalOrdinance(ready, {
      governmentKey: key,
      measureId,
      dispositions: roll(council, 2, 1),
      provenance: PROVENANCE,
    });
    expect(passed.ok).toBe(true);
    if (!passed.ok) throw new Error(passed.reason);
    const enactment = measureEnactment(passed.world, measureId)!;
    expect(enactment.outcome).toBe("enacted");
    expect(enactment.effectiveAt).toBe(ready.currentDate);
    expect(measurePosition(passed.world, measureId).phase).toBe("enacted");
    expect(measureActions(passed.world, measureId).map((a) => a.kind)).toEqual([
      "introduced",
      "placed-on-calendar",
      "floor-stage-passed",
      "enrolled",
      "enacted",
    ]);

    const again = passMunicipalOrdinance(passed.world, {
      governmentKey: key,
      measureId,
      dispositions: roll(council, 3, 0),
      provenance: PROVENANCE,
    });
    expect(again.ok).toBe(false);

    const reloaded = deserializeWorld(serializeWorld(passed.world));
    expect(serializeWorld(reloaded)).toBe(serializeWorld(passed.world));
    expect(
      municipalOrdinanceStatus(reloaded, key, measureId)?.enactment,
    ).toEqual({
      resolvedAt: ready.currentDate,
      effectiveAt: ready.currentDate,
    });
  }, 60000);

  it("records a failed vote as failed, and refuses outsiders and doubled ballots without writing", () => {
    const { world, key, council, people } = charlottesville();
    const { world: onAgenda, measureId } = introduced(world, key);
    const ready = advanceWorld(onAgenda, 4);

    const outsiderBallot = passMunicipalOrdinance(ready, {
      governmentKey: key,
      measureId,
      dispositions: [
        ...roll(council, 3, 0).slice(0, 4),
        { memberKey: "council:5", personId: people[9]!, disposition: "yea" },
      ],
      provenance: PROVENANCE,
    });
    expect(outsiderBallot.ok).toBe(false);
    if (!outsiderBallot.ok) expect(outsiderBallot.world).toBe(ready);

    const doubled = passMunicipalOrdinance(ready, {
      governmentKey: key,
      measureId,
      dispositions: [
        ...roll(council, 3, 0),
        { memberKey: "council:6", personId: council[0]!, disposition: "yea" },
      ],
      provenance: PROVENANCE,
    });
    expect(doubled.ok).toBe(false);

    const resident = {
      ...ready,
      control: { kind: "person" as const, personId: people[0]! },
    };
    const byResident = passMunicipalOrdinance(resident, {
      governmentKey: key,
      measureId,
      dispositions: roll(council, 3, 0),
      provenance: PROVENANCE,
    });
    expect(byResident.ok).toBe(false);
    if (!byResident.ok)
      expect(byResident.reason).toMatch(/does not put you on it/);

    const failed = passMunicipalOrdinance(ready, {
      governmentKey: key,
      measureId,
      dispositions: roll(council, 1, 2),
      provenance: PROVENANCE,
    });
    expect(failed.ok).toBe(true);
    if (!failed.ok) throw new Error(failed.reason);
    expect(measurePosition(failed.world, measureId).phase).toBe("failed");
    expect(measureEnactment(failed.world, measureId)).toBeNull();
  }, 60000);
});

describe("explicit municipal passage interval bases", () => {
  it.each([
    { basis: "ELAPSED_DAYS" as const, minimumElapsedDays: 5, offset: 5 },
    {
      basis: "WHOLE_INTERVENING_DAYS" as const,
      minimumInterveningDays: 5,
      offset: 6,
    },
    { minimumInterveningDays: 5, offset: 6 },
  ])(
    "preserves saved-measure continuity under the $basis boundary",
    ({ offset, ...interval }) => {
      const { world, key, council } = charlottesville();
      const { world: onAgenda, measureId } = introduced(world, key);
      const government = municipalGovernmentForLifePlace(
        requireLifePlace("5114968"),
      )!;
      const reading = municipalGovernment.municipalProcedureReading(government);
      // A bounded rule fixture exercises the existing writer; it does not admit Portland.
      const spy = vi
        .spyOn(municipalGovernment, "municipalProcedureReading")
        .mockReturnValue({
          ...reading,
          procedure: {
            ...reading.procedure,
            introductionToPassage: { ...interval, sameDayException: null },
          },
        });
      const resolvePack = legislativeProcedureWorld.legislativeRulePackForWorld;
      const packSpy = vi
        .spyOn(legislativeProcedureWorld, "legislativeRulePackForWorld")
        .mockImplementation((current, packId) => {
          const pack = resolvePack(current, packId);
          if (
            packId !== onAgenda.history.legislativeMeasures!.at(-1)!.rulePackId
          )
            return pack;
          const source = {
            authority: "game-profile" as const,
            citation: "Explicit interval test fixture",
            sourceTitle: "Authored boundary fixture",
            sourceUrl: null,
            retrievedAt: null,
            verification: "game-profile" as const,
            note: "This fixture does not claim a real municipal interval.",
          };
          return {
            ...pack,
            basis: "game-profile",
            chambers: pack.chambers.map((chamber) => ({
              ...chamber,
              floorStages: chamber.floorStages.map((stage) => ({
                ...stage,
                minimumDaysFromIntroduction: knownRule(offset, source),
              })),
            })),
          };
        });
      try {
        const restored = deserializeWorld(serializeWorld(onAgenda));
        const expected = addDays(onAgenda.currentDate, offset);
        expect(
          municipalOrdinanceStatus(restored, key, measureId)?.earliestPassageOn,
        ).toBe(expected);
        const early = advanceWorld(restored, offset - 1);
        const rejected = passMunicipalOrdinance(early, {
          governmentKey: key,
          measureId,
          dispositions: roll(council, 3, 0),
          provenance: PROVENANCE,
        });
        expect(rejected.ok).toBe(false);
        if (!rejected.ok) {
          expect(rejected.reason).toContain(
            `cannot be taken until ${expected}`,
          );
        }
        expect(rejected.world).toBe(early);
        const ready = advanceWorld(restored, offset);
        const result = passMunicipalOrdinance(ready, {
          governmentKey: key,
          measureId,
          dispositions: roll(council, 3, 0),
          provenance: PROVENANCE,
        });
        expect(result.ok).toBe(true);
        expect(measureEnactment(result.world, measureId)?.effectiveAt).toBe(
          expected,
        );
        expect(deserializeWorld(serializeWorld(result.world))).toEqual(
          result.world,
        );
      } finally {
        packSpy.mockRestore();
        spy.mockRestore();
      }
    },
  );
});

describe("rules-municipal-authority/v1", () => {
  it("applies § 15.2-1428 and City Code § 2-98 by amount and date, with no veto and no other city", () => {
    const { world, key, member, people } = charlottesville();
    const onDate = makeIsoDate("2026-03-01");
    const compiled = municipalRulePackFor(municipalGovernmentByKey(key)!);
    expect(compiled.ok).toBe(true);
    if (!compiled.ok) throw new Error("Actual council rule pack required.");
    expect(
      compiled.pack.councilActions?.financialGeneralThresholdUsd,
    ).toMatchObject({ kind: "known", value: 500 });
    expect(compiled.pack.councilActions?.financialLocalRule).toMatchObject({
      kind: "known",
      value: {
        operativeOn: "2026-02-02",
        fullMembershipAboveUsd: 100,
        delayedAboveUsd: 5000,
        minimumInterveningDays: 3,
      },
    });
    expect(municipalManagerDecisionRuleSource(key)?.source).toMatchObject({
      citation: "Va. Code § 15.2-1420",
      verification: "verified",
    });
    const managerVote = evaluateMunicipalManagerElection(world, {
      governmentKey: key,
      dispositions: roll(
        municipalSeats(world, key).map((seat) => seat.personId),
        3,
        2,
      ),
    });
    expect(managerVote.ok).toBe(true);
    // Frozen decision boundaries from the removed caller, on this same body.
    for (const date of ["2026-01-05", "2026-02-02", "2026-03-01"])
      for (const amount of [0, 100, 101, 500, 501, 5000, 5001]) {
        const result = admitCouncilAction(world, {
          governmentKey: key,
          actorPersonId: member,
          kind: "APPROPRIATION",
          amountUsd: amount,
          onDate: makeIsoDate(date),
        });
        const current = date >= "2026-02-02";
        const admitted = current || amount > 500;
        expect(result.admitted).toBe(admitted);
        if (result.admitted) {
          expect(result.requiredVote.basis).toBe(
            amount > 500 || (current && amount > 100)
              ? "MAJORITY_OF_ALL_ELECTED_MEMBERS"
              : "MAJORITY_PRESENT_AND_VOTING",
          );
          expect(result.minimumInterveningDays).toBe(
            current && amount > 5000 ? 3 : null,
          );
        } else expect(result.reason).toBe("FIELD_UNKNOWN");
      }
    const big = admitCouncilAction(world, {
      governmentKey: key,
      actorPersonId: member,
      kind: "APPROPRIATION",
      amountUsd: 25_000,
      onDate,
    });
    expect(big).toMatchObject({
      admitted: true,
      requiredVote: {
        basis: "MAJORITY_OF_ALL_ELECTED_MEMBERS",
        recordedYeaNay: true,
      },
      minimumInterveningDays: 3,
      vetoApplies: false,
    });
    if (big.admitted) {
      expect(big.requiredVote.citations).toContain(
        "Code of Virginia § 15.2-1428",
      );
      expect(big.requiredVote.citations).toContain("City Code § 2-98(a)");
    }

    const tax = admitCouncilAction(world, {
      governmentKey: key,
      actorPersonId: member,
      kind: "TAX_LEVY",
      onDate,
    });
    expect(tax).toMatchObject({
      admitted: true,
      requiredVote: { basis: "MAJORITY_OF_ALL_ELECTED_MEMBERS" },
    });

    const smallBeforeAmendment = admitCouncilAction(world, {
      governmentKey: key,
      actorPersonId: member,
      kind: "APPROPRIATION",
      amountUsd: 300,
      onDate: makeIsoDate("2026-01-05"),
    });
    expect(smallBeforeAmendment).toMatchObject({
      admitted: false,
      reason: "FIELD_UNKNOWN",
    });

    expect(
      admitCouncilAction(world, {
        governmentKey: key,
        actorPersonId: people[0]!,
        kind: "APPROPRIATION",
        amountUsd: 25_000,
        onDate,
      }),
    ).toMatchObject({ admitted: false, reason: "NOT_A_MEMBER" });

    expect(
      admitCouncilAction(world, {
        governmentKey: "us-va-richmond",
        actorPersonId: member,
        kind: "ORDINANCE",
        onDate,
      }),
    ).toMatchObject({ admitted: false, reason: "UNSUPPORTED_JURISDICTION" });
  }, 60000);
});
