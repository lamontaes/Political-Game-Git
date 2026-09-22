/**
 * What reaches what in this game, and what does not.
 *
 * The research queue asks questions. This asks nothing: it is the picture the
 * questions imply, written down once so that somebody instructing us how to
 * build the why and the what can see the wiring rather than infer it from
 * twenty separate asks. lamontae, 2026-09-22: "chatgpt is going to instruct
 * HOW to make the why and what happen so it NEEDS to know this
 * interconnectivity info."
 *
 * THREE THINGS ARE SEPARATE, and this game has every combination of them: a
 * number on a screen, a control that moves it, and a system underneath. The
 * hardcoded-content audit lane found this while answering a question about
 * healthcare, negotiation and budgets, and it is the shape of the map.
 * Negotiation has all three. Budgets have the system and the numbers and no
 * control, and the page says so in its own words. Healthcare has none of the
 * three — and is nonetheless declared as a policy domain in shipped content,
 * so a player can file a bill about Medicaid and there is nothing for it to
 * affect.
 *
 * That last case is why the map exists. A subject that looks present because
 * it has been NAMED is invisible to every other kind of check we run: the
 * pack loads, the domain resolves, the bill files, and nothing anywhere
 * reports that there is nothing behind it.
 *
 * Like the research queue, this is one file per entry under a directory, and
 * the directory IS the map. Lanes file into it from their own branches, and a
 * shared document would lose an entry to a merge on every second write.
 */

/** Where the entries live, relative to the repository root. */
export const CONNECTIVITY_ENTRY_DIRECTORY = "docs/connectivity/entries";

export const CONNECTIVITY_MAP_VERSION = "connectivity-map/v1";

/**
 * Whether a player can set this going.
 *
 * His own addition, 2026-09-22. It is not the same as having a control: a
 * control an NPC or a scheduler drives is still a control. `unknown` is a real
 * answer and is reported as unknown — never as "does not reach", which would
 * read as a measurement nobody made.
 */
export type PlayerReach = "reaches" | "does-not-reach" | "unknown";

export const PLAYER_REACHES: readonly PlayerReach[] = [
  "reaches",
  "does-not-reach",
  "unknown",
];

export interface ConnectivityMeasurement {
  /** What was looked at: a path and line, a command, a save that was run. */
  readonly what: string;
  /** What it established, in enough detail to disagree with. */
  readonly found: string;
  /** The tree or commit it was measured at, because a claim without one travels. */
  readonly at: string;
}

/**
 * One of the three things, and what is actually there.
 *
 * The detail is not optional when the part is absent. "No model" is a claim
 * about the whole game; what makes it checkable is saying where you looked.
 */
export interface ConnectivityPart {
  readonly present: boolean;
  readonly detail: string;
}

export interface ConnectivityEntry {
  readonly mapVersion: string;
  /** Kebab-case, unique, and the entry's filename. */
  readonly entryId: string;
  /** The subject, named as a player would name it: "Budgets", "Healthcare". */
  readonly title: string;
  /** A model underneath that computes or records something. */
  readonly system: ConnectivityPart;
  /** A number, a list, a sentence a player can see. */
  readonly surface: ConnectivityPart;
  /** Something that moves it: a button, a vote, a filing. */
  readonly control: ConnectivityPart;
  /**
   * Whether shipped content names this subject although nothing above is
   * there. This is the case the map exists for: a declared policy domain, a
   * named federal programme, a catalogue row. The name makes it look present
   * to every check we have.
   */
  readonly declaredInContent: boolean;
  /** Where it is declared, when it is. */
  readonly declaredDetail?: string;
  readonly playerReach: PlayerReach;
  /** What a player does that reaches it, or what is missing for them to. */
  readonly playerReachDetail: string;
  /** At least one. An entry with no measurement is an opinion. */
  readonly measurements: readonly ConnectivityMeasurement[];
  /** The lane that measured it. */
  readonly measuredBy: string;
  /**
   * Whether the lane publishing this document re-measured it, or carried it
   * from the lane that did. Carried readings are marked on the page, because a
   * reader weighing one has to know which kind it is.
   */
  readonly reMeasuredByPublisher: boolean;
  readonly recordedAt: string;
  /**
   * Why this subject opens the document, when it does.
   *
   * At most one entry has it. It is for the finding every other one turns on:
   * the map is read start to finish by somebody deciding what to build, and
   * burying that in a band costs it the reading it needs. The entry is shown
   * in full at the top and left out of its band, so nothing is said twice.
   */
  readonly opensTheDocument?: string;
  /** Anything a reader needs that does not fit above. */
  readonly notes?: readonly string[];
}

export interface ConnectivityFinding {
  readonly severity: "error" | "warning";
  readonly entryId: string;
  readonly code: string;
  readonly message: string;
}

export interface ConnectivityValidation {
  readonly valid: boolean;
  readonly findings: readonly ConnectivityFinding[];
}

function nonEmpty(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isPart(value: unknown): value is ConnectivityPart {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as ConnectivityPart).present === "boolean" &&
    nonEmpty((value as ConnectivityPart).detail)
  );
}

/**
 * Refuse an entry a reader could not act on.
 *
 * The strictness is the bargain the research queue makes: recording a wire is
 * asserting something about the game to somebody who will instruct us on the
 * strength of it, so an entry with no measurement, or one whose measurement
 * names no tree, is refused rather than published with a hole.
 */
export function validateConnectivityEntries(
  entries: readonly ConnectivityEntry[],
): ConnectivityValidation {
  const findings: ConnectivityFinding[] = [];
  const seen = new Set<string>();

  for (const entry of entries) {
    const id = nonEmpty(entry.entryId) ? entry.entryId : "(no id)";
    const fail = (code: string, message: string) =>
      findings.push({ severity: "error", entryId: id, code, message });

    if (entry.mapVersion !== CONNECTIVITY_MAP_VERSION) {
      fail(
        "unknown-version",
        `mapVersion '${String(entry.mapVersion)}' is not ${CONNECTIVITY_MAP_VERSION}.`,
      );
    }
    if (!nonEmpty(entry.entryId)) {
      fail("missing-id", "entryId is required and is the entry's filename.");
    } else if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(entry.entryId)) {
      fail("bad-id", `entryId '${entry.entryId}' is not kebab-case.`);
    } else if (seen.has(entry.entryId)) {
      fail("duplicate-id", `'${entry.entryId}' is recorded twice.`);
    }
    seen.add(entry.entryId);

    for (const [field, value] of [
      ["title", entry.title],
      ["playerReachDetail", entry.playerReachDetail],
      ["measuredBy", entry.measuredBy],
      ["recordedAt", entry.recordedAt],
    ] as const) {
      if (!nonEmpty(value)) fail(`missing-${field}`, `${field} is required.`);
    }

    for (const [field, part] of [
      ["system", entry.system],
      ["surface", entry.surface],
      ["control", entry.control],
    ] as const) {
      if (!isPart(part)) {
        fail(
          `bad-${field}`,
          `${field} needs { present: boolean, detail: string }. The detail is required when the part is ABSENT too: "no model" is a claim about the whole game, and what makes it checkable is saying where you looked.`,
        );
      }
    }

    if (typeof entry.declaredInContent !== "boolean") {
      fail(
        "missing-declared",
        "declaredInContent is required. A subject named in shipped content with nothing behind the name is the case this document exists to make visible, and omitting the field hides exactly that.",
      );
    } else if (entry.declaredInContent && !nonEmpty(entry.declaredDetail)) {
      fail(
        "undeclared-declaration",
        "declaredInContent is true, so declaredDetail must say where it is declared — the pack, the catalogue row, the programme name.",
      );
    }

    if (!PLAYER_REACHES.includes(entry.playerReach)) {
      fail(
        "unknown-player-reach",
        `playerReach '${String(entry.playerReach)}' is not one of ${PLAYER_REACHES.join(", ")}.`,
      );
    }
    if (typeof entry.reMeasuredByPublisher !== "boolean") {
      fail(
        "missing-re-measured",
        "reMeasuredByPublisher is required. A carried reading and a re-measured one are different evidence, and leaving it out publishes the stronger claim by default.",
      );
    }

    const measurements = entry.measurements ?? [];
    if (measurements.length === 0) {
      fail(
        "no-measurement",
        "At least one measurement is required. An entry with none is an opinion about the game, and this document is read as evidence.",
      );
    }
    for (const measurement of measurements) {
      if (!nonEmpty(measurement?.what) || !nonEmpty(measurement?.found)) {
        fail(
          "empty-measurement",
          "Every measurement needs what was looked at and what it found.",
        );
      }
      if (!nonEmpty(measurement?.at)) {
        fail(
          "unanchored-measurement",
          `A measurement of '${id}' names no tree or commit. A claim travels further than its measurement, so an unanchored one cannot be rechecked and is refused.`,
        );
      }
    }
  }

  return { valid: findings.every((f) => f.severity !== "error"), findings };
}

/**
 * Which of the eight combinations an entry is in.
 *
 * The order is what somebody deciding what to build needs first: the subject
 * that looks present and is not, then what is missing entirely, then the
 * partial ones, then what already works.
 */
export type Combination =
  | "named-only"
  | "nothing"
  | "system-only"
  | "surface-only"
  | "control-only"
  | "no-control"
  | "no-surface"
  | "no-system"
  | "all-three";

export const COMBINATIONS: readonly Combination[] = [
  "named-only",
  "nothing",
  "no-system",
  "surface-only",
  "system-only",
  "control-only",
  "no-surface",
  "no-control",
  "all-three",
];

const COMBINATION_HEADINGS: Readonly<Record<Combination, string>> = {
  "named-only": "Named in shipped content, with nothing at all behind the name",
  nothing: "No system, no numbers, no screen",
  "no-system": "Numbers and controls, with nothing underneath them",
  "surface-only": "Numbers on a screen, with nothing underneath and no control",
  "system-only": "A system running, with nothing to see and nothing to move it",
  "control-only": "A control, with nothing underneath and nothing to see",
  "no-surface": "A system a player can move, and cannot see",
  "no-control": "A system a player can see, and cannot touch",
  "all-three": "All three: a system, numbers, and controls that reach them",
};

const COMBINATION_GLOSS: Readonly<Record<Combination, string>> = {
  "named-only":
    "The case this document exists for. Shipped content names the subject, so the pack loads, the domain resolves and a bill about it files — and nothing anywhere reports that there is nothing behind it. Invisible to every other check we run.",
  nothing: "Not started, and not pretending to be.",
  "no-system":
    "A content job, not a wiring job: the screens and the controls are there and there is nothing for them to move.",
  "surface-only": "A display with nothing behind it.",
  "system-only":
    "Work already paid for. Only the entry point and the display are missing.",
  "control-only": "A control that moves nothing anybody can observe.",
  "no-surface":
    "It runs and it responds and a player is never shown the result.",
  "no-control":
    "The wiring job: the model and the display exist and nothing joins a player to them.",
  "all-three": "Working. Recorded so the rest can be compared against it.",
};

export function combinationOf(entry: ConnectivityEntry): Combination {
  const system = entry.system.present;
  const surface = entry.surface.present;
  const control = entry.control.present;
  if (system && surface && control) return "all-three";
  if (system && surface) return "no-control";
  if (system && control) return "no-surface";
  if (surface && control) return "no-system";
  if (system) return "system-only";
  if (surface) return "surface-only";
  if (control) return "control-only";
  return entry.declaredInContent ? "named-only" : "nothing";
}

const COMBINATION_ORDER = new Map(
  COMBINATIONS.map((combination, index) => [combination, index]),
);

export function sortForReading(
  entries: readonly ConnectivityEntry[],
): readonly ConnectivityEntry[] {
  return [...entries].sort(
    (left, right) =>
      (COMBINATION_ORDER.get(combinationOf(left)) ?? 0) -
        (COMBINATION_ORDER.get(combinationOf(right)) ?? 0) ||
      left.entryId.localeCompare(right.entryId),
  );
}

const MANIFEST_HEADING = "## What this document contains";
const MANIFEST_PREFIX = "Entries:";

function renderManifest(
  entries: readonly ConnectivityEntry[],
): readonly string[] {
  const ids =
    entries.length === 0
      ? "none"
      : [...entries]
          .map((entry) => entry.entryId)
          .sort((left, right) => left.localeCompare(right))
          .map((id) => `\`${id}\``)
          .join(", ");
  return [
    MANIFEST_HEADING,
    "",
    "Every subject recorded at the commit above. This document is built from",
    "whichever entry files the rendering branch holds, so if one you filed is",
    "not listed here, this copy came off a branch that did not hold it.",
    "",
    `${MANIFEST_PREFIX} ${ids}`,
    "",
  ];
}

/** The entry ids a rendered map says it contains. */
export function renderedEntryIds(document: string): readonly string[] {
  const ids: string[] = [];
  for (const line of document.split("\n")) {
    if (!line.trim().startsWith(MANIFEST_PREFIX)) continue;
    for (const match of line.matchAll(/`([^`]+)`/g)) {
      const id = match[1];
      if (id !== undefined) ids.push(id);
    }
  }
  return ids;
}

/** What a previously published map carried and this set of entries does not. */
export function droppedEntryIds(
  previousDocument: string,
  entries: readonly ConnectivityEntry[],
): readonly string[] {
  const present = new Set(entries.map((entry) => entry.entryId));
  const dropped = new Set(
    renderedEntryIds(previousDocument).filter((id) => !present.has(id)),
  );
  return [...dropped].sort((left, right) => left.localeCompare(right));
}

const PLAYER_REACH_SENTENCE: Readonly<Record<PlayerReach, string>> = {
  reaches: "A player reaches this.",
  "does-not-reach": "Nothing a player does reaches this.",
  unknown: "Whether a player reaches this has not been measured.",
};

const FOR_THE_READER: readonly string[] = [
  "## How to read this",
  "",
  "Three things are separate, and this game has every combination of them: a",
  "system underneath, a number on a screen, and a control that moves it. Each",
  "entry says which of the three it has, so a reader can see at a glance which",
  "subjects are wiring jobs, which are content jobs, and which are neither",
  "yet.",
  "",
  "The first section is the one to read if you read only one. A subject named",
  "in shipped content with nothing behind the name looks present to every",
  "check we have — the pack loads, the domain resolves, a bill about it files",
  "— and a player can spend a session on it before finding out.",
  "",
  "This is not a list of defects. Something deliberately held shut is recorded",
  "with who held it and what for, because reading it as unfinished invites",
  "somebody to finish it and reverse a decision without knowing they did.",
  "",
  "Every entry names its measurement and the tree it was taken at, so a",
  "reading you doubt can be rechecked on its own rather than costing the",
  "document its credit. An entry the publishing lane has not re-measured is",
  "marked **carried, not re-measured here** — it is the filing lane's reading,",
  "passed on intact.",
  "",
  "Nothing here is a question. The open questions are their own document, and",
  "a gap recorded here does not imply anybody has decided what should fill it.",
  "",
];

function partLine(name: string, part: ConnectivityPart): string {
  return `**${name}.** ${part.present ? "Yes" : "No"} — ${part.detail}`;
}

function renderEntry(entry: ConnectivityEntry): readonly string[] {
  const lines: string[] = [
    `### ${entry.title}`,
    "",
    `measured by ${entry.measuredBy} · recorded ${entry.recordedAt.slice(0, 10)} · \`${entry.entryId}\``,
    "",
    partLine("A system underneath", entry.system),
    "",
    partLine("Something to see", entry.surface),
    "",
    partLine("A control that moves it", entry.control),
    "",
  ];
  if (entry.declaredInContent) {
    lines.push(
      `**Named in shipped content.** ${entry.declaredDetail ?? ""}`.trim(),
      "",
    );
  }
  lines.push(
    `**A player.** ${PLAYER_REACH_SENTENCE[entry.playerReach]} ${entry.playerReachDetail}`,
    "",
  );
  if (!entry.reMeasuredByPublisher) {
    lines.push(
      "**Carried, not re-measured here.** This is the filing lane's",
      "reading, passed on intact.",
      "",
    );
  }
  lines.push("**Measured.**", "");
  for (const measurement of entry.measurements) {
    lines.push(
      `- ${measurement.what} — at ${measurement.at}.`,
      `  ${measurement.found}`,
    );
  }
  lines.push("");
  for (const note of entry.notes ?? []) {
    lines.push(`> ${note}`, "");
  }
  return lines;
}

/** The whole map as one document. */
export function renderConnectivityMap(
  entries: readonly ConnectivityEntry[],
  generatedAt: string,
  renderedFromCommit?: string,
  renderedFromBranch?: string,
): string {
  const ordered = sortForReading(entries);
  const opener = ordered.find((entry) => entry.opensTheDocument !== undefined);
  const named = ordered.filter(
    (entry) => combinationOf(entry) === "named-only",
  ).length;
  const working = ordered.filter(
    (entry) => combinationOf(entry) === "all-three",
  ).length;
  const lines: string[] = [
    "# What reaches what",
    "",
    "The wiring of this game: what has a system underneath it, what a player",
    "can see, and what a player can move. Generated by",
    "`npm run connectivity:map -- render`. Do not edit by hand: each entry is a",
    "file in `docs/connectivity/entries/`, and this document is rebuilt from",
    "them.",
    "",
    `Generated ${generatedAt} · ${ordered.length} subjects · ${working} with all three · ${named} named in content with nothing behind the name` +
      (renderedFromBranch ? ` · branch ${renderedFromBranch}` : "") +
      (renderedFromCommit ? ` · rendered from ${renderedFromCommit}` : ""),
    "",
    ...renderManifest(ordered),
  ];

  if (opener !== undefined) {
    lines.push(
      "## Start here",
      "",
      opener.opensTheDocument ?? "",
      "",
      `It belongs in the band headed "${COMBINATION_HEADINGS[combinationOf(opener)]}",`,
      "and is left out of it below rather than being said twice.",
      "",
      ...renderEntry(opener),
    );
  }

  if (ordered.length === 0) {
    lines.push("Nothing is recorded yet.", "", ...FOR_THE_READER);
    return lines.join("\n");
  }

  for (const combination of COMBINATIONS) {
    const band = ordered.filter(
      (entry) => combinationOf(entry) === combination && entry !== opener,
    );
    if (band.length === 0) continue;
    lines.push(
      `## ${COMBINATION_HEADINGS[combination]}`,
      "",
      COMBINATION_GLOSS[combination],
      "",
    );
    for (const entry of band) lines.push(...renderEntry(entry));
  }

  lines.push(...FOR_THE_READER);
  return lines.join("\n");
}

/** One line per subject, for a lane checking what is already recorded. */
export function summarizeConnectivity(
  entries: readonly ConnectivityEntry[],
): readonly string[] {
  return sortForReading(entries).map(
    (entry) =>
      `${combinationOf(entry)} ${entry.playerReach} ${entry.entryId} — ${entry.title} (${entry.measuredBy})`,
  );
}
