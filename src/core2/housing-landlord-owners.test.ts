/**
 * Each town's rentals have real owners, in a random place from all 56: the
 * town as the player gets it (buildBenchWorld, two-level, every module), run
 * for a year. The owners are living full residents; a notice names its owner
 * and the reasons that owner weighed; the owners' share of the rent reaches
 * their own accounts by journal record.
 *
 * Seed and place from GOLDEN_PATH_SEED (random when unset), printed.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { gameStartDate } from "./game-start";
import { drawPlace } from "../../scripts/core2-year/place";
import { advanceCore } from "./life";
import { coreAPI } from "./state";
import { setBookkeeping } from "./bookkeeping";
import { addDays, makeIsoDate } from "./kernel/dates";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");

interface OwnerRow {
  id: string;
  landlordId: string;
  ownerId: string;
  receivedMinor?: number;
}
interface CaseRow {
  id: string;
  leaseId: string;
  ownerId?: string;
  noticeReasons?: Record<string, number>;
  counted: boolean;
}

describe("a town's rentals have owners", { timeout: 3_600_000 }, () => {
  it("names living residents as owners, has a notice cite its owner's reasons, and pays the owners' share into their accounts", () => {
    setBookkeeping(false);
    const tried: string[] = [];
    // A year of a small town may serve no notice or pay no owner (its landlord keeps no cash above a month's rent), so places are drawn in turn until one does both.
    for (let life = 0; life < 6; life += 1) {
      const place = drawPlace(`${seed}:${life}`, "housing-landlord-owners");
      const where = `${place.name}, ${place.state} (place ${place.key}), seed ${seed}:${life}`;
      const { core } = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
      const api = coreAPI(core);
      advanceCore(core, addDays(makeIsoDate(core.date), 365));
      const housing = api.moduleState("housing");
      const owners = housing.table("landlords").rows() as unknown as OwnerRow[];
      expect(owners.length, `no landlord owners: ${where}`).toBeGreaterThan(0);
      for (const row of owners) {
        expect(
          core.people.get(row.ownerId),
          `${row.id}: ${where}`,
        ).toBeDefined();
        expect(core.organizations.has(row.landlordId), where).toBe(true);
      }
      // The owners' share of the rent reached their accounts, by journal record.
      const paid = owners.filter((row) => (row.receivedMinor ?? 0) > 0);
      for (const row of paid)
        expect(
          core.cashJournal.totalsByOwner.get(row.ownerId)?.grossCreditMinor ??
            0,
          `${row.ownerId}: ${where}`,
        ).toBeGreaterThanOrEqual(row.receivedMinor!);
      // A notice names the owner who weighed it and the reasons they weighed.
      const owned = (
        housing.table("cases").rows() as unknown as CaseRow[]
      ).filter((row) => row.ownerId);
      for (const row of owned) {
        expect(
          owners.some((o) => o.ownerId === row.ownerId),
          `${row.id}: ${where}`,
        ).toBe(true);
        expect(
          Object.keys(row.noticeReasons ?? {}),
          `${row.id}: ${where}`,
        ).toEqual(
          expect.arrayContaining(["baseline", "arrears", "late", "ownerCash"]),
        );
      }
      if (paid.length > 0 && owned.length > 0) return;
      tried.push(
        `${where} (${owners.length} owners, ${paid.length} paid, ${owned.length} notices)`,
      );
    }
    throw new Error(
      `no drawn place paid an owner and served a notice: ${tried.join("; ")}`,
    );
  });
});
