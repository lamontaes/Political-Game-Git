import { describe, expect, it } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { lifePlaceStateIdentities } from "../../simulation/life-places";
import { programLastDay } from "../../simulation/enacted-program-terms";
import { makeIsoDate } from "../../simulation/dates";
import { programLastDayFromFacts } from "./program-last-day";

const targetKey = "test-program";
const changes = [
  {
    id: "extension",
    kind: "extension" as const,
    lastDay: "2035-12-31",
    enactedOn: "2027-01-01",
    enactmentSequence: 1,
  },
  {
    id: "repeal",
    kind: "repeal" as const,
    lastDay: "2032-12-31",
    enactedOn: "2028-01-01",
    enactmentSequence: 2,
  },
  {
    id: "extension-after-repeal",
    kind: "extension" as const,
    lastDay: "2040-12-31",
    enactedOn: "2029-01-01",
    enactmentSequence: 3,
  },
  {
    id: "shortening-after-repeal",
    kind: "sunset" as const,
    lastDay: "2030-12-31",
    enactedOn: "2030-01-01",
    enactmentSequence: 4,
  },
];

describe("program last-day rule", () => {
  it.each(lifePlaceStateIdentities())(
    "matches the legacy no-term result in $jurisdictionKey",
    ({ jurisdictionKey }) => {
      const { world, jurisdictionId } = smallWorld({
        place: jurisdictionKey,
        date: makeIsoDate("2026-01-01"),
        seed: `program-last-day:${jurisdictionKey}`,
      });
      expect(programLastDayFromFacts([])).toEqual(
        programLastDay(world, { authorityKey: targetKey, jurisdictionId }),
      );
    },
  );

  it("sorts by enactment order and prevents post-repeal extensions", () => {
    expect(programLastDayFromFacts(changes)?.id).toBe(
      "shortening-after-repeal",
    );
  });

  it("uses enactment sequence to break same-day ties", () => {
    const sameDay = [
      {
        id: "first",
        kind: "sunset" as const,
        lastDay: "2030-12-31",
        enactedOn: "2028-01-01",
        enactmentSequence: 1,
      },
      {
        id: "second",
        kind: "repeal" as const,
        lastDay: "2029-12-31",
        enactedOn: "2028-01-01",
        enactmentSequence: 2,
      },
      {
        id: "third",
        kind: "extension" as const,
        lastDay: "2040-12-31",
        enactedOn: "2028-01-01",
        enactmentSequence: 3,
      },
    ];
    expect(programLastDayFromFacts(sameDay)?.id).toBe("second");
  });
});
