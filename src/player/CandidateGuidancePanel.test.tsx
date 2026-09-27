import { renderToStaticMarkup } from "react-dom/server";
import { beforeAll, describe, expect, it } from "vitest";
import {
  campaignLifeActivityRecords,
  homePartyChapters,
  type EntityId,
} from "../simulation";
import { requestPartyWork } from "../presentation/campaign-life-actions";
import {
  askCandidateGuidance,
  projectCandidateGuidanceScene,
} from "../presentation/candidate-guidance-scene";
import { DEFAULT_NEW_GAME_SETUP } from "../presentation/new-game";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../presentation/opening-life";
import { submitTimeCommand } from "../presentation/time-command";
import { CandidateGuidancePanel } from "./CandidateGuidancePanel";
import { CampaignLifePanel } from "./CampaignLifePanel";

let entered: ReturnType<typeof generateOpeningLife>["game"];
let personId: EntityId;

beforeAll(() => {
  const game = generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      seed: "ui-candidate-guidance-room",
      startAge: 34,
      startKind: "custom",
      placeKey: "0406260",
    }),
  ).game!;
  personId = game.playerPersonId;
  const chapter = homePartyChapters(game.world)[0]!;
  const booked = requestPartyWork(
    game.world,
    personId,
    "candidate-guidance",
    chapter.organizationId,
  );
  const activityId =
    campaignLifeActivityRecords(booked).at(-1)!.scheduledActivityId;
  entered = {
    ...game,
    world: submitTimeCommand(booked, {
      requestId: "ui-candidate-guidance-arrival",
      personId,
      sourceMoment: booked.currentMoment,
      command: { kind: "attend-activity", activityId },
    }).world,
  };
}, 300_000);

function render(world: NonNullable<typeof entered>["world"]) {
  return renderToStaticMarkup(
    <CandidateGuidancePanel
      world={world}
      personId={personId}
      onWorldChange={() => {}}
      onOpenEntity={() => {}}
      onOutcome={() => {}}
    />,
  );
}

describe("candidate guidance as reached by the player", () => {
  it("shows the saved host and exact available choices in the community room", () => {
    const scene = projectCandidateGuidanceScene(entered!.world, personId)!;
    const html = render(entered!.world);
    expect(html).toContain('data-testid="candidate-guidance-panel"');
    expect(html).toContain(scene.actors[0]!.name);
    expect(html).toContain(scene.actors[0]!.spokenLine!);
    for (const question of scene.questions)
      expect(html).toContain(question.words);
    expect(html).toContain('data-testid="stay-candidate-guidance"');
    expect(html).toContain('data-testid="leave-candidate-guidance"');
    expect(html).not.toContain("Something came up before you got there");
  });

  it("shows a recorded question and removes its one-time choice", () => {
    const scene = projectCandidateGuidanceScene(entered!.world, personId)!;
    const asked = askCandidateGuidance(
      entered!.world,
      personId,
      scene.activityId,
      "requirements",
    );
    const html = render(asked);
    expect(html).toContain('data-testid="candidate-guidance-turn"');
    expect(html).toContain("You asked:");
    expect(html).not.toContain(
      'data-testid="candidate-guidance-question-requirements"',
    );
    expect(html).toContain('data-testid="candidate-guidance-question-filing"');
  });

  it("keeps the party list from completing the active room visit a second way", () => {
    const html = renderToStaticMarkup(
      <CampaignLifePanel
        world={entered!.world}
        personId={personId}
        onWorldChange={() => {}}
      />,
    );
    expect(html).toContain("The conversation is open in the community room.");
    expect(html).not.toContain("party-work-attend-");
    expect(html).not.toContain("Something came up before you got there");
  });
});
