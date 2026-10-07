import { beforeAll, describe, expect, it } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { drawRandomPlace } from "../../../tests/support/random-place";
import { stateCandidacyPack } from "../candidacy-packs";
import { addDays, simulationMomentOnLocalDate } from "../dates";
import {
  cancelFutureDueItem,
  resolveFutureDueItemsThrough,
  futureDueItemStateAt,
  setFutureDueItemTerminalState,
} from "../future-transitions";
import { serializeWorld, deserializeWorld } from "../serialization";
import { recordWorldEvent } from "../world";
import { stateSlateKey } from "./state-legislature-candidates";
import { stateLegislativeSeats } from "./state-legislature-opening";
import type { IsoDate, World } from "../types";
import {
  applyStateLegislatureTurnover,
  dispatchStateLegislatureWake,
  stateLegislatureWakePlan,
} from "./state-legislature-turnover";
import {
  reconcileStateLegislatureQueue,
  prepareStateLegislatureQueue,
  readStateLegislatureSavedWake,
  stateLegislatureQueueRevision,
  stateLegislatureWakeHandler,
  STATE_LEGISLATURE_WAKE_TRANSITION,
  STATE_LEGISLATURE_QUEUE_HANDLERS,
} from "./state-legislature-queue";

const seed = "session6-birth-resident-handoff";
const place = drawRandomPlace(seed);
let original: World, packId: string;
function at(world: World, date: IsoDate): World {
  return {
    ...world,
    currentDate: date,
    currentMoment: simulationMomentOnLocalDate(world.currentMoment, date),
  };
}
function append(world: World, relevant: boolean): World {
  const opening = world.history.events.find(
    (e) => e.type === "world.state-legislature-opening",
  )!;
  return recordWorldEvent(world, {
    ...opening,
    stableKey: `fixture:queue:${relevant}:${world.history.nextSequence}`,
    type: "test.queue-source",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    tags: [],
    involvedEntityIds: relevant
      ? opening.involvedEntityIds
      : [world.personOrder[0]!],
    summary: "Recorded source change control.",
  });
}
function pending(world: World) {
  return world.history.futureDueItems.filter(
    (i) =>
      i.transitionKey === STATE_LEGISLATURE_WAKE_TRANSITION &&
      futureDueItemStateAt(world, i.id, {
        asOfDate: world.currentDate,
        historySequenceExclusive: world.history.nextSequence,
      })?.status === "scheduled",
  );
}
beforeAll(() => {
  const f = smallWorld({
    place: place.key,
    date: "2021-01-01",
    offices: ["state-legislature"],
    seed,
  });
  original = f.world;
  packId = stateCandidacyPack(`US-${f.stateUsps}`)!.packId;
  console.log(`State queue place=${place.key}, seed=${seed}, pack=${packId}`);
});
describe("saved state legislative dated queue producer", () => {
  it("registers only the next actual pack date and skips an unchanged day without writes", () => {
    const plan = stateLegislatureWakePlan(original, packId, 2022);
    expect(plan.length).toBeGreaterThan(0);
    const queued = reconcileStateLegislatureQueue(original, packId, 2022);
    expect(new Set(pending(queued).map((i) => i.dueAt))).toEqual(
      new Set([plan[0]!.dueAt]),
    );
    const tomorrow = at(queued, addDays(original.currentDate, 1));
    expect(reconcileStateLegislatureQueue(tomorrow, packId, 2022)).toBe(
      tomorrow,
    );
    expect(tomorrow.history.decisionTraces).toBe(
      original.history.decisionTraces,
    );
    expect(tomorrow.history.events).toBe(original.history.events);
  });
  it("dispatches an intake date through identical canonical writers", () => {
    const wake = stateLegislatureWakePlan(original, packId, 2022).find(
      (p) => p.stage === "intake",
    )!;
    expect(wake).toBeDefined();
    const due = at(original, wake.dueAt);
    const direct = dispatchStateLegislatureWake(due, wake);
    const legacy = applyStateLegislatureTurnover(addDays(wake.dueAt, -1), due);
    expect(direct.history).toEqual(legacy.history);
    expect(direct.history.events.length).toBeGreaterThan(
      original.history.events.length,
    );
  });
  it("preserves identity and skips duplicate schedules after actual serialization/reload", () => {
    const queued = reconcileStateLegislatureQueue(original, packId, 2022);
    const loaded = deserializeWorld(serializeWorld(queued));
    const again = reconcileStateLegislatureQueue(loaded, packId, 2022);
    expect(again).toBe(loaded);
    expect(pending(again).map((i) => i.id)).toEqual(
      pending(queued).map((i) => i.id),
    );
  });
  it("retains an irrelevant append but invalidates a relevant recorded source", () => {
    const queued = reconcileStateLegislatureQueue(original, packId, 2022);
    const irrelevant = append(queued, false);
    expect(stateLegislatureQueueRevision(irrelevant, packId)).toBe(
      stateLegislatureQueueRevision(queued, packId),
    );
    expect(reconcileStateLegislatureQueue(irrelevant, packId, 2022)).toBe(
      irrelevant,
    );
    const revised = append(queued, true);
    const replaced = reconcileStateLegislatureQueue(revised, packId, 2022);
    expect(pending(replaced).map((i) => i.id)).not.toEqual(
      pending(queued).map((i) => i.id),
    );
    for (const old of pending(queued))
      expect(
        futureDueItemStateAt(replaced, old.id, {
          asOfDate: replaced.currentDate,
          historySequenceExclusive: replaced.history.nextSequence,
        })?.status,
      ).toBe("cancelled");
    expect(replaced.history.events).toBe(revised.history.events);
    expect(
      replaced.history.futureDueItems.slice(
        0,
        queued.history.futureDueItems.length,
      ),
    ).toEqual(queued.history.futureDueItems);
  });
  it("creates a fresh stable generation when a canceled obligation becomes required again", () => {
    const queued = reconcileStateLegislatureQueue(original, packId, 2022);
    const old = pending(queued)[0]!;
    const cancelled = cancelFutureDueItem(queued, {
      stableKey: `fixture:cancel:${old.id}`,
      dueItemId: old.id,
      effectiveAt: queued.currentDate,
      reasonKey: "fixture:source-change",
      context: null,
    });
    const restored = reconcileStateLegislatureQueue(cancelled, packId, 2022);
    expect(
      pending(restored).some((i) => i.dueAt === old.dueAt && i.id !== old.id),
    ).toBe(true);
    expect(reconcileStateLegislatureQueue(restored, packId, 2022)).toBe(
      restored,
    );
  });
  it("does not discard due work after a relevant same-day input append", () => {
    const queued = reconcileStateLegislatureQueue(original, packId, 2022);
    const item = pending(queued).find(
      (i) => readStateLegislatureSavedWake(i).stage === "intake",
    )!;
    const due = append(at(queued, item.dueAt), true);
    const result = stateLegislatureWakeHandler(due, item);
    expect(result.status).toBe("resolved");
    expect(result.world.history.events.length).toBeGreaterThan(
      due.history.events.length,
    );
    const resolved = setFutureDueItemTerminalState(result.world, {
      stableKey: `${item.stableKey}:fixture:resolved`,
      dueItemId: item.id,
      effectiveAt: item.dueAt,
      status: "resolved",
      reasonKey: null,
      context: null,
      outcomeEventId: null,
    });
    expect(
      futureDueItemStateAt(resolved, item.id, {
        asOfDate: resolved.currentDate,
        historySequenceExclusive: resolved.history.nextSequence,
      })?.status,
    ).toBe("resolved");
    expect(pending(resolved).some((i) => i.dueAt > item.dueAt)).toBe(true);
  });
  it("keeps ballot, election and recorded term transitions equivalent", () => {
    const ballot = stateLegislatureWakePlan(original, packId, 2022).find(
      (p) => p.stage === "ballot",
    )!;
    const ballotWorld = at(original, ballot.dueAt);
    const prepared = dispatchStateLegislatureWake(ballotWorld, ballot);
    expect(prepared.history).toEqual(
      applyStateLegislatureTurnover(addDays(ballot.dueAt, -1), ballotWorld)
        .history,
    );
    const election = stateLegislatureWakePlan(prepared, packId, 2022).find(
      (p) => p.stage === "election" && p.electionDay === ballot.electionDay,
    )!;
    const electionWorld = at(prepared, election.dueAt);
    const counted = dispatchStateLegislatureWake(electionWorld, election);
    expect(counted.history).toEqual(
      applyStateLegislatureTurnover(addDays(election.dueAt, -1), electionWorld)
        .history,
    );
    const term = stateLegislatureWakePlan(counted, packId, 2023).find(
      (p) => p.stage === "term" && p.electionDay === ballot.electionDay,
    )!;
    expect(term).toBeDefined();
    const termWorld = at(counted, term.dueAt);
    expect(dispatchStateLegislatureWake(termWorld, term).history).toEqual(
      applyStateLegislatureTurnover(addDays(term.dueAt, -1), termWorld).history,
    );
  });
  it("preserves late opening catch-up before scheduling future work", () => {
    const ballot = stateLegislatureWakePlan(original, packId, 2022).find(
      (p) => p.stage === "ballot",
    )!;
    const opened = at(original, addDays(ballot.dueAt, 1));
    const before = addDays(opened.currentDate, -1);
    const legacy = applyStateLegislatureTurnover(before, opened);
    const queued = prepareStateLegislatureQueue(opened, before, 2023);
    expect(queued.history.events).toEqual(legacy.history.events);
    expect(queued.history.decisionTraces).toEqual(
      legacy.history.decisionTraces,
    );
    expect(pending(queued).every((i) => i.dueAt > opened.currentDate)).toBe(
      true,
    );
  });
  it("distinguishes replaced source content with an unchanged ID and sequence", () => {
    const old = original.history.events.find(
      (e) => e.type === "world.state-legislature-opening",
    )!;
    const changed = {
      ...original,
      history: {
        ...original.history,
        events: original.history.events.map((e) =>
          e === old
            ? { ...e, summary: e.summary + " Revised source context." }
            : e,
        ),
      },
    };
    const revision = stateLegislatureQueueRevision(original, packId);
    expect(stateLegislatureQueueRevision(changed, packId)).not.toBe(revision);
    expect(
      stateLegislatureQueueRevision(
        deserializeWorld(serializeWorld(changed)),
        packId,
      ),
    ).toBe(stateLegislatureQueueRevision(changed, packId));
  });
  it("uses the canonical handler resolver and append-only resolved state", () => {
    const queued = reconcileStateLegislatureQueue(original, packId, 2022);
    const first = pending(queued)[0]!;
    const resolved = resolveFutureDueItemsThrough(
      queued,
      first.dueAt,
      STATE_LEGISLATURE_QUEUE_HANDLERS,
    );
    expect(
      futureDueItemStateAt(resolved, first.id, {
        asOfDate: resolved.currentDate,
        historySequenceExclusive: resolved.history.nextSequence,
      })?.status,
    ).toBe("resolved");
    expect(
      resolved.history.futureDueItems.slice(
        0,
        queued.history.futureDueItems.length,
      ),
    ).toEqual(queued.history.futureDueItems);
    expect(resolved.history.events.length).toBeGreaterThan(
      queued.history.events.length,
    );
  });
  it("rejects malformed saved identity and an off-date dispatch", () => {
    const queued = reconcileStateLegislatureQueue(original, packId, 2022),
      item = pending(queued)[0]!;
    expect(() =>
      readStateLegislatureSavedWake({
        ...item,
        stableKey: "fixture:wrong-key",
      }),
    ).toThrow();
    expect(() => stateLegislatureWakeHandler(queued, item)).toThrow(/due date/);
  });
  it("keeps filed-date plan parity across append, replacement, old reads and reload", () => {
    const seats = stateLegislativeSeats(original, packId);
    const seatKey = `${packId}|${seats[0]!.officeKey}|${seats[0]!.ordinal}`;
    const base = stateLegislatureWakePlan(original, packId, 2022);
    const template = original.history.events[0]!;
    const filed = recordWorldEvent(original, {
      ...template,
      stableKey: `${stateSlateKey(seatKey, 2022)}:primary`,
      type: "test.recorded-field",
      occurredAt: original.currentDate,
      recordedAt: original.currentDate,
      tags: [
        `seat:${seatKey}`,
        "primary-date:2022-05-17",
        "runoff-date:2022-06-07",
      ],
    });
    const plan = stateLegislatureWakePlan(filed, packId, 2022);
    for (const dueAt of ["2022-05-17", "2022-06-07"])
      expect(
        plan.some(
          (wake) => wake.stage === "nomination" && wake.dueAt === dueAt,
        ),
      ).toBe(true);
    expect(stateLegislatureWakePlan(original, packId, 2022)).toEqual(base);
    expect(
      stateLegislatureWakePlan(
        deserializeWorld(serializeWorld(filed)),
        packId,
        2022,
      ),
    ).toEqual(plan);
    const row = filed.history.events.at(-1)!;
    const replaced = {
      ...filed,
      history: {
        ...filed.history,
        events: filed.history.events.map((event) =>
          event === row
            ? {
                ...event,
                tags: [
                  `seat:${seatKey}`,
                  "primary-date:2022-05-18",
                  "runoff-date:2022-06-07",
                ],
              }
            : event,
        ),
      },
    };
    const replacement = stateLegislatureWakePlan(replaced, packId, 2022);
    expect(
      replacement.some(
        (wake) => wake.stage === "nomination" && wake.dueAt === "2022-05-18",
      ),
    ).toBe(true);
    expect(
      replacement.some(
        (wake) => wake.stage === "nomination" && wake.dueAt === "2022-05-17",
      ),
    ).toBe(false);
    expect(stateLegislatureWakePlan(filed, packId, 2022)).toEqual(plan);
    const unrelated = recordWorldEvent(filed, {
      ...template,
      stableKey: "test:irrelevant-field-key",
      type: "test.recorded-field",
      occurredAt: original.currentDate,
      recordedAt: original.currentDate,
      tags: [`seat:${seatKey}`, "primary-date:2022-05-19"],
    });
    expect(stateLegislatureWakePlan(unrelated, packId, 2022)).toEqual(plan);
  });
});
