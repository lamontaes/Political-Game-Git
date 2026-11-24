/**
 * A utility pays for the power and water it sells (world-utility-purchased-power-outflow).
 * The county electric and water utility is a business in NAICS 22 whose
 * customers are the households that pay its bills; its books carry the IRS
 * cost-of-sales share for utilities, and the outside-costs flow pays its
 * suppliers as the bills come in, so a utility does not hold the whole of its
 * receipts as cash. Over a played year, a place drawn from all 56 on a seed
 * nobody chose: the household bills that reach the utility's account and the
 * payments it makes to its outside suppliers are summed from the journal, and
 * the payments are at least half the cost share of the receipts (the last
 * weeks' costs are still unbilled at the year's end). A drawn place without a
 * utility is redrawn, never skipped.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { coreAPI } from "./state";

const UTILITY = "enterprise:utility";
const seed = process.env.UTILITY_SEED || randomBytes(8).toString("hex");

it("a utility pays its outside suppliers for the power it sells", () => {
  const tried: string[] = [];
  for (let draw = 0; draw < 8; draw += 1) {
    const place = drawPlace(`${seed}:${draw}`, "utility-power");
    const where = `${place.name} (${place.key}), seed ${seed}:${draw}`;
    setBookkeeping(false);
    try {
      const { core } = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
      const utility = [...core.organizations.values()].find(
        (org) => org.classification === UTILITY,
      );
      const account = utility
        ? core.cashJournal.residualAccountByOwner.get(utility.id)
        : undefined;
      if (!utility || !account || !core.finance.businesses.has(utility.id)) {
        tried.push(`${where}: no utility with books`);
        continue;
      }
      const api = coreAPI(core);
      let bills = 0;
      let suppliers = 0;
      const post = api.postJournal.bind(api);
      api.postJournal = (entry) => {
        for (const posting of entry.postings) {
          if (posting.accountId !== account) continue;
          const kind = String(entry.sourceRef.kind);
          if (kind === "accounts.transfer") {
            const id = String(entry.sourceRef.id);
            if (id.startsWith("outside-costs") && posting.deltaMinor < 0)
              suppliers -= posting.deltaMinor;
            else if (id.startsWith("residents") && posting.deltaMinor > 0)
              bills += posting.deltaMinor;
          }
        }
        return post(entry);
      };
      advanceCore(core, addDays(makeIsoDate(core.date), 365));
      const share = api.parameter("businessIrsUtilitySalesCostShare");
      expect(
        bills,
        `${where}: household bills reached the utility`,
      ).toBeGreaterThan(0);
      expect(
        suppliers,
        `${where}: the utility paid its suppliers ${suppliers} of ${bills} billed`,
      ).toBeGreaterThan(0.5 * share * bills);
      process.stdout.write(
        `${where}: ${utility.id} was billed ${bills} and paid suppliers ${suppliers} (cost share ${share})\n`,
      );
      return;
    } finally {
      setBookkeeping(true);
    }
  }
  throw new Error(
    `no drawn place had a utility with books in 8 draws: ${tried.join("; ")} (seed ${seed})`,
  );
}, 1_800_000);
