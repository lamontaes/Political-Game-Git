import { expect, it } from "vitest";
import bank from "../../data/english/parts/scene-talk.json" with { type: "json" };

// A rival's paid message (circumstances.json, rival-message) opens the
// rally-opponent scene with nothing the player said or did on record; only a
// debate the player stood in (the other cause) records answers on a stage. So
// an opener that speaks of a speech, a stage or the player's answers needs the
// debate fact. Seen: "Nice speech. Too bad none of it was true." said to a
// player who gave no speech and held no rally (Western, Nebraska, life29).
const NAMES_PLAYER_WORDS = /\bspeech\b|\bup there\b|\bon stage\b|\banswers\b/i;

it("a rally-opponent opener that names the player's speech or answers needs the debate on record", () => {
  const parts = (
    bank as unknown as {
      parts: {
        text: string;
        uses: {
          purpose?: string;
          step?: string;
          requiresFacts?: string[];
        }[];
      }[];
    }
  ).parts;
  const open = parts.flatMap((part) =>
    part.uses
      .filter((use) => use.purpose === "rally-opponent" && use.step === "state")
      .map((use) => ({ text: part.text, requires: use.requiresFacts ?? [] })),
  );
  expect(open.length).toBeGreaterThan(0);
  for (const row of open)
    if (NAMES_PLAYER_WORDS.test(row.text))
      expect(row.requires, `"${row.text}"`).toContain("debate");
});
