import { randomBytes } from "node:crypto";
import { writeFileSync } from "node:fs";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, ageOnDate, makeIsoDate } from "../core2/kernel/dates";
import {
  JUSTICE_MODULE_ID,
  type CustodyRow,
  type SentenceRow,
} from "../core2/modules/justice";
import { P } from "../core2/parameters";
import { advancePlayerV1, resumePlayerV1 } from "../core2/player-v1";
import { coreAPI } from "../core2/state";
import type { CoreState, PersonId } from "../core2/types";
import { moneySaid } from "../english/count-words";
import { spanSaid } from "../english/span-words";
import { composeJournal } from "./journal";
import { purposeScene, replyInScene } from "./purpose-scene";
import type { TreeNode } from "./scene-talk";
import type { ScheduleEntry } from "./scheduling";
import { expectUpToFourDifferent } from "./reply-set-check";

// The player visits someone they know whom the justice engine holds, and the
// person inside asks for something real (owner, Nov 9: a purpose for every
// scene kind that lacks one; the CTO's brief for `visit`): money on their
// account, a child looked after, a lawyer called, a word taken to the family.
// The sentence, the day they get out and the bail are said from the records.
//
// A named person's sentence is rare in a played year (it takes a bribe, a
// report, a charge and a verdict), so the cause is HAND-STAGED: the sentence
// and custody rows and the records are written as the justice engine writes
// them (`imprison`, and the pretrial hold in `chargeDecision`). The director's
// circumstance producer then casts the visit for the player on its own, from
// the record, through the player's clock.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(10).toString("hex");
const ATTEMPTS = 6;
const PLAY_DAYS = 4;
/** The months of the staged sentence, and the staged bail in cents. */
const TERM_MONTHS = 14;
const BAIL_MINOR = 250_000;
const KINDS = {
  sentence: "circumstance:imprisoned-known-visit",
  held: "circumstance:held-known-visit",
} as const;

/** Every path of a tree: the replies chosen, the node it reaches. */
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
  return { id };
}

it(`a prison visit is about the term and what the person inside asks, from the records (seed ${seed})`, () => {
  setBookkeeping(false);
  const tried: string[] = [];
  const done = new Set<string>();
  try {
    for (let attempt = 0; attempt < ATTEMPTS && done.size < 2; attempt += 1) {
      const place = drawPlace(seed, `prison-visit:${attempt}`);
      const where = `${place.name} (${place.key}), seed ${place.seed}`;
      const { core, director, playerId } = buildBenchWorld(
        place.seed,
        gameStartDate(),
        { twoLevel: true, placeKey: place.key },
      );
      const personId = playerId!;
      core.focusPersonIds.add(personId);
      director.watch(core, personId);
      const book = director.ledger.people.get(personId)!;
      const player = core.people.get(personId)!;
      // People the player knows, adults, in the player's town.
      const known = [...player.knownIds]
        .filter((id) => id !== personId)
        .sort()
        .map((id) => core.people.get(id))
        .filter(
          (row) =>
            !!row &&
            row.alive &&
            row.tier !== "husk" &&
            ageOnDate(makeIsoDate(row.birthDate), makeIsoDate(core.date)) >=
              P.votingAge,
        );
      if (known.length < 2) {
        tried.push(`${where}: the player knows fewer than two adults`);
        continue;
      }
      for (const [mode, label] of Object.entries(KINDS) as [
        keyof typeof KINDS,
        string,
      ][]) {
        if (done.has(mode)) continue;
        const inside = known[mode === "sentence" ? 0 : 1]!;
        const staged =
          mode === "sentence"
            ? stageSentence(core, inside.id)
            : stageHold(core, inside.id);
        const hit: { entry?: ScheduleEntry } = {};
        const open = () => {
          const entry = book.schedule.find(
            (row) =>
              book.momentsById.get(row.momentId)?.label === label &&
              core.durableLog.get(book.momentsById.get(row.momentId)!.causeId)
                ?.id === staged.id,
          );
          if (entry) hit.entry = entry;
        };
        let packet = advancePlayerV1(core, {
          controlledPersonId: personId,
          through: {
            date: addDays(makeIsoDate(core.date), PLAY_DAYS),
            minuteOfDay: P.zero,
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
          tried.push(
            `${where}: ${mode}, played ${PLAY_DAYS} days, no visit staged for ${inside.id}`,
          );
          continue;
        }
        const entry = hit.entry;
        const moment = book.momentsById.get(entry.momentId)!;
        expect(
          entry.bindings.map((row) => row.typeKey),
          where,
        ).toContain("prison-visit");
        const result = purposeScene(core, director, personId, entry);
        expect(result?.kind, `${where}: ${JSON.stringify(result)}`).toBe(
          "composed",
        );
        if (result?.kind !== "composed") return;
        const { scene } = result;
        expect(scene.purpose, where).toBe("prison-visit");
        // The person inside speaks; the player is the visitor.
        expect(scene.askerId, where).toBe(inside.id);
        expect(scene.askedId, where).toBe(personId);
        const narration = scene.talk.narration.map((row) => row.text).join(" ");
        if (mode === "sentence") {
          // The sentence and the day they get out are the records' own.
          const length = scene.facts.find((row) => row.key === "sentence");
          expect(length?.text, where).toBe(spanSaid(staged.days));
          expect(length?.recordIds, where).toContain(staged.id);
          expect(scene.facts.some((row) => row.key === "release")).toBe(true);
          expect(narration, where).toContain(length!.text);
        } else {
          const bail = scene.facts.find((row) => row.key === "bail");
          expect(bail?.text, where).toBe(moneySaid(BAIL_MINOR));
          expect(bail?.recordIds, where).toContain(staged.id);
          expect(
            scene.facts.some((row) => row.key === "awaiting-trial"),
            where,
          ).toBe(true);
          expect(narration, where).toContain(bail!.text);
        }
        // The visit's limits are in the narration, not a place or a screen.
        expect(narration, where).toMatch(/guard/);
        // Four ways to answer, and a branch deeper than one.
        const root = scene.talk.tree.replies.map((reply) => reply.line);
        expectUpToFourDifferent(root, where);
        for (const row of root)
          expect(["agree", "promise", "ask", "decline"], where).toContain(
            row.move,
          );
        expect(scene.talk.depth, where).toBeGreaterThan(1);
        expect(
          scene.talk.gaps.filter((gap) => gap.includes("/ending/")),
          where,
        ).toEqual([]);
        for (const row of scene.talk.lines)
          expect(row.text, where).not.toMatch(
            /\d{4}-\d{2}-\d{2}|\b[a-z]+[-.:][a-z-]+:|\{|\}|undefined|\d{5,}/,
          );
        const ends = paths(scene.talk.tree).flatMap((full) => {
          let node: TreeNode | null = scene.talk.tree;
          for (const index of full) node = node?.replies[index]?.next ?? null;
          return node?.end?.ending ? [{ full, ending: node.end.ending }] : [];
        });
        const promised = ends.find((row) => row.ending.keeps === "promise");
        expect(promised, `${where}: no path keeps a promise`).toBeTruthy();
        const id = replyInScene(
          core,
          director,
          personId,
          entry,
          promised!.full,
        );
        const reply = core.durableLog.get(id!);
        expect(reply?.facts?.typeKey, where).toBe("prison-visit");
        expect(reply?.facts?.causeId, where).toBe(moment.causeId);
        expect(reply?.facts?.ending, where).toBe("said-you-would");
        expect(reply?.facts?.keeps, where).toBe("promise");
        expect(reply?.personIds, where).toContain(inside.id);
        const told = composeJournal(core, director, personId)
          .flatMap((chapter) => chapter.lines)
          .find((line) => line.momentIds.includes(id!));
        const said = scene.talk.lines.map((row) => row.text).join(" | ");
        const note = `PRISON VISIT (hand-staged ${mode}) ${where}: ${core.date}, cause ${moment.causeId}, ${personId} visiting ${inside.id}; reply ${id} ending ${reply?.facts?.ending}; journal "${told?.text ?? "(other unnamed)"}"\n  ${said}`;
        if (process.env.SCENE_LOG)
          writeFileSync(process.env.SCENE_LOG, note, { flag: "a" });
        process.stdout.write(`${note}\n`);
        done.add(mode);
      }
    }
    expect(
      [...done].sort(),
      `visit not played both ways: ${tried.join("; ")} (seed ${seed})`,
    ).toEqual(["held", "sentence"]);
  } finally {
    setBookkeeping(true);
  }
}, 3_600_000);
