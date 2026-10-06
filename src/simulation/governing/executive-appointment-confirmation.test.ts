import { writeFileSync } from "node:fs";
import { currentHistoricalCutoff } from "../queries";
import {
  createFutureTransitionHandlerRegistry,
  futureDueItemStateAt,
} from "../future-transitions";
import { officeContinuityHandlers } from "./office-continuity";
import { EXECUTIVE_APPOINTMENT_CONFIRMATION } from "./executive-appointment-confirmation";
import { describe, expect, test } from "vitest";
import { createScenarioWorld } from "../demo";
import { PORTABILITY_CONTEXT } from "../portability-fixture";
import { daysBetween, makeIsoDate } from "../dates";
import { ensureWorldStartingConditions } from "../world-setup/conditions";
import { generatePoliticalStartingConditions } from "../world-setup/political-start";
import { CRUNCH46_WORLD_OPENING_VERSION } from "../world-setup/types";
import { ensureStateLegislatureOpening } from "../nationwide-world/state-legislature-opening";
import {
  ensureStateExecutiveIncumbent,
  currentStateExecutiveHolders,
} from "../nationwide-world/state-executives";
import { advanceWorld, recordWorldEvent } from "../world";
import { recordRelationshipInteraction } from "../records";
import { serializeWorld, deserializeWorld } from "../serialization";
import { favorRecords } from "../favors";
import {
  createCharacterHistoryContextPeople,
  characterHistoryContextPersonId,
} from "../character-history";
import {
  governingOfficeForPerson,
  governingMatters,
  openExecutiveAppointmentMatter,
  decideGoverningMatter,
} from "./state-governing";
import { ensureExecutiveAppointmentOpening } from "./executive-appointment-opening";
import {
  latestExecutiveAppointmentSeat,
  recordExecutiveAppointmentVacancy,
} from "./executive-appointments";
import { executiveProfileForOfficeKey } from "../executive-authority-game-profile";
import { rulePackById } from "../legislature-rule-packs";
import { seatedChamberForPack } from "./chamber-votes";
import { confirmExecutiveAppointment } from "./executive-appointment-confirmation";

const POST = "us-ak-personnel-board";
const context = {
  location: null,
  socialContext: null,
  pressure: null,
  choice: null,
  motivation: null,
  immediateReaction: null,
};

/** Controlled producer fixture with an authored departure and acquaintance.
 * Actual opening writers supply the named board and both legislative rosters.
 * This does not prove a natural election, played hearing, or browser route. */
function nominationFixture(withLegislature: boolean) {
  let world = createScenarioWorld(
    "session23-actual-joint-confirmation",
    {
      ...PORTABILITY_CONTEXT,
      initialMoment: {
        ...PORTABILITY_CONTEXT.initialMoment,
        date: makeIsoDate("2026-02-01"),
      },
    },
    { peopleCount: 8 },
  );
  const subject = world.personOrder[0]!;
  world = ensureWorldStartingConditions(world, {
    openingVersion: CRUNCH46_WORLD_OPENING_VERSION,
    political: generatePoliticalStartingConditions,
  });
  if (withLegislature)
    world = ensureStateLegislatureOpening(world, subject, "AK");
  world = ensureStateExecutiveIncumbent(world, subject, "AK");
  const governor = currentStateExecutiveHolders(world).find(
    (holder) => holder.stateUsps === "AK",
  )!;
  const office = governingOfficeForPerson(world, governor.personId)!;
  world = ensureExecutiveAppointmentOpening(world, office);
  const term = latestExecutiveAppointmentSeat(world, POST, 1)!;
  const former = term.participants[0]!.personId;
  world = recordWorldEvent(world, {
    stableKey: "fixture:confirmation:resignation",
    type: "world.office-resignation",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: office.jurisdictionId,
    involvedEntityIds: [former],
    participants: [
      {
        personId: former,
        role: "focus:actor",
        detail: "Resigning board incumbent",
      },
    ],
    personFactConstraints: [],
    visibility: "public",
    tags: [`appointment-term:${term.id}`],
    summary: "The saved board incumbent resigned in this controlled fixture.",
    context,
  });
  world = recordExecutiveAppointmentVacancy(world, {
    incumbentTermEventId: term.id,
    cause: "resignation",
    causeEventId: world.history.events.at(-1)!.id,
  });
  const vacancy = latestExecutiveAppointmentSeat(world, POST, 1)!;
  world = createCharacterHistoryContextPeople(world, [
    {
      stableKey: "fixture:confirmation:nominee",
      givenName: "Alex",
      familyName: "Taylor",
      birthDate: makeIsoDate("1980-05-05"),
      homeJurisdictionId: office.jurisdictionId,
      birthplaceJurisdictionId: office.jurisdictionId,
    },
  ]);
  const nomineeId = characterHistoryContextPersonId(
    world,
    "fixture:confirmation:nominee",
  );
  world = recordWorldEvent(world, {
    stableKey: "fixture:confirmation:introduction",
    type: "fixture.introduced",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: office.jurisdictionId,
    involvedEntityIds: [governor.personId, nomineeId],
    participants: [
      { personId: governor.personId, role: "focus:actor", detail: null },
      { personId: nomineeId, role: "focus:subject", detail: null },
    ],
    personFactConstraints: [],
    visibility: "limited",
    tags: [],
    summary: "The governor met an actual candidate in this controlled fixture.",
    context,
  });
  world = recordRelationshipInteraction(world, {
    stableKey: "fixture:confirmation:introduction:contact",
    personIds: [governor.personId, nomineeId],
    eventId: world.history.events.at(-1)!.id,
    occurredAt: world.currentDate,
    kind: "contact:met-at-office",
    change: "formed",
    significance: "minor",
    summary: "The introduction established a saved acquaintance.",
    tags: [],
  });
  world = {
    ...world,
    control: { kind: "person", personId: governor.personId },
  };
  world = openExecutiveAppointmentMatter(world, vacancy.id);
  const matter = governingMatters(world, office.officeKey).find(
    (entry) => entry.family === "appointment",
  )!;
  const chosen = decideGoverningMatter(world, matter.id, `person:${nomineeId}`);
  expect(chosen.ok).toBe(true);
  const nomination = chosen.world.history.events.find(
    (event) => event.type === "executive.appointment-nominated",
  )!;
  return { world: chosen.world, nomination, nomineeId, term, vacancy };
}

describe("executive appointment confirmation caller", () => {
  test("missing actual rosters leave the real nomination pending without a roll call or seat", () => {
    const fixture = nominationFixture(false);
    const result = confirmExecutiveAppointment(
      fixture.world,
      fixture.nomination.id,
    );
    expect(result.status).toBe("pending");
    expect(result.reason).toContain("rosters");
    expect(result.world).toBe(fixture.world);
    expect(result.rollCallEventId).toBeNull();
    expect(result.tenureEventId).toBeNull();
  });

  test("one combined saved House and Senate roll call uses a majority of all seats and reloads its result", () => {
    const fixture = nominationFixture(true);
    const beforeFavors = favorRecords(fixture.world).length;
    const result = confirmExecutiveAppointment(
      fixture.world,
      fixture.nomination.id,
    );
    expect(result.rollCallEventId).not.toBeNull();
    const rollCall = result.world.history.events.find(
      (event) => event.id === result.rollCallEventId,
    )!;
    expect(rollCall.tags).toContain("eligible-members:60");
    expect(rollCall.tags).toContain("required-votes:31");
    const ballots = rollCall.participants.filter(
      (participant) => participant.role === "agency:confirmation-vote",
    );
    expect(ballots).toHaveLength(60);
    expect(new Set(ballots.map((ballot) => ballot.personId)).size).toBe(60);
    expect(ballots.some((ballot) => ballot.detail?.includes("house"))).toBe(
      true,
    );
    expect(ballots.some((ballot) => ballot.detail?.includes("senate"))).toBe(
      true,
    );
    expect(
      result.world.history.events.filter(
        (event) => event.type === "executive.appointment-confirmation",
      ),
    ).toHaveLength(1);
    expect(result.world.history.resourcePositions).toEqual(
      fixture.world.history.resourcePositions,
    );
    const restored = deserializeWorld(serializeWorld(result.world));
    expect(
      confirmExecutiveAppointment(restored, fixture.nomination.id),
    ).toMatchObject({
      status: result.status,
      rollCallEventId: result.rollCallEventId,
      tenureEventId: result.tenureEventId,
    });
    // The supplied nominee had only an introduction, so no preferential-tie
    // appointment debt is invented, regardless of the legislature's choice.
    expect(favorRecords(result.world)).toHaveLength(beforeFavors);
    expect(result.status).toBe("pending");
    expect(latestExecutiveAppointmentSeat(result.world, POST, 1)).toEqual(
      fixture.vacancy,
    );
    expect(rollCall.tags).toContain("yeas:0");
    expect(rollCall.tags).toContain("nays:0");
  });
  test("actual new member reasons can resolve a pending vote and seat once at the joint threshold", () => {
    const fixture = nominationFixture(true);
    const pending = confirmExecutiveAppointment(
      fixture.world,
      fixture.nomination.id,
    );
    expect(pending.status).toBe("pending");
    const ref =
      executiveProfileForOfficeKey("us-ak-governor")!.pack.presentment
        .legislativeRulePackId;
    if (ref.kind !== "known")
      throw new Error("Fixture needs the recorded legislative rule pack.");
    const pack = rulePackById(ref.value);
    const members = pack.chambers.flatMap(
      (chamber) =>
        seatedChamberForPack(
          pending.world,
          pack.packId,
          chamber.chamberKey,
          chamber.name,
        )!.body.members,
    );
    let world = pending.world;
    // Deliberately authored supportive experience is edge-case evidence. It
    // changes actual saved reasons through the same writer, never the ballot
    // or selected option. 31 supports must reach the joint threshold exactly.
    for (const member of members.slice(0, 31))
      world = recordRelationshipInteraction(world, {
        stableKey: `fixture:confirmation:member-help:${member.memberKey}`,
        personIds: [fixture.nomineeId, member.personId!],
        eventId: null,
        occurredAt: world.currentDate,
        kind: "support:carried-them",
        change: "strengthened",
        significance: "major",
        summary:
          "The member has an authored positive experience with the nominee in this threshold fixture.",
        tags: [`relationship.actor:${fixture.nomineeId}`],
      });
    const due = world.history.futureDueItems.find(
      (item) =>
        item.transitionKey === EXECUTIVE_APPOINTMENT_CONFIRMATION &&
        item.entityIds.includes(fixture.nomination.id),
    )!;
    expect(due).toBeDefined();
    expect(due.dueAt).toBe(makeIsoDate("2026-02-08"));
    const advanced = advanceWorld(
      world,
      daysBetween(world.currentDate, due.dueAt),
      createFutureTransitionHandlerRegistry(officeContinuityHandlers()),
    );
    expect(
      futureDueItemStateAt(advanced, due.id, currentHistoricalCutoff(advanced))
        ?.status,
    ).toBe("resolved");
    const result = confirmExecutiveAppointment(advanced, fixture.nomination.id);
    expect(result.status).toBe("confirmed");
    expect(result.rollCallEventId).not.toBe(pending.rollCallEventId);
    const rollCall = result.world.history.events.find(
      (event) => event.id === result.rollCallEventId,
    )!;
    expect(rollCall.tags).toContain("yeas:31");
    expect(rollCall.tags).toContain("required-votes:31");
    const tenure = latestExecutiveAppointmentSeat(result.world, POST, 1)!;
    expect(tenure.id).toBe(result.tenureEventId);
    expect(tenure.participants[0]!.personId).toBe(fixture.nomineeId);
    expect(tenure.tags).toContain(`source-event:${rollCall.id}`);
    expect(tenure.tags).toContain(
      fixture.term.tags.find((tag) => tag.startsWith("term-end:"))!,
    );
    expect(
      result.world.history.futureDueItems.some((item) =>
        item.entityIds.includes(tenure.id),
      ),
    ).toBe(true);
    expect(result.world.history.resourcePositions).toEqual(
      fixture.world.history.resourcePositions,
    );
    expect(favorRecords(result.world)).toHaveLength(
      favorRecords(fixture.world).length,
    );
    const receipt = {
      seed: result.world.seed,
      worldId: result.world.id,
      date: result.world.currentDate,
      postOfficeKey: POST,
      nomineeId: fixture.nomineeId,
      formerTermId: fixture.term.id,
      vacancyEventId: fixture.vacancy.id,
      nominationEventId: fixture.nomination.id,
      confirmationDueItemId: due.id,
      confirmationDueAt: due.dueAt,
      rollCallEventId: rollCall.id,
      tenureEventId: tenure.id,
      yeas: 31,
      eligibleMembers: 60,
      requiredVotes: 31,
      method:
        "Controlled authored departure, acquaintance, and supportive member experiences; canonical writers and clock; not natural election, new-game browser, or played hearing evidence.",
    };
    if (process.env.SESSION23_APPOINTMENT_RECEIPT_PATH)
      writeFileSync(
        process.env.SESSION23_APPOINTMENT_RECEIPT_PATH,
        `${JSON.stringify(receipt, null, 2)}\n`,
      );
    const restored = deserializeWorld(serializeWorld(result.world));
    const replay = confirmExecutiveAppointment(restored, fixture.nomination.id);
    expect(replay.status).toBe("confirmed");
    expect(replay.tenureEventId).toBe(tenure.id);
    expect(replay.world).toBe(restored);
  });
});
