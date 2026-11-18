import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { closenessBetween } from "../core2/closeness";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { FAMILY_QUARREL } from "../core2/modules/quarrel";
import { applyCoreEvent } from "../core2/state";
import type { PersonId } from "../core2/types";
import sceneBank from "../../data/english/parts/scene-talk.json" with { type: "json" };
import { chooseVariant } from "./arc-variant";
import variantFile from "./data/arc-variants.json" with { type: "json" };
import { purposeScene } from "./purpose-scene";
import type { TreeNode } from "./scene-talk";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const ATTEMPTS = 2;

// A quarrel over a missed payment (the partnerships engine's own
// `family.quarrel`, written when the credit engine's `credit.payment-missed`
// names a borrower with a grown housemate) is the apology scene. Which arc it
// plays is read from the records (arc-variant.ts, data/arc-variants.json): the
// quarrel is about money, how close the two are, the earlier quarrels between
// them, and the wronged person's own money pressure.
//
// HAND-STAGED: the missed payment itself (a `credit.payment-missed` record for
// the player) and every probe below it, labeled where they stand. From the
// missed payment on, the quarrel record, the scene and the choice are the
// engines' own.
const families = (
  variantFile as unknown as {
    families: Record<
      string,
      { variants: Record<string, { pull?: string[]; purpose: string }> }
    >;
  }
).families["owed-apology"]!.variants;

const lineSources = (purpose: string) =>
  sceneBank.parts
    .filter((part) =>
      (part.uses as { purpose?: string }[]).some((u) => u.purpose === purpose),
    )
    .map(
      (part) =>
        // A name after a comma is left off once the voice has said it on the
        // branch (scene-talk-words.ts, VOCATIVE): ", {first}" is optional.
        new RegExp(
          `^${(part.text as string)
            .replace(/[.*+?^$()|[\]\\]/g, "\\$&")
            .replace(/, \{first\}/g, "(?:, {first})?")
            .replace(/\{[a-z-]+\}/g, ".+")}$`,
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

it(`a quarrel over a missed payment plays the variant its records give (seed ${seed})`, () => {
  setBookkeeping(false);
  const tried: string[] = [];
  let proven = 0;
  try {
    for (let attempt = 0; attempt < ATTEMPTS; attempt += 1) {
      const place = drawPlace(seed, `apology:${attempt}`);
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
      // HAND-STAGED: the credit engine's missed-payment record for the player.
      const missedId = `event:credit.payment-missed:probe-${attempt}:${core.date}`;
      const player = core.people.get(id)!;
      applyCoreEvent(core, {
        id: missedId,
        date: core.date,
        kind: "credit.payment-missed",
        personIds: [id],
        placeId: player.placeId,
        publicRecord: false,
        source: {
          tag: "ESTIMATED",
          asOf: core.date,
          citation: "Hand-staged missed payment for the apology variants test.",
        },
      });
      let entry;
      for (let day = 0; day < 10 && !entry; day += 1) {
        advanceCore(core, addDays(makeIsoDate(core.date), 1));
        entry = book.schedule.find((row) =>
          row.bindings.some((b) => b.typeKey === "apology"),
        );
      }
      if (!entry) {
        tried.push(`${where}: no quarrel scheduled (no grown housemate?)`);
        continue;
      }
      const moment = book.momentsById.get(entry.momentId)!;
      const quarrel = core.durableLog.get(moment.causeId)!;
      expect(quarrel.kind, where).toBe(FAMILY_QUARREL);
      expect(quarrel.facts?.missedId, where).toBe(missedId);
      const result = purposeScene(core, director, id, entry, {
        typeKey: "apology",
      });
      expect(result?.kind, `${where}: ${JSON.stringify(result)}`).toBe(
        "composed",
      );
      if (result?.kind !== "composed") continue;
      const scene = result.scene;
      const chosen = scene.variant!;
      expect(chosen, where).toBeTruthy();
      expect(chosen.family, where).toBe("owed-apology");
      expect(chosen.scores[0]!.variant, where).toBe(chosen.variant);
      // A quarrel over money never plays the plain arc's meeting-room lines.
      expect(chosen.variant, where).not.toBe("plain");
      expect(chosen.reads["about-money"], where).toBe(1);
      expect(chosen.recordIds, where).toContain(quarrel.id);
      expect(scene.talk.purpose, where).toBe(chosen.purpose);
      expect(scene.talk.gaps, where).toEqual([]);
      // Every line the player can reach is one written for this variant.
      const allowed = lineSources(chosen.purpose);
      for (const text of treeTexts(scene.talk.tree))
        expect(
          allowed.some((re) => re.test(text.replace(/\s+/g, " "))) ||
            scene.talk.lines.length === 0,
          `${where}: "${text}" is not a ${chosen.purpose} line`,
        ).toBe(true);
      expect(scene.talk.depth, where).toBeGreaterThan(1);
      process.stdout.write(
        `APOLOGY ${where}: ${quarrel.id}; played ${chosen.variant} (${chosen.scores.map((s) => `${s.variant} ${s.score.toFixed(2)}`).join(", ")}); opens "${scene.talk.state.text}"\n`,
      );

      // ---- Hand-made probes (labeled): each its own speaker, one record at a
      // time, a cause of the next day so the earlier records are earlier.
      const nextDay = addDays(makeIsoDate(core.date), 1);
      const pull = (who: string, variant: string) => {
        const facets = families[variant]!.pull ?? [];
        return facets.length
          ? facets.reduce(
              (sum, f) =>
                sum + (core.people.get(who as PersonId)!.traits[f] ?? 0),
              0,
            ) / facets.length
          : 0;
      };
      // The speaker whose temper pulls the named variant most and the others least.
      const speaker = (variant: string, skip: Set<string>) =>
        [...core.people.values()]
          .filter(
            (p) =>
              p.alive &&
              p.id !== id &&
              !skip.has(p.id) &&
              p.livingCostDailyMinor > 0,
          )
          .sort(
            (a, b) =>
              pull(b.id, variant) -
                Math.max(
                  ...Object.keys(families)
                    .filter((v) => v !== variant && v !== "plain")
                    .map((v) => pull(b.id, v)),
                ) -
                (pull(a.id, variant) -
                  Math.max(
                    ...Object.keys(families)
                      .filter((v) => v !== variant && v !== "plain")
                      .map((v) => pull(a.id, v)),
                  )) || a.id.localeCompare(b.id),
          )[0]!.id as PersonId;
      const used = new Set<string>();
      const pick = (
        who: PersonId,
        facts: Record<string, string>,
        cid: string,
      ) =>
        chooseVariant(core, {
          family: "owed-apology",
          askerId: who,
          askedId: id,
          cause: { id: cid, date: nextDay, facts },
        })!;

      // PROBE (hand-made): a quarrel about something other than money has no
      // money variant to play: the plain arc is the one left.
      const other = speaker("money", used);
      used.add(other);
      const notMoney = pick(
        other,
        { about: "other", missedId: "x" },
        "probe-other",
      );
      expect(notMoney.reads["about-money"]).toBe(0);
      expect(notMoney.variant, JSON.stringify(notMoney.scores)).toBe("plain");

      // PROBE (hand-made): earlier quarrels between the same two people.
      const again = speaker("repeat", used);
      used.add(again);
      for (const n of ["a", "b", "c"])
        applyCoreEvent(core, {
          id: `probe-quarrel-${n}`,
          date: core.date,
          kind: "family.quarrel",
          personIds: [id, again],
          placeId: player.placeId,
          publicRecord: false,
          facts: { about: "money", owes: id, missedId: `old-${n}` },
          source: {
            tag: "SOURCED",
            asOf: core.date,
            citation: "Probe quarrel",
          },
        });
      advanceCore(core, addDays(makeIsoDate(core.date), 1));
      const repeat = chooseVariant(core, {
        family: "owed-apology",
        askerId: again,
        askedId: id,
        cause: {
          id: "probe-repeat",
          date: addDays(makeIsoDate(core.date), 1),
          facts: { about: "money", missedId: "new" },
        },
      })!;
      expect(repeat.reads["quarreled-before"]).toBeCloseTo(0.75, 10);
      expect(repeat.recordIds).toEqual(
        expect.arrayContaining(["probe-quarrel-a", "probe-quarrel-c"]),
      );
      expect(repeat.variant, JSON.stringify(repeat.scores)).toBe("repeat");

      // PROBE (hand-made): a speaker with nothing put by and costs to meet.
      const broke = speaker("pressed", used);
      used.add(broke);
      core.people.get(broke)!.liquidMinor = 0;
      const pressed = pick(
        broke,
        { about: "money", missedId: "y" },
        "probe-pressed",
      );
      expect(pressed.reads.strain).toBeGreaterThan(0.9);
      expect(pressed.variant, JSON.stringify(pressed.scores)).toBe("pressed");

      // The scene's own asker: how close they are decides close against money.
      const tie = closenessBetween(core, scene.askerId, id);
      const own = chosen.reads.close ?? 0;
      expect(own, where).toBeCloseTo(Math.min(1, Math.max(0, tie)), 3);
      process.stdout.write(
        `APOLOGY PROBES ${where}: not-money ${notMoney.variant}; three earlier quarrels ${repeat.variant}; no cash ${pressed.variant}; own closeness ${own.toFixed(2)} gave ${chosen.variant}\n`,
      );
      proven += 1;
    }
    expect(proven, `seed ${seed}: ${tried.join("; ")}`).toBeGreaterThan(0);
  } finally {
    setBookkeeping(true);
  }
}, 3_600_000);
