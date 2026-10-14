/**
 * Estate and inheritance taxes as law series (the homelessness package, GOV
 * part): an estate pays the federal and its state's estate tax in force
 * above the exemption, each heir's share pays the state's inheritance tax by
 * their relation, every cent lands in a named treasury, and a bill that
 * changes the rate or exemption changes what the next estate pays.
 */
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import startingLaw from "./data/laws/starting-law.json" with { type: "json" };
import { buildBenchWorld } from "../bench/world";
import { gameStartDate } from "./game-start";
import { placeLocalities } from "./places";
import { coreAPI } from "./state";
import { advanceCore } from "./life";
import { addDays, makeIsoDate } from "./kernel/dates";
import { stancesOf } from "./modules/views";
import { settleEstate, heirsOf } from "./estates";
import { estateTaxes, inheritanceTax, scheduleTax } from "./laws-death-taxes";
import { shapedRate } from "./modules/legislature";
import type { LawRowInput } from "./laws-starting";

const seed =
  process.env.GOLDEN_PATH_SEED ??
  createHash("sha256").update(`death-taxes:${Date.now()}`).digest("hex");
const rows = (
  startingLaw as unknown as {
    jurisdictions: Record<string, (LawRowInput & { series: string })[]>;
  }
).jurisdictions;
const taxing = Object.keys(rows)
  .filter((k) =>
    rows[k]!.some(
      (r) => r.series === "estate-tax" || r.series === "inheritance-tax",
    ),
  )
  .filter((k) => k !== "US")
  .sort();
function pick<T>(list: readonly T[], salt: string): T {
  const hash = createHash("sha256").update(`${seed}:${salt}`).digest("hex");
  return list[parseInt(hash.slice(0, 8), 16) % list.length]!;
}

describe("estate and inheritance taxes", () => {
  it("tax the amount above the exemption, the rate sliding to the top", () => {
    // The federal tax: every dollar above $15 million at 40 percent.
    expect(
      scheduleTax(
        20_000_000_00,
        { exemption: 15_000_000, minRate: 40, slideOver: 0 },
        40,
      ),
    ).toBe(2_000_000_00);
    // Below the exemption, nothing.
    expect(
      scheduleTax(1_000_000_00, { exemption: 2_000_000, minRate: 0.8 }, 16),
    ).toBe(0);
    // Halfway up a slide from 10 to 20 percent, the average rate is 12.5.
    expect(
      scheduleTax(
        1_500_000_00,
        {
          exemption: 1_000_000,
          minRate: 10,
          maxRate: 20,
          slideOver: 1_000_000,
        },
        20,
      ),
    ).toBe(500_000 * 12.5);
  });

  it("a bill keeps the schedule, scaling its rates, and may set a new exemption", () => {
    const state = pick(taxing, "bill-state");
    const row = rows[state]!.find(
      (r) => r.series === "estate-tax" || r.series === "inheritance-tax",
    )!;
    const shaped = shapedRate(row, {
      kind: "law-amount",
      series: row.series,
      value: row.value! / 2,
      exemption: 9_000_000,
    })!;
    expect(shaped, state).not.toBeNull();
    expect(shaped.terms.exemption).toBe(9_000_000);
    const terms = row.terms as Record<string, unknown>;
    if (typeof terms.minRate === "number")
      expect(shaped.terms.minRate).toBeCloseTo(terms.minRate / 2, 3);
    else
      expect((shaped.terms.others as { minRate: number }).minRate).toBeCloseTo(
        (terms.others as { minRate: number }).minRate / 2,
        3,
      );
  });

  it("a played world's estate pays the taxes in force to named treasuries, every cent balanced, and the heirs learn which law took it", () => {
    const state = pick(taxing, "state");
    const places = [...placeLocalities(state)].sort((a, b) =>
      a.key.localeCompare(b.key),
    );
    const key = pick(places, "place").key;
    const where = `seed ${seed}, ${state} place ${key}`;
    // The played world: every module installed, the views engine included.
    const core = buildBenchWorld(seed, gameStartDate(), {
      twoLevel: true,
      placeKey: key,
    }).core;
    const api = coreAPI(core);
    const decedent = [...core.people.values()]
      // A decedent paid by an outside flow (a pension)
      // crashes the finance day after their death on main (reported to
      // OPUS-CORE on the PR); this test's subject is the taxes.
      .filter(
        (p) =>
          p.alive &&
          heirsOf(api, p).heirs.length &&
          !core.finance.incomeContractsByPerson.get(p.id)?.size,
      )
      .sort((a, b) => a.id.localeCompare(b.id))[0];
    expect(decedent, `${where}: no one with living kin`).toBeDefined();
    // An estate of $20 million, so every estate tax in force applies (an
    // edge case a played town rarely holds).
    api.updatePerson(decedent!.id, { liquidMinor: 20_000_000_00 });
    api.updatePerson(decedent!.id, { alive: false });
    settleEstate(api, decedent!.id, "event:death");
    // Probate runs its course; then the estate settles.
    advanceCore(
      core,
      addDays(makeIsoDate(core.date), api.parameter("probateDays") + 1),
    );
    const log = [...core.durableLog.values()];
    const settled = log.find(
      (e) =>
        e.kind === "estate.settled" && e.facts?.decedentId === decedent!.id,
    );
    expect(settled, `${where}: no settlement`).toBeDefined();
    const estate = Number(settled!.facts!.estateMinor);
    const paid = String(settled!.facts!.heirs)
      .split(" ")
      .map((row) => {
        const at = row.lastIndexOf("=");
        return {
          toId: row.slice(0, at),
          amountMinor: Number(row.slice(at + 1)),
        };
      });
    // Every cent went somewhere: the treasuries and the heirs.
    expect(
      paid.reduce((n, p) => n + p.amountMinor, 0),
      where,
    ).toBe(estate);
    expect(core.people.get(decedent!.id)!.liquidMinor).toBe(0);
    const toTreasuries = paid
      .filter((p) => p.toId.startsWith("organization:"))
      .reduce((n, p) => n + p.amountMinor, 0);
    const estateTax = estateTaxes(api, state, estate);
    expect(estateTax.map((t) => t.jurisdiction)).toContain("US");
    const learned = log.filter(
      (e) =>
        e.kind === "law.effect-learned" &&
        String(e.id).includes(`:${decedent!.id}:`),
    );
    // Each heir's inheritance tax is the law in force on their whole share.
    const relation = (id: string) =>
      decedent!.pastFacts
        ?.find(
          (f) => f.kind.startsWith("family:") && f.facts?.otherPersonId === id,
        )
        ?.kind.slice("family:".length) ?? "";
    let inheritance = 0;
    for (const e of learned.filter((e) => e.topic === "inheritance-tax")) {
      const heirId = e.personIds[0]!;
      const took = Number(e.facts!.amountMinor);
      const received = paid.find((p) => p.toId === heirId)?.amountMinor ?? 0;
      expect(
        inheritanceTax(api, state, relation(heirId), received + took)
          ?.amountMinor,
        `${where}: ${heirId}`,
      ).toBe(took);
      inheritance += took;
    }
    expect(toTreasuries, where).toBe(
      estateTax.reduce((n, t) => n + t.amountMinor, 0) + inheritance,
    );
    // Each heir read the estate's accounting, and holds a stance on each law
    // that took from their share, citing it.
    const heirs = paid.filter((p) => core.people.has(p.toId));
    expect(heirs.length, where).toBeGreaterThan(0);
    for (const heir of heirs) {
      if (!core.people.get(heir.toId)?.alive) continue;
      const stance = stancesOf(api, heir.toId).find(
        (st) => st.topic === "estate-tax",
      );
      expect(stance?.desiredChange, `${where}: ${heir.toId}`).toBe("repeal");
      expect(
        stance!.causes.some((c) =>
          c.learnedFrom?.startsWith("event:event:estate.accounting:"),
        ),
        `${where}: ${heir.toId} cites no accounting`,
      ).toBe(true);
    }
  }, 600_000);
});
