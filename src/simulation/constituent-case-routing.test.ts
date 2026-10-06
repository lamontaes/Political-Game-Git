import { describe, expect, it } from "vitest";
import {
  activeOrganizationParticipationsAt,
  activeWorkRelationshipsAt,
} from "./life-queries";
import { adultLifeSituations } from "./adult-situations";
import { DEFAULT_NEW_GAME_SETUP } from "../presentation/new-game";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../presentation/opening-life";
import { drawRandomPlace } from "../../tests/support/random-place";
import { recordOfficeWorkflowPreference } from "./office-workflow";
import { openCaseForContact } from "./constituent-cases";
import {
  isExceptionCase,
  playerRoutedConstituentCase,
  routeConstituentCase,
} from "./constituent-case-routing";
import { recordWorldEvent } from "./world";
import type { HistoricalEvent } from "./types";

const SEED = "b06-constituent-routing";
const PLACE = drawRandomPlace(SEED);

describe(`constituent case routing in a new ${PLACE.displayName} game`, () => {
  it("offers cases to the player for the selected mode and sends routine ones to the handler", () => {
    const game = generateOpeningLife(
      prepareOpeningLife({
        ...DEFAULT_NEW_GAME_SETUP,
        seed: SEED,
        placeKey: PLACE.key,
        startAge: 24,
        questionnaire: "skipped",
      }),
    ).game!;
    const officeHolder = game.world.personOrder.find((personId) =>
      activeWorkRelationshipsAt(game.world, personId).some(
        ({ relationship }) =>
          relationship.kind === "employment:executive-office" ||
          relationship.kind === "employment:executive-officeholder" ||
          relationship.kind === "employment:vice-presidential-officeholder" ||
          relationship.kind === "employment:legislative-member" ||
          relationship.kind === "employment:state-agency-director" ||
          relationship.kind === "employment:judicial-office" ||
          relationship.kind === "employment:judicial-office-practice",
      ),
    )!;
    const officeRelationship = activeWorkRelationshipsAt(
      game.world,
      officeHolder,
    ).find(({ relationship }) =>
      relationship.kind.startsWith("employment:"),
    )!.relationship;
    const residentId = game.world.personOrder.find(
      (personId) => personId !== officeHolder,
    )!;
    const configured = recordOfficeWorkflowPreference(game.world, {
      personId: officeHolder,
      officeRelationshipId: officeRelationship.id,
      votingMode:
        officeRelationship.kind === "employment:legislative-member"
          ? "handle-individually"
          : null,
      caseworkMode: "player-handles-all",
    });
    expect(configured.kind).toBe("recorded");
    if (configured.kind !== "recorded") return;
    const contacted = recordWorldEvent(configured.world, {
      stableKey: `b06-routing-contact:${SEED}`,
      type: "life.contacted-official",
      occurredAt: configured.world.currentDate,
      recordedAt: configured.world.currentDate,
      jurisdictionId: configured.world.people[residentId]!.homeJurisdictionId,
      involvedEntityIds: [residentId, officeHolder],
      participants: [
        { personId: residentId, role: "focus:subject", detail: null },
        { personId: officeHolder, role: "focus:object", detail: null },
      ],
      personFactConstraints: [],
      visibility: "limited",
      tags: ["reason:general-opinion"],
      summary: "A resident made a general opinion call.",
      context: {
        location: null,
        socialContext: null,
        pressure: null,
        choice: null,
        motivation: null,
        immediateReaction: null,
      },
    });
    const openedWorld = openCaseForContact(
      contacted,
      contacted.history.events.at(-1)!,
    );
    const opened = openedWorld.history.events.at(-1)!;
    expect(playerRoutedConstituentCase(openedWorld, officeHolder)?.id).toBe(
      opened.id,
    );
    expect(
      adultLifeSituations(openedWorld, {
        personId: officeHolder,
        asOfDate: openedWorld.currentDate,
      }).some((situation) => situation.key === "adult.constituent-case"),
    ).toBe(true);
    const makeCase = (resident: string): HistoricalEvent => ({
      ...opened,
      participants: [
        { personId: officeHolder, role: "focus:object", detail: null },
        {
          personId: resident as typeof officeHolder,
          role: "focus:subject",
          detail: null,
        },
      ],
    });
    const officialResident = game.world.personOrder.find(
      (personId) =>
        personId !== officeHolder &&
        activeWorkRelationshipsAt(game.world, personId).some(
          ({ relationship }) =>
            relationship.kind === "employment:executive-office" ||
            relationship.kind === "employment:executive-officeholder" ||
            relationship.kind === "employment:vice-presidential-officeholder" ||
            relationship.kind === "employment:legislative-member" ||
            relationship.kind === "employment:state-agency-director" ||
            relationship.kind === "employment:judicial-office" ||
            relationship.kind === "employment:judicial-office-practice",
        ),
    )!;
    const exception = makeCase(officialResident);
    expect(isExceptionCase(openedWorld, exception, officeHolder)).toBe(true);
    expect(
      routeConstituentCase(
        openedWorld,
        exception,
        officeHolder,
        officeHolder,
        "staff-routine-player-exceptions",
      ),
    ).toEqual({ kind: "player" });
    const routineResident = game.world.personOrder.find((personId) => {
      if (personId === officeHolder) return false;
      const candidate = makeCase(personId);
      return !isExceptionCase(openedWorld, candidate, officeHolder);
    });
    expect(routineResident).toBeDefined();
    expect(
      routeConstituentCase(
        openedWorld,
        makeCase(routineResident!),
        officeHolder,
        officeHolder,
        "staff-routine-player-exceptions",
      ),
    ).toEqual({ kind: "handler" });
    const municipalSeat = game.world.personOrder
      .flatMap((personId) =>
        activeOrganizationParticipationsAt(game.world, personId).map(
          (entry) => ({ personId, ...entry }),
        ),
      )
      .find(
        ({ participation, state }) =>
          participation.kind === "leadership:municipal-office" &&
          state.roleKind?.startsWith("leader:municipal-") === true,
      );
    expect(municipalSeat).toBeDefined();
    const municipalPreference = recordOfficeWorkflowPreference(game.world, {
      personId: municipalSeat!.personId,
      officeRelationshipId: municipalSeat!.participation.id,
      votingMode: null,
      caseworkMode: "staff-routine-player-exceptions",
    });
    expect(municipalPreference.kind).toBe("recorded");
  });
});
