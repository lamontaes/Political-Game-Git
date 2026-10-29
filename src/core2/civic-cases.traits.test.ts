/**
 * The civic decisions that weigh a case (believing a told claim) read it from
 * the people involved, so temperament does not settle them alone: a hearer who
 * would doubt a stranger's word still believes a teller they are close to,
 * and doubts one who argues hard against where they stand. A place drawn from
 * all 56, built as the game builds it (`buildBenchWorld`, two-level, every
 * module); the test names the doubter, the teller and the tie by record id.
 */
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../tests/golden-path/place";
import { buildBenchWorld } from "../bench/world";
import { closenessBetween } from "./closeness";
import { gameStartDate } from "./game-start";
import { believesClaim } from "./heard-claims";
import { pairKey } from "./kernel/ids";
import { RUN_SEED } from "./trait-test-kit";
import type { PersonState } from "./types";

describe("conversation.believe-claim reads the teller's closeness and the claim's fit", () => {
  it("a hearer who doubts a stranger's word believes a close teller, and doubts one arguing against them", () => {
    const tried: string[] = [];
    for (let attempt = 0; attempt < 3; attempt++) {
      const seed = `${RUN_SEED}:civic-cases:${attempt}`;
      const place = drawPlace(seed, "trait-wiring");
      const { core } = buildBenchWorld(seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
      const year = Number(core.date.slice(0, 4));
      const adults = [...core.people.values()].filter(
        (p: PersonState) =>
          p.alive && year - Number(p.birthDate.slice(0, 4)) >= 18,
      );
      // Someone with no tie to the teller takes the stranger's word or doubts it by temperament alone.
      const doubters = adults.filter((p) => !believesClaim(core, p));
      tried.push(
        `${place.name} (${place.key}), seed ${seed}: ${adults.length} adults, ${doubters.length} doubt a stranger`,
      );
      for (const doubter of doubters) {
        const close = [...(core.relationshipsByPerson.get(doubter.id) ?? [])]
          .map((key) => core.relationships.get(key)!)
          .map((tie) => {
            const tellerId =
              tie.actorId === doubter.id ? tie.otherId : tie.actorId;
            return {
              tie,
              tellerId,
              closeness: closenessBetween(core, doubter.id, tellerId),
            };
          })
          .filter((row) => row.closeness >= 0.2)
          .sort((a, b) => b.closeness - a.closeness)[0];
        if (!close) continue;
        const stranger = adults.find(
          (p) =>
            p.id !== doubter.id &&
            !core.relationships.has(pairKey(doubter.id, p.id)),
        )!;
        console.log(
          `believe-claim at ${tried.at(-1)}: ${doubter.id} doubts a stranger's word (${stranger.id}) but believes ${close.tellerId} (tie ${close.tie.id}, closeness ${close.closeness.toFixed(2)}), and doubts that teller when the claim argues hard against their view`,
        );
        expect(believesClaim(core, doubter, { tellerId: stranger.id })).toBe(
          false,
        );
        expect(believesClaim(core, doubter, { tellerId: close.tellerId })).toBe(
          true,
        );
        // The claim argues the other way from where they stand: even this tie does not carry it.
        expect(
          believesClaim(core, doubter, { tellerId: close.tellerId, fit: -1 }),
        ).toBe(false);
        return;
      }
    }
    throw new Error(
      `no draw held a doubter with a close tie: ${tried.join("; ")}`,
    );
  }, 300_000);
});
