import { readFileSync, existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { STATES } from "../../simulation/state-reference";
import {
  deriveStateBillNumberingStyle as nativeStyle,
  type BillSampleRow,
  type ChamberNameRow,
  type BillNumberingStartRow,
  type BillNumberingPeriodRow,
} from "../../simulation/bill-numbering-derivation";
import starts from "../../../data/research/bill-numbering-starts.json";
import corpus from "../../../data/source/state-legislatures/corpus.json";
import { deriveStateBillNumberingStyle } from "./bill-numbering-style";
import {
  buildLegislativeVoteRecord as nativeVote,
  type RecordVoteInput,
} from "../../simulation/legislation";
import { buildLegislativeVoteRecord } from "./vote-record";
import { seatCongressChamber } from "./congress-seating";
import {
  seatedCongressChamber as nativeSeating,
  nationalPartyKeys,
} from "../../simulation/governing/congress-chambers";
import { projectCongress } from "../../simulation/living-world/congress";
import { US_CONGRESS_RULE_PACK } from "../../simulation/congress-rule-pack";
import { statehoodAdmissionDays } from "./statehood-date";
import { STATEHOOD_ADMISSION_DAYS } from "../../simulation/governing/statehood-admission";
import admission from "../../../data/research/congress/statehood-seats.json";
import { fractionOf } from "../../simulation/legislature-rules";
import type { EntityId } from "../../simulation/types";
function outcome(call: () => unknown) {
  try {
    return { value: call() };
  } catch (e) {
    return { name: (e as Error).name, message: (e as Error).message };
  }
}
describe("legislatures: numbering derivation and vote-record validation through native public callers", () => {
  it.each(Object.keys(STATES))(
    "matches recorded numbering and native vote behavior in %s",
    (place) => {
      const row = corpus.find((r) => r.stateUsps === place);
      const path = new URL(
        `../../../data/research/bill-samples/state/${STATES[place]!.name.toLowerCase().replace(/\s+/g, "-")}.json`,
        import.meta.url,
      );
      const samples: BillSampleRow[] = existsSync(path)
        ? JSON.parse(readFileSync(path, "utf8"))
        : [];
      const names: ChamberNameRow[] = (row?.chambers ?? []).flatMap((c) =>
        c.name?.state === "KNOWN" &&
        typeof c.name.value === "string" &&
        c.chamberKey !== "legislature"
          ? [
              {
                role:
                  c.chamberKey === "senate"
                    ? ("upper" as const)
                    : ("lower" as const),
                name: c.name.value,
              },
            ]
          : [],
      );
      for (const input of [
        samples,
        [
          { bill_number: "HB 400", session: "2025-2026 Regular Session" },
          { bill_number: "SB 5001", session: "2025 Special Session" },
        ],
        [],
      ]) {
        expect(
          outcome(() =>
            deriveStateBillNumberingStyle(
              `US-${place}`,
              input,
              names,
              starts.starts as BillNumberingStartRow[],
              starts.periods as BillNumberingPeriodRow[],
            ),
          ),
        ).toEqual(
          outcome(() =>
            nativeStyle(
              `US-${place}`,
              input,
              names,
              starts.starts as BillNumberingStartRow[],
              starts.periods as BillNumberingPeriodRow[],
            ),
          ),
        );
      }
      const { world } = smallWorld({
        place: `US-${place}`,
        seed: `rules2-leg-records:${place}`,
        offices: ["congress"],
      });
      for (const chamber of ["house", "senate", "missing"])
        expect(
          seatCongressChamber(
            {
              congress: projectCongress(world),
              parties: nationalPartyKeys(world),
              pack: US_CONGRESS_RULE_PACK,
            },
            chamber,
          ),
        ).toEqual(nativeSeating(world, chamber));
      const people = world.personOrder.slice(0, 4);
      for (const denominator of [
        "members-elected",
        "members-present",
        "members-voting",
        "committee-members-appointed",
        "joint-total-membership",
      ] as const)
        for (const edge of [
          "normal",
          "duplicate-key",
          "unknown-person",
          "missing-presence",
          "missing-joint",
          "no-rows",
        ]) {
          const input: RecordVoteInput = {
            stableKey: `rules2:${place}:${denominator}:${edge}`,
            measureId: people[0]!,
            forum: { kind: "chamber", chamberKey: "house" },
            purpose: "floor-stage",
            floorStageKey: "reading",
            threshold: fractionOf(
              2,
              3,
              denominator,
              "Two thirds",
              US_CONGRESS_RULE_PACK.chambers[0]!.committees[0]!.reportThreshold
                .source,
            ),
            eligibleMembers: 4,
            presentMembers: edge === "missing-presence" ? null : 3,
            committeeMembers: 4,
            jointSeats: edge === "missing-joint" ? null : 4,
            dispositions:
              edge === "no-rows"
                ? []
                : people.map((id, index) => ({
                    memberKey:
                      edge === "duplicate-key" ? "same" : `member:${index}`,
                    personId:
                      edge === "unknown-person" && index === 0
                        ? ("missing" as EntityId)
                        : id,
                    disposition:
                      index === 3
                        ? ("absent" as const)
                        : index === 2
                          ? ("present-not-voting" as const)
                          : ("yea" as const),
                  })),
            provenance: {
              method: "member-decisions",
              note: "Golden fixture",
              sourceEntityIds: [],
            },
          };
          const expected = outcome(() => nativeVote(world, input));
          const record =
            "value" in expected
              ? (expected.value as ReturnType<typeof nativeVote>)
              : null;
          expect(
            outcome(() =>
              buildLegislativeVoteRecord(
                {
                  personIds: new Set(world.personOrder),
                  onDate: world.currentDate,
                  nextSequence: record?.sequence ?? world.history.nextSequence,
                  recordId: record?.id ?? people[0]!,
                },
                input,
              ),
            ),
          ).toEqual(expected);
        }
      expect(statehoodAdmissionDays(admission.admission.stages)).toBe(
        STATEHOOD_ADMISSION_DAYS,
      );
    },
    30000,
  );
});
