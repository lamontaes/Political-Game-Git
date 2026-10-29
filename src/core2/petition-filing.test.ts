/**
 * Filing is a petition, signatures, the clerk's check, then the ballot
 * (owner, Oct 28). In a played world (`buildBenchWorld`, every module) in a
 * place drawn from all 56:
 *
 * - a filing opens a petition asking the signatures the place's law asks
 *   (`filingRequirements`), the town's share of them where the district
 *   reaches past the town;
 * - the candidate's campaign gathers them: their circle, the doors they
 *   knock and their evenings, each signer an adult answering from their own
 *   reasons;
 * - the clerk checks the petition the morning after the deadline, strikes a
 *   name not on the count's roll, and puts the filing on the ballot or
 *   leaves it short, a public record;
 * - other engines read the clerk's check: the campaign engine's day closes
 *   for a short filing and stays open for one on the ballot, and the ballot
 *   the count is built from holds exactly the filings the clerk put on it.
 *   (The count itself, on election day, is followed in the PR's played
 *   years.)
 *
 * The player files a month before the deadline and canvasses every day
 * until it; the world's own candidates file and campaign by themselves.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { campaignDayChoices, takeCampaignDayChoice } from "./campaign-day";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import {
  ELECTIONS_MODULE_ID,
  PETITION_CHECKED_EVENT,
  ballot,
  checkEligibility,
  fileCandidacy,
  filingRequirements,
  petitionOf,
  type ContestRow,
  type FilingRow,
  type PetitionRow,
} from "./modules/elections";
import { coreAPI } from "./state";
import type { CoreState } from "./types";

const runSeed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const DRAWS = 6;
const LEAD_DAYS = 30;

const ageOn = (birthDate: string, date: string) =>
  Number(date.slice(0, 4)) -
  Number(birthDate.slice(0, 4)) -
  (date.slice(5) < birthDate.slice(5) ? 1 : 0);

/** A town contest whose filing deadline falls in the next 400 days, the soonest first. */
function townContest(core: CoreState): ContestRow | null {
  const api = coreAPI(core);
  const latest = addDays(makeIsoDate(core.date), 400);
  return (
    (
      api
        .moduleState(ELECTIONS_MODULE_ID)
        .table("contests")
        .rows() as unknown as ContestRow[]
    )
      .filter(
        (c) =>
          c.level !== "state" &&
          c.level !== "federal" &&
          !c.special &&
          c.filingDeadline > addDays(makeIsoDate(core.date), LEAD_DAYS) &&
          c.filingDeadline <= latest,
      )
      .sort(
        (a, b) =>
          a.filingDeadline.localeCompare(b.filingDeadline) ||
          a.id.localeCompare(b.id),
      )[0] ?? null
  );
}

describe("filing is a petition", () => {
  it("the clerk puts a filing on the ballot by its signatures, and the count reads the check", () => {
    setBookkeeping(false);
    const passedOver: string[] = [];
    let checked = false;
    for (let draw = 0; draw < DRAWS && !checked; draw += 1) {
      const place = drawPlace(`${runSeed}:${draw}`, "petition-filing");
      const where = `${place.name}, ${place.state} (${place.key}), run seed ${runSeed}, draw ${draw}, place seed ${place.seed}`;
      const { core } = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
      const api = coreAPI(core);
      const contest = townContest(core);
      if (!contest) {
        passedOver.push(`${where}: no town race files in the next 400 days`);
        continue;
      }
      // The player files a month before the deadline: the adult with the
      // most money who may file for it.
      advanceCore(
        core,
        addDays(makeIsoDate(contest.filingDeadline), -LEAD_DAYS),
      );
      const { townPlaceId } = api
        .moduleState(ELECTIONS_MODULE_ID)
        .table("town")
        .get("town") as unknown as { townPlaceId: string };
      const adults = [...core.people.values()]
        .filter(
          (p) =>
            p.alive &&
            p.placeId === townPlaceId &&
            ageOn(p.birthDate, core.date) >= 25,
        )
        .sort(
          (a, b) => b.liquidMinor - a.liquidMinor || a.id.localeCompare(b.id),
        );
      let filing: FilingRow | null = null;
      for (const adult of adults) {
        if (
          checkEligibility(api, adult.id, contest.id, null).some((c) => !c.met)
        )
          continue;
        core.playerId = adult.id;
        const filed = fileCandidacy(api, {
          personId: adult.id,
          contestId: contest.id,
          platform: [],
          party: null,
        });
        if (filed.status !== "refused") {
          filing = filed.filing;
          break;
        }
      }
      if (!filing) {
        passedOver.push(`${where}: no adult could file for ${contest.id}`);
        continue;
      }
      const opened = petitionOf(api, filing.id)!;
      expect(opened, `${where}: the filing opened no petition`).not.toBeNull();
      // The law's count, read from the place's filing rules.
      const town = api
        .moduleState(ELECTIONS_MODULE_ID)
        .table("town")
        .get("town") as unknown as { stateKey: string };
      expect(opened.rule.count, where).toBe(
        filingRequirements(town.stateKey, contest.family, "independent")
          .petition.count,
      );
      // Where the law asks no signatures the clerk takes the filing at the
      // counter, and there is no petition to circulate.
      if (opened.needed === 0) {
        expect(filing.status, where).toBe("on-ballot");
        expect(opened.check?.on, where).toBe(core.date);
        passedOver.push(`${where}: ${contest.id}'s law asks no signatures`);
        continue;
      }
      expect(filing.status, where).toBe("petitioning");
      expect(opened.due >= core.date, where).toBe(true);

      // The player's campaign: a canvass every day until the deadline.
      while (core.date <= opened.due) {
        const canvass = campaignDayChoices(api, filing.id).find(
          (c) => c.kind === "canvass",
        );
        if (canvass?.available)
          takeCampaignDayChoice(api, filing.id, "canvass");
        advanceCore(core, addDays(makeIsoDate(core.date), 1));
      }
      // The clerk's check, the morning after the deadline.
      advanceCore(core, addDays(makeIsoDate(opened.due), 1));
      const petitions = (
        api
          .moduleState(ELECTIONS_MODULE_ID)
          .table("petitions")
          .query("byContest", [contest.id]) as unknown as PetitionRow[]
      ).filter((p) => p.due === opened.due);
      const filings = new Map(
        (
          api
            .moduleState(ELECTIONS_MODULE_ID)
            .table("filings")
            .query("byContest", [contest.id]) as unknown as FilingRow[]
        ).map((f) => [f.id, f]),
      );
      const mine = petitionOf(api, filing.id)!;
      expect(mine.check, `${where}: the clerk never checked`).toBeDefined();
      const vias = new Set(mine.signers.map((s) => s.via));
      expect(vias.has("door"), `${where}: no signature at a door`).toBe(true);
      for (const p of petitions) {
        if (!p.check) continue;
        const f = filings.get(p.filingId)!;
        const signers = new Set(p.signers.map((s) => s.personId));
        expect(signers.size, `${where}: ${p.id} signed twice`).toBe(
          p.signers.length,
        );
        expect(signers.has(p.personId), where).toBe(false);
        expect(p.check.valid + p.check.struckIds.length, where).toBe(
          p.signers.length,
        );
        expect(f.status, `${where}: ${p.id}`).toBe(
          p.check.valid >= p.needed ? "on-ballot" : "short",
        );
        for (const s of p.signers) {
          const signer = core.people.get(s.personId);
          if (signer)
            expect(
              ageOn(signer.birthDate, s.on),
              `${where}: ${s.personId} signed ${p.id} under voting age`,
            ).toBeGreaterThanOrEqual(api.parameter("votingAge"));
        }
        // The check is a public record.
        expect(
          [...core.durableLog.values()].some(
            (e) =>
              (e as { kind?: string; facts?: Record<string, unknown> }).kind ===
                PETITION_CHECKED_EVENT &&
              (e as { facts?: Record<string, unknown> }).facts?.petitionId ===
                p.id,
          ),
          `${where}: ${p.id} has no public check`,
        ).toBe(true);
      }

      // Other engines read the check: the campaign day closes for a short
      // filing and stays open for one on the ballot, and the ballot the
      // count is built from holds exactly the filings the clerk put on it.
      const checkedFilings = petitions
        .filter((p) => p.check)
        .map((p) => filings.get(p.filingId)!);
      for (const f of checkedFilings) {
        const world = f.personId !== core.playerId;
        const open = campaignDayChoices(api, f.id, world).length > 0;
        if (f.status === "short")
          expect(open, `${where}: short ${f.id} still campaigns`).toBe(false);
        if (f.status === "on-ballot" && core.people.get(f.personId)?.alive)
          expect(open, `${where}: ${f.id} on the ballot cannot campaign`).toBe(
            true,
          );
      }
      const onBallot = new Set(ballot(api, contest.id).map((f) => f.id));
      for (const f of checkedFilings) {
        if (f.status === "short")
          expect(
            onBallot.has(f.id),
            `${where}: short ${f.id} on the ballot`,
          ).toBe(false);
        if (f.status === "on-ballot" && core.people.get(f.personId)?.alive)
          expect(onBallot.has(f.id), `${where}: ${f.id} left off`).toBe(true);
      }
      process.stdout.write(
        `${where}: ${contest.id}; ${petitions.length} petitions checked on ${mine.check!.on}: ${petitions
          .map(
            (p) =>
              `${p.id} ${p.signers.length}/${p.needed} ${filings.get(p.filingId)?.status}`,
          )
          .join("; ")}\n`,
      );
      checked = true;
    }
    expect(
      checked,
      `no drawn place held a town race to check: ${passedOver.join(" | ")}`,
    ).toBe(true);
    if (passedOver.length)
      process.stdout.write(`passed over: ${passedOver.join(" | ")}\n`);
  }, 900_000);
});
