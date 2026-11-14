import { randomBytes } from "node:crypto";
import { writeFileSync } from "node:fs";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, ageOnDate, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { FAMILY_GATHERING_MISSED } from "../core2/modules/people";
import { FAMILY_MARRIED } from "../core2/modules/partnerships";
import { coreAPI } from "../core2/state";
import type { CoreState, PersonId } from "../core2/types";
import sceneBank from "../../data/english/parts/scene-talk.json" with { type: "json" };
import { celebrationFacts } from "./celebration-facts";
import { gatheringFacts } from "./gathering-facts";
import {
  destinationSaid,
  purposeScene,
  replyInScene,
  tieSide,
} from "./purpose-scene";
import { SITUATION_LIBRARY } from "./scheduling";
import type { TreeNode } from "./scene-talk";
import { expectUpToFourDifferent } from "./reply-set-check";

// A celebration and a family gathering with someone missing each ask for
// something (owner, Nov 9: a purpose for every scene kind that lacks one).
// The facts come from records the world keeps: for a gathering, the
// partnerships engine's own `family.gathering-missed` record (whose birthday,
// who was missing), the people's birth dates and places, the missing
// relative's life news and the tie's quarrel; for a celebration, the
// marriage record or the job row and its employer, the guest's place, a
// child born and the jobs engine's seeker row.
//
// The gathering scenes are NOT staged: they are the engine's own records in
// a played year. A celebration needs a wedding or a household member's new
// job; a played year seldom shows one for the player, so a wedding is
// HAND-STAGED through the partnerships writer (api.setPartnersV1 and the
// family.married record), as couple-scenes.test.ts does, and the new-job
// facts are read from the world's own job rows directly.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(10).toString("hex");
const ATTEMPTS = 2;

const paths = (node: TreeNode, prefix: number[] = []): number[][] =>
  node.replies.flatMap((reply, index) =>
    reply.next
      ? [[...prefix, index], ...paths(reply.next, [...prefix, index])]
      : [[...prefix, index]],
  );

function endsKeeping(tree: TreeNode, keeps: string) {
  return paths(tree).flatMap((full) => {
    let node: TreeNode | null = tree;
    for (const index of full) node = node?.replies[index]?.next ?? null;
    return node?.end?.ending?.keeps === keeps
      ? [{ full, ending: node.end.ending }]
      : [];
  });
}

const SLOP = /\d{4}-\d{2}-\d{2}|\b[a-z]+[-.:][a-z-]+:|\{|\}|undefined|\d{5,}/;

const log = (note: string) => {
  if (process.env.SCENE_LOG)
    writeFileSync(process.env.SCENE_LOG, `${note}\n`, { flag: "a" });
  process.stdout.write(`${note}\n`);
};

it(`a birthday with a relative missing asks the player to reach out, from the engine's own records (seed ${seed})`, () => {
  setBookkeeping(false);
  const tried: string[] = [];
  let played = 0;
  const found = new Set<string>();
  try {
    for (let attempt = 0; attempt < ATTEMPTS; attempt += 1) {
      const place = drawPlace(seed, `gathering:${attempt}`);
      const where = `${place.name} (${place.key}), seed ${place.seed}`;
      const { core, director, playerId } = buildBenchWorld(
        place.seed,
        gameStartDate(),
        { twoLevel: true, placeKey: place.key },
      );
      const id = playerId as PersonId;
      const player = core.people.get(id)!;
      director.watch(core, id);
      const book = director.ledger.people.get(id)!;
      const gatherings = () =>
        book.schedule.filter((row) =>
          row.bindings.some((bound) => bound.typeKey === "gathering-missing"),
        );
      // The scenes are composed in the month their record is written, as play
      // meets them: the world folds a circle member's old records away.
      const seen = new Set<string>();
      let replied = false;
      for (let days = 0; days < 400 && seen.size < 3; days += 30) {
        advanceCore(core, addDays(makeIsoDate(core.date), 30));
        for (const entry of gatherings().filter(
          (row) => !seen.has(row.momentId),
        )) {
          seen.add(entry.momentId);
          const moment = book.momentsById.get(entry.momentId)!;
          const record = core.durableLog.get(moment.causeId)!;
          expect(record.kind, where).toBe(FAMILY_GATHERING_MISSED);
          const absentId = record.facts?.absentId as PersonId;
          const honoreeId = record.personIds[0]!;
          const result = purposeScene(core, director, id, entry, {
            typeKey: "gathering-missing",
          });
          // With no one else at home to ask (the player lives alone by now),
          // there is no one to cast as the asker and the scene is skipped.
          const askers =
            entry.bindings
              .find((bound) => bound.typeKey === "gathering-missing")
              ?.roles.find((role) => role.role === "household")?.personIds ??
            [];
          if (askers.length === 0) {
            expect(result?.kind, where).toBe("skipped");
            continue;
          }
          expect(result?.kind, `${where}: ${JSON.stringify(result)}`).toBe(
            "composed",
          );
          if (result?.kind !== "composed") return;
          const { scene } = result;
          expect(scene.purpose, where).toBe("gathering-ask");
          expect(scene.askedId, where).toBe(id);
          // Someone in the player's home asks, never the player.
          expect(scene.askerId, where).not.toBe(id);
          expect(core.people.get(scene.askerId)?.householdId, where).toBe(
            player.householdId,
          );
          const fact = (key: string) =>
            scene.facts.find((row) => row.key === key);
          expect(fact("absent")?.text, where).toBe(
            core.people.get(absentId)!.givenName,
          );
          expect(fact("absent")?.recordIds, where).toContain(moment.causeId);
          // Whose birthday and how old: from the person's birth date.
          const honoree = core.people.get(honoreeId)!;
          expect(fact("age")?.text, where).toBe(
            String(
              ageOnDate(
                makeIsoDate(honoree.birthDate),
                makeIsoDate(record.date),
              ),
            ),
          );
          expect(!!fact("birthday-yours"), where).toBe(honoreeId === id);
          expect(!!fact("birthday-mine"), where).toBe(
            honoreeId === scene.askerId,
          );
          expect(fact("honoree")?.text ?? null, where).toBe(
            honoreeId === id || honoreeId === scene.askerId
              ? null
              : honoree.givenName,
          );
          // Every fact the records give, and no other.
          const given = gatheringFacts(
            core,
            "gathering-missing",
            moment.causeId,
            scene.askerId,
            id,
            (placeId) => destinationSaid(placeId, ""),
            (aId, bId) => tieSide(core, aId, bId)?.side === "rival",
          );
          for (const [key, expected] of Object.entries(given)) {
            expect(fact(key)?.text, `${where}: ${key}`).toBe(expected.text);
            expect(fact(key)?.recordIds, `${where}: ${key}`).toEqual(
              expected.sourceRecordIds,
            );
            found.add(key);
          }
          for (const key of [
            "hometown",
            "new-child",
            "married",
            "moved",
            "new-employer",
            "ill",
            "fell-out",
          ])
            expect(!!fact(key), `${where}: ${key}`).toBe(key in given);
          const root = scene.talk.tree.replies.map((reply) => reply.line);
          expectUpToFourDifferent(root, where);
          for (const row of root)
            expect(["agree", "ask", "decline"], where).toContain(row.move);
          expect(scene.talk.depth, where).toBeGreaterThan(1);
          expect(
            scene.talk.gaps.filter((gap) => gap.includes("/ending/")),
            where,
          ).toEqual([]);
          for (const row of scene.talk.lines) {
            expect(row.text, where).not.toMatch(SLOP);
            expect(row.text, where).not.toMatch(/\ball right\b/i);
          }
          const narration = scene.talk.narration
            .map((row) => row.text)
            .join(" ");
          const said = scene.talk.lines.map((row) => row.text).join(" | ");
          if (!replied) {
            replied = true;
            const settled = endsKeeping(scene.talk.tree, "kept-in-scene")[0];
            expect(
              settled,
              `${where}: no path settles in the scene`,
            ).toBeTruthy();
            const replyId = replyInScene(
              core,
              director,
              id,
              entry,
              settled!.full,
              {
                typeKey: "gathering-missing",
              },
            );
            const reply = core.durableLog.get(replyId!);
            expect(reply?.facts?.typeKey, where).toBe("gathering-missing");
            expect(reply?.facts?.causeId, where).toBe(moment.causeId);
            expect(reply?.facts?.ending, where).toBe(
              "said-you-would-reach-out",
            );
            expect(reply?.facts?.keeps, where).toBe("kept-in-scene");
            expect(reply?.personIds, where).toContain(scene.askerId);
            const sour = endsKeeping(
              scene.talk.tree,
              "relationship-strained",
            )[0];
            const sourId = sour
              ? replyInScene(core, director, id, entry, sour.full, {
                  typeKey: "gathering-missing",
                })
              : null;
            if (sourId)
              expect(core.durableLog.get(sourId)?.facts?.ending, where).toBe(
                "would-not-reach-out",
              );
            log(
              `GATHERING (played year, not staged) ${where}: ${moment.date}, cause ${moment.causeId}, ${id} asked by ${scene.askerId} about ${absentId}; facts ${scene.facts.map((row) => row.key).join(",")}; reply ${replyId} ending ${reply?.facts?.ending}; strained ${sourId ?? "(this one takes a no in stride)"}\n  ${narration} | ${said}`,
            );
          }
          played += 1;
        }
      }
      if (!seen.size)
        tried.push(`${where}: no missed gathering staged in a played year`);
    }
    log(`GATHERING facts found: ${[...found].join(",")}`);
    expect(
      played,
      `no missed gathering played: ${tried.join("; ")} (seed ${seed})`,
    ).toBeGreaterThan(0);
  } finally {
    setBookkeeping(true);
  }
}, 3_600_000);

it(`a wedding celebration asks the player for something, and a new job's facts come from its job row (seed ${seed})`, () => {
  setBookkeeping(false);
  const tried: string[] = [];
  let played = 0;
  try {
    for (let attempt = 0; attempt < ATTEMPTS; attempt += 1) {
      const place = drawPlace(seed, `celebration:${attempt}`);
      const where = `${place.name} (${place.key}), seed ${place.seed}`;
      const built = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
      const { core, director, playerId } = built;
      const id = playerId as PersonId;
      const api = coreAPI(core);
      director.watch(core, id);
      const book = director.ledger.people.get(id)!;
      // The player starts at the turn of 18; a year on they are an adult.
      advanceCore(core, addDays(makeIsoDate(core.date), 366));
      const player = core.people.get(id)!;
      const adult = (born: string) =>
        ageOnDate(makeIsoDate(born), makeIsoDate(core.date)) >= 18;
      const partnered = new Set<string>();
      for (const link of core.familyLinks.values())
        if (link.kind === "partner")
          for (const pid of link.personIds) partnered.add(pid);
      const other = [...core.people.values()].find(
        (row) =>
          row.alive &&
          row.tier !== "husk" &&
          row.id !== id &&
          !partnered.has(row.id) &&
          !player.familyIds.has(row.id) &&
          adult(row.birthDate),
      );
      if (!adult(player.birthDate) || !other) {
        tried.push(`${where}: no adult player or no one to marry`);
        continue;
      }
      // New job: every job the world started for a person is read directly.
      const placeSaid = (placeId: string) => destinationSaid(placeId, "");
      const job = [...core.jobs.values()].find(
        (row) =>
          row.personId === id && core.organizations.get(row.organizationId),
      );
      const kin = [...player.familyIds]
        .map((rel) => core.people.get(rel as PersonId))
        .find((row) => row?.alive);
      if (job && kin) {
        const given = celebrationFacts(
          core as CoreState,
          "celebration",
          job.id,
          core.date,
          kin.id,
          id,
          id,
          placeSaid,
        );
        const org = core.organizations.get(job.organizationId)!;
        expect(given["new-job"]?.sourceRecordIds, where).toEqual([
          job.id,
          org.id,
        ]);
        expect(given.employer?.sourceRecordIds, where).toEqual([
          job.id,
          org.id,
        ]);
        expect(given.yours?.text, where).toBe("yes");
        expect(given.honoree, where).toBeUndefined();
        log(
          `CELEBRATION new-job facts read from job ${job.id} (direct read of a played world's job row): ${Object.keys(given).join(",")}`,
        );
      }
      // HAND-STAGED: a wedding written by the partnerships writer.
      const source = {
        tag: "SOURCED" as const,
        asOf: core.date,
        citation: "A couple record written by the partnerships writer.",
      };
      const held = [...core.familyLinks.values()].find(
        (link) => link.kind === "partner" && link.personIds.includes(id),
      );
      if (held)
        api.setPartnersV1({
          personIds: held.personIds as [PersonId, PersonId],
          together: false,
          source,
        });
      advanceCore(
        core,
        addDays(
          makeIsoDate(core.date),
          SITUATION_LIBRARY.scheduling.repeatDays + 1,
        ),
      );
      api.setPartnersV1({
        personIds: [id, other.id],
        together: true,
        source,
        facts: { union: "dating" },
      });
      api.emit({
        id: `${FAMILY_MARRIED}:${id}:${other.id}:${core.date}`,
        date: core.date,
        kind: FAMILY_MARRIED,
        personIds: [id, other.id],
        placeId: player.placeId,
        publicRecord: false,
        source,
        facts: { union: "married" },
      });
      advanceCore(core, addDays(makeIsoDate(core.date), 1));
      const entry = book.schedule.find(
        (row) =>
          row.momentId.includes(FAMILY_MARRIED) &&
          row.bindings.some((bound) => bound.typeKey === "celebration"),
      );
      if (!entry) {
        tried.push(`${where}: the wedding staged no celebration`);
        continue;
      }
      const moment = book.momentsById.get(entry.momentId)!;
      const result = purposeScene(core, director, id, entry, {
        typeKey: "celebration",
      });
      expect(result?.kind, `${where}: ${JSON.stringify(result)}`).toBe(
        "composed",
      );
      if (result?.kind !== "composed") return;
      const { scene } = result;
      expect(scene.purpose, where).toBe("celebration-ask");
      expect(scene.askedId, where).toBe(id);
      expect(scene.askerId, where).not.toBe(id);
      const fact = (key: string) => scene.facts.find((row) => row.key === key);
      expect(fact("wedding")?.recordIds, where).toContain(moment.causeId);
      expect(fact("spouse")?.text, where).toBe(other.givenName);
      expect(fact("spouse")?.recordIds, where).toContain(other.id);
      expect(fact("yours")?.text, where).toBe("yes");
      expect(fact("honoree"), where).toBeUndefined();
      const asker = core.people.get(scene.askerId)!;
      expect(!!fact("hometown"), where).toBe(asker.placeId !== player.placeId);
      if (fact("hometown"))
        expect(fact("hometown")!.text, where).toBe(placeSaid(asker.placeId));
      const root = scene.talk.tree.replies.map((reply) => reply.line);
      expectUpToFourDifferent(root, where);
      for (const row of root)
        expect(["agree", "promise", "ask", "decline"], where).toContain(row.move);
      expect(scene.talk.depth, where).toBeGreaterThan(1);
      expect(
        scene.talk.gaps.filter((gap) => gap.includes("/ending/")),
        where,
      ).toEqual([]);
      for (const row of scene.talk.lines) {
        expect(row.text, where).not.toMatch(SLOP);
        expect(row.text, where).not.toMatch(/\ball right\b/i);
        expect(
          (row.text.match(new RegExp(other.givenName, "g")) ?? []).length,
          `${where}: ${row.text}`,
        ).toBeLessThanOrEqual(1);
      }
      const settled = endsKeeping(scene.talk.tree, "kept-in-scene")[0];
      expect(settled, `${where}: no path settles in the scene`).toBeTruthy();
      const replyId = replyInScene(core, director, id, entry, settled!.full, {
        typeKey: "celebration",
      });
      const reply = core.durableLog.get(replyId!);
      expect(reply?.facts?.typeKey, where).toBe("celebration");
      expect(reply?.facts?.causeId, where).toBe(moment.causeId);
      expect(reply?.facts?.ending, where).toBe("said-yes-at-the-party");
      expect(reply?.facts?.keeps, where).toBe("kept-in-scene");
      expect(reply?.personIds, where).toContain(scene.askerId);
      const sour = endsKeeping(scene.talk.tree, "relationship-strained")[0];
      const sourId = sour
        ? replyInScene(core, director, id, entry, sour.full, {
            typeKey: "celebration",
          })
        : null;
      if (sourId)
        expect(core.durableLog.get(sourId)?.facts?.ending, where).toBe(
          "turned-them-down-at-the-party",
        );
      log(
        `CELEBRATION (hand-staged wedding) ${where}: ${moment.date}, cause ${moment.causeId}, ${id} asked by ${scene.askerId}; facts ${scene.facts.map((row) => row.key).join(",")}; reply ${replyId} ending ${reply?.facts?.ending}; strained ${sourId ?? "(this guest takes a no in stride)"}\n  ${scene.talk.narration.map((row) => row.text).join(" ")} | ${scene.talk.lines.map((row) => row.text).join(" | ")}`,
      );
      played += 1;
    }
    expect(
      played,
      `no celebration played: ${tried.join("; ")} (seed ${seed})`,
    ).toBeGreaterThan(0);
  } finally {
    setBookkeeping(true);
  }
}, 3_600_000);

it("a celebration's and a gathering's facts are empty for any other type", () => {
  const nothing = { people: new Map(), durableLog: new Map() } as never;
  expect(
    celebrationFacts(
      nothing,
      "reunion",
      "c",
      "2026-01-01",
      "a" as PersonId,
      "b" as PersonId,
      undefined,
      () => null,
    ),
  ).toEqual({});
  expect(
    gatheringFacts(
      nothing,
      "letter",
      "c",
      "a" as PersonId,
      "b" as PersonId,
      () => null,
      () => false,
    ),
  ).toEqual({});
});

it("every line of the two purposes carries its own facts, with no name said twice and no stray words", () => {
  const purposes = new Set(["celebration-ask", "gathering-ask"]);
  const parts = (
    sceneBank as unknown as {
      parts: {
        key: string;
        text: string;
        uses: {
          purpose?: string;
          step: string;
          move: string;
          after?: string;
          requiresFacts?: string[];
        }[];
      }[];
    }
  ).parts.filter((part) => part.uses.some((use) => purposes.has(use.purpose!)));
  const count = (purpose: string) =>
    parts.filter((part) => part.uses.some((use) => use.purpose === purpose))
      .length;
  for (const purpose of purposes) {
    expect(count(purpose), purpose).toBeGreaterThanOrEqual(30);
    expect(count(purpose), purpose).toBeLessThanOrEqual(45);
  }
  const base = new Set(["name", "first", "place"]);
  for (const part of parts) {
    const slots = [...part.text.matchAll(/\{([a-z-]+)\}/g)].map((m) => m[1]!);
    const use = part.uses.find((row) => purposes.has(row.purpose!))!;
    for (const slot of slots)
      if (!base.has(slot))
        expect(use.requiresFacts ?? [], `${part.key}: {${slot}}`).toContain(
          slot,
        );
    expect(new Set(slots).size, part.key).toBe(slots.length);
    expect(part.text, part.key).not.toMatch(/\ball right\b/i);
    expect(part.text, part.key).not.toMatch(/^(well|look|so|um|uh),/i);
    // An answer to any ask names no day or time: the ask it answers may name any.
    if (use.step === "follow" && use.after === "ask")
      expect(part.text, part.key).not.toMatch(
        /\b(today|tomorrow|tonight|week|weekend|month|year|soon|saturday|sunday|monday|tuesday|wednesday|thursday|friday)\b/i,
      );
    // A follow-up that answers a reply fits any ask: it names no fact, except
    // the missing relative's name, which every missed gathering has.
    if (use.step === "follow" && use.after)
      expect(
        (use.requiresFacts ?? []).filter((fact) => fact !== "absent"),
        part.key,
      ).toEqual([]);
  }
});
