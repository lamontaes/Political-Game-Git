import { describe, expect, it } from "vitest";

import {
  createNewGameWorld,
  DEFAULT_NEW_GAME_SETUP,
} from "../../presentation/new-game";
import { addDays, daysBetween } from "../dates";
import {
  createFutureTransitionHandlerRegistry,
  cancelFutureDueItem,
  scheduleFutureDueItem,
} from "../future-transitions";
import { governmentUnitsForPlace } from "../government-units";
import {
  municipalGovernmentByKey,
  primaryReading,
} from "../municipal-government";
import type { PrincipleRecordInput } from "../history";
import {
  introduceMeasure,
  measurePosition,
  placeMeasureOnCalendar,
} from "../legislation";
import { currentMeasureProvisions } from "../legislative-politics";
import {
  lifePlaceStateIdentities,
  requireLifePlace,
  searchLifePlaces,
} from "../life-places";
import { SeededRng } from "../rng";
import { personName } from "../people";
import {
  LOCAL_COUNCIL_MEETING,
  localCouncilMeetingHandlers,
  LOCAL_COUNCIL_MEETINGS_VERSION,
  townQuestions,
} from "../living-world/local-council-meetings";
import {
  ensureLocalGovernmentSeats,
  sittingLocalOfficers,
} from "../living-world/local-government-seats";
import { playerTown } from "../living-world/town-residents";
import { townCouncilProfilePackId } from "../town-council-profile";
import { municipalGovernmentForUnit } from "../rule-capability-resolver";
import { LOCAL_ORDINANCE_GAME_PROFILE_VERSION } from "../local-ordinance-game-profile";
import { ensureMunicipalCouncilOpening } from "../municipal-council-opening";
import { municipalSeats } from "../municipal-public-work";
import {
  councilActHandlers,
  COUNCIL_READING_DUE,
  completeCouncilPassage,
} from "../municipal-ordinance-procedure";
import { createFormationContext, recordPrinciples } from "../politics";
import { deserializeWorld, serializeWorld } from "../serialization";
import type { EntityId, World } from "../types";
import { advanceWorld } from "../world";
import { AUTOMATIC_LAW_POSITION_MAPPINGS } from "./automatic-legislation";
import { lawInForce, statuteAnswer } from "./law-in-force";
import { mayAnswerQuestion } from "./question-authority";
import {
  LOCAL_MEMBER_AGENDA_INTAKE,
  LOCAL_MEMBER_AGENDA_VERSION,
  localMemberAgendaHandlers,
  scheduleLocalMemberAgendaIntakes,
} from "./member-agenda";

const place = requireLifePlace("0162328");
const city = governmentUnitsForPlace(place.sourceGeoid!).find(
  (unit) => unit.unitType === "municipality" && unit.functionalActive,
)!;
const localPackId = `${city.id}:${LOCAL_ORDINANCE_GAME_PROFILE_VERSION}`;
const intakeKeyFor = (dueAt: string) =>
  `${LOCAL_MEMBER_AGENDA_VERSION}:intake:${encodeURIComponent(city.id)}:${dueAt}`;
const handlers = createFutureTransitionHandlerRegistry([
  ...localMemberAgendaHandlers(),
  ...councilActHandlers(),
]);

/** The same GEOID and opened five-seat council as local-fiscal-authority.test. */
function openedWorld(): World {
  const game = createNewGameWorld({
    ...DEFAULT_NEW_GAME_SETUP,
    seed: "local-member-agenda-0162328",
    placeKey: place.key,
    startAge: 34,
    questionnaire: "skipped",
  });
  let world: World = ensureMunicipalCouncilOpening(game.world, city.id);
  const seats = municipalSeats(world, city.id).filter(
    (seat) => seat.role === "member" || seat.role === "presiding-member",
  );
  // The council is the size its compiled government declares (not always five).
  expect(seats).toHaveLength(
    primaryReading(municipalGovernmentByKey(city.id)!).bodySize!,
  );
  // As in the existing local authority fixture, control one councilor and
  // leave the other seated people to file and vote for themselves.
  world = {
    ...world,
    control: { kind: "person", personId: seats[0]!.personId },
  };
  const supporting = ["fiscal-restraint", "environmental-stewardship"].map(
    (key) =>
      Object.values(world.policyCatalog.principles).find(
        (principle) => principle.stableKey === `us-policy-positions:${key}`,
      )!,
  );
  expect(supporting.every(Boolean)).toBe(true);
  const principles: PrincipleRecordInput[] = seats.slice(1).flatMap((seat) =>
    supporting.map((principle) => ({
      stableKey: `local-agenda-fixture:${seat.personId}:${principle.stableKey}`,
      personId: seat.personId,
      principleId: principle.id,
      formedAt: world.currentDate,
      stance: "endorses",
      strength: 1,
      conviction: "settled",
      flexibility: "firm",
      qualification: null,
      formation: createFormationContext("other:drawn-before-play", {
        note: "Saved fixture convictions make the local maintenance proposal available to seated NPCs.",
      }),
      supersedesPrincipleRecordId: null,
    })),
  );
  return recordPrinciples(world, principles);
}

describe("ordinary local member fiscal agenda", () => {
  it("A80 records the actual town meeting's no-presentment outcome and keeps it after Continue", () => {
    const seed = "A80-town-passage-survivor";
    const state = new SeededRng(seed).pick(lifePlaceStateIdentities());
    const drawnPlace = searchLifePlaces("", 100, {
      stateJurisdictionKey: state.jurisdictionKey,
    }).find(
      (candidate) =>
        candidate.sourceGeoid &&
        governmentUnitsForPlace(candidate.sourceGeoid).some(
          (unit) =>
            unit.unitType === "municipality" &&
            unit.functionalActive &&
            !municipalGovernmentForUnit(unit),
        ),
    )!;
    expect(drawnPlace).toBeDefined();
    const game = createNewGameWorld({
      ...DEFAULT_NEW_GAME_SETUP,
      seed,
      placeKey: drawnPlace.key,
      startAge: 34,
      questionnaire: "skipped",
    });
    expect(game.world.control.kind).toBe("person");
    const player =
      game.world.control.kind === "person" ? game.world.control.personId : null;
    expect(player).not.toBeNull();
    let world = ensureLocalGovernmentSeats(game.world, player!);
    const town = playerTown(world, player!)!;
    const unit = governmentUnitsForPlace(drawnPlace.sourceGeoid!).find(
      (candidate) =>
        candidate.unitType === "municipality" && candidate.functionalActive,
    )!;
    const members = sittingLocalOfficers(world, unit).filter(
      (seat) => !seat.mayor,
    );
    expect(members.length).toBeGreaterThan(0);
    const netBearings = (id: EntityId) => {
      const net = new Map<EntityId, number>();
      for (const bearing of world.policyCatalog.propositions[id]!.principles ??
        [])
        net.set(
          bearing.principleId,
          (net.get(bearing.principleId) ?? 0) +
            (bearing.bearing === "consistent-with" ? 1 : -1) *
              (bearing.weight ?? 1),
        );
      return [...net].filter(([, weight]) => weight !== 0);
    };
    const question = townQuestions(world, town).find(
      (candidate) => netBearings(candidate.id).length > 0,
    )!;
    expect(question).toBeDefined();
    world = recordPrinciples(
      world,
      members.flatMap((member) =>
        netBearings(question.id).map(([principleId, weight]) => ({
          stableKey: `a80:held:${member.personId}:${principleId}`,
          personId: member.personId,
          principleId,
          formedAt: world.currentDate,
          stance: weight > 0 ? ("endorses" as const) : ("rejects" as const),
          strength: 1,
          conviction: "settled" as const,
          flexibility: "firm" as const,
          qualification: null,
          formation: createFormationContext("reflection:test", {
            note: "Authored held support on actual council members; not natural persuasion.",
          }),
          supersedesPrincipleRecordId:
            world.history.principles
              .filter(
                (record) =>
                  record.personId === member.personId &&
                  record.principleId === principleId,
              )
              .at(-1)?.id ?? null,
        })),
      ),
    );
    world = introduceMeasure(world, {
      stableKey: "a80:actual-town-passage",
      jurisdictionId: town,
      rulePackId: townCouncilProfilePackId(unit),
      designation: "ORD A80 fixture",
      shortTitle: question.name,
      summary: "A controlled actual town council proposal.",
      origin: "member-introduction",
      subjectClass: "general-policy",
      originChamberKey: "council",
      sponsorPersonId: members[0]!.personId,
      propositionIds: [question.id],
      propositionAnswers: [{ propositionId: question.id, answer: "yes" }],
    });
    const measure = world.history.legislativeMeasures!.at(-1)!;
    world = placeMeasureOnCalendar(world, {
      stableKey: "a80:actual-town-agenda",
      measureId: measure.id,
      rationale: "Supplied agenda item before the ordinary meeting handler.",
    });
    const dueAt = addDays(world.currentDate, 1);
    // Isolate this due family through saved cancellations, not a fake handler.
    // This is a controlled meeting proof, not an ordinary whole-world day.
    for (const due of world.history.futureDueItems) {
      if (due.dueAt > dueAt) continue;
      world = cancelFutureDueItem(world, {
        stableKey: `a80:isolate:${due.id}`,
        dueItemId: due.id,
        effectiveAt: world.currentDate,
        reasonKey: "civic:fixture-isolation",
        context: "Controlled A80 meeting fixture isolates other due families.",
      });
    }
    world = scheduleFutureDueItem(world, {
      stableKey: `${LOCAL_COUNCIL_MEETINGS_VERSION}:${unit.id}:meeting:${dueAt}`,
      dueAt,
      transitionKey: LOCAL_COUNCIL_MEETING,
      entityIds: [town, player!],
      jurisdictionId: town,
      provenance: {
        kind: "authored",
        note: "Controlled meeting date exercises the existing ordinary town handler.",
      },
    });
    const finished = advanceWorld(
      world,
      1,
      createFutureTransitionHandlerRegistry([...localCouncilMeetingHandlers()]),
    );
    expect(measurePosition(finished, measure.id).phase).toBe("enacted");
    const event = finished.history.events.find(
      (row) => row.stableKey === `${measure.stableKey}:executive-not-presented`,
    )!;
    expect(event).toMatchObject({
      type: "legislation.executive-not-presented",
      involvedEntityIds: [measure.id],
      participants: [],
    });
    expect(event.summary).toContain("under this profile");
    expect(
      finished.history.executiveDispositions?.some(
        (row) => row.measureId === measure.id,
      ),
    ).not.toBe(true);
    const restored = deserializeWorld(serializeWorld(finished));
    expect(restored.history.events.find((row) => row.id === event.id)).toEqual(
      event,
    );
    expect(completeCouncilPassage(restored, measure)).toBe(restored);
    console.log(
      JSON.stringify({
        seed,
        state: state.jurisdictionKey,
        place: drawnPlace.context.jurisdiction.name,
        sponsor: personName(finished.people[measure.sponsorPersonId!]!),
        measureId: measure.id,
        eventId: event.id,
        summary: event.summary,
      }),
    );
  });

  it("schedules the admitted city's own quarterly intake", () => {
    const world = openedWorld();
    const scheduled = scheduleLocalMemberAgendaIntakes(world);
    const intake = scheduled.history.futureDueItems.find(
      (item) =>
        item.transitionKey === LOCAL_MEMBER_AGENDA_INTAKE &&
        item.stableKey.startsWith(
          `${LOCAL_MEMBER_AGENDA_VERSION}:intake:${encodeURIComponent(city.id)}:`,
        ),
    );
    expect(intake).toMatchObject({
      transitionKey: LOCAL_MEMBER_AGENDA_INTAKE,
      jurisdictionId: place.context.jurisdiction.id,
    });
  });

  it("files a reasoned plain bill without a numeric reference and saves the council decision", () => {
    const world = openedWorld();
    const dueAt = addDays(world.currentDate, 1);
    const queued = scheduleFutureDueItem(world, {
      stableKey: intakeKeyFor(dueAt),
      dueAt,
      transitionKey: LOCAL_MEMBER_AGENDA_INTAKE,
      entityIds: [place.context.jurisdiction.id],
      jurisdictionId: place.context.jurisdiction.id,
      provenance: {
        kind: "authored",
        note: "Exercise the ordinary local agenda handler at one game-profile intake.",
      },
    });
    let afterIntake = advanceWorld(queued, 1, handlers);
    const intake = afterIntake.history.futureDueItems.find(
      (item) => item.stableKey === intakeKeyFor(dueAt),
    )!;
    expect(
      afterIntake.history.futureDueItemStates
        .filter((state) => state.dueItemId === intake.id)
        .at(-1),
    ).toMatchObject({
      status: "resolved",
      context:
        "The local council reached its quarterly game-profile agenda date.",
    });

    const measure = (afterIntake.history.legislativeMeasures ?? []).find(
      (entry) =>
        entry.stableKey.startsWith(
          `${LOCAL_MEMBER_AGENDA_VERSION}:${encodeURIComponent(city.id)}:`,
        ) && entry.rulePackId === localPackId,
    );
    expect(measure).toMatchObject({
      origin: "member-introduction",
      subjectClass: "general-policy",
      rulePackId: localPackId,
    });
    if (!measure) return;
    // These opening worlds have no verified current-law numeric reference.
    expect(currentMeasureProvisions(afterIntake, measure.id)).toEqual([]);
    expect(
      afterIntake.history.legislativeDraftLineages?.find(
        (lineage) => lineage.measureId === measure.id,
      ),
    ).toBeUndefined();
    expect(measure.summary).toContain("No numeric terms are requested");
    const motive = afterIntake.history.events.find(
      (event) => event.stableKey === `${measure.stableKey}:motive`,
    );
    expect(motive).toMatchObject({
      type: "legislation.sponsor-motive",
      involvedEntityIds: expect.arrayContaining([
        measure.id,
        measure.sponsorPersonId,
      ]),
    });
    const reasons = motive!.tags
      .filter((tag) => tag.startsWith("reason:principle-record:"))
      .map((tag) => tag.slice("reason:principle-record:".length));
    expect(reasons.length).toBeGreaterThan(0);
    for (const id of reasons)
      expect(
        afterIntake.history.principles.find((row) => row.id === id),
      ).toMatchObject({
        personId: measure.sponsorPersonId,
      });

    const reading = afterIntake.history.futureDueItems.find(
      (item) =>
        item.transitionKey === COUNCIL_READING_DUE &&
        item.entityIds.includes(measure.id),
    );
    expect(reading).toBeDefined();
    if (!reading) return;
    afterIntake = advanceWorld(
      afterIntake,
      daysBetween(afterIntake.currentDate, reading.dueAt),
      handlers,
    );
    const vote = (afterIntake.history.legislativeVotes ?? []).find(
      (entry) =>
        entry.measureId === measure.id && entry.purpose === "floor-stage",
    );
    expect(vote?.provenance.method).toBe("member-decisions");
    expect(
      vote?.dispositions.some(
        (disposition) =>
          disposition.personId === measure.sponsorPersonId &&
          disposition.disposition === "yea" &&
          disposition.reason?.startsWith("member:") === true,
      ),
    ).toBe(true);
    expect(measurePosition(afterIntake, measure.id).outcome).toBe(
      vote?.outcome === "passed" ? "enacted" : "failed",
    );
    const notPresented = afterIntake.history.events.find(
      (event) =>
        event.stableKey === `${measure.stableKey}:executive-not-presented`,
    );
    expect(notPresented !== undefined).toBe(vote?.outcome === "passed");
    if (notPresented) {
      expect(notPresented).toMatchObject({
        type: "legislation.executive-not-presented",
        involvedEntityIds: [measure.id],
        participants: [],
      });
      expect(notPresented.summary).toContain("under this profile");
    }
    const reloaded = deserializeWorld(serializeWorld(afterIntake));
    expect(
      reloaded.history.events.find((event) => event.id === notPresented?.id),
    ).toEqual(notPresented);
    expect(completeCouncilPassage(reloaded, measure, city.id)).toBe(reloaded);
    expect(reloaded.history.legislativeVotes).toEqual(
      afterIntake.history.legislativeVotes,
    );
    expect(currentMeasureProvisions(reloaded, measure.id)).toEqual(
      currentMeasureProvisions(afterIntake, measure.id),
    );
    expect(measurePosition(reloaded, measure.id)).toEqual(
      measurePosition(afterIntake, measure.id),
    );
  });
});

describe("a council's plain position bills", () => {
  it("keeps mapped and unsupported questions separate without inventing numeric terms", () => {
    let world = openedWorld();
    const mappedKeys = new Set(
      AUTOMATIC_LAW_POSITION_MAPPINGS.filter(
        (mapping) =>
          mapping.governmentLevel === "municipality" ||
          mapping.governmentLevel === "county",
      ).map((mapping) => mapping.propositionKey),
    );
    for (let quarter = 0; quarter < 4; quarter += 1) {
      if (quarter === 1) {
        const question = world.policyCatalog.propositionOrder
          .map((id) => world.policyCatalog.propositions[id]!)
          .find(
            (q) =>
              !mappedKeys.has(q.stableKey) &&
              mayAnswerQuestion(world, place.context.jurisdiction.id, q.id) &&
              !["yes", "closed"].includes(
                statuteAnswer(
                  lawInForce(world, place.context.jurisdiction.id, q.id),
                ) ?? "",
              ) &&
              (q.principles ?? []).reduce(
                (sum, bearing) => sum + (bearing.weight ?? 1),
                0,
              ) >= 1,
          );
        expect(question).toBeDefined();
        const playerId =
          world.control.kind === "person" ? world.control.personId : null;
        world = recordPrinciples(
          world,
          municipalSeats(world, city.id)
            .filter(
              (seat) =>
                seat.personId !== playerId &&
                (seat.role === "member" || seat.role === "presiding-member"),
            )
            .flatMap((seat) =>
              question!.principles!.map((bearing) => ({
                stableKey: `plain-agenda-reason:${seat.personId}:${bearing.principleId}`,
                personId: seat.personId,
                principleId: bearing.principleId,
                formedAt: world.currentDate,
                stance:
                  bearing.bearing === "consistent-with"
                    ? "endorses"
                    : "rejects",
                strength: 1,
                conviction: "settled",
                flexibility: "firm",
                qualification: null,
                formation: createFormationContext("experience:life", {
                  note: "Explicit saved support for a plain council question after the mapped bill was filed.",
                }),
                supersedesPrincipleRecordId:
                  world.history.principles
                    .filter(
                      (record) =>
                        record.personId === seat.personId &&
                        record.principleId === bearing.principleId,
                    )
                    .at(-1)?.id ?? null,
              })),
            ),
        );
      }
      const dueAt = addDays(world.currentDate, 1);
      world = advanceWorld(
        scheduleFutureDueItem(world, {
          stableKey: intakeKeyFor(dueAt),
          dueAt,
          transitionKey: LOCAL_MEMBER_AGENDA_INTAKE,
          entityIds: [place.context.jurisdiction.id],
          jurisdictionId: place.context.jurisdiction.id,
          provenance: {
            kind: "authored",
            note: "Exercise the ordinary local agenda handler at one game-profile intake.",
          },
        }),
        1,
        handlers,
      );
    }
    const filed = (world.history.legislativeMeasures ?? []).filter((entry) =>
      entry.stableKey.startsWith(
        `${LOCAL_MEMBER_AGENDA_VERSION}:${encodeURIComponent(city.id)}:`,
      ),
    );
    const positionBills = filed.filter((entry) =>
      (entry.propositionIds ?? []).every(
        (id) =>
          !mappedKeys.has(world.policyCatalog.propositions[id]!.stableKey),
      ),
    );
    expect(positionBills.length).toBeGreaterThan(0);
    // Each is a plain position bill the council takes up, never a money bill.
    for (const bill of positionBills) {
      expect(bill.subjectClass).toBe("general-policy");
      const phase = measurePosition(world, bill.id).phase;
      expect(["on-floor", "enacted", "failed"]).toContain(phase);
      // An enacted one is law in force, which is the only thing it moves yet.
      if (phase === "enacted")
        expect(
          lawInForce(world, bill.jurisdictionId, bill.propositionIds![0]!)
            ?.answer,
        ).toBe(bill.propositionAnswers![0]!.answer);
    }
    // A mapped question also stays plain without a verified numeric reference.
    const mappedBills = filed.filter((entry) =>
      (entry.propositionIds ?? []).some((id) =>
        mappedKeys.has(world.policyCatalog.propositions[id]!.stableKey),
      ),
    );
    expect(mappedBills).toHaveLength(1);
    expect(mappedBills[0]).toMatchObject({
      subjectClass: "general-policy",
      summary: expect.stringContaining("No numeric terms are requested"),
    });
    expect(currentMeasureProvisions(world, mappedBills[0]!.id)).toEqual([]);
    expect(world.history.legislativeDraftLineages ?? []).toHaveLength(0);
  });
});
