import { beforeAll, describe, expect, it, vi } from "vitest";
import type * as LegislationIntegrity from "../legislation-integrity";

// The test writes one federal Act straight into the record so it can watch what
// the seats do with it; the bill-by-bill legislative integrity check is not
// what is under test here, and the Act has no floor votes to satisfy it.
vi.mock("../legislation-integrity", async (importOriginal) => ({
  ...(await importOriginal<typeof LegislationIntegrity>()),
  assertLegislationIntegrity: () => undefined,
}));
import {
  CRUNCH46_WORLD_OPENING_VERSION,
  ensureWorldStartingConditions,
  generatePoliticalStartingConditions,
} from "../world-setup";
import {
  DEFAULT_NEW_GAME_SETUP,
  createNewGameWorld,
} from "../../presentation/new-game";
import { establishOpeningOfficeholders } from "../../presentation/opening-officeholders";
import { addDays, makeIsoDate } from "../dates";
import { createCampaignElectionTransitionRegistry } from "../campaigns";
import { advanceWorld } from "../world";
import {
  adultLifeAt,
  firstLocality,
} from "../../../tests/fixtures/state-executive-entry";
import { projectGovernmentBrowser } from "../../presentation/politics-government";
import { seatedCongressChamber } from "../governing/congress-chambers";
import {
  NATIONAL_ELECTION_JURISDICTION,
  ensureNationalElectionJurisdiction,
} from "../national-election-geography";
import type {
  EntityId,
  LegislativeEnactmentRecord,
  LegislativeMeasureRecord,
  World,
} from "../types";
import { projectCongress } from "./congress";
import { houseDelegateOccupant } from "./house-delegates";
import { ensureLivingWorldOpening } from "./opening";
import {
  congressSeatsIn,
  statehoodPlace,
  statehoodSeats,
  statehoodTookEffect,
} from "./statehood-seats";

/**
 * A federal Act that answers yes on statehood for the District of Columbia
 * adds a voting House seat and two Senate seats when it takes effect, and the
 * chambers, their vote counts and the place's representation follow.
 */

const QUESTION_KEY =
  "us-federal-positions:territories-culture.statehood-for-dc";
let opened: World;
let player: EntityId;

beforeAll(() => {
  const created = createNewGameWorld({
    ...DEFAULT_NEW_GAME_SETUP,
    seed: "statehood-seats-a",
  });
  player = created.playerPersonId;
  opened = ensureLivingWorldOpening(
    establishOpeningOfficeholders(
      ensureWorldStartingConditions(created.world, {
        openingVersion: CRUNCH46_WORLD_OPENING_VERSION,
        political: generatePoliticalStartingConditions,
      }),
      player,
    ),
    player,
  );
}, 300_000);

function enact(world: World, answer: "yes" | "no", effectiveAt: string): World {
  const proposition = Object.values(world.policyCatalog.propositions).find(
    (definition) => definition.stableKey === QUESTION_KEY,
  )!;
  const measure: LegislativeMeasureRecord = {
    id: "legislative-measure_statehood_test" as EntityId,
    stableKey: "test:statehood",
    sequence: world.history.nextSequence,
    jurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
    rulePackId: "us-congress-v1",
    designation: "H.R. 51",
    shortTitle: "A statehood Act",
    summary: "A test Act.",
    origin: "member-introduction",
    subjectClass: "general-policy",
    originChamberKey: "house",
    sponsorPersonId: null,
    introducedAt: makeIsoDate("2026-01-01"),
    sourceDocumentKey: null,
    policyAlternativeIds: [],
    propositionIds: [proposition.id],
    propositionAnswers: [{ propositionId: proposition.id, answer }],
  };
  const enactment: LegislativeEnactmentRecord = {
    id: "legislative-enactment_statehood_test" as EntityId,
    stableKey: "test:statehood:enactment",
    sequence: world.history.nextSequence + 1,
    measureId: measure.id,
    resolvedAt: makeIsoDate(effectiveAt),
    outcome: "enacted",
    actDesignation: null,
    effectiveAt: makeIsoDate(effectiveAt),
    outcomeEventId: world.history.events[0]!.id,
  };
  const withJurisdiction = ensureNationalElectionJurisdiction(world);
  return {
    ...withJurisdiction,
    history: {
      ...withJurisdiction.history,
      nextSequence: world.history.nextSequence + 2,
      legislativeMeasures: [
        ...(world.history.legislativeMeasures ?? []),
        measure,
      ],
      legislativeEnactments: [
        ...(world.history.legislativeEnactments ?? []),
        enactment,
      ],
    },
  };
}

describe("the seats the law adds are data, not code", () => {
  it("adds one House seat and two Senate seats in two different classes, for the place in the data file", () => {
    const seats = statehoodSeats();
    expect(seats.filter((seat) => seat.chamberKey === "us-house")).toHaveLength(
      1,
    );
    const senate = seats.filter((seat) => seat.chamberKey === "us-senate");
    expect(senate).toHaveLength(2);
    expect(new Set(senate.map((seat) => seat.senateClass)).size).toBe(2);
    for (const seat of seats) expect(seat.stateUsps).toBe(statehoodPlace());
  });
});

describe("with no statehood law, nothing changes", () => {
  it("keeps 435 and 100, and the Delegate's seat", () => {
    expect(statehoodTookEffect(opened)).toBeNull();
    expect(congressSeatsIn(opened)).toHaveLength(535);
    const congress = projectCongress(opened)!;
    expect(congress.house.seats).toHaveLength(435);
    expect(congress.senate.seats).toHaveLength(100);
    expect(houseDelegateOccupant(opened, "DC").kind).toBe("member");
  });

  it("does nothing for a law that answered no", () => {
    const refused = enact(opened, "no", addDays(opened.currentDate, 1));
    const later = advanceWorld(
      refused,
      30,
      createCampaignElectionTransitionRegistry(),
    );
    expect(projectCongress(later)!.senate.seats).toHaveLength(100);
  });
});

describe("when the law takes effect", () => {
  const effective = () => addDays(opened.currentDate, 1);
  let admitted: World;
  beforeAll(() => {
    const passed = enact(opened, "yes", effective());
    admitted = advanceWorld(
      passed,
      30,
      createCampaignElectionTransitionRegistry(),
    );
  }, 300_000);

  it("grows the House to 436 and the Senate to 102, and the chambers' vote counts with them", () => {
    const congress = projectCongress(admitted)!;
    expect(congress.house.seats).toHaveLength(436);
    expect(congress.senate.seats).toHaveLength(102);
    expect(seatedCongressChamber(admitted, "house")!.seats).toBe(436);
    expect(seatedCongressChamber(admitted, "senate")!.seats).toBe(102);
    expect(
      seatedCongressChamber(admitted, "senate")!.body.members,
    ).toHaveLength(
      102 -
        congress.senate.seats.filter((s) => s.occupant.kind !== "member")
          .length,
    );
  });

  it("names a living holder for every new seat, the place's own Delegate becoming its Representative", () => {
    const congress = projectCongress(admitted)!;
    const place = statehoodPlace();
    const house = congress.house.seats.filter(
      (seat) => seat.stateUsps === place,
    );
    const senate = congress.senate.seats.filter(
      (seat) => seat.stateUsps === place,
    );
    expect(house).toHaveLength(1);
    expect(senate).toHaveLength(2);
    for (const seat of [...house, ...senate]) {
      expect(seat.occupant.kind, seat.seatKey).toBe("member");
      if (seat.occupant.kind !== "member") continue;
      expect(seat.occupant.member.personName).toBeTruthy();
    }
    const delegate = houseDelegateOccupant(opened, place);
    const representative = house[0]!.occupant;
    expect(delegate.kind).toBe("member");
    if (delegate.kind === "member" && representative.kind === "member")
      expect(representative.member.personId).toBe(delegate.personId);
  });

  it("seats the two senators as two different people", () => {
    const senate = projectCongress(admitted)!.senate.seats.filter(
      (seat) => seat.stateUsps === statehoodPlace(),
    );
    const people = senate.map((seat) =>
      seat.occupant.kind === "member" ? seat.occupant.member.personId : null,
    );
    expect(new Set(people).size).toBe(2);
  });

  it("leaves the other 435 and 100 exactly as they were", () => {
    const before = projectCongress(opened)!;
    const after = projectCongress(admitted)!;
    const held = (view: typeof before.senate) =>
      view.seats
        .filter((seat) => seat.stateUsps !== statehoodPlace())
        .map((seat) =>
          seat.occupant.kind === "member"
            ? `${seat.seatKey}:${seat.occupant.member.personId}`
            : seat.seatKey,
        );
    expect(held(after.senate)).toEqual(held(before.senate));
  });

  it("carries the new seats across the next January 3 and stops renewing the Delegate", () => {
    const days = Math.round(
      (Date.parse("2027-01-04") - Date.parse(admitted.currentDate)) /
        86_400_000,
    );
    const next = advanceWorld(
      admitted,
      days,
      createCampaignElectionTransitionRegistry(),
    );
    expect(next.currentDate).toBe("2027-01-04");
    const congress = projectCongress(next)!;
    expect(congress.house.seats).toHaveLength(436);
    expect(congress.senate.seats).toHaveLength(102);
    const place = statehoodPlace();
    for (const seat of [...congress.house.seats, ...congress.senate.seats])
      if (seat.stateUsps === place)
        expect(seat.occupant.kind, seat.seatKey).toBe("member");
    // The Delegate seat was not renewed; the place is a state now.
    expect(houseDelegateOccupant(next, place).kind).toBe("no-current-record");
  }, 900_000);
});

describe("the person who lives there", () => {
  it("is represented by two Senators and a Representative once the law takes effect, and by a Delegate before", () => {
    const life = adultLifeAt(firstLocality("DC").key, "statehood-seats-life");
    const rowsOf = (world: World) =>
      projectGovernmentBrowser(world, life.personId).representedBy!;
    const before = rowsOf(life.world);
    expect(before.map((row) => row.key)).not.toContain("us-senate");
    expect(before.find((row) => row.key === "us-house")!.office).toBe(
      "Delegate to the U.S. House",
    );
    const after = advanceWorld(
      enact(life.world, "yes", addDays(life.world.currentDate, 1)),
      30,
      createCampaignElectionTransitionRegistry(),
    );
    const rows = rowsOf(after);
    const senate = rows.find((row) => row.key === "us-senate")!;
    expect(senate.holders).toHaveLength(2);
    for (const holder of senate.holders)
      expect(holder).toMatchObject({ status: "member" });
    const house = rows.find((row) => row.key === "us-house")!;
    expect(house.office).not.toBe("Delegate to the U.S. House");
    expect(house.holders[0]).toMatchObject({ status: "member" });
  }, 300_000);
});
