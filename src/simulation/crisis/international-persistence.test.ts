import { describe, expect, it } from "vitest";
import { createCampaignElectionTransitionRegistry } from "../campaigns";
import { createDemoWorld } from "../demo";
import { DEFAULT_NEW_GAME_SETUP } from "../../presentation/new-game";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../../presentation/opening-life";
import type { Person, World } from "../types";
import { advanceWorld, createWorld } from "../world";
import {
  PROVISIONAL_INTERNATIONAL_POLICY,
  crisisRecords,
  currentPresidentOf,
  declareInternationalCrisis,
  internationalCrisisState,
} from "./index";

/**
 * CRUNCH47 C2: the old three-cycle limit is a computational checkpoint, not a
 * forced ending. A crisis persists until something is actually recorded — a
 * settlement, a withdrawal, an escalation or a lapse.
 */
const LONG = 900_000;

function crisisIn(world: World, stableKey: string) {
  const next = declareInternationalCrisis(world, {
    stableKey,
    counterpartyLabel: "a foreign government",
    allyLabels: ["treaty allies"],
    subject: "access to a disputed shipping lane",
    tension: "elevated",
    basis: "Declared for the persistence proof; fictional counterparty.",
  });
  const crisisId = crisisRecords(next)
    .filter((record) => record.kind === "international-crisis")
    .at(-1)!.id;
  return { world: next, crisisId };
}

function demoWorld(seed: string): World {
  const demo = createDemoWorld(seed);
  return createWorld({
    seed,
    currentDate: demo.currentDate,
    jurisdictions: demo.jurisdictionOrder.map((id) => demo.jurisdictions[id]!),
    people: demo.personOrder.map((id) => demo.people[id] as Person),
  });
}

describe("an international crisis persists until something resolves it", () => {
  it(
    "passes its cycle checkpoint without ending",
    () => {
      // A seed whose counterparty neither steps back nor is answered away.
      const started = crisisIn(demoWorld("c2-persistence-0"), "c2:persistence");
      const later = advanceWorld(
        started.world,
        240,
        createCampaignElectionTransitionRegistry(),
      );
      const midway = internationalCrisisState(later, started.crisisId);
      expect(midway.cycle).toBeGreaterThanOrEqual(
        PROVISIONAL_INTERNATIONAL_POLICY.maxCycles,
      );
      // The old behaviour ended it at the cap. It is still running.
      expect(midway.ended).toBe(false);
      expect(
        later.history.futureDueItems.some(
          (item) =>
            item.entityIds.includes(started.crisisId) &&
            item.stableKey.includes(":cycle:"),
        ),
      ).toBe(true);
      // Nothing is deleted: the course of the dispute is all still recorded.
      const records = crisisRecords(later).filter(
        (record) =>
          (record as unknown as { crisisId?: string }).crisisId ===
          started.crisisId,
      );
      expect(records.length).toBeGreaterThan(4);
      console.info(
        JSON.stringify({
          cyclesAt240Days: midway.cycle,
          crisisRecords: records.length,
          stillRunning: !midway.ended,
        }),
      );
    },
    LONG,
  );

  it(
    "a demand the President never answers lapses on a record, not on a timer",
    () => {
      const opening = generateOpeningLife(
        prepareOpeningLife({
          ...DEFAULT_NEW_GAME_SETUP,
          seed: "c2-lapse",
          startAge: 34,
          depth: "summarize-earlier-life",
        }),
      ).game!.world;
      const president = currentPresidentOf(opening)!;
      // The office is the played person's, so the decision waits for somebody
      // who never answers it.
      const played: World = {
        ...opening,
        control: { kind: "person", personId: president.personId },
      };
      const started = crisisIn(played, "c2:persistence:lapse");
      const registry = createCampaignElectionTransitionRegistry();
      const waiting = advanceWorld(started.world, 90, registry);
      const pending = internationalCrisisState(waiting, started.crisisId);
      expect(pending.ended).toBe(false);
      expect(pending.decisions).toHaveLength(0);

      const quiet = advanceWorld(
        waiting,
        PROVISIONAL_INTERNATIONAL_POLICY.lapseAfterQuietDays + 30,
        registry,
      );
      expect(internationalCrisisState(quiet, started.crisisId).ended).toBe(
        true,
      );
      const lapsed = quiet.history.events.filter((event) =>
        event.tags.includes("resolution:lapsed"),
      );
      expect(lapsed).toHaveLength(1);
      expect(lapsed[0]!.summary).toContain("lapsed without a settlement");
    },
    LONG,
  );
});
