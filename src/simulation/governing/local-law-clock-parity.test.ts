import { describe, expect, it } from "vitest";

import {
  createNewGameWorld,
  DEFAULT_NEW_GAME_SETUP,
} from "../../presentation/new-game";
import { addDays } from "../dates";
import { enactedLawEffects } from "../enacted-law-effects";
import {
  createFutureTransitionHandlerRegistry,
  scheduleFutureDueItem,
} from "../future-transitions";
import { governmentUnitsForPlace } from "../government-units";
import type { PrincipleRecordInput } from "../history";
import { measurePosition } from "../legislation";
import { currentMeasureProvisions } from "../legislative-politics";
import { requireLifePlace } from "../life-places";
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
import {
  LOCAL_MEMBER_AGENDA_HANDLERS,
  LOCAL_MEMBER_AGENDA_INTAKE,
  LOCAL_MEMBER_AGENDA_VERSION,
} from "./member-agenda";

/** A compact real council keeps this comparison to one bill and two due steps. */
function thirtyDayLawOpening(): {
  readonly world: World;
  readonly governmentKey: string;
  readonly jurisdictionId: EntityId;
} {
  const place = requireLifePlace("0162328");
  const government = governmentUnitsForPlace(place.sourceGeoid!).find(
    (unit) => unit.unitType === "municipality" && unit.functionalActive,
  )!;
  const game = createNewGameWorld({
    ...DEFAULT_NEW_GAME_SETUP,
    seed: "legislative-clock-30-day-local",
    placeKey: place.key,
    startAge: 40,
    questionnaire: "skipped",
  });
  let world = ensureMunicipalCouncilOpening(game.world, government.id);
  const members = municipalSeats(world, government.id).filter(
    (seat) => seat.role === "member" || seat.role === "presiding-member",
  );
  expect(members).toHaveLength(5);
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
  it("records the same bill, vote, effective law, fiscal result and save after one jump or daily steps", () => {
    const {
      world: opening,
      governmentKey,
      jurisdictionId,
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
    console.info(
      `[law-clock-30] ${opening.currentDate} to ${jumped.currentDate}; single jump ${jumpMs} ms; thirty daily steps ${dailyMs} ms; ${jumpEvidence.votes.length} saved votes`,
    );
  }, 900_000);
});
