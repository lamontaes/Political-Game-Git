import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { gameStartDate } from "./game-start";
import { advanceCore, createLifeCore } from "./life";
import { countedDemotions, demotionDays } from "./modules/counted-demotion";
import { residentPerson } from "./modules/residents";
import { coreAPI, fillInPerson, personOrFillIn } from "./state";
import { isDemoted } from "./counted-groups";
import { generatedOpening } from "./tooling/generated-world";
import type { CoreState } from "./types";
import { countedRecords } from "./tooling/counted-records";

const after = (days: number) => {
  const at = new Date(`${gameStartDate()}T00:00:00Z`);
  at.setUTCDate(at.getUTCDate() + days);
  return at.toISOString().slice(0, 10);
};

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(16).toString("hex");
const place = drawPlace(seed, "core2-counted-demotion");

/** Every dollar the world holds, plus what has gone outside (net). */
const total = (core: CoreState) =>
  [...core.people.values(), ...core.organizations.values()].reduce(
    (n, row) => n + row.liquidMinor,
    0,
  ) +
  [...core.cashJournal.externalFlowsByOwner.values()].reduce(
    (n, row) => n + row.netMinor,
    0,
  );

describe("the wait before a met person drifts back", () => {
  it("is drawn per world within 180 to 240 days, the same for one seed, and varies across worlds", () => {
    const days = Array.from({ length: 200 }, (_, i) => demotionDays(`w${i}`));
    expect(Math.min(...days)).toBeGreaterThanOrEqual(180);
    expect(Math.max(...days)).toBeLessThanOrEqual(240);
    expect(new Set(days).size).toBeGreaterThan(30);
    expect(demotionDays("w7")).toBe(demotionDays("w7"));
  });
});

describe(`a filled-in household returns to the counts in ${place.name} (seed ${seed})`, () => {
  it("demotes it after a long while out of the player's life, keeps its money and jobs, and brings the same people back", () => {
    const core = createLifeCore(
      generatedOpening(place, {
        twoLevel: true,
        settings: { population: 1500 },
      }),
    );
    const player = core.playerId ? core.people.get(core.playerId) : undefined;
    const circle = new Set([
      ...(player?.familyIds ?? []),
      ...(player?.knownIds ?? []),
    ]);
    // A counted household nobody in the player's circle belongs to.
    const record = [...countedRecords(core).values()].find((row) =>
      row.people.every((p) => !circle.has(p.id)),
    )!;
    const ids = record.people.map((p) => p.id);
    const householdId = record.household.id;
    const start = total(core);
    fillInPerson(core, ids[0]!);
    expect(ids.every((id) => core.people.has(id))).toBe(true);
    expect(residentPerson(core, ids[0]!)).toBeUndefined();
    // Out of the player's life past the world's 180 to 240 days; the review is monthly and a
    // last paycheck reaching them after it goes on at the next review.
    advanceCore(core, after(300));
    const demoted = countedDemotions(coreAPI(core)).find(
      (row) => row.householdId === householdId,
    );
    expect(demoted).toBeDefined();
    // Their records stay, on the inactive tier, at the place's counted tier,
    // and the counts hold them again under their own ids.
    for (const id of ids) {
      const person = core.people.get(id)!;
      expect(person.tier).toBe("husk");
      expect(isDemoted(person)).toBe(true);
      expect(residentPerson(core, id)?.id).toBe(id);
    }
    // Their money went to their group's account; no dollar was lost.
    for (const id of ids) expect(core.people.get(id)!.liquidMinor).toBe(0);
    expect(total(core)).toBe(start);
    // Meeting one again brings the same people back.
    const back = personOrFillIn(core, ids[0]!)!;
    expect(back.id).toBe(ids[0]);
    expect(isDemoted(back)).toBe(false);
    expect(back.placeId).toBe(record.household.placeId);
    expect(residentPerson(core, ids[0]!)).toBeUndefined();
    advanceCore(core, after(330));
    expect(total(core)).toBe(start);
  }, 600_000);
});
