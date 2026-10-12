import { describe, expect, it } from "vitest";
import { STATES } from "../../simulation/state-reference";
import { createStableId } from "../../simulation/ids";
import { makeIsoDate } from "../../simulation/dates";
import { legislatureForState } from "../../simulation/legislature-game-profile";
import * as agenda from "../../simulation/governing/majority-agenda";
import { jointAssemblyCandidates as legacyJoint } from "../../simulation/governing/joint-assembly";
import { positionBillAnswer as legacyPosition } from "../../simulation/governing/member-agenda";
import * as rules from "../../simulation/legislature-rules";
import { regularSessionDateStatus as legacyStatus } from "../../simulation/legislative-procedure-world";
import { dispositionsFromCounts as legacyCounts } from "../../simulation/legislation-scenarios";
import { electedMembersFor as legacyElected } from "../../simulation/legislation";
import { playCouncilItems as legacyItems } from "../../simulation/living-world/local-council-meetings";
import { localGoverningBodySeatKindFromComposition as legacySeat } from "../../simulation/nationwide-world/local-governing-body-rules";
import { modalShare as legacyModal } from "../../simulation/nationwide-world/typical-council-size";
import * as review from "../../simulation/municipal-ordinance-procedure";
import { nextGeneralElectionDay as legacyGeneral } from "../../simulation/living-world/constitutional-reform";
import {
  agendaCaucus,
  majorityAgendaChoice,
  jointAssemblyCandidates,
  positionBillAnswer,
} from "./agenda";
import {
  nextChamberKey,
  nextFloorStageKey,
  regularSessionDateStatus,
} from "./procedure-steps";
import {
  playCouncilItems,
  localGoverningBodySeatKindFromComposition,
  modalShare,
} from "./council-items";
import { dispositionsFromCounts } from "./vote-dispositions";
import { electedMembersFor } from "./elected-members";
import {
  addWeekdays,
  congressionalReviewEffectiveOn,
  nextGeneralElectionDay,
} from "./review-calendar";
function outcome(f: () => unknown) {
  try {
    return { value: f() };
  } catch (e) {
    return { name: (e as Error).name, message: (e as Error).message };
  }
}

describe("remaining standalone procedure KEEP rules", () => {
  it.each(Object.keys(STATES))(
    "matches agenda, voting and date decisions for %s",
    (place) => {
      const members = ["a", "b", "c", "d"].map((x, i) => ({
        personId: createStableId("person", `${place}:${x}`),
        partyKey: (i < 2 ? "A" : "B") as string | null,
        party: i < 2 ? "A" : "B",
      }));
      for (const rows of [
        members,
        [],
        members.map((x) => ({ ...x, partyKey: null })),
      ]) {
        const caucus = agendaCaucus(rows);
        expect(caucus).toEqual(agenda.agendaCaucus(rows));
        const proposals = rows.map((sponsor, i) => ({
          sponsor,
          proposal: i,
          pressure: 3 - i,
        }));
        for (const vote of [
          () => true,
          () => false,
          (_m: unknown, p: number) => p === 1,
        ])
          expect(majorityAgendaChoice(rows, caucus, proposals, vote)).toEqual(
            agenda.majorityAgendaChoice(rows, caucus, proposals, vote),
          );
      }
      for (const incumbent of [
        null,
        { personId: members[0]!.personId, party: "A" },
        { personId: members[0]!.personId, party: "C" },
      ]) {
        const facts = members as unknown as Parameters<typeof legacyJoint>[0];
        expect(jointAssemblyCandidates(facts, incumbent)).toEqual(
          legacyJoint(facts, incumbent),
        );
      }
      for (const score of [-1, 0, 1])
        for (const answer of ["yes", "no", "closed", null] as const)
          expect(positionBillAnswer(score, answer)).toBe(
            legacyPosition(score, answer),
          );
      const seated = members.map((x, i) => ({
        ...x,
        memberKey: `member:${i}`,
        name: `fixture:${i}`,
        caucusLabel: "fixture",
      }));
      for (const counts of [
        { yea: 0 },
        { yea: 2, nay: 2 },
        { yea: 5 },
        { yea: 1.5 },
        { yea: -1, nay: 2 },
      ])
        expect(outcome(() => dispositionsFromCounts(seated, counts))).toEqual(
          outcome(() => legacyCounts(seated, counts)),
        );
      const pack = legislatureForState(`US-${place}`);
      if (pack) {
        for (const chamber of pack.chambers) {
          for (const n of [undefined, 0, 1, 10000, NaN])
            expect(outcome(() => electedMembersFor(chamber, n))).toEqual(
              outcome(() => legacyElected(chamber, n)),
            );
          for (const origin of [...pack.chamberOrder, "missing"])
            expect(
              outcome(() => nextChamberKey(pack, chamber.chamberKey, origin)),
            ).toEqual(
              outcome(() =>
                rules.nextChamberKey(pack, chamber.chamberKey, origin),
              ),
            );
          for (const stage of [
            ...chamber.floorStages.map((x) => x.stageKey),
            "missing",
          ])
            expect(outcome(() => nextFloorStageKey(chamber, stage))).toEqual(
              outcome(() => rules.nextFloorStageKey(chamber, stage)),
            );
        }
        for (const day of ["2025-01-01", "2026-01-01", "2026-12-31"])
          expect(regularSessionDateStatus(pack, makeIsoDate(day))).toEqual(
            legacyStatus(pack, makeIsoDate(day)),
          );
      }
      const items = [
        { measure: { id: members[0]!.personId }, reasons: [] },
        {
          measure: { id: members[1]!.personId },
          reasons: ["player-sponsored"],
        },
      ] as unknown as Parameters<typeof legacyItems>[0];
      expect(playCouncilItems(items)).toEqual(legacyItems(items));
      for (const pattern of [
        "WARD",
        "AT_LARGE",
        "SINGLE_MEMBER_DISTRICT",
        "COMBINATION",
      ]) {
        const composition = {
          pattern,
          wardSeats: 2,
          districtSeats: 1,
          atLargeSeats: 2,
        } as Parameters<typeof legacySeat>[0];
        for (const n of [0, 1, 2, 3, 4, 7, 1.5])
          expect(
            localGoverningBodySeatKindFromComposition(composition, n),
          ).toBe(legacySeat(composition, n));
      }
      expect(localGoverningBodySeatKindFromComposition(null, 1)).toBe(
        legacySeat(null, 1),
      );
      for (const table of [
        [],
        [
          { value: 5, percent: 10 },
          { value: 4, percent: 10 },
        ],
        [
          { value: 5, percent: 10 },
          { value: 4, percent: 11 },
        ],
      ])
        expect(modalShare(table)).toEqual(legacyModal(table));
      for (const day of ["2026-03-27", "2026-03-28", "2026-12-25"]) {
        const date = makeIsoDate(day);
        expect(nextGeneralElectionDay(date)).toBe(legacyGeneral(date));
        for (const n of [-1, 0, 1, 2, 30]) {
          expect(addWeekdays(date, n)).toBe(review.addWeekdays(date, n));
          expect(congressionalReviewEffectiveOn(date, n)).toBe(
            review.congressionalReviewEffectiveOn(date, n),
          );
        }
      }
    },
  );
});
