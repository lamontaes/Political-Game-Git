/**
 * Income tax owed to a government with no treasury in the world is withheld
 * and paid to that government as an outside government
 * (world-withholding-outside-governments). The opening has no worker who
 * lives in another state yet (pool item world-commuters-in-opening), so this
 * is an edge fixture on a played world: one resident is given a home in
 * another state and one paycheck is run through the withholding.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { coreAPI } from "./state";
import { governments, withholdingOf, withholdPay } from "./modules/budgets";
import type { LawRowInput } from "./laws-starting";
import type { ModuleRow } from "./module-data";
import { outsideGovernment } from "./outside-governments";
import { LAWS_MODULE_ID, lawChain } from "./modules/laws";
import { corePlaceStateIdentities, searchCorePlaces } from "./place-lookup";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const place = drawPlace(seed, "withholding-outside-governments");

it(`tax for a government with no treasury goes to its outside account, from ${place.name} (${place.key}), seed ${seed}`, () => {
  const where = `${place.name} (${place.key}), seed ${seed}`;
  const { core } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const api = coreAPI(core);
  const own = lawChain(api).stateKey;
  const treasuries = new Set(governments(api).map((g) => g.id));
  const worker = [...core.people.values()]
    .filter((p) => p.alive && p.id !== core.playerId && p.jobId)
    .sort((a, b) => a.id.localeCompare(b.id))[0]!;
  const home = worker.placeId;
  const other = corePlaceStateIdentities()
    .map((s) => s.jurisdictionKey)
    .filter((key) => key !== own)
    .sort();
  const tried: string[] = [];
  let found = 0;
  for (let i = 0; i < other.length && !found; i += 1) {
    const state = other[i]!;
    const town = [
      ...searchCorePlaces("", Number.MAX_SAFE_INTEGER, {
        stateJurisdictionKey: state,
        scope: "locality",
      }),
    ].sort((a, b) => a.key.localeCompare(b.key))[0];
    if (!town) continue;
    api.updatePerson(worker.id, {
      placeId: town.context.jurisdiction.id as typeof worker.placeId,
    });
    // The paycheck itself, from an outside payer as an official's salary is,
    // so the worker holds the pay.
    api.accounts().transfer({
      id: `salary:edge-pay-cash:${state}`,
      from: api.accounts().main(outsideGovernment(api, "US")),
      to: api.accounts().main(worker.id),
      amountMinor: 600_000,
      reasonKey: "official.salary",
      partial: false,
      source: worker.source,
    });
    // The other state's income tax as an enacted flat rate in the law table
    // (the starting rows carry no state withholding schedule for it yet).
    const template = (
      api
        .moduleState(LAWS_MODULE_ID)
        .table("laws")
        .rows() as unknown as LawRowInput[]
    ).find((r) => r.series === "income-tax" && r.level === "state")!;
    api
      .moduleState(LAWS_MODULE_ID)
      .table("laws")
      .put({
        ...template,
        id: `edge-law:${state}`,
        jurisdiction: state,
        value: 5,
        unit: "percent-flat",
        terms: {},
        effectiveDate: core.date,
      } as unknown as ModuleRow);
    const before = withholdingOf(api, worker.id).length;
    const start = core.date;
    withholdPay(api, {
      id: `edge-pay:${state}`,
      personId: worker.id,
      paidMinor: 600_000,
      fromAt: start,
      throughAt: addDays(makeIsoDate(start), 13),
    });
    const record = withholdingOf(api, worker.id)[before];
    tried.push(state);
    console.log(
      "WH",
      state,
      core.people.get(worker.id)!.placeId,
      JSON.stringify(
        (record?.lines ?? []).map((l) => [
          l.level,
          l.jurisdiction,
          l.tax,
          l.minor,
        ]),
      ),
    );
    const outside = (record?.lines ?? []).filter(
      (l) => !treasuries.has(l.jurisdiction),
    );
    if (!outside.length) continue;
    found += 1;
    for (const line of outside) {
      const account = `cash:organization:outside-government:${line.jurisdiction}:residual`;
      expect(
        record!.postings.some(
          (p) => p.accountId === account && p.deltaMinor === line.minor,
        ),
        `${where}: ${record!.id} ${line.jurisdiction}`,
      ).toBe(true);
    }
    // The pay fell by exactly the tax: the entry balances.
    expect(
      record!.postings.reduce((sum, p) => sum + p.deltaMinor, 0),
      record!.id,
    ).toBe(0);
  }
  api.updatePerson(worker.id, { placeId: home });
  expect(
    found,
    `${where}: no state taxed the worker (tried ${tried.join(", ")})`,
  ).toBe(1);
}, 1_800_000);
