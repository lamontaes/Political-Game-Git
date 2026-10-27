/**
 * A state session passes no bill that repeats the law in force or one it
 * already passed, and none that undoes an act of its own the same day (pool
 * item laws-session-passes-moot-and-opposite-bills). Played in a world from
 * buildBenchWorld in a place drawn from all 56 on a seed nobody chose
 * (GOLDEN_PATH_SEED pins one): the state's session sits and adjourns, then
 * every law it passed on a policy question is read against the law at its
 * level on the day it passed (the starting answer, or an earlier act in force
 * or waiting on its date), and the world plays on to the day the acts take
 * effect.
 *
 * Before the fix, the members' trade sections and poison pills
 * (`ownSections`) named questions by the member's own view alone, so bills
 * in committee at the same time carried the same section, and one bill's
 * section undid another's the same day; and a filing was read against the law
 * only when it was filed, not when the floor voted it.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import type { LawRowInput } from "./laws-starting";
import { advanceCore } from "./life";
import { LAWS_MODULE_ID, lawChain } from "./modules/laws";
import { LEGISLATURE_MODULE_ID, type BillRow } from "./modules/legislature";
import {
  answerIn,
  legislativeSessionsOf,
  windowsIn,
} from "./modules/world-legislating";
import { coreAPI } from "./state";
import { auditPassed, laterOf, oppositePairs } from "./session-law-audit";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
/** Places tried before giving up on finding a state whose legislature sits in the window. */
const DRAWS = 12;
/** The days after the opening the world plays at most: a session and the acts' effective dates. */
const MOST_DAYS = 460;

it("a state session's laws on policy questions never repeat the law in force or an act already passed, and no two take effect the same day pointing opposite ways", () => {
  setBookkeeping(false);
  const tried: string[] = [];
  for (let draw = 0; draw < DRAWS; draw += 1) {
    const place = drawPlace(`${seed}:${draw}`, "session-moot-bills");
    const where = `${place.name} (${place.key}), run seed ${seed} draw ${draw}, world seed ${place.seed}`;
    const start = gameStartDate();
    const window = [Number(start.slice(0, 4)), Number(start.slice(0, 4)) + 1]
      .flatMap((year) => windowsIn(place.state, year))
      .filter(
        (w) =>
          w.adjournAt > start && w.adjournAt <= addDays(start, MOST_DAYS - 90),
      )
      .sort((a, b) => a.conveneAt.localeCompare(b.conveneAt))[0];
    if (!window) {
      tried.push(`${where}: its legislature does not sit in the window`);
      continue;
    }
    const { core } = buildBenchWorld(place.seed, start, {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(core);
    const chain = lawChain(api);
    const stateKey = chain.stateKey;
    const chained = new Set(chain.levels.map((l) => l.jurisdiction));
    const today = () => makeIsoDate(core.date);
    advanceCore(core, addDays(window.adjournAt, 1));
    const sessionRow = legislativeSessionsOf(api).find(
      (s) => s.jurisdiction === stateKey && s.adjournAt >= window.adjournAt,
    );
    const passed = auditPassed(api, chained);
    if (!sessionRow || !passed.length) {
      tried.push(
        `${where}: ${sessionRow ? "no law passed on a policy question" : "no session record"} by ${today()}`,
      );
      continue;
    }

    // Nothing passed repeats the law at its level the day it passed, and
    // nothing points against an act of the session still waiting on its date.
    const repeating = passed.filter((p) => p.repeats);
    expect(
      repeating.map(
        (p) =>
          `${p.row.id} (${p.row.terms?.enactedBy}, ${p.row.value}) repeats ${p.prior?.id ?? "no law"} (${p.prior?.value})`,
      ),
      `${where}: laws that repeat the law at their level`,
    ).toEqual([]);
    const undoing = passed.filter((p) => p.undoesPending);
    expect(
      undoing.map(
        (p) =>
          `${p.row.id} (${p.row.terms?.enactedBy}, ${p.row.value}) undoes ${p.prior?.id} (${p.prior?.value}) before it took effect`,
      ),
      `${where}: laws that undo an act waiting on its date`,
    ).toEqual([]);
    expect(
      oppositePairs(passed),
      `${where}: opposite laws the same day`,
    ).toEqual([]);

    // Every bill the session enacted wrote a law row for each section that
    // changed something, and named the row it repeated for each that did not;
    // every bill the floor found moot names the law row that made it so.
    const laws = api.moduleState(LAWS_MODULE_ID).table("laws");
    const bills = (
      api
        .moduleState(LEGISLATURE_MODULE_ID)
        .table("bills")
        .rows() as unknown as BillRow[]
    ).filter((b) => b.bodyOfficeId.includes(stateKey));
    let sections = 0;
    let repeated = 0;
    let moot = 0;
    for (const bill of bills.filter((b) => b.status === "enacted")) {
      for (const p of bill.provisions) {
        if (p.kind !== "policy-question") continue;
        sections += 1;
        const written = passed.some(
          (l) =>
            l.row.terms?.enactedByBill === bill.id &&
            l.row.series === p.question,
        );
        const named = bill.repeats?.find((r) => r.question === p.question);
        expect(
          written || named,
          `${where}: ${bill.id} ${p.question}`,
        ).toBeTruthy();
        if (named?.lawId) {
          repeated += 1;
          expect(
            laws.get(named.lawId),
            `${where}: ${bill.id} repeats`,
          ).toBeDefined();
        }
      }
    }
    for (const bill of bills.filter((b) => b.moot)) {
      moot += 1;
      expect(bill.status, `${where}: ${bill.id}`).toBe("failed");
      if (bill.moot!.lawId)
        expect(
          laws.get(bill.moot!.lawId),
          `${where}: ${bill.id} moot by`,
        ).toBeDefined();
      const record = sessionRow.bills.find((b) => b.number === bill.number);
      expect(record?.fate, `${where}: ${bill.id} on the session's record`).toBe(
        "moot",
      );
      expect(record?.moot?.lawId).toBe(bill.moot!.lawId);
    }

    // On the day the acts take effect, the level's answer is the last one
    // passed on each question.
    const ofState = passed.filter((p) => p.row.jurisdiction === stateKey);
    const last = ofState
      .map((p) => p.row.effectiveDate)
      .sort()
      .at(-1);
    if (last && last <= addDays(start, MOST_DAYS) && last > today())
      advanceCore(core, addDays(last, 1));
    const finalOn = new Map<string, LawRowInput>();
    for (const { row } of ofState) {
      const have = finalOn.get(row.series);
      finalOn.set(row.series, have ? laterOf(have, row) : row);
    }
    if (last && today() > last)
      for (const [question, row] of finalOn)
        expect(
          answerIn(api, stateKey, question),
          `${where}: ${question} on ${today()} reads ${row.id}`,
        ).toBe(row.value === 1 ? 1 : -1);
    // The starting answers the session changed: a question whose answer, once
    // the session's last act on it stands, differs from the researched one.
    const changed = [...finalOn].filter(
      ([question, row]) =>
        (row.value === 1) !==
        ((
          laws.get(
            `law:${stateKey}:state:${question}:general:starting`,
          ) as unknown as LawRowInput | undefined
        )?.value ===
          1),
    ).length;

    const byBill = new Set(ofState.map((p) => p.row.terms?.enactedByBill));
    process.stdout.write(
      `MOOT ${where}: ${stateKey} session ${sessionRow.conveneAt} to ${sessionRow.adjournAt}, ${sessionRow.filings.length} filings; ${ofState.length} state laws passed on ${finalOn.size} policy questions from ${byBill.size} bills, ${changed} starting answers changed (of ${passed.length} laws in the town's chain, none repeats the law at its level, no opposite pair, no act undone before it took effect), e.g. ${passed[0]!.row.id}; ${sections} policy sections in ${bills.filter((b) => b.status === "enacted").length} enacted bills, ${repeated} repeated a row and wrote none; ${moot} bills found moot on the floor; effective by ${today()}\n`,
    );
    return;
  }
  throw new Error(
    `no drawn place in ${DRAWS} passed a law on a policy question (seed ${seed}): ${tried.join("; ")}`,
  );
}, 1_800_000);
