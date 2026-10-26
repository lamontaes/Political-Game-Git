import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { gameStartDate } from "./game-start";
import { advanceCore, createLifeCore } from "./life";
import {
  countedDemotions,
  demoteHousehold,
  demotionDays,
} from "./modules/counted-demotion";
import {
  claimRetirementNow,
  retirementClaims,
} from "./modules/retirement-claims";
import { residentPerson, residentsRuntime } from "./modules/residents";
import { countedMoves } from "./modules/counted-moves";
import { coreAPI, fillInPerson, personOrFillIn } from "./state";
import { isDemoted } from "./counted-groups";
import { generatedOpening } from "./tooling/generated-world";
import { corePlaceByKey } from "./place-lookup";
import type { CoreState } from "./types";

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
    const rt = residentsRuntime(core)!;
    const player = core.playerId ? core.people.get(core.playerId) : undefined;
    const circle = new Set([
      ...(player?.familyIds ?? []),
      ...(player?.knownIds ?? []),
    ]);
    // A counted household nobody in the player's circle belongs to.
    const record = [...rt.households.values()].find((row) =>
      row.people.every((p) => !circle.has(p.id)),
    )!;
    const ids = record.people.map((p) => p.id);
    const householdId = record.household.id;
    const start = total(core);
    fillInPerson(core, ids[0]!);
    expect(ids.every((id) => core.people.has(id))).toBe(true);
    expect(residentPerson(core, ids[0]!)).toBeUndefined();
    // Out of the player's life past the world's 180 to 240 days; the review
    // is monthly.
    const demotion = () =>
      countedDemotions(coreAPI(core)).find(
        (row) => row.householdId === householdId,
      );
    for (let day = 1; day <= 300 && !demotion(); day++)
      advanceCore(core, after(day));
    const demoted = demotion();
    expect(demoted, `${place.name}: ${householdId}`).toBeDefined();
    // Their records stay, on the inactive tier, at the place's counted tier,
    // and the counts hold them again under their own ids, on the day they
    // return (as counted, the household can move away later: counted-moves.ts).
    for (const id of ids) {
      const person = core.people.get(id)!;
      expect(person.tier).toBe("husk");
      expect(isDemoted(person)).toBe(true);
      expect(residentPerson(core, id)?.id).toBe(id);
    }
    // Their money went to their group's account, and a last paycheck reaching
    // them after it goes on at the next review; no dollar was lost.
    advanceCore(core, after(300));
    for (const id of ids)
      expect(core.people.get(id)!.liquidMinor, `${place.name}: ${id}`).toBe(0);
    expect(total(core)).toBe(start);
    const left = countedMoves(coreAPI(core)).find(
      (row) =>
        row.householdId === householdId &&
        row.direction === "out" &&
        row.date >= demoted!.date,
    );
    if (left) {
      // Moved out of town while counted: meeting one finds the record they
      // left with, still returned to the counts.
      console.log(`${place.name}: ${householdId} moved away, ${left.id}`);
      const record = personOrFillIn(core, ids[0]!)!;
      expect(record.id).toBe(ids[0]);
      expect(isDemoted(record)).toBe(true);
    } else {
      // Meeting one again brings the same people back.
      const back = personOrFillIn(core, ids[0]!)!;
      expect(back.id).toBe(ids[0]);
      expect(isDemoted(back)).toBe(false);
      expect(back.placeId).toBe(record.household.placeId);
      expect(residentPerson(core, ids[0]!)).toBeUndefined();
    }
    advanceCore(core, after(330));
    expect(total(core)).toBe(start);
  }, 600_000);
});

describe(`a filled-in household that moved away from the counted places (seed ${seed})`, () => {
  it("stays filled in where it lives, since no counts are kept there, and the year goes on", () => {
    const core = createLifeCore(
      generatedOpening(place, {
        twoLevel: true,
        settings: { population: 1500 },
      }),
    );
    const rt = residentsRuntime(core)!;
    const kept = new Set(rt.input.accounts.map((row) => row.placeId));
    const player = core.playerId ? core.people.get(core.playerId) : undefined;
    const circle = new Set([
      ...(player?.familyIds ?? []),
      ...(player?.knownIds ?? []),
    ]);
    // A counted household with no job to keep it in town, out of the
    // player's circle.
    const record = [...rt.households.values()]
      .filter(
        (row) =>
          row.people.length > 0 &&
          !row.jobs.length &&
          row.people.every((p) => !circle.has(p.id)),
      )
      .sort((a, b) => a.household.id.localeCompare(b.household.id))[0];
    expect(
      record,
      `${place.name}: a counted household without a job`,
    ).toBeDefined();
    const first = record!.people[0]!.id;
    fillInPerson(core, first);
    const home = core.people.get(first)!.householdId;
    // Its people on a tier the days run, as the Brandsville, Missouri
    // household was that doubled up with a relative in another town after an
    // eviction (housing-homeless.ts) and stopped the year when the review
    // returned it to counts not kept there.
    for (const id of core.households.get(home)!.memberIds)
      coreAPI(core).updatePerson(id, { tier: "weekly" });
    const members = core.households.get(home)!.memberIds;
    // It moves away the way the moves engine moves a household
    // (modules/moves.ts), to a place the counts do not keep.
    const away = corePlaceByKey(place.key)!.stateJurisdictionKey;
    expect(kept.has(away)).toBe(false);
    coreAPI(core).relocatePeopleV1({
      personIds: members,
      placeId: away,
      householdId: home,
      source: {
        tag: "ESTIMATED",
        asOf: core.date,
        citation: "Test: a household that moved out of town.",
      },
    });
    const where = `${place.name}: ${home} moved to ${away}`;
    // Past the world's 180 to 240 days, through every monthly review.
    advanceCore(core, after(300));
    expect(
      countedDemotions(coreAPI(core)).filter((row) => row.householdId === home),
      where,
    ).toEqual([]);
    for (const id of members)
      expect(isDemoted(core.people.get(id)!), `${where}: ${id}`).toBe(false);
  }, 1_800_000);
});

describe(`a retiree's award when their household returns to the counts in ${place.name} (seed ${seed})`, () => {
  it("is paid into the residents' income while they are counted, claimed before or after, and to them again once met", () => {
    const core = createLifeCore(
      generatedOpening(place, {
        twoLevel: true,
        settings: { population: 1500 },
      }),
    );
    const api = coreAPI(core);
    const rt = residentsRuntime(core)!;
    const player = core.playerId ? core.people.get(core.playerId) : undefined;
    const circle = new Set([
      ...(player?.familyIds ?? []),
      ...(player?.knownIds ?? []),
    ]);
    // The oldest member of each counted household out of the player's
    // circle with someone past the earliest claim age.
    const elders = [...rt.households.values()]
      .filter((row) => row.people.every((p) => !circle.has(p.id)))
      .map((row) => ({
        householdId: row.household.id,
        placeId: row.household.placeId,
        id: row.people
          .slice()
          .sort((a, b) => a.birthDate.localeCompare(b.birthDate))[0]?.id,
        born: row.people.map((p) => p.birthDate).sort()[0] ?? "",
      }))
      .filter((row) => row.id && row.born <= "1955-12-31")
      .sort((a, b) => a.householdId.localeCompare(b.householdId));
    const residentsOf = (placeId: string) =>
      rt.input.accounts.find((row) => row.placeId === placeId)!.accountId;
    const start = total(core);
    const where = `${place.name} (seed ${seed})`;
    // One claims while filled in, then the household returns to the counts.
    let first: (typeof elders)[number] | undefined;
    let second: (typeof elders)[number] | undefined;
    for (const row of elders) {
      if (first && second) break;
      fillInPerson(core, row.id!);
      if (!first) {
        if (!claimRetirementNow(api, row.id!)) continue;
        expect(retirementClaims(core).get(row.id!)?.counted).toBe(false);
        demoteHousehold(api, row.householdId, core.date);
        first = row;
        continue;
      }
      // The other's household returns first, and they claim from the counts.
      demoteHousehold(api, row.householdId, core.date);
      if (claimRetirementNow(api, row.id!)) second = row;
    }
    expect(first, `${where}: a filled-in elder who claims`).toBeDefined();
    expect(second, `${where}: a returned elder who claims`).toBeDefined();
    const accounts = api.accounts();
    const own = `retirement-claim:${first!.id}`;
    expect(accounts.obligation(own)?.endedAt).toBe(core.date);
    for (const row of [first!, second!]) {
      const claim = retirementClaims(core).get(row.id!)!;
      expect(claim.counted, `${where}: ${row.id}`).toBe(true);
      const flow = rt.flows.get(claim.obligationId);
      expect(flow?.payeeId, `${where}: ${claim.obligationId}`).toBe(
        residentsOf(row.placeId),
      );
    }
    expect(
      accounts.obligation(`retirement-claim:${second!.id}`),
    ).toBeUndefined();
    const stopped = accounts.obligation(own)!.paidMinor;
    advanceCore(core, after(40));
    // Paid to the residents' income, never to the returned people.
    expect(accounts.obligation(own)!.paidMinor).toBe(stopped);
    for (const row of [first!, second!]) {
      const claim = retirementClaims(core).get(row.id!)!;
      expect(rt.flows.get(claim.obligationId)!.lastPaidMinor).toBe(
        claim.monthlyMinor,
      );
    }
    expect(total(core)).toBe(start);
    // Met again, the first is paid their own award from then on.
    personOrFillIn(core, first!.id!);
    advanceCore(core, after(41));
    const moved = retirementClaims(core).get(first!.id!)!;
    expect(moved.counted).toBe(false);
    advanceCore(core, after(75));
    expect(accounts.obligation(moved.obligationId)!.paidMinor).toBe(
      moved.monthlyMinor,
    );
    expect(total(core)).toBe(start);
  }, 600_000);
});
