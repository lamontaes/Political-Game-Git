import { describe, expect, it } from "vitest";

import {
  dialogueReportMarkdown,
  repeatedLines,
  runDialogueReport,
  type ReportLife,
} from "./run";

const OPTIONS = { lives: 1, days: 2, seed: "smoke", ages: [10] } as const;

describe("the dialogue report", () => {
  it(
    "reports conversations a seeded life actually had, read back from the record",
    { timeout: 300_000 },
    () => {
      const lives = runDialogueReport(OPTIONS);
      expect(lives).toHaveLength(1);
      const life = lives[0]!;
      expect(life.problem).toBeNull();
      expect(life.daysPlayed).toBe(2);
      expect(life.conversations.length).toBeGreaterThan(0);
      for (const conversation of life.conversations)
        for (const turn of conversation.turns) {
          // The chosen reply was one the player was actually offered.
          expect(turn.options.map((option) => option.key)).toContain(
            turn.chosen,
          );
          expect(turn.playerLine).toBeTruthy();
        }
      // The same seed plays the same lives.
      expect(runDialogueReport(OPTIONS)).toEqual(lives);

      const markdown = dialogueReportMarkdown(OPTIONS, lives);
      expect(markdown).toContain("## Where variety is thin");
      expect(markdown).toContain(`## Life 1: ${life.playerName}`);
    },
  );

  it("groups a line said more than once, with who said it", () => {
    const turn = (reply: string, speakerName: string) => ({
      options: [{ key: "greet", label: "Say hello", spokenWords: null }],
      chosen: "greet",
      playerLine: "Hi, Dana.",
      speakerName,
      reply,
      heardBy: [],
      lineParts: null,
    });
    const lives: ReportLife[] = [
      {
        index: 0,
        seed: "s-0",
        place: "Moody",
        startAge: 10,
        playerName: "Keanu Wiley",
        daysPlayed: 1,
        problem: null,
        conversations: [
          {
            date: "2026-01-05",
            subject: "life-talk",
            topicLabel: "A moment together",
            addressee: "Dana",
            turns: [turn("Hi again.", "Dana"), turn("Hi again.", "Sam")],
          },
        ],
      },
    ];
    const repeated = repeatedLines(lives);
    expect(repeated.map((row) => [row.text, row.count])).toEqual(
      expect.arrayContaining([
        ["Hi, Dana.", 2],
        ["Hi again.", 2],
      ]),
    );
    expect(repeated).toHaveLength(2);
    const reply = repeated.find((row) => row.text === "Hi again.")!;
    expect([...reply.speakers]).toEqual(["Dana", "Sam"]);
  });
});
