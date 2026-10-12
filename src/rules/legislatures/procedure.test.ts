import { afterAll, describe, expect, it, vi } from "vitest";
import { STATES } from "../../simulation/state-reference";
import { SeededRng } from "../../simulation/rng";
import { makeIsoDate } from "../../simulation/dates";
import * as oldVotes from "../../simulation/legislature-rules";
import * as oldCommittees from "../../simulation/governing/committee-assignment";
import * as oldCalendar from "../../simulation/legislative-session-calendar";
import * as oldExecutive from "../../simulation/governing/governor-bill-decision";
import * as packReader from "../../simulation/legislative-procedure-world";
import * as sessionReader from "../../simulation/governing/legislative-clock";
import * as actionReader from "../../simulation/legislation";
import * as chamberReader from "../../simulation/governing/executive-bill-roster";
import * as voteReader from "../../simulation/governing/chamber-votes";
import {
  legislatureForState,
  vetoWindowDayBasisFor,
} from "../../simulation/legislature-game-profile";
import { US_CONGRESS_RULE_PACK } from "../../simulation/congress-rule-pack";
import { governmentUnitsForState } from "../../simulation/government-units";
import { townCouncilProfilePack } from "../../simulation/town-council-profile";
import { createStableId } from "../../simulation/ids";
import { resolveRequiredVotes } from "./votes";
import { committeeRosters } from "./committees";
import { nextSessionCalendarDate } from "./sitting-calendar";
import { executiveBillActionWindow } from "./executive-window";
import { overrideCount, type OverrideChamber } from "./override-count";
import type { SeatedBody } from "../../simulation/legislation-scenarios";
import type {
  World,
  LegislativeMeasureRecord,
  LegislativeVoteDisposition,
  LegislativeActionRecord,
} from "../../simulation/types";
const places = Object.keys(STATES),
  on = makeIsoDate("2026-10-11");
const source: oldVotes.RuleSourceRef = {
  authority: "research-reference",
  citation: "Golden fixture",
  sourceTitle: "Supplied threshold facts",
  sourceUrl: null,
  retrievedAt: null,
  verification: "unresolved",
  note: null,
};
const known = <T>(value: T) => oldVotes.knownRule(value, source);
const world = {
  currentDate: on,
  control: { kind: "none" },
} as unknown as World;
let selectedPack: oldVotes.LegislativeRulePack;
let selectedClosing: string | null = null;
let selectedActions: readonly LegislativeActionRecord[] = [];
let selectedChambers: readonly (OverrideChamber | null)[] = [];
let yeaCount = 0;
// Only fact readers and predicted dispositions are supplied. The legacy rule
// calculations, threshold arithmetic and deadline loops remain unchanged.
vi.spyOn(packReader, "legislativeRulePackForWorld").mockImplementation(
  () => selectedPack,
);
vi.spyOn(sessionReader, "measureSessionClosedOn").mockImplementation(
  () => selectedClosing as World["currentDate"] | null,
);
vi.spyOn(actionReader, "measureActions").mockImplementation(
  () => selectedActions,
);
vi.spyOn(chamberReader, "executiveBillChamber").mockImplementation(
  (_world, _pack, key) =>
    (selectedChambers.find((c) => c?.body.chamberKey === key) as ReturnType<
      typeof chamberReader.executiveBillChamber
    >) ?? null,
);
function dispositions(
  members: SeatedBody["members"],
): readonly LegislativeVoteDisposition[] {
  return members.map((m, i) => ({
    memberKey: m.memberKey,
    personId: m.personId,
    disposition:
      i < yeaCount ? "yea" : i === members.length - 1 ? "absent" : "nay",
  }));
}
vi.spyOn(voteReader, "decideChamberVote").mockImplementation((_world, input) =>
  dispositions(input.members),
);
afterAll(() => vi.restoreAllMocks());
function body(place: string, chamberKey = "chamber"): SeatedBody {
  return {
    chamberKey,
    chamberName: "Supplied body",
    members: [4, 0, 3, 1, 2].map((i) => ({
      memberKey: `${place}:${chamberKey}:${i}`,
      name: `Member ${i}`,
      personId: createStableId("person", `${place}:${chamberKey}:${i}`),
      caucusLabel: "fixture",
      tenureStartedAt: makeIsoDate(`202${i % 3}-01-01`),
      seatingEventId: createStableId("event", `${place}:${i}`),
    })),
  };
}
function packs(place: string) {
  const state = legislatureForState(`US-${place}`);
  const unit = governmentUnitsForState(place).find(
    (u) => u.unitType === "municipality",
  );
  const local = unit ? townCouncilProfilePack(unit) : null;
  return [
    ...(state ? [state] : []),
    US_CONGRESS_RULE_PACK,
    ...(local ? [local] : []),
  ];
}
describe("P14 procedures in all 56 identities, local/state/federal together", () => {
  it("uses every place and a reproducible random draw", () => {
    expect(places).toHaveLength(56);
    expect(places).toContain(
      new SeededRng("rules2-legislatures-20261011").pick(places),
    );
  });
  for (const place of places) {
    it(`${place}: real quorum, passage and override fractions retain absolute floors`, () => {
      for (const pack of packs(place)) {
        const thresholds = pack.chambers.flatMap((c) => [
          ...(c.quorum.kind === "known" ? [c.quorum.value] : []),
          ...c.floorStages.flatMap((s) =>
            s.vote.kind === "known" ? [s.vote.value] : [],
          ),
        ]);
        if (pack.executive.override.kind !== "not-applicable")
          thresholds.push(pack.executive.override.threshold);
        for (const threshold of thresholds)
          for (const denominator of [0, 1, 2, 5, 19, 38, 100])
            expect(resolveRequiredVotes(threshold, denominator)).toEqual(
              oldVotes.resolveRequiredVotes(threshold, denominator),
            );
      }
      for (const rounding of [
        "strictly-greater-than-fraction",
        "at-least-fraction",
      ] as const)
        for (const countedAgainst of [
          "members-elected",
          "members-present",
          "members-voting",
          "joint-total-membership",
          "committee-members-appointed",
        ] as const) {
          const threshold = {
            numerator: 2,
            denominatorParts: 3,
            countedAgainst,
            rounding,
            minimumVotes: 6,
            label: "Supplied rule",
            source,
          };
          expect(resolveRequiredVotes(threshold, 5)).toEqual(
            oldVotes.resolveRequiredVotes(threshold, 5),
          );
        }
    });
    it(`${place}: committees use recorded seating, wrap, and reject ambiguity`, () => {
      const committees = [
        { committeeKey: "first", appointedMembers: 3 },
        { committeeKey: "second", appointedMembers: 4 },
        { committeeKey: "full", appointedMembers: 8 },
        { committeeKey: "empty", appointedMembers: 0 },
      ];
      const seated = body(place);
      for (const input of [
        seated,
        { ...seated, members: [] },
        { ...seated, members: [...seated.members, seated.members[0]!] },
        {
          ...seated,
          members: seated.members.map((m) => ({ ...m, tenureStartedAt: null })),
        },
      ])
        expect(committeeRosters(input, committees, place)).toEqual(
          oldCommittees.committeeRosters(input, committees, place),
        );
    });
    it(`${place}: intervals, weekdays and annual sitting schedules retain legal minima`, () => {
      for (const sitting of [
        { kind: "interval", days: 7 },
        { kind: "weekdays", weekdays: [1, 3, 5] },
        { kind: "annual", monthDays: ["02-28", "12-01"] },
      ] as const) {
        const calendar = {
          id: `calendar:${place}`,
          basis: "game-profile" as const,
          note: "Authored recurrence fixture",
          sitting,
        };
        for (const after of ["2024-01-01", "2024-02-28", "2024-12-01"]) {
          const date = makeIsoDate(after),
            options = {
              notBefore: makeIsoDate("2024-03-01"),
              eligibleYear: (year: number) => year % 2 === 0,
            };
          expect(
            nextSessionCalendarDate(calendar, date, "sitting", options),
          ).toEqual(
            oldCalendar.nextSessionCalendarDate(
              calendar,
              date,
              "sitting",
              options,
            ),
          );
        }
      }
    });
    it(`${place}: executive windows retain weekends, zero, unresolved and adjournment boundaries`, () => {
      for (const pack of packs(place))
        for (const basis of [
          "CALENDAR",
          "BUSINESS",
          "SUNDAYS_EXCEPTED",
          "unknown",
        ] as const)
          for (const closing of [null, "2026-10-11", "2026-10-10"]) {
            selectedPack = {
              ...pack,
              executive: {
                ...pack.executive,
                actionWindowDaysInSession: known(10),
                actionWindowDaysAfterAdjournment: known(0),
                actionWindowDayBasisInSession:
                  basis === "unknown"
                    ? { kind: "unknown", note: "Unresolved" }
                    : known(basis),
                actionWindowDayBasisAfterAdjournment: known("BUSINESS"),
              },
            };
            selectedClosing = closing;
            const presented = makeIsoDate("2026-10-09");
            selectedActions = [
              { kind: "presented-to-executive", occurredAt: presented },
            ] as unknown as LegislativeActionRecord[];
            const measure = {
              id: createStableId("legislative-measure", place),
              rulePackId: pack.packId,
            } as LegislativeMeasureRecord;
            expect(
              executiveBillActionWindow(
                selectedPack,
                presented,
                closing,
                on,
                vetoWindowDayBasisFor(
                  pack.jurisdictionKey,
                  closing !== null && on > closing,
                ),
              ),
            ).toEqual(oldExecutive.executiveBillActionWindow(world, measure));
            selectedActions = [];
            expect(
              executiveBillActionWindow(selectedPack, null, closing, on, null),
            ).toEqual(oldExecutive.executiveBillActionWindow(world, measure));
          }
    });
    it(`${place}: override counts use predicted dispositions and the same forum denominators`, () => {
      for (const pack of packs(place))
        for (const count of [0, 2, 4, 5]) {
          selectedPack = pack;
          yeaCount = count;
          selectedChambers = pack.chamberOrder.map((chamberKey) => ({
            body: body(place, chamberKey),
            seats: 5,
          }));
          const measure = {
            id: createStableId("legislative-measure", place),
            rulePackId: pack.packId,
            subjectClass: "general-policy",
          } as LegislativeMeasureRecord;
          expect(
            overrideCount(
              pack,
              selectedChambers,
              measure.subjectClass,
              (_forum, members) => dispositions(members),
            ),
          ).toEqual(oldExecutive.overrideCount(world, measure, world.id));
          selectedChambers = [null];
          expect(
            overrideCount(
              pack,
              selectedChambers,
              measure.subjectClass,
              (_forum, members) => dispositions(members),
            ),
          ).toEqual(oldExecutive.overrideCount(world, measure, world.id));
        }
    });
  }
  it("retains numerical/source validation and finite-calendar failures", () => {
    const threshold = {
      numerator: 0,
      denominatorParts: 2,
      countedAgainst: "members-voting" as const,
      rounding: "at-least-fraction" as const,
      label: "Invalid",
      source,
    };
    expect(() => resolveRequiredVotes(threshold, 2)).toThrow();
    expect(() => oldVotes.resolveRequiredVotes(threshold, 2)).toThrow();
    const calendar = {
      id: "unreachable",
      basis: "game-profile" as const,
      note: "Fixture",
      sitting: { kind: "annual" as const, monthDays: ["01-01"] },
    };
    const options = { eligibleYear: () => false };
    expect(() =>
      nextSessionCalendarDate(calendar, on, "sitting", options),
    ).toThrow();
    expect(() =>
      oldCalendar.nextSessionCalendarDate(calendar, on, "sitting", options),
    ).toThrow();
  });
});
