/** U2's first reader: a different state's local tax cannot become ours. */
import { randomBytes } from "node:crypto";
import { writeFileSync } from "node:fs";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { appliedOn } from "./law-reach/applied";
import { inTownChain, resolveLawInForce } from "./laws-in-force";
import { lawChainForPlace, type LawRowInput } from "./laws-starting";
import { advanceCore } from "./life";
import { lawChain, lawInForce } from "./modules/laws";
import { purchaseTaxes } from "./modules/purchase-tax";
import { placeStateKeys } from "./places";
import { coreAPI } from "./state";

const replay = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const place = drawPlace(replay, "in-town-chain");
const where = `${place.name} (${place.key}), replay ${replay}`;

it(`another jurisdiction's average or pending phase cannot enter the chain: ${where}`, () => {
  const chain = lawChainForPlace(place.key);
  const outside = placeStateKeys().find((key) => key !== chain.stateKey)!;
  for (const level of chain.levels)
    expect(inTownChain(chain, level.jurisdiction)).toBe(true);
  expect(inTownChain(chain, outside)).toBe(false);
  expect(inTownChain(chain, chain.townPlaceId)).toBe(false);
  // Adversarial inputs to the pure resolver, never inserted into a world.
  const own: LawRowInput = {
    id: "test:own-average",
    jurisdiction: chain.stateKey,
    level: "state",
    series: "local-sales-tax-average",
    tier: "general",
    value: 1,
    effectiveDate: gameStartDate(),
    endDate: null,
    source: "Test-only input",
    retrieved: gameStartDate(),
    estimate: true,
    unit: "percent",
  };
  const foreign: LawRowInput = {
    ...own,
    id: "test:foreign-average",
    jurisdiction: outside,
    value: 9,
  };
  const future = {
    ...own,
    id: "test:own-pending",
    series: "sales-tax",
    effectiveDate: addDays(makeIsoDate(gameStartDate()), 30),
  };
  const otherFuture = {
    ...future,
    id: "test:foreign-pending",
    jurisdiction: outside,
  };
  const input = {
    series: "sales-tax",
    chain,
    date: gameStartDate(),
    rows: [otherFuture, future],
  };
  const answer = resolveLawInForce({ ...input, localAverage: [foreign, own] });
  expect(answer.levels.find((row) => row.level === "city")?.row).toEqual(own);
  expect(answer.pending.map((row) => row.id)).toEqual([future.id]);
  expect(
    resolveLawInForce({ ...input, localAverage: [foreign] }).levels.find(
      (row) => row.level === "city",
    )?.row,
  ).toBeNull();
  const expired = {
    ...own,
    id: "test:expired-average",
    endDate: gameStartDate(),
  };
  expect(
    resolveLawInForce({
      ...input,
      localAverage: [expired, foreign, own],
    }).levels.find((row) => row.level === "city")?.row?.id,
  ).toBe(own.id);
});

it(`the ordinary year's tax reader reaches a named buyer and the treasury pays a person: ${where}`, () => {
  setBookkeeping(false);
  const core = buildBenchWorld(place.seed, gameStartDate(), {
    placeKey: place.key,
    twoLevel: true,
  }).core;
  const api = coreAPI(core),
    chain = lawChain(api),
    opened = core.date;
  let witness: Record<string, unknown> | undefined;
  let treasuryId: string | undefined;
  let collectedOn: string | undefined;
  for (let day = 1; day <= 365; day++) {
    advanceCore(core, addDays(makeIsoDate(opened), day));
    const answer = lawInForce(api, "sales-tax");
    for (const level of answer.levels) {
      if (level.row?.series === "local-sales-tax-average")
        expect(level.row.jurisdiction, `${where}: ${level.row.id}`).toBe(
          chain.stateKey,
        );
    }
    for (const row of answer.pending)
      expect(inTownChain(chain, row.jurisdiction)).toBe(true);
    if (witness) continue;
    // Prefer the local-average fallback this unit repairs, when the place
    // uses one; the ordinary world itself is never changed by this observer.
    const observedLevels = [...answer.levels].sort(
      (a, b) =>
        Number(b.row?.series === "local-sales-tax-average") -
        Number(a.row?.series === "local-sales-tax-average"),
    );
    for (const level of observedLevels) {
      const law = level.row;
      if (!law || level.setAside || !(Number(law.value) > 0)) continue;
      const tax = [...purchaseTaxes(core).values()].find(
        (row) =>
          row.collectedMinor > 0 &&
          row.laws?.some((read) => read.lawId === law.id),
      );
      if (!tax) continue;
      const reach = appliedOn(api, law.series).find(
        (row) =>
          row.lawId === law.id &&
          row.target === "person" &&
          row.amountMinor > 0 &&
          core.people.has(row.targetId),
      );
      if (!reach) continue;
      const person = core.people.get(reach.targetId)!;
      treasuryId = core.cashJournal.accounts.get(tax.payeeAccountId)?.ownerId;
      expect(treasuryId).toBeDefined();
      collectedOn = core.date;
      witness = {
        observedOn: core.date,
        law,
        tax: { ...tax },
        reach,
        buyer: {
          id: person.id,
          name: `${person.givenName} ${person.familyName}`,
          householdId: person.householdId,
        },
        treasuryId,
      };
      break;
    }
  }
  expect(
    witness,
    `${where}: no real sales tax reached a named buyer`,
  ).toBeDefined();
  const payment = [...core.cashJournal.detailedReceipts.values()].find(
    (receipt) => {
      if (receipt.date < collectedOn!) return false;
      const treasury = receipt.owners.get(treasuryId!);
      return (
        treasury &&
        treasury.afterMinor < treasury.beforeMinor &&
        [...receipt.owners.values()].some(
          (owner) =>
            core.people.has(owner.ownerId) &&
            owner.afterMinor > owner.beforeMinor,
        )
      );
    },
  );
  expect(
    payment,
    `${where}: receiving treasury paid no named person`,
  ).toBeDefined();
  const proof = {
    town: place.name,
    placeKey: place.key,
    replay,
    worldSeed: core.seed,
    through: core.date,
    ...witness,
    payment: {
      id: payment!.id,
      date: payment!.date,
      source: payment!.sourceRef,
      people: [...payment!.owners.values()]
        .filter(
          (owner) =>
            core.people.has(owner.ownerId) &&
            owner.afterMinor > owner.beforeMinor,
        )
        .map((owner) => ({
          ...owner,
          name: `${core.people.get(owner.ownerId)!.givenName} ${core.people.get(owner.ownerId)!.familyName}`,
        })),
    },
    limit:
      "Actual existing tax and payment; no claim that this tax caused extra spending, or that other states now sit.",
  };
  if (process.env.LAW_CHAIN_PROOF)
    writeFileSync(
      process.env.LAW_CHAIN_PROOF,
      JSON.stringify(proof, null, 2) + "\n",
    );
  console.log(JSON.stringify(proof));
}, 900_000);
