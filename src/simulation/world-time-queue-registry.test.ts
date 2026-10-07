import { expect, it } from "vitest";
import { smallWorld } from "../../tests/fixtures/small-world";
import { drawRandomPlace } from "../../tests/support/random-place";
import { stateCandidacyPack } from "./candidacy-packs";
import { composeWorldTimeHandlers } from "./campaigns";
import {
  futureDueItemStateAt,
  resolveFutureDueItemsThrough,
} from "./future-transitions";
import { serializeWorld, deserializeWorld } from "./serialization";
import {
  reconcileStateLegislatureQueue,
  STATE_LEGISLATURE_WAKE_TRANSITION,
  STATE_LEGISLATURE_QUEUE_HANDLERS,
} from "./nationwide-world/state-legislature-queue";

it("dispatches a saved legislature wake through the ordinary world registry without changing its writer or due identity", () => {
  const seed = "session6-birth-resident-handoff";
  const fixture = smallWorld({
    place: drawRandomPlace(seed).key,
    date: "2021-01-01",
    offices: ["state-legislature"],
    seed,
  });
  const packId = stateCandidacyPack(`US-${fixture.stateUsps}`)!.packId;
  const queued = reconcileStateLegislatureQueue(fixture.world, packId, 2022);
  const first = queued.history.futureDueItems.find(
    (item) => item.transitionKey === STATE_LEGISLATURE_WAKE_TRANSITION,
  )!;
  expect(first).toBeDefined();
  const loaded = deserializeWorld(serializeWorld(queued));
  expect(loaded.history.futureDueItems).toEqual(queued.history.futureDueItems);
  const expected = resolveFutureDueItemsThrough(
    loaded,
    first.dueAt,
    STATE_LEGISLATURE_QUEUE_HANDLERS,
  );
  const actual = resolveFutureDueItemsThrough(
    loaded,
    first.dueAt,
    composeWorldTimeHandlers(),
  );
  expect(actual.history).toEqual(expected.history);
  expect(
    futureDueItemStateAt(actual, first.id, {
      asOfDate: actual.currentDate,
      historySequenceExclusive: actual.history.nextSequence,
    })?.status,
  ).toBe("resolved");
  const reloaded = deserializeWorld(serializeWorld(actual));
  const again = resolveFutureDueItemsThrough(
    reloaded,
    first.dueAt,
    composeWorldTimeHandlers(),
  );
  expect(again.history).toEqual(reloaded.history);
});
