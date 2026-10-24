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
import { coreAPI, registerModule } from "./state";
import type { CoreEventInput } from "./types";
import { advanceCore } from "./life";
import { addDays, makeIsoDate } from "./kernel/dates";
import { stancesOf } from "./modules/views";
import { settleEstate, heirsOf } from "./estates";
import { estateTaxes, inheritanceTax, scheduleTax } from "./laws-death-taxes";
import { shapedRate } from "./modules/legislature";
import { enactLaw } from "./modules/laws";
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

  it("a state that adopts a death tax by setting only a rate taxes the whole amount at that rate", () => {
    const states = Object.keys(rows)
      .filter(
        (k) =>
          /^US-[A-Z]{2}$/.test(k) &&
          !taxing.includes(k) &&
          placeLocalities(k).length > 0,
      )
      .sort();
    const state = pick(states, "adopting-state");
    const key = pick(
      [...placeLocalities(state)].sort((a, b) => a.key.localeCompare(b.key)),
      "adopting-place",
    ).key;
    const where = `seed ${seed}, ${state} place ${key}`;
    const core = buildBenchWorld(seed, gameStartDate(), {
      twoLevel: true,
      placeKey: key,
    }).core;
    const api = coreAPI(core);
    expect(inheritanceTax(api, state, "sibling", 100_000_00), where).toBeNull();
    for (const series of ["inheritance-tax", "estate-tax"])
      enactLaw(api, {
        jurisdiction: state,
        level: "state",
        series,
        value: 5,
        effectiveDate: core.date,
        measureId: `test:adopt-${series}`,
        citation: "A bill that sets only a rate",
      });
    // Five percent of a $100,000 share, in cents, with no exemption.
    expect(
      inheritanceTax(api, state, "sibling", 100_000_00)?.amountMinor,
      where,
    ).toBe(5_000_00);
    expect(
      estateTaxes(api, state, 100_000_00).find((t) => t.jurisdiction === state)
        ?.amountMinor,
      where,
    ).toBe(5_000_00);
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
    // The settlement and the heirs' notices, as they happen (the durable log
    // keeps only what the player could see).
    const heard: CoreEventInput[] = [];
    registerModule(core, {
      id: "test:estate-reader",
      eventKinds: ["estate.settled", "law.effect-learned"],
      onEvent: (_api, event) => {
        heard.push(event);
      },
    });
    api.updatePerson(decedent!.id, { liquidMinor: 20_000_000_00 });
    api.updatePerson(decedent!.id, { alive: false });
    settleEstate(api, decedent!.id, "event:death");
    // Probate runs its course; then the estate settles.
    advanceCore(
      core,
      addDays(makeIsoDate(core.date), api.parameter("probateDays") + 1),
    );
    const log = heard;
    // A wealthy estate may pass in two settlements: the living trust's at
    // death and probate's after; the taxes are figured on the whole.
    const settlements = log.filter(
      (e) =>
        e.kind === "estate.settled" && e.facts?.decedentId === decedent!.id,
    );
    expect(settlements.length, `${where}: no settlement`).toBeGreaterThan(0);
    // A $20 million estate sits well past the trust midpoint: part of it
    // passed by the decedent's living trust, at death, outside probate.
    expect(
      settlements.some((e) => e.facts!.by === "trust"),
      `${where}: no trust settlement`,
    ).toBe(true);
    const estate = settlements.reduce(
      (n, e) => n + Number(e.facts!.estateMinor),
      0,
    );
    const paidRows = settlements.flatMap((e) =>
      String(e.facts!.heirs)
        .split(" ")
        .map((row) => {
          const at = row.lastIndexOf("=");
          return {
            toId: row.slice(0, at),
            amountMinor: Number(row.slice(at + 1)),
          };
        }),
    );
    // One row per payee: the sum of what each received across settlements.
    const paid = [
      ...paidRows
        .reduce(
          (m, row) => m.set(row.toId, (m.get(row.toId) ?? 0) + row.amountMinor),
          new Map<string, number>(),
        )
        .entries(),
    ].map(([toId, amountMinor]) => ({ toId, amountMinor }));
    // Every cent went somewhere: the treasuries and the heirs.
    expect(
      paid.reduce((n, p) => n + p.amountMinor, 0),
      where,
    ).toBe(estate);
    expect(core.people.get(decedent!.id)!.liquidMinor).toBe(0);
    const toTreasuries = paid
      .filter((p) => p.toId.startsWith("organization:"))
      .reduce((n, p) => n + p.amountMinor, 0);
    // The estate tax is figured on the whole estate as it stood at death.
    const estateTax = estateTaxes(
      api,
      state,
      Number(settlements[0]!.facts!.baseMinor),
    );
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
    // What each heir was taxed, across the trust's and probate's settlements.
    const tookBy = new Map<string, number>();
    for (const e of learned.filter((e) => e.topic === "inheritance-tax"))
      tookBy.set(
        e.personIds[0]!,
        (tookBy.get(e.personIds[0]!) ?? 0) + Number(e.facts!.amountMinor),
      );
    for (const [heirId, took] of tookBy) {
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
