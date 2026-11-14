import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import {
  baselineFailures,
  COMPOSED_CHECKS,
  checksOf,
  runComposedRules,
} from "../../../src/english/composed-checks";
import {
  COMPOSED_KINDS,
  composedLine,
  type ComposedKind,
  type ComposedSample,
  type ComposedText,
} from "../../../src/english/composed-text";
import type { LineRulesFile } from "../../../src/english/line-rules";
import { corePlaceStateIdentities } from "../../../src/core2/place-lookup";
import checksData from "../../../data/english/composed-checks.json";
import baseline from "./composed-baseline.json";

/**
 * The composed rules (docs/design/words-composer.md, part 6): a rule row whose
 * test is `composed` names checks that read whole texts a player met in a
 * drawn world. This guard is fast: it checks the registry, the rule rows and
 * each check against fixtures written for it (our own words, never the
 * owner's notes). The played counts are `npm run words:composed`, which
 * compares a fresh run on the recorded seeds with ./composed-baseline.json
 * and fails when a rule's count rose (`--check`).
 */

const ROOT = path.resolve(__dirname, "../../..");
const { rules } = JSON.parse(
  readFileSync(path.join(ROOT, "data/english/line-rules.json"), "utf8"),
) as LineRulesFile;
const composed = rules.filter((rule) => rule.test.kind === "composed");

const PLAYER = "p";
const HOUSE = ["p", "sis", "dad"];
const people = [
  { id: "p", full: "Dana Rivers", given: "Dana" },
  { id: "sis", full: "Nora Rivers", given: "Nora" },
  { id: "dad", full: "Owen Rivers", given: "Owen" },
  { id: "vp", full: "Grace Talbot", given: "Grace", role: "Vice President" },
  { id: "pres", full: "Hal Brenner", given: "Hal", role: "President" },
];

let made = 0;
function text(
  kind: ComposedKind,
  screens: (string | [string, string])[][],
  extra: Partial<ComposedText> = {},
): ComposedText {
  made += 1;
  return {
    id: `${kind}:${made}`,
    kind,
    date: "2025-02-03",
    minuteOfDay: 19 * 60,
    presentIds: HOUSE,
    screens: screens.map((lines) => ({
      lines: lines.map((line) =>
        typeof line === "string"
          ? composedLine(line, extra.speakerId)
          : composedLine(line[1], line[0]),
      ),
      offered: [],
    })),
    ...extra,
  };
}
const sampleOf = (...texts: ComposedText[]): ComposedSample => ({
  place: "Fixture Town",
  seed: "fixture",
  playerId: PLAYER,
  householdIds: HOUSE,
  people,
  stateNames: [
    "Ohio",
    "Oregon",
    "Kansas",
    "Arkansas",
    "Washington",
    "Virginia",
    "West Virginia",
  ],
  townName: "Millbrook",
  texts,
});
const breaks = (name: string, sample: ComposedSample) =>
  COMPOSED_CHECKS[name]!(sample.texts.at(-1)!, sample);

const talk = (
  speakerId: string,
  lines: [string, string][][],
  extra: Partial<ComposedText> = {},
) => text("talk:home", lines, { speakerId, listenerId: PLAYER, ...extra });

/** For each check: a sample whose last text must break it, and one whose last text must not. */
const FIXTURES: Record<
  string,
  { catches: ComposedSample; spares: ComposedSample; breaksAt?: number[] }
> = {
  "full-name-once-per-screen": {
    catches: sampleOf(
      text("speech:president", [
        ["Hal Brenner thanks you. Hal Brenner will be back."],
      ]),
    ),
    spares: sampleOf(
      text("speech:president", [
        ["Hal Brenner thanks you. He will be back."],
        ["Hal Brenner closes the night."],
      ]),
    ),
  },
  "no-bare-full-name-unintroduced": {
    catches: sampleOf(
      text("speech:president", [["Grace Talbot will sit beside me."]]),
    ),
    spares: sampleOf(
      text("speech:president", [
        ["Vice President Grace Talbot will sit beside me. Nora Rivers waved."],
      ]),
    ),
  },
  "act-named": {
    catches: sampleOf(
      talk("dad", [
        [
          [
            "dad",
            "The mayor brought up the bridge toll. The last thing we need is to do that.",
          ],
        ],
      ]),
    ),
    spares: sampleOf(
      talk("dad", [
        [
          [
            "dad",
            "The mayor brought up the bridge toll. The last thing we need is to raise it.",
          ],
        ],
      ]),
    ),
  },
  "no-comma-splice": {
    catches: sampleOf(
      text("narration", [["The kettle is on, it will boil soon."]]),
    ),
    spares: sampleOf(
      text("narration", [
        [
          "The kettle is on, and it will boil soon. When the rain stops, we walk. By noon, I'll know. Friends of the library, and all who came, it's good to see you.",
        ],
      ]),
    ),
  },
  "no-over-daypart": {
    catches: sampleOf(
      talk("sis", [[["sis", "We can talk it over again tonight."]]], {
        minuteOfDay: 21 * 60,
      }),
      talk("sis", [[["sis", "Long day at work today?"]]], {
        minuteOfDay: 7 * 60,
      }),
    ),
    spares: sampleOf(
      talk("sis", [[["sis", "We can talk it over again tonight."]]], {
        minuteOfDay: 9 * 60,
      }),
    ),
  },
  "no-daily-subject-loop": {
    catches: sampleOf(
      ...["2025-02-01", "2025-02-02", "2025-02-03"].map((date) =>
        talk("dad", [[["dad", "Did the bus run late, Dana?"]]], { date }),
      ),
    ),
    breaksAt: [2],
    spares: sampleOf(
      ...["2025-01-20", "2025-02-02", "2025-02-03"].map((date) =>
        talk("dad", [[["dad", "Did the bus run late, Dana?"]]], { date }),
      ),
    ),
  },
  "no-echo-between-speakers": {
    catches: sampleOf(
      talk("sis", [[["sis", "The new bridge toll costs us plenty."]]]),
      talk("dad", [[["dad", "The new bridge toll costs us plenty."]]]),
    ),
    breaksAt: [1],
    spares: sampleOf(
      talk("sis", [[["sis", "The new bridge toll costs us plenty."]]]),
      talk("dad", [[["dad", "I drive the long way to dodge that toll."]]]),
    ),
  },
  "vote-month-on-calendar": {
    catches: sampleOf(
      talk("dad", [
        [["dad", "The mayor wants a bridge toll. I'm for it."]],
        [
          [PLAYER, "I'm not."],
          ["dad", "We'll see who's right come November, Dana."],
        ],
      ]),
    ),
    spares: {
      ...sampleOf(
        talk("dad", [
          [["dad", "The mayor wants a bridge toll. I'm for it."]],
          [
            [PLAYER, "I'm not."],
            ["dad", "We'll see who's right come November, Dana."],
          ],
        ]),
      ),
      electionDates: ["2025-11-04"],
    },
  },
  "organization-named-once": {
    catches: sampleOf(
      talk("dad", [
        [["dad", "I'm off from Millbrook Supply Company today."]],
        [
          [
            PLAYER,
            "What will you do with a day off from Millbrook Supply Company?",
          ],
          ["dad", "Sleep, mostly."],
        ],
      ]),
    ),
    spares: sampleOf(
      talk("dad", [
        [["dad", "I'm off from Millbrook Supply Company today."]],
        [
          [PLAYER, "What will you do with a day off from work?"],
          ["dad", "Sleep, mostly. Work wears me out."],
        ],
      ]),
    ),
  },
  "concession-names-what-it-concedes": {
    catches: sampleOf(
      talk("dad", [
        [
          [
            "dad",
            "The mayor brought up the bridge toll. I'd vote for the toll even so.",
          ],
        ],
      ]),
    ),
    spares: sampleOf(
      talk("dad", [
        [
          [
            "dad",
            "The mayor is against the bridge toll. I'd vote for it even so.",
          ],
        ],
      ]),
    ),
  },
  "reason-fits-the-side": {
    catches: sampleOf(
      talk("mom", [
        [
          [
            "mom",
            "Where I'd draw the line is a higher federal minimum wage. At about $15 an hour, it's my own paycheck on the line.",
          ],
        ],
      ]),
    ),
    spares: sampleOf(
      talk("mom", [
        [
          [
            "mom",
            "I'm for a higher federal minimum wage. At about $15 an hour, it's my own paycheck on the line.",
          ],
        ],
      ]),
    ),
  },
  "answer-adds-something": {
    catches: sampleOf(
      talk("dad", [
        [["dad", "The mayor wants a bridge toll. I'm for it."]],
        [
          [PLAYER, "Same as you, Dad."],
          ["dad", "Glad you see it like I do, Dana."],
        ],
      ]),
    ),
    spares: sampleOf(
      talk("dad", [
        [["dad", "The mayor wants a bridge toll. I'm for it."]],
        [
          [PLAYER, "Same as you, Dad."],
          [
            "dad",
            "Now it's up to the council. I'll be watching how they vote.",
          ],
        ],
      ]),
    ),
  },
  "no-non-reply": {
    catches: sampleOf(
      talk("sis", [
        [["sis", "Did you see the bridge vote?"]],
        [
          [PLAYER, "I did, and I think they rushed it."],
          ["sis", "Oh, I see."],
        ],
      ]),
      talk("sis", [
        [["sis", "The bridge vote was close."]],
        [
          [PLAYER, "Too close."],
          ["sis", "Mm. Let's pick this up after supper."],
        ],
      ]),
      talk("sis", [
        [["sis", "The bridge vote was close."]],
        [[PLAYER, "Too close, if you ask me."]],
      ]),
    ),
    spares: sampleOf(
      talk("sis", [
        [["sis", "Did you see the bridge vote?"]],
        [
          [PLAYER, "I did, and I think they rushed it."],
          ["sis", "Rushed, sure, but the toll comes off in March."],
        ],
      ]),
    ),
  },
  "not-asked-after-while-present": {
    catches: sampleOf(
      talk("dad", [[["dad", "Have you talked to Nora lately?"]]]),
    ),
    spares: sampleOf(
      talk("dad", [[["dad", "Have you talked to Nora lately?"]]], {
        presentIds: ["p", "dad"],
      }),
    ),
  },
  "housemate-does-not-ask-known-fact": {
    catches: sampleOf(talk("sis", [[["sis", "So what do you do?"]]])),
    spares: sampleOf(
      talk("sis", [[["sis", "What do you do when the shop is slow?"]]]),
      text("talk:town", [[["vp", "So what do you do?"]]], {
        speakerId: "vp",
        listenerId: PLAYER,
      }),
    ),
  },
  "speech-names-no-stray-place": {
    catches: sampleOf(
      text("speech:governor", [["Families in Oregon and Ohio deserve it."]], {
        ownPlaces: ["Ohio"],
      }),
      text(
        "speech:governor",
        [["We can do what Washington State did for its ferries."]],
        { ownPlaces: ["Ohio"] },
      ),
      text(
        "speech:governor",
        [["People of West Virginia, look at what Virginia built."]],
        { ownPlaces: ["West Virginia"] },
      ),
      text("speech:governor", [["People of West Virginia, good evening."]], {
        ownPlaces: ["Virginia"],
      }),
    ),
    spares: sampleOf(
      text(
        "speech:governor",
        [["Families across Ohio deserve it. Washington must help."]],
        { ownPlaces: ["Ohio"] },
      ),
      text("speech:governor", [["People of West Virginia, good evening."]], {
        ownPlaces: ["West Virginia"],
      }),
      text("speech:governor", [["Arkansas is open for business."]], {
        ownPlaces: ["Arkansas"],
      }),
    ),
  },
  "ask-said-once": {
    catches: sampleOf(
      text("speech:mayor", [
        ["I'm asking the council to fund the river cleanup."],
        ["Again, I'm asking you to fund the river cleanup this spring."],
      ]),
    ),
    spares: sampleOf(
      text("speech:mayor", [
        ["I'm asking the council to fund the river cleanup."],
        ["I'm also asking you to repave Main Street before winter."],
      ]),
    ),
  },
  "subject-budget": {
    catches: sampleOf(
      text("speech:mayor", [
        [
          "Housing first. Housing costs rose. Housing is scarce. More housing comes.",
        ],
      ]),
    ),
    spares: sampleOf(
      text("speech:mayor", [
        ["Housing first. Rents rose. Homes are scarce. More are coming."],
      ]),
      // A comparative is not a subject: "higher" in three questions' names.
      text("speech:president", [
        [
          "A higher tax rate is wrong. A higher debt limit needs cuts. A higher wage costs jobs. Higher still is no answer.",
        ],
      ]),
    ),
  },
  "point-made-once": {
    // The lead, Nov 12: the today wording and the belief restate each other.
    catches: sampleOf(
      text("speech:mayor", [
        [
          "A complaint goes up the chain of command, to people who know the work. Because I believe an officer should be judged by people who have done the job, I'm against civilian oversight of the police.",
        ],
      ]),
    ),
    spares: sampleOf(
      text("speech:mayor", [
        [
          "The department reviews complaints against its own officers. Because I believe an officer should be judged by people who have done the job, I'm against civilian oversight of the police.",
        ],
      ]),
      // One wording in each of two paragraphs is one point in each.
      text("speech:mayor", [
        [
          "A complaint goes up the chain of command, to people who know the work.",
        ],
        [
          "I believe an officer should be judged by people who have done the job.",
        ],
      ]),
    ),
  },
  "note-stands-alone": {
    catches: sampleOf(
      text("journal:note", [["Six weeks later, I quit the bakery."]]),
      text("journal:note", [["My sister works as a works outside town."]]),
    ),
    spares: sampleOf(
      text("journal:note", [
        ["In March I quit the bakery on Elm Street. It paid well."],
      ]),
    ),
  },
};

/** All 56: the 50 states, D.C. and the five territories. */
const PLACE_COUNT = 56;
const PLACE_SAID: Readonly<Record<string, string>> =
  checksData.placeSaidOnlyAs.names;

describe("composed rules: the registry and the rule rows", () => {
  it("every composed rule names checks that exist, and kinds that exist", () => {
    expect(composed.length).toBeGreaterThan(0);
    const wrong = composed.flatMap((rule) => {
      if (rule.test.kind !== "composed") return [];
      return [
        ...checksOf(rule.test.check)
          .filter((name) => !COMPOSED_CHECKS[name])
          .map((name) => `${rule.id}: no check named ${name}`),
        ...(rule.test.applies ?? [])
          .filter(
            (kind) => !(COMPOSED_KINDS as readonly string[]).includes(kind),
          )
          .map((kind) => `${rule.id}: no kind of text named ${kind}`),
      ];
    });
    expect(wrong).toEqual([]);
  });

  it("a composed rule reports and pulls no bank line: it is a sample with a note", () => {
    for (const rule of composed) {
      expect(rule.status, rule.id).toBe("sample");
      expect(rule.note ?? "", rule.id).not.toBe("");
    }
  });

  it("every check is used by a rule and has fixtures", () => {
    const used = new Set(
      composed.flatMap((rule) =>
        rule.test.kind === "composed" ? checksOf(rule.test.check) : [],
      ),
    );
    expect(Object.keys(COMPOSED_CHECKS).sort()).toEqual([...used].sort());
    expect(Object.keys(FIXTURES).sort()).toEqual([...used].sort());
  });

  it("the baseline names only composed rules, each with its seeds", () => {
    const ids = new Set(composed.map((rule) => rule.id));
    for (const [id, row] of Object.entries(baseline.rules)) {
      expect(ids.has(id), id).toBe(true);
      expect(row.read, id).toBeGreaterThanOrEqual(0);
    }
    expect(baseline.draws.length).toBeGreaterThan(0);
  });
});

describe("composed rules: each check on its fixtures", () => {
  it.each(Object.keys(FIXTURES))(
    "%s catches what it must and spares the rest",
    (name) => {
      const { catches, spares, breaksAt } = FIXTURES[name]!;
      catches.texts.forEach((own, at) => {
        const found = COMPOSED_CHECKS[name]!(own, catches);
        if (!breaksAt || breaksAt.includes(at))
          expect(found.length, `${name} must catch ${own.id}`).toBeGreaterThan(
            0,
          );
        else expect(found, `${name} must spare ${own.id}`).toEqual([]);
      });
      for (const sampleText of spares.texts)
        expect(
          COMPOSED_CHECKS[name]!(sampleText, spares),
          `${name} must spare ${sampleText.id}`,
        ).toEqual([]);
      for (const own of breaks(name, catches)) {
        expect(own.check).toBe(name);
        expect(own.quote.length).toBeGreaterThan(0);
      }
    },
  );

  it("the run counts per rule the texts read and the breaks", () => {
    const sample = FIXTURES["no-comma-splice"]!.catches;
    const counts = runComposedRules(composed, sample);
    const row = counts.find(
      (count) => count.rule === "one-idea-to-a-sentence",
    )!;
    expect(row.read).toBe(1);
    expect(row.breaks.length).toBe(1);
  });

  it("a run that reads no texts for a rule fails the baseline, never passes it", () => {
    const committed = {
      "no-non-replies": { read: 45, breaks: 17, per100: 37.8 },
      "speech-has-one-theme": { read: 7, breaks: 5, per100: 71.4 },
    };
    const empty = {
      "no-non-replies": { read: 0, breaks: 0, per100: 0 },
      "speech-has-one-theme": { read: 0, breaks: 0, per100: 0 },
    };
    const lost = baselineFailures(committed, empty);
    expect(lost.length).toBe(2);
    for (const line of lost) expect(line.startsWith("COVERAGE: ")).toBe(true);
    expect(baselineFailures(committed, {})[0]).toContain("COVERAGE: ");
    // Fewer texts and fewer breaks: the rate rose only through the
    // denominator, which is no rise.
    expect(
      baselineFailures(committed, {
        ...committed,
        "no-non-replies": { read: 40, breaks: 16, per100: 40 },
      }),
    ).toEqual([]);
    // Fewer texts and more breaks: a rise, whatever the count of texts.
    expect(
      baselineFailures(committed, {
        ...committed,
        "no-non-replies": { read: 40, breaks: 18, per100: 45 },
      }),
    ).toEqual([
      "ROSE: no-non-replies 37.8 -> 45 breaks per 100 texts (17 -> 18 breaks in 45 -> 40 texts)",
    ]);
    // As many texts or more: the rate decides.
    expect(
      baselineFailures(committed, {
        ...committed,
        "no-non-replies": { read: 50, breaks: 20, per100: 40 },
      }),
    ).toEqual([
      "ROSE: no-non-replies 37.8 -> 40 breaks per 100 texts (17 -> 20 breaks in 45 -> 50 texts)",
    ]);
    expect(
      baselineFailures(committed, {
        "no-non-replies": { read: 31, breaks: 0, per100: 0 },
        "speech-has-one-theme": { read: 7, breaks: 2, per100: 28.6 },
      }),
    ).toEqual([]);
  });

  it("the committed baseline read texts for every composed rule", () => {
    for (const [rule, row] of Object.entries(baseline.rules))
      expect(row.read, `${rule} read no texts in the baseline`).toBeGreaterThan(
        0,
      );
  });

  it("the stray-place check holds for every state and territory, as the speech's own and as a stray", () => {
    const stateNames = corePlaceStateIdentities().map((row) => row.name);
    expect(stateNames.length).toBe(PLACE_COUNT);
    const check = COMPOSED_CHECKS["speech-names-no-stray-place"]!;
    for (const name of stateNames) {
      const said = PLACE_SAID[name] ?? name;
      const line = `People of ${said}, good evening.`;
      const own = { ...sampleOf(), stateNames };
      const ownText = text("speech:governor", [[line]], { ownPlaces: [name] });
      expect(check(ownText, own), `${name} as its own speech's place`).toEqual(
        [],
      );
      const other = stateNames.find(
        (one) => !one.includes(name) && !name.includes(one),
      )!;
      const strayText = text("speech:governor", [[line]], {
        ownPlaces: [other],
      });
      const found = check(strayText, own);
      expect(found.length, `${name} in ${other}'s speech`).toBe(1);
      expect(found[0]!.why).toContain(`names ${name},`);
    }
  });
});
