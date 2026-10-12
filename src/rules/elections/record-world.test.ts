import { scheduledActivityState } from "../../simulation/time-work";
import { addDays } from "./calendar";
import * as chapters from "../../simulation/living-world/party-chapters";
import {
  nextMeetingDate,
  canJoinPartyChapter,
  daysBetween,
  openInvitationExists,
} from "./chapter-rules";
import { describe, expect, it, afterAll } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { STATES } from "../../simulation/state-reference";
import { stateJurisdictionForKey } from "../../simulation/life-places";
import {
  makeIsoDate,
  simulationMomentAtLocalTime,
} from "../../simulation/dates";
import * as oldElectorate from "../../simulation/statewide-electorate";
import {
  calibrationRows,
  ELECTORAL_CALIBRATION,
} from "../../simulation/world-setup/political-start";
import { censusRegionOf } from "../../simulation/world-setup/census-regions";
import { CRUNCH46_POLICY } from "../../simulation/world-setup/policy";
import {
  politicalStartingConditions,
  seatStartingCondition,
} from "../../simulation/world-setup/conditions";
import { publicPartyAffiliation } from "../../simulation/living-world/congress";
import { congressSeats } from "../../simulation/living-world/congress-seats";
import {
  livingWorldOrganizationId,
  LIVING_WORLD_KEYS,
} from "../../simulation/living-world/opening";
import { legislatureForState } from "../../simulation/legislature-game-profile";
import { stateBillNumberingStyle } from "../../simulation/bill-numbering-styles";
import {
  regularSessionRefusalText,
  legislativeRulePackForWorld,
} from "../../simulation/legislative-procedure-world";
import { introduceMeasure } from "../../simulation/legislation";
import * as oldNumbering from "../../simulation/measure-numbering";
import rows from "../../../data/research/laws/bill-introductions-2022.json";
import * as oldParty from "../../simulation/living-world/party-evolution";
import { partyUnit } from "../../simulation/living-world/party-registry";
import { pastCandidatesBySeat as oldPast } from "../../simulation/nominations/candidate-pool";
import { pastCandidatesBySeat } from "./past-candidates";
import * as electorate from "./electorate";
import * as numbering from "./measure-numbering";
import { scheduleBodyReview } from "./party-history";
let invitations = 0;
afterAll(() => expect(invitations).toBeGreaterThan(0));
describe("elections: native record readers and numbering callers", () => {
  it.each(Object.keys(STATES))(
    "matches %s generated facts and native introduced records",
    (place) => {
      let world = smallWorld({
        place: `US-${place}`,
        seed: `rules2-sendback-records:${place}`,
        offices: ["congress"],
      }).world;
      const jurisdiction = stateJurisdictionForKey(`US-${place}`)!.id;
      const player =
        world.control.kind === "person"
          ? world.control.personId
          : world.personOrder[0]!;
      world = chapters.ensureHomePartyChapters(world, player);
      const home = chapters.homePartyChapters(world);
      expect(home.length).toBeGreaterThan(0);
      for (const chapter of home) {
        const due = world.history.futureDueItems.find(
          (item) =>
            item.transitionKey === chapters.CHAPTER_OUTREACH_TRANSITION_KEY &&
            item.entityIds.includes(chapter.organizerPersonId!),
        )!;
        expect(due.dueAt).toBe(nextMeetingDate(world.currentDate, 0, 2));
        expect(
          canJoinPartyChapter(
            {
              birthDate: world.people[player]!.birthDate,
              controlled: true,
              currentDate: world.currentDate,
              minimumAge: 18,
              homeChapterIds: home.map((row) => row.organizationId),
              activeMembership: false,
            },
            chapter.organizationId,
          ),
        ).toBe(
          chapters.canJoinPartyChapter(world, player, chapter.organizationId),
        );
      }

      const outreach = world.history.futureDueItems.filter(
        (item) =>
          item.transitionKey === chapters.CHAPTER_OUTREACH_TRANSITION_KEY &&
          item.entityIds.includes(player),
      );
      for (const due of outreach) {
        const date = due.dueAt;
        world = {
          ...world,
          currentDate: date,
          currentMoment: simulationMomentAtLocalTime({
            date,
            minuteOfDay: 0,
            timeZone: world.currentMoment.timeZone,
          }),
        };
        const meetings = home.flatMap((chapter) =>
          world.history.events
            .filter(
              (event) =>
                event.type === chapters.CHAPTER_INVITATION_EVENT &&
                event.involvedEntityIds.includes(chapter.organizationId) &&
                event.participants.some(
                  (p) => p.personId === player && p.role === "focus:asked-of",
                ),
            )
            .flatMap((event) => {
              const meeting = world.history.scheduledActivities
                .filter(
                  (activity) =>
                    activity.kind !== "travel" &&
                    activity.sourceEntityIds.includes(event.id),
                )
                .at(-1);
              return meeting ? [scheduledActivityState(world, meeting.id)] : [];
            }),
        );
        const open = openInvitationExists(meetings, world.currentMoment);
        const handled = chapters.chapterOutreachTransitionHandler(world, due);
        if (open)
          expect(handled.reasonKey).toBe(
            "party-chapter:invitation-already-open",
          );
        if (handled.reasonKey === "party-chapter:invited") {
          invitations++;
          const invitation = handled.world.history.events.find(
            (event) => event.id === handled.outcomeEventId,
          )!;
          const meetingDate = makeIsoDate(
            invitation.tags
              .find((tag) => tag.startsWith("meeting-date:"))!
              .slice("meeting-date:".length),
          );
          const delay = daysBetween(date, nextMeetingDate(meetingDate, 0, 2));
          const nextKey =
            due.stableKey.slice(0, due.stableKey.lastIndexOf(":") + 1) +
            (Number(due.stableKey.split(":").at(-1)) + 1);
          expect(
            handled.world.history.futureDueItems.find(
              (item) => item.stableKey === nextKey,
            )!.dueAt,
          ).toBe(addDays(date, delay));
        }
        world = handled.world;
      }
      const majorPartyIds = {
        democratic: livingWorldOrganizationId(
          world,
          LIVING_WORLD_KEYS.nationalParty("democratic"),
        ),
        republican: livingWorldOrganizationId(
          world,
          LIVING_WORLD_KEYS.nationalParty("republican"),
        ),
      };
      const row = calibrationRows("us-president").find(
        (row) => row.stateUsps === place,
      );
      const facts: electorate.ElectorateFacts = {
        stateUsps: place,
        region: row ? censusRegionOf(place) : "south",
        policy: CRUNCH46_POLICY.political,
        conditions: politicalStartingConditions(world),
        calibration: calibrationRows("us-president"),
        presidentialByState: ELECTORAL_CALIBRATION.presidentialByState,
        partyId: null,
        majorPartyIds,
        seatShare: null,
        events: world.history.events,
      };
      expect(electorate.statewideElectorate(facts)).toEqual(
        oldElectorate.statewideElectorate(world, jurisdiction),
      );
      for (const seat of congressSeats())
        expect(
          electorate.congressSeatElectorate(
            {
              ...facts,
              calibration: ELECTORAL_CALIBRATION.calibrationRows,
              seatShare: seatStartingCondition(world, seat.seatKey)
                ?.generatedShare,
            },
            seat.seatKey,
            world.currentDate,
          ),
        ).toEqual(
          oldElectorate.congressSeatElectorate(
            world,
            seat.seatKey,
            world.currentDate,
          ),
        );
      for (const person of world.personOrder.slice(0, 12))
        for (const on of [world.currentDate, makeIsoDate("2035-01-01")])
          expect(
            electorate.majorPartyOf({
              ...facts,
              partyId: publicPartyAffiliation(world, person, {
                asOf: electorate.partyAffiliationReadDate(
                  world.currentDate,
                  on,
                ),
              }),
            }),
          ).toEqual(oldElectorate.majorPartyOf(world, person, on));
      const keys = new Map(
        world.personOrder.map((id) => [id, world.people[id]?.generationKey]),
      );
      for (const version of [
        "congress-candidates-v1",
        "state-legislature-candidates-v1",
      ])
        expect(pastCandidatesBySeat(keys, world.personOrder, version)).toEqual(
          oldPast(world, version),
        );
      const pack = legislatureForState(`US-${place}`);
      if (pack) {
        expect(
          numbering.openingBillNumber(
            rows.rows,
            pack.jurisdictionKey,
            pack.chambers.length,
            world.startedAt,
          ),
        ).toEqual(
          oldNumbering.openingBillNumber(
            pack.jurisdictionKey,
            pack.chambers.length,
            world.startedAt,
          ),
        );
        for (const date of [
          world.currentDate,
          makeIsoDate("2027-02-01"),
          makeIsoDate("2028-02-01"),
        ]) {
          world = {
            ...world,
            currentDate: date,
            currentMoment: simulationMomentAtLocalTime({
              date,
              minuteOfDay: 0,
              timeZone: world.currentMoment.timeZone,
            }),
          };
          for (const chamber of pack.chambers)
            for (let n = 0; n < 3; n++) {
              const input = {
                jurisdictionId: jurisdiction,
                rulePackId: pack.packId,
                originChamber: chamber,
              };
              const old = oldNumbering.nextMeasureNumbering(world, input);
              expect(
                numbering.nextMeasureNumbering(
                  {
                    currentDate: world.currentDate,
                    startedAt: world.startedAt,
                    measures: world.history.legislativeMeasures ?? [],
                    pack,
                    style: stateBillNumberingStyle(pack.jurisdictionKey),
                    rows: rows.rows,
                  },
                  input,
                ),
              ).toEqual({
                designation: old.designation,
                numberingSession: { key: old.numberingSession.key },
              });
              if (
                !regularSessionRefusalText(
                  legislativeRulePackForWorld(world, pack.packId),
                  date,
                )
              )
                world = introduceMeasure(world, {
                  stableKey: `rules2-numbering:${place}:${date}:${chamber.chamberKey}:${n}`,
                  jurisdictionId: jurisdiction,
                  rulePackId: pack.packId,
                  ...old,
                  shortTitle: "Numbering equivalence",
                  summary: "Generated record comparison",
                  origin: "member-introduction",
                  subjectClass: "general-policy",
                  originChamberKey: chamber.chamberKey,
                });
            }
        }
      }
      const organization = majorPartyIds.democratic,
        anchor = world.personOrder[0]!;
      for (let n = 0; n < 3; n++) {
        const plan = scheduleBodyReview(
          {
            currentDate: world.currentDate,
            pendingReviews: world.history.futureDueItems,
            reviewTransitionKey: oldParty.PARTY_BODY_REVIEW_TRANSITION_KEY,
            jurisdictionId:
              partyUnit(world, organization)?.jurisdictionId ?? null,
            cadenceMonths: oldParty.PARTY_BODY_CADENCE.reviewEveryMonths,
          },
          organization,
          anchor,
        );
        world = oldParty.scheduleBodyReview(world, organization, anchor);
        const actual = world.history.futureDueItems.find(
          (item) => item.stableKey === plan.stableKey,
        )!;
        expect(actual).toMatchObject(plan);
      }
    },
  );
});
