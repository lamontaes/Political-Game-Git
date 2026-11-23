import { describe, expect, it } from "vitest";
import sceneTalk from "../../data/english/parts/scene-talk.json" with { type: "json" };

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
