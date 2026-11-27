/**
 * Finds played lives for the talk after a lost race (development tooling).
 * For each drawn seed it plays a new adult who files and presses on the
 * campaign page (family-loss-life.ts), and names the lives whose own loss
 * opens the household's talk, with the stake and the gift's size. It stops at
 * one hour and prints every life it passed over and why.
 *
 *   node --import tsx scripts/words/family-loss-life-scan.ts [first-seed-number] [count]
 */
import { playLife, type Presses } from "./family-loss-life";
import { resultOf } from "../../src/core2/modules/voting";
import { coreAPI } from "../../src/core2/state";
import { purposeScene } from "../../src/director/purpose-scene";

const [startArg, countArg, onlyPlan] = process.argv.slice(2);
const start = Number(startArg ?? 1);
const count = Number(countArg ?? 60);
const deadline = Date.now() + 55 * 60_000;
const PLANS: Presses[] = [
  { volunteer: true, give: 0 },
  { volunteer: true, give: 100 },
  { volunteer: true, give: "quarter" },
  { volunteer: true, give: "most" },
];
for (let n = start; n < start + count && Date.now() < deadline; n += 1) {
  for (const presses of onlyPlan ? [PLANS[Number(onlyPlan)]!] : PLANS) {
    if (Date.now() > deadline) break;
    const seed = `losslife:${n}`;
    const tag = `${seed} ${JSON.stringify(presses)}`;
    try {
      const life = playLife(seed, presses);
      if (!("core" in life)) {
        process.stdout.write(`PASS ${tag}: ${life.where}: ${life.note}\n`);
        break;
      }
      const { core, director, me, contest } = life;
      const result = resultOf(coreAPI(core), contest.id);
      const causeId = `election-result:${contest.id}`;
      const missed = JSON.parse(
        String(core.durableLog.get(causeId)?.facts?.outIds ?? "[]"),
      ) as string[];
      const entry = director.ledger.people
        .get(me)!
        .schedule.find((row) => row.momentId.includes(causeId));
      if (!result?.winnerId || !missed.includes(me) || !entry) {
        process.stdout.write(
          `PASS ${tag}: ${life.where}: ${result?.winnerId ? (missed.includes(me) ? "no moment" : "player seated or not out") : "no winner"}\n`,
        );
        continue;
      }
      const scene = purposeScene(core, director, me, entry, {
        typeKey: "family-loss",
      });
      if (scene?.kind !== "composed") {
        process.stdout.write(
          `PASS ${tag}: ${life.where}: lost, no household talk (${scene?.kind ?? "none"}) gave ${life.gaveMinor}\n`,
        );
        continue;
      }
      process.stdout.write(
        `PICK ${tag}: ${life.where}: lost; facts ${scene.scene.facts.map((f) => f.key).join(",")}; gave ${life.gaveMinor}; opener "${scene.scene.talk.state.text}"\n`,
      );
    } catch (error) {
      process.stdout.write(
        `PASS ${tag}: ${(error as Error).message.slice(0, 160)}\n`,
      );
    }
  }
}
