import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import {
  LEGISLATURE_MODULE_ID,
  type StudyRow,
} from "../core2/modules/legislature";
import { stanceRow } from "../core2/modules/views";
import { P } from "../core2/parameters";
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
// A rare record: a plain world is played first to find a drawn place where a
// study forms (its record names the committee), then the same world is played
// again with a person who sits on it as the controlled one, watched from the
// start.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const ATTEMPTS = 6;
const SCOUT_DAYS = 730;
const SCOUT_STEP_DAYS = 60;
const AFTER_REPORT_DAYS = 10;
const DEVELOPER_TEXT =
  /\d{4}-\d{2}-\d{2}|\b[a-z]+[-.:][a-z-]+:|\{|\}|undefined|\d{5,}/;

function studyRecord(core: CoreState, id: string): StudyRow | undefined {
  return coreAPI(core)
    .moduleState(LEGISLATURE_MODULE_ID)
    .table("studies")
    .get(id) as unknown as StudyRow | undefined;
}

it(`the paper tells a study committee, and its members are spoken to when it forms and when it reports (seed ${seed})`, () => {
  setBookkeeping(false);
  const tried: string[] = [];
  for (let attempt = 0; attempt < ATTEMPTS; attempt += 1) {
    const place = drawPlace(`${seed}:${attempt}`, "study-committee");
    const where = `${place.name} (${place.key}), seed ${seed}:${attempt}`;
    // 1. Scout: a plain world, to see whether a study forms and who sits on it.
    const scout = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    // A person who lives in the played town and sits on the committee (a member
    // before the chair), as the town's own body sends them.
    const town = scout.core.people.get(scout.core.playerId!)?.placeId;
    const local = (id: string) => {
      const person = scout.core.people.get(id as PersonId);
      return person?.alive === true && person.placeId === town;
    };
    // Studies that formed and reported, with a local sitter: the world is
    // played in steps and stops at the first one.
    const reportedCandidates = () =>
      [...(scout.core.logByKind.get("study-formed") ?? [])]
        .map((id) => scout.core.durableLog.get(id as never)!)
        .filter((row) => studyRecord(scout.core, row.facts!.studyId!)?.report)
        .map((row) => {
          const chairId = studyRecord(scout.core, row.facts!.studyId!)?.chairId;
          const sitter =
            row.personIds.find((id) => id !== chairId && local(id)) ??
            row.personIds.find(local);
          return { row, sitter: sitter as PersonId | undefined };
        })
        .filter((c) => c.sitter);
    let candidates = reportedCandidates();
    for (
      let days = SCOUT_STEP_DAYS;
      days <= SCOUT_DAYS && !candidates.length;
      days += SCOUT_STEP_DAYS
    ) {
      advanceCore(scout.core, addDays(makeIsoDate(gameStartDate()), days));
      candidates = reportedCandidates();
    }
    const formedIds = [...(scout.core.logByKind.get("study-formed") ?? [])];
    const picked = candidates[0]?.row;
    if (!picked) {
      tried.push(
        `${where}: ${formedIds.length} studies, none with a member who lives in town`,
      );
      continue;
    }
    const studyId = picked.facts!.studyId!;
    const study = studyRecord(scout.core, studyId)!;
    const personId = candidates[0]!.sitter!;
    const formedOn = picked.date;
    // 2. Replay: the same world, the member controlled and watched from the start.
    const { core, director } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    core.focusPersonIds.add(personId);
    director.watch(core, personId);
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
          // It names the question the committee was charged with and the day it reports.
          if (row.topic)
            expect(
              scene.facts.some((fact) => fact.key === "issue"),
              `${here}: the question is named`,
            ).toBe(true);
          expect(
            scene.facts.some(
              (fact) => fact.key === "asker-chairs" || fact.key === "you-chair",
            ),
            here,
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
            if (moved && moved.change > P.zero)
              expect(
                scene.talk.state.text,
                `${here}: the opening says the speech moved the player`,
              ).toMatch(/\bmov(?:e|ed)\b/);
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
    if (seen["study-formed"] && seen["study-reported"]) return;
    tried.push(
      `${where}: scenes formed ${seen["study-formed"]}, reported ${seen["study-reported"]}`,
    );
  }
  throw new Error(
    `no study committee staged both scenes: ${tried.join("; ")} (seed ${seed})`,
  );
}, 3_600_000);
