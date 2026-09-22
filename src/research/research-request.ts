/**
 * ANY THREAD CAN SAY SOMETHING NEEDS RESEARCHING.
 *
 * Work in this repository stops on questions no amount of reading the code can
 * answer: what a state's constitution actually says about a seat, how a county
 * treasurer is selected, what a region's streets look like. Those questions
 * currently live in whichever thread hit them, which means they are answered
 * late, answered twice, or not at all.
 *
 * This is the front door for them. A record is a QUESTION, not an answer and
 * not a task: strict about the five things the asker genuinely knows — what
 * needs researching, why it blocks or shapes the work, which lane is asking,
 * what a usable answer would look like, and what has already been checked —
 * and silent about everything only the researcher can establish. Requiring
 * more is how a real question becomes a sentence in a report nobody reads.
 *
 * The consumers are people: lamontae and ChatGPT. So a record is written to be
 * read aloud, not parsed. The validator's whole job is to refuse a record that
 * would send the researcher back to the asker with a clarifying question.
 *
 * WHY ONE FILE PER RECORD. These land in `docs/research/requests/`, one JSON
 * file named for the question id. Threads file concurrently from separate
 * branches; a shared list would conflict on every second write and the
 * conflict would be resolved by whoever merged last, silently dropping a
 * question. A new file collides with nothing. The directory IS the queue.
 *
 * This mirrors `src/authoring/art-request-intake.ts` on purpose: a thread that
 * has filed one kind of request already knows how to file the other.
 *
 * No Node imports here. The filesystem half is
 * `scripts/research/request-store.ts`, and the CLI is
 * `scripts/research/cli-research-request.ts`.
 */

export const RESEARCH_REQUEST_VERSION = "research-request/v1" as const;

/** Where research questions live, relative to the repository root. */
export const RESEARCH_REQUEST_DIRECTORY = "docs/research/requests";

/**
 * What the answer would change.
 *
 * This is not priority, and the two come apart: a question that merely shapes
 * a design can be the most urgent thing in the project, and a question that
 * blocks one thread's afternoon can wait. Both are recorded because they are
 * read by different people for different reasons — `impact` tells the
 * researcher what happens if they answer it wrong, `priority` tells them what
 * to pick up first.
 */
export type ResearchImpact =
  /** A thread cannot finish the work it is on until this is answered. */
  | "blocks-work"
  /** Work can continue, but a wrong assumption here would have to be undone. */
  | "shapes-design"
  /** Wanted for correctness or texture; nothing is waiting on it. */
  | "background";

export const RESEARCH_IMPACTS: readonly ResearchImpact[] = [
  "blocks-work",
  "shapes-design",
  "background",
];

export type ResearchPriority = "P0" | "P1" | "P2";

export const RESEARCH_PRIORITIES: readonly ResearchPriority[] = [
  "P0",
  "P1",
  "P2",
];

/**
 * Something already looked at, and what it did not settle.
 *
 * The second half is the part that saves the researcher an hour. "I read the
 * Kentucky constitution" is not useful on its own; "I read the Kentucky
 * constitution, which delegates the number of seats to statute and therefore
 * does not answer this" is.
 */
export interface ResearchSourceChecked {
  /** What was read: a URL, a statute citation, a repository path, a document. */
  readonly source: string;
  /** Why it did not answer the question. Never blank. */
  readonly whatItDidNotSettle: string;
}

/**
 * The answer, once there is one.
 *
 * A record with an answer is closed. It stays in the directory as history so
 * the same question is not asked again in six weeks, and `openRequests` stops
 * listing it.
 */
export interface ResearchAnswer {
  /** The finding, in enough detail to act on without opening the sources. */
  readonly summary: string;
  /** Where it came from. At least one, because an unsourced answer is a guess. */
  readonly sources: readonly string[];
  /** Who answered it. */
  readonly answeredBy: string;
  /** ISO 8601 instant. */
  readonly answeredAt: string;
  /** What the answer does not cover, when it does not cover everything. */
  readonly stillOpen?: string;
}

/**
 * A position the asker can already see, offered so the researcher argues with
 * something rather than starting from a blank page.
 *
 * A candidate answer is NOT a recommendation unless it says so. Where the
 * question is a product judgement the asker has no standing to make, every
 * candidate is filed with `recommended: false` on purpose, and the validator
 * allows that: "here are two readings, you choose" is a legitimate brief.
 * What it does not allow is two candidates both claiming to be recommended.
 */
export interface ResearchCandidateAnswer {
  /** A few words naming the position, as it would be referred to in a reply. */
  readonly label: string;
  /** The position itself, stated as an answer to the question. */
  readonly position: string;
  /** Whether the asker is recommending it. At most one candidate may be. */
  readonly recommended: boolean;
  /** The strongest case for it, in the asker's own reading. */
  readonly argumentFor?: string;
  /** The cost of choosing it. Present means the asker looked for one. */
  readonly argumentAgainst?: string;
}

export interface ResearchRequestRecord {
  readonly requestVersion: typeof RESEARCH_REQUEST_VERSION;
  /** A stable semantic slug. Never a seed, a hash or a single word. */
  readonly questionId: string;
  /** One line, as a person would say it in a meeting. */
  readonly title: string;
  /** What needs researching, stated as a question somebody could go and answer. */
  readonly question: string;
  /** Why it blocks or shapes the work. Not a restatement of the question. */
  readonly whyItMatters: string;
  readonly impact: ResearchImpact;
  /** The lane asking: art and client delivery, nationwide government, and so on. */
  readonly lane: string;
  /**
   * What a usable answer looks like, so the researcher knows when to stop.
   *
   * "The statute citation and the number it sets" is usable. "Information about
   * Kentucky" is not, and the validator says so.
   */
  readonly usableAnswer: string;
  /**
   * What has already been checked, and what each did not settle.
   *
   * An empty array is a legitimate answer — the asker may have checked nothing
   * — but it has to be said out loud rather than left off, so the researcher
   * knows the difference between "nothing was checked" and "the asker forgot
   * to say".
   */
  readonly sourcesChecked: readonly ResearchSourceChecked[];
  /**
   * Positions the asker can already see, for the researcher to react to.
   *
   * Optional, because many questions genuinely have no candidate the asker can
   * name. When present it is rendered under the question, so a reader meets the
   * readings before the evidence rather than after.
   */
  readonly candidateAnswers?: readonly ResearchCandidateAnswer[];
  /** The thread, session or person filing this. Never blank. */
  readonly requestedBy: string;
  /** ISO 8601 instant the question was filed. */
  readonly filedAt: string;
  readonly priority: ResearchPriority;
  /** Anything else worth knowing: constraints, a hunch, a related question. */
  readonly notes?: readonly string[];
  /** Question ids this one depends on or follows from. */
  readonly relatedQuestionIds?: readonly string[];
  /** Present means answered. The record stays as history and is not asked again. */
  readonly answer?: ResearchAnswer;
}

export type ResearchRequestFindingCode =
  | "unknown-request-version"
  | "seed-shaped-question-id"
  | "non-semantic-question-id"
  | "duplicate-question-id"
  | "missing-title"
  | "missing-question"
  | "question-restates-title"
  | "missing-why-it-matters"
  | "why-restates-question"
  | "missing-usable-answer"
  | "usable-answer-restates-question"
  | "vague-usable-answer"
  | "missing-lane"
  | "missing-requested-by"
  | "missing-sources-checked"
  | "blank-source-checked"
  | "source-without-gap"
  | "no-sources-checked"
  | "blank-candidate-answer"
  | "candidate-without-position"
  | "several-recommended-candidates"
  | "invalid-filed-at"
  | "unknown-impact"
  | "unknown-priority"
  | "answer-without-sources"
  | "invalid-answered-at"
  | "unknown-related-question";

export interface ResearchRequestFinding {
  readonly code: ResearchRequestFindingCode;
  readonly severity: "error" | "warning";
  readonly questionId: string;
  readonly message: string;
}

export interface ResearchRequestValidation {
  readonly valid: boolean;
  readonly findings: readonly ResearchRequestFinding[];
}

const SEED_SHAPED = /^(?:seed[-_]?)?\d{4,}$/i;
const DIGEST_SHAPED = /^[0-9a-f]{16,}$/i;
const SEMANTIC_SLUG = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)+$/;

/**
 * Phrases that describe a topic rather than an answer.
 *
 * A `usableAnswer` of "information about county treasurers" cannot tell a
 * researcher when they are finished, so it is not an acceptance criterion. The
 * list is short and literal on purpose: it catches the specific way this field
 * goes wrong, and it does not try to judge prose.
 */
const VAGUE_ANSWER_OPENERS = [
  "information about",
  "information on",
  "details about",
  "details on",
  "anything about",
  "anything on",
  "research on",
  "research about",
  "more about",
  "more on",
  "context about",
  "context on",
];

function normalize(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function isIsoInstant(value: unknown): boolean {
  return (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(
      value,
    ) &&
    !Number.isNaN(Date.parse(value))
  );
}

/**
 * Validate one batch of research questions.
 *
 * Every rule is about one thing: can a researcher act on this record without
 * coming back to ask the author what they meant? Nothing here judges whether
 * the question is worth asking — that is the reader's call, not a validator's.
 */
export function validateResearchRequests(
  records: readonly ResearchRequestRecord[],
): ResearchRequestValidation {
  const findings: ResearchRequestFinding[] = [];
  const seen = new Set<string>();
  const allIds = new Set(records.map((record) => record.questionId));

  const error = (
    code: ResearchRequestFindingCode,
    questionId: string,
    message: string,
  ) => findings.push({ code, severity: "error", questionId, message });
  const warn = (
    code: ResearchRequestFindingCode,
    questionId: string,
    message: string,
  ) => findings.push({ code, severity: "warning", questionId, message });

  for (const record of records) {
    const { questionId } = record;

    if (record.requestVersion !== RESEARCH_REQUEST_VERSION) {
      error(
        "unknown-request-version",
        questionId,
        `Request version '${String(record.requestVersion)}' is not ${RESEARCH_REQUEST_VERSION}.`,
      );
    }

    if (seen.has(questionId)) {
      error(
        "duplicate-question-id",
        questionId,
        `Two questions share the id '${questionId}'. An id is how a question is reconciled; two of them is two questions.`,
      );
    }
    seen.add(questionId);

    if (SEED_SHAPED.test(questionId) || DIGEST_SHAPED.test(questionId)) {
      error(
        "seed-shaped-question-id",
        questionId,
        `'${questionId}' reads as a seed or a digest. An id is what somebody types when they want to find this again.`,
      );
    } else if (!SEMANTIC_SLUG.test(questionId)) {
      error(
        "non-semantic-question-id",
        questionId,
        `'${questionId}' is not a lowercase hyphenated slug of at least two words. A one-word id is not searchable and will collide.`,
      );
    }

    if (!record.title?.trim()) {
      error("missing-title", questionId, "A question needs a one-line title.");
    }

    if (!record.question?.trim()) {
      error(
        "missing-question",
        questionId,
        "A record with no question is a note, not a research request.",
      );
    } else if (
      record.title?.trim() &&
      normalize(record.question) === normalize(record.title)
    ) {
      warn(
        "question-restates-title",
        questionId,
        "The question repeats the title word for word, so it adds nothing a researcher can use. Say what specifically is unknown.",
      );
    }

    if (!record.whyItMatters?.trim()) {
      error(
        "missing-why-it-matters",
        questionId,
        "Say what the answer changes. Without it this cannot be ranked against the other open questions.",
      );
    } else if (
      record.question?.trim() &&
      normalize(record.whyItMatters) === normalize(record.question)
    ) {
      error(
        "why-restates-question",
        questionId,
        "Why it matters repeats the question. The two are different: one is what is unknown, the other is what goes wrong while it stays unknown.",
      );
    }

    if (!record.usableAnswer?.trim()) {
      error(
        "missing-usable-answer",
        questionId,
        "Say what a usable answer looks like, so the researcher knows when they are done.",
      );
    } else {
      const usable = normalize(record.usableAnswer);
      if (record.question?.trim() && usable === normalize(record.question)) {
        error(
          "usable-answer-restates-question",
          questionId,
          "A usable answer that repeats the question is not an acceptance criterion.",
        );
      } else if (
        VAGUE_ANSWER_OPENERS.some((opener) => usable.startsWith(opener))
      ) {
        error(
          "vague-usable-answer",
          questionId,
          `'${record.usableAnswer.trim()}' names a topic, not an answer. Say what the researcher should come back holding — a citation, a number, a named rule, a list.`,
        );
      }
    }

    if (!record.lane?.trim()) {
      error(
        "missing-lane",
        questionId,
        "Name the lane asking, so the answer goes back to somebody.",
      );
    }

    if (!record.requestedBy?.trim()) {
      error(
        "missing-requested-by",
        questionId,
        "Name the thread, session or person filing this.",
      );
    }

    if (!Array.isArray(record.sourcesChecked)) {
      error(
        "missing-sources-checked",
        questionId,
        "sourcesChecked must be present, even as an empty array. 'Nothing was checked' and 'the asker forgot to say' are different facts.",
      );
    } else {
      if (record.sourcesChecked.length === 0) {
        warn(
          "no-sources-checked",
          questionId,
          "Nothing has been checked yet. That is allowed, and it means the researcher starts from zero.",
        );
      }
      for (const checked of record.sourcesChecked) {
        if (!checked?.source?.trim()) {
          error(
            "blank-source-checked",
            questionId,
            "A checked source with no name cannot be re-read by anyone else.",
          );
        } else if (!checked.whatItDidNotSettle?.trim()) {
          error(
            "source-without-gap",
            questionId,
            `'${checked.source.trim()}' is listed as checked but not what it failed to settle. That sentence is the part that saves the researcher the same hour.`,
          );
        }
      }
    }

    const candidates = record.candidateAnswers ?? [];
    for (const candidate of candidates) {
      if (!candidate?.label?.trim()) {
        error(
          "blank-candidate-answer",
          questionId,
          "A candidate answer with no label cannot be referred to in a reply, which is the whole point of offering one.",
        );
      } else if (!candidate.position?.trim()) {
        error(
          "candidate-without-position",
          questionId,
          `Candidate '${candidate.label.trim()}' has a label and no position. A name is not something a researcher can argue with.`,
        );
      }
    }
    const recommended = candidates.filter((candidate) => candidate.recommended);
    if (recommended.length > 1) {
      error(
        "several-recommended-candidates",
        questionId,
        `${recommended.length} candidates are marked recommended (${recommended.map((candidate) => candidate.label).join(", ")}). Recommending everything recommends nothing.`,
      );
    }

    if (!isIsoInstant(record.filedAt)) {
      error(
        "invalid-filed-at",
        questionId,
        `filedAt '${String(record.filedAt)}' is not an ISO 8601 instant.`,
      );
    }

    if (!RESEARCH_IMPACTS.includes(record.impact)) {
      error(
        "unknown-impact",
        questionId,
        `Impact '${String(record.impact)}' is not one of ${RESEARCH_IMPACTS.join(", ")}.`,
      );
    }

    if (!RESEARCH_PRIORITIES.includes(record.priority)) {
      error(
        "unknown-priority",
        questionId,
        `Priority '${String(record.priority)}' is not one of ${RESEARCH_PRIORITIES.join(", ")}.`,
      );
    }

    for (const related of record.relatedQuestionIds ?? []) {
      if (!allIds.has(related)) {
        warn(
          "unknown-related-question",
          questionId,
          `Related question '${related}' is not in the queue. It may not be filed yet, or the id may be wrong.`,
        );
      }
    }

    if (record.answer) {
      if (
        !Array.isArray(record.answer.sources) ||
        // A source that is not a string is refused rather than thrown on: a
        // malformed record should get the message this queue exists to give,
        // not a stack trace that tells the filer nothing about what to fix.
        record.answer.sources.filter(
          (source) => typeof source === "string" && source.trim() !== "",
        ).length === 0
      ) {
        error(
          "answer-without-sources",
          questionId,
          "An answer with no usable sources is a guess, and this queue exists so nobody has to guess twice. Each source is a string saying what establishes the answer.",
        );
      }
      if (!isIsoInstant(record.answer.answeredAt)) {
        error(
          "invalid-answered-at",
          questionId,
          `answeredAt '${String(record.answer.answeredAt)}' is not an ISO 8601 instant.`,
        );
      }
    }
  }

  return {
    valid: findings.every((finding) => finding.severity !== "error"),
    findings,
  };
}

const IMPACT_ORDER: Readonly<Record<ResearchImpact, number>> = {
  "blocks-work": 0,
  "shapes-design": 1,
  background: 2,
};

/** Still waiting on somebody. */
export function openRequests(
  records: readonly ResearchRequestRecord[],
): readonly ResearchRequestRecord[] {
  return sortForReading(records.filter((record) => !record.answer));
}

export function answeredRequests(
  records: readonly ResearchRequestRecord[],
): readonly ResearchRequestRecord[] {
  return [...records]
    .filter((record) => record.answer)
    .sort((left, right) =>
      (right.answer?.answeredAt ?? "").localeCompare(
        left.answer?.answeredAt ?? "",
      ),
    );
}

/**
 * Reading order: what is blocking somebody, highest priority, oldest first.
 *
 * Oldest first within a band on purpose — a question that has been open for a
 * week and one filed this morning are not equally fresh, and the older one is
 * the one somebody has been working around.
 */
export function sortForReading(
  records: readonly ResearchRequestRecord[],
): readonly ResearchRequestRecord[] {
  return [...records].sort(
    (left, right) =>
      IMPACT_ORDER[left.impact] - IMPACT_ORDER[right.impact] ||
      left.priority.localeCompare(right.priority) ||
      left.filedAt.localeCompare(right.filedAt) ||
      left.questionId.localeCompare(right.questionId),
  );
}

const IMPACT_HEADINGS: Readonly<Record<ResearchImpact, string>> = {
  "blocks-work": "Blocking work now",
  "shapes-design": "Shaping a design decision",
  background: "Background",
};

const MANIFEST_HEADING = "## What this document contains";
const MANIFEST_OPEN_PREFIX = "Open:";
const MANIFEST_ANSWERED_PREFIX = "Answered:";

/**
 * Every question id this copy carries, open and answered, on the page.
 *
 * Without it the header is the only thing a reader has, and a header is a
 * count: a render produced on a branch holding two thirds of the queue looks
 * exactly like a complete one, and publishing it deletes the rest from the
 * copy people actually read. Ids make a drop visible to a reader and checkable
 * by a machine — see `droppedQuestionIds`, which is what the renderer uses to
 * refuse rather than to hope somebody notices.
 *
 * Answered ids are listed too. An answered question is still the record of an
 * answer, and dropping one loses the answer as surely as dropping an open one
 * loses the question.
 */
function renderContentsManifest(
  records: readonly ResearchRequestRecord[],
): readonly string[] {
  const open = openRequests(records).map((record) => record.questionId);
  const answered = answeredRequests(records).map((record) => record.questionId);
  const asList = (ids: readonly string[]): string =>
    ids.length === 0
      ? "none"
      : [...ids]
          .sort((left, right) => left.localeCompare(right))
          .map((id) => `\`${id}\``)
          .join(", ");
  return [
    MANIFEST_HEADING,
    "",
    "Every question in the queue at the commit above, so that a reader can see",
    "a missing one rather than trust a count. If a question you filed is not",
    "listed here, this copy came off a branch that did not hold it.",
    "",
    `${MANIFEST_OPEN_PREFIX} ${asList(open)}`,
    "",
    `${MANIFEST_ANSWERED_PREFIX} ${asList(answered)}`,
    "",
  ];
}

/**
 * The question ids a rendered document says it contains.
 *
 * Reads the manifest back off the page rather than out of a sidecar file,
 * because the page is the thing that travels: the copy in Drive is the one a
 * drop would happen to, and it has to be checkable on its own.
 */
export function renderedQuestionIds(document: string): readonly string[] {
  const ids: string[] = [];
  for (const line of document.split("\n")) {
    const trimmed = line.trim();
    if (
      !trimmed.startsWith(MANIFEST_OPEN_PREFIX) &&
      !trimmed.startsWith(MANIFEST_ANSWERED_PREFIX)
    ) {
      continue;
    }
    for (const match of trimmed.matchAll(/`([^`]+)`/g)) {
      const id = match[1];
      if (id !== undefined) ids.push(id);
    }
  }
  return ids;
}

/**
 * What a previously published document carried and this set of records does
 * not — in reading order, sorted, deduplicated.
 *
 * A non-empty result means publishing this render would remove a question
 * somebody filed from the copy people read, which has nearly happened twice.
 * It is not by itself an error: a record can be deliberately withdrawn. It is
 * something a human has to say yes to, which is why this returns ids rather
 * than throwing.
 */
export function droppedQuestionIds(
  previousDocument: string,
  records: readonly ResearchRequestRecord[],
): readonly string[] {
  const present = new Set(records.map((record) => record.questionId));
  const dropped = new Set(
    renderedQuestionIds(previousDocument).filter((id) => !present.has(id)),
  );
  return [...dropped].sort((left, right) => left.localeCompare(right));
}

/**
 * The whole open queue as one document.
 *
 * This is what gets handed to somebody who is going to go and answer these, so
 * it is written for reading start to finish rather than for scanning a table:
 * each question carries its own why, its own acceptance criterion and what has
 * already been ruled out, because a researcher working through it should never
 * have to come back here for context.
 */
export function renderOpenQuestions(
  records: readonly ResearchRequestRecord[],
  generatedAt: string,
  /**
   * The commit this was rendered from. A copy of this document travels outside
   * the repository — to Drive, where the people answering these actually read
   * it — so it has to say for itself whether it is current. A reader with no
   * commit cannot tell a fresh copy from a stale one.
   */
  renderedFromCommit?: string,
  /**
   * The branch it was rendered from, which matters more than the commit. This
   * document is mechanically a function of whichever request files the
   * rendering checkout happens to hold, so any branch can produce a copy that
   * is short, complete-looking and stamped with an authoritative count. Naming
   * the branch is what lets a reader ask whether that branch was the one
   * holding every question.
   */
  renderedFromBranch?: string,
): string {
  const open = openRequests(records);
  const lines: string[] = [
    "# Open research questions",
    "",
    "Generated by `npm run research:request -- render`. Do not edit by hand:",
    "each question is a file in `docs/research/requests/`, and this document is",
    "rebuilt from them.",
    "",
    `Generated ${generatedAt} · ${open.length} open · ${records.length - open.length} answered` +
      (renderedFromBranch ? ` · branch ${renderedFromBranch}` : "") +
      (renderedFromCommit ? ` · rendered from ${renderedFromCommit}` : ""),
    "",
    ...renderContentsManifest(records),
  ];

  if (open.length === 0) {
    lines.push(
      "Nothing is open. Every filed question has an answer on it.",
      "",
      ...FOR_THE_READER,
    );
    return lines.join("\n");
  }

  for (const impact of RESEARCH_IMPACTS) {
    const band = open.filter((record) => record.impact === impact);
    if (band.length === 0) continue;
    lines.push(`## ${IMPACT_HEADINGS[impact]}`, "");
    for (const record of band) {
      lines.push(
        `### ${record.title}`,
        "",
        `**${record.priority}** · asked by ${record.lane} (${record.requestedBy}) · filed ${record.filedAt.slice(0, 10)} · \`${record.questionId}\``,
        "",
        `**The question.** ${record.question}`,
        "",
        `**Why it matters.** ${record.whyItMatters}`,
        "",
        `**A usable answer.** ${record.usableAnswer}`,
        "",
      );
      const candidates = record.candidateAnswers ?? [];
      if (candidates.length > 0) {
        const anyRecommended = candidates.some(
          (candidate) => candidate.recommended,
        );
        lines.push(
          anyRecommended
            ? "**Candidate answers.** The recommended one is marked."
            : "**Candidate answers.** None is recommended; the choice is the reader's.",
          "",
        );
        for (const candidate of candidates) {
          lines.push(
            `- **${candidate.label}**${candidate.recommended ? " — _recommended_" : ""}. ${candidate.position}`,
          );
          if (candidate.argumentFor?.trim()) {
            lines.push(`  - For: ${candidate.argumentFor.trim()}`);
          }
          if (candidate.argumentAgainst?.trim()) {
            lines.push(`  - Against: ${candidate.argumentAgainst.trim()}`);
          }
        }
        lines.push("");
      }
      if (record.sourcesChecked.length > 0) {
        lines.push("**Already checked.**", "");
        for (const checked of record.sourcesChecked) {
          lines.push(`- ${checked.source} — ${checked.whatItDidNotSettle}`);
        }
        lines.push("");
      } else {
        lines.push("**Already checked.** Nothing yet.", "");
      }
      for (const note of record.notes ?? []) {
        lines.push(`> ${note}`, "");
      }
      if ((record.relatedQuestionIds ?? []).length > 0) {
        lines.push(
          `Related: ${(record.relatedQuestionIds ?? []).map((id) => `\`${id}\``).join(", ")}`,
          "",
        );
      }
    }
  }

  lines.push(...FOR_THE_READER);
  return lines.join("\n");
}

/**
 * The closing note every render carries, addressed to whoever answers these.
 *
 * It lives here rather than being typed into the upload, because the copy that
 * travels to Drive is a render and a render is a copy. A sentence written
 * straight into the upload never reaches this repository, and the next render
 * drops it without saying so — which is exactly how a published document and
 * its source diverge inside an hour.
 */
const FOR_THE_READER: readonly string[] = [
  // Three dashes, not more: prettier normalises a longer rule and the rendered
  // document is format-checked like any other file in this repository.
  "---",
  "",
  "## For whoever is answering these",
  "",
  "A question belongs here if no explicit research has been done on it. That is",
  "the owner's instruction and it is wider than the test this queue used to",
  "apply, which asked whether a question was bulky enough to be worth handing",
  "over. So expect this document to grow, and expect more of it to be judgement",
  "than citation: design questions belong here too, not only factual surveys.",
  "",
  'Two kinds of answer are worth as much as a filled-in table. "It depends, and',
  'here is what it depends on" is a real answer to a design question. So is "I',
  'checked and could not establish this", with what was checked — which beats a',
  "plausible guess, because a guess silently disables the refusal that would",
  "otherwise have told somebody the fact was missing.",
  "",
  "Replies go in **CHATGPT REPLIES TO CLAUDE — CURRENT**, or the Art Bench",
  "exchange when the subject is art. A reply left as a comment on this document",
  "never arrives: our Drive connector cannot read comments at all, on any",
  "document, so the channel reads as silent while you are answering.",
  "",
  "Superseded renders of this document are renamed and archived rather than",
  "binned, so anything left on an older copy survives.",
  "",
];

/** One line per open question, for a terminal. */
export function summarizeOpenQuestions(
  records: readonly ResearchRequestRecord[],
): readonly string[] {
  return openRequests(records).map(
    (record) =>
      `${record.priority} ${record.impact} ${record.questionId} — ${record.title} (${record.lane})`,
  );
}
