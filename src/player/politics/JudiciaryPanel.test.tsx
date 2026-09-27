import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import * as judicialSelection from "../../presentation/judicial-selection";
import type { JudicialSelectionView } from "../../presentation/judicial-selection";
import { DEFAULT_NEW_GAME_SETUP } from "../../presentation/new-game";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../../presentation/opening-life";
import { currentPresidentOf } from "../../simulation/crisis/offices";
import { seatedCongressChamber } from "../../simulation/governing/congress-chambers";
import { createDemoWorld } from "../../simulation/demo";
import { makeIsoDate } from "../../simulation/dates";
import { createStableId } from "../../simulation/ids";
import {
  publicSeatedJudges,
  reviewFederalJudicialVacancy,
} from "../../simulation/judiciary/candidate-discovery";
import {
  addJudicialCourt,
  vacateJudicialSeat,
} from "../../simulation/judiciary/courts";
import { judicialSeatId } from "../../simulation/judiciary/types";
import { personName } from "../../simulation/people";
import type { JudiciaryView } from "../../presentation/judiciary";
import { JudiciaryPanel } from "./JudiciaryPanel";

describe("JudiciaryPanel", () => {
  it("shows a recorded judge, portrait and tenure date without internal geography wording", () => {
    const world = createDemoWorld("judiciary-panel");
    const personId = world.personOrder[0]!;
    const view: JudiciaryView = {
      stateName: "Kentucky",
      supremeCourt: null,
      federalCourts: [],
      stateCourts: [
        {
          courtId: "test-court",
          name: "Kentucky Circuit Court",
          seatCount: 1,
          geographyDetail: "office-family-only",
          holders: [
            {
              seatId: "test-court:seat:1",
              personId,
              name: personName(world.people[personId]!),
              startedAt: makeIsoDate("2026-01-20"),
            },
          ],
        },
      ],
    };
    const html = renderToStaticMarkup(
      <JudiciaryPanel
        world={world}
        view={view}
        scope="state"
        onOpenPerson={() => {}}
      />,
    );
    expect(html).toContain(personName(world.people[personId]!));
    expect(html).toContain("At this court since January 20, 2026");
    expect(html).toContain('data-testid="person-portrait"');
    expect(html).not.toContain("not recorded for this state");
  });

  it("offers only a controlled President a real roster review, then a known candidate interview", () => {
    const game = generateOpeningLife(
      prepareOpeningLife({
        ...DEFAULT_NEW_GAME_SETUP,
        seed: "judiciary-panel-action",
      }),
    ).game!;
    const presidentId = currentPresidentOf(game.world)!.personId;
    const controlled = {
      ...game.world,
      control: { kind: "person" as const, personId: presidentId },
    };
    const courtId = "fixture:panel-district";
    const seatId = judicialSeatId(courtId, 1);
    const world = addJudicialCourt(controlled, {
      courtId,
      jurisdictionId: null,
      name: "Fixture United States District Court",
      level: "federal-district",
      parentCourtId: null,
      sourceRecordId: "us-fed:general_trial",
      identityBasis: "sourced",
      createdAt: controlled.currentDate,
      rules: {
        authorizedSeats: {
          state: "known",
          value: 1,
          basis: "game-profile",
          referenceId: "fixture:size",
        },
        termYears: {
          state: "known",
          value: null,
          basis: "sourced",
          referenceId: "us-fed:general_trial",
        },
        mandatoryRetirementAge: { state: "unknown", reason: "fixture" },
        caseJurisdiction: { state: "unknown", reason: "fixture" },
        selectionRecordId: "us-fed:general_trial",
        amendmentRoute: { state: "unknown", reason: "fixture" },
      },
    });
    const judge = publicSeatedJudges(world)[0]!;
    const view: JudiciaryView = {
      stateName: null,
      supremeCourt: null,
      stateCourts: [],
      federalCourts: [
        {
          courtId,
          name: "Fixture United States District Court",
          seatCount: 1,
          geographyDetail: "exact-court",
          holders: [
            { seatId, personId: null, name: "Vacant", startedAt: null },
          ],
        },
      ],
    };
    const render = (current: typeof world) =>
      renderToStaticMarkup(
        <JudiciaryPanel
          world={current}
          view={view}
          scope="federal"
          onOpenPerson={() => {}}
          onWorldChange={() => {}}
        />,
      );
    const before = render(world);
    expect(before).toContain("Find a sitting judge");
    expect(before).toContain("Review judge for this vacancy (30 minutes)");
    expect(before).not.toContain("Nominate</button>");
    const otherControl = render({
      ...world,
      control: { kind: "person", personId: game.playerPersonId },
    });
    expect(otherControl).not.toContain("Find a sitting judge");
    expect(otherControl).toContain("No judicial selection is underway.");

    const reviewed = reviewFederalJudicialVacancy(world, {
      seatId,
      candidatePersonIds: [judge.personId],
    });
    const after = render(reviewed);
    expect(after).toContain(judge.name);
    expect(after).toContain("Interview (30 minutes)");
    expect(after).not.toContain("Nominate</button>");
    expect(after).not.toContain("Senate hearing");
    const ordinaryHtml = renderToStaticMarkup(
      <JudiciaryPanel
        world={{
          ...reviewed,
          control: { kind: "person", personId: game.playerPersonId },
        }}
        view={view}
        scope="federal"
        onOpenPerson={() => {}}
      />,
    );
    expect(ordinaryHtml).toContain("Selection pending. Next:");
    expect(ordinaryHtml).not.toContain("Find a sitting judge");
    expect(ordinaryHtml).not.toContain(judge.name);

    const federalJudge = publicSeatedJudges(world).find((row) =>
      world.judiciary!.courts[
        world.judiciary!.seats[row.seatId]!.courtId
      ]!.level.startsWith("federal-"),
    )!;
    const formerSeat = vacateJudicialSeat(world, {
      seatId: federalJudge.seatId,
      vacatedAt: world.currentDate,
      reason: "retirement",
    });
    const formerView: JudiciaryView = {
      ...view,
      federalCourts: [
        {
          ...view.federalCourts[0]!,
          courtId: world.judiciary!.seats[federalJudge.seatId]!.courtId,
          seatCount: 1,
          holders: [
            {
              seatId: federalJudge.seatId,
              personId: null,
              name: "Vacant",
              startedAt: null,
            },
          ],
        },
      ],
    };
    const blocked = renderToStaticMarkup(
      <JudiciaryPanel
        world={formerSeat}
        view={formerView}
        scope="federal"
        onOpenPerson={() => {}}
        onWorldChange={() => {}}
      />,
    );
    expect(blocked).toContain("Review judge for this vacancy");

    const senatorId = seatedCongressChamber(world, "senate")!.body.members[0]!
      .personId!;
    const senatorWorld = {
      ...world,
      control: { kind: "person" as const, personId: senatorId },
    };
    const projected: JudicialSelectionView = {
      seatId,
      courtName: "Fixture United States District Court",
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
      playerSenateAction: "announce-hearing",
      senateStatus: "The appointed chair may announce a public hearing.",
    };
    const projection = vi
      .spyOn(judicialSelection, "projectJudicialSelection")
      .mockReturnValue(projected);
    try {
      const renderSenator = () =>
        renderToStaticMarkup(
          <JudiciaryPanel
            world={senatorWorld}
            view={view}
            scope="federal"
            onOpenPerson={() => {}}
            onWorldChange={() => {}}
          />,
        );
      expect(renderSenator()).toContain("Announce public hearing");
      projection.mockReturnValue({
        ...projected,
        playerSenateAction: "hearing-attendance",
        senateStatus: "Choose your hearing attendance.",
      });
      const hearingHtml = renderSenator();
      expect(hearingHtml).toContain("Attend hearing");
      expect(hearingHtml).toContain("Decline hearing");
      projection.mockReturnValue({
        ...projected,
        playerSenateAction: "report-notice",
        senateStatus: "The recorded hearing needs later report business.",
      });
      expect(renderSenator()).toContain("Schedule Judiciary report business");
      projection.mockReturnValue({
        ...projected,
        playerSenateAction: "report-business",
        senateStatus:
          "Choose your separate business attendance and report vote.",
      });
      const reportHtml = renderSenator();
      expect(reportHtml).toContain("Attend and report favorably");
      expect(reportHtml).toContain("Attend and oppose reporting");
      expect(reportHtml).toContain("Do not attend report business");
      projection.mockReturnValue({
        ...projected,
        playerSenateAction: "floor-vote",
        senateStatus:
          "Senate floor consideration is due today; no floor vote is recorded.",
      });
      const floorHtml = renderSenator();
      expect(floorHtml).toContain("Reason for your floor choice");
      expect(floorHtml).toContain('type="button" disabled=""');
      expect(floorHtml).toContain("Attend and vote yea");
      expect(floorHtml).toContain("Attend and vote nay");
      expect(floorHtml).toContain("Attend and answer present");
      expect(floorHtml).toContain("Do not attend floor vote");
      expect(floorHtml).not.toContain("Record excused absence");
      const publicHtml = renderToStaticMarkup(
        <JudiciaryPanel
          world={{
            ...senatorWorld,
            control: { kind: "person", personId: game.playerPersonId },
          }}
          view={view}
          scope="federal"
          onOpenPerson={() => {}}
        />,
      );
      expect(publicHtml).toContain("Senate floor consideration is due today");
      expect(publicHtml).not.toContain("Attend and vote yea");
      projection.mockReturnValue({
        ...projected,
        status: "stages-completed",
        nextStage: null,
        playerSenateAction: null,
        senateStatus: null,
        playerMayCommission: true,
        confirmedResultEventId: createStableId(
          "event",
          "fixture:confirmed-result",
        ),
      });
      const confirmedPublic = renderToStaticMarkup(
        <JudiciaryPanel
          world={{
            ...senatorWorld,
            control: { kind: "person", personId: game.playerPersonId },
          }}
          view={view}
          scope="federal"
          onOpenPerson={() => {}}
        />,
      );
      expect(confirmedPublic).toContain("The commission is pending.");
      expect(confirmedPublic).not.toContain("Issue judicial commission");
      expect(render(world)).toContain("Issue judicial commission");
    } finally {
      projection.mockRestore();
    }
  });
});
