// @vitest-environment node
/** Generated-world writer/reader regression. The passed desk is a test fixture, not a played vote. */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../../scripts/core2-year/place";
import { buildBenchWorld } from "../../../src/bench/world";
import { provisionFor } from "../../../src/core2/bill-catalog";
import { setBookkeeping } from "../../../src/core2/bookkeeping";
import { gameStartDate } from "../../../src/core2/game-start";
import { unemploymentTerms } from "../../../src/core2/jobs-benefits";
import { addDays, makeIsoDate } from "../../../src/core2/kernel/dates";
import {
  draftBill,
  executiveDecision,
  LEGISLATURE_MODULE_ID,
  memberKey,
} from "../../../src/core2/modules/legislature";
import { lawInForce } from "../../../src/core2/modules/laws";
import { townSeats } from "../../../src/core2/modules/offices";
import { coreAPI } from "../../../src/core2/state";
import type { ModuleRow } from "../../../src/core2/module-data";

const replay = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const place = drawPlace(replay, "unemployment-program-reversal");
it(`an existing unemployment program can be repealed and restored: ${place.name}, replay ${replay}`, () => {
  setBookkeeping(false);
  try {
    const world = buildBenchWorld(place.seed, gameStartDate(), {
      placeKey: place.key,
      twoLevel: true,
    });
    const api = coreAPI(world.core);
    const original = lawInForce(api, "unemployment-insurance").governing!;
    expect(original).toBeDefined();
    const before = unemploymentTerms(api);
    const provision = provisionFor({
      policyId: "law:unemployment-insurance",
      operation: "lower",
      amount: 0,
    });
    if (original.value === 0) {
      expect(before.hasProgram).toBe(false);
      console.log(
        JSON.stringify({
          place: place.name,
          replay,
          worldSeed: place.seed,
          original: original.id,
          establishmentStillNeeded: true,
        }),
      );
      return;
    }
    expect(before.hasProgram).toBe(true);
    const chamber = townSeats(api).find(
      (s) => s.office.kind.startsWith("legislature-") && s.holder,
    );
    expect(chamber).toBeDefined();
    const records: string[] = [];
    for (const value of [0, 1]) {
      const effectiveDate = addDays(makeIsoDate(api.state.date), 1);
      const bill = draftBill(api, {
        bodyOfficeId: chamber!.office.id,
        sponsorId: memberKey(chamber!.holder!),
        provisions: [
          {
            ...provision,
            operation: value ? "raise" : "lower",
            value,
            effectiveDate,
          },
        ],
      });
      expect(bill.authority.every((a) => a.allowed)).toBe(true);
      // Fixture only stages passage. Signature runs the production enactment
      // writer, which must retain the actual researched program terms.
      api
        .moduleState(LEGISLATURE_MODULE_ID)
        .table("bills")
        .put({
          ...bill,
          status: "awaiting-signature",
          passedOn: api.state.date,
        } as unknown as ModuleRow);
      const signed = executiveDecision(api, bill.id, true);
      expect(signed.status).toBe("enacted");
      const row = lawInForce(
        api,
        "unemployment-insurance",
        effectiveDate,
      ).governing!;
      expect(row.value).toBe(value);
      expect(row.terms?.enactedByBill).toBe(bill.id);
      for (const [key, term] of Object.entries(original.terms ?? {}))
        expect(row.terms?.[key], key).toEqual(term);
      world.core.date = makeIsoDate(effectiveDate);
      const after = unemploymentTerms(api);
      expect(after.hasProgram).toBe(value === 1);
      if (value === 1) {
        expect(after).toEqual({
          ...before,
          lawId: row.id,
          source: after.source,
        });
        expect(after.source.citation).toContain(row.id);
      }
      records.push(row.id);
    }
    console.log(
      JSON.stringify({
        place: place.name,
        placeKey: place.key,
        replay,
        worldSeed: place.seed,
        body: chamber!.office.id,
        original: original.id,
        records,
        originalTerms: before,
      }),
    );
  } finally {
    setBookkeeping(true);
  }
}, 600_000);
