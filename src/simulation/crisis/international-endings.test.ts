import { describe, expect, it } from "vitest";
import { createCampaignElectionTransitionRegistry } from "../campaigns";
import { addDays } from "../dates";
import { DEFAULT_NEW_GAME_SETUP } from "../../presentation/new-game";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../../presentation/opening-life";
import type { EntityId, World } from "../types";
import { advanceWorld, assertWorldIntegrity } from "../world";
import {
  PROVISIONAL_INTERNATIONAL_POLICY,
  crisisRecords,
  currentPresidentOf,
  declareInternationalCrisis,
  internationalCrisisState,
} from "./index";

/**
 * CRUNCH47 Q47-005, the broader world test: a dispute in an ordinary world
 * never ends quietly. Whatever ends it leaves a record saying so, and the
 * record trail of how it got there is never removed.
 *
 * This is deliberately an invariant over a world that was simply played
 * forward, not a scripted path: it is meant to catch an ending that arrives
 * from some producer nobody thought about.
 */
const LONG = 900_000;

function openedLife(seed: string) {
  return generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      seed,
      startAge: 34,
      depth: "summarize-earlier-life",
    }),
  ).game!;
}

/** The current status of a due item; presence in history is not "pending". */
function latestStatus(world: World, dueItemId: EntityId) {
  return (
    world.history.futureDueItemStates
      .filter((record) => record.dueItemId === dueItemId)
      .sort((left, right) => left.sequence - right.sequence)
      .at(-1)?.status ?? "scheduled"
  );
}

function crisisDueItems(world: World, crisisId: EntityId) {
  return world.history.futureDueItems
    .filter((item) => item.entityIds.includes(crisisId))
    .map((item) => ({ item, status: latestStatus(world, item.id) }));
}

function endingEvidence(world: World, crisisId: EntityId) {
  const own = crisisRecords(world).filter(
    (record) =>
      (record as unknown as { crisisId?: string }).crisisId === crisisId,
  );
  const responses = own.filter(
    (record) => record.kind === "counterparty-response",
  );
  const warPowers = own.filter((record) => record.kind === "war-powers");
  return {
    records: own.length,
    kinds: own.map((record) => record.kind),
    endingResponses: responses.filter(
      (record) => (record as unknown as { ended?: boolean }).ended === true,
    ),
    withdrawn: warPowers.filter(
      (record) =>
        (record as unknown as { stage?: string }).stage === "forces-withdrawn",
    ),
  };
}

describe("an international dispute ends only on a record that says how", () => {
  it(
    "every ended dispute in a played-forward world names its ending",
    () => {
      const life = openedLife("q47-005-broader");
      const president = currentPresidentOf(life.world)!;
      // The office belongs to somebody who is not the player, so the world
      // answers its own disputes rather than waiting on a human.
      const started = declareInternationalCrisis(life.world, {
        stableKey: "q47-005:broader",
        counterpartyLabel: "a foreign government",
        allyLabels: ["treaty allies"],
        subject: "access to a disputed shipping lane",
        tension: "elevated",
        basis: "Declared for the Q47-005 broader-world proof; fictional.",
      });
      const crisisId = crisisRecords(started)
        .filter((record) => record.kind === "international-crisis")
        .at(-1)!.id;
      expect(president.personId).toBeTruthy();

      const registry = createCampaignElectionTransitionRegistry();
      // Well past both the cycle checkpoint and the quiet-lapse window, so a
      // dispute that is going to end has had every chance to.
      const played = advanceWorld(
        started,
        PROVISIONAL_INTERNATIONAL_POLICY.lapseAfterQuietDays + 120,
        registry,
      );
      assertWorldIntegrity(played);

      const state = internationalCrisisState(played, crisisId);
      const evidence = endingEvidence(played, crisisId);
      const due = crisisDueItems(played, crisisId);
      // Report what this seed actually did before asserting anything about it.
      console.info(
        JSON.stringify({
          days: PROVISIONAL_INTERNATIONAL_POLICY.lapseAfterQuietDays + 120,
          ended: state.ended,
          cycle: state.cycle,
          decisions: state.decisions.length,
          responses: state.responses.length,
          recordKinds: evidence.kinds,
          endingResponses: evidence.endingResponses.length,
          forcesWithdrawn: evidence.withdrawn.length,
          due: due.map((entry) => entry.status),
        }),
      );

      // However it went, the course of it is still readable: the world looked
      // at it, chose, and recorded what came back.
      expect(evidence.kinds).toContain("crisis-options");
      expect(evidence.kinds).toContain("counterparty-response");
      if (state.ended) {
        // An ending is a record, not the absence of further activity.
        expect(evidence.endingResponses.length).toBeGreaterThan(0);
        const events = played.history.events.filter((event) =>
          event.involvedEntityIds.includes(crisisId),
        );
        expect(
          events.some((event) =>
            event.tags.some(
              (tag) =>
                tag === "resolution:lapsed" ||
                tag.startsWith("counterparty:") ||
                tag.startsWith("option:"),
            ),
          ),
        ).toBe(true);
        // Nothing is left waiting on a dispute that is over.
        expect(due.every((entry) => entry.status !== "scheduled")).toBe(true);
      } else {
        // Still running means something is still actually scheduled — not
        // merely that a resolved due item is still in history.
        expect(due.some((entry) => entry.status === "scheduled")).toBe(true);
      }
    },
    LONG,
  );

  it(
    "forces that were introduced are never left in place by an ending",
    () => {
      const life = openedLife("q47-005-forces");
      const started = declareInternationalCrisis(life.world, {
        stableKey: "q47-005:forces",
        counterpartyLabel: "a foreign government",
        allyLabels: ["treaty allies"],
        subject: "a contested border crossing",
        tension: "severe",
        basis: "Declared for the Q47-005 withdrawal proof; fictional.",
      });
      const crisisId = crisisRecords(started)
        .filter((record) => record.kind === "international-crisis")
        .at(-1)!.id;
      const played = advanceWorld(
        started,
        PROVISIONAL_INTERNATIONAL_POLICY.lapseAfterQuietDays + 120,
        createCampaignElectionTransitionRegistry(),
      );
      const state = internationalCrisisState(played, crisisId);
      // The invariant: an ended dispute never leaves forces deployed. If they
      // went in, a withdrawal record took them out.
      if (state.ended) expect(state.forcesIn).toBe(false);
      const evidence = endingEvidence(played, crisisId);
      const introduced = crisisRecords(played).filter(
        (record) =>
          record.kind === "war-powers" &&
          (record as unknown as { crisisId?: string }).crisisId === crisisId &&
          (record as unknown as { stage?: string }).stage ===
            "forces-introduced",
      );
      if (state.ended && introduced.length > 0)
        expect(evidence.withdrawn.length).toBeGreaterThan(0);
      console.info(
        JSON.stringify({
          ended: state.ended,
          forcesIn: state.forcesIn,
          introduced: introduced.length,
          withdrawn: evidence.withdrawn.length,
        }),
      );
    },
    LONG,
  );

  it("a dispute declared today is scheduled, not resolved on the spot", () => {
    const life = openedLife("q47-005-scheduled");
    const started = declareInternationalCrisis(life.world, {
      stableKey: "q47-005:scheduled",
      counterpartyLabel: "a foreign government",
      allyLabels: [],
      subject: "an expiring fisheries agreement",
      tension: "low",
      basis: "Declared for the Q47-005 scheduling proof; fictional.",
    });
    const crisisId = crisisRecords(started)
      .filter((record) => record.kind === "international-crisis")
      .at(-1)!.id;
    const state = internationalCrisisState(started, crisisId);
    expect(state.ended).toBe(false);
    const due = crisisDueItems(started, crisisId);
    expect(due.length).toBeGreaterThan(0);
    for (const entry of due) {
      // Declaring a dispute schedules it for a later day and says so; it does
      // not resolve anything on the spot.
      expect(entry.item.dueAt > started.currentDate).toBe(true);
      expect(entry.item.dueAt >= addDays(started.currentDate, 1)).toBe(true);
      expect(entry.status).toBe("scheduled");
    }
  });
});
