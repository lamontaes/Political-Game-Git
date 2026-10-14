/**
 * OFFICE-STATE's proof (docs/packages/office-play.md): in the played world, in
 * a random place from all 56 and a seed nobody chose, ten days as a state
 * representative and ten as a governor. Some acts are done (the player's own
 * choice), the rest simulated (the character's), and each act is shown read
 * by another engine by record id: the legislature reads the ties made in
 * caucus and committee, the ledger pays per diem for the session days, the
 * views engine moves the State of the State's listeners, and the budgets
 * engine reads the governor's proposal.
 */
import { randomBytes } from "node:crypto";
import { writeFileSync } from "node:fs";
import { afterAll, describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { gameStartDate } from "./game-start";
import { advanceCore } from "./life";
import { coreAPI } from "./state";
import { addDays, makeIsoDate } from "../simulation/dates";
import { lawChain } from "./modules/laws";
import {
  askToCarry,
  draftBill,
  memberKey,
  memberPosition,
  members,
} from "./modules/legislature";
import { vacateSeat } from "./modules/offices";
import { stancesOf } from "./modules/views";
import {
  BUDGETS_MODULE_ID,
  governments,
  proposedBudget,
} from "./modules/budgets";
import { PLATFORM_QUESTIONS } from "./campaign-views";
import {
  doEntry,
  legislativeLeaders,
  perDiemOf,
  perDiemPaidTo,
  resultsOf,
  seatCoveringTown,
  seatPlayerInStateOffice,
  sessionOn,
  setStops,
  stateDayParameter,
  stateOfficeOf,
  waitingEntries,
  type StateEntryResult,
} from "./office-day-state";
import type { CoreState } from "./types";

const seed = process.env.OFFICE_STATE_SEED ?? randomBytes(8).toString("hex");
const world = buildBenchWorld(seed, gameStartDate(), { twoLevel: true });
const core = world.core as CoreState;
const api = coreAPI(core);
const chain = lawChain(api);
const place = `${chain.stateKey} ${chain.townPlaceId}`;
const report: string[] = [`Place ${place}, seed ${seed}`];

/** The player: the town's adult resident nearest 45, first by id (a custom start older than 18). */
const age = (birth: string) =>
  Number(core.date.slice(0, 4)) - Number(birth.slice(0, 4));
const player = [...(core.peopleByPlace.get(chain.townPlaceId) ?? [])]
  .map((id) => core.people.get(id)!)
  .filter((p) => p?.alive && age(p.birthDate) >= 30 && age(p.birthDate) <= 60)
  .sort(
    (a, b) =>
      Math.abs(age(a.birthDate) - 45) - Math.abs(age(b.birthDate) - 45) ||
      a.id.localeCompare(b.id),
  )[0]!;
core.playerId = player.id;

/** Ten days: the morning's waiting entries are done with `choose`'s answer, or left to the character. */
function tenDays(
  choose: (
    e: ReturnType<typeof waitingEntries>[number],
    day: number,
  ) => Parameters<typeof doEntry>[2] | undefined,
): StateEntryResult[] {
  const start = core.date;
  for (let day = 0; day < 10; day++) {
    for (const entry of waitingEntries(api, player.id)) {
      const choice = choose(entry, day);
      if (choice) doEntry(api, entry.id, choice);
    }
    advanceCore(core, addDays(makeIsoDate(core.date), 1));
  }
  return resultsOf(api, player.id).filter((r) => r.date > start);
}

describe(`a state officeholder's day in ${place} (seed ${seed})`, () => {
  it("ten days as a state representative: done and simulated acts, read by the legislature and the ledger", () => {
    // A place whose offices data seats no chamber for the town can't seat a
    // representative; the gap is reported, not hidden.
    if (!seatCoveringTown(api, "legislator")) {
      report.push(
        `No legislative seat in ${chain.stateKey} covers the town in the offices data: no representative's day.`,
      );
      return;
    }
    const seatedOn = core.date;
    const office = seatPlayerInStateOffice(api, {
      personId: player.id,
      role: "legislator",
    });
    expect(office.role).toBe("legislator");
    // The player stops for nothing but their own hearing.
    setStops(api, player.id, ["own-hearing"]);
    const results = tenDays((entry, day) =>
      // Do: the first two days' floor sessions attended, the first
      // committee skipped; everything else the character decides.
      entry.kind === "floor-session" && day < 2
        ? { kind: "attend", attend: true }
        : entry.kind === "committee" && day === 0
          ? { kind: "attend", attend: false }
          : undefined,
    );
    const byKind = new Map<string, number>();
    for (const r of results) byKind.set(r.kind, (byKind.get(r.kind) ?? 0) + 1);
    report.push(
      `Representative ${player.id} in ${office.officeId} (${office.seatId}), ${results.length} entries: ${[...byKind].map(([k, n]) => `${k} ${n}`).join(", ")}`,
      ...results.map(
        (r) =>
          `  ${r.date} ${r.kind} by ${r.by}${r.lapsed ? " (stop lapsed)" : ""}: ${JSON.stringify(r.choice)} ${JSON.stringify(r.reasons)} records ${r.recordIds.length}`,
      ),
    );
    // Every weekday has something in office: a session day or a district day.
    expect(results.length).toBeGreaterThan(0);
    expect(results.some((r) => r.by === "character")).toBe(true);
    const inSession = results.some((r) => r.kind === "floor-session");
    if (!inSession) {
      report.push(
        "  The legislature is not in session these ten days: district days only.",
      );
      expect(
        results.every(
          (r) => r.kind === "district-office" || r.kind === "interim-committee",
        ),
      ).toBe(true);
      return;
    }
    expect(results.some((r) => r.by === "player")).toBe(true);
    // Read by the legislature: a colleague met in caucus or committee weighs
    // the player's bill as the sponsor's, by the tie the meeting made.
    const met = results
      .filter((r) => r.kind === "caucus" || r.kind === "committee")
      .flatMap((r) => r.recordIds);
    if (met.length) {
      const colleague = members(api, office.officeId)
        .map(memberKey)
        .find(
          (id) =>
            id !== player.id && met.includes([id, player.id].sort().join(":")),
        )!;
      const bill = draftBill(api, {
        bodyOfficeId: office.officeId,
        sponsorId: player.id,
        provisions: [
          {
            kind: "policy-question",
            question: PLATFORM_QUESTIONS[0]!,
            value: 1,
          },
        ],
      });
      const stranger = members(api, office.officeId)
        .map(memberKey)
        .find(
          (id) =>
            id !== player.id &&
            !core.relationships.has([id, player.id].sort().join(":")),
        );
      const near = memberPosition(api, bill.id, colleague).sponsor;
      report.push(
        `  Read by the legislature: ${colleague} weighs bill ${bill.id} as the sponsor's at ${near.toFixed(3)} (relationship ${met[0]})` +
          (stranger
            ? `; ${stranger}, never met, at ${memberPosition(api, bill.id, stranger).sponsor.toFixed(3)}`
            : ""),
      );
      expect(near).toBeGreaterThan(0);
      if (stranger)
        expect(memberPosition(api, bill.id, stranger).sponsor).toBe(0);
    }
    // Read by the ledger: per diem for the month's session days, on the 1st.
    const rate = perDiemOf(chain.stateKey)!;
    const firstOfNext = `${addDays(makeIsoDate(`${core.date.slice(0, 7)}-28`), 4).slice(0, 7)}-01`;
    advanceCore(core, addDays(makeIsoDate(firstOfNext), 1));
    const paid = perDiemPaidTo(api, player.id);
    report.push(
      `  Per diem (${rate.basis}, ${rate.dailyMinor} a day, ${rate.tag}): ${paid.map((t) => `${t.id} paid ${t.paidMinor} by ${t.payerId}: ${t.citation}`).join("; ") || "none"}`,
    );
    if (rate.basis !== "none" && rate.dailyMinor > 0)
      expect(paid.length).toBeGreaterThan(0);
    // Never a day before the seat was taken.
    for (const row of paid)
      expect(row.days).toBeLessThanOrEqual(
        Math.round(
          (Date.parse(
            `${addDays(makeIsoDate(`${row.month}-28`), 4).slice(0, 7)}-01`,
          ) -
            Date.parse(seatedOn)) /
            86_400_000,
        ),
      );
  });

  it("ten days as governor: the State of the State moves listeners, the budget proposal is read by the budgets engine", () => {
    // Leave the House seat as a member would, then take the governorship.
    const house = stateOfficeOf(api, player.id);
    if (house)
      vacateSeat(api, house.seatId, "resigned to take office as governor");
    // Start the day before the State of the State when it falls within four months.
    const year = Number(core.date.slice(0, 4));
    const convene = [year, year + 1]
      .flatMap((y) => {
        for (
          let d = `${y}-01-01`;
          d <= `${y}-12-31`;
          d = addDays(makeIsoDate(d), 1)
        )
          if (sessionOn(chain.stateKey, d)) return [d];
        return [];
      })
      .find(
        (d) => addDays(makeIsoDate(d), 1) >= addDays(makeIsoDate(core.date), 1),
      );
    if (convene) {
      const eve = addDays(
        makeIsoDate(convene),
        stateDayParameter("stateOfTheStateDaysAfterConvening") - 1,
      );
      if (eve > core.date && eve <= addDays(makeIsoDate(core.date), 120))
        advanceCore(core, eve);
    }
    const office = seatPlayerInStateOffice(api, {
      personId: player.id,
      role: "governor",
    });
    expect(office.role).toBe("governor");
    const gov = core.modules.has(BUDGETS_MODULE_ID)
      ? governments(api).find(
          (g) => g.level === "state" && g.id === chain.stateKey,
        )
      : undefined;
    const line = gov
      ? Object.keys(
          proposedBudget(api, gov, year, "probe").spendingMinor,
        ).sort()[0]
      : undefined;
    // Simulate the State of the State (the character's own priorities); do the budget.
    const results = tenDays((entry) =>
      entry.kind === "budget-proposal" && line
        ? { kind: "budget", changes: { [line]: 1_000_000_00 } }
        : undefined,
    );
    report.push(
      `Governor ${player.id} of ${chain.stateKey} from ${results[0]?.date ?? core.date}, ${results.length} entries`,
      ...results.map(
        (r) =>
          `  ${r.date} ${r.kind} by ${r.by}${r.lapsed ? " (stop lapsed)" : ""}: ${JSON.stringify(r.choice)} ${JSON.stringify(r.reasons)} records ${r.recordIds.slice(0, 4).join(", ")}${r.recordIds.length > 4 ? ` and ${r.recordIds.length - 4} more` : ""}`,
      ),
    );
    expect(results.length).toBeGreaterThan(0);
    const address = results.find((r) => r.kind === "state-of-the-state");
    if (address) {
      // Read by the views engine: listeners' stances carry the speech as a cause.
      const speechIds = new Set(address.recordIds);
      const moved = [...core.people.keys()].filter((id) =>
        stancesOf(api, id).some((s) =>
          s.causes.some((c) => speechIds.has(c.eventId)),
        ),
      );
      report.push(
        `  State of the State ${address.recordIds.join(", ")}: ${moved.length} listeners' views carry it (for example ${moved.slice(0, 3).join(", ")})`,
      );
      expect(address.stop).toBe("state-of-the-state");
      expect(moved.length).toBeGreaterThan(0);
    } else report.push("  No State of the State in these ten days.");
    const budget = results.find((r) => r.kind === "budget-proposal");
    if (budget && gov && line) {
      const proposed = proposedBudget(api, gov, year + 1, "read").spendingMinor[
        line
      ]!;
      const base = proposedBudget(
        api,
        { ...gov, id: `${gov.id}:none` },
        year + 1,
        "read",
      ).spendingMinor[line];
      report.push(
        `  Budget proposal ${budget.recordIds.join(", ")}: line ${line} proposed at ${proposed} against ${base}`,
      );
      expect(budget.by).toBe("player");
    }
    // The legislature's leaders the governor met weigh the governor's ask by that tie.
    const leaders = legislativeLeaders(api, chain.stateKey);
    const met = results.filter(
      (r) => r.kind === "legislative-leaders" && r.recordIds.length,
    );
    if (met.length && leaders[0]) {
      const chamber = office.stateKey;
      void chamber;
      const lower = members(api, `office:${chain.stateKey}:legislature-lower`)
        .length
        ? `office:${chain.stateKey}:legislature-lower`
        : `office:${chain.stateKey}:legislature-unicameral`;
      const ask = askToCarry(api, {
        askerId: player.id,
        memberId:
          leaders.find((l) =>
            members(api, lower).some((t) => memberKey(t) === l),
          ) ?? leaders[0],
        bodyOfficeId: lower,
        provisions: [
          {
            kind: "policy-question",
            question: PLATFORM_QUESTIONS[1]!,
            value: 1,
          },
        ],
      });
      report.push(
        `  Carry request ${ask.id}: ${ask.memberId} weighs the governor as sponsor at ${ask.position.sponsor.toFixed(3)}; carried ${ask.carried}`,
      );
      expect(ask.position.sponsor).toBeGreaterThan(0);
    }
  });
});

afterAll(() => {
  const out = process.env.OFFICE_STATE_REPORT;
  if (out) writeFileSync(out, report.join("\n") + "\n");
  else console.log(report.join("\n"));
});
