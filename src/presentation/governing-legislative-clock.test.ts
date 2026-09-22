import { describe, expect, it } from "vitest";

import {
  ELECTION_CONTEST_TRANSITION_KEY,
  availableMeasureSteps,
  campaignElectionTransitionHandler,
  createFutureTransitionHandlerRegistry,
  decideGoverningMatter,
  deserializeWorld,
  electionContestResult,
  governingMatters,
  governingOfficeForPerson,
  measurePosition,
  resolveCampaignElectionFromRecordedInput,
  searchLifePlaces,
  serializeWorld,
} from "../simulation";
import type {
  EntityId,
  FutureTransitionHandlerRegistry,
  MeasureStepKey,
  World,
} from "../simulation";
import { LEGISLATIVE_INTAKE_VERSION } from "../simulation/governing/legislative-clock";
import {
  applyLegislativeCommand,
  institutionOwnsStep,
  openLegislativeWork,
} from "./legislation-world";
import {
  fileForStateExecutiveOffice,
  qualifyForStateExecutiveTerm,
} from "./nationwide-candidacy";
import { DEFAULT_NEW_GAME_SETUP, createNewGameWorld } from "./new-game";
import type { NewGameSetup } from "./new-game";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";
import { openOrdinaryLife, passOrdinaryDays } from "./ordinary-life";
import { resolvePlayerCapabilities } from "./player-capabilities";

const STAFF: Omit<NewGameSetup, "seed"> = {
  placeKey: "kentucky",
  startAge: 30,
  depth: "summarize-earlier-life",
  startingLife: "legislative-office",
  household: "shares-a-home",
  givenName: null,
  familyName: null,
};

function passTo(world: World, until: string): World {
  let next = world;
  for (let step = 0; step < 120 && next.currentDate < until; step += 1) {
    const days = Math.round(
      (Date.parse(until) - Date.parse(next.currentDate)) / 86_400_000,
    );
    next = passOrdinaryDays(next, Math.max(1, Math.min(30, days)));
  }
  return next;
}

describe("GOVERNING 5: the office moves only its own chamber's steps", () => {
  it("refuses other-chamber steps without writing, and the institution carries the bill on the clock", () => {
    const game = createNewGameWorld({ ...STAFF, seed: "governing-clock" });
    const capabilities = resolvePlayerCapabilities(game.world);
    const opened = openLegislativeWork(game.world, {
      scenarioKey: "kentucky",
      playerPersonId: game.playerPersonId,
      jurisdictionId: capabilities.legislativeJurisdictionId!,
    });
    const { assignment } = opened;
    let world = opened.world;
    let refusedChecked = false;
    let waited = 0;
    for (let turn = 0; turn < 80; turn += 1) {
      const position = measurePosition(world, assignment.measureId);
      if (position.terminal) break;
      const steps: readonly MeasureStepKey[] = availableMeasureSteps(
        world,
        assignment.measureId,
      );
      const step = steps.find((key) => key !== "offer-amendment") ?? steps[0];
      if (!step) break;
      if (institutionOwnsStep(world, assignment, step)) {
        if (!refusedChecked) {
          const before = serializeWorld(world);
          expect(() =>
            applyLegislativeCommand(world, assignment, {
              kind: "take-step",
              step,
            }),
          ).toThrow(/only wait/);
          expect(serializeWorld(world)).toBe(before);
          refusedChecked = true;
        }
        try {
          world = applyLegislativeCommand(world, assignment, {
            kind: "await-institution",
            step,
          }).world;
        } catch (error) {
          // A session that closed stops the institution truthfully.
          expect(String(error)).toMatch(/not moving this session/);
          break;
        }
        waited += 1;
        continue;
      }
      if (step === "await-executive-decision") {
        world = passOrdinaryDays(world, 3);
        continue;
      }
      world = applyLegislativeCommand(world, assignment, {
        kind: "take-step",
        step,
      }).world;
    }
    expect(refusedChecked).toBe(true);
    expect(waited).toBeGreaterThan(0);
    const acted = (world.history.legislativeActions ?? []).filter(
      (action) => action.measureId === assignment.measureId,
    );
    expect(acted.some((action) => action.kind === "transmitted")).toBe(true);
    // The second chamber acted without the office taking its steps.
    expect(
      acted.some(
        (action) =>
          action.chamberKey !== null &&
          action.chamberKey !==
            world.history.legislativeMeasures!.find(
              (m) => m.id === assignment.measureId,
            )!.originChamberKey,
      ),
    ).toBe(true);
    const final = measurePosition(world, assignment.measureId);
    const reopened = deserializeWorld(serializeWorld(world));
    expect(measurePosition(reopened, assignment.measureId)).toEqual(final);
  }, 600_000);
});

function suppliedWin(personId: EntityId): FutureTransitionHandlerRegistry {
  return createFutureTransitionHandlerRegistry([
    [
      ELECTION_CONTEST_TRANSITION_KEY,
      (atDate, due) => {
        const contest = (atDate.history.electionContests ?? []).find((c) =>
          due.entityIds.includes(c.id),
        );
        if (!contest || !contest.candidatePersonIds.includes(personId))
          return campaignElectionTransitionHandler(atDate, due);
        const resolved = resolveCampaignElectionFromRecordedInput(atDate, {
          contestId: contest.id,
          winnerPersonId: personId,
          tallies: contest.candidatePersonIds.map((candidatePersonId) => ({
            candidatePersonId,
            votes: candidatePersonId === personId ? 2 : 1,
            voteShare: candidatePersonId === personId ? 2 / 3 : 1 / 3,
          })),
          provenance: {
            method: "authored",
            sourceEntityIds: [],
            note: "Supplied fictional test result; not a forecast.",
          },
        });
        return {
          world: resolved,
          status: "resolved",
          reasonKey: null,
          context: "Supplied recorded-result fixture.",
          outcomeEventId: electionContestResult(resolved, contest.id)!
            .outcomeEventId,
        };
      },
    ],
  ]);
}

describe("GOVERNING 5: a real bill reaches the governor's desk", () => {
  it("the Alaska legislature files a written measure, and the player governor signs it into law", () => {
    const place = searchLifePlaces("", 1, {
      stateJurisdictionKey: "US-AK",
      scope: "locality",
    })[0]!;
    const game = generateOpeningLife(
      prepareOpeningLife({
        ...DEFAULT_NEW_GAME_SETUP,
        seed: "governing-desk-ak",
        placeKey: place.key,
        startAge: 45,
        questionnaire: "skipped",
      }),
    ).game!;
    const personId = game.playerPersonId;
    let world = fileForStateExecutiveOffice(
      openOrdinaryLife(game.world, personId),
      personId,
    );
    const handlers = suppliedWin(personId);
    for (let step = 0; step < 20 && world.currentDate < "2026-11-05"; step += 1)
      world = passOrdinaryDays(world, 30, { handlers });
    world = passTo(qualifyForStateExecutiveTerm(world, personId), "2027-01-10");
    const office = governingOfficeForPerson(world, personId)!;
    expect(office.stateUsps).toBe("AK");

    world = passTo(world, "2027-02-16");
    const filed = (world.history.legislativeMeasures ?? []).filter((measure) =>
      measure.stableKey.startsWith(LEGISLATIVE_INTAKE_VERSION),
    );
    expect(filed.length).toBeGreaterThanOrEqual(1);
    for (const each of filed) expect(each.sponsorPersonId).not.toBe(personId);

    // The institution carries them; the seated members decide each one, so a
    // bill may die in committee or on the floor. The desk matter appears for
    // whichever reaches the governor.
    const intake = (w: World) =>
      (w.history.legislativeMeasures ?? []).filter((entry) =>
        entry.stableKey.startsWith(LEGISLATIVE_INTAKE_VERSION),
      );
    const desk = (w: World) =>
      governingMatters(w, office.officeKey).find(
        (m) =>
          m.family === "bill" &&
          intake(w).some((entry) => entry.id === m.measureId) &&
          m.holderPersonId === personId,
      );
    for (let step = 0; step < 12 && !desk(world); step += 1)
      world = passOrdinaryDays(world, 15);
    const matter = desk(world);
    expect(
      matter,
      intake(world)
        .map((entry) => measurePosition(world, entry.id).phase)
        .join(", "),
    ).toBeDefined();
    const measure = intake(world).find(
      (entry) => entry.id === matter!.measureId,
    )!;
    expect(measurePosition(world, measure.id).phase).toBe("awaiting-executive");
    expect(matter!.title).toContain(measure.designation);
    // A real bill waits on the desk: no game-profile lapse applies.
    expect(matter!.ifIgnored).toMatch(/waits on your desk/);
    const signed = decideGoverningMatter(world, matter!.id, "bill:sign");
    expect(signed.ok).toBe(true);
    world = passOrdinaryDays(signed.world, 10);
    expect(measurePosition(world, measure.id).phase).toBe("enacted");
    const work = governingMatters(world, office.officeKey).find(
      (m) => m.family === "implementation" && m.measureId === measure.id,
    );
    expect(work?.status).toBe("open");
  }, 900_000);
});

describe("GOVERNING 5: the office keeps working after a bill is done", () => {
  it("opens a new bill once the previous one has finished or its session closed", () => {
    const game = createNewGameWorld({ ...STAFF, seed: "governing-next-bill" });
    const capabilities = resolvePlayerCapabilities(game.world);
    const input = {
      scenarioKey: "kentucky",
      playerPersonId: game.playerPersonId,
      jurisdictionId: capabilities.legislativeJurisdictionId!,
    };
    const first = openLegislativeWork(game.world, input);
    // Same bill while it is live.
    expect(openLegislativeWork(first.world, input).assignment.measureId).toBe(
      first.assignment.measureId,
    );
    // Past the session's sourced limit the bill is history, and a new
    // session's opening files the next bill.
    const nextYear = passTo(first.world, "2027-01-15");
    expect(() =>
      applyLegislativeCommand(nextYear, first.assignment, {
        kind: "take-step",
        step: availableMeasureSteps(nextYear, first.assignment.measureId)[0]!,
      }),
    ).toThrow(/session ended/);
    const second = openLegislativeWork(nextYear, input);
    expect(second.assignment.measureId).not.toBe(first.assignment.measureId);
    expect(second.assignment.sponsorPersonId).toBe(
      first.assignment.sponsorPersonId,
    );
    const measures = second.world.history.legislativeMeasures ?? [];
    expect(
      measures.filter((m) =>
        m.stableKey.startsWith("legislative-work:kentucky:measure"),
      ),
    ).toHaveLength(2);
  }, 600_000);
});
