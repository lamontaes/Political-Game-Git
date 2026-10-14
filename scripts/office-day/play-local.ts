/**
 * Office play proof (OFFICE-LOCAL): ten days in office as a sitting local
 * officeholder in a place drawn from all 56, with the place and seed named.
 *
 *   node --max-old-space-size=8192 --import tsx scripts/office-day/play-local.ts council <draw-key>
 *   node --max-old-space-size=8192 --import tsx scripts/office-day/play-local.ts mayor <draw-key>
 *
 * The player controls a sitting official (dev mode's custom start), drafts a
 * bill and places it on the body's agenda, skips to three days before the
 * meeting, and then plays ten days: they vote their own bill at the meeting
 * and leave every other item, choice and desk decision to the character.
 * The output is the record: the meeting, each vote with its reasons, and
 * what the character did on its own.
 */
import { drawPlace } from "../../tests/golden-path/place";
import { buildBenchWorld } from "../../src/bench/world";
import { BenchPlayer } from "../../src/bench/player";
import { coreAPI } from "../../src/core2/state";
import { townSeats } from "../../src/core2/modules/offices";
import {
  draftBill,
  memberPosition,
  POLICY_QUESTIONS,
  votesOn,
  billOf,
} from "../../src/core2/modules/legislature";
import {
  adjourn,
  meetingInProgress,
  meetingsOf,
  officeActsOf,
  officeJobsOf,
  placeOnAgenda,
  takeUpItem,
  upcomingMeeting,
} from "../../src/core2/modules/office-day";
import { addDays, makeIsoDate } from "../../src/simulation/dates";

const role = process.argv[2] === "mayor" ? "mayor" : "council";
const draw = drawPlace(
  "office-local",
  process.argv[3] ?? `${role}-${Date.now()}`,
);
console.log(`# ${role}: ${draw.name} (${draw.state}), seed ${draw.seed}`);
const started = Date.now();
const built = buildBenchWorld(draw.seed, "2026-10-01", {
  placeKey: draw.key,
  twoLevel: true,
});
const { core, director } = built;
const api = coreAPI(core);
console.log(
  `built in ${Date.now() - started} ms; town ${core.placeMetadata.referencePopulation} people`,
);

const seats = townSeats(api);
const council = seats.find(
  (s) => s.office.kind === "council" && s.holder?.personId,
);
const mayorSeat = seats.find(
  (s) => s.office.kind === "mayor" && s.holder?.personId,
);
const seat = role === "mayor" ? mayorSeat : council;
if (!seat?.holder?.personId)
  throw new Error(`No sitting ${role} who is a person here.`);
const me = seat.holder.personId;
const person = core.people.get(me)!;
console.log(
  `playing ${person.givenName} ${person.familyName} (${me}), ${seat.office.title}`,
);

// A bill of the player's own: a council member sponsors on their own body;
// a mayor brings one through the council.
const body = council?.office.id;
if (!body) throw new Error("No council here.");
let bill;
for (const question of Object.keys(POLICY_QUESTIONS)
  .filter((q) => !q.startsWith("us-federal"))
  .sort()) {
  for (const value of [1, -1]) {
    const drafted = draftBill(api, {
      bodyOfficeId: body,
      sponsorId: me,
      provisions: [{ kind: "policy-question", question, value }],
    });
    if (
      drafted.status === "drafted" &&
      memberPosition(api, drafted.id, me).total > 0
    ) {
      bill = drafted;
      break;
    }
  }
  if (bill) break;
}
if (!bill) throw new Error("The player favors no change the council may make.");
const date = placeOnAgenda(api, bill.id);
console.log(
  `drafted ${bill.number} (${JSON.stringify(bill.provisions)}), on the agenda for ${date}`,
);

const player = new BenchPlayer(core, director);
player.select(me);
// Skip to three days before the meeting (the owner skips a week).
const skipTo = addDays(makeIsoDate(date), -3);
if (skipTo > core.date) {
  const t = Date.now();
  const r = player.advance("calendar", skipTo);
  console.log(
    `skipped to ${skipTo} in ${Date.now() - t} ms; ${r.selfChosen.length} choices the character made itself`,
  );
}

const firstDay = core.date;
let selfChosen = 0;
for (let day = 0; day < 10; day++) {
  let result = player.advance("day");
  selfChosen += result.selfChosen.length;
  for (let guard = 0; guard < 200; guard++) {
    const packet = player.packet!;
    if (packet.kind === "complete") break;
    if (packet.kind === "choice") {
      // Every choice of the day is left to the character.
      const r = player.resume({ kind: "own-choice", pauseId: packet.pauseId });
      selfChosen += 1 + r.selfChosen.length;
      continue;
    }
    if (packet.kind === "stop") {
      const meeting = meetingInProgress(api);
      if (meeting) {
        console.log(
          `\n## Stop: ${meeting.id} at minute ${meeting.startMinute} (${meeting.citation})`,
        );
        for (const billId of meeting.agenda) {
          const own = billOf(api, billId).sponsorId === me;
          const after = takeUpItem(
            api,
            meeting.id,
            billId,
            own ? "yes" : "own",
          );
          console.log(
            `- ${after.number}: ${own ? "the player voted yes" : "left to the character"}; ${after.status}`,
          );
          for (const v of votesOn(api, billId))
            console.log(
              `  ${v.memberId === me ? "(player) " : ""}${v.memberId} ${v.vote} total ${v.position.total.toFixed(3)} views ${v.position.views.toFixed(3)} constituents ${v.position.constituents.toFixed(3)}`,
            );
        }
        adjourn(api, meeting.id);
      }
      result = {
        ...result,
        ...player.resume({ kind: "stop", pauseId: packet.pauseId }),
      };
      continue;
    }
    break;
  }
  if (player.pollingPlace) player.leavePolls();
}
console.log(
  `\nplayed ${firstDay} to ${core.date}; the character made ${selfChosen} choices on its own`,
);
for (const office of [
  body,
  ...seats
    .filter((s) => s.office.kind === "county-board")
    .map((s) => s.office.id)
    .slice(0, 1),
])
  for (const m of meetingsOf(api, office).slice(0, 3))
    console.log(
      `meeting ${m.id}: ${m.status}, ${m.takenUp.length} items, player present ${m.playerPresent}`,
    );
console.log(
  "next council meeting",
  JSON.stringify(upcomingMeeting(api, body)?.date),
);
for (const act of officeActsOf(api, me))
  console.log(
    `act ${act.date} ${act.kind} ${act.how} ${act.recordId} ${act.detail} ${act.position ?? ""}`,
  );
for (const job of officeJobsOf(api, me))
  console.log(
    `office job: ${job.title}, ${job.fullTime ? "full time on the payroll" : "part time, stipend"}; $${job.annualMinor / 100} a year, ${job.weeklyHours} hours a week; paid by ${job.payerId}; ${job.citation}`,
  );
// Skip to the day after the next 1st to see the stipend paid.
const month = core.date.slice(0, 7);
const nextFirst = addDays(makeIsoDate(`${month}-01`), 40).slice(0, 8) + "02";
player.advance("calendar", nextFirst);
for (
  let guard = 0;
  guard < 400 && player.packet?.kind !== "complete";
  guard++
) {
  const packet = player.packet!;
  if (packet.kind === "choice")
    player.resume({ kind: "own-choice", pauseId: packet.pauseId });
  else if (packet.kind === "stop") {
    const meeting = meetingInProgress(api);
    if (meeting) adjourn(api, meeting.id);
    player.resume({ kind: "stop", pauseId: packet.pauseId });
  } else break;
}
for (const job of officeJobsOf(api, me))
  console.log(
    `by ${core.date}: last stipend ${JSON.stringify(job.lastPaid ?? null)}; paid through ${job.paidFrom}`,
  );
console.log(`total ${Date.now() - started} ms`);
