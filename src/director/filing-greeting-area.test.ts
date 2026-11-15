import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { gameStartDate } from "../core2/game-start";
import { searchCorePlaces } from "../core2/place-lookup";
import { openFilingVisit, type FilingContest } from "./filing-visit";

/**
 * The clerk's greeting says the area the counter covers: a state office's
 * clerk never says "I take the filings for {town}" (Words lead, second reader,
 * Nov 14, Vicco and West Point KY). Pinned: Edgar, Wisconsin, one seed.
 */
const contest = (level: string): FilingContest => ({
  id: `c-${level}`,
  title: "Race",
  filingDeadline: "2026-12-01",
  electionDate: "2027-04-06",
  primaryDate: null,
  termYears: 4,
  kind: "x",
  sourceIds: [],
  seat: { title: "Race", seats: 1, bodyName: null, district: null, level },
});

describe("the filing greeting names the area the office covers", () => {
  it(
    "never says the town at a state or county counter",
    { timeout: 120_000 },
    () => {
      const place = searchCorePlaces("Edgar", 3, {
        stateJurisdictionKey: "US-WI",
      })[0]!;
      const world = buildBenchWorld(
        "4d8a2d61-6aea-48c7-8043-906d5c563aaa",
        gameStartDate(),
        {
          twoLevel: true,
          placeKey: place.key,
        },
      );
      const me = world.playerId as never;
      const greet = (level: string) =>
        openFilingVisit(
          world.core,
          me,
          [contest(level)],
          undefined,
          "Secretary of State",
        )
          .lines.map((line) => line.text)
          .join(" ");
      for (const level of ["state", "federal", "county"])
        expect(greet(level)).not.toContain("Edgar");
      expect(greet("city")).toContain("Edgar");
    },
  );
});
