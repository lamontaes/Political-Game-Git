import { describe, expect, it } from "vitest";
import { ageOnDate } from "../dates";
import { DEFAULT_NEW_GAME_SETUP } from "../../presentation/new-game";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../../presentation/opening-life";
import { seatHolderAt } from "./courts";
import { FEDERAL_COURTS_PROJECTION } from "./generated/federal-courts";
import { ensureOpeningJudiciary } from "./opening";

describe("ordinary opening judiciary", () => {
  it("leaves previously encoded v2 openings without new court bytes", () => {
    const previous = generateOpeningLife(
      prepareOpeningLife({
        ...DEFAULT_NEW_GAME_SETUP,
        seed: "judiciary-previous-opening",
        openingDataVersion: "playtest65-v2",
      }),
    ).game!.world;
    expect(previous.judiciary).toBeUndefined();
  });

  it("seats stable named people, links the Chief, and preserves territorial terms", () => {
    const session = generateOpeningLife(
      prepareOpeningLife({
        ...DEFAULT_NEW_GAME_SETUP,
        seed: "judiciary-ordinary-opening",
      }),
    );
    const world = session.game!.world;
    const judiciary = world.judiciary!;
    const activeSeats = Object.values(judiciary.seats).filter(
      (seat) => seat.retiredAt === null,
    );
    expect(activeSeats).toHaveLength(1338);
    expect(judiciary.seatTenures).toHaveLength(1337);
    expect(judiciary.professionalQualifications).toHaveLength(1337);
    const districtJurisdictions = new Map(
      FEDERAL_COURTS_PROJECTION.filter(
        (court) => court.courtKind === "district-court",
      ).map((court) => [court.courtId, court.jurisdictionName]),
    );
    for (const seat of activeSeats) {
      if (!districtJurisdictions.has(seat.courtId)) continue;
      const holder = seatHolderAt(world, seat.seatId)!;
      const person = world.people[holder.personId]!;
      const court = judiciary.courts[seat.courtId]!;
      if (court.jurisdictionId) {
        expect(person.homeJurisdictionId).toBe(court.jurisdictionId);
      } else {
        expect(world.jurisdictions[person.homeJurisdictionId]?.name).toBe(
          districtJurisdictions.get(seat.courtId),
        );
      }
    }
    expect(
      activeSeats.every((seat) => {
        const holder = seatHolderAt(world, seat.seatId);
        return holder !== null && Boolean(world.people[holder.personId]);
      }),
    ).toBe(true);
    expect(
      judiciary.seatTenures.filter(
        (tenure) => tenure.seatId === "d-gu:seat:1",
      )[0]?.termEndsAt,
    ).toBe(
      `${Number(world.currentDate.slice(0, 4)) + 10}${world.currentDate.slice(4)}`,
    );
    const guam = judiciary.seatTenures.find(
      (tenure) => tenure.seatId === "d-gu:seat:1",
    )!;
    expect(seatHolderAt(world, guam.seatId, guam.termEndsAt!)).not.toBeNull();
    const fixedWithoutHoldover = judiciary.seatTenures.find((tenure) => {
      if (!tenure.termEndsAt) return false;
      const court = judiciary.courts[judiciary.seats[tenure.seatId]!.courtId]!;
      return (
        court.rules.termHoldsUntilSuccessorQualified?.state !== "known" ||
        court.rules.termHoldsUntilSuccessorQualified.value !== true
      );
    })!;
    expect(fixedWithoutHoldover).toBeDefined();
    expect(
      seatHolderAt(
        world,
        fixedWithoutHoldover.seatId,
        fixedWithoutHoldover.termEndsAt!,
      ),
    ).toBeNull();
    for (const tenure of judiciary.seatTenures) {
      const court = judiciary.courts[judiciary.seats[tenure.seatId]!.courtId]!;
      const retirement = court.rules.mandatoryRetirementAge;
      if (retirement.state !== "known" || retirement.value === null) continue;
      expect(
        ageOnDate(world.people[tenure.personId]!.birthDate, world.currentDate),
      ).toBeLessThan(retirement.value);
    }
    expect(
      judiciary.seatTenures.some(
        (tenure) => tenure.seatId === "us-supreme-court:seat:1",
      ),
    ).toBe(false);
    expect(ensureOpeningJudiciary(world)).toBe(world);
  });
});
