// @vitest-environment node
/**
 * A sponsor's figure and reason for their bill come from the sections they
 * wrote: of those, the one that weighs most for them, weighed alone. A section
 * a trade or a poison pill added is someone else's price, so it never gives
 * the reason, however much the sponsor likes it (coordinator's ruling, Nov 15,
 * 2026). Pinned: Nathrop, Colorado.
 */
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import {
  LEGISLATURE_MODULE_ID,
  draftBill,
  memberKey,
  members,
  sponsorsStrongestSection,
  type BillRow,
  type Provision,
} from "../core2/modules/legislature";
import { amountChanges } from "../core2/modules/world-legislating";
import type { ModuleRow } from "../core2/module-data";
import { coreAPI } from "../core2/state";
import type { PersonId } from "../core2/types";
import { amountWords, valueWords } from "../english/bill-sections";
import type { Fact } from "../english/scene-talk-words";
import { sponsorAmountFacts } from "./bargain-facts";

const SEED = "612deadbcae7ad23";
const PLACE = "0853010";
const STATE = "US-CO";
const BODY = "office:US-CO:legislature-upper";

it(
  `a sponsor's reason is their own strongest section, not the first and not a traded one (Nathrop CO, seed ${SEED})`,
  // Measured 7.4 s on Nov 15; the limit is about twice that.
  { timeout: 15_000 },
  () => {
    const bookkeeping = setBookkeeping(false);
    try {
      const { core } = buildBenchWorld(SEED, gameStartDate(), {
        twoLevel: true,
        placeKey: PLACE,
      });
      const api = coreAPI(core);
      // The sections on offer are the state's amount laws set at a bordering
      // state's own figure (amountChanges reads them): real figures a member
      // could file, each different from the amount in force.
      const candidates: Provision[] = amountChanges(api, STATE).flatMap((c) =>
        [
          ...new Set(
            Object.values(c.neighbors).filter((value) => value !== c.from),
          ),
        ].map((value) => ({
          kind: "law-amount" as const,
          series: c.series,
          value,
          ...(c.unit ? { unit: c.unit } : {}),
        })),
      );
      expect(candidates.length).toBeGreaterThanOrEqual(3);
      const weigh = (bill: BillRow, section: Provision) =>
        sponsorsStrongestSection(api, { ...bill, provisions: [section] })!
          .position.total;
      for (const term of members(api, BODY)) {
        const sponsorId = memberKey(term) as PersonId;
        // Hand-made, labeled: the bill is drafted through the game's own
        // draftBill with two of the sponsor's own sections, the weaker first.
        const probe = draftBill(api, {
          bodyOfficeId: BODY,
          sponsorId,
          provisions: [candidates[0]!],
        });
        // One section per weight: a law's figures that point the same way
        // weigh the same for a member, so three weights are three laws.
        const seen = new Set<number>();
        const ranked = candidates
          .map((section) => ({ section, total: weigh(probe, section) }))
          .sort((a, b) => b.total - a.total)
          .filter((row) => !seen.has(row.total) && !!seen.add(row.total));
        const [traded, strongest, weaker] = ranked;
        if (
          !traded ||
          !strongest ||
          !weaker ||
          !(traded.total > strongest.total && strongest.total > weaker.total)
        )
          continue;
        const drafted = draftBill(api, {
          bodyOfficeId: BODY,
          sponsorId,
          provisions: [weaker.section, strongest.section],
        });
        // Hand-made, labeled: a trade adds the section the sponsor weighs most
        // of all, recorded on its deal as the engine's trade records it.
        const bill: BillRow = {
          ...drafted,
          provisions: [...drafted.provisions, traded.section],
          deals: [
            ...drafted.deals,
            {
              memberId: "staged-holdout",
              kind: "trade-amendment",
              terms: "staged",
              date: core.date,
              status: "accepted",
              section: traded.section,
            },
          ],
        };
        api
          .moduleState(LEGISLATURE_MODULE_ID)
          .table("bills")
          .put(bill as unknown as ModuleRow);
        const own = sponsorsStrongestSection(api, bill)!;
        expect(own.section).toEqual(strongest.section);
        const facts: Record<string, Fact> = {};
        sponsorAmountFacts(core, facts, bill.id, sponsorId, "staged-cause");
        if (!facts["own-amount"]) continue;
        const section = strongest.section;
        expect(facts["own-amount"].text).toBe(
          `${amountWords(section.series!)!.subject} at ${valueWords(section.value, section.unit)}`,
        );
        process.stdout.write(
          `SPONSOR-OWN-SECTION Nathrop CO seed ${SEED}: ${sponsorId} on ${bill.number}: said "${facts["own-amount"].text}" (own strongest, section 2), not section 1 (${weaker.section.series} ${weaker.section.value}) or the traded section 3 (${traded.section.series} ${traded.section.value}); reason ${Object.keys(facts).find((k) => k.startsWith("own-reason-"))}\n`,
        );
        return;
      }
      throw new Error(
        `No member of ${BODY} weighs three sections apart with a reason to say.`,
      );
    } finally {
      setBookkeeping(bookkeeping);
    }
  },
);
