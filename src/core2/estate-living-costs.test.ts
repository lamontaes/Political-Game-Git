/**
 * A dead payer's household bills move to the household's oldest living payer
 * instead of draining the dead person's account while the estate waits in
 * probate, so the estate that passes is the estate that was left: the living
 * costs flow, the property tax and the price changes all read who is alive.
 * A place is drawn from all 56; set GOLDEN_PATH_SEED to reproduce a run.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { settleEstate } from "./estates";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { residentsRuntime } from "./modules/residents";
import { coreAPI, fillInPerson, registerModule } from "./state";
import type { CoreEventInput } from "./types";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");

it("a dead payer's household bills move to a living adult and the estate is whole at probate", () => {
  const draw = drawPlace(seed, "estate-living-costs");
  const where = `${draw.name} [${draw.key}], seed ${draw.seed}`;
  const { core } = buildBenchWorld(draw.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: draw.key,
  });
  const api = coreAPI(core);
  const rt = residentsRuntime(core)!;
  // A counted household with two adults who pay living costs, filled in so
  // its bills are its own, until one has an outside living-costs flow.
  let householdId = "";
  let payerId = "";
  for (const h of rt.store.liveHouseholds()) {
    const payers = rt.store
      .countedMembers(h)
      .filter((i) => rt.store.personInput(i).livingCostDailyMinor > 0);
    if (payers.length < 2) continue;
    fillInPerson(core, rt.store.ids[payers[0]!]! as never);
    const found = rt.flows.get(`residents:outside-living:${h.id}`);
    if (!found || !core.people.has(found.payerId)) continue;
    householdId = h.id;
    payerId = found.payerId;
    break;
  }
  expect(
    payerId,
    `${where}: a filled-in household with a living-costs flow`,
  ).not.toBe("");
  const heard: CoreEventInput[] = [];
  registerModule(core, {
    id: "test:estate-reader",
    eventKinds: ["estate.settled"],
    onEvent: (_api, event) => {
      heard.push(event);
    },
  });
  const accounts = api.accounts();
  api.updatePerson(payerId, { liquidMinor: 2_000_000 });
  api.updatePerson(payerId, { alive: false });
  settleEstate(api, payerId, "event:death");
  const held = accounts.balance(accounts.main(payerId));
  expect(held, where).toBeGreaterThan(0);
  // Two months: the monthly bills fall due and are paid by someone living.
  advanceCore(core, addDays(makeIsoDate(core.date), 65));
  const flow = rt.flows.get(`residents:outside-living:${householdId}`)!;
  expect(
    flow.endedAt !== undefined ||
      (flow.payerId !== payerId && core.people.get(flow.payerId)?.alive),
    `${where}: the living-costs flow of ${payerId} moved or ended`,
  ).toBe(true);
  expect(accounts.balance(accounts.main(payerId)), where).toBe(held);
  // Probate closes with the estate that was left.
  advanceCore(
    core,
    addDays(makeIsoDate(core.date), api.parameter("probateDays")),
  );
  const settled = heard.filter((e) => e.facts?.decedentId === payerId);
  expect(settled.length, `${where}: estate settled`).toBeGreaterThan(0);
  expect(
    settled.reduce((n, e) => n + Number(e.facts?.estateMinor ?? 0), 0),
    `${where}: the estate that passed`,
  ).toBe(held);
}, 900_000);
