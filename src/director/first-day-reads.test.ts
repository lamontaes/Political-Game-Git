import { randomBytes } from "crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, ageOnDate, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { ownerOf } from "../core2/modules/business";
import { corePlaceByKey } from "../core2/place-lookup";
import { coreAPI } from "../core2/state";
import type { PersonId } from "../core2/types";
import sceneTalkBank from "../../data/english/parts/scene-talk.json" with { type: "json" };
import { purposeScene } from "./purpose-scene";
import type { TreeNode } from "./scene-talk";

// The first day at work speaks for the job's own records (Story lead, Nov 17):
// the employer, the job, the hours, the owner only where the business engine
// names one, and who held the job before only where the opening the hire
// filled names them. Each place is drawn from all 56 and every place passed
// over is named.

const SEED = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");

type Part = {
  key: string;
  text: string;
  uses: {
    purpose?: string;
    step: string;
    move: string;
    requiresFacts?: string[];
  }[];
};
const PARTS = (sceneTalkBank as unknown as { parts: Part[] }).parts;
const FIRST_DAY = PARTS.filter((part) =>
  part.uses.some((use) => use.purpose === "first-day-ropes"),
);
/** The facts a slot in a line's text stands on, by slot name. */
const FACT_SLOTS = [
  "employer",
  "job",
  "hours",
  "boss",
  "before-you",
  "coworkers",
  "longest-there",
  "came-from",
];

/** Every piece said anywhere in a talk's tree. */
function piecesOf(node: TreeNode, out: string[] = []): string[] {
  for (const line of node.lines) out.push(...line.parts);
  for (const reply of node.replies) {
    out.push(...reply.line.parts);
    if (reply.next) piecesOf(reply.next, out);
  }
  if (node.end?.close) out.push(...node.end.close.parts);
  return out;
}

/**
 * Plays drawn places a month at a time, the director watching the town's
 * working-age full people, until `count` first-day scenes are composed; returns
 * them with the world, or throws naming every place passed over.
 */
function findFirstDays(count: number, months: number, tries: number) {
  const passed: string[] = [];
  for (let attempt = 0; attempt < tries; attempt += 1) {
    const place = drawPlace(`${SEED}:${attempt}`, "first-day");
    const where = `${place.name} (${place.key}), seed ${SEED}:${attempt}`;
    const { core, director } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const town = corePlaceByKey(place.key)?.context.jurisdiction.id;
    const watched = new Set<string>();
    const watch = () => {
      for (const person of core.people.values()) {
        if (watched.has(person.id)) continue;
        const age = ageOnDate(
          makeIsoDate(person.birthDate),
          makeIsoDate(core.date),
        );
        if (
          person.alive &&
          person.tier !== "husk" &&
          person.placeId === town &&
          age >= 16 &&
          age < 70
        ) {
          watched.add(person.id);
          core.focusPersonIds.add(person.id as PersonId);
          director.watch(core, person.id as PersonId);
        }
      }
    };
    watch();
    const seen = new Set<string>();
    const scenes: {
      scene: Extract<
        NonNullable<ReturnType<typeof purposeScene>>,
        { kind: "composed" }
      >["scene"];
      causeId: string;
    }[] = [];
    const skipped: string[] = [];
    for (let month = 0; month < months && scenes.length < count; month += 1) {
      advanceCore(core, addDays(makeIsoDate(core.date), 30));
      watch();
      for (const book of director.ledger.people.values())
        for (const entry of book.schedule) {
          const key = `${book.personId}|${entry.momentId}`;
          if (seen.has(key)) continue;
          seen.add(key);
          const moment = book.momentsById.get(entry.momentId);
          if (moment?.label !== "money:job-started") continue;
          if (!entry.bindings.some((row) => row.typeKey === "first-day"))
            continue;
          const result = purposeScene(
            core,
            director,
            book.personId as PersonId,
            entry,
            { typeKey: "first-day" },
          );
          if (result?.kind !== "composed") {
            skipped.push(`${moment.causeId}: ${result?.reason ?? "none"}`);
            continue;
          }
          scenes.push({ scene: result.scene, causeId: moment.causeId });
        }
    }
    if (scenes.length >= count) return { core, scenes, where, passed };
    passed.push(
      `${where}: ${scenes.length} first-day scenes by ${core.date}${skipped.length ? ` (${skipped.slice(0, 2).join("; ")})` : ""}`,
    );
  }
  throw new Error(`no first-day scenes: ${passed.join("; ")}`);
}

describe("the first day at work reads the records behind the job", () => {
  it("every first-day line carries the facts its words stand on and none gives advice", () => {
    expect(FIRST_DAY.length).toBeGreaterThan(0);
    for (const part of FIRST_DAY)
      for (const use of part.uses.filter(
        (row) => row.purpose === "first-day-ropes",
      )) {
        // The mentor's scene, weeks later, gives advice on getting on; the
        // first day tells where things are and who is who.
        expect(use.move, part.key).not.toBe("advise");
        for (const fact of ["mentor-years", "mentor-office", "mentor-since"])
          expect(use.requiresFacts ?? [], part.key).not.toContain(fact);
        // A slot is filled only where its fact is held.
        for (const [, slot] of part.text.matchAll(/\{([\w-]+)\}/g))
          if (FACT_SLOTS.includes(slot!))
            expect(use.requiresFacts ?? [], `${part.key}: {${slot}}`).toContain(
              slot,
            );
      }
  });

  it("the employer, the job and the hours are the job's and the calendar's records, a boss is the business engine's owner and a previous holder is the opening's", () => {
    setBookkeeping(false);
    const found = findFirstDays(3, 24, 4);
    const here = `${found.where}`;
    const api = coreAPI(found.core);
    for (const { scene, causeId } of found.scenes) {
      const at = `${here} (${causeId})`;
      const fact = (key: string) => scene.facts.find((row) => row.key === key);
      const job = found.core.jobs.get(causeId);
      expect(job, at).toBeDefined();
      expect(fact("employer")?.recordIds, at).toContain(job!.organizationId);
      expect(fact("employer")?.recordIds, at).toContain(causeId);
      if (fact("job")) expect(fact("job")!.recordIds, at).toContain(causeId);
      if (fact("hours"))
        expect(
          fact("hours")!.recordIds.some((id) =>
            found.core.work.commitments.has(id),
          ),
          `${at}: hours cite a work calendar`,
        ).toBe(true);
      // The boss is the business engine's owner of the employer, a living
      // person other than the two in the scene; no owner, no boss.
      const owner = ownerOf(api, job!.organizationId);
      if (fact("boss"))
        expect(fact("boss")!.recordIds, `${at}: boss`).toContain(owner);
      else
        expect(
          owner &&
            found.core.people.get(owner as PersonId)?.alive &&
            owner !== job!.personId &&
            owner !== scene.askerId,
          `${at}: an owner is named but no boss line can play`,
        ).toBeFalsy();
      // Who held the job before is named by the opening the hire filled,
      // which cites the replaced worker.
      if (fact("before-you"))
        expect(
          fact("before-you")!.recordIds.length,
          `${at}: before-you cites an opening and a person`,
        ).toBeGreaterThanOrEqual(2);
      // No figure is spoken: hours, crew and spans are said in words.
      for (const line of [scene.talk.state, ...scene.talk.narration])
        expect(line.text, at).not.toMatch(/\d/);
      // Every piece said is one the first day owns.
      const owned = new Set(FIRST_DAY.map((part) => part.key));
      for (const key of [
        ...scene.talk.narration.flatMap((line) => line.parts),
        ...scene.talk.state.parts,
        ...piecesOf(scene.talk.tree),
      ])
        expect(owned.has(key), `${at}: ${key}`).toBe(true);
    }
    process.stdout.write(
      `FIRST DAY ${here}: ${found.scenes
        .map((row) => row.scene.talk.state.text)
        .join(
          " | ",
        )}${found.passed.length ? `; passed over ${found.passed.join("; ")}` : ""}\n`,
    );
  }, 900_000);
});
