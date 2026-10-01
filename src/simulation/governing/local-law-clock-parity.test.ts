import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";

import { smallWorld } from "../../../tests/fixtures/small-world";
import { addDays } from "../dates";
import { enactedLawEffects } from "../enacted-law-effects";
import {
  createFutureTransitionHandlerRegistry,
  scheduleFutureDueItem,
} from "../future-transitions";
import {
  governmentUnitsForPlace,
  governmentUnitsForState,
} from "../government-units";
import {
  municipalGovernmentByKey,
  primaryReading,
} from "../municipal-government";
import type { PrincipleRecordInput } from "../history";
import {
  introduceMeasure,
  measurePosition,
  takeFloorVote,
} from "../legislation";
import { currentMeasureProvisions } from "../legislative-politics";
import { lifePlaceByKey, requireLifePlace } from "../life-places";
import { CHIEF_EXECUTIVE_JURISDICTIONS } from "../nationwide-world/state-executive-candidacy-packs";
import { legislativePackForWorkKey } from "../legislative-institutions";
import { personName } from "../people";
import { ensureMunicipalCouncilOpening } from "../municipal-council-opening";
import { municipalSeats } from "../municipal-public-work";
import {
  COUNCIL_ACT_HANDLERS,
  COUNCIL_READING_DUE,
} from "../municipal-ordinance-procedure";
import { createFormationContext, recordPrinciples } from "../politics";
import { deserializeWorld, serializeWorld } from "../serialization";
import type {
  EntityId,
  PublicProgramAppropriationRecord,
  World,
} from "../types";
import { advanceWorld } from "../world";
import { applyInstitutionStep } from "./legislative-clock";
import { councilBallotPartisanship } from "./body-partisanship";
import {
  COUNCIL_VOTE_NOTE,
  decideCouncilVote,
  ensureCouncilPrinciples,
} from "./council-lawmaking";
import { sittingLocalOfficers } from "../living-world/local-government-seats";
import { councilRules, unitById } from "../living-world/local-council-binding";
import {
  LOCAL_COUNCIL_MEETING,
  LOCAL_COUNCIL_MEETINGS_VERSION,
  LOCAL_COUNCIL_MEETING_HANDLERS,
} from "../living-world/local-council-meetings";
import { recordCouncilReadingVote } from "../municipal-ordinance-procedure";
import { nextMeasureNumbering } from "../measure-numbering";
import { rulePackById } from "../legislature-rule-packs";
import { chamberByKey, floorStageByKey } from "../legislature-rules";
import {
  POLITICAL_REFLECTION_TRANSITION_KEY,
  politicalReflectionTransitionHandler,
} from "../living-world/political-reflection";
import {
  LOCAL_MEMBER_AGENDA_HANDLERS,
  LOCAL_MEMBER_AGENDA_INTAKE,
  LOCAL_MEMBER_AGENDA_VERSION,
} from "./member-agenda";

const councilProofSeed = "a77-actual-council-driver-20261001";
// Fixture sampling only, across all 56: retain existing admitted council packs.
const councilProofPlaces = CHIEF_EXECUTIVE_JURISDICTIONS.flatMap(
  governmentUnitsForState,
)
  .filter(
    (unit) =>
      unit.unitType === "municipality" &&
      unit.functionalActive &&
      unit.placeGeoid,
  )
  .flatMap((unit) => {
    const place = lifePlaceByKey(unit.placeGeoid!);
    const rules = councilRules(unit);
    return place &&
      rules?.governmentKey &&
      legislativePackForWorkKey(`institution:${rules.packId}`)
      ? [
          {
            placeKey: place.key,
            rank: createHash("sha256")
              .update(`${councilProofSeed}:${unit.id}`)
              .digest("hex"),
          },
        ]
      : [];
  })
  .sort((a, b) => a.rank.localeCompare(b.rank))
  .slice(0, 5);

/** A compact real council keeps this comparison to one bill and two due steps. */
function thirtyDayLawOpening(placeKey = "0162328"): {
  readonly world: World;
  readonly governmentKey: string;
  readonly jurisdictionId: EntityId;
  readonly memberSeats: ReturnType<typeof municipalSeats>;
} {
  const place = requireLifePlace(placeKey);
  const government = governmentUnitsForPlace(place.sourceGeoid!).find(
    (unit) => unit.unitType === "municipality" && unit.functionalActive,
  )!;
  const game = smallWorld({
    seed: "legislative-clock-30-day-local",
    place: place.key,
  });
  // Use the existing council binding's canonical organization identity.
  const rosterGovernmentKey =
    councilRules(government)?.governmentKey ?? government.id;
  let world = ensureMunicipalCouncilOpening(game.world, rosterGovernmentKey);
  const members = municipalSeats(world, rosterGovernmentKey).filter(
    (seat) => seat.role === "member" || seat.role === "presiding-member",
  );
  // The council is the size its compiled government declares (not always five).
  expect(members).toHaveLength(
    primaryReading(municipalGovernmentByKey(rosterGovernmentKey)!).bodySize!,
  );
  const principles = ["fiscal-restraint", "environmental-stewardship"].map(
    (key) =>
      Object.values(world.policyCatalog.principles).find(
        (entry) => entry.stableKey === `us-policy-positions:${key}`,
      )!,
  );
  expect(principles.every(Boolean)).toBe(true);
  const savedReasons: PrincipleRecordInput[] = members.flatMap((member) =>
    principles.map((principle) => ({
      stableKey: `clock-30-reason:${member.personId}:${principle.stableKey}`,
      personId: member.personId,
      principleId: principle.id,
      formedAt: world.currentDate,
      stance: "endorses",
      strength: 1,
      conviction: "settled",
      flexibility: "firm",
      qualification: null,
      formation: createFormationContext("other:drawn-before-play", {
        note: "Saved member reasons establish a bill opportunity; the clock still records every vote and disposition.",
      }),
      supersedesPrincipleRecordId: null,
    })),
  );
  world = recordPrinciples(world, savedReasons);
  const dueAt = addDays(world.currentDate, 1);
  world = scheduleFutureDueItem(world, {
    stableKey: `${LOCAL_MEMBER_AGENDA_VERSION}:intake:${encodeURIComponent(government.id)}:${dueAt}`,
    dueAt,
    transitionKey: LOCAL_MEMBER_AGENDA_INTAKE,
    entityIds: [place.context.jurisdiction.id],
    jurisdictionId: place.context.jurisdiction.id,
    provenance: {
      kind: "authored",
      note: "One near-term local intake isolates thirty days of canonical World clock behavior.",
    },
  });
  return {
    world,
    governmentKey: government.id,
    jurisdictionId: place.context.jurisdiction.id,
    memberSeats: members,
  };
}

function thirtyDayLawEvidence(
  world: World,
  governmentKey: string,
  jurisdictionId: EntityId,
) {
  const prefix = `${LOCAL_MEMBER_AGENDA_VERSION}:${encodeURIComponent(governmentKey)}:`;
  const measure = (world.history.legislativeMeasures ?? []).find((entry) =>
    entry.stableKey.startsWith(prefix),
  );
  if (!measure) return null;
  const due = world.history.futureDueItems
    .filter(
      (item) =>
        (item.transitionKey === LOCAL_MEMBER_AGENDA_INTAKE &&
          item.stableKey.includes(encodeURIComponent(governmentKey))) ||
        (item.transitionKey === COUNCIL_READING_DUE &&
          item.entityIds.includes(measure.id)),
    )
    .map((item) => ({
      stableKey: item.stableKey,
      dueAt: item.dueAt,
      transitionKey: item.transitionKey,
      state: world.history.futureDueItemStates
        .filter((state) => state.dueItemId === item.id)
        .at(-1)?.status,
    }));
  const enactment = world.history.legislativeEnactments?.find(
    (entry) => entry.measureId === measure.id,
  );
  return {
    date: world.currentDate,
    measure: {
      id: measure.id,
      stableKey: measure.stableKey,
      origin: measure.origin,
      subjectClass: measure.subjectClass,
      introducedAt: measure.introducedAt,
      sponsorPersonId: measure.sponsorPersonId,
      jurisdictionId: measure.jurisdictionId,
      rulePackId: measure.rulePackId,
    },
    provisions: currentMeasureProvisions(world, measure.id).map((entry) => ({
      provisionKey: entry.provisionKey,
      text: entry.text,
      fiscalExposureMinorUnits: entry.fiscalExposureMinorUnits,
      operativeEffect: entry.operativeEffect ?? null,
    })),
    votes: (world.history.legislativeVotes ?? [])
      .filter((entry) => entry.measureId === measure.id)
      .map((entry) => ({
        stableKey: entry.stableKey,
        takenAt: entry.takenAt,
        purpose: entry.purpose,
        outcome: entry.outcome,
        method: entry.provenance.method,
        dispositions: entry.dispositions,
      })),
    position: {
      phase: measurePosition(world, measure.id).phase,
      outcome: measurePosition(world, measure.id).outcome,
    },
    enactment: enactment
      ? {
          outcome: enactment.outcome,
          resolvedAt: enactment.resolvedAt,
          effectiveAt: enactment.effectiveAt,
        }
      : null,
    effects: enactedLawEffects(world, measure.id),
    appropriations: (world.history.publicProgramRecords ?? [])
      .filter(
        (entry): entry is PublicProgramAppropriationRecord =>
          entry.kind === "appropriation" &&
          entry.sourceMeasureId === measure.id,
      )
      .map((entry) => ({
        kind: entry.kind,
        amount: entry.amount,
        availableFrom: entry.availableFrom,
      })),
    metricStates: world.history.metricStates.filter(
      (state) => state.scope.jurisdictionId === jurisdictionId,
    ),
    due,
  };
}

describe("automatic local law under thirty days of the World clock", () => {
  expect(councilProofPlaces).toHaveLength(5);
  it.each(councilProofPlaces)(
    "A77 decides the actual council's ballots through the shared driver in $placeKey",
    ({ placeKey }) => {
      const opening = thirtyDayLawOpening(placeKey);
      const meetingOpening = scheduleFutureDueItem(opening.world, {
        stableKey: `${LOCAL_COUNCIL_MEETINGS_VERSION}:${opening.governmentKey}:posted-meeting:${addDays(opening.world.currentDate, 1)}`,
        dueAt: addDays(opening.world.currentDate, 1),
        transitionKey: LOCAL_COUNCIL_MEETING,
        entityIds: [opening.jurisdictionId],
        jurisdictionId: opening.jurisdictionId,
        provenance: {
          kind: "authored",
          note: "Controlled actual council intake for A77 driver parity.",
        },
      });
      let world = advanceWorld(
        meetingOpening,
        1,
        createFutureTransitionHandlerRegistry([
          ...LOCAL_MEMBER_AGENDA_HANDLERS,
          ...LOCAL_COUNCIL_MEETING_HANDLERS,
        ]),
      );
      const unit = unitById(opening.governmentKey)!;
      const rules = councilRules(unit)!;
      const officers = sittingLocalOfficers(world, unit);
      const members = officers.filter((seat) => !seat.mayor);
      // Authored proposal only; every voter and decision comes from saved office records.
      const numbering = nextMeasureNumbering(world, {
        jurisdictionId: opening.jurisdictionId,
        originChamber: chamberByKey(rulePackById(rules.packId), "council"),
        rulePackId: rules.packId,
      });
      world = introduceMeasure(world, {
        stableKey: "a77-controlled-actual-council-proposal",
        rulePackId: rules.packId,
        jurisdictionId: opening.jurisdictionId,
        designation: numbering.designation,
        numberingSession: numbering.numberingSession,
        shortTitle: "Council meeting room policy",
        summary:
          "Authored nonfiscal proposal isolates the existing council decision writer.",
        origin: "member-introduction",
        subjectClass: "general-policy",
        originChamberKey: "council",
        sponsorPersonId: members[0]!.personId,
      });
      const bill = world.history.legislativeMeasures!.at(-1)!;
      expect(bill).toBeDefined();
      const context = {
        localCouncil: {
          governmentUnitId: opening.governmentKey,
          townJurisdictionId: opening.jurisdictionId,
          playerPersonId: null,
        },
      };
      expect(
        applyInstitutionStep(world, bill.id, (w) => w, {
          localCouncil: {
            ...context.localCouncil,
            governmentUnitId: "missing-unit",
          },
        }).kind,
      ).toBe("blocked");
      expect(
        applyInstitutionStep(world, bill.id, (w) => w, {
          localCouncil: {
            ...context.localCouncil,
            townJurisdictionId: world.jurisdictionOrder.find(
              (id) => id !== opening.jurisdictionId,
            )!,
          },
        }).kind,
      ).toBe("blocked");
      expect(bill.rulePackId).toBe(rules.packId);
      const mayor = officers.find((seat) => seat.mayor)?.personId ?? null;
      world = ensureCouncilPrinciples(world, officers);
      if (measurePosition(world, bill.id).phase === "awaiting-referral") {
        const calendar = applyInstitutionStep(
          world,
          bill.id,
          (w) => w,
          context,
        );
        expect(calendar.kind).toBe("applied");
        if (calendar.kind !== "applied") return;
        expect(calendar.step).toBe("request-calendar-placement");
        world = calendar.world;
      }
      const chamber = chamberByKey(rulePackById(rules.packId), "council");
      const stage = floorStageByKey(
        chamber,
        measurePosition(world, bill.id).floorStageKey!,
      );
      if (
        stage.minimumDaysFromIntroduction?.kind === "known" &&
        stage.minimumDaysFromIntroduction.value > 0
      ) {
        const early = applyInstitutionStep(world, bill.id, (w) => w, context);
        expect(early.kind).toBe("blocked");
        expect(
          world.history.legislativeVotes?.filter(
            (vote) => vote.measureId === bill.id,
          ) ?? [],
        ).toEqual([]);
        // Advance the declared pack interval; no new calendar assumption.
        world = advanceWorld(
          world,
          stage.minimumDaysFromIntroduction.value,
          createFutureTransitionHandlerRegistry([
            ...LOCAL_MEMBER_AGENDA_HANDLERS,
            ...LOCAL_COUNCIL_MEETING_HANDLERS,
            ...COUNCIL_ACT_HANDLERS,
            [
              POLITICAL_REFLECTION_TRANSITION_KEY,
              politicalReflectionTransitionHandler,
            ] as const,
          ]),
        );
      }
      const dispositions = decideCouncilVote(world, {
        stableKey: `${bill.stableKey}:vote:${world.currentDate}`,
        measureId: bill.id,
        jurisdictionId: opening.jurisdictionId,
        members,
        playerPersonId: null,
        questionLabel: `Adopt ${bill.designation}`,
        executivePersonId: mayor,
        nonpartisan: councilBallotPartisanship(unit).nonpartisan,
      });
      const voteInput = {
        governmentKey: rules.governmentKey ?? opening.governmentKey,
        measureId: bill.id,
        dispositions,
        provenance: {
          method: "member-decisions" as const,
          note: COUNCIL_VOTE_NOTE,
          sourceEntityIds: [bill.id],
        },
      };
      const previous = rules.governmentKey
        ? recordCouncilReadingVote(world, voteInput)
        : {
            ok: true,
            world: takeFloorVote(world, {
              ...voteInput,
              stableKey: `${bill.stableKey}:adoption:${world.currentDate}`,
              presentMembers: dispositions.filter(
                (row) => row.disposition !== "absent",
              ).length,
              electedMembers: members.length,
            }),
          };
      const result = applyInstitutionStep(world, bill.id, (w) => w, context);
      if (result.kind !== "applied")
        console.info("[a77-driver-refusal]", result);
      expect(previous.ok).toBe(true);
      expect(result).toMatchObject({ kind: "applied" });
      if (!previous.ok || result.kind !== "applied") return;
      const vote = result.world.history
        .legislativeVotes!.filter((entry) => entry.measureId === bill.id)
        .at(-1)!;
      const oldVote = previous.world.history
        .legislativeVotes!.filter((entry) => entry.measureId === bill.id)
        .at(-1)!;
      expect(vote.dispositions).toEqual(oldVote.dispositions);
      expect(vote.tally).toEqual(oldVote.tally);
      expect(vote.outcome).toBe(oldVote.outcome);
      expect(vote.provenance).toEqual(oldVote.provenance);
      expect(vote.dispositions.map((entry) => entry.personId).sort()).toEqual(
        members.map((seat) => seat.personId).sort(),
      );
      expect(
        vote.dispositions.every((entry) => entry.reason?.startsWith("member:")),
      ).toBe(true);
      const resumed = deserializeWorld(serializeWorld(result.world));
      expect(resumed).toEqual(result.world);
      const repeated = applyInstitutionStep(
        resumed,
        bill.id,
        (w) => w,
        context,
      );
      const repeatedWorld =
        repeated.kind === "applied" ? repeated.world : resumed;
      expect(
        repeatedWorld.history.legislativeVotes!.filter(
          (entry) =>
            entry.measureId === bill.id &&
            entry.floorStageKey === vote.floorStageKey,
        ),
      ).toEqual(
        resumed.history.legislativeVotes!.filter(
          (entry) =>
            entry.measureId === bill.id &&
            entry.floorStageKey === vote.floorStageKey,
        ),
      );
      expect(sittingLocalOfficers(resumed, unit)).toEqual(officers);
      const dueAt = addDays(world.currentDate, 1);
      const callerOpening = scheduleFutureDueItem(world, {
        stableKey: `${LOCAL_COUNCIL_MEETINGS_VERSION}:${unit.id}:posted-meeting:${dueAt}`,
        dueAt,
        transitionKey: LOCAL_COUNCIL_MEETING,
        entityIds: [opening.jurisdictionId],
        jurisdictionId: opening.jurisdictionId,
        provenance: {
          kind: "authored",
          note: "Controlled lawful meeting exercises moveOrdinances and existing passage callback.",
        },
      });
      const called = advanceWorld(
        callerOpening,
        1,
        createFutureTransitionHandlerRegistry([
          ...LOCAL_MEMBER_AGENDA_HANDLERS,
          ...LOCAL_COUNCIL_MEETING_HANDLERS,
          ...COUNCIL_ACT_HANDLERS,
          [
            POLITICAL_REFLECTION_TRANSITION_KEY,
            politicalReflectionTransitionHandler,
          ] as const,
        ]),
      );
      const calledVotes = called.history.legislativeVotes!.filter(
        (entry) => entry.measureId === bill.id,
      );
      expect(calledVotes).toHaveLength(1);
      expect(calledVotes[0]!.dispositions).toEqual(vote.dispositions);
      expect(measurePosition(called, bill.id).phase).toBe(
        measurePosition(previous.world, bill.id).phase,
      );
      expect(deserializeWorld(serializeWorld(called))).toEqual(called);
      console.info(
        "[a77-recorded-proof]",
        JSON.stringify({
          seed: councilProofSeed,
          worldSeed: opening.world.seed,
          placeKey,
          governmentKey: unit.id,
          rulePackId: bill.rulePackId,
          measureId: bill.id,
          date: called.currentDate,
          phase: measurePosition(called, bill.id).phase,
          voters: vote.dispositions.map((entry) => ({
            personId: entry.personId,
            name: personName(world.people[entry.personId!]!),
            disposition: entry.disposition,
            reason: entry.reason,
          })),
        }),
      );
    },
  );
  it("records the same bill, vote, effective law, fiscal result and save after one jump or daily steps", () => {
    const {
      world: opening,
      governmentKey,
      jurisdictionId,
      memberSeats,
    } = thirtyDayLawOpening();
    const handlers = createFutureTransitionHandlerRegistry([
      ...LOCAL_MEMBER_AGENDA_HANDLERS,
      ...COUNCIL_ACT_HANDLERS,
    ]);
    const jumpedAt = performance.now();
    const jumped = advanceWorld(opening, 30, handlers);
    const jumpMs = Math.round(performance.now() - jumpedAt);
    const dailyAt = performance.now();
    let daily = opening;
    for (let day = 0; day < 30; day += 1)
      daily = advanceWorld(daily, 1, handlers);
    const dailyMs = Math.round(performance.now() - dailyAt);

    expect(jumped.currentDate).toBe(addDays(opening.currentDate, 30));
    expect(daily.currentDate).toBe(jumped.currentDate);
    const actualMemberIds = memberSeats.map((seat) => seat.personId).sort();
    expect(new Set(actualMemberIds).size).toBe(actualMemberIds.length);
    const actualRoster = (world: World) =>
      municipalSeats(world, governmentKey).filter(
        (seat) => seat.role === "member" || seat.role === "presiding-member",
      );
    // This fixture has no seat turnover. Preserve the actual participation
    // identities rather than treating a named chamber or a head count as seats.
    expect(actualRoster(jumped)).toEqual(memberSeats);
    expect(actualRoster(daily)).toEqual(memberSeats);
    const jumpEvidence = thirtyDayLawEvidence(
      jumped,
      governmentKey,
      jurisdictionId,
    );
    const dailyEvidence = thirtyDayLawEvidence(
      daily,
      governmentKey,
      jurisdictionId,
    );
    expect(jumpEvidence).not.toBeNull();
    expect(dailyEvidence).toEqual(jumpEvidence);
    if (!jumpEvidence) return;

    console.info("[law-clock-30-bill]", JSON.stringify(jumpEvidence));

    expect(jumpEvidence.measure).toMatchObject({
      origin: "member-introduction",
      subjectClass: "appropriation",
      jurisdictionId,
    });
    expect(jumpEvidence.provisions).toContainEqual(
      expect.objectContaining({
        provisionKey: "amount-provided",
        operativeEffect: { kind: "public-program-appropriation" },
      }),
    );
    const amount = jumpEvidence.provisions.find(
      (entry) => entry.provisionKey === "amount-provided",
    )?.fiscalExposureMinorUnits;
    expect(amount).toBeGreaterThan(0);
    expect(jumpEvidence.due).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          transitionKey: LOCAL_MEMBER_AGENDA_INTAKE,
          state: "resolved",
        }),
        expect.objectContaining({
          transitionKey: COUNCIL_READING_DUE,
          state: "resolved",
        }),
      ]),
    );
    expect(jumpEvidence.votes).toContainEqual(
      expect.objectContaining({
        purpose: "floor-stage",
        outcome: "passed",
        method: "member-decisions",
      }),
    );
    for (const vote of jumpEvidence.votes.filter(
      (entry) => entry.purpose === "floor-stage",
    )) {
      expect(vote.method).toBe("member-decisions");
      expect(vote.dispositions.map((entry) => entry.personId).sort()).toEqual(
        actualMemberIds,
      );
    }
    expect(
      jumpEvidence.votes.some((vote) =>
        vote.dispositions.some(
          (disposition) =>
            disposition.personId !== null &&
            disposition.disposition === "yea" &&
            disposition.reason?.startsWith("member:") === true,
        ),
      ),
    ).toBe(true);
    expect(jumpEvidence.position.outcome).toBe("enacted");
    expect(jumpEvidence.enactment).toMatchObject({
      outcome: "enacted",
      effectiveAt: jumpEvidence.enactment?.resolvedAt,
    });
    expect(jumpEvidence.appropriations).toContainEqual(
      expect.objectContaining({
        amount: expect.objectContaining({ minorUnits: amount }),
      }),
    );
    expect(jumpEvidence.effects?.operativeEffectOutcomes).toContainEqual(
      expect.objectContaining({
        provisionKey: "amount-provided",
        effectKind: "public-program-appropriation",
        status: "applied",
      }),
    );
    const outlaysMetricId = Object.values(
      jumped.metricCatalog.definitions,
    ).find((definition) => definition.stableKey === "government.outlays")!.id;
    expect(
      jumpEvidence.metricStates.filter(
        (state) => state.metricId === outlaysMetricId,
      ),
    ).toEqual([]);

    expect(
      thirtyDayLawEvidence(
        deserializeWorld(serializeWorld(jumped)),
        governmentKey,
        jurisdictionId,
      ),
    ).toEqual(jumpEvidence);
    expect(
      thirtyDayLawEvidence(
        deserializeWorld(serializeWorld(daily)),
        governmentKey,
        jurisdictionId,
      ),
    ).toEqual(dailyEvidence);
    expect(actualRoster(deserializeWorld(serializeWorld(jumped)))).toEqual(
      memberSeats,
    );
    expect(actualRoster(deserializeWorld(serializeWorld(daily)))).toEqual(
      memberSeats,
    );
    console.info(
      `[law-clock-30] ${opening.currentDate} to ${jumped.currentDate}; single jump ${jumpMs} ms; thirty daily steps ${dailyMs} ms; ${jumpEvidence.votes.length} saved votes`,
    );
  }, 900_000);
});
