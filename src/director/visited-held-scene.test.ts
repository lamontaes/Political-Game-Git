import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import {
  JUSTICE_MODULE_ID,
  type CustodyRow,
  type SentenceRow,
} from "../core2/modules/justice";
import { advancePlayerV1, resumePlayerV1 } from "../core2/player-v1";
import { coreAPI } from "../core2/state";
import type { CoreState, PersonId } from "../core2/types";
import { moneySaid } from "../english/count-words";
import { spanSaid } from "../english/span-words";
import { custodyFacts } from "./custody-facts";
import { purposeScene, replyInScene } from "./purpose-scene";
import type { TreeNode } from "./scene-talk";
import type { ScheduleEntry } from "./scheduling";

// The player is the one held (a prison term handed down, or held for want of
// bail) and a relative comes to see them with something to offer or ask
// (owner, Nov 9: a purpose for every scene kind that lacks one; the stopgap
// SG-WORDS-visit-ill-no-purpose): news from home, money for the account or a
// lawyer, the house, the children, the job, whether to come again. The
// sentence, the day they get out, the bail, the child and the employer are
// said from the justice record, the household and the job row.
//
// HAND-STAGED like prison-visit-scene.test.ts: the sentence and custody rows
// and the records are written as the justice engine writes them, for the
// player. The director's feeling producer casts the relative's visit, and the
// scene is composed through the purpose engine.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(10).toString("hex");
const ATTEMPTS = 6;
const PLAY_DAYS = 4;
const TERM_MONTHS = 14;
const BAIL_MINOR = 250_000;
const MODES = ["sentence", "held"] as const;
const SLOP = /\d{4}-\d{2}-\d{2}|\b[a-z]+[-.:][a-z-]+:|\{|\}|undefined|\d{5,}/;

const paths = (node: TreeNode, prefix: number[] = []): number[][] =>
  node.replies.flatMap((reply, index) =>
    reply.next
      ? [[...prefix, index], ...paths(reply.next, [...prefix, index])]
      : [[...prefix, index]],
  );

const source = (core: CoreState) => ({
  tag: "SOURCED" as const,
  citation: "Staged for the test as the justice engine writes it.",
  asOf: core.date,
});

/** A prison term that begins today, as `imprison` writes it. */
function stageSentence(core: CoreState, personId: PersonId) {
  const api = coreAPI(core);
  const release = addDays(makeIsoDate(core.date), TERM_MONTHS * 30);
  const sentenceId = `sentence:staged:${personId}`;
  const sentence: SentenceRow = {
    id: sentenceId,
    kind: "person",
    caseId: `case:staged:${personId}`,
    personId,
    date: core.date,
    severity: 1,
    fineMinor: 0,
    finePaidMinor: 0,
    forfeitureMinor: 0,
    forfeiturePaidMinor: 0,
    treasuryId: null,
    probationMonths: 0,
    custodyMonths: TERM_MONTHS,
    releaseDate: release,
    seatsVacated: [],
    jobsEnded: [],
    reasons: {},
    source: source(core),
  };
  const custody: CustodyRow = {
    id: `custody:${sentenceId}`,
    kind: "person",
    personId,
    sentenceId,
    from: core.date,
    until: release,
    status: "serving",
    priorEligible: null,
  };
  const tables = api.moduleState(JUSTICE_MODULE_ID);
  tables.table("sentences").put(sentence as never);
  tables.table("custody").put(custody as never);
  const id = `justice.imprisoned:${sentenceId}`;
  api.emit({
    id,
    date: core.date,
    kind: "justice.imprisoned",
    personIds: [personId],
    placeId: core.people.get(personId)!.placeId,
    publicRecord: true,
    news: true,
    facts: {
      sentenceId,
      custodyMonths: String(TERM_MONTHS),
      releaseDate: release,
    },
    source: source(core),
  });
  return { id, days: TERM_MONTHS * 30 };
}

/** A person held for want of bail, as `chargeDecision` writes the hold. */
function stageHold(core: CoreState, personId: PersonId) {
  const id = `justice.pretrial:case:staged:${personId}`;
  coreAPI(core).emit({
    id,
    date: core.date,
    kind: "justice.held-before-trial",
    personIds: [personId],
    placeId: core.people.get(personId)!.placeId,
    publicRecord: true,
    news: true,
    facts: {
      caseId: `case:staged:${personId}`,
      decision: "held",
      bailMinor: String(BAIL_MINOR),
    },
    source: source(core),
  });
  return { id, days: undefined as number | undefined };
}

it(`a relative visits the player when they are held, from the justice record (seed ${seed})`, () => {
  setBookkeeping(false);
  const tried: string[] = [];
  const done = new Set<string>();
  try {
    for (let attempt = 0; attempt < ATTEMPTS && done.size < 2; attempt += 1) {
      for (const mode of MODES) {
        if (done.has(mode)) continue;
        const place = drawPlace(seed, `visited-held:${mode}:${attempt}`);
        const where = `${place.name} (${place.key}), seed ${place.seed}`;
        const { core, director, playerId } = buildBenchWorld(
          place.seed,
          gameStartDate(),
          { twoLevel: true, placeKey: place.key },
        );
        const id = playerId as PersonId;
        core.focusPersonIds.add(id);
        director.watch(core, id);
        const book = director.ledger.people.get(id)!;
        const staged =
          mode === "sentence" ? stageSentence(core, id) : stageHold(core, id);
        const hit: { entry?: ScheduleEntry } = {};
        const open = () => {
          const entry = book.schedule.find((row) => {
            const moment = book.momentsById.get(row.momentId)!;
            return (
              row.bindings.some((b) => b.typeKey === "visit") &&
              core.durableLog.get(moment.causeId)?.id === staged.id
            );
          });
          if (entry) hit.entry = entry;
        };
        let packet = advancePlayerV1(core, {
          controlledPersonId: id,
          through: {
            date: addDays(makeIsoDate(core.date), PLAY_DAYS),
            minuteOfDay: 0,
          },
        });
        while (packet.kind !== "complete" && !hit.entry) {
          if (packet.kind === "stop") {
            open();
            if (hit.entry) break;
            packet = resumePlayerV1(core, {
              kind: "stop",
              pauseId: packet.pauseId,
            });
          } else
            packet = resumePlayerV1(core, {
              kind: "own-choice",
              pauseId: packet.pauseId,
            });
        }
        open();
        if (!hit.entry) {
          tried.push(`${where}: ${mode}, no relative's visit staged`);
          continue;
        }
        const entry = hit.entry;
        const moment = book.momentsById.get(entry.momentId)!;
        const result = purposeScene(core, director, id, entry, {
          typeKey: "visit",
        });
        expect(result?.kind, `${where}: ${JSON.stringify(result)}`).toBe(
          "composed",
        );
        if (result?.kind !== "composed") return;
        const { scene } = result;
        expect(scene.purpose, where).toBe("visited-held-ask");
        expect(scene.askedId, where).toBe(id);
        expect(scene.askerId, where).not.toBe(id);
        const record = core.durableLog.get(moment.causeId)!;
        const given = custodyFacts(core, record, scene.askerId, id);
        expect(Object.keys(given), where).toContain("you-inside");
        for (const [key, expected] of Object.entries(given)) {
          const fact = scene.facts.find((row) => row.key === key);
          expect(fact?.text, `${where}: ${key}`).toBe(expected.text);
          expect(fact?.recordIds, `${where}: ${key}`).toEqual(
            expected.sourceRecordIds,
          );
        }
        if (mode === "sentence") {
          expect(given.sentence?.text, where).toBe(spanSaid(staged.days!));
          expect(given.sentence?.sourceRecordIds, where).toContain(staged.id);
        } else {
          expect(given.bail?.text, where).toBe(moneySaid(BAIL_MINOR));
          expect(given["awaiting-trial"], where).toBeTruthy();
        }
        const narration = scene.talk.narration.map((row) => row.text).join(" ");
        expect(narration, where).toContain(
          (mode === "sentence" ? given.sentence : given.bail)!.text,
        );
        // The narrator says only what the records show: no guard, no glass.
        expect(narration, where).not.toMatch(/guard|glass/);
        for (const row of scene.talk.lines) {
          expect(row.text, where).not.toMatch(SLOP);
          expect(row.text, where).not.toMatch(/\ball right\b/i);
        }
        expect(scene.talk.gaps, where).toEqual([]);
        expect(scene.talk.depth, where).toBeGreaterThan(1);
        const yes = paths(scene.talk.tree).find((full) => {
          let node: TreeNode | null = scene.talk.tree;
          for (const index of full) node = node?.replies[index]?.next ?? null;
          return node?.end?.ending?.keeps === "promise";
        });
        expect(yes, `${where}: no path keeps a promise`).toBeTruthy();
        const replyId = replyInScene(core, director, id, entry, yes!, {
          typeKey: "visit",
        });
        const reply = core.durableLog.get(replyId!);
        expect(reply?.facts?.typeKey, where).toBe("visit");
        expect(reply?.facts?.causeId, where).toBe(staged.id);
        expect(reply?.facts?.keeps, where).toBe("promise");
        expect(reply?.personIds, where).toContain(scene.askerId);
        done.add(mode);
        process.stdout.write(
          `VISITED HELD (hand-staged ${mode}) ${where}: ${staged.id}, ${scene.askerId} visits ${id}; facts ${scene.facts.map((f) => f.key).join(",")}; reply ${replyId} ending ${reply?.facts?.ending}\n  ${narration} | ${scene.talk.state.text}\n`,
        );
      }
    }
    expect(
      [...done].sort(),
      `not played both ways: ${tried.join("; ")} (seed ${seed})`,
    ).toEqual(["held", "sentence"]);
  } finally {
    setBookkeeping(true);
  }
}, 3_600_000);
