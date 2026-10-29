/**
 * A bill drafted in a sitting legislature reaches its floor (pool item
 * laws-floor-takes-every-chamber-bill), in a world from buildBenchWorld in a
 * place drawn from all 56 on a seed nobody chose (GOLDEN_PATH_SEED pins
 * one). After the session opened, the player, a member of the town's state
 * legislature, drafts a bill from their seat; a member of the U.S. House
 * drafts one; and another state member files one. Each gets a floor date
 * from the floor leader's calendar, is on the floor's agenda the day before
 * with a whip count of every member, and the floor week takes it up, on the
 * session's record: a roll call by member, or its committee's recorded vote
 * where the committee kept it from the floor.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { seatAct } from "../bench/legislature";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { lawChain } from "./modules/laws";
import {
  billOf,
  draftBill,
  FEDERAL_HOUSE,
  floorAgendaOn,
  LEGISLATURE_MODULE_ID,
  memberKey,
  members,
  votesOn,
  whipCount,
  type CommitteeRecord,
} from "./modules/legislature";
import {
  floorDateOf,
  legislativeSessionsOf,
  windowsIn,
} from "./modules/world-legislating";
import { coreAPI } from "./state";
import type { CoreState } from "./types";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const DRAWS = 6;

it("a bill drafted after the session opened gets a floor date, is whipped the day before and voted by every member", () => {
  setBookkeeping(false);
  const tried: string[] = [];
  for (let draw = 0; draw < DRAWS; draw += 1) {
    const place = drawPlace(`${seed}:${draw}`, "floor-every-bill");
    const where = `${place.name} (${place.key}), run seed ${seed} draw ${draw}, world seed ${place.seed}`;
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(core);
    const today = () => makeIsoDate(core.date);
    const stateKey = lawChain(api).levels.find(
      (l) => l.level === "state",
    )?.jurisdiction;
    // The state's session this year that leaves the floor two months.
    const window = stateKey
      ? windowsIn(stateKey, Number(today().slice(0, 4))).find(
          (w) => w.adjournAt > addDays(today(), 60),
        )
      : undefined;
    if (!stateKey || !window) {
      tried.push(`${where}: no state session sitting this year`);
      continue;
    }
    const opened = addDays(
      makeIsoDate(window.conveneAt > today() ? window.conveneAt : today()),
      1,
    );
    advanceCore(core, opened);
    const sessions = legislativeSessionsOf(api);
    const state = sessions.find(
      (s) => s.jurisdiction === stateKey && s.adjournAt > today(),
    );
    const congress = sessions.find(
      (s) => s.jurisdiction === "US" && s.adjournAt > today(),
    );
    if (!state?.bodyOfficeId || !congress || !state.filings.length) {
      tried.push(
        `${where}: no ${state ? "filing" : "state session"}${congress ? "" : " or Congress"} on ${today()}`,
      );
      continue;
    }
    const people = (officeId: string) =>
      members(api, officeId).flatMap((t) =>
        t.personId && core.people.has(t.personId) ? [t.personId] : [],
      );
    const [player, colleague] = people(state.bodyOfficeId);
    const representative = people(FEDERAL_HOUSE)[0];
    if (!player || !colleague || !representative) {
      tried.push(`${where}: too few seated members who are full people`);
      continue;
    }
    (core as CoreState as unknown as { playerId: string }).playerId = player;
    const filing = state.filings[0]!;
    const theirs = congress.filings[0];
    const drafted = [
      seatAct(core, player, {
        kind: "draft",
        officeId: state.bodyOfficeId,
        question: filing.question,
        value: filing.direction,
      }),
      draftBill(api, {
        bodyOfficeId: FEDERAL_HOUSE,
        sponsorId: representative,
        provisions: [
          {
            kind: "policy-question",
            question: theirs?.question ?? filing.question,
            value: theirs?.direction ?? filing.direction,
          },
        ],
      }),
      draftBill(api, {
        bodyOfficeId: state.bodyOfficeId,
        sponsorId: colleague,
        provisions: [
          {
            kind: "policy-question",
            question: filing.question,
            value: -filing.direction,
          },
        ],
      }),
    ];
    // Each gets its floor date the day it is drafted.
    const scheduled = new Map(
      drafted.map((b) => [b.id, floorDateOf(api, b.id)] as const),
    );
    for (const bill of drafted) {
      const session = bill.bodyOfficeId === FEDERAL_HOUSE ? congress : state;
      const date = scheduled.get(bill.id);
      expect(date, `${where}: ${bill.id} has no floor date`).toBeTruthy();
      expect(date! < session.adjournAt, `${where}: ${bill.id}`).toBe(true);
    }
    // The day before each floor date: the bills on its agenda, and the whip
    // count; then the floor day itself.
    const whips = new Map<string, string>();
    for (let step = 0; step < 24; step += 1) {
      const waiting = drafted.filter(
        (b) => billOf(api, b.id).status === "drafted",
      );
      const dates = waiting.flatMap((b) => floorDateOf(api, b.id) ?? []).sort();
      if (!dates.length) break;
      const date = dates[0]!;
      const eve = addDays(makeIsoDate(date), -1);
      if (eve > today()) advanceCore(core, eve);
      const ahead = new Set(floorAgendaOn(api, date).map((b) => b.id));
      for (const b of waiting) {
        if (floorDateOf(api, b.id) !== date) continue;
        expect(
          ahead.has(b.id),
          `${where}: ${b.id} not on ${date}'s agenda`,
        ).toBe(true);
        const whip = whipCount(api, b.id);
        for (const c of whip)
          expect(
            c.yes.length + c.no.length + c.undecided.length,
            `${where}: ${b.id} whip count in ${c.chamber}`,
          ).toBe(members(api, c.chamber).length);
        whips.set(
          b.id,
          whip
            .map(
              (c) =>
                `${c.chamber} ${c.yes.length} for, ${c.no.length} against, ${c.undecided.length} undecided`,
            )
            .join("; "),
        );
      }
      advanceCore(core, date);
    }
    const lines: string[] = [];
    for (const bill of drafted) {
      const session = bill.bodyOfficeId === FEDERAL_HOUSE ? congress : state;
      const after = billOf(api, bill.id);
      expect(after.status, `${where}: ${bill.id} never voted`).not.toBe(
        "drafted",
      );
      expect(whips.has(bill.id), `${where}: ${bill.id} never whipped`).toBe(
        true,
      );
      const record = legislativeSessionsOf(api)
        .find((s) => s.id === session.id)!
        .bills.find((b) => b.number === after.number);
      expect(record?.fate, `${where}: ${bill.id}`).toBe("voted");
      expect(
        record!.decidedOn <= scheduled.get(bill.id)!,
        `${where}: ${bill.id}`,
      ).toBe(true);
      // Every member of the chamber it was introduced in voted on the
      // record; or its committee kept it from the floor on the record: each
      // member's vote where it was heard, the chair's hold where it was not.
      const votes = votesOn(api, bill.id);
      const committee = api
        .moduleState(LEGISLATURE_MODULE_ID)
        .table("committees")
        .get(`committee:${bill.id}:${bill.bodyOfficeId}`) as unknown as
        CommitteeRecord | undefined;
      const held = !votes.length && committee?.reported === false;
      if (held) {
        expect(
          [...core.durableLog.values()].find((e) => e.id === committee.id)
            ?.kind,
          `${where}: ${committee.id}`,
        ).toBe(
          committee.heard ? "committee-hearing" : "bill-held-in-committee",
        );
        expect(
          committee.heard ? committee.votes.map((v) => v.memberId).sort() : [],
          `${where}: ${committee.id}`,
        ).toEqual(committee.heard ? [...committee.memberIds].sort() : []);
      } else
        for (const t of members(api, bill.bodyOfficeId))
          expect(
            votes.some((v) => v.memberId === memberKey(t)),
            `${where}: ${bill.id} (${after.status}, ${votes.length} votes) no vote by ${memberKey(t)}`,
          ).toBe(true);
      lines.push(
        `${bill.id} (${after.number}), sponsor ${bill.sponsorId}, drafted ${bill.introduced}, floor date ${scheduled.get(bill.id)}, whip the day before: ${whips.get(bill.id)}; voted ${record!.decidedOn}: ${after.status}, ${held ? `held in committee ${committee.id}, ${committee.heard ? `${committee.yes} for and ${committee.no} against` : `not heard by chair ${committee.chairId}`}` : `${votes.length} votes, e.g. vote:${bill.id}:${votes[0]?.memberId} ${votes[0]?.vote}`}`,
      );
    }
    process.stdout.write(
      `FLOOR ${where}: ${stateKey} session ${state.conveneAt} to ${state.adjournAt}, ${state.filings.length} filings, ${state.perWeek} a week; Congress ${congress.filings.length} filings, ${congress.perWeek} a week\n  ${lines.join("\n  ")}\n`,
    );
    return;
  }
  throw new Error(
    `no drawn place in ${DRAWS} had a sitting state legislature (seed ${seed}): ${tried.join("; ")}`,
  );
}, 1_800_000);
