import { describe, expect, test } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { establishOpeningOfficeholders } from "../../presentation/opening-officeholders";
import { currentPresidentOf } from "../crisis/offices";
import { advanceWorld } from "../world";
import {
  addJudicialCourt,
  seatJudge,
  seatsForCourt,
  seatHolderAt,
} from "../judiciary/courts";
import { serializeWorld, deserializeWorld } from "../serialization";
import { governingMatters, decideGoverningMatter } from "./state-governing";
import { openChiefJusticeVacancy } from "./chief-justice-vacancy";
import { currentFederalTenure } from "../federal-tenures";
import {
  openAssociateJusticeVacancy,
  choosePresidentialNominee,
} from "./supreme-court-appointments";
import {
  CHIEF_JUSTICE_NOMINATION,
  CHIEF_JUSTICE_NOMINATED_EVENT,
  CHIEF_JUSTICE_CONFIRMATION,
  ASSOCIATE_JUSTICE_NOMINATION,
  SUPREME_COURT_NOMINATED_EVENT,
  ASSOCIATE_JUSTICE_CONFIRMATION,
  SUPREME_COURT_ID,
} from "./supreme-court-appointment-profile";
import type { World } from "../types";

function fixture(office: "chief" | "associate") {
  const initial = smallWorld({
    place: "OH",
    people: 5,
    date: "2026-02-01",
    seed: `session23-player-judicial-${office}`,
  }).world;
  const localIds = Object.values(initial.people).map((person) => person.id);
  let world = establishOpeningOfficeholders(initial, localIds[0]!);
  const presidentId = currentPresidentOf(world)!.personId;
  for (const [courtId, level] of [
    [SUPREME_COURT_ID, "federal-supreme"],
    ["session23:authored-appeals", "federal-appellate"],
  ] as const) {
    world = addJudicialCourt(world, {
      courtId,
      jurisdictionId: null,
      name: "Controlled nomination fixture court",
      level,
      parentCourtId: null,
      sourceRecordId: null,
      identityBasis: "game-profile",
      createdAt: world.currentDate,
      rules: {
        authorizedSeats: {
          state: "known",
          value: courtId === SUPREME_COURT_ID ? 9 : 1,
          basis: "game-profile",
          referenceId: "session23:controlled-fixture",
        },
        termYears: { state: "unknown", reason: "No fixed term tested." },
        mandatoryRetirementAge: { state: "unknown", reason: "Not tested." },
        caseJurisdiction: { state: "unknown", reason: "Not tested." },
        selectionRecordId: null,
        amendmentRoute: { state: "unknown", reason: "Not tested." },
      },
    });
  }
  const judicialSeatId = seatsForCourt(world, SUPREME_COURT_ID).find(
    (seat) => !seat.linkedOfficeId,
  )!.seatId;
  for (const [seatId, personId] of [
    [judicialSeatId, localIds[1]!],
    [
      seatsForCourt(world, "session23:authored-appeals")[0]!.seatId,
      localIds[2]!,
    ],
  ] as const) {
    world = seatJudge(world, {
      seatId: seatId!,
      personId: personId!,
      startedAt: world.currentDate,
      termEndsAt: null,
      retentionDueAt: null,
      selection: {
        path: "initial-world",
        selectionRecordId: null,
        decisionRecordId: null,
        selectingPersonId: null,
        contestId: null,
        note: "Authored fixture, not a natural election proof.",
      },
    });
  }
  world = { ...world, control: { kind: "person", personId: presidentId } };
  world =
    office === "chief"
      ? openChiefJusticeVacancy(world, {
          vacancyDate: world.currentDate,
          formerHolderId: currentFederalTenure(world, "us-chief-justice")!
            .personId,
        }).world
      : openAssociateJusticeVacancy(world, {
          seatId: judicialSeatId,
          vacancyDate: world.currentDate,
          formerHolderId: localIds[1]!,
          reason: "resignation",
        }).world;
  return { world, presidentId, judgeId: localIds[2]!, judicialSeatId };
}

function reachDesk(world: World, office: "chief" | "associate") {
  const transitionKey =
    office === "chief"
      ? CHIEF_JUSTICE_NOMINATION
      : ASSOCIATE_JUSTICE_NOMINATION;
  const due = world.history.futureDueItems.find(
    (row) => row.transitionKey === transitionKey,
  )!;
  const days = Math.round(
    (Date.parse(due.dueAt) - Date.parse(world.currentDate)) / 86400000,
  );
  return advanceWorld(world, days);
}

describe("player President judicial appointment adapter", () => {
  test.each(["chief", "associate"] as const)(
    "opens an actual %s vacancy and records the player's choice before the existing nomination writer",
    (office) => {
      const setup = fixture(office);
      expect(
        choosePresidentialNominee(setup.world, {
          stableKey: "no-player-auto-selection",
          presidentId: setup.presidentId,
          office,
        }),
      ).toBeNull();
      let world = reachDesk(setup.world, office);
      const nominationType =
        office === "chief"
          ? CHIEF_JUSTICE_NOMINATED_EVENT
          : SUPREME_COURT_NOMINATED_EVENT;
      expect(
        world.history.events.filter((event) => event.type === nominationType),
      ).toHaveLength(0);
      const matter = governingMatters(world, "us-president").find(
        (row) => row.family === "appointment",
      )!;
      expect(matter.status).toBe("open");
      expect(matter.deadline).toBeNull();
      expect(
        matter.options.some((option) => option.personId === setup.judgeId),
      ).toBe(true);
      world = deserializeWorld(serializeWorld(world));
      const result = decideGoverningMatter(
        world,
        matter.id,
        `person:${setup.judgeId}`,
      );
      expect(result.ok).toBe(true);
      world = result.world;
      const nomination = world.history.events.find(
        (event) => event.type === nominationType,
      )!;
      expect(
        nomination.participants.some(
          (row) =>
            row.role === "focus:subject" && row.personId === setup.judgeId,
        ),
      ).toBe(true);
      const trace = world.history.decisionTraces.find(
        (row) =>
          row.context.decisionType === "governing.supreme-court-nomination",
      )!;
      const decision = world.history.events.find(
        (event) =>
          event.type === "governing.matter-decided" &&
          event.tags.includes(`matter:${matter.id}`),
      )!;
      expect(trace.sequence).toBeLessThan(decision.sequence);
      expect(decision.sequence).toBeLessThan(nomination.sequence);
      expect(nomination.tags).toContain(`appointment-decision:${trace.id}`);
      expect(nomination.tags).toContain(`source-event:${decision.id}`);
      expect(
        world.history.futureDueItems.filter(
          (row) =>
            row.transitionKey ===
            (office === "chief"
              ? CHIEF_JUSTICE_CONFIRMATION
              : ASSOCIATE_JUSTICE_CONFIRMATION),
        ),
      ).toHaveLength(1);
      expect(
        seatHolderAt(world, "session23:authored-appeals:seat:1")?.personId,
      ).toBe(setup.judgeId);
      expect(
        decideGoverningMatter(
          deserializeWorld(serializeWorld(world)),
          matter.id,
          `person:${setup.judgeId}`,
        ).ok,
      ).toBe(false);
    },
  );

  test("refuses an unoffered person and leaves a real vacancy pending without a selected nominee", () => {
    const setup = fixture("associate");
    const world = reachDesk(setup.world, "associate");
    const matter = governingMatters(world, "us-president").find(
      (row) => row.family === "appointment",
    )!;
    const before = serializeWorld(world);
    expect(
      decideGoverningMatter(world, matter.id, `person:${setup.presidentId}`).ok,
    ).toBe(false);
    expect(serializeWorld(world)).toBe(before);
    expect(seatHolderAt(world, setup.judicialSeatId)).toBeNull();
  });
});
