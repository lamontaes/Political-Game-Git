import { describe, expect, it } from "vitest";

import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../../src/presentation/opening-life";
import { DEFAULT_NEW_GAME_SETUP } from "../../src/presentation/new-game";
import {
  favorsGivenBy,
  favorsReceivedBy,
} from "../../src/simulation/patronage/favor-refs";
import { TOWN_EMPLOYMENT_VERSION } from "../../src/simulation/living-world/town-employment";
import { reviewTownJobs } from "../../src/simulation/living-world/town-labor-market";
import { isPublicEmployer } from "../../src/simulation/patronage/hiring";
import {
  townFollowing,
  townSupportFromFavors,
} from "../../src/simulation/patronage/following";
import type { World } from "../../src/simulation";

const COLUMBUS = "3918000";

/**
 * Columbus, Ohio, watched through four quarterly job reviews in play. Every
 * hire at a private employer is a favor from the person who runs it; no public
 * hire is, because Ohio's local civil-service law is unread and an unknown law
 * is not permission.
 */
function columbusAfterFourReviews() {
  const game = generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      seed: "patronage-hiring-columbus",
      placeKey: COLUMBUS,
      startAge: 30,
      questionnaire: "skipped",
    }),
  ).game!;
  const personId = game.playerPersonId;
  const town = game.world.people[personId]!.homeJurisdictionId;
  let world: World = game.world;
  const before = world;
  for (let round = 0; round < 4; round += 1)
    world = reviewTownJobs(world, town, personId, `patronage-${round}`);
  return { before, world, town, personId };
}

describe("a job given is a favor", () => {
  const watched = columbusAfterFourReviews();

  it("writes no favor for the town's opening jobs", () => {
    const { before } = watched;
    const hires = before.personOrder.flatMap((id) =>
      favorsReceivedBy(before, id).filter((favor) =>
        favor.kind.endsWith(":job"),
      ),
    );
    expect(hires).toEqual([]);
  });

  it("writes one favor from the head of a private employer for each in-play hire", () => {
    const { world, town } = watched;
    const hires = world.history.workRelationships.filter(
      (row) =>
        row.stableKey.startsWith(`${TOWN_EMPLOYMENT_VERSION}:${town}:job:`) &&
        row.stableKey.includes(":patronage-") &&
        row.organizationId !== null,
    );
    expect(hires.length).toBeGreaterThan(0);
    const privateHires = hires.filter(
      (row) => !isPublicEmployer(world, row.organizationId!),
    );
    const publicHires = hires.filter((row) =>
      isPublicEmployer(world, row.organizationId!),
    );
    // Each hire's favor is found by the hire event the favor points at.
    const hireEvents = new Map(
      world.history.events
        .filter((event) => event.type === "patronage.hired")
        .map((event) => [event.id, event]),
    );
    const favorByJob = new Map(
      world.personOrder
        .flatMap((id) => favorsReceivedBy(world, id))
        .filter((favor) => hireEvents.has(favor.eventId))
        .map((favor) => [
          hireEvents.get(favor.eventId)!.stableKey.split(":hire:")[1]!,
          favor,
        ]),
    );
    // A business run by nobody yet, or by the hire themself, gives no favor.
    const given = privateHires.filter((row) => favorByJob.has(row.id));
    expect(given.length).toBeGreaterThan(0);
    for (const row of given) {
      const favor = favorByJob.get(row.id)!;
      expect(favor.kind).toBe("private:job");
      expect(favor.receiverPersonId).toBe(row.personId);
      expect(favor.giverPersonId).not.toBe(row.personId);
    }
    for (const row of publicHires) expect(favorByJob.has(row.id)).toBe(false);
  });

  it("gives whoever hires most of a town a following at the ballot box", () => {
    const { world, town } = watched;
    const givers = new Map<string, number>();
    for (const id of world.personOrder)
      for (const favor of favorsReceivedBy(world, id))
        if (favor.kind === "private:job")
          givers.set(
            favor.giverPersonId,
            (givers.get(favor.giverPersonId) ?? 0) + 1,
          );
    const [director] = [...givers.entries()].sort((a, b) => b[1] - a[1])[0]!;
    expect(favorsGivenBy(world, director as never).length).toBeGreaterThan(0);
    const following = townFollowing(world, town, director as never);
    expect(following.debtors.length).toBeGreaterThan(0);
    expect(following.households.length).toBeGreaterThanOrEqual(
      following.debtors.length,
    );
    expect(
      townSupportFromFavors(world, town, director as never, world.currentDate),
    ).toBeGreaterThan(1);
    // Nobody who gave no job gains anything.
    const stranger = world.personOrder.find(
      (id) => !givers.has(id) && world.people[id]!.homeJurisdictionId === town,
    )!;
    expect(
      townSupportFromFavors(world, town, stranger, world.currentDate),
    ).toBe(1);
  });
});
