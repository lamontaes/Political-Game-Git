import { describe, expect, it } from "vitest";
import sceneTalk from "../../data/english/parts/scene-talk.json" with { type: "json" };
import { wordSceneMove, type Fact } from "../english/scene-talk-words";

// The scenes merged on Nov 10 (celebration and gathering, rescue, apology and
// accusation, a new baby, a reporter's story, a race told, a rival filed late,
// the win side), read the way the owner read batch 3. One assertion for each
// class of defect he named, on the bank those scenes speak from and on the
// wording engine that fills it.
interface Use {
  purpose?: string;
  step: string;
  move: string;
  role: string;
  key?: string;
  after?: string;
  requiresFacts?: string[];
}
interface Part {
  key: string;
  text: string;
  uses: Use[];
}
const parts = (sceneTalk as unknown as { parts: Part[] }).parts;
const SCENES = [
  "celebration",
  "gathering",
  "rescue",
  "owed-apology",
  "conflict-accuse",
  "new-baby",
  "victory-night",
  "swearing-in",
];
const ofScenes = parts.filter((part) =>
  part.uses.some((use) => SCENES.some((s) => use.purpose?.startsWith(s))),
);

describe("what the owner flagged in batch 3, in the scenes merged on Nov 10", () => {
  it("never says 'this town' (the place is named)", () => {
    const bad = ofScenes.filter((part) =>
      /\bthis (town|city|village)\b/i.test(part.text),
    );
    expect(bad.map((part) => `${part.key}: ${part.text}`)).toEqual([]);
  });

  it("puts no article before a slot that carries its own (a bill, rivals, a source, a story, a stand)", () => {
    const bad = ofScenes.filter((part) =>
      /\b(a|an|the) \{(bill|rivals|source|story|stand|hometown|absent)\}/i.test(
        part.text,
      ),
    );
    expect(bad.map((part) => `${part.key}: ${part.text}`)).toEqual([]);
  });

  it("never opens a sentence, after the first, with a slot that fills in lowercase", () => {
    const bad = ofScenes.filter((part) =>
      /[.!?] \{(office|rivals|line|post|story|stand)\}/.test(part.text),
    );
    expect(bad.map((part) => `${part.key}: ${part.text}`)).toEqual([]);
  });

  it("names nobody in a line that no earlier line introduced (a rescue's child is named where the question is asked)", () => {
    const asks = ofScenes.filter(
      (part) =>
        part.uses.some((use) => use.purpose === "rescue-ask") &&
        /\{child\}/.test(part.text) &&
        part.uses.some((use) => use.step === "state"),
    );
    expect(asks.length).toBeGreaterThan(0);
    for (const part of asks)
      expect(part.text, part.key).toMatch(
        /\{child\}, was|\{child\}.*[Ii]n the house/,
      );
  });

  it("calls the other person by their first name once on a branch, not on every line", () => {
    // Pieces that tag the name after a comma, grouped by what they answer.
    const tagged = parts.filter(
      (part) =>
        /, \{first\}[.?!]/.test(part.text) &&
        part.uses.length === 1 &&
        !part.uses[0]!.requiresFacts?.length,
    );
    const groups = new Map<string, Part[]>();
    for (const part of tagged) {
      const use = part.uses[0]!;
      const id = [
        use.purpose,
        use.step,
        use.move,
        use.role,
        use.key,
        use.after,
      ].join("|");
      groups.set(id, [...(groups.get(id) ?? []), part]);
    }
    // A group whose every fitting piece (with no other requirement) tags the name.
    const all = (use: Use) =>
      parts.filter((part) =>
        part.uses.some(
          (u) =>
            u.purpose === use.purpose &&
            u.step === use.step &&
            u.move === use.move &&
            u.role === use.role &&
            u.key === use.key &&
            u.after === use.after &&
            !u.requiresFacts?.length,
        ),
      );
    const facts: Record<string, Fact> = {
      first: { text: "Devon", sourceRecordIds: ["person_y"] },
      name: { text: "Jennifer Bailey", sourceRecordIds: ["person_x"] },
    };
    const word = (use: Use, said: Set<string>) =>
      wordSceneMove({
        move: {
          step: use.step,
          move: use.move,
          role: use.role,
          purpose: use.purpose,
          key: use.key,
          ...(use.after ? { after: use.after } : {}),
        } as never,
        facts,
        seed: "reads-wrong",
        speakerId: "person_x",
        traits: {},
        momentKey: "reads-wrong",
        said,
      });
    const text = (out: ReturnType<typeof word>) =>
      out && "text" in out ? out.text : "";
    // A move whose every piece (with no other requirement) tags the name, and
    // that words from the facts above.
    const only = [...groups.values()]
      .map((group) => group[0]!.uses[0]!)
      .find(
        (use) =>
          all(use).every((part) => /, \{first\}[.?!]/.test(part.text)) &&
          text(word(use, new Set())).includes("Devon"),
      );
    expect(only, "a move whose every piece tags the name").toBeTruthy();
    const vocative = parts.find((part) => /\{first\}/.test(part.text))!;
    expect(
      text(word(only!, new Set([vocative.key]))),
      "not named again",
    ).not.toContain("Devon");
  });

  it("answers a request in a new-baby visit with a line that fits what was asked", () => {
    const babyParts = parts.filter((part) =>
      part.uses.some((use) => use.purpose === "new-baby"),
    );
    const byKey = new Map(babyParts.map((part) => [part.key, part]));
    // "Go. {kid} and I will be fine." leaves the baby with the asker: it only
    // follows a request to take the baby for a sleep or a nap.
    for (const part of babyParts.filter((row) =>
      /^Go\. (\{kid\} and I will be fine|I've got \{kid\})/.test(row.text),
    )) {
      for (const use of part.uses) {
        const asked = use.after ? byKey.get(use.after) : undefined;
        expect(asked?.text, `${part.key}: follows ${use.after}`).toMatch(
          /\{kid\}.*(sleep|nap)/,
        );
      }
    }
  });

  it("refers to nothing a scene never said (no groceries, no apology, nobody sorry)", () => {
    // A close that puts the groceries away needs a visit that brought them.
    const groceries = parts.filter(
      (part) =>
        /groceries/.test(part.text) &&
        part.uses.some(
          (use) => use.purpose === "new-baby" && use.step === "close",
        ),
    );
    expect(groceries.map((part) => part.text)).toEqual([]);
    // A follow that answers any reply to an owed apology does not presuppose one was made.
    const presumes = parts.filter(
      (part) =>
        /you're sorry|^Sorry helps/.test(part.text) &&
        part.uses.some(
          (use) =>
            use.purpose?.startsWith("owed-apology") &&
            use.step === "follow" &&
            !use.after,
        ),
    );
    expect(presumes.map((part) => part.text)).toEqual([]);
  });
});
