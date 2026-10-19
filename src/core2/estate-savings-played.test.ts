/**
 * A dead person's savings come to their estate (pool:
 * world-stopgap-credit-deposits-faked-mechanic). In the played world, in a
 * place drawn from all 56, a death of someone whose savings sat at the bank
 * is paid out by an estate-savings withdrawal, named by its record id.
 */
import { appendFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { depositsAtBank } from "./accounts";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";

it("pays a dead person's savings to their estate through an estate-savings withdrawal", () => {
  const tried: string[] = [];
  for (let attempt = 0; attempt < 6; attempt++) {
    const seed = process.env.ES_SEED ?? randomBytes(8).toString("hex");
    const place = drawPlace(seed, "estate-savings");
    const where = `${place.name} [${place.key}], seed ${seed}`;
    setBookkeeping(false);
    const { core } = buildBenchWorld(seed, gameStartDate(), {
      placeKey: place.key,
    });
    try {
      advanceCore(core, addDays(makeIsoDate(core.date), 730));
    } catch (error) {
      throw new Error(
        `${where}: ${(error as Error).message}\n${(error as Error).stack}`,
      );
    }
    const banks = [...core.organizations.values()].filter(
      (o) => o.kind === "bank",
    );
    const claims = banks.flatMap((bank) => depositsAtBank(core, bank.id));
    const paidAtDeath = claims.filter((c) =>
      c.lastTransferId.startsWith("estate-savings:"),
    );
    // A claim whose holder is a dead person, or a household with no living member, must not be left with its savings.
    const stranded = claims.filter((claim) => {
      if (claim.balanceMinor <= 0) return false;
      const person = core.people.get(claim.holderId);
      if (person) return !person.alive;
      const home = core.households.get(claim.holderId);
      return (
        !!home &&
        home.memberIds.length > 0 &&
        home.memberIds.every((id) => !core.people.get(id)?.alive)
      );
    });
    expect(
      stranded.map((c) => c.id),
      where,
    ).toEqual([]);
    tried.push(`${where}: ${paidAtDeath.length} estate withdrawals`);
    if (paidAtDeath.length) {
      if (process.env.ES_OUT)
        appendFileSync(
          process.env.ES_OUT,
          `${tried.at(-1)} ${paidAtDeath[0]!.lastTransferId}\n`,
        );
      return;
    }
  }
  throw new Error(
    `no drawn place paid a dead person's savings: ${tried.join("; ")}`,
  );
}, 3_000_000);
