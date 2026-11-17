/**
 * The apology over a missed payment (Story lead, Nov 17: the owed-apology rewrite) talks about that
 * payment, and the promise to pay on time is the credit engine's to settle:
 *
 * - the facts the lines lean on come from the credit engine's own records by id: `loan` from the
 *   missed payment (`credit.payment-missed`), `lender` and `behind` from the loan row, `due-next`
 *   from the engine's calendar;
 * - the `.close` and `.money` talks open on a line written for them, placed by one of those facts;
 * - the reply that promises writes the `pay-on-time` promise against the quarrel over that missed
 *   payment (promise-kinds.json), open until the next payment settles it;
 * - a thank-you never ends a path in which the player confronted.
 *
 * The place is drawn from all 56 by seed and attempt, never pinned; a draw with no town bank or no
 * grown housemate is passed over and named. HAND-STAGED: one loan row in the player's name and the
 * player's cash taken out through the engine's own transfer, the day before the credit engine bills
 * (the missed payment, the quarrel and the scene are the engines' own from there); the wronged
 * housemate's cash and traits are set so the family's own scoring gives each arc (`chooseVariant`),
 * and each arc is composed on a probe copy of the quarrel.
 */
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { daysBetweenText } from "../core2/kernel/dates";
import { loanOf, nextBillingDay } from "../core2/modules/business";
import { FAMILY_QUARREL } from "../core2/modules/partnerships";
import { coreAPI } from "../core2/state";
import { transferCash } from "../core2/world-transfer";
import type { PersonId } from "../core2/types";
import { drawPlace } from "../../scripts/core2-year/place";
import { pathTo } from "../../tests/support/promise-play";
import { play } from "../../tests/support/real-borrower";
import { apologyReads } from "./apology-facts";
import { chooseVariant } from "./arc-variant";
import { promisesBetween } from "./promises";
import { purposeScene, replyInScene } from "./purpose-scene";
import type { ScheduleEntry } from "./scheduling";
import type { TreeNode } from "./scene-talk";

const SEED = "apology-paths-1";
const ATTEMPTS = 4;
const CLOSE_FACETS = [
  "personality-v1:facet-sensitive",
  "personality-v1:facet-tender-hearted",
  "personality-v1:facet-affectionate",
];

/** Every path of a tree: the reply moves taken and how it ends. */
function walk(
  node: TreeNode,
  taken: readonly string[],
  out: { replies: string[]; close?: string }[],
) {
  if (node.end) out.push({ replies: [...taken], close: node.end.close?.move });
  for (const reply of node.replies)
    if (reply.next) walk(reply.next, [...taken, reply.line.move], out);
}

describe("the apology over a missed payment", () => {
  it("names the payment from the credit row by record id, writes the pay-on-time promise against it, and never thanks after a confront", () => {
    const previous = setBookkeeping(false);
    const passed: string[] = [];
    let proven = 0;
    try {
      for (let attempt = 0; attempt < ATTEMPTS && !proven; attempt += 1) {
        const place = drawPlace(SEED, `apology:${attempt}`);
        const where = `${place.name} (${place.key}), seed ${SEED} draw ${attempt}, world seed ${place.seed}`;
        const { core, director, playerId } = buildBenchWorld(
          place.seed,
          gameStartDate(),
          { twoLevel: true, placeKey: place.key },
        );
        const me = playerId as PersonId;
        const api = coreAPI(core);
        director.watch(core, me);
        core.focusPersonIds.add(me);
        const book = director.ledger.people.get(me)!;
        play(core, me, 2);
        const bank = api
          .moduleState("credit")
          .table("banks")
          .get("credit:bank") as unknown as
          { organizationId: string } | undefined;
        const player = core.people.get(me)!;
        const members = (
          core.households.get(player.householdId)?.memberIds ?? []
        )
          .map((id) => core.people.get(id)!)
          .filter((row) => row?.alive);
        if (!bank) {
          passed.push(`${where}: no town bank`);
          continue;
        }
        const monthly =
          members.reduce((sum, row) => sum + row.livingCostDailyMinor, 0) * 30;
        const loanId = `loan:${player.householdId}:${core.date}`;
        api
          .moduleState("credit")
          .table("loans")
          .put({
            id: loanId,
            isLoan: true,
            open: true,
            householdId: player.householdId,
            borrowerId: me,
            lenderId: bank.organizationId,
            kind: "personal",
            principalMinor: monthly * 2,
            balanceMinor: monthly * 2,
            annualRate: 0.1,
            marketAnnualRate: 0.1,
            rateLawId: null,
            paymentMinor: Math.round(monthly / 2),
            openedAt: core.date,
            pastDueMinor: 0,
            standing: "current",
          } as never);
        const sink = [...core.organizations.values()]
          .filter(
            (org) =>
              org.placeId === player.placeId && org.id !== bank.organizationId,
          )
          .sort((a, b) => b.liquidMinor - a.liquidMinor)[0]!.id;
        const source = (what: string) => ({
          tag: "ESTIMATED" as const,
          asOf: core.date,
          citation: `Hand-staged for the apology test: ${what}.`,
          estimatedFrom: "src/director/apology-paths.test.ts",
        });
        let moves = 0;
        const money = (from: string, to: string, minor: number) =>
          transferCash(
            api,
            `test:${(moves += 1)}`,
            from,
            to,
            minor,
            source("cash moved"),
          );
        const due = nextBillingDay(api)!;
        play(core, me, Math.max(1, daysBetweenText(core.date, due) - 1));
        money(me, sink, core.people.get(me)!.liquidMinor);
        const found: string[] = [];
        api.subscribeEvents("apology-test", [FAMILY_QUARREL], (_, event) => {
          if (event.facts?.owes === me) found.push(event.id);
        });
        for (let day = 0; day < 6 && core.date <= due; day += 1)
          play(core, me, 2);
        if (!found[0]) {
          passed.push(`${where}: the missed payment made no quarrel`);
          continue;
        }
        const quarrel = core.durableLog.get(found[0])!;
        const missed = core.durableLog.get(String(quarrel.facts?.missedId))!;
        expect(missed.kind, where).toBe("credit.payment-missed");
        const wronged = quarrel.personIds.find((id) => id !== me)! as PersonId;

        // The reads, from the credit engine's records by id.
        const reads = apologyReads(core, {
          causeId: quarrel.id,
          wrongedId: wronged,
          borrowerId: me,
        });
        const loan = loanOf(api, String(missed.facts?.loanId))!;
        expect(loan.id, where).toBe(loanId);
        expect(reads.loan?.text, where).toBe("the loan");
        expect(reads.loan?.sourceRecordIds, where).toEqual([
          quarrel.id,
          missed.id,
        ]);
        expect(reads.lender?.sourceRecordIds, where).toContain(loan.lenderId);
        expect(reads.lender?.text, where).toBe(
          core.organizations.get(loan.lenderId)!.name,
        );
        expect(reads.behind?.sourceRecordIds, where).toContain(loan.id);
        expect(reads["due-next"]?.sourceRecordIds, where).toContain(loan.id);

        // The scene the director staged for the quarrel; each arc is composed on a probe copy of it.
        const find = (causeId: string) =>
          book.schedule.find(
            (row) =>
              row.bindings.some((b) => b.typeKey === "apology") &&
              book.momentsById.get(row.momentId)?.causeId === causeId,
          );
        let real: ScheduleEntry | undefined;
        for (let day = 0; day < 10 && !(real = find(quarrel.id)); day += 1)
          play(core, me, 2);
        if (!real) {
          passed.push(`${where}: no apology staged for ${quarrel.id}`);
          continue;
        }
        const base = real;
        // Each arc, composed on a probe copy of the quarrel in a world that gives it.
        let copies = 0;
        const arc = (target: string) => {
          const traits = core.people.get(wronged)!.traits as Record<
            string,
            number
          >;
          for (const facet of CLOSE_FACETS)
            traits[facet] = target === "owed-apology.close" ? 0.8 : -0.8;
          for (let k = 0; k < 8; k += 1) {
            const choice = chooseVariant(core, {
              family: "owed-apology",
              askerId: wronged,
              askedId: me,
              cause: {
                id: `dry:${target}:${k}`,
                date: core.date,
                facts: { about: "money", missedId: missed.id },
              },
            });
            if (choice?.purpose === target) break;
            money(
              sink,
              wronged,
              core.people.get(wronged)!.livingCostDailyMinor * 365 * 4,
            );
          }
          const id = `${FAMILY_QUARREL}:${me}:${wronged}:${core.date}:probe-${(copies += 1)}`;
          api.emit({
            id,
            date: core.date,
            kind: FAMILY_QUARREL,
            personIds: [me, wronged],
            placeId: player.placeId,
            publicRecord: false,
            source: source("a probe copy of the quarrel"),
            facts: {
              about: "money",
              owes: me,
              missedId: missed.id,
              closeness: "1",
            },
          });
          // A copy of the real moment and entry on the probe's own record, so the scene draws its own wordings.
          const moment = structuredClone(book.momentsById.get(base.momentId)!);
          moment.id = `${base.momentId}:probe-${copies}`;
          moment.causeId = id;
          book.momentsById.set(moment.id, moment);
          const entry: ScheduleEntry = {
            ...structuredClone(base),
            momentId: moment.id,
            answered: [],
          };
          return { id, entry };
        };
        const proofs: string[] = [];
        for (const target of ["owed-apology.close", "owed-apology.money"]) {
          const probe = arc(target);
          if (!probe.entry) {
            passed.push(`${where}: no ${target} scene staged on ${probe.id}`);
            continue;
          }
          const result = purposeScene(core, director, me, probe.entry, {
            typeKey: "apology",
          });
          if (result?.kind !== "composed") {
            passed.push(`${where}: ${target} not composed`);
            continue;
          }
          const { scene } = result;
          if (scene.variant?.purpose !== target) {
            passed.push(
              `${where}: ${probe.id} played ${scene.variant?.purpose}, not ${target}`,
            );
            continue;
          }
          expect(
            scene.facts.find((f) => f.key === "loan")?.recordIds,
            where,
          ).toContain(missed.id);
          // The confront and the replies open on lines written for this arc and placed by the facts.
          expect(scene.talk.state.parts[0], where).toMatch(
            new RegExp(
              `^scene-talk\\.state-[a-z]+\\.${target.split(".")[1]}\\.`,
            ),
          );
          // A gap in the menu (the mirror of a confront) is the bank's to widen; a close nothing can word is not allowed.
          expect(
            scene.talk.gaps.filter((gap) => !gap.includes("/mirror/")),
            where,
          ).toEqual([]);
          // A thank-you never ends a path in which the player confronted.
          const paths: { replies: string[]; close?: string }[] = [];
          walk(scene.talk.tree, [], paths);
          expect(paths.length, where).toBeGreaterThan(0);
          for (const row of paths)
            if (row.replies.includes("confront"))
              expect(row.close, `${where}: ${row.replies.join(">")}`).not.toBe(
                "thank",
              );
          // The promise: written through the game's own reply, against this quarrel and its missed payment.
          const path = pathTo(scene.talk.tree, "promised-to-make-it-right");
          expect(path, where).toBeTruthy();
          const replyId = replyInScene(core, director, me, probe.entry, path!, {
            typeKey: "apology",
          })!;
          const reply = core.durableLog.get(replyId)!;
          expect(reply.facts?.promise, where).toBe("pay-on-time");
          expect(reply.facts?.causeId, where).toBe(probe.id);
          expect(core.durableLog.get(probe.id)?.facts?.missedId, where).toBe(
            missed.id,
          );
          const kept = promisesBetween(director.ledger, me, wronged).find(
            (row) => row.id === `promise:${replyId}`,
          );
          expect(kept?.kind, where).toBe("pay-on-time");
          expect(kept?.outcome, where).toBe("open");
          proofs.push(`${target} ${probe.id} ${replyId}`);
        }
        if (proofs.length) {
          process.stdout.write(`APOLOGY ${where}: ${proofs.join("; ")}\n`);
          proven += 1;
        }
      }
      expect(
        proven,
        `no drawn place gave a missed payment and an arc: ${passed.join("; ")}`,
      ).toBeGreaterThan(0);
    } finally {
      setBookkeeping(previous);
    }
  }, 900_000);
});
