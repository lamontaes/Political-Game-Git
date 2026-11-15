import { randomBytes } from "node:crypto";
import { writeFileSync } from "node:fs";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import {
  JUSTICE_MODULE_ID,
  type CustodyRow,
  type SentenceRow,
} from "../core2/modules/justice";
import { coreAPI } from "../core2/state";
import type { CoreState, PersonId } from "../core2/types";
import { spanSaid } from "../english/span-words";
import { composeJournal } from "./journal";
import { purposeScene, replyInScene } from "./purpose-scene";
import type { TreeNode } from "./scene-talk";
import { expectUpToFourDifferent } from "./reply-set-check";

// Someone home from prison asks for something real (owner, Nov 9: a purpose
// for every scene kind that lacks one; the CTO's brief for `return`): a place
// to stay until there is work, help finding work with a record, and to know
// where they stand after what the term cost; or, when the player is the one
// home, a relative asks what happens now. The words name how long the term
// was, whether it ended their job and the child at home, each from the
// justice engine's records.
//
// A named person's term is rare in a played year (it takes a bribe, a report,
// a charge and a sentence past a year), so the cause here is HAND-STAGED: the
// sentence and custody rows are written as the justice engine writes them
// (src/core2/modules/justice.ts `imprison`, `release`), and so are the release
// record's kind, id and facts. Everything after the record is the director's
// own: it stages the scene from the record, `purposeScene` words it, and
// `replyInScene` writes the reply back.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(10).toString("hex");
const ATTEMPTS = 6;
/** Days the person served before the staged release (about eight months). */
const SERVED_DAYS = 240;

/** Every path of a tree: the replies chosen, the node it reaches. */
const paths = (node: TreeNode, prefix: number[] = []): number[][] =>
  node.replies.flatMap((reply, index) =>
    reply.next
      ? [[...prefix, index], ...paths(reply.next, [...prefix, index])]
      : [[...prefix, index]],
  );

/** The rows the justice engine writes for a term that ends today, and the release record. */
function stageRelease(
  core: CoreState,
  personId: PersonId,
  witness: PersonId[],
) {
  const api = coreAPI(core);
  const person = core.people.get(personId)!;
  const from = addDays(makeIsoDate(core.date), -SERVED_DAYS);
  const sentenceId = `sentence:staged:${personId}`;
  const sentence: SentenceRow = {
    id: sentenceId,
    kind: "person",
    caseId: `case:staged:${personId}`,
    personId,
    date: from,
    severity: 1,
    fineMinor: 0,
    finePaidMinor: 0,
    forfeitureMinor: 0,
    forfeiturePaidMinor: 0,
    treasuryId: null,
    probationMonths: 0,
    custodyMonths: 8,
    releaseDate: core.date,
    seatsVacated: [],
    // The term ended the job they held, as `endCustodyJobs` does.
    jobsEnded: person.jobId ? [person.jobId] : [],
    reasons: {},
    source: {
      tag: "SOURCED",
      citation: "Staged for the test as the court's sentence.",
      asOf: core.date,
    },
  };
  const custody: CustodyRow = {
    id: `custody:${sentenceId}`,
    kind: "person",
    personId,
    sentenceId,
    from,
    until: core.date,
    status: "released",
    priorEligible: null,
  };
  const tables = api.moduleState(JUSTICE_MODULE_ID);
  tables.table("sentences").put(sentence as never);
  tables.table("custody").put(custody as never);
  const id = `justice.released:${custody.id}`;
  api.emit({
    id,
    date: core.date,
    kind: "justice.released",
    personIds: [personId],
    witnessIds: witness,
    placeId: person.placeId,
    publicRecord: true,
    news: true,
    facts: { sentenceId },
    source: {
      tag: "SOURCED",
      citation: "Release at the end of the prison term the court set.",
      asOf: core.date,
    },
  });
  return { id, custody, jobEnded: sentence.jobsEnded.length > 0 };
}

it(`a homecoming is about the term and what it asks, from the records (seed ${seed})`, () => {
  setBookkeeping(false);
  const tried: string[] = [];
  const done = new Set<string>();
  try {
    for (let attempt = 0; attempt < ATTEMPTS && done.size < 2; attempt += 1) {
      const place = drawPlace(seed, `homecoming:${attempt}`);
      const where = `${place.name} (${place.key}), seed ${place.seed}`;
      const { core, director, playerId } = buildBenchWorld(
        place.seed,
        gameStartDate(),
        { twoLevel: true, placeKey: place.key },
      );
      const player = core.people.get(playerId!)!;
      if (!director.ledger.people.has(playerId!))
        director.watch(core, playerId!);
      const other = (core.households.get(player.householdId)?.memberIds ?? [])
        .map((id) => core.people.get(id as PersonId)!)
        .find((row) => row.id !== player.id && row.alive);
      if (!other) {
        tried.push(`${where}: the player lives alone`);
        continue;
      }
      // The waiting mode: the housemate comes home and asks the player. The
      // released mode: the player comes home and the housemate asks.
      for (const mode of ["asker-back", "you-back"] as const) {
        if (done.has(mode)) continue;
        advanceCore(core, addDays(makeIsoDate(core.date), 2));
        const releasedId = mode === "asker-back" ? other.id : player.id;
        const staged = stageRelease(
          core,
          releasedId,
          mode === "asker-back" ? [player.id] : [],
        );
        advanceCore(core, addDays(makeIsoDate(core.date), 1));
        const book = director.ledger.people.get(playerId!)!;
        const entry = book.schedule.find(
          (row) =>
            row.momentId.includes(staged.id) &&
            row.bindings.some((bound) => bound.typeKey === "return"),
        );
        if (!entry) {
          tried.push(`${where}: ${mode}, the release staged no return scene`);
          continue;
        }
        const moment = book.momentsById.get(entry.momentId)!;
        const result = purposeScene(core, director, playerId!, entry);
        expect(result?.kind, `${where}: ${JSON.stringify(result)}`).toBe(
          "composed",
        );
        if (result?.kind !== "composed") return;
        const { scene } = result;
        expect(scene.purpose, where).toBe("homecoming");
        // The one who speaks is the one the scene says: the person home, or
        // the relative waiting for the player.
        const mark = scene.facts.find((row) => row.key === mode);
        expect(mark?.recordIds, `${where}: ${mode}`).toContain(staged.id);
        if (mode === "asker-back") expect(scene.askerId, where).toBe(other.id);
        else {
          expect(scene.askedId, where).toBe(player.id);
          expect(scene.askerId, where).not.toBe(player.id);
        }
        // How long they were away is said from the custody row.
        const away = scene.facts.find((row) => row.key === "away");
        expect(away?.text, where).toBe(spanSaid(SERVED_DAYS));
        expect(away?.recordIds, where).toContain(staged.custody.id);
        expect(
          scene.talk.narration.map((row) => row.text).join(" "),
          where,
        ).toContain(away!.text);
        // The job is gone only where the term ended one.
        expect(
          scene.facts.some((row) => row.key === "job-lost"),
          where,
        ).toBe(staged.jobEnded);
        // Four ways to answer, and a branch deeper than one.
        const root = scene.talk.tree.replies.map((reply) => reply.line);
        expectUpToFourDifferent(root, where);
        for (const row of root)
          expect(["agree", "ask", "deflect"], where).toContain(row.move);
        expect(scene.talk.depth, where).toBeGreaterThan(1);
        expect(
          scene.talk.gaps.filter((gap) => gap.includes("/ending/")),
          where,
        ).toEqual([]);
        for (const row of scene.talk.lines)
          expect(row.text, where).not.toMatch(
            /\d{4}-\d{2}-\d{2}|\b[a-z]+[-.:][a-z-]+:|\{|\}|undefined|\d{5,}/,
          );
        // Every end keeps something; the path that settles what comes next
        // is written back on a reply record with what it settles in the scene.
        const ends = paths(scene.talk.tree).flatMap((full) => {
          let node: TreeNode | null = scene.talk.tree;
          for (const index of full) node = node?.replies[index]?.next ?? null;
          return node?.end?.ending ? [{ full, ending: node.end.ending }] : [];
        });
        const settled = ends.find(
          (row) => row.ending.keeps === "kept-in-scene",
        );
        expect(settled, `${where}: no path settles in the scene`).toBeTruthy();
        const id = replyInScene(
          core,
          director,
          playerId!,
          entry,
          settled!.full,
        );
        const reply = core.durableLog.get(id!);
        expect(reply?.facts?.typeKey, where).toBe("return");
        expect(reply?.facts?.causeId, where).toBe(moment.causeId);
        expect(reply?.facts?.ending, where).toBe("settled-what-comes-next");
        expect(reply?.facts?.keeps, where).toBe("kept-in-scene");
        expect(reply?.personIds, where).toContain(scene.askerId);
        const told = composeJournal(core, director, playerId!)
          .flatMap((chapter) => chapter.lines)
          .find((line) => line.momentIds.includes(id!));
        const said = scene.talk.lines.map((row) => row.text).join(" | ");
        const note = `HOMECOMING (hand-staged release) ${where}: ${mode}, ${core.date}, cause ${moment.causeId}, ${player.id} with ${scene.askerId} (away ${away?.text}); reply ${id} ending ${reply?.facts?.ending}; journal "${told?.text ?? "(other unnamed)"}"\n  ${said}`;
        if (process.env.SCENE_LOG)
          writeFileSync(process.env.SCENE_LOG, note, { flag: "a" });
        process.stdout.write(`${note}\n`);
        done.add(mode);
      }
    }
    expect(
      [...done].sort(),
      `homecoming not played both ways: ${tried.join("; ")} (seed ${seed})`,
    ).toEqual(["asker-back", "you-back"]);
  } finally {
    setBookkeeping(true);
  }
}, 3_600_000);
