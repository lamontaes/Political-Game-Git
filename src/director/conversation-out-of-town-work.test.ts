/**
 * Work out of town has a true answer (words-out-of-town-work-has-a-true-answer).
 * One played world (buildBenchWorld, every module) in a place drawn from all
 * 56, seed from GOLDEN_PATH_SEED (random when unset): a resident whose
 * employer is the outside market is asked what they do now, and the answer is
 * one of the bank's out-of-town lines with the job record's title filled and,
 * when the record names it, the other town. Places are drawn and passed over
 * until one has such a resident; each one passed over is printed.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, ageOnDate, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import type { PersonId } from "../core2/types";
import { buildBenchWorld } from "../bench/world";
import bank from "../../data/english/parts/conversation.json";
import { openConversation, say, type Conversation } from "./conversation";

const seed = process.env.GOLDEN_PATH_SEED || randomBytes(20).toString("hex");

interface Part {
  key: string;
  text: string;
  uses: { requiresFacts?: string[] }[];
}
/** The bank's out-of-town lines, by the engine's own fact. */
const LINES = (bank as { parts: Part[] }).parts.filter((part) =>
  part.uses.some((use) => use.requiresFacts?.includes("work-out-of-town")),
);

const escape = (text: string) => text.replace(/[.*+?^$()|[\]\\]/g, "\\$&");
/** A bank line as a pattern: each slot filled with something. */
const pattern = (text: string) =>
  new RegExp(`^${escape(text).replace(/\\?\{\w+\\?\}/g, ".+")}$`);

describe("work out of town", () => {
  it("answers what do you do now with the job's title, from the record", () => {
    setBookkeeping(false);
    expect(LINES.length).toBe(4);
    const passed: string[] = [];
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const place = drawPlace(seed, `out-of-town-work-${attempt}`);
      const where = `${place.name} (${place.key}), seed ${seed}`;
      const world = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
      const core = world.core;
      advanceCore(core, addDays(makeIsoDate(core.date), 30));
      const adults = [...core.people.values()].filter(
        (person) =>
          person.alive && ageOnDate(person.birthDate, core.date) >= 18,
      );
      const away = adults.filter((person) => {
        const job = person.jobId ? core.jobs.get(person.jobId) : undefined;
        return job && core.organizations.get(job.organizationId)?.outsideFlow;
      });
      if (!away.length) {
        passed.push(`${where}: no resident works out of town`);
        continue;
      }
      let asked = 0;
      for (const other of away) {
        const job = core.jobs.get(other.jobId!)!;
        const asker = adults.find((person) => person.id !== other.id)!;
        const talk = openConversation(
          core,
          asker.id as PersonId,
          other.id as PersonId,
          { director: world.director },
        );
        // Walk the talk: take the choice that asks about their work when
        // one is offered, else the first, until the other person has said
        // what they do or the talk runs out.
        let reply: Conversation = talk;
        let raised = false;
        for (let turn = 0; turn < 8 && reply.choices.length; turn += 1) {
          const raise = reply.choices.find((row) =>
            row.raises?.startsWith("their-work:"),
          );
          if (raise) raised = true;
          reply = say(core, reply, (raise ?? reply.choices[0]!).key);
          if (
            raised &&
            reply.lines.some(
              (line) =>
                line.speakerId === other.id &&
                LINES.some((part) => pattern(part.text).test(line.text)),
            )
          )
            break;
        }
        if (!raised) {
          passed.push(`${where}: ${job.id} was never asked about`);
          continue;
        }
        asked += 1;
        const said = reply.lines.filter((line) => line.speakerId === other.id);
        const heard = said.find((line) =>
          LINES.some((part) => pattern(part.text).test(line.text)),
        );
        console.log(
          `out-of-town: ${where}, job ${job.id}, ${
            heard ? `"${heard.text}"` : "no out-of-town line"
          }`,
        );
        expect(
          heard,
          `${where}, job ${job.id} (${job.title}), said: ${reply.lines.map((line) => `${line.speakerId === other.id ? "O" : "P"}:${line.text}`).join(" / ")} choices: ${reply.choices.map((row) => `${row.move}:${row.text}`).join(" | ")}`,
        ).toBeDefined();
        expect(heard!.text.toLowerCase(), job.id).toContain(
          job.title.toLowerCase(),
        );
        expect(heard!.sourceRecordIds, job.id).toContain(job.id);
      }
      if (asked) {
        for (const note of passed)
          console.log(`out-of-town passed over: ${note}`);
        return;
      }
    }
    throw new Error(
      `no drawn place had a resident to ask: ${passed.join("; ")}`,
    );
  }, 900_000);
});
