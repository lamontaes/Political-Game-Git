import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { advanceCore } from "./life";
import { coreAPI } from "./state";
import { gameStartDate } from "./game-start";
import { reviewSeparations, separatedOf } from "./modules/partnerships";
import { drawPlace } from "../../tests/golden-path/place";

const seed =
  process.env.GOLDEN_PATH_SEED ??
  `partnership-ends:${Date.now()}:${Math.random().toString(16).slice(2)}`;

// A partnership ends from stress and lost closeness; the one who can afford a home leaves.
// Real couples part rarely, so the test puts a couple under the strain that wears one
// down (their resting stress) and runs the review.
it(`stressed partners separate and one leaves for a home of their own (seed ${seed})`, () => {
  const tried: string[] = [];
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const place = drawPlace(`${seed}:${attempt}`, "partnership-ends");
    tried.push(place.name);
    const { core } = buildBenchWorld(seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(core);
    advanceCore(
      core,
      new Date(Date.parse(`${core.date}T00:00:00Z`) + 2 * 86_400_000)
        .toISOString()
        .slice(0, 10),
    );
    const links = [...core.familyLinks.values()]
      .filter((row) => row.kind === "partner")
      .sort((x, y) => x.id.localeCompare(y.id));
    for (const link of links) {
      const people = link.personIds.map((id) => core.people.get(id)!);
      for (const person of people) {
        if (!person.alive) break;
        person.affect = { ...person.affect, stress: 1, stressBaseline: 1 };
      }
    }
    reviewSeparations(api);
    const row = separatedOf(api)[0];
    if (!row) continue;
    const leaver = core.people.get(row.leaverId)!;
    const stayer = core.people.get(
      row.personIds.find((id) => id !== row.leaverId)!,
    )!;
    // The link is gone and both records say so.
    expect(
      [...core.familyLinks.values()].some(
        (link) =>
          link.kind === "partner" &&
          link.personIds.includes(leaver.id) &&
          link.personIds.includes(stayer.id),
      ),
      row.id,
    ).toBe(false);
    for (const person of [leaver, stayer])
      expect(
        person.pastFacts?.some((fact) => fact.kind === "family:former-partner"),
      ).toBe(true);
    // The leaver has a household of their own and the lease it recorded.
    expect(leaver.householdId).toBe(row.householdId);
    expect(stayer.householdId).toBe(row.fromHouseholdId);
    expect(core.households.get(row.fromHouseholdId)!.memberIds).not.toContain(
      leaver.id,
    );
    const lease = core.finance.contracts.get(row.leaseId!);
    expect(lease?.amountMinor).toBe(row.rentMinor);
    expect(lease?.payerIds).toEqual([leaver.id]);
    // Why: each weighed it, with what held them as well.
    for (const id of row.personIds)
      expect(Object.keys(row.reasons[id]!)).toEqual(
        expect.arrayContaining(["baseline", "strain", "drift", "own"]),
      );
    expect(Object.keys(row.reasons.holds!)).toEqual(
      expect.arrayContaining(["children", "home"]),
    );
    return;
  }
  throw new Error(`no one separated in ${tried.join(", ")} (seed ${seed})`);
}, 1_800_000);
