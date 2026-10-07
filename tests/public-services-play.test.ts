import { beforeAll, describe, expect, it } from "vitest";
import { advanceWorld } from "../src/simulation/world";
import { childServiceFixture } from "./fixtures/child-service-fixture";
import { drawRandomPlace } from "./support/random-place";
import { addSimulationMinutes } from "../src/simulation/dates";
import { activeEducationEnrollmentsAt } from "../src/simulation/life-queries";
import {
  requestPublicService,
  serviceLawForCommitment,
} from "../src/simulation/public-service-requests";
import { publicProgramRecords } from "../src/simulation/public-program-integrity";
import { resourcePositionAt } from "../src/simulation/resource-queries";
import { money } from "../src/simulation/resources";
import {
  deserializeWorld,
  serializeWorld,
} from "../src/simulation/serialization";

const SEED = "public-services-play-20261001";
const place = drawRandomPlace(SEED);
const SERVICE = {
  question: "us-policy-positions:education.universal-preschool",
  name: "pre-K",
  age: 4,
} as const;
let fixture: ReturnType<typeof childServiceFixture>;

/** Slice script: each case names the action and saved result the family needs.
 * These are data contracts, not proof of a browser route. Missing steps stay TODO.
 */
describe(`Public services play in ${place.displayName}, seed ${SEED}`, () => {
  beforeAll(() => {
    fixture = childServiceFixture(SERVICE, SEED);
  });

  const request = () =>
    requestPublicService(fixture.funded, {
      personId: fixture.parentId,
      forPersonId: fixture.childId,
      commitmentId: fixture.commitmentId,
      start: addSimulationMinutes(fixture.funded.currentMoment, 30),
      end: addSimulationMinutes(fixture.funded.currentMoment, 390),
    });

  it("step 1: the parent has an eligible recorded child and an in-force service law, but unpaid service cannot be booked", () => {
    const world = fixture.unpaid;
    const commitment = publicProgramRecords(world).find(
      (row) => row.id === fixture.commitmentId,
    )!;
    if (commitment.kind !== "commitment")
      throw new Error("Expected recorded commitment.");
    expect(
      serviceLawForCommitment(world, commitment, world.currentDate)?.law.answer,
    ).toBe("yes");
    const result = requestPublicService(world, {
      personId: fixture.parentId,
      forPersonId: fixture.childId,
      commitmentId: fixture.commitmentId,
      start: addSimulationMinutes(world.currentMoment, 30),
      end: addSimulationMinutes(world.currentMoment, 390),
    });
    expect(result.kind).toBe("unsupported");
    expect(result.world).toBe(world);
    expect(activeEducationEnrollmentsAt(world, fixture.childId)).toHaveLength(
      0,
    );
  });

  it("step 2: advance the clock and see the government account pay its recorded provider", () => {
    const balance = (organizationId: typeof fixture.providerId) =>
      resourcePositionAt(
        fixture.funded,
        { kind: "organization", organizationId },
        money(0, "USD").currency,
      )!.liquidBalance.minorUnits;
    expect(balance(fixture.accountId)).toBe(0);
    expect(balance(fixture.providerId)).toBe(10000);
    expect(fixture.funded.history.resourceTransferOutcomes).toContainEqual(
      expect.objectContaining({
        status: "completed",
        transferredAmount: money(10000, "USD"),
      }),
    );
  });

  it("step 3: the parent asks for a spot and sees the child enrolled with that provider", () => {
    const result = request();
    if (result.kind !== "scheduled") throw new Error(result.reason);
    expect(
      activeEducationEnrollmentsAt(result.world, fixture.childId),
    ).toContainEqual(
      expect.objectContaining({
        enrollment: expect.objectContaining({
          organizationId: fixture.providerId,
          id: result.enrollmentId,
        }),
      }),
    );
    expect(
      result.world.history.events.find(
        (row) => row.id === result.requestEventId,
      )!.participants[0]!.personId,
    ).toBe(fixture.parentId);
    expect(
      result.world.history.events.filter(
        (row) => row.type === "service.delivery-recorded",
      ),
    ).toHaveLength(0);
  });

  it("step 4: save and continue, attend through the clock, and retain one six-hour service receipt", () => {
    const result = request();
    if (result.kind !== "scheduled") throw new Error(result.reason);
    const attended = advanceWorld(
      deserializeWorld(serializeWorld(result.world)),
      1,
    );
    const receipts = attended.history.events.filter(
      (row) => row.type === "service.delivery-recorded",
    );
    expect(receipts).toHaveLength(1);
    expect(receipts[0]!.summary).toContain("6 hours");
    expect(receipts[0]!.lawEffectStamps?.[0]).toMatchObject({
      questionKey: SERVICE.question,
      effectKind: "service-delivered",
    });
    const continued = advanceWorld(
      deserializeWorld(serializeWorld(attended)),
      1,
    );
    expect(
      continued.history.events.filter(
        (row) => row.type === "service.delivery-recorded",
      ),
    ).toHaveLength(1);
    expect(
      activeEducationEnrollmentsAt(continued, fixture.childId),
    ).toHaveLength(1);
  });

  it("step 4b: the delivered service names the child and the parent in law exposures", () => {
    const result = request();
    if (result.kind !== "scheduled") throw new Error(result.reason);
    const attended = advanceWorld(result.world, 1);
    const receipt = attended.history.events.find(
      (row) => row.type === "service.delivery-recorded",
    )!;
    const exposures = (attended.history.lawExposures ?? []).filter(
      (row) => row.sourceRecordId === receipt.id && row.relation === "own",
    );
    expect(exposures.map((row) => row.personId).sort()).toEqual(
      [fixture.childId, fixture.parentId].sort(),
    );
    for (const row of exposures)
      expect(row).toMatchObject({
        channel: "public-service",
        direction: "gain",
        amount: null,
      });
    const reloaded = deserializeWorld(serializeWorld(attended));
    expect(reloaded.history.lawExposures).toEqual(
      attended.history.lawExposures,
    );
  });

  it.todo(
    "step 5: the parent's family schedule reads the child's pending attendance due item (data-only reader not built)",
  );
  it.todo(
    "step 6: the parent books and sees the child service through the ordinary player route (browser integration not admitted)",
  );
});
