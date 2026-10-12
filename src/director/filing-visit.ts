/**
 * The filing visit (golden path step 3): the player at the office that takes
 * filings, where that place's records say it is. The clerk asks which office,
 * states the deadline and the fee or signatures from the record, explains each
 * rule that stops the filing, and otherwise offers the ways to file. The
 * records are GOV's (`openContests`, `filingOfficeFor`, `checkEligibility`),
 * passed in as plain data; the filing itself is GOV's `fileCandidacy`.
 */
import { P } from "../core2/parameters";
import type { CoreState, PersonId } from "../core2/types";
import visitJson from "./data/filing-visit.json" with { type: "json" };
import { renderLine, type Fact, type Variant } from "./render";

interface VisitWords {
  version: string;
  stopgapId: string;
  greet: Variant[];
  pick: Variant[];
  terms: Variant[];
  rules: Readonly<Record<string, Variant[]>>;
  accept: Variant[];
  payFee: Variant[];
  gather: Variant[];
}
export const FILING_VISIT_WORDS = visitJson as VisitWords;

export interface FilingContest {
  id: string;
  title: string;
  filingDeadline: string;
  sourceIds: readonly string[];
}
/** GOV's `FilingRequirements`. */
export interface FilingTerms {
  filedWith: string;
  feeMinor: number | null;
  signatures: number | null;
  feeInLieuOfSignatures: boolean;
  source: string;
}
/** GOV's `RequirementCheck`. */
export interface FilingCheck {
  rule: string;
  met: boolean;
  required: string;
  actual: string;
  source: string;
}

export type FilingAction =
  | { kind: "pick"; contestId: string }
  | { kind: "file"; contestId: string; payFee: boolean }
  | { kind: "done" };

export interface FilingVisit {
  playerId: PersonId;
  clerkId?: PersonId;
  contests: readonly FilingContest[];
  lines: {
    speaker: "clerk" | "player";
    text: string;
    sourceRecordIds: readonly string[];
  }[];
  choices: {
    key: string;
    text: string;
    action: FilingAction;
    sourceRecordIds: readonly string[];
  }[];
}

const money = (minor: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: minor % P.minorPerDollar === P.zero ? P.zero : P.two,
  }).format(minor / P.minorPerDollar);
const longDate = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });

function say(
  core: Readonly<CoreState>,
  visit: FilingVisit,
  speaker: "clerk" | "player",
  part: string,
  variants: readonly Variant[] | undefined,
  facts: Record<string, Fact>,
  stage?: string,
) {
  return renderLine({
    seed: core.seed,
    surface: "dialogue",
    holderId:
      speaker === "clerk" ? (visit.clerkId ?? visit.playerId) : visit.playerId,
    bankKey: `filing-visit:${part}`,
    version: FILING_VISIT_WORDS.version,
    variants,
    facts,
    momentKey: `${visit.playerId}:${core.date}:${visit.lines.length}:${part}`,
    ...(stage ? { stage } : {}),
    fallbackSourceId: visit.playerId,
  });
}

export function openFilingVisit(
  core: Readonly<CoreState>,
  playerId: PersonId,
  contests: readonly FilingContest[],
  clerkId?: PersonId,
): FilingVisit {
  const visit: FilingVisit = {
    playerId,
    ...(clerkId ? { clerkId } : {}),
    contests,
    lines: [],
    choices: [],
  };
  const greet = say(
    core,
    visit,
    "clerk",
    "greet",
    FILING_VISIT_WORDS.greet,
    {},
  );
  if (greet) visit.lines.push({ speaker: "clerk", ...greet });
  for (const contest of contests) {
    const line = say(core, visit, "player", "pick", FILING_VISIT_WORDS.pick, {
      office: { text: contest.title, sourceRecordIds: [contest.id] },
    });
    if (line)
      visit.choices.push({
        key: `pick:${contest.id}`,
        text: line.text,
        action: { kind: "pick", contestId: contest.id },
        sourceRecordIds: line.sourceRecordIds,
      });
  }
  return visit;
}

/** The player names an office; the clerk answers from that contest's records. */
export function pickContest(
  core: Readonly<CoreState>,
  visit: FilingVisit,
  contestId: string,
  terms: FilingTerms,
  checks: readonly FilingCheck[],
): FilingVisit {
  const choice = visit.choices.find(
    (row) => row.action.kind === "pick" && row.action.contestId === contestId,
  );
  const contest = visit.contests.find((row) => row.id === contestId);
  if (!choice || !contest)
    throw new Error(`Not an offered office: ${contestId}`);
  visit.lines.push({
    speaker: "player",
    text: choice.text,
    sourceRecordIds: choice.sourceRecordIds,
  });
  const ids = [contest.id, ...contest.sourceIds];
  const facts: Record<string, Fact> = {
    office: { text: contest.title, sourceRecordIds: ids },
    deadline: { text: longDate(contest.filingDeadline), sourceRecordIds: ids },
  };
  if (terms.feeMinor)
    facts.fee = { text: money(terms.feeMinor), sourceRecordIds: ids };
  if (terms.signatures)
    facts.signatures = { text: String(terms.signatures), sourceRecordIds: ids };
  const stage =
    terms.feeMinor && terms.signatures && terms.feeInLieuOfSignatures
      ? "fee-or-signatures"
      : terms.feeMinor
        ? "fee"
        : terms.signatures
          ? "signatures"
          : "none";
  const stated = say(
    core,
    visit,
    "clerk",
    "terms",
    FILING_VISIT_WORDS.terms,
    facts,
    stage,
  );
  if (stated) visit.lines.push({ speaker: "clerk", ...stated });

  // Each rule that stops the filing, in the clerk's words, from its record.
  const unmet = checks.filter((row) => !row.met);
  for (const check of unmet) {
    const required =
      check.rule === "filing-deadline"
        ? longDate(check.required)
        : check.rule === "fee" && Number.isFinite(Number(check.required))
          ? money(Number(check.required))
          : check.required;
    const actual =
      check.rule === "fee" && Number.isFinite(Number(check.actual))
        ? money(Number(check.actual))
        : check.actual;
    const line = say(
      core,
      visit,
      "clerk",
      `rule:${check.rule}`,
      FILING_VISIT_WORDS.rules[check.rule],
      {
        ...facts,
        required: { text: required, sourceRecordIds: ids },
        actual: { text: actual, sourceRecordIds: [visit.playerId] },
      },
    );
    if (line) visit.lines.push({ speaker: "clerk", ...line });
  }
  visit.choices = [];
  const offer = (key: string, variants: Variant[], action: FilingAction) => {
    const line = say(core, visit, "player", key, variants, facts);
    if (line)
      visit.choices.push({
        key,
        text: line.text,
        action,
        sourceRecordIds: line.sourceRecordIds,
      });
  };
  if (unmet.length) {
    offer("accept", FILING_VISIT_WORDS.accept, { kind: "done" });
    return visit;
  }
  if (terms.feeMinor)
    offer("pay-fee", FILING_VISIT_WORDS.payFee, {
      kind: "file",
      contestId,
      payFee: true,
    });
  if (terms.signatures && (terms.feeInLieuOfSignatures || !terms.feeMinor))
    offer("gather", FILING_VISIT_WORDS.gather, {
      kind: "file",
      contestId,
      payFee: false,
    });
  if (!visit.choices.length)
    offer("file", FILING_VISIT_WORDS.accept, {
      kind: "file",
      contestId,
      payFee: false,
    });
  return visit;
}
