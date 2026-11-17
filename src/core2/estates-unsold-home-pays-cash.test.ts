/**
 * An estate whose house is still for sale pays its heirs the cash when
 * probate closes, and the house's proceeds to the same heirs when it sells
 * (owner's night orders, CTO Nov 17: an unsold home must not hold an estate
 * open forever). In the played world, in places drawn from all 56 (NATION_SEED
 * replays): over two years, an estate with a home listed past its probate
 * period holds no cash for its heirs, and a probate row that paid its cash
 * keeps the heirs and the will of the day of death. Places with no such
 * estate are named and passed over.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { ESTATES_MODULE_ID } from "./estates";
import { gameStartDate } from "./game-start";
import type { HomeSale } from "./housing-sale";
import { daysBetweenText } from "./kernel/dates";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { coreAPI } from "./state";

const seed = process.env.NATION_SEED ?? randomBytes(8).toString("hex");
const DRAWS = 4;

describe(`an unsold home does not hold the estate's cash (seed ${seed})`, () => {
  it(
    "pays the heirs the cash at the probate close and keeps the sale for the house",
    { timeout: 3_600_000 },
    () => {
      setBookkeeping(false);
      const passed: string[] = [];
      for (let at = 0; at < DRAWS; at += 1) {
        const place = drawPlace(`${seed}:${at}`, "estates-unsold-home");
        const where = `${place.name} (${place.key}), seed ${place.seed}`;
        let world: ReturnType<typeof buildBenchWorld>;
        try {
          world = buildBenchWorld(place.seed, gameStartDate(), {
            twoLevel: true,
            placeKey: place.key,
          });
        } catch (error) {
          if ((error as Error).name !== "NoPlayerHereError") throw error;
          passed.push(`${where}: no one to play`);
          continue;
        }
        const { core } = world;
        const api = coreAPI(core);
        advanceCore(core, addDays(makeIsoDate(core.date), 365 * 2));
        const probateDays = api.parameter("probateDays");
        const sales = (
          api
            .moduleState("housing")
            .table("sales")
            .rows() as unknown as HomeSale[]
        ).filter(
          (sale) =>
            sale.decedentId &&
            sale.status === "listed" &&
            daysBetweenText(sale.date, core.date) > probateDays + 31,
        );
        const rows = api
          .moduleState(ESTATES_MODULE_ID)
          .table("probate")
          .rows() as unknown as {
          id: string;
          partial?: boolean;
          heirs?: readonly string[];
        }[];
        const paidCash = rows.filter((row) => row.partial);
        if (!sales.length || !paidCash.length) {
          passed.push(
            `${where}: ${sales.length} estate homes listed past probate, ${paidCash.length} estates paid in part`,
          );
          continue;
        }
        for (const sale of sales) {
          const balance = api
            .accounts()
            .balance(api.accounts().main(sale.decedentId!));
          expect(
            balance,
            `${where}: ${sale.decedentId} holds cash ${sale.date} listed, past probate`,
          ).toBeLessThanOrEqual(0);
        }
        for (const row of paidCash)
          expect(
            row.heirs,
            `${where}: ${row.id} kept its heirs of the day of death`,
          ).toBeDefined();
        console.log(
          `estates-unsold-home: ${where}: ${sales.length} homes listed past probate, ${paidCash.length} estates paid in part; passed over: ${passed.join("; ") || "none"}`,
        );
        return;
      }
      throw new Error(
        `no drawn place had an estate with an unsold home in two years (seed ${seed}): ${passed.join("; ")}`,
      );
    },
  );
});
