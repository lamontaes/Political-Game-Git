import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { gameStartDate } from "../core2/game-start";
import {
  corePlaceByJurisdictionId,
  searchCorePlaces,
} from "../core2/place-lookup";
import {
  filedAtCounter,
  openFilingVisit,
  pickContest,
  type FilingContest,
} from "./filing-visit";

/**
 * At the filing counter "in {place}" says where the seat is (Words lead,
 * Nov 14: "Your name's in for the senate in Edgar", a special U.S. Senate
 * race). A town's own seat is in the player's town; a county's, a state's or
 * the nation's names the county or the state it covers; a seat said by its
 * district names no place. The body is never said by its last word.
 */
const PLACES = [
  ["Edgar", "US-WI", "4d8a2d61-6aea-48c7-8043-906d5c563aaa", "Wisconsin"],
  ["Bramwell", "US-WV", "9108-counter-b", "West Virginia"],
] as const;

describe("a filed seat says where it is", () => {
  for (const [name, state, seed, stateName] of PLACES) {
    it(`at the counter in ${name} (${state}, seed ${seed})`, () => {
      const place = searchCorePlaces(name, 3, {
        stateJurisdictionKey: state,
      })[0]!;
      const world = buildBenchWorld(seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
      const core = world.core;
      const me = world.playerId as never;
      expect(
        corePlaceByJurisdictionId(core.people.get(me)!.placeId as never)
          ?.withinName,
      ).toBe(stateName);
      const contest = (
        id: string,
        title: string,
        level: string,
        extra: {
          seats?: number;
          body?: string;
          district?: string;
          kind?: string;
        } = {},
      ): FilingContest => ({
        id,
        title,
        filingDeadline: "2026-12-01",
        electionDate: "2027-04-06",
        primaryDate: null,
        termYears: 4,
        kind: extra.kind ?? "x",
        sourceIds: [],
        seat: {
          title,
          seats: extra.seats ?? 1,
          bodyName: extra.body ?? null,
          district: extra.district ?? null,
          level,
        },
      });
      const said = (row: FilingContest) => {
        let visit = openFilingVisit(core, me, [row], undefined, "County clerk");
        visit = pickContest(
          core,
          visit,
          row.id,
          { filedWith: "County clerk", source: "x" },
          [],
        );
        const file = visit.choices.find((c) => c.control === "file")!;
        visit = filedAtCounter(core, visit, file);
        return visit.lines
          .filter((line) => line.speaker === "clerk")
          .map((line) => line.text)
          .join(" ");
      };
      // The town's own counter says no place; the town is said only where
      // its seat is filed at a county's or the state's counter.
      const own = said(
        contest("c1", "Mayor", "city", { kind: "municipalOffice-single" }),
      );
      expect(own).toMatch(/for mayor/);
      expect(own).not.toContain(`in ${name}`);
      const senate = said(
        contest("c2", "U.S. Senator", "federal", {
          seats: 2,
          body: "United States Senate",
        }),
      );
      expect(senate).toContain("the U.S. Senate");
      expect(senate).not.toMatch(/the senate/i);
      expect(senate).not.toContain(`in ${name}`);
      const governor = said(contest("c3", "Governor", "state"));
      expect(governor).toContain("governor");
      expect(governor).not.toMatch(/governor in /);
      const county = said(contest("c4", "County Clerk", "county"));
      expect(county).toContain("county clerk");
      expect(county).not.toContain(`in ${name}`);
      const district = said(
        contest("c5", "State Senator", "state", {
          seats: 33,
          body: "Senate",
          district: "17",
        }),
      );
      expect(district).toContain("the state Senate in the 17th District");
      expect(district).not.toContain(`in ${name}`);
      expect(district).not.toMatch(/\bthe seat\b/);
      const congress = said(
        contest("c6", "U.S. Representative", "federal", {
          seats: 8,
          body: "United States House of Representatives",
          district: "03",
        }),
      );
      expect(congress).toContain("Congress in the 3rd District");
    });
  }
});
