import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { gameStartDate } from "../core2/game-start";
import { advanceCore } from "../core2/life";
import { coreAPI } from "../core2/state";
import {
  LEGISLATURE_MODULE_ID,
  memberKey,
  members,
} from "../core2/modules/legislature";
import { townSeats } from "../core2/modules/offices";
import {
  ELECTIONS_MODULE_ID,
  fileCandidacy,
  openContests,
} from "../core2/modules/elections";
import { appointmentsIn } from "../core2/modules/executive";
import { governments } from "../core2/modules/budgets";
import { lawChain } from "../core2/modules/laws";
import { filingClerkFor, TOWN_CLERK_POST } from "../core2/modules/filing-clerk";
import {
  outletsHere,
  PRESS_MODULE_ID,
  requestInterview,
} from "../core2/modules/press";
import { VOTING_MODULE_ID, pollingPlaceOf } from "../core2/modules/voting";
import { CIVIC_FILLS, civicFill } from "./civic-roles";
import type { Moment } from "./types";

// The civic roles a scene's type names (clerk, chair, members, press, poll
// workers) filled from the records that carry them, in a played world on a
// place and seed nobody chose. A moment is built around each record the
// world wrote; the producers that fire these scenes from their causes are the
// next families (pool item director-civic-producers).
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const place = drawPlace(seed, "civic-roles");
const world = buildBenchWorld(place.seed, gameStartDate(), {
  placeKey: place.key,
  twoLevel: true,
});
const { core } = world;
const api = coreAPI(core);
advanceCore(core, addDays(makeIsoDate(core.date), 365));
const where = `${place.name} (${place.key}), seed ${seed}`;

const momentFor = (personId: string, causeId: string): Moment =>
  ({
    id: `civic-test:${causeId}`,
    personId,
    date: core.date,
    label: "civic-test",
    causeId,
    causeKind: "civic-test",
    counterpartIds: [],
  }) as unknown as Moment;

describe(`civic role fills in ${where}`, () => {
  it("fills the poll workers from the voting engine's polling place", () => {
    expect(api.state.modules.has(VOTING_MODULE_ID), where).toBe(true);
    let checked = 0;
    for (const person of core.people.values()) {
      const place = pollingPlaceOf(api, person.id, core.date);
      if (!place?.pollWorkers?.ids.length) continue;
      const workers = civicFill(
        "poll-workers",
        core,
        momentFor(person.id, place.id),
        new Set(),
      );
      expect(workers.length, where).toBeGreaterThan(0);
      for (const id of workers) {
        expect(place.pollWorkers.ids).toContain(id);
        expect(id).not.toBe(person.id);
        expect(core.people.get(id)?.alive).toBe(true);
      }
      checked += 1;
      if (checked >= 5) break;
    }
    expect(checked, where).toBeGreaterThan(0);
  });

  it("fills the press with the reporter an interview record names", () => {
    expect(api.state.modules.has(PRESS_MODULE_ID), where).toBe(true);
    const holder = townSeats(api).find((seat) => seat.holder?.personId)?.holder
      ?.personId;
    expect(holder, where).toBeTruthy();
    let named = 0;
    for (const outlet of outletsHere(api)) {
      const row = requestInterview(api, {
        outletId: outlet.id,
        personId: holder!,
      });
      if (!row.reporterId) continue;
      const press = civicFill(
        "press",
        core,
        momentFor(holder!, row.id),
        new Set(),
      );
      expect(press, `${where}: ${row.id}`).toEqual([row.reporterId]);
      named += 1;
    }
    expect(named, where).toBeGreaterThan(0);
  });

  it("fills the chair and the members from the body of a bill", () => {
    const bills = api
      .moduleState(LEGISLATURE_MODULE_ID)
      .table("bills")
      .rows() as unknown as { id: string; bodyOfficeId: string }[];
    expect(bills.length, where).toBeGreaterThan(0);
    let withMembers = 0;
    let withChair = 0;
    for (const bill of bills.slice(0, 30)) {
      const roll = members(api, bill.bodyOfficeId).map(memberKey);
      const subject = [...core.people.keys()][0]!;
      const seated = civicFill(
        "members",
        core,
        momentFor(subject, bill.id),
        new Set(),
      );
      for (const id of seated) {
        expect(roll).toContain(id);
        expect(id).not.toBe(subject);
      }
      if (seated.length) withMembers += 1;
      const chair = civicFill(
        "chair",
        core,
        momentFor(subject, bill.id),
        new Set(),
      );
      expect(chair.length, `${where}: ${bill.id}`).toBeLessThanOrEqual(1);
      if (chair.length) withChair += 1;
    }
    expect(withMembers, where).toBeGreaterThan(0);
    expect(withChair, where).toBeGreaterThan(0);
  });

  it("has no teller fill: the story that reached a person is the source, not a person", () => {
    // Owner, Oct 16: a person learns a law changed their money mostly from the
    // news or a feed, so no one is invented to tell them; a person is a teller
    // only where a conversation record shows one.
    expect(CIVIC_FILLS.has("teller")).toBe(false);
    const reader = [...core.people.values()].find((p) => p.alive)!;
    expect(
      civicFill(
        "teller",
        core,
        momentFor(reader.id, "event:law.effect-learned:no-teller"),
        new Set(),
      ),
      where,
    ).toEqual([]);
  });

  it("fills the clerk with the person the filing office's records name", () => {
    const contests = openContests(api);
    expect(contests.length, where).toBeGreaterThan(0);
    const subject = [...core.people.keys()][0]!;
    let named = 0;
    let paid = 0;
    for (const contest of contests) {
      const clerk = filingClerkFor(api, contest.id);
      const filled = civicFill(
        "clerk",
        core,
        momentFor(subject, contest.id),
        new Set(),
      );
      if (!clerk) {
        // No record names one (an election board or commission): no one is invented.
        expect(filled, `${where}: ${contest.id}`).toEqual([]);
        continue;
      }
      named += 1;
      const person = core.people.get(clerk.personId);
      expect(person?.alive, `${where}: ${clerk.recordId}`).toBe(true);
      expect(filled, `${where}: ${contest.id}`).toEqual([clerk.personId]);
      if (clerk.basis === "town-appointment") {
        // The clerk is on the town government's payroll, a job the budget pays.
        const job = core.jobs.get(
          `job:public:town:${TOWN_CLERK_POST}:${clerk.personId}`,
        );
        expect(job, `${where}: ${clerk.recordId}`).toBeTruthy();
        expect(job?.endsAt).toBeUndefined();
        expect(job?.title).toBe(clerk.title);
        expect(
          governments(api).some(
            (g) => g.organizationId === job?.organizationId,
          ),
          where,
        ).toBe(true);
        paid += 1;
      }
    }
    // A place whose races all file with a state election board names no one;
    // anywhere with a town or county race, the records name a clerk.
    if (!named)
      expect(
        contests
          .filter(
            (c) =>
              c.family === "municipalOffice" || c.family === "countyOffice",
          )
          .map((c) => c.id),
        where,
      ).toEqual([]);
    // Where the town appoints a clerk, that clerk is on the town payroll.
    const appointed = appointmentsIn(api, lawChain(api).townPlaceId).some(
      (row) => row.post === TOWN_CLERK_POST,
    );
    if (appointed && contests.some((c) => c.family === "municipalOffice"))
      expect(paid, where).toBeGreaterThan(0);
  });

  it("finds the same clerk from a filing's own record", () => {
    // A town resident files through the elections engine's own writer; the
    // filing and its announcement name the contest, and so the clerk.
    const contest = openContests(api).find((row) =>
      filingClerkFor(api, row.id),
    );
    // A place whose filing office is a state board has no clerk to find.
    if (!contest) return;
    const clerk = filingClerkFor(api, contest.id)!;
    const subject = [...core.people.values()].find(
      (person) =>
        person.alive &&
        person.id !== clerk.personId &&
        fileCandidacy(api, {
          personId: person.id,
          contestId: contest.id,
          platform: [],
        }).status === "on-ballot",
    );
    expect(subject, `${where}: ${contest.id}`).toBeTruthy();
    const filing = (
      api
        .moduleState(ELECTIONS_MODULE_ID)
        .table("filings")
        .rows() as unknown as { id: string; contestId: string }[]
    ).find((row) => row.contestId === contest.id);
    expect(filing, where).toBeTruthy();
    for (const causeId of [filing!.id, `candidate-filed:${filing!.id}`])
      expect(
        civicFill("clerk", core, momentFor(subject!.id, causeId), new Set()),
        `${where}: ${causeId}`,
      ).toEqual([clerk.personId]);
  });
}, 1_800_000);
