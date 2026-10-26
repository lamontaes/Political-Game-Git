import { buildBenchWorld } from "../../src/bench/world";
import { ownerOf, BUSINESS_MODULE_ID } from "../../src/core2/modules/business";
import { budgetsOf } from "../../src/core2/modules/budgets";
import { treasuryMonthsOf } from "../../src/core2/budgets-treasury";
import { appointGovernor } from "../../src/core2/office-day-state";
import {
  appointmentsIn,
  EXECUTIVE_MODULE_ID,
} from "../../src/core2/modules/executive";
import {
  OFFICES_MODULE_ID,
  type TermRow,
} from "../../src/core2/modules/offices";
import {
  proposeAsExecutive,
  offerDeal,
  members,
  memberKey,
  memberPosition,
  committeeRecords,
  votesOn,
  scheduleVote,
  billOf,
  LEGISLATURE_MODULE_ID,
} from "../../src/core2/modules/legislature";
import { decideDeskItems } from "../../src/core2/modules/office-day";
import { lineItemVetoOf } from "../../src/core2/state-item-veto";
/** A played year, selecting existing officeholders rather than inserting fixtures. */
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { BenchPlayer } from "../../src/bench/player";
import { coreAPI } from "../../src/core2/state";
import { gameStartDate } from "../../src/core2/game-start";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { townSeats } from "../../src/core2/modules/offices";
import {
  officeActsOf,
  deskWaiting,
  leaveDeskToCharacter,
} from "../../src/core2/modules/office-day";
import {
  heldFederal,
  releaseFederal,
} from "../../src/core2/office-day-federal";
import {
  actOn,
  waitingEntries,
  startStateDay,
  resultsOf,
  perDiemPaidTo,
} from "../../src/core2/office-day-state";
import { stancesOf } from "../../src/core2/modules/views";
import { drawPlace } from "../core2-year/place";

setBookkeeping(false);
const seed = process.argv[2] ?? randomBytes(8).toString("hex");
const place = drawPlace(seed, "office-federal");
const world = buildBenchWorld(seed, gameStartDate(), {
  twoLevel: true,
  placeKey: place.key,
});
const api = coreAPI(world.core);
const player = new BenchPlayer(world.core, world.director);
const seats = townSeats(api);
const governor = seats.find((s) => s.office.kind === "governor")?.holder
  ?.personId;
const member = seats.find((s) => s.office.kind.startsWith("legislature-"))
  ?.holder?.personId;
assert(governor && member, `No sitting state offices cover ${place.name}`);
const start = world.core.date;
const started = performance.now();
let holds = 0;
let budgetBillId: string | null = null;
let budgetEffect: {
  budgetId: string;
  date: string;
  before: Record<string, number>;
  after: Record<string, number>;
} | null = null;
function playUntil(date: string, personId: string) {
  player.select(personId);
  startStateDay(api);
  for (let guard = 0; guard < 20000; guard++) {
    if (player.pollingPlace) player.leavePolls();
    const packet = player.packet;
    if (packet?.kind === "stop") {
      for (const entry of waitingEntries(api, personId)) {
        if (
          entry.stop &&
          entry.date <= addDays(makeIsoDate(api.state.date), 1)
        ) {
          actOn(api, entry);
          holds++;
        }
      }
      for (const key of heldFederal(api)) releaseFederal(api, key);
      for (const bill of deskWaiting(api)) {
        if (bill.id === budgetBillId && lineItemVetoOf(place.state)?.lineItem) {
          const before = budgetsOf(api, place.state).at(-1)!;
          const law = lineItemVetoOf(place.state)!;
          const selections = [{ index: 0, remainingMinor: 0 }];
          if (
            law.reduce &&
            !law.excludedLines?.includes("administration") &&
            !law.reductionExcludedLines?.includes("administration")
          )
            selections.push({
              index: 1,
              remainingMinor: bill.provisions[1]!.value / 2,
            });
          decideDeskItems(api, bill.id, selections);
          budgetEffect = {
            budgetId: before.id,
            date: api.state.date,
            before: { ...before.spendingMinor },
            after: {
              ...budgetsOf(api, place.state).find(
                (row) => row.id === before.id,
              )!.spendingMinor,
            },
          };
        } else leaveDeskToCharacter(api, bill.id);
      }
      player.resume({ kind: "stop", pauseId: packet.pauseId });
    } else if (packet?.kind === "choice") {
      player.resume({ kind: "own-choice", pauseId: packet.pauseId });
    } else if (api.state.date >= date) return;
    else player.advance("calendar", addDays(makeIsoDate(date), 1));
  }
  throw new Error(`Did not reach ${date}; reached ${api.state.date}`);
}
playUntil(addDays(makeIsoDate(start), 1), governor);
const post = [...appointmentsIn(api, place.state)].sort((a, b) =>
  a.post.localeCompare(b.post),
)[0];
const nominee = [...api.state.people.values()]
  .filter(
    (p) =>
      p.alive &&
      !p.jobId &&
      Number(start.slice(0, 4)) - Number(p.birthDate.slice(0, 4)) >= 18 &&
      !(
        api
          .moduleState(OFFICES_MODULE_ID)
          .table("terms")
          .query("byPerson", [p.id]) as unknown as TermRow[]
      ).some((t) => t.status === "serving") &&
      !appointmentsIn(api, place.state).some((a) => a.holderId === p.id),
  )
  .sort((a, b) => a.id.localeCompare(b.id))[0];
const appointment =
  post && nominee ? appointGovernor(api, post.post, nominee.id) : null;
const chamber = seats.find((s) => s.office.kind.startsWith("legislature-"))!;
const adoptedBudget = budgetsOf(api, place.state).at(-1)!;
const proposed = proposeAsExecutive(api, {
  bodyOfficeId: chamber.office.id,
  provisions: [
    {
      kind: "budget-line",
      line: "parks",
      value: 1000000,
      of: adoptedBudget.spendingMinor.parks,
    },
    {
      kind: "budget-line",
      line: "administration",
      value: 2000000,
      of: adoptedBudget.spendingMinor.administration,
    },
  ],
});
budgetBillId = proposed?.billId ?? null;
const negotiations = [];
if (budgetBillId) {
  // Use ordinary offers; each member accepts or declines from their own reasons.
  const bodies = new Set(
    seats
      .filter((s) => s.office.kind.startsWith("legislature-"))
      .map((s) => s.office.id),
  );
  for (const body of bodies) {
    for (const term of members(api, body)) {
      const memberId = memberKey(term);
      if (memberPosition(api, budgetBillId, memberId).total > 0) continue;
      const result = offerDeal(api, {
        billId: budgetBillId,
        memberId,
        kind: "back-their-item",
      });
      negotiations.push({ memberId, ...result });
    }
  }
  scheduleVote(api, budgetBillId);
}
playUntil(addDays(makeIsoDate(start), 60), governor);
playUntil(addDays(makeIsoDate(start), 365), member);
const governorActs = resultsOf(api, governor);
const memberActs = resultsOf(api, member);
assert(governorActs.length > 0);
assert(memberActs.length > 0, `No member acts at ${api.state.date}: ${member}`);
assert(
  officeActsOf(api, governor).some((a) =>
    governorActs.some((r) => r.id === a.recordId),
  ),
);
assert(
  officeActsOf(api, member).some((a) =>
    memberActs.some((r) => r.id === a.recordId),
  ),
);
const speechIds = new Set(
  governorActs
    .filter((r) => r.kind === "state-of-the-state")
    .flatMap((r) => r.recordIds),
);
const reached = [...api.state.people.keys()].flatMap((id) =>
  stancesOf(api, id).flatMap((stance) =>
    stance.causes
      .filter((c) => speechIds.has(c.eventId))
      .map((cause) => ({ personId: id, stance: stance.topic, cause })),
  ),
);
console.log(
  JSON.stringify(
    {
      seed,
      place,
      start,
      end: api.state.date,
      seconds: (performance.now() - started) / 1000,
      governor,
      member,
      holds,
      governorActs,
      appointment,
      nomination:
        post && nominee
          ? api
              .moduleState(EXECUTIVE_MODULE_ID)
              .table("nominations")
              .get(
                `nomination:${place.state}:${post.post}:${nominee.id}:${addDays(makeIsoDate(start), 1)}`,
              )
          : null,
      proposed,
      negotiations,
      proposedBill: budgetBillId ? billOf(api, budgetBillId) : null,
      proposedCommittees: budgetBillId
        ? committeeRecords(api, budgetBillId)
        : [],
      proposedVotes: budgetBillId ? votesOn(api, budgetBillId) : [],
      budgetEffect,
      appropriationRecipients: treasuryMonthsOf(api, place.state)
        .slice(0, 3)
        .flatMap((month) =>
          month.paymentIds
            .filter((id) => id.includes(":administration:organization_"))
            .map((paymentId) => {
              const organizationId = paymentId
                .split(":")
                .find((part) => part.startsWith("organization_"))!;
              return {
                paymentId,
                monthId: month.id,
                organizationId,
                ownerId: ownerOf(api, organizationId),
                draws: api
                  .moduleState(BUSINESS_MODULE_ID)
                  .table("draws")
                  .query("byOrganization", [organizationId])
                  .filter((row) => row.date === month.date),
              };
            }),
        ),
      itemVeto: budgetBillId
        ? api
            .moduleState(LEGISLATURE_MODULE_ID)
            .table("itemVetoes")
            .get(budgetBillId)
        : null,
      memberActs: memberActs.slice(0, 12),
      memberActCount: memberActs.length,
      perDiem: perDiemPaidTo(api, member),
      treasury: treasuryMonthsOf(api, place.state).slice(0, 3),
      reached: reached.slice(0, 10),
      reachedCount: reached.length,
    },
    null,
    2,
  ),
);
