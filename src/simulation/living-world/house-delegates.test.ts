import { beforeAll, describe, expect, it } from "vitest";
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
import { makeIsoDate } from "../dates";
import { createCampaignElectionTransitionRegistry } from "../campaigns";
import { advanceWorld } from "../world";
import { nonvotingHouseMemberTitle } from "../state-reference";
import type { EntityId, World } from "../types";
import { projectCongress } from "./congress";
import {
  HOUSE_DELEGATE_SEATS,
  applyHouseDelegateTurnover,
  houseDelegateOccupant,
  houseDelegateSeat,
  houseDelegateTermWindow,
} from "./house-delegates";
import { ensureLivingWorldOpening } from "./opening";

/**
 * The six nonvoting members of the U.S. House are seated at the opening,
 * stay out of the 435 voting seats, and carry across the terms that end
 * January 3, 2027 and January 3, 2029.
 */

const PLACES = ["AS", "DC", "GU", "MP", "PR", "VI"] as const;
let opened: World;
let player: EntityId;

beforeAll(() => {
  const created = createNewGameWorld({
    ...DEFAULT_NEW_GAME_SETUP,
    seed: "house-delegates-a",
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

const on = (world: World, date: string): World => ({
  ...world,
  currentDate: makeIsoDate(date),
});

describe("the six nonvoting House members are seated", () => {
  it("covers exactly the places that send one, each with a researched or labeled lean", () => {
    expect(HOUSE_DELEGATE_SEATS.map((seat) => seat.stateUsps).sort()).toEqual([
      ...PLACES,
    ]);
    for (const seat of HOUSE_DELEGATE_SEATS) {
      expect(nonvotingHouseMemberTitle(seat.stateUsps), seat.stateUsps).toBe(
        seat.title,
      );
      expect(seat.lean.basis, seat.stateUsps).toMatch(/2024/);
    }
    // Where the race gives no two-caucus share, the lean says it is estimated.
    for (const seat of HOUSE_DELEGATE_SEATS)
      if (seat.lean.democraticShare === null)
        expect(seat.lean.basis).toMatch(/ESTIMATED FROM AVERAGE/);
  });

  it("names a living holder in every one, with a term that covers the world's date", () => {
    for (const usps of PLACES) {
      const occupant = houseDelegateOccupant(opened, usps);
      expect(occupant.kind, usps).toBe("member");
      if (occupant.kind !== "member") continue;
      expect(opened.people[occupant.personId], usps).toBeDefined();
      expect(occupant.startedAt <= opened.currentDate).toBe(true);
      expect(opened.currentDate < occupant.endExclusive).toBe(true);
      expect(["democratic", "republican"]).toContain(occupant.caucus);
    }
    expect(
      new Set(
        PLACES.map((usps) => {
          const o = houseDelegateOccupant(opened, usps);
          return o.kind === "member" ? o.personId : usps;
        }),
      ).size,
    ).toBe(6);
  });

  it("keeps the House at 435 voting seats", () => {
    const congress = projectCongress(opened)!;
    expect(congress.house.seats).toHaveLength(435);
    expect(
      congress.house.seats.some(
        (seat) =>
          seat.stateUsps in { DC: 1, PR: 1, GU: 1, VI: 1, AS: 1, MP: 1 },
      ),
    ).toBe(false);
  });

  it("gives Puerto Rico's Resident Commissioner four-year terms and the others two", () => {
    const window = (usps: string) =>
      houseDelegateTermWindow(
        houseDelegateSeat(usps)!,
        makeIsoDate("2026-09-30"),
      );
    expect(window("PR")).toEqual({
      startsAt: "2025-01-03",
      endExclusive: "2029-01-03",
    });
    expect(window("GU")).toEqual({
      startsAt: "2025-01-03",
      endExclusive: "2027-01-03",
    });
  });

  it("is the same seed, the same holders", () => {
    const again = ensureLivingWorldOpening(
      establishOpeningOfficeholders(
        ensureWorldStartingConditions(
          createNewGameWorld({
            ...DEFAULT_NEW_GAME_SETUP,
            seed: "house-delegates-a",
          }).world,
          {
            openingVersion: CRUNCH46_WORLD_OPENING_VERSION,
            political: generatePoliticalStartingConditions,
          },
        ),
        player,
      ),
      player,
    );
    for (const usps of PLACES) {
      const a = houseDelegateOccupant(opened, usps);
      const b = houseDelegateOccupant(again, usps);
      expect(a.kind === "member" ? a.personName : null).toBe(
        b.kind === "member" ? b.personName : null,
      );
    }
  });
});

describe("the seats carry across the term ends", () => {
  const holders = (world: World) =>
    PLACES.map((usps) => {
      const occupant = houseDelegateOccupant(world, usps);
      return occupant.kind === "member" ? occupant : null;
    });

  it("shows no current record on January 3, 2027 until turnover runs, then a holder again", () => {
    const before = opened.currentDate;
    const lapsed = on(opened, "2027-01-04");
    // Without the step the two-year seats' terms are over.
    expect(houseDelegateOccupant(lapsed, "GU").kind).toBe("no-current-record");
    const next = applyHouseDelegateTurnover(before, lapsed);
    for (const usps of PLACES) {
      const occupant = houseDelegateOccupant(next, usps);
      expect(occupant.kind, usps).toBe("member");
      if (occupant.kind !== "member") continue;
      expect(occupant.startedAt, usps).toBe(
        usps === "PR" ? "2025-01-03" : "2027-01-03",
      );
    }
  });

  it("re-elects a living incumbent the seat's lean favors, and replaces one it does not", () => {
    const lapsed = on(opened, "2027-01-04");
    const next = applyHouseDelegateTurnover(opened.currentDate, lapsed);
    const first = holders(opened);
    const second = holders(next);
    // The lean is fixed data, so each seat's outcome follows from it: the
    // incumbent returns when the projected caucus is theirs, else a new
    // person takes the seat.
    for (const [index, usps] of PLACES.entries()) {
      const before = first[index]!;
      const after = second[index]!;
      if (usps === "PR") {
        // Four-year term: nothing happens at the first January 3.
        expect(after.personId).toBe(before.personId);
        continue;
      }
      if (before.caucus === after.caucus)
        expect(after.personId, usps).toBe(before.personId);
      else expect(after.personId, usps).not.toBe(before.personId);
    }
    // The change of hands is visible in the record: a new term event exists
    // for every two-year seat.
    const tenures = next.history.events.filter(
      (event) => event.type === "world.house-delegate-tenure",
    );
    expect(tenures.length).toBe(PLACES.length + (PLACES.length - 1));
  });

  it("does the same crossing when the clock itself runs through January 3, 2027", () => {
    const days = Math.round(
      (Date.parse("2027-01-04") - Date.parse(opened.currentDate)) / 86_400_000,
    );
    const next = advanceWorld(
      opened,
      days,
      createCampaignElectionTransitionRegistry(),
    );
    expect(next.currentDate).toBe("2027-01-04");
    for (const usps of PLACES)
      expect(houseDelegateOccupant(next, usps).kind, usps).toBe("member");
    const seats = projectCongress(next)!;
    expect(seats.house.seats).toHaveLength(435);
  }, 900_000);

  it("seats the Resident Commissioner's next term on January 3, 2029", () => {
    let world = applyHouseDelegateTurnover(
      opened.currentDate,
      on(opened, "2027-01-04"),
    );
    world = applyHouseDelegateTurnover(
      world.currentDate,
      on(world, "2029-01-04"),
    );
    const occupant = houseDelegateOccupant(world, "PR");
    expect(occupant.kind).toBe("member");
    if (occupant.kind === "member")
      expect(occupant.startedAt).toBe("2029-01-03");
  });

  it("leaves an older save alone: no opening, no seat", () => {
    const bare = {
      ...opened,
      history: {
        ...opened.history,
        events: opened.history.events.filter(
          (event) => event.type !== "world.house-delegate-tenure",
        ),
      },
    } as World;
    expect(
      applyHouseDelegateTurnover(bare.currentDate, on(bare, "2027-01-04")),
    ).toStrictEqual(on(bare, "2027-01-04"));
    expect(houseDelegateOccupant(bare, "GU").kind).toBe("not-seated");
  });
});
