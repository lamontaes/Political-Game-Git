import { randomBytes } from "node:crypto";
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
import { purposeScene, replyInScene } from "./purpose-scene";
import type { TreeNode } from "./scene-talk";

// The day the player goes into prison, someone in their home who stays asks
// something of them before they go (owner, Nov 9: a purpose for every scene
// kind that lacks one). The term, the day they get out and the child at home
// are said from the justice engine's records.
//
// HAND-STAGED: a sentence for the player is rare in a played year (it takes a
// bribe, a report, a charge and a verdict), so the sentence and custody rows
// and the `justice.imprisoned` record are written as the justice engine writes
// them (`imprison`), as prison-visit-scene.test.ts does. The director then
// casts the departure for the player on its own, from the record.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(10).toString("hex");
const ATTEMPTS = 4;
const TERM_MONTHS = 18;

const paths = (node: TreeNode, prefix: number[] = []): number[][] =>
  node.replies.flatMap((reply, index) =>
    reply.next
      ? [[...prefix, index], ...paths(reply.next, [...prefix, index])]
      : [[...prefix, index]],
  );
const endsKeeping = (tree: TreeNode, keeps: string) =>
  paths(tree).filter((full) => {
    let node: TreeNode | null = tree;
    for (const index of full) node = node?.replies[index]?.next ?? null;
    return node?.end?.ending?.keeps === keeps;
  });
const SLOP = /\d{4}-\d{2}-\d{2}|\b[a-z]+[-.:][a-z-]+:|\{|\}|undefined|\d{5,}/;

const source = (core: CoreState) => ({
  tag: "SOURCED" as const,
  citation: "Staged for the test as the justice engine writes it.",
  asOf: core.date,
});

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
  return { id, release };
}

it(`someone who stays asks something of the player before they go into prison (seed ${seed})`, () => {
  setBookkeeping(false);
  const tried: string[] = [];
  let played = 0;
  try {
    for (let attempt = 0; attempt < ATTEMPTS && played < 2; attempt += 1) {
      const place = drawPlace(seed, `departure:${attempt}`);
      const where = `${place.name} (${place.key}), seed ${place.seed}`;
      const { core, director, playerId } = buildBenchWorld(
        place.seed,
        gameStartDate(),
        { twoLevel: true, placeKey: place.key },
      );
      const id = playerId as PersonId;
      director.watch(core, id);
      const book = director.ledger.people.get(id)!;
      advanceCore(core, addDays(makeIsoDate(core.date), 30));
      const staged = stageSentence(core, id);
      let entry;
      for (let day = 0; day < 6 && !entry; day += 1) {
        advanceCore(core, addDays(makeIsoDate(core.date), 1));
        entry = book.schedule.find(
          (row) =>
            row.bindings.some((b) => b.typeKey === "departure") &&
            book.momentsById.get(row.momentId)?.causeId === staged.id,
        );
      }
      if (!entry) {
        tried.push(`${where}: no departure scheduled`);
        continue;
      }
      const result = purposeScene(core, director, id, entry, {
        typeKey: "departure",
      });
      expect(result?.kind, `${where}: ${JSON.stringify(result)}`).toBe(
        "composed",
      );
      if (result?.kind !== "composed") continue;
      const { scene } = result;
      expect(scene.purpose, where).toBe("departure-ask");
      expect(scene.askedId, where).toBe(id);
      // Someone in the player's home asks, never the player.
      expect(scene.askerId, where).not.toBe(id);
      const fact = (key: string) => scene.facts.find((row) => row.key === key);
      expect(fact("release")?.recordIds, where).toEqual([staged.id]);
      expect(fact("sentence")?.recordIds, where).toEqual([staged.id]);
      for (const row of scene.talk.lines) {
        expect(row.text, where).not.toMatch(SLOP);
        expect(row.text, where).not.toMatch(/\ball right\b/i);
      }
      expect(scene.talk.gaps, where).toEqual([]);
      expect(scene.talk.depth, where).toBeGreaterThan(1);
      const yes = endsKeeping(scene.talk.tree, "promise")[0];
      expect(yes, `${where}: no path keeps a promise`).toBeTruthy();
      const replyId = replyInScene(core, director, id, entry, yes!, {
        typeKey: "departure",
      });
      const reply = core.durableLog.get(replyId!);
      expect(reply?.facts?.typeKey, where).toBe("departure");
      expect(reply?.facts?.causeId, where).toBe(staged.id);
      expect(reply?.facts?.keeps, where).toBe("promise");
      expect(reply?.personIds, where).toContain(scene.askerId);
      played += 1;
      process.stdout.write(
        `DEPARTURE ${where}: ${staged.id}; ${id} asked by ${scene.askerId} (household ${core.people.get(scene.askerId)?.householdId === core.people.get(id)?.householdId}); facts ${scene.facts.map((f) => f.key).join(",")}; reply ${replyId} ending ${reply?.facts?.ending}\n  ${scene.talk.narration.map((l) => l.text).join(" ")} | ${scene.talk.state.text}\n`,
      );
    }
    expect(played, `seed ${seed}: ${tried.join("; ")}`).toBeGreaterThan(0);
  } finally {
    setBookkeeping(true);
  }
}, 3_600_000);
