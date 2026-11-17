import { expect, it } from "vitest";
import { setBookkeeping } from "../core2/bookkeeping";
import { closenessBetween } from "../core2/closeness";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { FAMILY_QUARREL } from "../core2/modules/quarrel";
import { applyCoreEvent } from "../core2/state";
import type { PersonId } from "../core2/types";
import { chooseVariant } from "./arc-variant";
import variantFile from "./data/arc-variants.json" with { type: "json" };
import {
  LOAN_SEED,
  findTownBorrower,
  play,
} from "../../tests/support/real-borrower";

// A quarrel over a missed payment (the partnerships engine's own
// `family.quarrel`, written when the credit engine's `credit.payment-missed`
// names a borrower with a grown housemate) is the apology scene. Which arc it
// plays is read from the records (arc-variant.ts, data/arc-variants.json): the
// quarrel is about money, how close the two are, the earlier quarrels between
// them, and the wronged person's own money pressure.
//
// Drawn places (CTO, Nov 17): the case is whoever the credit engine's own
// missed payment and the partnerships engine's own quarrel name in a drawn
// place (`findTownBorrower`, tests/support/real-borrower.ts); the arc engine
// is one rule for every person. The scene's own lines are the player's talk,
// so they wait for a player who borrows (a gap for Blockers). The probes
// below the variant are hand-made, labeled where they stand.
const families = (
  variantFile as unknown as {
    families: Record<
      string,
      { variants: Record<string, { pull?: string[]; purpose: string }> }
    >;
  }
).families["owed-apology"]!.variants;

it(`a quarrel over a missed payment plays the variant its records give (seed ${LOAN_SEED})`, () => {
  setBookkeeping(false);
  try {
    // Whoever the engines name in a drawn place: the credit engine's own
    // missed payment and the partnerships engine's own quarrel over it.
    const found = findTownBorrower();
    {
      const { core, playerId, where, quarrel } = found;
      const id = found.borrowerId;
      expect(quarrel.kind, where).toBe(FAMILY_QUARREL);
      expect(quarrel.facts?.owes, where).toBe(id);
      const cause = {
        id: quarrel.id,
        date: quarrel.date,
        facts: Object.fromEntries(
          Object.entries(quarrel.facts ?? {}).map(([k, v]) => [k, String(v)]),
        ),
      };
      const chosen = chooseVariant(core, {
        family: "owed-apology",
        askerId: found.owedId,
        askedId: id,
        cause,
      })!;
      const closeAtChoice = closenessBetween(core, found.owedId, id);
      expect(chosen, where).toBeTruthy();
      expect(chosen.family, where).toBe("owed-apology");
      expect(chosen.scores[0]!.variant, where).toBe(chosen.variant);
      // A quarrel over money never plays the plain arc's meeting-room lines.
      expect(chosen.variant, where).not.toBe("plain");
      expect(chosen.reads["about-money"], where).toBe(1);
      expect(chosen.recordIds, where).toContain(quarrel.id);
      process.stdout.write(
        `APOLOGY ${where}: ${quarrel.id}; played ${chosen.variant} (${chosen.scores.map((s) => `${s.variant} ${s.score.toFixed(2)}`).join(", ")}) (places passed over: ${found.passedOver.join("; ") || "none"})\n`,
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
          placeId: core.people.get(id)!.placeId,
          publicRecord: false,
          facts: { about: "money", owes: id, missedId: `old-${n}` },
          source: {
            tag: "SOURCED",
            asOf: core.date,
            citation: "Probe quarrel",
          },
        });
      play(core, playerId, 1);
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

      // The asker's own closeness to the borrower decides close against money.
      const tie = closeAtChoice;
      const own = chosen.reads.close ?? 0;
      expect(own, where).toBeCloseTo(Math.min(1, Math.max(0, tie)), 3);
      process.stdout.write(
        `APOLOGY PROBES ${where}: not-money ${notMoney.variant}; three earlier quarrels ${repeat.variant}; no cash ${pressed.variant}; own closeness ${own.toFixed(2)} gave ${chosen.variant}\n`,
      );
    }
  } finally {
    setBookkeeping(true);
  }
}, 150_000);
