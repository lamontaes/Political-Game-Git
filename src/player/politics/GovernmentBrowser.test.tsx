import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import * as judicialSelection from "../../presentation/judicial-selection";
import type { JudicialSelectionView } from "../../presentation/judicial-selection";
import { DEFAULT_NEW_GAME_SETUP } from "../../presentation/new-game";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../../presentation/opening-life";
import { seatedCongressChamber } from "../../simulation/governing/congress-chambers";
import { publicSeatedJudges } from "../../simulation/judiciary/candidate-discovery";
import { vacateJudicialSeat } from "../../simulation/judiciary/courts";
import type { World } from "../../simulation/types";
import { GovernmentBrowser } from "./GovernmentBrowser";

describe("GovernmentBrowser judicial receiver", () => {
  it("mounts the saved court roster at state and federal scopes", () => {
    const game = generateOpeningLife(
      prepareOpeningLife({
        ...DEFAULT_NEW_GAME_SETUP,
        seed: "team-b-government-judiciary-receiver",
      }),
    ).game!;
    const renderScope = (scope: "local" | "state" | "federal") =>
      renderToStaticMarkup(
        <GovernmentBrowser
          world={game.world}
          personId={game.playerPersonId}
          place="here"
          scope={scope}
          onSelectionChange={() => {}}
          onOpenPerson={() => {}}
          onOpenMeasure={() => {}}
        />,
      );
    expect(renderScope("local")).not.toContain(
      'data-testid="government-judiciary"',
    );
    expect(renderScope("state")).toContain('data-testid="state-court-roster"');
    const federal = renderScope("federal");
    expect(federal).toContain('data-testid="federal-court-roster"');
    expect(federal).toContain("Supreme Court");
  }, 20_000);

  it("passes the action callback through Government to a vacant federal seat", () => {
    const game = generateOpeningLife(
      prepareOpeningLife({
        ...DEFAULT_NEW_GAME_SETUP,
        seed: "team-b-government-judiciary-action",
      }),
    ).game!;
    const federalJudge = publicSeatedJudges(game.world).find((row) =>
      game.world.judiciary!.courts[
        game.world.judiciary!.seats[row.seatId]!.courtId
      ]!.level.startsWith("federal-"),
    )!;
    const vacant = vacateJudicialSeat(game.world, {
      seatId: federalJudge.seatId,
      vacatedAt: game.world.currentDate,
      reason: "retirement",
    });
    const senatorId = seatedCongressChamber(vacant, "senate")!.body.members[0]!
      .personId!;
    const world = {
      ...vacant,
      control: { kind: "person" as const, personId: senatorId },
    };
    const projected: JudicialSelectionView = {
      seatId: federalJudge.seatId,
      courtName: "Federal court",
      holderName: null,
      selectionRecordId: "fixture:senate-action",
      status: "pending",
      reason: null,
      nextStage: {
        order: 2,
        mechanism: "LEGISLATIVE_CONFIRMATION",
        actor: "United States Senate",
      },
      candidates: [],
      playerMayNominate: false,
      playerSenateAction: "hearing-attendance",
      senateStatus: "Choose whether to attend the public hearing.",
    };
    const projection = vi
      .spyOn(judicialSelection, "projectJudicialSelection")
      .mockReturnValue(projected);
    try {
      const render = (onWorldChange?: (next: World) => void) =>
        renderToStaticMarkup(
          <GovernmentBrowser
            world={world}
            personId={game.playerPersonId}
            place="here"
            scope="federal"
            onWorldChange={onWorldChange}
            onSelectionChange={() => {}}
            onOpenPerson={() => {}}
            onOpenMeasure={() => {}}
          />,
        );
      expect(render()).not.toContain("Attend hearing");
      const mounted = render(() => {});
      expect(mounted).toContain('data-testid="government-judiciary"');
      expect(mounted).toContain('data-testid="federal-court-roster"');
      expect(mounted).toContain("Attend hearing");
      expect(mounted).toContain("Decline hearing");
    } finally {
      projection.mockRestore();
    }
  }, 20_000);
});
