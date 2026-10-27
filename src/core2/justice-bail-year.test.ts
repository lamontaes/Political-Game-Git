/**
 * Posted bail is a dollar on the journal in the world the owner plays (pool
 * item justice-bail-moves-the-cash): a place drawn from all 56, one played
 * year of the bench world with every module installed. The richest people
 * the world holds, other than the sitting officials, offer those officials
 * bribes on the first day; that is the only forced part, as in the
 * forfeiture test. An official who refuses
 * reports it, the prosecutor charges, and the defendant waits for the
 * hearing; one who can post bail moves it from their own cash into the court
 * escrow and gets all of it back the day the case is heard. Each move is a
 * journal entry, named by its id.
 */
import { randomBytes } from "node:crypto";
import { writeFileSync } from "node:fs";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { setJournalTrace } from "./journal-state";
import type { PretrialRow } from "./justice-pretrial";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { chargeDecisionDays } from "./justice-law";
import {
  CORRUPTION_MODULE_ID,
  considerBribe,
  type CrimeRecord,
} from "./modules/corruption";
import {
  JUSTICE_MODULE_ID,
  type CaseRow,
  type ComplaintRow,
  type InvestigationRow,
} from "./modules/justice";
import { OFFICES_MODULE_ID, type TermRow } from "./modules/offices";
import { coreAPI } from "./state";

const ATTEMPTS = 6;
const YEAR = 365;

interface MoneyRow {
  readonly id: string;
  readonly reason: string;
  readonly date: string;
  readonly personId: string;
  readonly treasuryId: string;
  readonly postings: readonly { accountId: string; deltaMinor: number }[];
}

it("a defendant in a played year posts bail into the court escrow and gets it back at the hearing, each a journal entry", () => {
  const base = process.env.JUSTICE_BAIL_SEED ?? randomBytes(8).toString("hex");
  const passed: string[] = [];
  for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
    const seed = `${base}:${attempt}`;
    const place = drawPlace(seed, "justice-bail-year");
    const where = `${place.name} (${place.key}), seed ${seed}`;
    const was = setBookkeeping(false);
    // Each justice money record's journal entry, as the journal writer posts it.
    const entries = new Map<string, { journalId: string; date: string }>();
    setJournalTrace((input) => {
      if (input.sourceRef.kind === "justice-fine")
        entries.set(input.sourceRef.id, {
          journalId: input.id,
          date: input.date,
        });
    });
    try {
      const { core } = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
      const api = coreAPI(core);
      const justice = <T>(name: string) =>
        api.moduleState(JUSTICE_MODULE_ID).table(name).rows() as unknown as T[];
      const start = makeIsoDate(core.date);
      const terms = api
        .moduleState(OFFICES_MODULE_ID)
        .table("terms")
        .rows() as unknown as TermRow[];
      const alive = (id: string) =>
        core.people.get(id)?.alive &&
        core.cashJournal.residualAccountByOwner.has(id);
      const officials = [
        ...new Set(
          terms
            .filter(
              (t) => t.status === "serving" && t.personId && alive(t.personId),
            )
            .map((t) => t.personId!),
        ),
      ].slice(0, 40);
      const rich = [...core.people.values()]
        .filter(
          (p) =>
            p.alive &&
            p.tier !== "husk" &&
            !officials.includes(p.id) &&
            alive(p.id),
        )
        .sort(
          (a, b) => b.liquidMinor - a.liquidMinor || a.id.localeCompare(b.id),
        )
        .slice(0, 15);
      for (const offerer of rich)
        for (const official of officials)
          considerBribe(api, {
            offererId: offerer.id,
            officialId: official,
            stakeMinor: 50_000_000,
            subjectId: `favor:${offerer.id}:${official}`,
          });
      // Past the charging day, a draw where nobody posted bail (no one
      // charged, or a place that has ended cash bail) is passed over.
      advanceCore(core, addDays(start, chargeDecisionDays(api).days + 1));
      const waits = justice<PretrialRow>("pretrial");
      if (!waits.some((row) => row.decision === "posted")) {
        passed.push(
          `${where}: ${waits.length} waiting, none posted bail (${waits.map((w) => w.decision).join(", ") || "no one charged"})`,
        );
        continue;
      }
      advanceCore(core, addDays(start, YEAR));
      expect(core.date, where).toBe(addDays(start, YEAR));

      const fines = api.moduleState(JUSTICE_MODULE_ID).table("fines");
      const money = (id: string) =>
        fines.get(id) as unknown as MoneyRow | undefined;
      const posted = justice<PretrialRow>("pretrial")
        .filter((row) => row.decision === "posted")
        .filter((row) => money(`bail-return:${row.caseId}`))
        .sort((a, b) => a.id.localeCompare(b.id));
      if (!posted.length) {
        passed.push(
          `${where}: ${justice<CaseRow>("cases").length} cases, no bail posted and returned`,
        );
        continue;
      }
      const wait = posted[0]!;
      const cases = api.moduleState(JUSTICE_MODULE_ID).table("cases");
      const row = cases.get(wait.caseId) as unknown as CaseRow;

      // The case came from the world's own chain: a recorded bribe, a
      // complaint by someone who knew of it, an investigation that opened.
      const investigation = justice<InvestigationRow>("investigations").find(
        (i) => i.id === row.investigationId,
      );
      expect(investigation?.opened, where).toBe(true);
      const complaints = justice<ComplaintRow>("complaints").filter((c) =>
        investigation!.complaintIds.includes(c.id),
      );
      expect(complaints.length, where).toBeGreaterThan(0);
      const crimes = api.moduleState(CORRUPTION_MODULE_ID).table("crimes");
      for (const id of row.crimeIds)
        expect(
          (crimes.get(id) as unknown as CrimeRecord | undefined)?.offered,
          `${where}: ${id}`,
        ).toBe(true);

      // Posting: the bail leaves the defendant's own cash for the court
      // escrow on the day of the charge, as one journal entry.
      const person = `cash:${wait.personId}:residual`;
      const held = money(`bail:${wait.caseId}`)!;
      expect(held, where).toBeDefined();
      const escrow = `account:${held.treasuryId}:court-escrow`;
      expect(held.postings, where).toEqual([
        expect.objectContaining({
          accountId: person,
          deltaMinor: -wait.bailMinor,
        }),
        expect.objectContaining({
          accountId: escrow,
          deltaMinor: wait.bailMinor,
        }),
      ]);
      const out = entries.get(held.id);
      expect(out, `${where}: no journal entry for ${held.id}`).toBeDefined();
      expect(out!.date, where).toBe(row.date);

      // Return: the whole bail comes back from the escrow the day the case
      // is heard (the plea entered or the trial opened), as one journal entry.
      const back = money(`bail-return:${wait.caseId}`)!;
      expect(back.postings, where).toEqual([
        expect.objectContaining({
          accountId: escrow,
          deltaMinor: -wait.bailMinor,
        }),
        expect.objectContaining({
          accountId: person,
          deltaMinor: wait.bailMinor,
        }),
      ]);
      const home = entries.get(back.id);
      expect(home, `${where}: no journal entry for ${back.id}`).toBeDefined();
      expect(home!.date > out!.date, where).toBe(true);
      const heard = cases.get(wait.caseId) as unknown as CaseRow;
      expect(["convicted", "acquitted", "dismissed"], where).toContain(
        heard.status,
      );
      expect(core.cashJournal.totals.grossDebitMinor, where).toBe(
        core.cashJournal.totals.grossCreditMinor,
      );
      const proof = `${where}: case ${wait.caseId} (${heard.status}${heard.plea ? ", plea" : ", trial"}), bail ${wait.bailMinor} posted ${out!.date} as ${out!.journalId} (${held.id}), returned ${home!.date} as ${home!.journalId} (${back.id}); passed over: ${passed.join("; ") || "none"}`;
      console.log(proof);
      if (process.env.JUSTICE_BAIL_PRINT)
        writeFileSync(process.env.JUSTICE_BAIL_PRINT, `${proof}\n`);
      return;
    } finally {
      setJournalTrace(null);
      setBookkeeping(was);
    }
  }
  throw new Error(
    `No bail was posted and returned in ${ATTEMPTS} played years: ${passed.join("; ")}`,
  );
}, 3_600_000);
