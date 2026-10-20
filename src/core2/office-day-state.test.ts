/**
 * The state officeholder's day in the world the owner plays (pool:
 * office-needs-office-state-26): the bench world in a place and seed nobody
 * chose, every module installed. A sitting state legislator and the governor
 * each get a calendar from the place's session data, every entry citing where
 * its date comes from, and the legislature's members are paid their per diem
 * from the state's treasury where the place pays one.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { OFFICES_MODULE_ID, type TermRow } from "./modules/offices";
import { leaderOf } from "./modules/leadership";
import {
  draftBill,
  floorAgendaOn,
  LEGISLATURE_MODULE_ID,
  memberKey,
  members,
  offerDeal,
} from "./modules/legislature";
import { lawChain, lawHere } from "./modules/laws";
import {
  actOn,
  askLeaderForHearing,
  reanswerLeaderRequest,
  perDiemOf,
  perDiemPaidTo,
  stateDay,
  stateOfficeOf,
  type StateOffice,
} from "./office-day-state";
import {
  CASES_MODULE_ID,
  allCases,
  type CaseRow,
} from "./modules/constituent-cases";
import { impressionOf } from "./modules/campaigns";
import type { ModuleRow } from "./module-data";
import { coreAPI } from "./state";

/** Plays one place; false where its offices data seats no state legislator or no governor (a territory's legislature). */
function playPlace(seed: string, skipped: string[]): boolean {
  const place = drawPlace(seed, "office-state");
  const where = `${place.name} [${place.key}], seed ${seed}`;
  setBookkeeping(false);
  const { core } = buildBenchWorld(seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const api = coreAPI(core);
  const terms = api
    .moduleState(OFFICES_MODULE_ID)
    .table("terms")
    .rows() as unknown as TermRow[];
  const offices = new Map<string, StateOffice>();
  for (const term of terms) {
    if (term.status !== "serving" || !term.personId) continue;
    const office = stateOfficeOf(api, term.personId);
    if (office) offices.set(`${office.role}:${office.personId}`, office);
  }
  const legislator = [...offices.values()].find((o) => o.role === "legislator");
  const governor = [...offices.values()].find((o) => o.role === "governor");
  if (!legislator || !governor) {
    skipped.push(
      `${where} (legislator ${!!legislator}, governor ${!!governor})`,
    );
    return false;
  }

  // Two years of days from the start: each entry has a unique id and a cited source.
  const start = makeIsoDate(core.date);
  const seen = new Set<string>();
  const kinds = new Map<string, Set<string>>([
    ["legislator", new Set()],
    ["governor", new Set()],
  ]);
  for (let n = 0; n < 730; n++) {
    const date = addDays(start, n);
    for (const office of [legislator, governor])
      for (const entry of stateDay(api, office, date)) {
        expect(seen.has(entry.id), `${where} ${entry.id}`).toBe(false);
        seen.add(entry.id);
        expect(entry.holderId).toBe(office.personId);
        expect(entry.source.citation.length, entry.id).toBeGreaterThan(0);
        kinds.get(office.role)!.add(entry.kind);
      }
  }
  // A legislator has days of office whether the legislature sits or not.
  expect([...kinds.get("legislator")!].length, where).toBeGreaterThan(0);

  // The per diem: where the place pays one, a member who sat is paid from the state's treasury.
  const rate = perDiemOf(lawChain(api).stateKey, core.seed);
  advanceCore(core, addDays(start, 400));
  const paid = perDiemPaidTo(api, legislator.personId);
  if (rate && rate.basis !== "none" && rate.dailyMinor > 0 && paid.length) {
    for (const row of paid) {
      expect(row.paidMinor, `${where} ${row.id}`).toBeLessThanOrEqual(
        row.days * rate.dailyMinor + row.shortMinor,
      );
      expect(row.citation, row.id).toContain(lawChain(api).stateKey);
    }
  }
  return true;
}

it("gives a state legislator and the governor a calendar from the place's data, and pays the per diem", () => {
  const skipped: string[] = [];
  for (let attempt = 0; attempt < 5; attempt++) {
    const seed =
      (attempt === 0 && process.env.OFFICE_STATE_SEED) ||
      randomBytes(8).toString("hex");
    if (playPlace(seed, skipped)) return;
  }
  throw new Error(`No drawn place seated both: ${skipped.join("; ")}`);
}, 1_800_000);

// The district office, end to end, in the played world (pool:
// office-district-office). The played world opens no cases of its own in its
// first months, so two are placed between real residents and the state
// legislator: this proves the office's rule, not the arrival of cases. The
// legislator holds office hours on a district day and decides one; the other
// waits past its deadline and the office's staff or habit decides it.
it("a state legislator's district office decides one case at office hours and leaves the other to the office, each read by the resident's impression", () => {
  const skipped: string[] = [];
  for (let attempt = 0; attempt < 5; attempt++) {
    const seed = randomBytes(8).toString("hex");
    const place = drawPlace(seed, "office-district");
    const where = `${place.name} [${place.key}], seed ${seed}`;
    setBookkeeping(false);
    const { core } = buildBenchWorld(seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(core);
    const terms = api
      .moduleState(OFFICES_MODULE_ID)
      .table("terms")
      .rows() as unknown as TermRow[];
    let legislator: StateOffice | undefined;
    for (const term of terms) {
      if (term.status !== "serving" || !term.personId) continue;
      const office = stateOfficeOf(api, term.personId);
      if (office?.role === "legislator") legislator = office;
    }
    const officials = new Set(terms.map((t) => t.personId));
    const residents = [...core.people.values()]
      .filter((p) => p.alive && p.tier !== "husk" && !officials.has(p.id))
      .slice(0, 2);
    if (!legislator || residents.length < 2) {
      skipped.push(where);
      continue;
    }
    // The first district day on the legislator's calendar.
    const start = makeIsoDate(core.date);
    let entry: ReturnType<typeof stateDay>[number] | undefined;
    for (let n = 0; n < 60 && !entry; n++)
      entry = stateDay(api, legislator, addDays(start, n)).find(
        (row) => row.kind === "district-office",
      );
    expect(entry, `${where}: a district day`).toBeDefined();
    const cases = api.moduleState(CASES_MODULE_ID).table("cases");
    const put = (resident: string, respondBy: string): CaseRow => {
      const row: CaseRow = {
        id: `case:${resident}:${core.date}`,
        personId: resident,
        officialId: legislator!.personId,
        problem: "looking-for-work",
        severity: 0.5,
        facts: { cushionMonths: 1 },
        opened: core.date,
        respondBy,
        status: "open",
        handledBy: null,
        outcome: null,
      };
      cases.put(row as unknown as ModuleRow);
      return row;
    };
    const held = put(residents[0]!.id, addDays(start, 365));
    const before = impressionOf(api, held.personId, legislator.personId);
    const result = actOn(api, entry!, {
      kind: "office-hours",
      hold: true,
      cases: { [held.id]: "help" },
    });
    // The legislator decided the case on their desk, and the resident's
    // impression of them moved by the outcome.
    const decided = allCases(api).find((row) => row.id === held.id)!;
    expect(decided.handledBy, where).toBe("official");
    expect(decided.status, where).toBe("helped");
    expect(result.recordIds, where).toContain(held.id);
    const after = impressionOf(api, held.personId, legislator.personId);
    expect(after, where).not.toBeNull();
    expect(after?.warmth ?? 0, where).not.toBe(before?.warmth ?? 0);
    // A case that arrives after the hours waits until its deadline; then the
    // office's staff, or its habit where it has none, decides it.
    const waiting = put(residents[1]!.id, addDays(core.date, 30));
    // The engine schedules a case's due day when it opens one; this fixture row
    // gets the same entry.
    api.moduleCalendar(CASES_MODULE_ID).schedule({
      key: `case-due:${waiting.id}`,
      date: waiting.respondBy,
      kind: "case-due",
      source: {
        tag: "ESTIMATED",
        citation: "the office's response window",
        asOf: core.date,
        estimatedFrom: "caseResponseDays",
      },
      sourceRecordIds: [waiting.id],
    });
    advanceCore(core, addDays(makeIsoDate(core.date), 60));
    const left = allCases(api).find((row) => row.id === waiting.id)!;
    expect(left.status, where).not.toBe("open");
    expect(["staff", "office"], where).toContain(left.handledBy);
    return;
  }
  throw new Error(`No drawn place seated a legislator: ${skipped.join("; ")}`);
}, 1_800_000);

// A member asks the majority leader to schedule a bill (pool:
// office-caucus-and-leadership). The leader answers from their party, their
// tie to the member and their own traits, keeping the reasons; the answer
// decides whether the legislature puts the bill on its next sitting, so the
// floor's agenda differs between a yes and a no.
it("a floor leader's answer to a member's request decides whether the bill is on the floor's agenda, and keeps the reasons", () => {
  const skipped: string[] = [];
  for (let attempt = 0; attempt < 6; attempt++) {
    const seed = randomBytes(8).toString("hex");
    const place = drawPlace(seed, "office-leader");
    const where = `${place.name} [${place.key}], seed ${seed}`;
    setBookkeeping(false);
    const { core } = buildBenchWorld(seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(core);
    const terms = api
      .moduleState(OFFICES_MODULE_ID)
      .table("terms")
      .rows() as unknown as TermRow[];
    let found:
      | {
          chamber: string;
          leader: string;
          ally: StateOffice;
          rival: StateOffice;
        }
      | undefined;
    for (const term of terms) {
      if (term.status !== "serving" || !term.personId) continue;
      const office = stateOfficeOf(api, term.personId);
      if (office?.role !== "legislator") continue;
      const leader = leaderOf(api, office.officeId, "majority-leader");
      if (!leader) continue;
      const roll = members(api, office.officeId);
      const party = roll.find((t) => memberKey(t) === leader)?.party;
      const people = roll
        .filter(
          (t) =>
            t.personId &&
            core.people.has(t.personId) &&
            memberKey(t) !== leader,
        )
        .map((t) => ({ t, office: stateOfficeOf(api, t.personId!) }))
        .filter((row) => row.office?.role === "legislator");
      const ally = people.find((row) => row.t.party === party)?.office;
      const rival = people.find((row) => row.t.party !== party)?.office;
      if (ally && rival) {
        found = { chamber: office.officeId, leader, ally, rival };
        break;
      }
    }
    if (!found) {
      skipped.push(where);
      continue;
    }
    const answer = lawHere(api).find((row) => row.value !== null);
    expect(answer, where).toBeDefined();
    const bill = (sponsor: StateOffice) =>
      draftBill(api, {
        bodyOfficeId: found!.chamber,
        sponsorId: sponsor.personId,
        provisions: [
          {
            kind: "law-amount",
            series: answer!.series,
            value: answer!.value! + 1,
          },
        ],
      });
    const friendly = bill(found.ally);
    const hostile = bill(found.rival);
    const yes = askLeaderForHearing(api, found.ally.personId, friendly.id);
    const no = askLeaderForHearing(api, found.rival.personId, hostile.id);
    expect(yes.granted, where).toBe(true);
    expect(no.granted, where).toBe(false);
    expect(yes.leaderId, where).toBe(found.leader);
    expect(Object.keys(yes.reasons).sort(), where).toEqual([
      "party",
      "tie",
      "traits",
    ]);
    // The agenda follows the answer: the granted bill is on its sitting, the refused one is on no sitting.
    expect(yes.scheduledFor, where).toBeTruthy();
    expect(no.scheduledFor, where).toBeNull();
    const agenda = floorAgendaOn(api, yes.scheduledFor!).map((row) => row.id);
    expect(agenda, where).toContain(friendly.id);
    expect(agenda, where).not.toContain(hostile.id);
    // The refused member comes back with something the leader can accept: a
    // favor owed, else backing the leader's own item. Nothing accepted leaves
    // the refusal standing; an accepted deal is read again, cited by the
    // obligation it created, and may put the bill on the floor.
    let offered = false;
    for (const kind of ["favor", "back-their-item"] as const) {
      const dealt = offerDeal(api, {
        billId: hostile.id,
        memberId: found.leader,
        kind,
      });
      if (!dealt.accepted) continue;
      offered = true;
      const again = reanswerLeaderRequest(
        api,
        found.rival.personId,
        hostile.id,
      )!;
      expect(again.offer?.kind, where).toBe(kind);
      expect(again.offer?.earlierReasons, where).toEqual(no.reasons);
      expect(again.reasons.offer, where).toBeGreaterThan(0);
      expect(
        api
          .moduleState(LEGISLATURE_MODULE_ID)
          .table("obligations")
          .get(again.offer!.obligationId),
        `${where}: ${again.offer!.obligationId}`,
      ).toBeDefined();
      if (again.granted) {
        expect(again.scheduledFor, where).toBeTruthy();
        expect(
          floorAgendaOn(api, again.scheduledFor!).map((row) => row.id),
          where,
        ).toContain(hostile.id);
      }
      break;
    }
    if (!offered) {
      // No leader took a real offer here: the refusal stands (the engine's
      // own answer), and a deal recorded the way offerDeal records an
      // accepted favor is read again and cited (an edge-case fixture).
      expect(
        reanswerLeaderRequest(api, found.rival.personId, hostile.id)?.reasons,
        where,
      ).toEqual(no.reasons);
      const legislature = api.moduleState(LEGISLATURE_MODULE_ID);
      const row = legislature.table("bills").get(hostile.id) as unknown as {
        deals: readonly object[];
      };
      const index = row.deals.length;
      legislature.table("bills").put({
        ...row,
        deals: [
          ...row.deals,
          {
            memberId: found.leader,
            kind: "favor",
            terms: "favor",
            date: api.state.date,
            status: "accepted",
          },
        ],
      } as never);
      legislature.table("obligations").put({
        id: `obligation:${hostile.id}:${found.leader}:${index}`,
        owedBy: found.rival.personId,
        owedTo: found.leader,
        kind: "favor",
        billId: hostile.id,
        date: api.state.date,
        settled: false,
      } as never);
      const again = reanswerLeaderRequest(
        api,
        found.rival.personId,
        hostile.id,
      )!;
      expect(again.offer?.obligationId, where).toBe(
        `obligation:${hostile.id}:${found.leader}:${index}`,
      );
      expect(again.reasons.offer, where).toBeGreaterThan(0);
      expect(again.offer?.earlierReasons, where).toEqual(no.reasons);
    }
    return;
  }
  throw new Error(
    `No drawn place seated a leader and members of both sides: ${skipped.join("; ")}`,
  );
}, 1_800_000);
