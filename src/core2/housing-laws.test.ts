/** Housing law reads in the played world; controlled renewal cases are separate. */
import { randomBytes } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace, type DrawnPlace } from "../../scripts/core2-year/place";
import { advanceCore } from "./life";
import { coreAPI, fillInPerson } from "./state";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { enactLaw, lawChain, lawInForce } from "./modules/laws";
import { renewRentalLeases } from "./housing-occupancy";
import { residentsRuntime } from "./modules/residents";
import construction from "./data/housing/construction.json" with { type: "json" };
import parameters from "./data/laws/reach-group-a-parameters.json" with { type: "json" };

const draw: DrawnPlace = process.env.LAW_LINK_DRAW
  ? (JSON.parse(readFileSync(process.env.LAW_LINK_DRAW, "utf8")) as DrawnPlace)
  : drawPlace(randomBytes(24).toString("hex"), "housing-law-read");
const prefix = "us-policy-positions:";
const questions = {
  multifamilyLandShare: `${prefix}housing-land-use.allow-multifamily-in-single-family-zones`,
  inclusionaryShare: `${prefix}housing-land-use.inclusionary-requirement`,
  allElectric: `${prefix}environment-energy.ban-new-gas-hookups`,
  farmlandProtected: `${prefix}agriculture-natural-resources.protect-farmland-from-development`,
};
const RENT = `${prefix}housing-land-use.rent-stabilization`;
let world: ReturnType<typeof buildBenchWorld>;
beforeAll(() => {
  setBookkeeping(false);
  world = buildBenchWorld(draw.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: draw.key,
  });
}, 120_000);

describe(`housing laws, ${draw.name}, seed ${draw.seed}`, () => {
  it("reads the law at construction decisions during an ordinary played year", () => {
    const { core } = world;
    const api = coreAPI(core);
    const observations: unknown[] = [];
    const started = performance.now();
    for (let day = 0; day < 365; day++) {
      advanceCore(core, addDays(makeIsoDate(core.date), 1));
      if (Number(core.date.slice(8)) !== api.parameter("housingReviewDay"))
        continue;
      const stock = api
        .moduleState("housing")
        .table("stock")
        .get(`stock:${world.placeId}`);
      if (!stock) continue;
      const laws = Object.fromEntries(
        Object.entries(questions).map(([key, question]) => [
          key,
          lawInForce(api, question),
        ]),
      );
      expect(stock.zoning).toMatchObject({
        multifamilyLandShare:
          laws.multifamilyLandShare!.value === 1
            ? 1
            : 1 - construction.zoning.singleFamilyOnlyShare,
        inclusionaryShare:
          laws.inclusionaryShare!.value === 1
            ? parameters.parameters.inclusionaryAffordableShare.value
            : 0,
        allElectric: laws.allElectric!.value === 1,
        farmlandProtected: laws.farmlandProtected!.value === 1,
      });
      observations.push({
        date: core.date,
        stock,
        laws: Object.fromEntries(
          Object.entries(laws).map(([key, law]) => [
            key,
            { id: law.governing?.id, value: law.value },
          ]),
        ),
      });
    }
    expect(observations.length).toBeGreaterThan(0);
    expect(core.cashJournal.totals.grossDebitMinor).toBe(
      core.cashJournal.totals.grossCreditMinor,
    );
    const housing = api.moduleState("housing");
    const proof = {
      draw,
      seconds: (performance.now() - started) / 1000,
      modules: core.modules.size,
      observations,
      cases: housing.table("cases").rows(),
      projects: housing.table("projects").rows(),
      renewals: housing.table("renewals").rows(),
      affordable: housing.table("affordable").rows(),
      people: [...core.people.values()].map((p) => ({
        id: p.id,
        householdId: p.householdId,
        name: `${p.givenName} ${p.familyName}`,
      })),
      journal: core.cashJournal.totals,
    };
    if (process.env.LAW_LINK_PROOF)
      writeFileSync(process.env.LAW_LINK_PROOF, JSON.stringify(proof, null, 2));
    console.log(
      JSON.stringify({
        draw,
        seconds: proof.seconds,
        observations: observations.length,
        cases: proof.cases.length,
        projects: proof.projects.length,
        affordable: proof.affordable.length,
      }),
    );
  }, 180_000);

  it("caps both tiers at renewal and preserves a counted tenant's rent when filled in (controlled edge case)", () => {
    // A controlled renewal stress case, not claimed as the ordinary year's
    // proof. It needs a town with a renewed tenant in both tiers (a full
    // household's lease and a counted household's rent flow), so places are
    // drawn in turn from the seed until one has both.
    const tried: string[] = [];
    let found:
      | {
          core: typeof world.core;
          api: ReturnType<typeof coreAPI>;
          rt: NonNullable<ReturnType<typeof residentsRuntime>>;
          lease: { id: string; amountMinor: number };
          flow: { id: string; amountMinor: number };
          where: string;
        }
      | undefined;
    for (let attempt = 0; attempt < 10 && !found; attempt += 1) {
      const place = attempt
        ? drawPlace(`${draw.seed}:${attempt}`, "housing-law-edge")
        : draw;
      const w =
        attempt === 0
          ? world
          : buildBenchWorld(place.seed, gameStartDate(), {
              twoLevel: true,
              placeKey: place.key,
            });
      const core = w.core,
        api = coreAPI(core);
      const rt = residentsRuntime(core)!;
      for (const level of lawChain(api).levels)
        enactLaw(api, {
          ...level,
          series: RENT,
          value: 1,
          effectiveDate: addDays(makeIsoDate(core.date), 1),
          measureId: `edge-rent-${level.level}`,
          citation: "Controlled rent-cap edge case",
        });
      advanceCore(core, addDays(makeIsoDate(core.date), 2));
      // The first pass records each tenant's baseline renewal.
      renewRentalLeases(api);
      // Tenants the renewal path reads: it records a renewal for each (a
      // set-aside rent follows income instead, and a household without a
      // home pays none).
      const renewed = api.moduleState("housing").table("renewals");
      const lease = [...core.finance.contracts.values()].find(
        (r) =>
          r.id.startsWith("lease:") &&
          !r.endedAt &&
          r.amountMinor > 0 &&
          renewed.get(r.id),
      );
      const flow = [...rt.flows.values()].find(
        (r) =>
          r.id.startsWith("rent:") &&
          !r.endedAt &&
          r.amountMinor > 0 &&
          renewed.get(r.id),
      );
      if (!lease || !flow) {
        tried.push(`${place.name} (${place.key})`);
        continue;
      }
      found = {
        core,
        api,
        rt,
        lease,
        flow,
        where: `${place.name} (${place.key}), seed ${place.seed}`,
      };
    }
    if (!found)
      throw new Error(
        `no drawn world had a renewed tenant in both tiers: ${tried.join("; ")}`,
      );
    const { core, api, rt, lease, flow, where } = found;
    const rentals = [
      {
        id: lease.id,
        before: lease.amountMinor,
        read: () => lease.amountMinor,
      },
      {
        id: flow.id,
        before: flow.amountMinor,
        read: () => flow.amountMinor,
      },
    ];
    const table = api.moduleState("housing").table("renewals");
    for (const rental of rentals) {
      const last = table.get(rental.id)!;
      table.put({
        ...last,
        regionPay: Number(last.regionPay) / 2,
        renewedAt: `${Number(core.date.slice(0, 4)) - 1}${core.date.slice(4)}`,
      });
    }
    renewRentalLeases(api);
    for (const rental of rentals) {
      expect(rental.read(), `${where} ${rental.id}`).toBe(
        Math.round(
          rental.before * (1 + parameters.parameters.rentIncreaseCap.value),
        ),
      );
      expect(Number(table.get(rental.id)!.savedMinor)).toBeGreaterThan(0);
      expect(table.get(rental.id)!.lawId).toBe(
        lawInForce(api, RENT).governing!.id,
      );
    }
    const householdId = flow.id.slice("rent:".length);
    const counted = rt.households.get(householdId)!;
    const paidRent = flow.amountMinor;
    fillInPerson(core, counted.people[0]!.id);
    expect(
      core.finance.contracts.get(`lease:${householdId}`)!.amountMinor,
      where,
    ).toBe(paidRent);
    renewRentalLeases(api);
    expect(
      core.finance.contracts.get(`lease:${householdId}`)!.amountMinor,
      where,
    ).toBe(paidRent);
  }, 900_000);
});
