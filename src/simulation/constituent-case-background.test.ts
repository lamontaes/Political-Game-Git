import { describe, expect, it } from "vitest";
import { activeWorkRelationshipsAt } from "./life-queries";
import { chooseAdultOption } from "../presentation/adult-life";
import { DEFAULT_NEW_GAME_SETUP } from "../presentation/new-game";
import { generateOpeningLife, prepareOpeningLife } from "../presentation/opening-life";
import { drawRandomPlace } from "../../tests/support/random-place";
import {
  handleBackgroundConstituentCase,
  openCaseForContact,
} from "./constituent-cases";
import { recordOfficeWorkflowPreference } from "./office-workflow";
import { recordWorldEvent } from "./world";

const SEED = "b06-constituent-answers";
const PLACE = drawRandomPlace(SEED);

describe(`constituent case answers in a new ${PLACE.displayName} game`, () => {
  it("records the player's choice and evaluates the office's background answer", () => {
    const game = generateOpeningLife(
      prepareOpeningLife({
        ...DEFAULT_NEW_GAME_SETUP,
        seed: SEED,
        placeKey: PLACE.key,
        startAge: 24,
        questionnaire: "skipped",
      }),
    ).game!;
    const officialId = game.world.personOrder.find((personId) =>
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
    const relationship = activeWorkRelationshipsAt(
      game.world,
      officialId,
    ).find(({ relationship: row }) => row.kind.startsWith("employment:"))!
      .relationship;
    const residentId = game.world.personOrder.find(
      (personId) => personId !== officialId,
    )!;
    const preference = recordOfficeWorkflowPreference(game.world, {
      personId: officialId,
      officeRelationshipId: relationship.id,
      votingMode:
        relationship.kind === "employment:legislative-member"
          ? "handle-individually"
          : null,
      caseworkMode: "player-handles-all",
    });
    expect(preference.kind).toBe("recorded");
    if (preference.kind !== "recorded") return;
    const makeContact = (stableKey: string, world: typeof preference.world) =>
      recordWorldEvent(world, {
        stableKey,
        type: "life.contacted-official",
        occurredAt: world.currentDate,
        recordedAt: world.currentDate,
        jurisdictionId: world.people[residentId]!.homeJurisdictionId,
        involvedEntityIds: [residentId, officialId],
        participants: [
          { personId: residentId, role: "focus:subject", detail: null },
          { personId: officialId, role: "focus:object", detail: null },
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
    const playerContactWorld = makeContact(`b06-answer-player:${SEED}`, preference.world);
    const playerOpened = openCaseForContact(
      playerContactWorld,
      playerContactWorld.history.events.at(-1)!,
    );
    const playerCase = playerOpened.history.events.at(-1)!;
    const answered = chooseAdultOption(playerOpened, {
      personId: officialId,
      situationKey: "adult.constituent-case",
      optionKey: "help",
    });
    const playerClosure = answered.history.events.find(
      (event) =>
        event.type === "office.case-closed" &&
        event.tags.includes(`case:${playerCase.id}`),
    );
    expect(playerClosure?.tags).toContain("answer:help");

    const backgroundContactWorld = makeContact(
      `b06-answer-background:${SEED}`,
      preference.world,
    );
    const backgroundOpened = openCaseForContact(
      backgroundContactWorld,
      backgroundContactWorld.history.events.at(-1)!,
    );
    const backgroundCase = backgroundOpened.history.events.at(-1)!;
    const first = handleBackgroundConstituentCase(
      backgroundOpened,
      backgroundCase.id,
    );
    const repeated = handleBackgroundConstituentCase(
      backgroundOpened,
      backgroundCase.id,
    );
    const firstClosure = first.history.events.find(
      (event) =>
        event.type === "office.case-closed" &&
        event.tags.includes(`case:${backgroundCase.id}`),
    );
    const repeatedClosure = repeated.history.events.find(
      (event) =>
        event.type === "office.case-closed" &&
        event.tags.includes(`case:${backgroundCase.id}`),
    );
    expect(firstClosure?.tags.some((tag) => tag.startsWith("answer:"))).toBe(
      true,
    );
    expect(
      firstClosure?.participants.some(
        ({ role }) => role === "coordination:handler",
      ),
    ).toBe(true);
    expect(
      firstClosure?.tags.find((tag) => tag.startsWith("answer:")),
    ).toBe(repeatedClosure?.tags.find((tag) => tag.startsWith("answer:")));
  });
});
