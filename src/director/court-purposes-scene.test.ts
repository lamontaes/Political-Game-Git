import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, ageOnDate, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import {
  chargeDecision,
  JUSTICE_MODULE_ID,
  type CaseRow,
  type InvestigationRow,
} from "../core2/modules/justice";
import { P } from "../core2/parameters";
import { coreAPI } from "../core2/state";
import type { PersonId } from "../core2/types";
import { custodyFacts } from "./custody-facts";
import { purposeScene, replyInScene } from "./purpose-scene";
import type { TreeNode } from "./scene-talk";

// The player is charged and then judged, or a person in their household is,
// and the scene before the hearing and the one after the verdict have a
// purpose (owner, Nov 9: a purpose for every scene kind that lacks one).
// Before the hearing the family asks the accused (or the accused asks the
// family) what they will do about a lawyer, a plea, the family in court, the
// job and the children; after the verdict, what now. The justice engine
// charges and judges through its own `chargeDecision` and trial step; the
// director casts the scenes from its records; the facts are the case's.
//
// HAND-STAGED: the investigation row that makes the person a target, since a
// named person's charge is rare in a played year.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(10).toString("hex");
const ATTEMPTS = 8;
const SLOP = /\d{4}-\d{2}-\d{2}|\b[a-z]+[-.:][a-z-]+:|\{|\}|undefined|\d{5,}/;

const paths = (node: TreeNode, prefix: number[] = []): number[][] =>
  node.replies.flatMap((reply, index) =>
    reply.next
      ? [[...prefix, index], ...paths(reply.next, [...prefix, index])]
      : [[...prefix, index]],
  );

it(`a hearing and a verdict each ask something, from the case's records (seed ${seed})`, () => {
  setBookkeeping(false);
  const tried: string[] = [];
  const seen = new Set<string>();
  try {
    for (let attempt = 0; attempt < ATTEMPTS && seen.size < 4; attempt += 1) {
      const place = drawPlace(seed, `court-purposes:${attempt}`);
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
      const api = coreAPI(core);
      const table = (name: string) =>
        api.moduleState(JUSTICE_MODULE_ID).table(name);
      const player = core.people.get(id)!;
      const kin = (
        player.householdId
          ? (core.households.get(player.householdId)?.memberIds ?? [])
          : []
      ).find((other) => {
        const row = core.people.get(other as PersonId);
        return (
          other !== id &&
          row?.alive &&
          ageOnDate(row.birthDate, core.date) >= P.votingAge
        );
      }) as PersonId | undefined;
      // The player is charged on odd attempts; a household adult on even ones
      // where there is one.
      const accusedId = attempt % 2 === 1 || !kin ? id : kin;
      const side = accusedId === id ? "ask" : "asked";
      if (seen.has(`hearing-${side}`) && seen.has(`verdict-${side}`)) continue;
      const investigation: InvestigationRow = {
        id: `investigation:court-purposes:${seed}:${attempt}`,
        complaintIds: [],
        crimeId: `crime:court-purposes:${seed}:${attempt}`,
        prosecutorOfficeId: "office:court-purposes",
        prosecutorPersonId: null,
        opened: true,
        date: core.date,
        reasons: {},
        targets: [
          { personId: accusedId, crimeIds: [], evidence: [], strength: 1 },
        ],
        status: "open",
      };
      table("investigations").put(investigation as never);
      chargeDecision(api, investigation.id);
      const caseId = `case:${investigation.id}:${accusedId}`;
      const charged = table("cases").get(caseId) as unknown as
        CaseRow | undefined;
      if (!charged || charged.status === "no-charge") {
        tried.push(`${where}: no charge`);
        continue;
      }
      const sceneFor = (kind: "hearing" | "verdict", cause: string) => {
        for (let day = 0; day < 400; day += 1) {
          const entry = book.schedule.find((row) => {
            const moment = book.momentsById.get(row.momentId)!;
            return (
              row.bindings.some((b) => b.typeKey === kind) &&
              moment.causeId.startsWith(cause)
            );
          });
          if (entry) return entry;
          advanceCore(core, addDays(makeIsoDate(core.date), 1));
        }
        return undefined;
      };
      for (const [kind, cause] of [
        ["hearing", `justice.charged:${caseId}`],
        ["verdict", `justice.`],
      ] as const) {
        if (seen.has(`${kind}-${side}`)) continue;
        const entry =
          kind === "hearing"
            ? sceneFor(kind, cause)
            : (() => {
                // The verdict is the case's own: convicted or acquitted.
                for (let day = 0; day < 700; day += 1) {
                  const row = book.schedule.find((item) => {
                    const moment = book.momentsById.get(item.momentId)!;
                    const record = core.durableLog.get(moment.causeId);
                    return (
                      item.bindings.some((b) => b.typeKey === "verdict") &&
                      record?.facts?.caseId === caseId
                    );
                  });
                  if (row) return row;
                  advanceCore(core, addDays(makeIsoDate(core.date), 1));
                }
                return undefined;
              })();
        if (!entry) {
          tried.push(`${where}: no ${kind} scene for ${side}`);
          continue;
        }
        const moment = book.momentsById.get(entry.momentId)!;
        const record = core.durableLog.get(moment.causeId)!;
        const result = purposeScene(core, director, id, entry, {
          typeKey: kind,
        });
        expect(result?.kind, `${where}: ${JSON.stringify(result)}`).toBe(
          "composed",
        );
        if (result?.kind !== "composed") return;
        const { scene } = result;
        expect(scene.purpose, where).toBe(`court-${kind}-${side}`);
        // The player is always the one asked.
        expect(scene.askedId, where).toBe(id);
        expect(scene.askerId, where).not.toBe(id);
        const given = custodyFacts(core, record, scene.askerId, id);
        expect(
          given.charged || given.convicted || given.acquitted,
          where,
        ).toBeTruthy();
        for (const [key, expected] of Object.entries(given)) {
          const fact = scene.facts.find((row) => row.key === key);
          expect(fact?.text, `${where}: ${key}`).toBe(expected.text);
          expect(fact?.recordIds, `${where}: ${key}`).toEqual(
            expected.sourceRecordIds,
          );
        }
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
          typeKey: kind,
        });
        const reply = core.durableLog.get(replyId!);
        expect(reply?.facts?.typeKey, where).toBe(kind);
        expect(reply?.facts?.causeId, where).toBe(record.id);
        expect(reply?.facts?.keeps, where).toBe("promise");
        expect(reply?.personIds, where).toContain(scene.askerId);
        seen.add(`${kind}-${side}`);
        process.stdout.write(
          `COURT ${kind}-${side} ${where}: ${record.id}, ${scene.askerId} asks ${id}; facts ${scene.facts.map((f) => f.key).join(",")}; reply ${replyId} ending ${reply?.facts?.ending}\n  ${scene.talk.narration.map((l) => l.text).join(" ")} | ${scene.talk.state.text}\n`,
        );
      }
    }
    for (const need of ["hearing-ask", "verdict-ask"])
      expect(
        [...seen],
        `${need}: ${tried.join("; ")} (seed ${seed})`,
      ).toContain(need);
  } finally {
    setBookkeeping(true);
  }
}, 3_600_000);
