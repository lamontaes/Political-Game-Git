import { describe, expect, it } from "vitest";
import { withoutPulledUses } from "./bank-parts";
import type { PartGradeLedger } from "./english-grades";
import type { JudgedStores } from "./judged";
import {
  pulledFileOf,
  ruleFlags,
  runRules,
  spotSubjects,
  spotVerdictId,
  usesWithTags,
  type LineRule,
  type RulePiece,
} from "./line-rules";
import { useSpotId } from "./spot-id";
import { spotTags, spotTagsOf, typesByPurpose } from "./spot-tags";

const NO_GRADES: PartGradeLedger = {
  schema: "english-part-grades/1",
  parts: {},
};

const TYPES = [
  {
    key: "family-absence",
    purpose: "family-absence",
    asker: "relative",
    asked: "you",
    roles: [
      { key: "relative", fill: "household" },
      { key: "you", fill: "subject" },
    ],
    setting: ["home"],
    stakes: ["office", "absence"],
  },
  {
    key: "door-ask",
    purpose: "ask-support",
    asker: "resident",
    asked: "you",
    playerAsks: true,
    roles: [
      { key: "resident", fill: "counterpart" },
      { key: "you", fill: "subject" },
    ],
    setting: ["other-home"],
    stakes: ["race"],
  },
];
const VARIANTS = {
  families: {
    "family-absence": {
      variants: { hurt: { purpose: "family-absence.hurt" } },
    },
  },
};
const PLAYED = typesByPurpose(TYPES, VARIANTS);

describe("who says a line, to whom and where", () => {
  it("reads the speaker and listener from the role the use words", () => {
    expect(
      spotTagsOf({ purpose: "family-absence", role: "asker" }, PLAYED),
    ).toEqual({
      situation: ["family-absence"],
      setting: ["home"],
      stakes: ["office", "absence"],
      speaker: ["relative"],
      speakerFill: ["household"],
      listener: ["you"],
      listenerFill: ["subject"],
      tie: ["household"],
    });
    const reply = spotTagsOf(
      { purpose: "family-absence", role: "asked" },
      PLAYED,
    );
    expect(reply.speaker).toEqual(["you"]);
    expect(reply.listener).toEqual(["relative"]);
  });

  it("where the player asks, the asker's lines are the player's", () => {
    const ask = spotTagsOf({ purpose: "ask-support", role: "asker" }, PLAYED);
    expect(ask.speaker).toEqual(["you"]);
    expect(ask.listener).toEqual(["resident"]);
    const answer = spotTagsOf(
      { purpose: "ask-support", role: "asked" },
      PLAYED,
    );
    expect(answer.speaker).toEqual(["resident"]);
    expect(answer.tie).toBeUndefined();
  });

  it("an arc variant is played by its family's types", () => {
    expect(
      spotTagsOf({ purpose: "family-absence.hurt", role: "asker" }, PLAYED)
        .speaker,
    ).toEqual(["relative"]);
  });

  it("names the tie in the conversation engine's fact names, and nothing it does not know", () => {
    expect(
      spotTagsOf(
        { subject: "greet", requiresFacts: ["stranger", "about"] },
        PLAYED,
      ),
    ).toEqual({ tie: ["stranger"] });
    expect(spotTagsOf({ subject: "greet" }, PLAYED)).toEqual({});
    expect(
      spotTagsOf({ purpose: "none-plays-this", role: "asker" }, PLAYED),
    ).toEqual({});
  });

  it("reads the game's own situation types, and a part's uses carry the tags", () => {
    const [use] = usesWithTags({ bearing: "guarded" }, [
      {
        subject: "scene",
        step: "open",
        move: "greet",
        role: "asker",
        purpose: "family-absence",
      },
    ]);
    expect(use).toMatchObject({
      bearing: "guarded",
      speaker: ["relative"],
      listener: ["you"],
      setting: ["home"],
      tie: ["household"],
      role: "asker",
    });
    expect(
      spotTags({ purpose: "family-absence", role: "asker" }).speaker,
    ).toEqual(["relative"]);
  });
});

/** One line said by an aunt at home and by a stranger in public. */
const aunt = {
  subject: "scene",
  role: "asker",
  move: "ask",
  purpose: "visit",
  tie: ["kin"],
};
const stranger = {
  subject: "scene",
  role: "asker",
  move: "ask",
  purpose: "meet",
  tie: ["stranger"],
};
const piece = (
  key: string,
  text: string,
  uses: RulePiece["uses"],
): RulePiece => ({
  bank: "scene-talk",
  key,
  text,
  kind: "spoken",
  move: "state-ask",
  uses,
});
const spotRule = (status: LineRule["status"]): LineRule => ({
  id: "fits",
  says: "A line fits who says it to whom.",
  from: [
    {
      date: "2026-10-16",
      words: "Like, where do you drive in from? That's creepy.",
    },
  ],
  status,
  judges: "piece-in-context",
  test: { kind: "judged" },
});
const drive = piece("k.drive", "Where'd you drive in from?", [aunt, stranger]);
const other = piece("k.other", "Nice to meet you.", [stranger]);
const auntOther = piece("k.aunt", "Good to see you.", [aunt]);
const saying = (
  subjects: readonly { piece: RulePiece; spot: string }[],
): JudgedStores =>
  new Map([
    [
      "fits",
      {
        no: new Map(
          subjects.map((s) => [
            spotVerdictId(s.piece, s.spot),
            {
              keys: [s.piece.key, `spot:${s.spot}`],
              why: "creepy from a stranger",
            },
          ]),
        ),
        yes: new Set<string>(),
      },
    ],
  ]);

describe("a verdict on a line in its spot", () => {
  it("judges each spot a line is said in, keyed by the spot", () => {
    const subjects = spotSubjects(spotRule("sample"), [drive], NO_GRADES);
    expect(subjects.map((s) => s.spot)).toEqual([
      useSpotId(aunt),
      useSpotId(stranger),
    ]);
    expect(new Set(subjects.map((s) => s.id)).size).toBe(2);
  });

  it("only the uses a rule's applies.uses covers are judged", () => {
    const rule = {
      ...spotRule("sample"),
      applies: { uses: { has: { tie: "^stranger$" } } },
    };
    expect(spotSubjects(rule, [drive], NO_GRADES).map((s) => s.spot)).toEqual([
      useSpotId(stranger),
    ]);
  });

  it("a no in one spot takes the line out of that spot only, and play keeps it where it fits", () => {
    const stores = saying([{ piece: drive, spot: useSpotId(stranger) }]);
    const rule = spotRule("enforced");
    expect(ruleFlags(rule, drive, stores)).toBe(false);
    const result = runRules(
      [rule],
      [drive, other, auntOther],
      NO_GRADES,
      {},
      stores,
    );
    expect(result.pulled).toEqual({});
    expect(result.pulledUses).toEqual({ "k.drive": [useSpotId(stranger)] });
    expect(result.totals.spotsMadeSilent).toBe(0);
    const file = pulledFileOf(result);
    const map = new Map(
      Object.entries(file.pulledUses ?? {}).map(([k, v]) => [k, new Set(v)]),
    );
    expect(
      withoutPulledUses({ key: "k.drive", uses: [aunt, stranger] }, map),
    ).toEqual([{ key: "k.drive", uses: [aunt] }]);
    expect(
      withoutPulledUses({ key: "k.other", uses: [stranger] }, map),
    ).toEqual([{ key: "k.other", uses: [stranger] }]);
  });

  it("a no in every spot it is said pulls the whole line", () => {
    const stores = saying([
      { piece: drive, spot: useSpotId(aunt) },
      { piece: drive, spot: useSpotId(stranger) },
    ]);
    const result = runRules(
      [spotRule("enforced")],
      [drive, other, auntOther],
      NO_GRADES,
      {},
      stores,
    );
    expect(result.pulled).toEqual({ "k.drive": ["fits"] });
    expect(result.pulledUses).toEqual({});
  });

  it("the only line in a spot waits, still playing", () => {
    const stores = saying([{ piece: drive, spot: useSpotId(stranger) }]);
    const result = runRules(
      [spotRule("enforced")],
      [drive, auntOther],
      NO_GRADES,
      {},
      stores,
    );
    expect(result.pulledUses).toEqual({});
    expect(result.waiting).toEqual({ "k.drive": ["fits"] });
  });

  it("a sample rule lists the line and pulls no use", () => {
    const stores = saying([{ piece: drive, spot: useSpotId(stranger) }]);
    const result = runRules(
      [spotRule("sample")],
      [drive, other, auntOther],
      NO_GRADES,
      {},
      stores,
    );
    expect(result.pulledUses).toEqual({});
    expect(result.sample).toEqual({ "k.drive": ["fits"] });
    expect(pulledFileOf(result).pulledUses).toBeUndefined();
  });

  it("never takes a line he graded good out of any spot", () => {
    const stores = saying([{ piece: drive, spot: useSpotId(stranger) }]);
    const ledger: PartGradeLedger = {
      schema: "english-part-grades/1",
      parts: { "k.drive": { good: 1, bad: 0 } },
    } as unknown as PartGradeLedger;
    const result = runRules(
      [spotRule("enforced")],
      [drive, other, auntOther],
      ledger,
      {},
      stores,
    );
    expect(result.pulledUses).toEqual({});
    expect(result.conflicts).toEqual([{ key: "k.drive", rule: "fits" }]);
  });

  it("counts lines in spots waiting for a verdict", () => {
    const stores = saying([{ piece: drive, spot: useSpotId(stranger) }]);
    const result = runRules(
      [spotRule("sample")],
      [drive, other],
      NO_GRADES,
      {},
      stores,
    );
    expect(result.awaitingVerdict).toEqual({ fits: 2 });
  });
});
