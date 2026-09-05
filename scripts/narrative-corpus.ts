import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  DEFAULT_NEW_GAME_SETUP,
  type NewGameSetup,
} from "../src/presentation/new-game";
import {
  narrativeLint,
  runPlaythrough,
  transcriptToInventory,
  transcriptToMarkdown,
  varyingChooser,
  fixedChooser,
  type LintFinding,
  type ProseInventoryItem,
  type Transcript,
} from "../src/presentation/playthrough-transcript";

/**
 * The deterministic narrative corpus.
 *
 *   npm run corpus:narrative
 *
 * Runs a curated matrix of canonical lives and writes, under
 * docs/overnight-audit/corpus/:
 *   - transcripts.md         every life told as a reader would read it
 *   - prose-inventory.json   every DISTINCT player-facing string, with a
 *                            durable speakable id (F-0001…), its contexts, and
 *                            the lint categories it triggers
 *   - lint-summary.md        aggregate diagnostics, most-common problems first
 *
 * Nothing here is random. The matrix, the seeds and the choosers are fixed, so
 * a second run produces byte-identical output and a diff is a diff between two
 * builds of the game, not between two runs of this script.
 */

interface Cell {
  readonly label: string;
  readonly setup: NewGameSetup;
  readonly beats: number;
  readonly fixed?: number; // use a fixed chooser column instead of varying
}

const OUT_DIR = join(process.cwd(), "docs", "overnight-audit", "corpus");

function setup(
  overrides: Partial<NewGameSetup> & { seed: string },
): NewGameSetup {
  return { ...DEFAULT_NEW_GAME_SETUP, ...overrides };
}

/**
 * A curated matrix. Chosen to span the ages, places, households and depths the
 * audit asks about while staying deterministic and bounded — roughly 30 lives,
 * ~250 beats. It is not the full cartesian product; it is a spread wide enough
 * to reveal systemic failures without drowning the reader.
 */
const MATRIX: readonly Cell[] = [
  // --- Childhood, played formative years, both households, several places ----
  {
    label: "KY · age 5 · shares-a-home · deep",
    beats: 8,
    setup: setup({
      seed: "ky-5-share",
      placeKey: "kentucky",
      startAge: 5,
      household: "shares-a-home",
      depth: "play-formative-years",
      questionnaire: "deep",
      gender: "female",
    }),
  },
  {
    label: "KY · age 8 · shares-a-home · short",
    beats: 8,
    setup: setup({
      seed: "ky-8-share",
      placeKey: "kentucky",
      startAge: 8,
      household: "shares-a-home",
      depth: "play-formative-years",
      questionnaire: "short",
      gender: "male",
    }),
  },
  {
    label: "KY · age 10 · shares-a-home · deep",
    beats: 10,
    setup: setup({
      seed: "ky-10-share",
      placeKey: "kentucky",
      startAge: 10,
      household: "shares-a-home",
      depth: "play-formative-years",
      questionnaire: "deep",
      gender: "male",
    }),
  },
  {
    label: "KY · age 10 · shares-a-home · deep (fixed col 0)",
    beats: 10,
    fixed: 0,
    setup: setup({
      seed: "ky-10-share",
      placeKey: "kentucky",
      startAge: 10,
      household: "shares-a-home",
      depth: "play-formative-years",
      questionnaire: "deep",
      gender: "male",
    }),
  },
  {
    label: "NE · age 10 · lives-alone · short",
    beats: 8,
    setup: setup({
      seed: "ne-10-alone",
      placeKey: "nebraska",
      startAge: 10,
      household: "lives-alone",
      depth: "play-formative-years",
      questionnaire: "short",
      gender: "nonbinary",
    }),
  },
  {
    label: "AK · age 12 · shares-a-home · deep",
    beats: 8,
    setup: setup({
      seed: "ak-12-share",
      placeKey: "alaska",
      startAge: 12,
      household: "shares-a-home",
      depth: "play-formative-years",
      questionnaire: "deep",
      gender: "female",
    }),
  },
  {
    label: "Lexington · age 13 · shares-a-home · short",
    beats: 8,
    setup: setup({
      seed: "lex-13-share",
      placeKey: "lexington-fayette",
      startAge: 13,
      household: "shares-a-home",
      depth: "play-formative-years",
      questionnaire: "short",
      gender: "male",
    }),
  },
  {
    label: "KY · age 13 · lives-alone · deep",
    beats: 8,
    setup: setup({
      seed: "ky-13-alone",
      placeKey: "kentucky",
      startAge: 13,
      household: "lives-alone",
      depth: "play-formative-years",
      questionnaire: "deep",
      gender: "female",
    }),
  },
  {
    label: "NE · age 16 · shares-a-home · deep",
    beats: 10,
    setup: setup({
      seed: "ne-16-share",
      placeKey: "nebraska",
      startAge: 16,
      household: "shares-a-home",
      depth: "play-formative-years",
      questionnaire: "deep",
      gender: "male",
    }),
  },
  {
    label: "AK · age 16 · shares-a-home · short",
    beats: 8,
    setup: setup({
      seed: "ak-16-share",
      placeKey: "alaska",
      startAge: 16,
      household: "shares-a-home",
      depth: "play-formative-years",
      questionnaire: "short",
      gender: "female",
    }),
  },

  // --- The age-16 boundary and the move to 18 -------------------------------
  {
    label: "KY · age 16 · summarize-earlier · deep",
    beats: 10,
    setup: setup({
      seed: "ky-16-sum",
      placeKey: "kentucky",
      startAge: 16,
      household: "shares-a-home",
      depth: "summarize-earlier-life",
      questionnaire: "deep",
      gender: "male",
    }),
  },
  {
    label: "KY · age 18 · summarize-earlier · deep",
    beats: 12,
    setup: setup({
      seed: "ky-18-sum",
      placeKey: "kentucky",
      startAge: 18,
      household: "shares-a-home",
      depth: "summarize-earlier-life",
      questionnaire: "deep",
      gender: "female",
    }),
  },
  {
    label: "NE · age 18 · lives-alone · short",
    beats: 10,
    setup: setup({
      seed: "ne-18-alone",
      placeKey: "nebraska",
      startAge: 18,
      household: "lives-alone",
      depth: "summarize-earlier-life",
      questionnaire: "short",
      gender: "nonbinary",
    }),
  },

  // --- Adult ordinary life, several places, seeds and genders ---------------
  {
    label: "KY · age 25 · shares-a-home · deep",
    beats: 10,
    setup: setup({
      seed: "ky-25-share",
      placeKey: "kentucky",
      startAge: 25,
      household: "shares-a-home",
      depth: "summarize-earlier-life",
      questionnaire: "deep",
      gender: "female",
    }),
  },
  {
    label: "AK · age 25 · lives-alone · short",
    beats: 10,
    setup: setup({
      seed: "ak-25-alone",
      placeKey: "alaska",
      startAge: 25,
      household: "lives-alone",
      depth: "summarize-earlier-life",
      questionnaire: "short",
      gender: "male",
    }),
  },
  {
    label: "NE · age 34 · shares-a-home · deep",
    beats: 12,
    setup: setup({
      seed: "ne-34-share",
      placeKey: "nebraska",
      startAge: 34,
      household: "shares-a-home",
      depth: "summarize-earlier-life",
      questionnaire: "deep",
      gender: "male",
    }),
  },
  {
    label: "Lexington · age 34 · lives-alone · short",
    beats: 10,
    setup: setup({
      seed: "lex-34-alone",
      placeKey: "lexington-fayette",
      startAge: 34,
      household: "lives-alone",
      depth: "summarize-earlier-life",
      questionnaire: "short",
      gender: "female",
    }),
  },
  {
    label: "KY · age 45 · shares-a-home · deep",
    beats: 12,
    setup: setup({
      seed: "ky-45-share",
      placeKey: "kentucky",
      startAge: 45,
      household: "shares-a-home",
      depth: "summarize-earlier-life",
      questionnaire: "deep",
      gender: "nonbinary",
    }),
  },
  {
    label: "AK · age 62 · shares-a-home · short",
    beats: 10,
    setup: setup({
      seed: "ak-62-share",
      placeKey: "alaska",
      startAge: 62,
      household: "shares-a-home",
      depth: "summarize-earlier-life",
      questionnaire: "short",
      gender: "female",
    }),
  },

  // --- Legislative office starts (capability-gated; age >= 21, place has one) -
  {
    label: "KY · age 34 · legislative-office · deep",
    beats: 12,
    setup: setup({
      seed: "ky-34-office",
      placeKey: "kentucky",
      startAge: 34,
      household: "shares-a-home",
      depth: "summarize-earlier-life",
      startingLife: "legislative-office",
      questionnaire: "deep",
      gender: "male",
    }),
  },
  {
    label: "NE · age 45 · legislative-office · short",
    beats: 12,
    setup: setup({
      seed: "ne-45-office",
      placeKey: "nebraska",
      startAge: 45,
      household: "lives-alone",
      depth: "summarize-earlier-life",
      startingLife: "legislative-office",
      questionnaire: "short",
      gender: "female",
    }),
  },
  {
    label: "AK · age 52 · legislative-office · deep",
    beats: 12,
    setup: setup({
      seed: "ak-52-office",
      placeKey: "alaska",
      startAge: 52,
      household: "shares-a-home",
      depth: "summarize-earlier-life",
      startingLife: "legislative-office",
      questionnaire: "deep",
      gender: "male",
    }),
  },

  // --- Seed variety at one fixed cell, to see how much the family/threads move
  {
    label: "KY · age 10 · seed A",
    beats: 8,
    setup: setup({
      seed: "variety-A",
      placeKey: "kentucky",
      startAge: 10,
      household: "shares-a-home",
      depth: "play-formative-years",
      questionnaire: "deep",
      gender: "female",
    }),
  },
  {
    label: "KY · age 10 · seed B",
    beats: 8,
    setup: setup({
      seed: "variety-B",
      placeKey: "kentucky",
      startAge: 10,
      household: "shares-a-home",
      depth: "play-formative-years",
      questionnaire: "deep",
      gender: "female",
    }),
  },
  {
    label: "KY · age 10 · seed C",
    beats: 8,
    setup: setup({
      seed: "variety-C",
      placeKey: "kentucky",
      startAge: 10,
      household: "shares-a-home",
      depth: "play-formative-years",
      questionnaire: "deep",
      gender: "female",
    }),
  },

  // --- No questionnaire at all (skipped) — the world the game builds unprompted
  {
    label: "KY · age 10 · questionnaire skipped",
    beats: 8,
    setup: setup({
      seed: "ky-10-skip",
      placeKey: "kentucky",
      startAge: 10,
      household: "shares-a-home",
      depth: "play-formative-years",
      questionnaire: "skipped",
      gender: "male",
    }),
  },
  {
    label: "NE · age 34 · questionnaire skipped",
    beats: 10,
    setup: setup({
      seed: "ne-34-skip",
      placeKey: "nebraska",
      startAge: 34,
      household: "shares-a-home",
      depth: "summarize-earlier-life",
      questionnaire: "skipped",
      gender: "female",
    }),
  },
];

interface DistinctEntry {
  readonly id: string;
  readonly kind: string;
  readonly text: string;
  occurrences: number;
  readonly contexts: {
    age: number;
    place: string | null;
    sceneKind: string;
    configLabel: string;
    present: readonly string[];
  }[];
  recordBacked: boolean | null;
  lintCategories: string[];
}

function main(): void {
  mkdirSync(OUT_DIR, { recursive: true });

  const transcripts: Transcript[] = [];
  const allInventory: ProseInventoryItem[] = [];
  const lintByCategory = new Map<string, LintFinding[]>();
  const textToCategories = new Map<string, Set<string>>();
  let totalBeats = 0;

  for (const cell of MATRIX) {
    const transcript = runPlaythrough({
      label: cell.label,
      setup: cell.setup,
      beats: cell.beats,
      choose:
        cell.fixed !== undefined ? fixedChooser(cell.fixed) : varyingChooser(),
    });
    transcripts.push(transcript);
    totalBeats += transcript.beats.length;
    for (const item of transcriptToInventory(transcript))
      allInventory.push(item);
    for (const finding of narrativeLint(transcript)) {
      const list = lintByCategory.get(finding.category) ?? [];
      list.push({ ...finding, detail: `[${cell.label}] ${finding.detail}` });
      lintByCategory.set(finding.category, list);
      const cats = textToCategories.get(finding.text) ?? new Set<string>();
      cats.add(finding.category);
      textToCategories.set(finding.text, cats);
    }
  }

  // --- transcripts.md -------------------------------------------------------
  const md: string[] = [
    "# Deterministic Playthrough Corpus — Our Civic Duty",
    "",
    `Generated by \`npm run corpus:narrative\` from accepted \`main\`. ${MATRIX.length} lives, ${totalBeats} beats. Deterministic: re-running reproduces this byte-for-byte.`,
    "",
    "Each beat shows what the player reads (connective narration in blockquote, then the scene), the choices (→ marks the one this deterministic run took), what is currently open in the life, and the consequence the world recorded. The `dev:` footer is developer-only and never reaches a player.",
    "",
    "---",
    "",
  ];
  for (const transcript of transcripts) {
    md.push(transcriptToMarkdown(transcript));
    md.push("\n---\n");
  }
  writeFileSync(join(OUT_DIR, "transcripts.md"), md.join("\n"), "utf8");

  // --- prose-inventory.json (distinct strings, durable ids) -----------------
  const distinct = new Map<string, DistinctEntry>();
  const order: string[] = [];
  for (const item of allInventory) {
    const key = `${item.kind}:::${item.text}`;
    let entry = distinct.get(key);
    if (!entry) {
      entry = {
        id: "",
        kind: item.kind,
        text: item.text,
        occurrences: 0,
        contexts: [],
        recordBacked: item.recordBacked,
        lintCategories: [...(textToCategories.get(item.text) ?? [])].sort(),
      };
      distinct.set(key, entry);
      order.push(key);
    }
    entry.occurrences += 1;
    if (entry.contexts.length < 4) {
      entry.contexts.push({
        age: item.age,
        place: item.place,
        sceneKind: item.sceneKind,
        configLabel: item.configLabel,
        present: item.present,
      });
    }
  }
  // Assign durable speakable ids in a stable order: by kind, then first-seen.
  const kindPrefix: Record<string, string> = {
    connective: "N", // narration / connective
    "authored-scene": "S", // scene
    choice: "C", // choice
    "thread-recap": "T", // thread recap
  };
  const kindsOrder = ["authored-scene", "choice", "connective", "thread-recap"];
  let counter = 0;
  const finalDistinct: DistinctEntry[] = [];
  for (const kind of kindsOrder) {
    const entriesOfKind = order
      .map((key) => distinct.get(key)!)
      .filter((entry) => entry.kind === kind);
    for (const entry of entriesOfKind) {
      counter += 1;
      const prefix = kindPrefix[kind] ?? "X";
      entry.id = `${prefix}-${String(counter).padStart(4, "0")}`;
      finalDistinct.push(entry);
    }
  }

  writeFileSync(
    join(OUT_DIR, "prose-inventory.json"),
    JSON.stringify(
      {
        generatedFrom: "accepted main (see completion report for exact SHA)",
        lives: MATRIX.length,
        beats: totalBeats,
        distinctStrings: finalDistinct.length,
        proseInstances: allInventory.length,
        items: finalDistinct,
      },
      null,
      2,
    ),
    "utf8",
  );

  // --- lint-summary.md ------------------------------------------------------
  const lintMd: string[] = [
    "# Narrative Lint — Aggregate Diagnostics",
    "",
    "Diagnostic only. These are signals for human review, never canonical quality judgements. Counts are over the whole corpus.",
    "",
    "| Category | Count | What it means |",
    "|---|---:|---|",
  ];
  const meaning: Record<string, string> = {
    "machine-cadence":
      "State-not-changing filler ('carried on', 'went on being', 'most evenings unremarkable').",
    "repeated-adjacent": "Same sentence in two consecutive beats.",
    "repeated-run": "Same sentence in 3+ beats of one life.",
    "empty-beat":
      "An ordinary stretch with no scene — dead time the player clicks through.",
    "no-consequence":
      "A decided beat that changed nothing a later beat could surface.",
    "unbacked-connective":
      "A connective sentence with no canonical record behind it (possible invented tissue).",
    "vocative-binding":
      "Scene addresses a bound peer by name then says 'your' — role-binding smell.",
    "unintroduced-person":
      "A named person appears in scene prose without being introduced.",
    "age-vocabulary": "Adult vocabulary offered to a pre-teen.",
    "vague-referent":
      "Scenario names its stakes only as 'the thing'/'the plan'.",
  };
  const sorted = [...lintByCategory.entries()].sort(
    (left, right) => right[1].length - left[1].length,
  );
  for (const [category, findings] of sorted) {
    lintMd.push(
      `| \`${category}\` | ${findings.length} | ${meaning[category] ?? ""} |`,
    );
  }
  lintMd.push("");
  for (const [category, findings] of sorted) {
    lintMd.push(`## \`${category}\` — ${findings.length}`);
    lintMd.push("");
    const shown = findings.slice(0, 20);
    for (const finding of shown) {
      lintMd.push(`- beat ${finding.beatIndex + 1}: ${finding.detail}`);
      lintMd.push(`  - “${finding.text.slice(0, 160)}”`);
    }
    if (findings.length > shown.length) {
      lintMd.push(`- …and ${findings.length - shown.length} more.`);
    }
    lintMd.push("");
  }
  writeFileSync(join(OUT_DIR, "lint-summary.md"), lintMd.join("\n"), "utf8");

  // --- stdout summary -------------------------------------------------------
  const totalFindings = [...lintByCategory.values()].reduce(
    (sum, list) => sum + list.length,
    0,
  );
  process.stdout.write(
    [
      `Wrote corpus to ${OUT_DIR}`,
      `  lives: ${MATRIX.length}`,
      `  beats: ${totalBeats}`,
      `  distinct player-facing strings: ${finalDistinct.length}`,
      `  prose instances: ${allInventory.length}`,
      `  lint findings: ${totalFindings}`,
      ...sorted.map(([category, list]) => `    ${category}: ${list.length}`),
      "",
    ].join("\n"),
  );
}

main();
