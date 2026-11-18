import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import {
  bodyOf,
  draftBill,
  holdVote,
  LEGISLATURE_MODULE_ID,
  members,
  type StudyRow,
} from "../core2/modules/legislature";
import { billCatalog, provisionFor } from "../core2/bill-catalog";
import { setStops, stopKinds } from "../core2/modules/office-day";
import { townSeats } from "../core2/modules/offices";
import { stanceRow } from "../core2/modules/views";
import { P } from "../core2/parameters";
import { advanceCore } from "../core2/life";
import { advancePlayerV1, resumePlayerV1 } from "../core2/player-v1";
import { coreAPI } from "../core2/state";
import type { CoreState, PersonId } from "../core2/types";
import { purposeScene, replyInScene } from "./purpose-scene";
import { wordPrintedStory } from "../bench/archive-words";

// A study committee (legislature.ts referToStudy and reportStudy: a bill that
// fails narrowly goes to a committee of its sponsor and the opponents nearest
// to changing their vote, which reports at its sunset and gives the finding to
// the body as a speech). The paper tells both events; a member of the
// committee, or its chair, is spoken to when it forms and again when it
// reports, and the reply is kept. Each scene stands on the study record.
//
// A rare record, staged through the game's own path: a bill is drafted in the
// town's body and put to its floor vote the way dev mode's hold-vote does
// (`holdVote`, legislature.ts); when it fails narrowly with its closest
// opponents less sure than its backers, the engine's own `referToStudy` forms
// the committee, and the committee's sunset (a calendar entry) reports it. The
// world is built twice at one pinned place: once to see who sits on the
// committee, then again with a person who sits on it controlled and watched
// from the start.
// Places are drawn from all 56 on a seed nobody chose until the first question
// the town may put fails and forms a committee there; each place passed over
// is named, and the test fails by name if none stages both scenes.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const ATTEMPTS = 6;
/** How many of the town's questions are put to a vote, in order, looking for a narrow failure. */
const QUESTIONS = 8;
const AFTER_REPORT_DAYS = 10;
const DEVELOPER_TEXT =
  /\d{4}-\d{2}-\d{2}|\b[a-z]+[-.:][a-z-]+:|\{|\}|undefined|\d{5,}/;

function studyRecord(core: CoreState, id: string): StudyRow | undefined {
  return coreAPI(core)
    .moduleState(LEGISLATURE_MODULE_ID)
    .table("studies")
    .get(id) as unknown as StudyRow | undefined;
}

/**
 * The game's own path to a committee: a bill on each question the town's body
 * may put, in turn, goes to its floor vote today (dev mode's hold-vote), and
 * the engine refers a narrow failure to a study.
 */
function stageStudy(core: CoreState): { studyId: string } | undefined {
  // One day in, so the director's first day has run and watches what follows.
  advanceCore(core, addDays(makeIsoDate(core.date), 1));
  const api = coreAPI(core);
  const seat = townSeats(api).find(
    (row) =>
      row.holder?.personId &&
      ["city", "county"].includes(row.office.level) &&
      members(api, row.office.id).length >= 3 &&
      bodyOf(api, row.office.id),
  );
  const policies = billCatalog(api, "city").flatMap((subject) =>
    subject.topics.flatMap((topic) => topic.policies),
  );
  const questions = policies
    .filter((row) => row.kind === "policy-question" && row.authority.allowed)
    .slice(0, QUESTIONS);
  if (!seat || !questions.length) return undefined;
  // Each question the town may put goes to its floor vote in turn until one
  // fails narrowly and the engine forms the committee; a town whose votes all
  // pass or fail clearly has none, and the place is passed over.
  for (const policy of questions) {
    const bill = draftBill(api, {
      bodyOfficeId: seat.office.id,
      sponsorId: seat.holder!.personId!,
      provisions: [provisionFor({ policyId: policy.id, operation: "enact" })],
    });
    holdVote(api, bill.id, { anyDay: true });
    const studyId = `study:${bill.id}`;
    if (studyRecord(core, studyId)) return { studyId };
  }
  return undefined;
}

it(`the paper tells a study committee, and its members are spoken to when it forms and when it reports (seed ${seed})`, () => {
  setBookkeeping(false);
  const tried: string[] = [];
  for (let attempt = 0; attempt < ATTEMPTS; attempt += 1) {
    const place = drawPlace(`${seed}:${attempt}`, "study-committee");
    const where = `${place.name} (${place.key}), seed ${seed}:${attempt}`;
    // One world: the committee is staged, then the member who sits on it is
    // watched and controlled. A member the floor debate did not call a scene
    // for hears the committee's own first (a vote's own debate takes the one
    // scene a day), so the member who joined last and lives in town is chosen.
    const { core, director } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const picked = stageStudy(core);
    if (!picked) {
      tried.push(`${where}: no committee formed`);
      continue;
    }
    const town = core.people.get(core.playerId!)?.placeId;
    const study = studyRecord(core, picked.studyId)!;
    const sitters = study.memberIds.filter((id) => {
      const person = core.people.get(id as PersonId);
      return (
        id !== study.chairId &&
        person?.alive === true &&
        person.placeId === town
      );
    });
    const personId = sitters.at(-1) as PersonId | undefined;
    if (!personId) {
      tried.push(`${where}: no member lives in town`);
      continue;
    }
    const studyId = picked.studyId;
    const formedOn = study.formedOn;
    core.focusPersonIds.add(personId);
    director.watch(core, personId);
    // The member's council meetings do not hold the clock here: their stops are
    // off (the engine records a member who does not attend as absent), so the
    // run reaches the committee's own days.
    setStops(
      coreAPI(core),
      personId,
      Object.fromEntries(stopKinds().map((kind) => [kind, false])),
    );
    const book = director.ledger.people.get(personId)!;
    const through = addDays(makeIsoDate(study.sunsetOn), AFTER_REPORT_DAYS);
    const seen: Record<string, number> = {
      "study-formed": 0,
      "study-reported": 0,
    };
    const lines: string[] = [];
    let packet = advancePlayerV1(core, {
      controlledPersonId: personId,
      through: { date: through, minuteOfDay: P.zero },
    });
    while (packet.kind !== "complete") {
      if (packet.kind === "stop") {
        for (const stop of packet.stop.modules) {
          const entry = book.schedule.find(
            (row) => row.momentId === stop.recordId,
          );
          const moment = book.momentsById.get(stop.recordId);
          const binding = entry?.bindings.find(
            (row) =>
              row.typeKey === "study-formed" ||
              row.typeKey === "study-reported",
          );
          if (!entry || !moment || !binding) continue;
          const typeKey = binding.typeKey as "study-formed" | "study-reported";
          const result = purposeScene(core, director, personId, entry, {
            typeKey,
          });
          const here = `${where}: ${moment.causeId}`;
          expect(result?.kind, `${here}: composed, not skipped`).toBe(
            "composed",
          );
          if (result?.kind !== "composed") continue;
          const { scene } = result;
          seen[typeKey] += 1;
          // The news of a committee formed keeps (the row's keepsDays): the
          // floor debate on the vote's own day takes the member's one scene
          // for that day, so the formed scene plays on a later morning than
          // the vote, and once.
          if (typeKey === "study-formed")
            expect(
              moment.date > formedOn,
              `${here}: formed scene on ${moment.date}, the vote's day was ${formedOn}`,
            ).toBe(true);
          expect(scene.purpose, here).toBe(typeKey);
          const cause = core.durableLog.get(moment.causeId);
          expect(cause?.kind, here).toBe(typeKey);
          const row = studyRecord(core, cause!.facts!.studyId!)!;
          // The scene is the committee's own: the asker sits on it, with the player.
          expect(
            [row.chairId, ...row.memberIds],
            `${here}: the asker sits on the committee`,
          ).toContain(scene.askerId);
          expect([row.chairId, ...row.memberIds], here).toContain(personId);
          expect(scene.askerId, here).not.toBe(personId);
          // Who chairs it is named: the asker. A committee another member
          // chairs has no worded scene yet (none has played), so it is skipped.
          expect(
            scene.facts.some((fact) => fact.key === "asker-chairs"),
            `${here}: the asker chairs it`,
          ).toBe(true);
          // The members who sit on it, besides the two talking, are named.
          expect(
            scene.facts.some((fact) => fact.key === "members"),
            `${here}: the other members are named`,
          ).toBe(true);
          if (typeKey === "study-reported") {
            expect(
              scene.facts.some(
                (fact) =>
                  fact.key ===
                  (row.report!.finding > P.zero
                    ? "finding-for"
                    : "finding-against"),
              ),
              `${here}: the finding is named`,
            ).toBe(true);
          }
          // What the chair's speech to the body moved in the player's own view is
          // named from the stance record, and only when the record has it.
          if (
            typeKey === "study-reported" &&
            row.report?.speechId &&
            row.topic &&
            personId !== row.chairId
          ) {
            const stance = stanceRow(coreAPI(core), personId, row.topic);
            const moved = stance?.causes.find(
              (change) => change.eventId === row.report!.speechId,
            );
            expect(
              scene.facts.some(
                (fact) =>
                  fact.key === "moved-for" || fact.key === "moved-against",
              ),
              `${here}: the stance change is named only if the stance record has it`,
            ).toBe(!!moved && moved.change > P.zero);
            // The opening ends on the finding itself (the Words lead's ruling:
            // the opener says what the committee found, not what moved the
            // player), and asks whether it changed anything.
            expect(
              scene.talk.state.text,
              `${here}: the opening says what the committee recommended`,
            ).toMatch(/recommended/);
            lines.push(
              `  stance ${stance?.id ?? "none"}: ${moved ? `moved ${moved.change} by ${row.report.speechId}` : "not moved by the speech"}`,
            );
          }
          const root = scene.talk.tree.replies.map((reply) => reply.line);
          expect(new Set(root.map((line) => line.move)), here).toEqual(
            new Set(["agree", "disagree", "ask", "deflect"]),
          );
          for (const line of [
            ...scene.talk.narration,
            scene.talk.state,
            ...root,
          ])
            expect(line.text, here).not.toMatch(DEVELOPER_TEXT);
          // The reply is kept: what the player said is on the record, with the
          // ending the arc keeps for the journal and the tie to read.
          const agree = scene.talk.tree.replies.findIndex(
            (reply) => reply.line.move === "agree",
          );
          const replyId = replyInScene(
            core,
            director,
            personId,
            entry,
            [agree],
            {
              typeKey,
            },
          );
          expect(replyId, `${here}: the reply is recorded`).toBeTruthy();
          const reply = core.durableLog.get(replyId as never);
          expect(reply?.kind, here).toBe("scene.reply");
          expect(reply?.facts?.typeKey, here).toBe(typeKey);
          expect(reply?.facts?.causeId, here).toBe(moment.causeId);
          expect(reply?.facts?.keeps, here).toBe("promise");
          lines.push(
            `${typeKey.toUpperCase()} ${here}\n  ${scene.talk.narration.map((l) => l.text).join(" ")}\n  ${scene.talk.state.text}\n  you: ${root.map((l) => l.text).join(" | ")}\n  facts: ${scene.facts.map((f) => f.key).join(", ")}\n  reply ${replyId} keeps ${reply?.facts?.keeps} (${reply?.facts?.ending})`,
          );
          // The paper tells the same event.
          const told = wordPrintedStory(core, {
            id: `printed:test:${cause!.id}`,
            kind: "press.printed",
            date: cause!.date,
            topic: cause!.topic,
            facts: { sourceRecordId: cause!.id },
          } as never);
          expect(told, `${here}: the paper tells it`).toBeTruthy();
          lines.push(`  paper: ${told!.headline} / ${told!.lede}`);
        }
        packet = resumePlayerV1(core, {
          kind: "stop",
          pauseId: packet.pauseId,
        });
      } else
        packet = resumePlayerV1(core, {
          kind: "choice",
          pauseId: packet.pauseId,
          offerId: packet.offers[P.zero]!.offerId,
        });
    }
    process.stdout.write(
      `STUDY ${where}: scouted ${studyId} (formed ${formedOn}); the replay's scenes: formed ${seen["study-formed"]}, reported ${seen["study-reported"]}\n${lines.join("\n")}\n`,
    );
    expect(
      seen["study-formed"],
      `${where}: the formed scene plays once`,
    ).toBeLessThanOrEqual(1);
    if (seen["study-formed"] && seen["study-reported"]) return;
    tried.push(
      `${where}: scenes formed ${seen["study-formed"]}, reported ${seen["study-reported"]}`,
    );
  }
  throw new Error(
    `no study committee staged both scenes: ${tried.join("; ")} (seed ${seed})`,
  );
  // A place takes about 100 seconds, not the minute the pinned-tests habit
  // names: the committee's own 180-day term (`studyTermDays`, legislature.ts)
  // has to pass in the engine before it reports, and the world is played day
  // by day through it with the member's stops answered. The study is staged
  // by the legislature's vote, so no draw loop is in it.
}, 1_800_000); // up to six places of about 100 s each, a scouting world and a replay each.
