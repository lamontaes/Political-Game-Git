/** Generated play evidence: a bidder's owner bribes a member of the body and the award counts the bribe taken. */
import { createHash, randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { coreAPI } from "./state";
import { governments } from "./modules/budgets";
import { contractsOf } from "./modules/contracts";
import { CORRUPTION_MODULE_ID } from "./modules/corruption";

const base = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");

it("records each bribe offered for an award, and the taken ones by the votes they took part in", () => {
  setBookkeeping(false);
  const tried: string[] = [];
  try {
    for (let attempt = 0; attempt < 16; attempt += 1) {
      const draw = drawPlace(
        createHash("sha256").update(`${base}:${attempt}`).digest("hex"),
        "gov-bribe-buys-a-contract",
      );
      tried.push(`${draw.name} (${draw.key}), seed ${draw.seed}`);
      const { core } = buildBenchWorld(draw.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: draw.key,
      });
      const api = coreAPI(core);
      // Every journal entry by its source id, so a contract payment is read back from the books.
      const entries = new Map<
        string,
        { accountId: string; deltaMinor: number }[]
      >();
      const post = api.postJournal.bind(api);
      api.postJournal = (entry) => {
        entries.set(
          String(entry.sourceRef.id),
          entry.postings.map((p) => ({
            accountId: p.accountId,
            deltaMinor: p.deltaMinor,
          })),
        );
        return post(entry);
      };
      for (let day = 0; day < 365; day++)
        advanceCore(core, addDays(makeIsoDate(core.date), 1));
      const awards = governments(api).flatMap((gov) =>
        contractsOf(api, gov.id),
      );
      const taken = awards.flatMap((award) =>
        award.bribes.filter((b) => b.taken).map((b) => ({ award, bribe: b })),
      );
      if (!taken.length) continue;
      // The chain: a taken bribe, the vote it took part in, the award, and the
      // treasury's payment to the winner. A place without one is not a place to prove it in.
      const bought = awards.filter(
        (award) =>
          award.paymentIds.length > 0 &&
          award.bribes.some(
            (bribe) =>
              bribe.taken &&
              bribe.organizationId === award.organizationId &&
              award.boughtVotes.includes(bribe.crimeId) &&
              award.votes[bribe.memberId] === award.organizationId,
          ),
      );
      if (!bought.length) continue;
      const crimes = api.moduleState(CORRUPTION_MODULE_ID).table("crimes");
      const where = tried.join("; ");
      for (const { award, bribe } of taken) {
        // The crime is on the corruption record, taken, for this award.
        const crime = crimes.get(bribe.crimeId) as unknown as
          { taken: boolean; subjectId: string; offererId: string } | undefined;
        expect(crime?.taken, `${where}: ${bribe.crimeId}`).toBe(true);
        expect(crime?.subjectId, where).toBe(
          `contract:${award.governmentId}:${award.line}:${award.awardedOn}`,
        );
        // A taken bribe the member then voted on is named as a bought vote.
        const voted = award.votes[bribe.memberId] === bribe.organizationId;
        expect(award.boughtVotes.includes(bribe.crimeId), where).toBe(voted);
        // An award the bribes changed names the firm it would have gone to.
        if (award.withoutBribes)
          expect(award.withoutBribes, where).not.toBe(award.organizationId);
      }
      const accounts = api.accounts();
      for (const award of bought) {
        const treasury = accounts.main(
          governments(api).find((gov) => gov.id === award.governmentId)!
            .organizationId,
        );
        const winner = accounts.main(award.organizationId);
        let moved = 0;
        for (const id of award.paymentIds) {
          const postings = entries.get(id);
          expect(
            postings,
            `${where}: payment ${id} is on the journal`,
          ).toBeDefined();
          const into = postings!.find((p) => p.accountId === winner);
          const out = postings!.find((p) => p.accountId === treasury);
          expect(
            into?.deltaMinor,
            `${where}: ${id} pays the winner`,
          ).toBeGreaterThan(0);
          expect(out?.deltaMinor, `${where}: ${id} leaves the treasury`).toBe(
            -into!.deltaMinor,
          );
          moved += into!.deltaMinor;
        }
        expect(moved, `${where}: ${award.id}`).toBe(award.paidMinor);
        const winningBribes = award.bribes.filter(
          (bribe) =>
            bribe.taken &&
            bribe.organizationId === award.organizationId &&
            award.boughtVotes.includes(bribe.crimeId) &&
            award.votes[bribe.memberId] === award.organizationId,
        );
        expect(
          winningBribes.length,
          `${where}: ${award.id} winning bribe`,
        ).toBeGreaterThan(0);
        process.stdout.write(
          `CONTRACT_WINNING_BRIBE ${JSON.stringify({
            place: draw.name,
            placeKey: draw.key,
            worldSeed: draw.seed,
            drawSeed: base,
            award: award.id,
            winner: award.organizationId,
            winningBribes: winningBribes.map((bribe) => ({
              crimeId: bribe.crimeId,
              memberId: bribe.memberId,
              vote: award.votes[bribe.memberId],
            })),
            payments: award.paymentIds,
            treasury,
            winnerAccount: winner,
            paidMinor: moved,
          })}\n`,
        );
        for (const crimeId of award.boughtVotes)
          expect(
            award.bribes.find((b) => b.crimeId === crimeId)?.taken,
            `${where}: ${crimeId}`,
          ).toBe(true);
      }
      expect(core.cashJournal.totals.grossDebitMinor, where).toBe(
        core.cashJournal.totals.grossCreditMinor,
      );
      return;
    }
    throw new Error(
      `no bribe was taken with a bought vote and a payment in 16 drawn places: ${tried.join("; ")}`,
    );
  } finally {
    setBookkeeping(true);
  }
}, 3_600_000);
