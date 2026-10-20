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
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const draw = drawPlace(
        createHash("sha256").update(`${base}:${attempt}`).digest("hex"),
        "gov-bribe-buys-a-contract",
      );
      tried.push(`${draw.name} (${draw.key}), seed ${draw.seed}`);
      const { core } = buildBenchWorld(draw.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: draw.key,
      });
      for (let day = 0; day < 365; day++)
        advanceCore(core, addDays(makeIsoDate(core.date), 1));
      const api = coreAPI(core);
      const awards = governments(api).flatMap((gov) =>
        contractsOf(api, gov.id),
      );
      const taken = awards.flatMap((award) =>
        award.bribes.filter((b) => b.taken).map((b) => ({ award, bribe: b })),
      );
      if (!taken.length) continue;
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
      expect(core.cashJournal.totals.grossDebitMinor, where).toBe(
        core.cashJournal.totals.grossCreditMinor,
      );
      return;
    }
    throw new Error(
      `no bribe was taken in 10 drawn places: ${tried.join("; ")}`,
    );
  } finally {
    setBookkeeping(true);
  }
}, 3_600_000);
