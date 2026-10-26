/**
 * Office play proof (OFFICE-LOCAL): ten days in office as a sitting local
 * officeholder in a place drawn from all 56, with the place and seed named.
 *
 *   node --max-old-space-size=8192 --import tsx scripts/office-day/play-local.ts council <draw-key>
 *   node --max-old-space-size=8192 --import tsx scripts/office-day/play-local.ts mayor <draw-key>
 *
 * The player controls a sitting official from the game's start (dev mode's
 * custom start) and plays ten days on a plan: a council member drafts a
 * bill, skips to three days before its meeting, holds a town hall and
 * votes their bill at the meeting; a mayor gives one interview with their
 * own answers, leaves another to the character, and gives the state of the
 * city. Every other choice, vote and desk decision is the character's own.
 * The output is the record, with the ids that answer why.
 */
import { drawPlace } from "../../tests/golden-path/place";
import { buildBenchWorld } from "../../src/bench/world";
import { BenchPlayer } from "../../src/bench/player";
import { coreAPI } from "../../src/core2/state";
import { gameStartDate } from "../../src/core2/game-start";
import { townSeats } from "../../src/core2/modules/offices";
import {
  billOf,
  draftBill,
  memberPosition,
  POLICY_QUESTIONS,
  votesOn,
} from "../../src/core2/modules/legislature";
import { interviewsFor } from "../../src/core2/modules/press";
import {
  adjourn,
  deskWaiting,
  leaveDeskToCharacter,
  meetingInProgress,
  meetingsOf,
  officeActsOf,
  officeJobsOf,
  placeOnAgenda,
  prepareAct,
  takeUpItem,
  upcomingMeeting,
} from "../../src/core2/modules/office-day";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";

const role = process.argv[2] === "mayor" ? "mayor" : "council";
const key = process.argv[3] ?? `${role}-${Date.now()}`;
const started = Date.now();
// A random place from all 56 that has the office (a town governed by town
// meeting has no mayor): the next draw is taken until one has it.
let built;
let draw;
let seat;
for (let attempt = 0; attempt < 6 && !seat?.holder?.personId; attempt++) {
  draw = drawPlace("office-local", attempt ? `${key}-${attempt}` : key);
  console.log(`# ${role}: ${draw.name} (${draw.state}), seed ${draw.seed}`);
  built = buildBenchWorld(draw.seed, gameStartDate(), {
    placeKey: draw.key,
    twoLevel: true,
  });
  const seats = townSeats(coreAPI(built.core));
  seat = seats.find(
    (s) =>
      s.office.kind === (role === "mayor" ? "mayor" : "council") &&
      s.holder?.personId,
  );
  if (!seat?.holder?.personId)
    console.log(`no sitting ${role} here; next draw`);
}
if (!built || !seat?.holder?.personId)
  throw new Error(`No sitting ${role} who is a person in six draws.`);
const { core, director } = built;
const api = coreAPI(core);
console.log(
  `built in ${Date.now() - started} ms; town ${core.placeMetadata.referencePopulation} people; ${core.date}`,
);
const council = townSeats(api).find(
  (s) => s.office.kind === "council" && s.holder?.personId,
);
const me = seat.holder.personId;
const person = core.people.get(me)!;
console.log(
  `playing ${person.givenName} ${person.familyName} (${me}), ${seat.office.title}`,
);

/** On a planned day, the player picks this act; everything else is the character's. */
const plan: Record<number, string> = {};
const player = new BenchPlayer(core, director);
player.select(me);
if (role === "council") {
  const body = council!.office.id;
  let bill;
  for (const question of Object.keys(POLICY_QUESTIONS)
    .filter((q) => !q.startsWith("us-federal"))
    .sort()) {
    const drafted = draftBill(api, {
      bodyOfficeId: body,
      sponsorId: me,
      provisions: [{ kind: "policy-question", question, value: 1 }],
    });
    if (
      drafted.status === "drafted" &&
      memberPosition(api, drafted.id, me).total > 0
    ) {
      bill = drafted;
      break;
    }
  }
  if (!bill)
    throw new Error("The player favors no change the council may make.");
  const date = placeOnAgenda(api, bill.id);
  console.log(
    `drafted ${bill.number} (${bill.provisions.map((p) => ("question" in p ? p.question : p.kind)).join("; ")}), on the agenda for ${date}`,
  );
  // Skip to three days before the meeting (the owner skips a week).
  const skipTo = addDays(makeIsoDate(date), -3);
  if (skipTo > core.date) {
    const r = player.advance("calendar", skipTo);
    console.log(
      `skipped to ${skipTo}; the character made ${r.selfChosen.length} choices on its own`,
    );
  }
  plan[1] = "town-hall";
  plan[2] = "talk-to-colleague";
} else {
  plan[0] = "interview";
  plan[3] = "interview";
  plan[5] = "state-of-the-city";
}

const firstDay = core.date;
let ownChoices = 0;
for (let day = 0; day < 10; day++) {
  if (role === "mayor" && day === 0) {
    // The first interview's answers are the player's: against every change.
    const answers: Record<string, number> = {};
    for (const q of Object.keys(POLICY_QUESTIONS)) answers[q] = -1;
    prepareAct(api, me, "interview", { answers });
  }
  player.advance("day");
  let planned = plan[day];
  for (let guard = 0; guard < 200; guard++) {
    const packet = player.packet!;
    if (packet.kind === "complete") break;
    if (packet.kind === "choice") {
      const pick = planned
        ? packet.offers.find((o) => o.actionId === planned)
        : undefined;
      if (pick) {
        console.log(
          `${packet.at.date}: the player chooses ${pick.actionId} (${pick.durationMinutes} minutes); the character would have chosen ${packet.decision.selected?.definition.id}`,
        );
        planned = undefined;
        player.resume({
          kind: "choice",
          pauseId: packet.pauseId,
          offerId: pick.offerId,
        });
      } else {
        ownChoices += 1;
        player.resume({ kind: "own-choice", pauseId: packet.pauseId });
      }
      continue;
    }
    if (packet.kind === "stop") {
      const meeting = meetingInProgress(api);
      if (meeting) {
        console.log(
          `\n## ${packet.at.date} at minute ${packet.at.minuteOfDay}: the meeting holds the player (${meeting.citation})`,
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
          const seen = new Set<string>();
          for (const v of votesOn(api, billId)) {
            if (seen.has(v.memberId + v.vote)) continue;
            seen.add(v.memberId + v.vote);
            console.log(
              `  ${v.memberId === me ? "(player) " : ""}${v.memberId} ${v.vote}: total ${v.position.total.toFixed(3)} (views ${v.position.views.toFixed(3)}, constituents ${v.position.constituents.toFixed(3)})`,
            );
          }
        }
        adjourn(api, meeting.id);
      }
      for (const bill of deskWaiting(api)) {
        console.log(`desk: ${bill.number}, left to the character`);
        leaveDeskToCharacter(api, bill.id);
      }
      player.resume({ kind: "stop", pauseId: packet.pauseId });
      continue;
    }
    break;
  }
  if (player.pollingPlace) player.leavePolls();
}
console.log(
  `\nplayed ${firstDay} to ${core.date}; the character made ${ownChoices} of the day's choices on its own`,
);
for (const job of officeJobsOf(api, me)) {
  console.log(
    `office job: ${job.title}, ${job.fullTime ? "full time on the payroll" : "part time, stipend"}; $${job.annualMinor / 100} a year, ${job.weeklyHours} hours a week; ${job.citation}`,
  );
  for (const m of meetingsOf(api, job.officeId).slice(0, 3))
    console.log(
      `meeting ${m.id}: ${m.status}, ${m.takenUp.length} items, player present ${m.playerPresent}`,
    );
  const next = upcomingMeeting(api, job.officeId);
  if (next) console.log(`next meeting of ${job.officeId}: ${next.date}`);
}
console.log("\nacts of office:");
for (const act of officeActsOf(api, me)
  .slice()
  .sort((a, b) => a.date.localeCompare(b.date)))
  console.log(
    `- ${act.date} ${act.kind} (${act.how === "did" ? "the player" : "the character"}): ${act.detail}${act.position !== null ? ` [position ${act.position.toFixed(3)}]` : ""} ${act.recordId}`,
  );
for (const row of interviewsFor(api, me))
  console.log(
    `interview ${row.id}: ${row.status}; ${
      (
        row as unknown as {
          answers?: { question: string; position: number | null }[];
        }
      ).answers
        ?.map((a) => `${a.question.split(".").pop()} ${a.position}`)
        .join(", ") ?? ""
    }`,
  );
// Skip to the day after the next 1st to see the stipend paid.
const next1st = `${addDays(makeIsoDate(`${core.date.slice(0, 7)}-01`), 40).slice(0, 8)}02`;
player.advance("calendar", next1st);
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
    for (const bill of deskWaiting(api)) leaveDeskToCharacter(api, bill.id);
    player.resume({ kind: "stop", pauseId: packet.pauseId });
  } else break;
}
for (const job of officeJobsOf(api, me))
  console.log(
    `by ${core.date}: last stipend ${JSON.stringify(job.lastPaid ?? null)}`,
  );
console.log(`total ${Date.now() - started} ms`);
