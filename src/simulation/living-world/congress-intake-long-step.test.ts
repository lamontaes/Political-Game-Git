import { describe, expect, it } from "vitest";

import { explicitNewGameSetup } from "../../presentation/new-game-geography";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../../presentation/opening-life";
import {
  openOrdinaryLife,
  passOrdinaryDays,
} from "../../presentation/ordinary-life";
import { createCampaignElectionTransitionRegistry } from "../campaigns";
import { addDays, daysBetween, makeIsoDate } from "../dates";
import { applyOfficeContinuityNotices } from "../governing/office-continuity";
import { lifePlaces } from "../life-places";
import { SeededRng } from "../rng";
import { recordPersonDeath } from "../vitality";
import { advanceWorld } from "../world";
import { projectCongress } from "./congress";
import {
  CONGRESS_CANDIDATE_PROFILE,
  congressCandidateIntakeDay,
} from "./congress-candidates";
import { congressSeats } from "./congress-seats";
import { seatCandidacyIntent } from "./congress-turnover";

describe("Congress candidacy decisions in a long step", () => {
  it("a member seated after their filing day decides from the record of that day, in one 91-day step", () => {
    const seed = "b27-intake-91-day-step";
    const place = new SeededRng(seed).pick(lifePlaces());
    const game = generateOpeningLife(
      prepareOpeningLife({
        ...explicitNewGameSetup({ placeKey: place.key, seed }),
        startAge: 40,
      }),
    ).game!;
    let world = openOrdinaryLife(game.world, game.playerPersonId);
    // The next congressional election whose filing season is still ahead.
    let year = Number(world.currentDate.slice(0, 4));
    if (year % 2 === 1) year += 1;
    if (
      makeIsoDate(
        `${year}-${CONGRESS_CANDIDATE_PROFILE.intakeStartMonthDay}`,
      ) <= addDays(world.currentDate, 30)
    )
      year += 2;
    const newStart = `${year + 1}-01-03`;
    const seats = congressSeats();
    const senate = projectCongress(world)!.senate.seats;
    // A Senate seat up that year, held by someone other than the player. Its
    // member dies a few days before the seat's filing day, and the appointee
    // takes the seat after it.
    const choice = senate.flatMap((view) => {
      if (view.occupant.kind !== "member") return [];
      const member = view.occupant.member;
      const index = seats.findIndex((seat) => seat.seatKey === view.seatKey);
      if (
        member.endExclusive !== newStart ||
        (world.control.kind === "person" &&
          world.control.personId === member.personId)
      )
        return [];
      const intake = congressCandidateIntakeDay(year, index);
      return intake >= makeIsoDate(`${year}-01-20`)
        ? [
            {
              seatKey: view.seatKey,
              personId: member.personId,
              termId: member.termId,
              title: member.title,
              intake,
            },
          ]
        : [];
    })[0]!;
    expect(choice).toBeTruthy();
    const deathDay = addDays(choice.intake, -3);
    world = passOrdinaryDays(world, daysBetween(world.currentDate, deathDay));
    expect(world.currentDate).toBe(deathDay);
    world = recordPersonDeath(world, {
      stableKey: `b27-intake:death:${choice.personId}`,
      personId: choice.personId,
      diedAt: world.currentDate,
      causeKey: "cause:external-fixture",
      sourceEntityIds: [world.id],
      summary: "A senator died.",
      provenance: { kind: "authored", note: "Build 27 long-step fixture." },
    });
    const death = world.history.personDeaths.at(-1)!;
    world = applyOfficeContinuityNotices(world, [
      {
        noticeKey: `crisis:continuity:${death.id}`,
        sequence: death.sequence,
        originEventId: death.eventId,
        personId: choice.personId,
        kind: "death",
        effectiveDate: death.diedAt,
        recordedDate: world.currentDate,
        visibility: "public",
        offices: [
          {
            officeKey: choice.seatKey,
            title: choice.title,
            organizationId: null,
            termEvidenceId: choice.termId,
          },
        ],
        sourceRecordId: death.id,
      },
    ]);
    // One step of 91 days, as a harness or a long wait takes it: the
    // appointment and the seat's filing day both fall inside it, the
    // appointment after the filing day. The appointee's record is then the
    // seat's newest, dated after the day the decision is made.
    world = advanceWorld(world, 91, createCampaignElectionTransitionRegistry());
    const intent = seatCandidacyIntent(world, choice.seatKey, year);
    expect(intent).not.toBeNull();
  }, 1_800_000);
});
