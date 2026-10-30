import { randomBytes } from "node:crypto";
import { appendFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { billCatalog, provisionFor } from "../core2/bill-catalog";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import {
  billOf,
  castMemberVote,
  draftBill,
  executiveDecision,
  holdVote,
  mayorVeto,
} from "../core2/modules/legislature";
import { townSeats } from "../core2/modules/offices";
import { coreAPI, fillInPerson } from "../core2/state";
import type { PersonId } from "../core2/types";
import { spokenDesignation } from "../english/bill-names";
import journalBank from "../../data/english/parts/journal.json" with { type: "json" };
import journalRows from "./data/journal-rows.json" with { type: "json" };
import { composeJournal } from "./journal";

// A signing and a veto are told in the journal (the governing brief's walk
// as a mayor, Oct 29: "no line for either signing"). The player is the mayor; the council passes
// two bills and the mayor signs one and vetoes the other at the desk. The
// legislature's executive-action record names the mayor who acted and the
// member who sponsored the bill: the mayor's journal says "I signed ...",
// the sponsor's says their bill was signed. Places are drawn in turn until
// one's mayor has a veto.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");
const ATTEMPTS = 8;

it(`the mayor's journal tells a signing and a veto, and so does the sponsor's (seed ${seed})`, () => {
  const tried: string[] = [];
  for (let attempt = 0; attempt < ATTEMPTS; attempt += 1) {
    const place = drawPlace(`${seed}:${attempt}`, "journal-signing");
    const where = `${place.name} (${place.key}), seed ${seed}:${attempt}`;
    setBookkeeping(false);
    const { core, director } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(core);
    const seats = townSeats(api);
    const mayor = seats.find(
      (row) =>
        row.office.kind === "mayor" &&
        core.people.get(row.holder?.personId ?? "")?.alive,
    )?.holder?.personId;
    const council = seats.filter(
      (row) =>
        row.office.kind === "council" &&
        core.people.get(row.holder?.personId ?? "")?.alive,
    );
    // Two policies the town may enact, drafted from the catalog as the
    // office screen drafts them: one bill to sign, another to veto.
    const allowed = billCatalog(api, "city")
      .flatMap((subject) => subject.topics.flatMap((topic) => topic.policies))
      .filter((row) => row.kind === "policy-question" && row.authority.allowed)
      .slice(0, 2)
      .map((row) => provisionFor({ policyId: row.id, operation: "enact" }));
    const missing = !mayor
      ? "no mayor who is a full person"
      : !council.length
        ? "no council"
        : !mayorVeto(api).veto
          ? "the state's law gives the mayor no veto"
          : allowed.length < 2
            ? "fewer than two policies the town may enact"
            : null;
    if (missing) {
      tried.push(`${place.name}: ${missing}`);
      continue;
    }
    core.playerId = mayor!;
    director.watch(core, mayor!);
    const sponsor = council[0]!.holder!.personId!;
    fillInPerson(core, sponsor);
    director.watch(core, sponsor);
    const pass = (provision: (typeof allowed)[number]) => {
      const bill = draftBill(api, {
        bodyOfficeId: council[0]!.office.id,
        sponsorId: sponsor,
        provisions: [provision],
      });
      for (const seat of council)
        castMemberVote(api, bill.id, seat.holder!.personId!, "yes");
      expect(holdVote(api, bill.id).status, where).toBe("awaiting-signature");
      return bill;
    };
    const signed = pass(allowed[0]!);
    const vetoed = pass(allowed[1]!);
    executiveDecision(api, signed.id, true);
    executiveDecision(api, vetoed.id, false);
    advanceCore(core, addDays(makeIsoDate(core.date), 1));

    const linesOf = (personId: string) =>
      composeJournal(core, director, personId as PersonId).flatMap(
        (chapter) => chapter.lines,
      );
    const mine = linesOf(mayor!);
    const theirs = linesOf(sponsor);
    const told = (lines: typeof mine, billId: string) =>
      lines.find((line) =>
        line.sourceRecordIds.includes(`executive-action:${billId}`),
      );
    const report: string[] = [];
    for (const bill of [signed, vetoed]) {
      const record = core.durableLog.get(`executive-action:${bill.id}`);
      const action = String(record?.facts?.action);
      expect(record?.facts?.executiveId, where).toBe(mayor);
      // Said as a scene about it says it: "Ordinance 2025-1, the ...".
      const number = spokenDesignation(bill.number, bill.form.kind);
      const own = told(mine, bill.id);
      const all = `${where}: ${action} ${bill.id}\n mayor: ${mine.map((l) => l.text).join(" | ")}\n sponsor: ${theirs.map((l) => l.text).join(" | ")}`;
      expect(own?.text, all).toContain(number);
      // The mayor tells their own act; a veto the council overrode says so.
      expect(own!.text, all).toMatch(
        action === "signed"
          ? /^I signed\b/
          : action === "overridden"
            ? /^I vetoed\b.*\boverridden\b/
            : /^I vetoed\b(?!.*\boverridden\b)/,
      );
      // The sponsor's line tells what was done to their bill, never as
      // their own act.
      const sponsors = told(theirs, bill.id);
      expect(sponsors?.text, all).toContain(number);
      expect(sponsors!.text, all).not.toMatch(/^I /);
      expect(sponsors!.text, all).toMatch(
        action === "signed"
          ? /\bsigned\b/
          : action === "overridden"
            ? /\bover\b.*\bveto\b/
            : /\bvetoed\b/,
      );
      expect(billOf(api, bill.id)?.status, all).toBe(
        action === "signed" ? "enacted" : action,
      );
      report.push(
        `${record!.id} (${action}): mayor "${own!.text}"; sponsor ${sponsor} "${sponsors!.text}"`,
      );
    }
    const proof = `JOURNAL SIGNING ${where}, mayor ${mayor}:\n  ${report.join("\n  ")}`;
    console.log(proof);
    appendFileSync(
      path.join(tmpdir(), "journal-signing-proof.txt"),
      `${proof}\n`,
    );
    return;
  }
  throw new Error(
    `no drawn place put a bill on the mayor's desk: ${tried.join("; ")} (seed ${seed})`,
  );
}, 3_600_000);

// A bill said by its number and title together is one phrase with a comma
// inside ("Ordinance 2025-1, the Free Fares for Riders Ordinance"), so a
// line ends its clause right after it: "I signed {law} into law." printed
// "...Riders Ordinance into law." with the title's closing comma missing.
it("a journal line closes a bill's number and title with a comma or a period", () => {
  const named = new Set(
    journalRows.lines
      .filter((row) =>
        Object.values(
          (row as { eventFacts?: Record<string, { format: string }> })
            .eventFacts ?? {},
        ).some((fact) => fact.format === "billNumberAndName"),
      )
      .map((row) => row.kindPrefix),
  );
  const open = journalBank.parts.filter(
    (part) =>
      part.uses.some((use) =>
        ((use as { journal?: { kindPrefix: string }[] }).journal ?? []).some(
          (target) => named.has(target.kindPrefix),
        ),
      ) && /\{law\}(?![,.])/.test(part.text),
  );
  expect(open.map((part) => `${part.key}: ${part.text}`)).toEqual([]);
});
