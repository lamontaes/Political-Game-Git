/**
 * Who writes what, and who reads it.
 *
 * The connectivity map (`connectivity-map.ts`) asks three questions of a
 * SUBJECT: is there a system, something to see, something that moves it. This
 * asks one question of a PRODUCER: when it writes, does anything read what it
 * wrote? lamontae, 2026-09-23: "a lot of systems aren't connected. We need to
 * connect these systems." The game is full of producers that run and write
 * real records, and readers that are finished and wait for input, with no
 * line between them: an enacted law that moves nothing, a disaster that kills
 * nobody extra, an ethics finding that touches no vote.
 *
 * Each link is one file under `docs/connectivity/links/`, for the same reason
 * the connectivity map and the research queue are directories: lanes file from
 * their own branches, and a shared document loses an entry to a merge.
 *
 * A missing link is a DEFECT with two owners, one at each end, because the
 * thread that owns the producer and the thread that owns the reader are
 * usually different, and a defect with one named owner is the one the other
 * owner never hears about.
 */

export const PRODUCER_LINK_DIRECTORY = "docs/connectivity/links";

export const PRODUCER_LINK_VERSION = "producer-links/v1";

/**
 * The threads that own code in this project, named as they are in the project
 * chat. A link names the thread, not a person or a session, because sessions
 * are replaced and a thread's name is what the coordinator routes by.
 */
export const OWNING_THREADS = [
  "Wiring between systems",
  "Legislation",
  "People and life",
  "How the world changes",
  "Consequences for corruption",
  "Migration and big social movements",
  "Nationwide government",
  "Every town in America",
  "Relationships",
  "Local crime",
  "Running for office",
] as const;

export type OwningThread = (typeof OWNING_THREADS)[number];

/**
 * Where a missing link stands.
 *
 * `open`: nobody has taken it. `in-flight`: an open pull request builds it,
 * named in `inFlight`, so nobody starts a second one. `handed-off`: a brief went to the owning
 * thread. `needs-research`: the link cannot be built without a number or a
 * rule someone would otherwise invent, and a research question carries it.
 * `closed`: built, and a test that fails without it proves it.
 */
export type LinkState =
  "open" | "in-flight" | "handed-off" | "needs-research" | "closed";

export const LINK_STATES: readonly LinkState[] = [
  "open",
  "in-flight",
  "handed-off",
  "needs-research",
  "closed",
];

export interface LinkEnd {
  /** Path under src/, and the exported function or field, e.g. `simulation/crisis/international.ts#declareInternationalCrisis`. */
  readonly at: string;
  readonly owner: OwningThread;
}

export interface ExistingReader extends LinkEnd {
  /** What this reader does with what was written. */
  readonly reads: string;
}

export interface MissingLink {
  /** What should read it, in a player's terms: "a disaster's dead in the mortality count". */
  readonly reader: string;
  /** The code that would read it, when one exists: the hook point. */
  readonly readerAt?: string;
  readonly readerOwner: OwningThread;
  readonly state: LinkState;
  /** Why it is missing and what closing it takes. */
  readonly detail: string;
  /** For `closed`: the test that fails without the link, by repository path. */
  readonly proofTest?: string;
  /** For `needs-research`: the research question's id under docs/research/requests. */
  readonly researchQuestionId?: string;
  /** For `in-flight`: the pull request that builds it, and its branch. */
  readonly inFlight?: string;
  /** For `handed-off`: when, and what the brief asked for. */
  readonly handedOff?: string;
}

export interface ProducerLinkEntry {
  readonly linkVersion: string;
  /** Kebab-case, unique, and the entry's filename. */
  readonly linkId: string;
  /** The producer, named as a player would name it. */
  readonly title: string;
  readonly producer: LinkEnd & {
    /** What it writes, concretely: the record, the field, the event. */
    readonly writes: string;
    /** Whether anything in an ordinary save actually runs it. */
    readonly runsInPlay: boolean;
    readonly runsDetail: string;
  };
  /** Non-test readers found, each with file and line. Empty is an answer. */
  readonly readers: readonly ExistingReader[];
  /** What should read it and does not. */
  readonly missing: readonly MissingLink[];
  /** The tree the readers were counted at. */
  readonly measuredAt: string;
  readonly recordedAt: string;
}

export interface LinkFinding {
  readonly linkId: string;
  readonly code: string;
  readonly message: string;
}

function nonEmpty(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isOwner(value: unknown): value is OwningThread {
  return (OWNING_THREADS as readonly unknown[]).includes(value);
}

/**
 * Refuse a link nobody could act on.
 *
 * `exists` answers whether a repository path exists, so the validator can
 * refuse a closed link whose proof test is missing and a research-bound link
 * whose question was never filed. A closed link with no test is the exact
 * thing this map exists to stop: a wire somebody says is connected.
 */
export function validateProducerLinks(
  entries: readonly ProducerLinkEntry[],
  exists: (repositoryPath: string) => boolean,
): readonly LinkFinding[] {
  const findings: LinkFinding[] = [];
  const seen = new Set<string>();
  for (const entry of entries) {
    const id = nonEmpty(entry.linkId) ? entry.linkId : "(no id)";
    const fail = (code: string, message: string) =>
      findings.push({ linkId: id, code, message });

    if (entry.linkVersion !== PRODUCER_LINK_VERSION) {
      fail("unknown-version", `linkVersion is not ${PRODUCER_LINK_VERSION}.`);
    }
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(String(entry.linkId))) {
      fail("bad-id", `linkId '${String(entry.linkId)}' is not kebab-case.`);
    } else if (seen.has(entry.linkId)) {
      fail("duplicate-id", `'${entry.linkId}' is recorded twice.`);
    }
    seen.add(entry.linkId);

    for (const [field, value] of [
      ["title", entry.title],
      ["measuredAt", entry.measuredAt],
      ["recordedAt", entry.recordedAt],
      ["producer.at", entry.producer?.at],
      ["producer.writes", entry.producer?.writes],
      ["producer.runsDetail", entry.producer?.runsDetail],
    ] as const) {
      if (!nonEmpty(value)) fail(`missing-${field}`, `${field} is required.`);
    }
    if (!isOwner(entry.producer?.owner)) {
      fail(
        "unknown-owner",
        `producer.owner '${String(entry.producer?.owner)}' is not a thread in OWNING_THREADS.`,
      );
    }
    if (!Array.isArray(entry.readers) || !Array.isArray(entry.missing)) {
      fail("missing-lists", "readers and missing are both required lists.");
      continue;
    }
    for (const reader of entry.readers) {
      if (!nonEmpty(reader.at) || !nonEmpty(reader.reads)) {
        fail("bad-reader", "A reader needs `at` and `reads`.");
      }
      if (!isOwner(reader.owner)) {
        fail(
          "unknown-owner",
          `reader owner '${String(reader.owner)}' is unknown.`,
        );
      }
    }
    if (entry.readers.length === 0 && entry.missing.length === 0) {
      fail(
        "nothing-recorded",
        "A producer with no readers and no missing link says nothing. Record what should read it.",
      );
    }
    for (const link of entry.missing) {
      if (!nonEmpty(link.reader) || !nonEmpty(link.detail)) {
        fail("bad-missing", "A missing link needs `reader` and `detail`.");
      }
      if (!isOwner(link.readerOwner)) {
        fail(
          "unknown-owner",
          `readerOwner '${String(link.readerOwner)}' is unknown.`,
        );
      }
      if (!LINK_STATES.includes(link.state)) {
        fail(
          "bad-state",
          `state '${String(link.state)}' is not one of ${LINK_STATES.join(", ")}.`,
        );
      }
      if (link.state === "closed") {
        if (!nonEmpty(link.proofTest)) {
          fail(
            "closed-without-proof",
            `'${link.reader}' is marked closed with no proofTest. A link is closed when a test that fails without it exists.`,
          );
        } else if (!exists(link.proofTest)) {
          fail(
            "proof-missing",
            `'${link.reader}' cites ${link.proofTest}, which is not in this tree.`,
          );
        }
      }
      if (link.state === "needs-research") {
        const question = `docs/research/requests/${String(link.researchQuestionId)}.json`;
        if (!nonEmpty(link.researchQuestionId)) {
          fail(
            "research-without-question",
            `'${link.reader}' waits on research but names no question. Unfiled is not asked.`,
          );
        } else if (!exists(question)) {
          fail(
            "question-missing",
            `'${link.reader}' cites ${question}, which is not in this tree.`,
          );
        }
      }
      if (link.state === "in-flight" && !nonEmpty(link.inFlight)) {
        fail(
          "in-flight-unnamed",
          `'${link.reader}' is marked in flight without naming the pull request.`,
        );
      }
      if (link.state === "handed-off" && !nonEmpty(link.handedOff)) {
        fail(
          "handoff-unrecorded",
          `'${link.reader}' is marked handed off without saying when or what was asked.`,
        );
      }
    }
  }
  return findings;
}

const STATE_WORDS: Record<LinkState, string> = {
  open: "open with nobody on it",
  "in-flight": "being built in an open pull request",
  "handed-off": "handed to its owner",
  "needs-research": "waiting on research",
  closed: "closed",
};

const ISO_DATE = /\b(\d{4})-(\d{2})-(\d{2})(?:T[\d:.]+Z)?\b/g;
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/** A date as a reader says it: the owner reads month, day, year. */
function humanDate(_match: string, year: string, month: string, day: string) {
  return `${MONTHS[Number(month) - 1]} ${Number(day)}, ${year}`;
}

/** One document: producers first, then the open defects grouped by owning thread. */
export function renderProducerLinks(
  entries: readonly ProducerLinkEntry[],
  header: { readonly generatedAt: string; readonly head: string },
): string {
  const sorted = [...entries].sort((a, b) => a.title.localeCompare(b.title));
  const allMissing = sorted.flatMap((entry) =>
    entry.missing.map((link) => ({ entry, link })),
  );
  const counts = LINK_STATES.map(
    (state) =>
      `${allMissing.filter(({ link }) => link.state === state).length} ${STATE_WORDS[state]}`,
  );
  const idle = sorted.filter((entry) => !entry.producer.runsInPlay).length;
  const lines: string[] = [
    "# Who writes what, and who reads it",
    "",
    "Every system in the game that writes something, what it writes, what reads it, and what should read it and does not. Each missing link is a defect, and each one names the thread that owns each end.",
    "",
    `${sorted.length} producers, and ${idle} of them never run in an ordinary game. ${allMissing.length} missing links: ${counts.join("; ")}.`,
    "",
    "Nothing here waits on the owner. An open link needs a thread to take it; the others are already with a thread or with research.",
    "",
    "## Open defects, by the thread that owns the reading end",
    "",
  ];
  const owners = [
    ...new Set(allMissing.map(({ link }) => link.readerOwner)),
  ].sort();
  for (const owner of owners) {
    const rows = allMissing.filter(
      ({ link }) => link.readerOwner === owner && link.state !== "closed",
    );
    if (rows.length === 0) continue;
    lines.push(`### ${owner}`, "");
    rows.forEach(({ entry, link }, index) => {
      lines.push(
        `${index + 1}. **${link.reader}.** From ${entry.title.toLowerCase()} (producer owned by ${entry.producer.owner}). ${STATE_WORDS[link.state]}.`,
      );
    });
    lines.push("");
  }
  lines.push("## Every producer", "");
  for (const entry of sorted) {
    lines.push(`### ${entry.title}`, "");
    lines.push(
      `\`${entry.linkId}\` · counted at ${entry.measuredAt} · producer owned by ${entry.producer.owner}`,
      "",
      `**Writes.** ${entry.producer.writes} (\`${entry.producer.at}\`)`,
      "",
      `**Runs in an ordinary save.** ${entry.producer.runsInPlay ? "Yes" : "No"}. ${entry.producer.runsDetail}`,
      "",
    );
    if (entry.readers.length === 0) {
      lines.push("**Read by.** Nothing outside tests.", "");
    } else {
      lines.push("**Read by.**", "");
      entry.readers.forEach((reader, index) =>
        lines.push(
          `${index + 1}. \`${reader.at}\` (${reader.owner}): ${reader.reads}`,
        ),
      );
      lines.push("");
    }
    if (entry.missing.length > 0) {
      lines.push("**Should be read by, and is not.**", "");
      entry.missing.forEach((link, index) => {
        const extras = [
          link.readerAt ? `hook: \`${link.readerAt}\`` : undefined,
          link.researchQuestionId
            ? `question: \`${link.researchQuestionId}\``
            : undefined,
          link.proofTest ? `proved by \`${link.proofTest}\`` : undefined,
          link.inFlight ? `in flight: ${link.inFlight}` : undefined,
          link.handedOff ? `handed off: ${link.handedOff}` : undefined,
        ].filter(Boolean);
        lines.push(
          `${index + 1}. **${link.reader}** (${link.readerOwner}; ${STATE_WORDS[link.state]}). ${link.detail}${extras.length ? ` (${extras.join("; ")})` : ""}`,
        );
      });
      lines.push("");
    }
  }
  lines.push(
    "## How this document is made",
    "",
    `Rendered ${header.generatedAt} from commit ${header.head} by \`npm run connectivity:links -- render --write\`, one entry per file in \`${PRODUCER_LINK_DIRECTORY}/\`. Do not edit it by hand. Each producer was counted at the commit its line names, which can be older than the render.`,
    "",
  );
  return `${lines.join("\n").trimEnd().replace(ISO_DATE, humanDate)}\n`;
}
