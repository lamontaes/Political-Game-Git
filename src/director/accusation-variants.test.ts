import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { closenessBetween } from "../core2/closeness";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import {
  considerBribe,
  CORRUPTION_MODULE_ID,
} from "../core2/modules/corruption";
import { JUSTICE_MODULE_ID } from "../core2/modules/justice";
import { coreAPI } from "../core2/state";
import type { PersonId } from "../core2/types";
import sceneBank from "../../data/english/parts/scene-talk.json" with { type: "json" };
import { chooseVariant } from "./arc-variant";
import variantFile from "./data/arc-variants.json" with { type: "json" };
import { purposeScene, replyInScene } from "./purpose-scene";
import type { TreeNode } from "./scene-talk";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const ATTEMPTS = 3;
const OFFICIALS = 25;

// A complaint to the prosecutor that names the player (the justice engine's
// own `justice.accused`, written after an official refused a bribe and
// reported it) is the accusation scene. Which arc it plays is read from the
// records (arc-variant.ts, data/arc-variants.json): the complaint's basis (the
// accuser saw it, or was told), whether the bribe was taken, and how close the
// two are.
//
// HAND-STAGED: the player's offer to an official (`considerBribe` with the
// offer and the refusal chosen); from there the crime, the complaint, the
// accusation record, the scene and the choice are the engines' own. The probes
// below it are hand-made rows on the same two modules, labeled where they
// stand.
const variants = (
  variantFile as unknown as {
    families: Record<
      string,
      { variants: Record<string, { pull?: string[]; purpose: string }> }
    >;
  }
).families["conflict-accuse"]!.variants;

const lineSources = (purpose: string) =>
  sceneBank.parts
    .filter((part) =>
      (part.uses as { purpose?: string }[]).some((u) => u.purpose === purpose),
    )
    .map(
      (part) =>
        new RegExp(
          `^${(part.text as string).replace(/[.*+?^$()|[\]\\]/g, "\\$&").replace(/\{[a-z-]+\}/g, ".+")}$`,
        ),
    );

const treeTexts = (node: TreeNode): string[] => [
  ...node.lines.map((l) => l.text),
  ...node.replies.flatMap((r) => [
    r.line.text,
    ...(r.next ? treeTexts(r.next) : []),
  ]),
  ...(node.end?.close ? [node.end.close.text] : []),
];

const paths = (node: TreeNode, prefix: number[] = []): number[][] =>
  node.replies.flatMap((reply, index) =>
    reply.next
      ? [[...prefix, index], ...paths(reply.next, [...prefix, index])]
      : [[...prefix, index]],
  );

it(`a complaint naming the player plays the variant its records give (seed ${seed})`, () => {
  setBookkeeping(false);
  const tried: string[] = [];
  let proven = 0;
  try {
    for (let attempt = 0; attempt < ATTEMPTS && proven < 1; attempt += 1) {
      const place = drawPlace(seed, `accusation:${attempt}`);
      const where = `${place.name} (${place.key}), seed ${place.seed}`;
      const { core, director, playerId } = buildBenchWorld(
        place.seed,
        gameStartDate(),
        { twoLevel: true, placeKey: place.key },
      );
      const api = coreAPI(core);
      const me = playerId as PersonId;
      director.watch(core, me);
      const book = director.ledger.people.get(me)!;
      advanceCore(core, addDays(makeIsoDate(core.date), 30));
      core.people.get(me)!.liquidMinor = 5_000_000;
      // HAND-STAGED: the player offers each of several officials money and
      // the official refuses, until a refusal is reported.
      const officials = [...core.people.values()]
        .filter((p) => p.alive && p.id !== me && p.tier !== "husk")
        .sort((a, b) => a.id.localeCompare(b.id))
        .slice(0, OFFICIALS);
      const offered: string[] = [];
      for (const [index, official] of officials.entries()) {
        const record = considerBribe(api, {
          offererId: me,
          officialId: official.id,
          stakeMinor: 20_000_000,
          subjectId: `contract:accusation-${attempt}-${index}`,
          pick: { offer: true, take: false },
        });
        if (record?.offered) offered.push(record.id);
      }
      let entry;
      for (let day = 0; day < 20 && !entry; day += 1) {
        advanceCore(core, addDays(makeIsoDate(core.date), 1));
        entry = book.schedule.find((row) =>
          row.bindings.some((b) => b.typeKey === "accusation"),
        );
      }
      if (!entry) {
        tried.push(`${where}: ${offered.length} offers, no complaint filed`);
        continue;
      }
      const moment = book.momentsById.get(entry.momentId)!;
      const accused = core.durableLog.get(moment.causeId)!;
      expect(accused.kind, where).toBe("justice.accused");
      expect(accused.personIds[0], where).toBe(me);
      const result = purposeScene(core, director, me, entry, {
        typeKey: "accusation",
      });
      expect(result?.kind, `${where}: ${JSON.stringify(result)}`).toBe(
        "composed",
      );
      if (result?.kind !== "composed") continue;
      const scene = result.scene;
      const chosen = scene.variant!;
      expect(chosen, where).toBeTruthy();
      expect(chosen.family, where).toBe("conflict-accuse");
      expect(chosen.scores[0]!.variant, where).toBe(chosen.variant);
      // A complaint never plays the plain arc's bid-list lines.
      expect(chosen.variant, where).not.toBe("plain");
      expect(chosen.reads.complaint, where).toBe(1);
      expect(chosen.recordIds, where).toContain(accused.id);
      expect(scene.talk.purpose, where).toBe(chosen.purpose);
      expect(scene.talk.gaps, where).toEqual([]);
      // The basis the engine wrote is the basis the reads saw.
      const complaintId = String(accused.facts?.complaintId);
      const complaint = api
        .moduleState(JUSTICE_MODULE_ID)
        .table("complaints")
        .get(complaintId) as unknown as { basis: string } | undefined;
      expect(complaint, where).toBeTruthy();
      expect(chosen.reads.witnessed, where).toBe(
        complaint!.basis === "witness" ? 1 : 0,
      );
      expect(chosen.reads.told, where).toBe(
        complaint!.basis === "told" ? 1 : 0,
      );
      const allowed = lineSources(chosen.purpose);
      for (const text of treeTexts(scene.talk.tree))
        expect(
          allowed.some((re) => re.test(text.replace(/\s+/g, " "))),
          `${where}: "${text}" is not a ${chosen.purpose} line`,
        ).toBe(true);
      expect(scene.talk.depth, where).toBeGreaterThan(1);
      // A reply is written by record id.
      const full = paths(scene.talk.tree)[0]!;
      const replyId = replyInScene(core, director, me, entry, full, {
        typeKey: "accusation",
      });
      const reply = core.durableLog.get(replyId!);
      expect(reply?.facts?.typeKey, where).toBe("accusation");
      expect(reply?.facts?.causeId, where).toBe(accused.id);
      process.stdout.write(
        `ACCUSATION ${where}: ${accused.id}; basis ${complaint!.basis}; played ${chosen.variant} (${chosen.scores.map((s) => `${s.variant} ${s.score.toFixed(2)}`).join(", ")}); reply ${replyId} ending ${reply?.facts?.ending}; opens "${scene.talk.state.text}"\n`,
      );

      // ---- Hand-made probes (labeled): rows on the justice and corruption
      // modules, each with its own speaker, a cause of the next day.
      const nextDay = addDays(makeIsoDate(core.date), 1);
      const pull = (who: string, variant: string) => {
        const facets = variants[variant]!.pull ?? [];
        return facets.length
          ? facets.reduce(
              (sum, f) =>
                sum + (core.people.get(who as PersonId)!.traits[f] ?? 0),
              0,
            ) / facets.length
          : 0;
      };
      const used = new Set<string>([me]);
      const others = (variant: string) =>
        Object.keys(variants).filter((v) => v !== variant && v !== "plain");
      const speaker = (variant: string) => {
        const pick = [...core.people.values()]
          .filter((p) => p.alive && !used.has(p.id))
          .sort(
            (a, b) =>
              pull(b.id, variant) -
                Math.max(...others(variant).map((v) => pull(b.id, v))) -
                (pull(a.id, variant) -
                  Math.max(...others(variant).map((v) => pull(a.id, v)))) ||
              a.id.localeCompare(b.id),
          )[0]!;
        used.add(pick.id);
        return pick.id as PersonId;
      };
      const complaints = api.moduleState(JUSTICE_MODULE_ID).table("complaints");
      const crimes = api.moduleState(CORRUPTION_MODULE_ID).table("crimes");
      const crimeOf = String(accused.facts?.crimeId);
      const baseCrime = crimes.get(crimeOf) as unknown as Record<
        string,
        unknown
      >;
      const baseComplaint = complaints.get(complaintId) as unknown as Record<
        string,
        unknown
      >;
      const probe = (
        who: PersonId,
        name: string,
        row: { basis: string; taken: boolean },
        facts: Record<string, string> = { offense: "bribery" },
      ) => {
        // HAND-MADE rows copied from the engine's own, one field changed.
        complaints.put({
          ...baseComplaint,
          id: `probe-complaint-${name}`,
          basis: row.basis,
        } as never);
        crimes.put({
          ...baseCrime,
          id: `probe-crime-${name}`,
          taken: row.taken,
        } as never);
        return chooseVariant(core, {
          family: "conflict-accuse",
          askerId: who,
          askedId: me,
          cause: {
            id: `probe-${name}`,
            date: nextDay,
            facts: {
              complaintId: `probe-complaint-${name}`,
              crimeId: `probe-crime-${name}`,
              ...facts,
            },
          },
        })!;
      };
      const told = probe(speaker("hearsay"), "told", {
        basis: "told",
        taken: false,
      });
      expect(told.reads.told).toBe(1);
      expect(told.variant, JSON.stringify(told.scores)).toBe("hearsay");
      const saw = probe(speaker("witness"), "saw", {
        basis: "witness",
        taken: false,
      });
      expect(saw.reads.witnessed).toBe(1);
      expect(saw.variant, JSON.stringify(saw.scores)).toBe("witness");
      const took = probe(speaker("taken"), "took", {
        basis: "told",
        taken: true,
      });
      expect(took.reads["bribe-taken"]).toBe(1);
      expect(took.recordIds).toContain("probe-crime-took");
      expect(took.variant, JSON.stringify(took.scores)).toBe("taken");
      const dear = [...core.people.values()]
        .filter(
          (p) =>
            p.alive &&
            !used.has(p.id) &&
            p.id !== me &&
            closenessBetween(core, p.id, me) > 0.8,
        )
        .sort(
          (a, b) =>
            pull(b.id, "friend") -
              Math.max(...others("friend").map((v) => pull(b.id, v))) -
              (pull(a.id, "friend") -
                Math.max(...others("friend").map((v) => pull(a.id, v)))) ||
            a.id.localeCompare(b.id),
        )[0];
      expect(dear, `${where}: someone close to the player`).toBeTruthy();
      const closest = closenessBetween(core, dear!.id, me);
      const friend = probe(dear!.id as PersonId, "dear", {
        basis: "told",
        taken: false,
      });
      expect(friend.reads.close, where).toBeGreaterThan(0.8);
      expect(friend.variant, JSON.stringify(friend.scores)).toBe("friend");
      // A scene with no complaint behind it (a printed story) has nothing for
      // these variants to read: the plain arc is the one left.
      const story = chooseVariant(core, {
        family: "conflict-accuse",
        askerId: speaker("witness"),
        askedId: me,
        cause: { id: "probe-story", date: nextDay, facts: {} },
      })!;
      expect(story.reads.complaint).toBe(0);
      expect(story.variant, JSON.stringify(story.scores)).toBe("plain");
      process.stdout.write(
        `ACCUSATION PROBES ${where}: told ${told.variant}; saw ${saw.variant}; taken ${took.variant}; closest tie ${closest.toFixed(2)} gave ${friend.variant}; no complaint ${story.variant}\n`,
      );
      proven += 1;
    }
    expect(proven, `seed ${seed}: ${tried.join("; ")}`).toBe(1);
  } finally {
    setBookkeeping(true);
  }
}, 3_600_000);
