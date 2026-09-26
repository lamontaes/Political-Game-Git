import { describe, expect, it } from "vitest";
import { proseDate } from "./prose-dates";
import { addDays } from "../simulation/dates";
import {
  assertWorldIntegrity,
  deserializeWorld,
  searchLifePlaces,
  serializeWorld,
} from "../simulation";
import { DEFAULT_NEW_GAME_SETUP } from "./new-game";
import {
  generateOpeningLife,
  generateOpeningLifeWithProgress,
  moveOpeningLife,
  prepareOpeningLife,
  projectOpeningLife,
  restoreOpeningLife,
} from "./opening-life";
import { seatedCongressChamber } from "../simulation/governing/congress-chambers";
import {
  congressIntakeHandler,
  CONGRESS_INTAKE_TRANSITION,
  applyCongressLawmaking,
} from "../simulation/governing/congress-lawmaking";
import {
  ensureOfficeholderPrinciples,
  OFFICEHOLDER_PRINCIPLES_VERSION,
} from "../simulation/governing/officeholder-principles";
import {
  establishOpeningOfficeholders,
  openingOfficeholders,
} from "./opening-officeholders";

const setup = { ...DEFAULT_NEW_GAME_SETUP, seed: "opening-proof" };
describe("OPENING-LIFE1 opening lifecycle", () => {
  it("prepares Congress principles in Begin and adds none at the first monthly intake", async () => {
    const columbus = searchLifePlaces("Columbus", 20, {
      stateJurisdictionKey: "US-OH",
      scope: "locality",
    }).find((place) => /\bColumbus\b/i.test(place.displayName));
    expect(columbus).toBeDefined();
    const progress: { label: string; completed: number; total: number }[] = [];
    const opened = await generateOpeningLifeWithProgress(
      prepareOpeningLife({
        ...DEFAULT_NEW_GAME_SETUP,
        seed: "timing-columbus-0925",
        placeKey: columbus!.key,
        startAge: 30,
      }),
      {
        onProgress: (step) => progress.push(step),
        yieldControl: async () => {},
      },
    );
    const world = opened.game!.world;
    const congressIds = ["house", "senate"].flatMap(
      (chamber) =>
        seatedCongressChamber(world, chamber)?.body.members.flatMap((member) =>
          member.personId ? [member.personId] : [],
        ) ?? [],
    );
    const memberIds = [...new Set(congressIds)];
    const principleProgress = progress.filter(
      (step) => step.label === "Preparing Congress principles",
    );
    expect(principleProgress.length).toBeGreaterThan(0);
    expect(principleProgress.at(-1)).toEqual({
      label: "Preparing Congress principles",
      completed: memberIds.length,
      total: memberIds.length,
    });

    const versionedRowsForCongress = (candidate: typeof world) =>
      candidate.history.principles.filter(
        (row) =>
          memberIds.includes(row.personId) &&
          row.stableKey.startsWith(`${OFFICEHOLDER_PRINCIPLES_VERSION}:`),
      );
    const before = versionedRowsForCongress(world);
    expect(before.length).toBeGreaterThan(3_500);
    expect(new Set(before.map((row) => row.stableKey)).size).toBe(
      before.length,
    );
    expect(
      versionedRowsForCongress(ensureOfficeholderPrinciples(world, memberIds)),
    ).toEqual(before);

    // The production Congress intake is due February 1 (Day 27 from this
    // setup's January 5 start) and must find every opening draw already held.
    const scheduled = applyCongressLawmaking(
      addDays(world.currentDate, -1),
      world,
    );
    const due = scheduled.history.futureDueItems.find(
      (item) => item.transitionKey === CONGRESS_INTAKE_TRANSITION,
    );
    expect(due?.dueAt).toBe(addDays(world.currentDate, 27));
    const handled = congressIntakeHandler(scheduled, due!);
    expect(versionedRowsForCongress(handled.world)).toEqual(before);
  }, 60_000);

  it.each([5, 7, 12, 17, 18, 34, 70])(
    "keeps generation and read paths separate at age %i",
    (startAge) => {
      const prepared = prepareOpeningLife({ ...setup, startAge });
      expect(prepared.game).toBeNull();
      const generated = generateOpeningLife(prepared);
      const { world, playerPersonId } = generated.game!;
      assertWorldIntegrity(world);
      const before = serializeWorld(world);
      expect(generateOpeningLife(generated)).toBe(generated);
      expect(establishOpeningOfficeholders(world, playerPersonId)).toBe(world);
      const view = projectOpeningLife(world, playerPersonId);
      expect(view.age).toBe(startAge);
      expect(view.name).toBeTruthy();
      // The identity line says the date the American way, never as ISO.
      expect(view.date).toBe(proseDate(world.currentDate));
      expect(view.date).toMatch(/^[A-Z][a-z]+ \d{1,2}, \d{4}$/);
      // President, Vice President, Chief Justice, and the home state's governor, whose opening
      // term is now dated by the office calendar.
      expect(view.officeholders).toHaveLength(4);
      expect(
        new Set(view.officeholders.map((holder) => holder.personId)).size,
      ).toBe(4);
      for (const holder of view.officeholders) {
        expect(world.people[holder.personId]).toBeDefined();
        expect(
          world.history.events.find((event) => event.id === holder.termId)
            ?.involvedEntityIds,
        ).toContain(holder.organizationId);
      }
      const skipped = moveOpeningLife(generated, "skip");
      expect(skipped.phase).toBe("play");
      const back = moveOpeningLife(skipped, "back");
      expect(back.phase).toBe("household");
      expect(back.game!.world).toBe(world);
      expect(serializeWorld(world)).toBe(before);
      const restored = restoreOpeningLife(back, deserializeWorld(before));
      expect(projectOpeningLife(restored.game!.world, playerPersonId)).toEqual(
        view,
      );
      expect(openingOfficeholders(restored.game!.world)).toEqual(
        view.officeholders,
      );
    },
  );
});
